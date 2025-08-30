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
} as const;

// Константы времени кеширования (в секундах)
export const CACHE_TTL = {
  LEADERBOARD: 300, // 5 минут
  USER_PROFILE: 600, // 10 минут
  USER_ATTEMPTS: 60, // 1 минута
  LOCK_TIMEOUT: 30, // 30 секунд для блокировок
} as const;

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