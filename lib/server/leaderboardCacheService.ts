// src/lib/server/leaderboardCacheService.ts - ИСПРАВЛЕНА утечка UUID на клиент

import { redis, REDIS_KEYS, CACHE_TTL, acquireLock, releaseLock, safeRedisOperation } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabase_server";
import type { AllLeaderboardsResponse } from "./leaderboardService";

// ✅ ВНУТРЕННЯЯ СТРУКТУРА - используется ТОЛЬКО на сервере и в Redis
interface InternalCachedUser {
  id: string; // 🔒 UUID - ТОЛЬКО для внутреннего использования на сервере
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  
  // Season data
  total_score: number;
  total_games: number;
  
  // Reaction data
  reaction_best_time: number;
  reaction_games: number;
  reaction_best_score: number;
  
  // Survival data
  survival_best_score: number;
  survival_best_time: number;
  survival_max_level: number;
  survival_best_streak: number;
  survival_games: number;
  
  // Physics data
  physics_best_score: number;
  physics_best_time: number;
  physics_best_hits: number;
  physics_least_mistakes: number;
  physics_games: number;
  
  // Rotation data
  rotation_best_score: number;
  rotation_best_time: number;
  rotation_max_level: number;
  rotation_best_streak: number;
  rotation_total_hits: number;
  rotation_games: number;
}

// ✅ ПУБЛИЧНАЯ СТРУКТУРА - отправляется на клиент (БЕЗ UUID и telegram_id)
export interface PublicLeaderboardEntry {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  isCurrentUser: boolean;
  // Игровые данные - без чувствительных полей
  [key: string]: any; // Для различных метрик в зависимости от типа лидерборда
}

// ✅ КЕШИРУЕМЫЕ ДАННЫЕ - только общий список пользователей с внутренними ID
interface CachedLeaderboardData {
  users: InternalCachedUser[];
  cached_at: number;
  expires_at: number;
  version: string;
}

// ✅ ПЕРСОНАЛЬНЫЕ ДАННЫЕ - вычисляются отдельно для каждого пользователя
export interface UserRankings {
  season?: number;
  reaction?: number;
  survival?: number;
  physics?: number;
  rotation?: number;
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
   * ✅ ГЛАВНЫЙ МЕТОД - получение лидерборда с персонализацией (БЕЗ УТЕЧКИ UUID)
   */
  async getLeaderboard(
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100
  ): Promise<LeaderboardResponseWithCache> {
    try {
      // 1. Получаем общие данные пользователей (из кеша или БД)
      const cachedUsers = await this.getCachedUsers();
      
      if (cachedUsers && !this.isCacheExpired(cachedUsers)) {
        console.log(`[LEADERBOARD_CACHE] Cache hit, age: ${Math.floor((Date.now() - cachedUsers.cached_at) / 1000)}s`);
        
        // Background refresh за 30 секунд до истечения
        const timeUntilExpiry = cachedUsers.expires_at - Date.now();
        if (timeUntilExpiry < 30000) {
          this.backgroundRefresh().catch(error => {
            console.error("[LEADERBOARD_CACHE] Background refresh failed:", error);
          });
        }
        
        // 2. Обрабатываем данные для конкретного пользователя (🔒 UUID НЕ передается на клиент)
        const processedData = this.processLeaderboardsForUser(
          cachedUsers.users, 
          currentUserId, 
          telegramId, 
          limit
        );
        
        return {
          leaderboard: processedData,
          cache_info: {
            is_from_cache: true,
            cached_at: cachedUsers.cached_at,
            cache_age_seconds: Math.floor((Date.now() - cachedUsers.cached_at) / 1000),
            next_update_in_seconds: Math.max(0, Math.floor(timeUntilExpiry / 1000))
          }
        };
      }
      
      console.log(`[LEADERBOARD_CACHE] Cache miss or expired, fetching fresh data`);
      
      // 3. Пытаемся получить блокировку для обновления кеша
      const lockAcquired = await acquireLock(REDIS_KEYS.LEADERBOARD_LOCK, 30);
      
      if (lockAcquired) {
        try {
          console.log(`[LEADERBOARD_CACHE] Lock acquired, updating cache`);
          
          // 4. Получаем свежие данные из БД
          const freshUsers = await this.fetchAllUsersFromDB();
          
          // 5. Сохраняем в кеш
          await this.setCachedUsers(freshUsers);
          
          // 6. Обрабатываем для конкретного пользователя (🔒 UUID НЕ передается на клиент)
          const processedData = this.processLeaderboardsForUser(
            freshUsers, 
            currentUserId, 
            telegramId, 
            limit
          );
          
          console.log(`[LEADERBOARD_CACHE] Cache updated successfully`);
          
          return {
            leaderboard: processedData,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: CACHE_TTL.LEADERBOARD
            }
          };
          
        } finally {
          await releaseLock(REDIS_KEYS.LEADERBOARD_LOCK);
        }
      } else {
        // Ждем и пытаемся получить из кеша
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryCachedUsers = await this.getCachedUsers();
        
        if (retryCachedUsers) {
          const processedData = this.processLeaderboardsForUser(
            retryCachedUsers.users, 
            currentUserId, 
            telegramId, 
            limit
          );
          
          return {
            leaderboard: processedData,
            cache_info: {
              is_from_cache: true,
              cached_at: retryCachedUsers.cached_at,
              cache_age_seconds: Math.floor((Date.now() - retryCachedUsers.cached_at) / 1000),
              next_update_in_seconds: Math.max(0, Math.floor((retryCachedUsers.expires_at - Date.now()) / 1000))
            }
          };
        }
        
        // Fallback к прямому запросу
        console.log(`[LEADERBOARD_CACHE] Fallback to direct DB query`);
        const fallbackUsers = await this.fetchAllUsersFromDB();
        const processedData = this.processLeaderboardsForUser(
          fallbackUsers, 
          currentUserId, 
          telegramId, 
          limit
        );
        
        return {
          leaderboard: processedData,
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0
          }
        };
      }
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Error in getLeaderboard:", error);
      
      // Fallback к прямому запросу
      const fallbackUsers = await this.fetchAllUsersFromDB();
      const processedData = this.processLeaderboardsForUser(
        fallbackUsers, 
        currentUserId, 
        telegramId, 
        limit
      );
      
      return {
        leaderboard: processedData,
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
   * ✅ ЕДИНСТВЕННЫЙ ЗАПРОС К БД - получаем всех пользователей (с внутренними UUID)
   */
  async fetchAllUsersFromDB(): Promise<InternalCachedUser[]> {
    const { data: users, error } = await supabaseServer
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        total_score,
        total_games,
        reaction_best_time,
        reaction_games,
        reaction_best_score,
        survival_best_score,
        survival_best_time,
        survival_max_level,
        survival_best_streak,
        survival_games,
        physics_best_score,
        physics_best_time,
        physics_best_hits,
        physics_least_mistakes,
        physics_games,
        rotation_best_score,
        rotation_best_time,
        rotation_max_level,
        rotation_best_streak,
        rotation_total_hits,
        rotation_games
      `)
      .or("total_games.gt.0,reaction_games.gt.0,survival_games.gt.0,physics_games.gt.0,rotation_games.gt.0");

    if (error) {
      console.error("Error fetching users from DB:", error);
      throw new Error("Failed to fetch users data");
    }

    return users || [];
  },

  /**
   * ✅ БЕЗОПАСНАЯ ОБРАБОТКА - убираем внутренние UUID перед отправкой на клиент
   */
  processLeaderboardsForUser(
    users: InternalCachedUser[],
    currentUserId: string, // 🔒 UUID - используется ТОЛЬКО для внутреннего сравнения
    telegramId: number,
    limit: number
  ): AllLeaderboardsResponse {
    
    // Season leaderboard
    const seasonUsers = users
      .filter(user => user.total_games > 0)
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return b.total_games - a.total_games;
      })
      .slice(0, limit);

    const season = seasonUsers.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      total_score: user.total_score,
      total_games: user.total_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается ТОЛЬКО на сервере
      // ❌ НЕ ОТПРАВЛЯЕМ: id, telegram_id и другие чувствительные данные
    }));

    // Reaction leaderboard
    const reactionUsers = users
      .filter(user => user.reaction_games > 0 && user.reaction_best_time > 0)
      .sort((a, b) => {
        if (a.reaction_best_time !== b.reaction_best_time) return a.reaction_best_time - b.reaction_best_time;
        return b.reaction_best_score - a.reaction_best_score;
      })
      .slice(0, limit);

    const reaction = reactionUsers.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_reaction_time: user.reaction_best_time,
      reaction_games: user.reaction_games,
      best_reaction_score: user.reaction_best_score,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается ТОЛЬКО на сервере
      // ❌ НЕ ОТПРАВЛЯЕМ: id, telegram_id
    }));

    // Survival leaderboard
    const survivalUsers = users
      .filter(user => user.survival_games > 0)
      .sort((a, b) => {
        if (b.survival_best_score !== a.survival_best_score) return b.survival_best_score - a.survival_best_score;
        if (b.survival_best_time !== a.survival_best_time) return b.survival_best_time - a.survival_best_time;
        return b.survival_max_level - a.survival_max_level;
      })
      .slice(0, limit);

    const survival = survivalUsers.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_survival_score: user.survival_best_score,
      best_survival_time: user.survival_best_time,
      max_level: user.survival_max_level,
      best_streak: user.survival_best_streak,
      survival_games: user.survival_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается ТОЛЬКО на сервере
      // ❌ НЕ ОТПРАВЛЯЕМ: id, telegram_id
    }));

    // Physics leaderboard
    const physicsUsers = users
      .filter(user => user.physics_games > 0)
      .sort((a, b) => {
        if (b.physics_best_score !== a.physics_best_score) return b.physics_best_score - a.physics_best_score;
        if (b.physics_best_time !== a.physics_best_time) return b.physics_best_time - a.physics_best_time;
        return b.physics_best_hits - a.physics_best_hits;
      })
      .slice(0, limit);

    const physics = physicsUsers.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_physics_score: user.physics_best_score,
      best_physics_time: user.physics_best_time,
      best_hits: user.physics_best_hits,
      least_mistakes: user.physics_least_mistakes,
      physics_games: user.physics_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается ТОЛЬКО на сервере
      // ❌ НЕ ОТПРАВЛЯЕМ: id, telegram_id
    }));

    // Rotation leaderboard
    const rotationUsers = users
      .filter(user => user.rotation_games > 0)
      .sort((a, b) => {
        if (b.rotation_best_score !== a.rotation_best_score) return b.rotation_best_score - a.rotation_best_score;
        if (b.rotation_best_time !== a.rotation_best_time) return b.rotation_best_time - a.rotation_best_time;
        return b.rotation_max_level - a.rotation_max_level;
      })
      .slice(0, limit);

    const rotation = rotationUsers.map((user, index) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_rotation_score: user.rotation_best_score,
      best_rotation_time: user.rotation_best_time,
      max_level: user.rotation_max_level,
      best_streak: user.rotation_best_streak,
      total_hits: user.rotation_total_hits,
      rotation_games: user.rotation_games,
      isCurrentUser: user.id === currentUserId, // 🔒 UUID остается ТОЛЬКО на сервере
      // ❌ НЕ ОТПРАВЛЯЕМ: id, telegram_id
    }));

    // ✅ ПЕРСОНАЛЬНЫЕ userRankings - используем telegram_id для поиска пользователя
    const userRankings = this.calculateUserRankings(users, telegramId);

    return {
      season,
      reaction,
      survival,
      physics,
      rotation,
      userRankings,
    };
  },

  /**
   * ✅ ПЕРСОНАЛЬНЫЕ РЕЙТИНГИ - используем telegram_id для поиска пользователя (БЕЗ UUID)
   */
  calculateUserRankings(users: InternalCachedUser[], telegramId: number): UserRankings {
    const currentUser = users.find(u => u.telegram_id === telegramId); // ✅ Используем telegram_id
    if (!currentUser) return {};

    const rankings: UserRankings = {};

    // Season ranking
    if (currentUser.total_games > 0) {
      const betterUsers = users.filter(u => 
        u.total_games > 0 && 
        (u.total_score > currentUser.total_score || 
         (u.total_score === currentUser.total_score && u.total_games > currentUser.total_games))
      );
      rankings.season = betterUsers.length + 1;
    }

    // Reaction ranking
    if (currentUser.reaction_games > 0 && currentUser.reaction_best_time > 0) {
      const betterUsers = users.filter(u => 
        u.reaction_games > 0 && u.reaction_best_time > 0 &&
        (u.reaction_best_time < currentUser.reaction_best_time ||
         (u.reaction_best_time === currentUser.reaction_best_time && u.reaction_best_score > currentUser.reaction_best_score))
      );
      rankings.reaction = betterUsers.length + 1;
    }

    // Survival ranking
    if (currentUser.survival_games > 0) {
      const betterUsers = users.filter(u => 
        u.survival_games > 0 &&
        (u.survival_best_score > currentUser.survival_best_score ||
         (u.survival_best_score === currentUser.survival_best_score && u.survival_best_time > currentUser.survival_best_time))
      );
      rankings.survival = betterUsers.length + 1;
    }

    // Physics ranking
    if (currentUser.physics_games > 0) {
      const betterUsers = users.filter(u => 
        u.physics_games > 0 &&
        (u.physics_best_score > currentUser.physics_best_score ||
         (u.physics_best_score === currentUser.physics_best_score && u.physics_best_time > currentUser.physics_best_time))
      );
      rankings.physics = betterUsers.length + 1;
    }

    // Rotation ranking
    if (currentUser.rotation_games > 0) {
      const betterUsers = users.filter(u => 
        u.rotation_games > 0 &&
        (u.rotation_best_score > currentUser.rotation_best_score ||
         (u.rotation_best_score === currentUser.rotation_best_score && u.rotation_best_time > currentUser.rotation_best_time))
      );
      rankings.rotation = betterUsers.length + 1;
    }

    return rankings;
  },

  /**
   * Background refresh - обновляет кеш в фоне
   */
  async backgroundRefresh(): Promise<void> {
    const lockAcquired = await acquireLock(REDIS_KEYS.LEADERBOARD_LOCK, 30);
    if (!lockAcquired) return;

    try {
      console.log(`[LEADERBOARD_CACHE] Starting background refresh`);
      const freshUsers = await this.fetchAllUsersFromDB();
      await this.setCachedUsers(freshUsers);
      console.log(`[LEADERBOARD_CACHE] Background refresh completed`);
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Background refresh failed:", error);
    } finally {
      await releaseLock(REDIS_KEYS.LEADERBOARD_LOCK);
    }
  },

  /**
   * Получение пользователей из кеша
   */
  async getCachedUsers(): Promise<CachedLeaderboardData | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedLeaderboardData>(REDIS_KEYS.LEADERBOARD_ALL);
      return cached;
    });
  },

  /**
   * 🔒 БЕЗОПАСНОЕ сохранение пользователей в кеш (с внутренними UUID для сервера)
   */
  async setCachedUsers(users: InternalCachedUser[]): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedLeaderboardData = {
        users, // 🔒 В Redis сохраняются данные с UUID для внутреннего использования
        cached_at: Date.now(),
        expires_at: Date.now() + (CACHE_TTL.LEADERBOARD * 1000),
        version: "2.1-secure"
      };
      
      await redis!.setex(
        REDIS_KEYS.LEADERBOARD_ALL,
        CACHE_TTL.LEADERBOARD,
        JSON.stringify(cachedData)
      );
      
      await redis!.set(REDIS_KEYS.LEADERBOARD_LAST_UPDATE, Date.now().toString());
      
      console.log(`[LEADERBOARD_CACHE] ✅ Cached ${users.length} users (UUIDs secured from client)`);
      return true;
    }) || false;
  },

  /**
   * Проверка истечения кеша
   */
  isCacheExpired(cachedData: CachedLeaderboardData): boolean {
    return Date.now() > cachedData.expires_at;
  },

  /**
   * Принудительное обновление кеша
   */
  async forceRefresh(): Promise<InternalCachedUser[]> {
    await this.invalidateCache();
    const freshUsers = await this.fetchAllUsersFromDB();
    await this.setCachedUsers(freshUsers);
    return freshUsers;
  },

  /**
   * Инвалидация кеша
   */
  async invalidateCache(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(REDIS_KEYS.LEADERBOARD_ALL);
      await redis!.del(REDIS_KEYS.LEADERBOARD_LAST_UPDATE);
      console.log(`[LEADERBOARD_CACHE] ✅ Cache invalidated (secure version)`);
    });
  },

  /**
   * Статистика кеша (БЕЗ чувствительных данных)
   */
  async getCacheStats(): Promise<{
    has_cache: boolean;
    cache_age_seconds?: number;
    time_until_expiry_seconds?: number;
    last_update_timestamp?: number;
    cached_users_count?: number;
    security_info?: {
      user_ids_exposed_to_client: boolean;
      internal_ids_secured: boolean;
    };
  }> {
    try {
      const cachedData = await this.getCachedUsers();
      const lastUpdate = await safeRedisOperation(async () => {
        const timestamp = await redis!.get(REDIS_KEYS.LEADERBOARD_LAST_UPDATE);
        return timestamp ? parseInt(timestamp as string) : null;
      });
      
      if (cachedData && !this.isCacheExpired(cachedData)) {
        return {
          has_cache: true,
          cache_age_seconds: Math.floor((Date.now() - cachedData.cached_at) / 1000),
          time_until_expiry_seconds: Math.max(0, Math.floor((cachedData.expires_at - Date.now()) / 1000)),
          last_update_timestamp: lastUpdate || cachedData.cached_at,
          cached_users_count: cachedData.users.length,
          security_info: {
            user_ids_exposed_to_client: false, // ✅ UUID ID не передаются на клиент
            internal_ids_secured: true, // ✅ Внутренние ID защищены
          },
        };
      }
      
      return {
        has_cache: false,
        last_update_timestamp: lastUpdate || undefined,
        cached_users_count: 0,
        security_info: {
          user_ids_exposed_to_client: false,
          internal_ids_secured: true,
        },
      };
      
    } catch (error) {
      console.error("[LEADERBOARD_CACHE] Error getting cache stats:", error);
      return { 
        has_cache: false, 
        cached_users_count: 0,
        security_info: {
          user_ids_exposed_to_client: false,
          internal_ids_secured: true,
        },
      };
    }
  }
};