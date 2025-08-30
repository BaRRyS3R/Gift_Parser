// src/lib/redis.ts - Redis клиент для Upstash с поддержкой кеширования сезонов

import { Redis } from "@upstash/redis";

// Проверяем наличие необходимых переменных окружения
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.warn("Redis configuration missing. Redis features will be disabled.");
}

// Создаем клиент Redis только если есть конфигурация
export const redis = REDIS_URL && REDIS_TOKEN 
  ? new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  : null;

// Проверка доступности Redis
export async function checkRedisConnection(): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis connection failed:", error);
    return false;
  }
}

// Константы для кеша
export const REDIS_KEYS = {
  // Лидерборд
  LEADERBOARD_ALL: "leaderboard:all",
  LEADERBOARD_LOCK: "leaderboard:lock",
  LEADERBOARD_LAST_UPDATE: "leaderboard:last_update",
  
  // Пользовательские данные
  USER_PROFILE: (telegramId: number) => `user:${telegramId}:profile`,
  USER_ATTEMPTS: (telegramId: number) => `user:${telegramId}:attempts`,
  
  // Сезонные данные (статичная информация)
  CURRENT_SEASON: "season:current",
  SEASON_BY_ID: (seasonId: string) => `season:${seasonId}:data`,
  SEASON_LOCK: "season:lock",
} as const;

// Константы времени кеширования (в секундах)
export const CACHE_TTL = {
  LEADERBOARD: 300, // 5 минут
  USER_PROFILE: 600, // 10 минут
  USER_ATTEMPTS: 60, // 1 минута
  SEASON_DATA: 3600, // 1 час (fallback, обычно используется динамический TTL) ОБНОВИТЬ ДО НЕДЕЛИ - 604800
  LOCK_TIMEOUT: 30, // 30 секунд для блокировок
} as const;

// Интерфейс для кешированного сезона
export interface CachedSeason {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

// Типы для кешированных данных
export interface CachedData<T> {
  data: T;
  cached_at: number;
  expires_at: number;
}

// Утилиты для работы с кешированными данными
export function createCachedData<T>(data: T, ttlSeconds: number): CachedData<T> {
  const now = Date.now();
  return {
    data,
    cached_at: now,
    expires_at: now + (ttlSeconds * 1000),
  };
}

export function isCacheExpired<T>(cachedData: CachedData<T>): boolean {
  return Date.now() > cachedData.expires_at;
}

export function getCacheAge<T>(cachedData: CachedData<T>): number {
  return Date.now() - cachedData.cached_at;
}

/**
 * Рассчитать TTL до окончания сезона
 * @param endDate - дата окончания сезона в ISO формате
 * @returns TTL в секундах до окончания сезона
 */
export function calculateSeasonTTL(endDate: string): number {
  const endDateTime = new Date(endDate).getTime();
  const currentTime = Date.now();
  const timeDiffMs = endDateTime - currentTime;
  
  // Если сезон уже закончился, возвращаем минимальный TTL
  if (timeDiffMs <= 0) {
    return 60; // 1 минута
  }
  
  // Конвертируем в секунды
  const ttlSeconds = Math.floor(timeDiffMs / 1000);
  
  // Ограничиваем максимальным значением (30 дней)
  const MAX_TTL = 30 * 24 * 60 * 60; // 30 дней в секундах
  return Math.min(ttlSeconds, MAX_TTL);
}

// Distributed lock utilities
export async function acquireLock(
  lockKey: string, 
  timeoutSeconds: number = CACHE_TTL.LOCK_TIMEOUT
): Promise<boolean> {
  if (!redis) return false;

  try {
    const result = await redis.set(
      lockKey,
      Date.now().toString(),
      { ex: timeoutSeconds, nx: true }
    );
    return result === "OK";
  } catch (error) {
    console.error(`Failed to acquire lock ${lockKey}:`, error);
    return false;
  }
}

export async function releaseLock(lockKey: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const result = await redis.del(lockKey);
    return result === 1;
  } catch (error) {
    console.error(`Failed to release lock ${lockKey}:`, error);
    return false;
  }
}

// Wrapper для безопасного выполнения Redis операций
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  if (!redis) {
    return fallback || null;
  }

  try {
    return await operation();
  } catch (error) {
    console.error("Redis operation failed:", error);
    return fallback || null;
  }
}

/**
 * Утилиты для работы с кешем сезонов
 */
export const seasonCacheUtils = {
  /**
   * Сохранить данные текущего сезона в кеш
   */
  async setCachedCurrentSeason(seasonData: CachedSeason): Promise<boolean> {
    const ttl = calculateSeasonTTL(seasonData.end_date);
    
    return await safeRedisOperation(async () => {
      await redis!.setex(REDIS_KEYS.CURRENT_SEASON, ttl, JSON.stringify(seasonData));
      console.log(`[REDIS] Cached current season for ${ttl} seconds until ${seasonData.end_date}`);
      return true;
    }, false) || false;
  },

  /**
   * Получить данные текущего сезона из кеша
   */
  async getCachedCurrentSeason(): Promise<CachedSeason | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get(REDIS_KEYS.CURRENT_SEASON);
      if (cached) {
        const seasonData = JSON.parse(cached as string) as CachedSeason;
        console.log(`[REDIS] Retrieved cached current season: ${seasonData.name}`);
        return seasonData;
      }
      return null;
    }, null);
  },

  /**
   * Сохранить данные сезона по ID в кеш
   */
  async setCachedSeasonById(seasonData: CachedSeason): Promise<boolean> {
    const ttl = calculateSeasonTTL(seasonData.end_date);
    const key = REDIS_KEYS.SEASON_BY_ID(seasonData.id);
    
    return await safeRedisOperation(async () => {
      await redis!.setex(key, ttl, JSON.stringify(seasonData));
      console.log(`[REDIS] Cached season ${seasonData.id} for ${ttl} seconds`);
      return true;
    }, false) || false;
  },

  /**
   * Получить данные сезона по ID из кеша
   */
  async getCachedSeasonById(seasonId: string): Promise<CachedSeason | null> {
    const key = REDIS_KEYS.SEASON_BY_ID(seasonId);
    
    return await safeRedisOperation(async () => {
      const cached = await redis!.get(key);
      if (cached) {
        const seasonData = JSON.parse(cached as string) as CachedSeason;
        console.log(`[REDIS] Retrieved cached season: ${seasonData.name}`);
        return seasonData;
      }
      return null;
    }, null);
  },

  /**
   * Инвалидировать кеш текущего сезона (для ручного управления)
   */
  async invalidateCurrentSeasonCache(): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const result = await redis!.del(REDIS_KEYS.CURRENT_SEASON);
      console.log(`[REDIS] Invalidated current season cache`);
      return result > 0;
    }, false) || false;
  },

  /**
   * Инвалидировать кеш сезона по ID
   */
  async invalidateSeasonById(seasonId: string): Promise<boolean> {
    const key = REDIS_KEYS.SEASON_BY_ID(seasonId);
    
    return await safeRedisOperation(async () => {
      const result = await redis!.del(key);
      console.log(`[REDIS] Invalidated season cache for ID: ${seasonId}`);
      return result > 0;
    }, false) || false;
  },

  /**
   * Проверить TTL кеша текущего сезона
   */
  async getCurrentSeasonCacheTTL(): Promise<number> {
    return await safeRedisOperation(async () => {
      const ttl = await redis!.ttl(REDIS_KEYS.CURRENT_SEASON);
      return ttl;
    }, -1) || -1;
  }
};