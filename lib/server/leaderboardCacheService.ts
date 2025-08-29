// src/lib/server/leaderboardCacheService.ts - Сервис кеширования лидерборда

import { redis, REDIS_KEYS, CACHE_TTL, createCachedData, isCacheExpired, acquireLock, releaseLock, safeRedisOperation } from "@/lib/redis";
import { serverLeaderboardService, type AllLeaderboardsResponse } from "./leaderboardService";

// Интерфейс для кешированных данных лидерборда
interface CachedLeaderboardData {
  data: AllLeaderboardsResponse;
  cached_at: number;
  expires_at: number;
  version: string; // Для versioning кеша
}

// Метаданные кеша для UI
export interface LeaderboardCacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
}

// Расширенный ответ с метаданными кеша
export interface LeaderboardResponseWithCache {
  leaderboard: AllLeaderboardsResponse;
  cache_info: LeaderboardCacheInfo;
}

export const leaderboardCacheService = {
  
  /**
   * Главный метод получения лидерборда с кешированием
   * Использует distributed locking для предотвращения race conditions
   */
  async getLeaderboard(
    currentUserId: string,
    telegramId: number,
    limit: number = 100
  ): Promise<LeaderboardResponseWithCache> {
    try {
      // Пытаемся получить данные из кеша
      const cachedData = await this.getCachedLeaderboard();
      
      if (cachedData && !isCacheExpired(cachedData)) {
        console.log(`[LEADERBOARD_CACHE] Cache hit, age: ${Math.floor((Date.now() - cachedData.cached_at) / 1000)}s`);
        
        // Проверяем, нужен ли background refresh (за 30 секунд до истечения)
        const timeUntilExpiry = cachedData.expires_at - Date.now();
        if (timeUntilExpiry < 30000) { // 30 секунд
          console.log(`[LEADERBOARD_CACHE] Scheduling background refresh, expires in: ${Math.floor(timeUntilExpiry / 1000)}s`);
          // Запускаем обновление в фоне, не ждем результата
          this.backgroundRefresh(currentUserId, telegramId, limit).catch(error => {
            console.error("[LEADERBOARD_CACHE] Background refresh failed:", error);
          });
        }
        
        return {
          leaderboard: cachedData.data,
          cache_info: {
            is_from_cache: true,
            cached_at: cachedData.cached_at,
            cache_age_seconds: Math.floor((Date.now() - cachedData.cached_at) / 1000),
            next_update_in_seconds: Math.max(0, Math.floor((cachedData.expires_at - Date.now()) / 1000))
          }
        };
      }
      
      console.log(`[LEADERBOARD_CACHE] Cache miss or expired, fetching fresh data`);
      
      // Пытаемся получить блокировку для обновления кеша
      const lockAcquired = await acquireLock(REDIS_KEYS.LEADERBOARD_LOCK, 30);
      
      if (lockAcquired) {
        try {
          console.log(`[LEADERBOARD_CACHE] Lock acquired, updating cache`);
          
          // Получаем свежие данные из БД
          const freshData = await serverLeaderboardService.getAllLeaderboards(
            currentUserId,
            telegramId,
            limit
          );
          
          // Сохраняем в кеш
          await this.setCachedLeaderboard(freshData);
          
          console.log(`[LEADERBOARD_CACHE] Cache updated successfully`);
          
          return {
            leaderboard: freshData,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: CACHE_TTL.LEADERBOARD
            }
          };
          
        } finally {
          // Всегда освобождаем блокировку
          await releaseLock(REDIS_KEYS.LEADERBOARD_LOCK);
          console.log(`[LEADERBOARD_CACHE] Lock released`);
        }
      } else {
        console.log(`[LEADERBOARD_CACHE] Could not acquire lock, another process is updating cache`);
        
        // Ждем немного и пытаемся получить из кеша снова
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryCachedData = await this.getCachedLeaderboard();
        
        if (retryCachedData) {
          console.log(`[LEADERBOARD_CACHE] Got updated data from cache after waiting`);
          return {
            leaderboard: retryCachedData.data,
            cache_info: {
              is_from_cache: true,
              cached_at: retryCachedData.cached_at,
              cache_age_seconds: Math.floor((Date.now() - retryCachedData.cached_at) / 1000),
              next_update_in_seconds: Math.max(0, Math.floor((retryCachedData.expires_at - Date.now()) / 1000))
            }
          };
        }
        
        // Если все еще нет данных в кеше, fallback к БД
        console.log(`[LEADERBOARD_CACHE] Fallback to direct DB query`);
        const fallbackData = await serverLeaderboardService.getAllLeaderboards(
          currentUserId,
          telegramId,
          limit
        );
        
        return {
          leaderboard: fallbackData,
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0 // Указываем, что кеш не работает
          }
        };
      }
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Error in getLeaderboard:", error);
      
      // Fallback к прямому запросу БД при любых ошибках кеша
      const fallbackData = await serverLeaderboardService.getAllLeaderboards(
        currentUserId,
        telegramId,
        limit
      );
      
      return {
        leaderboard: fallbackData,
        cache_info: {
          is_from_cache: false,
          cached_at: Date.now(),
          cache_age_seconds: 0,
          next_update_in_seconds: 0
        }
      };
    }
  },
  
  /**
   * Background refresh - обновляет кеш в фоне без блокировки пользователя
   */
  async backgroundRefresh(
    currentUserId: string,
    telegramId: number,
    limit: number = 100
  ): Promise<void> {
    const lockAcquired = await acquireLock(REDIS_KEYS.LEADERBOARD_LOCK, 30);
    
    if (!lockAcquired) {
      console.log(`[LEADERBOARD_CACHE] Background refresh skipped - lock not available`);
      return;
    }
    
    try {
      console.log(`[LEADERBOARD_CACHE] Starting background refresh`);
      
      const freshData = await serverLeaderboardService.getAllLeaderboards(
        currentUserId,
        telegramId,
        limit
      );
      
      await this.setCachedLeaderboard(freshData);
      console.log(`[LEADERBOARD_CACHE] Background refresh completed`);
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Background refresh failed:", error);
    } finally {
      await releaseLock(REDIS_KEYS.LEADERBOARD_LOCK);
    }
  },
  
  /**
   * Получение данных из кеша
   */
  async getCachedLeaderboard(): Promise<CachedLeaderboardData | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedLeaderboardData>(REDIS_KEYS.LEADERBOARD_ALL);
      return cached;
    });
  },
  
  /**
   * Сохранение данных в кеш
   */
  async setCachedLeaderboard(data: AllLeaderboardsResponse): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedLeaderboardData = {
        data,
        cached_at: Date.now(),
        expires_at: Date.now() + (CACHE_TTL.LEADERBOARD * 1000),
        version: "1.0"
      };
      
      await redis!.setex(
        REDIS_KEYS.LEADERBOARD_ALL,
        CACHE_TTL.LEADERBOARD,
        JSON.stringify(cachedData)
      );
      
      // Обновляем timestamp последнего обновления
      await redis!.set(REDIS_KEYS.LEADERBOARD_LAST_UPDATE, Date.now().toString());
      
      return true;
    }) || false;
  },
  
  /**
   * Принудительное обновление кеша (для админских функций)
   */
  async forceRefresh(
    currentUserId: string,
    telegramId: number,
    limit: number = 100
  ): Promise<AllLeaderboardsResponse> {
    console.log(`[LEADERBOARD_CACHE] Force refresh requested`);
    
    try {
      // Удаляем текущий кеш
      await this.invalidateCache();
      
      // Получаем свежие данные
      const freshData = await serverLeaderboardService.getAllLeaderboards(
        currentUserId,
        telegramId,
        limit
      );
      
      // Сохраняем в кеш
      await this.setCachedLeaderboard(freshData);
      
      console.log(`[LEADERBOARD_CACHE] Force refresh completed`);
      return freshData;
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Force refresh failed:", error);
      throw error;
    }
  },
  
  /**
   * Инвалидация кеша (удаление)
   */
  async invalidateCache(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(REDIS_KEYS.LEADERBOARD_ALL);
      await redis!.del(REDIS_KEYS.LEADERBOARD_LAST_UPDATE);
      console.log(`[LEADERBOARD_CACHE] Cache invalidated`);
    });
  },
  
  /**
   * Получение статистики кеша
   */
  async getCacheStats(): Promise<{
    has_cache: boolean;
    cache_age_seconds?: number;
    time_until_expiry_seconds?: number;
    last_update_timestamp?: number;
  }> {
    try {
      const cachedData = await this.getCachedLeaderboard();
      const lastUpdate = await safeRedisOperation(async () => {
        const timestamp = await redis!.get(REDIS_KEYS.LEADERBOARD_LAST_UPDATE);
        return timestamp ? parseInt(timestamp as string) : null;
      });
      
      if (cachedData && !isCacheExpired(cachedData)) {
        return {
          has_cache: true,
          cache_age_seconds: Math.floor((Date.now() - cachedData.cached_at) / 1000),
          time_until_expiry_seconds: Math.max(0, Math.floor((cachedData.expires_at - Date.now()) / 1000)),
          last_update_timestamp: lastUpdate || cachedData.cached_at
        };
      }
      
      return {
        has_cache: false,
        last_update_timestamp: lastUpdate || undefined
      };
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Error getting cache stats:", error);
      return { has_cache: false };
    }
  }
};