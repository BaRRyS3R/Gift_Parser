// src/lib/server/tournamentCacheService.ts - ОПТИМИЗИРОВАНО: убрана персонализация, упрощен кеш

import { redis, REDIS_KEYS, acquireLock, releaseLock, safeRedisOperation } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabase_server";
import type { 
  Tournament, 
  OptimizedTournamentLeaderboardEntry,
} from "@/types/tournaments";

// Расширенные Redis ключи для турниров
const TOURNAMENT_REDIS_KEYS = {
  ...REDIS_KEYS,
  // Активный турнир (долгоживущий кеш)
  ACTIVE_TOURNAMENT: "tournament:active",
  ACTIVE_TOURNAMENT_LOCK: "tournament:active:lock",
  
  // Лидерборд конкретного турнира (короткоживущий кеш) - БЕЗ персонализации
  TOURNAMENT_LEADERBOARD: (tournamentId: string) => `tournament:${tournamentId}:leaderboard:public`,
  TOURNAMENT_LEADERBOARD_LOCK: (tournamentId: string) => `tournament:${tournamentId}:leaderboard:lock`,
  
  // Метаданные
  TOURNAMENT_LAST_UPDATE: "tournament:last_update",
} as const;

// TTL (время жизни кеша)
const TOURNAMENT_CACHE_TTL = {
  ACTIVE_TOURNAMENT: 3600, // 1 час
  TOURNAMENT_LEADERBOARD: 300, // 5 минут
  LOCK_TIMEOUT: 30, // 30 секунд для блокировок
} as const;

// Кешируемые структуры
interface CachedActiveTournament {
  tournament: Tournament;
  cached_at: number;
  expires_at: number;
  version: string;
}

// УПРОЩЕНО: без персонализации, только публичные данные
interface CachedTournamentLeaderboard {
  tournament_id: string;
  entries: PublicLeaderboardEntry[]; // Только публичные данные
  cached_at: number;
  expires_at: number;
  version: string;
}

// УПРОЩЕНО: публичная структура записи лидерборда (БЕЗ UUID и telegram_id)
interface PublicLeaderboardEntry {
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  updated_at: string;
}

// УПРОЩЕНО: ответ БЕЗ персонализации
export interface TournamentLeaderboardResponse {
  tournament: Tournament;
  leaderboard: PublicLeaderboardEntry[];
  user_stats?: UserTournamentStats; // Отдельная информация о пользователе
}

// Базовая статистика пользователя в турнире (БЕЗ точной позиции)
export interface UserTournamentStats {
  is_participating: boolean;
  user_score?: number;
  games_played?: number;
  is_in_top_100: boolean; // Флаг для определения отображения позиции на клиенте
}

// Метаданные кеша для UI
export interface TournamentCacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
}

export const tournamentCacheService = {

  /**
   * Получение активного турнира с кешированием (без изменений)
   */
  async getActiveTournament(): Promise<{
    tournament: Tournament | null;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      const cached = await this.getCachedActiveTournament();
      
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[TOURNAMENT_CACHE] Active tournament cache hit`);
        
        return {
          tournament: cached.tournament,
          cache_info: {
            is_from_cache: true,
            cached_at: cached.cached_at,
            cache_age_seconds: Math.floor((Date.now() - cached.cached_at) / 1000),
            next_update_in_seconds: Math.max(0, Math.floor((cached.expires_at - Date.now()) / 1000))
          }
        };
      }
      
      console.log(`[TOURNAMENT_CACHE] Active tournament cache miss, fetching fresh data`);
      
      const lockAcquired = await acquireLock(
        TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT_LOCK, 
        TOURNAMENT_CACHE_TTL.LOCK_TIMEOUT
      );
      
      if (lockAcquired) {
        try {
          const freshTournament = await this.fetchActiveTournamentFromDB();
          await this.setCachedActiveTournament(freshTournament);
          
          return {
            tournament: freshTournament,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT
            }
          };
          
        } finally {
          await releaseLock(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT_LOCK);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryCached = await this.getCachedActiveTournament();
        
        if (retryCached) {
          return {
            tournament: retryCached.tournament,
            cache_info: {
              is_from_cache: true,
              cached_at: retryCached.cached_at,
              cache_age_seconds: Math.floor((Date.now() - retryCached.cached_at) / 1000),
              next_update_in_seconds: Math.max(0, Math.floor((retryCached.expires_at - Date.now()) / 1000))
            }
          };
        }
        
        const fallbackTournament = await this.fetchActiveTournamentFromDB();
        return {
          tournament: fallbackTournament,
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0
          }
        };
      }
      
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting active tournament:", error);
      
      const fallbackTournament = await this.fetchActiveTournamentFromDB();
      return {
        tournament: fallbackTournament,
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
   * УПРОЩЕНО: получение лидерборда БЕЗ персонализации + отдельная статистика пользователя
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    userId: string, // Для получения статистики пользователя
    telegramId: number,
    limit: number = 100
  ): Promise<{
    leaderboard: TournamentLeaderboardResponse;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      // Получаем кешированный лидерборд
      const cached = await this.getCachedTournamentLeaderboard(tournamentId);
      let leaderboardEntries: PublicLeaderboardEntry[];
      let cacheInfo: TournamentCacheInfo;
      
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[TOURNAMENT_CACHE] Tournament leaderboard cache hit for ${tournamentId}`);
        leaderboardEntries = cached.entries.slice(0, limit);
        cacheInfo = {
          is_from_cache: true,
          cached_at: cached.cached_at,
          cache_age_seconds: Math.floor((Date.now() - cached.cached_at) / 1000),
          next_update_in_seconds: Math.max(0, Math.floor((cached.expires_at - Date.now()) / 1000))
        };
      } else {
        console.log(`[TOURNAMENT_CACHE] Tournament leaderboard cache miss for ${tournamentId}`);
        
        const lockKey = TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD_LOCK(tournamentId);
        const lockAcquired = await acquireLock(lockKey, TOURNAMENT_CACHE_TTL.LOCK_TIMEOUT);
        
        if (lockAcquired) {
          try {
            // Получаем свежие данные (больше для кеша)
            const freshEntries = await this.fetchTournamentLeaderboardFromDB(tournamentId, 1000);
            await this.setCachedTournamentLeaderboard(tournamentId, freshEntries);
            
            leaderboardEntries = freshEntries.slice(0, limit);
            cacheInfo = {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD
            };
            
          } finally {
            await releaseLock(lockKey);
          }
        } else {
          // Fallback к прямому запросу
          const fallbackEntries = await this.fetchTournamentLeaderboardFromDB(tournamentId, limit);
          leaderboardEntries = fallbackEntries;
          cacheInfo = {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0
          };
        }
      }
      
      // Получаем данные турнира
      const tournament = await this.fetchTournamentFromDB(tournamentId);
      if (!tournament) {
        throw new Error("Tournament not found");
      }
      
      // УПРОЩЕНО: получаем только базовую статистику пользователя
      const userStats = await this.getUserTournamentStats(tournamentId, userId, telegramId, leaderboardEntries);
      
      return {
        leaderboard: {
          tournament,
          leaderboard: leaderboardEntries,
          user_stats: userStats,
        },
        cache_info: cacheInfo
      };
      
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting tournament leaderboard:", error);
      throw error;
    }
  },

  /**
   * НОВАЯ ФУНКЦИЯ: получение базовой статистики пользователя БЕЗ точной позиции
   */
  async getUserTournamentStats(
    tournamentId: string,
    userId: string,
    telegramId: number,
    topEntries: PublicLeaderboardEntry[]
  ): Promise<UserTournamentStats | undefined> {
    try {
      // Проверяем участие пользователя
      const { data: userEntry, error } = await supabaseServer
        .from("tournament_leaderboard")
        .select(`
          best_score,
          total_games,
          first_name,
          updated_at
        `)
        .eq("tournament_id", tournamentId)
        .eq("telegram_id", telegramId)
        .single();

      if (error || !userEntry) {
        return {
          is_participating: false,
          is_in_top_100: false
        };
      }

      // Проверяем, находится ли пользователь в топ-100 по имени и счету
      const isInTop100 = topEntries.some(entry => 
        entry.first_name === userEntry.first_name && 
        entry.best_score === userEntry.best_score &&
        entry.updated_at === userEntry.updated_at
      );

      return {
        is_participating: true,
        user_score: userEntry.best_score,
        games_played: userEntry.total_games,
        is_in_top_100: isInTop100
      };

    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting user stats:", error);
      return {
        is_participating: false,
        is_in_top_100: false
      };
    }
  },

  /**
   * Запрос к БД: получение активного турнира (без изменений)
   */
  async fetchActiveTournamentFromDB(): Promise<Tournament | null> {
    const { data, error } = await supabaseServer.rpc("get_active_tournament");

    if (error) {
      console.error("Error fetching active tournament:", error);
      return null;
    }

    return data;
  },

  /**
   * УПРОЩЕНО: получение лидерборда БЕЗ UUID и telegram_id
   */
  async fetchTournamentLeaderboardFromDB(
    tournamentId: string, 
    limit: number
  ): Promise<PublicLeaderboardEntry[]> {
    const { data, error } = await supabaseServer
      .from("tournament_leaderboard")
      .select(`
        first_name,
        last_name,
        username,
        best_score,
        updated_at
      `) // ТОЛЬКО публичные поля
      .eq("tournament_id", tournamentId)
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true }) // Тайбрейкер
      .limit(limit);

    if (error) {
      console.error("Error fetching tournament leaderboard:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Получение турнира по ID (без изменений)
   */
  async fetchTournamentFromDB(tournamentId: string): Promise<Tournament | null> {
    const { data, error } = await supabaseServer
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (error) {
      console.error("Error fetching tournament:", error);
      return null;
    }

    return data;
  },

  /**
   * Кеш операции для активного турнира (без изменений)
   */
  async getCachedActiveTournament(): Promise<CachedActiveTournament | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedActiveTournament>(
        TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT
      );
      return cached;
    });
  },

  async setCachedActiveTournament(tournament: Tournament | null): Promise<boolean> {
    return await safeRedisOperation(async () => {
      if (!tournament) {
        const cachedData: CachedActiveTournament = {
          tournament: tournament as any,
          cached_at: Date.now(),
          expires_at: Date.now() + (300 * 1000), // 5 минут для null
          version: "1.1-optimized"
        };
        
        await redis!.setex(
          TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT,
          300,
          JSON.stringify(cachedData)
        );
      } else {
        const cachedData: CachedActiveTournament = {
          tournament,
          cached_at: Date.now(),
          expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT * 1000),
          version: "1.1-optimized"
        };
        
        await redis!.setex(
          TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT,
          TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT,
          JSON.stringify(cachedData)
        );
      }
      
      await redis!.set(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LAST_UPDATE, Date.now().toString());
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached active tournament: ${tournament?.id || 'null'}`);
      return true;
    }) || false;
  },

  /**
   * УПРОЩЕННЫЕ кеш операции для лидерборда
   */
  async getCachedTournamentLeaderboard(tournamentId: string): Promise<CachedTournamentLeaderboard | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedTournamentLeaderboard>(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId)
      );
      return cached;
    });
  },

  async setCachedTournamentLeaderboard(
    tournamentId: string, 
    entries: PublicLeaderboardEntry[]
  ): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedTournamentLeaderboard = {
        tournament_id: tournamentId,
        entries, // Только публичные данные
        cached_at: Date.now(),
        expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD * 1000),
        version: "1.1-optimized"
      };
      
      await redis!.setex(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId),
        TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD,
        JSON.stringify(cachedData)
      );
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached leaderboard for tournament ${tournamentId} (${entries.length} entries, no UUIDs)`);
      return true;
    }) || false;
  },

  /**
   * Утилитарные функции
   */
  isCacheExpired(cachedData: { expires_at: number }): boolean {
    return Date.now() > cachedData.expires_at;
  },

  /**
   * Инвалидация кешей (без изменений)
   */
  async invalidateActiveTournament(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT);
      console.log(`[TOURNAMENT_CACHE] ✅ Active tournament cache invalidated`);
    });
  },

  async invalidateTournamentLeaderboard(tournamentId: string): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId));
      console.log(`[TOURNAMENT_CACHE] ✅ Tournament leaderboard cache invalidated: ${tournamentId}`);
    });
  },

  async invalidateAllTournamentCaches(): Promise<void> {
    await safeRedisOperation(async () => {
      const pattern = "tournament:*";
      const keys: string[] = [];
      let cursor = "0";
      
      do {
        const result = await redis!.scan(parseInt(cursor), {
          match: pattern,
          count: 100
        });
        cursor = result[0].toString();
        keys.push(...result[1]);
      } while (cursor !== "0");
      
      if (keys.length > 0) {
        await redis!.del(...keys);
        console.log(`[TOURNAMENT_CACHE] ✅ All tournament caches invalidated (${keys.length} keys)`);
      }
    });
  },

  /**
   * УПРОЩЕННАЯ статистика кеша
   */
  async getCacheStats(): Promise<{
    has_active_tournament_cache: boolean;
    cached_tournament_id?: string;
    cache_age_seconds?: number;
    optimization_info: {
      client_side_positioning: boolean;
      no_server_position_calculation: boolean;
      simplified_user_stats: boolean;
      public_leaderboard_only: boolean;
    };
  }> {
    try {
      const cached = await this.getCachedActiveTournament();
      
      return {
        has_active_tournament_cache: !!cached && !this.isCacheExpired(cached),
        cached_tournament_id: cached?.tournament?.id,
        cache_age_seconds: cached ? Math.floor((Date.now() - cached.cached_at) / 1000) : undefined,
        optimization_info: {
          client_side_positioning: true,     // ✅ Позиции рассчитываются на клиенте
          no_server_position_calculation: true, // ✅ Нет серверных расчетов позиций
          simplified_user_stats: true,       // ✅ Упрощенная статистика пользователя
          public_leaderboard_only: true,     // ✅ Только публичные данные в кеше
        },
      };
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting cache stats:", error);
      return {
        has_active_tournament_cache: false,
        optimization_info: {
          client_side_positioning: true,
          no_server_position_calculation: true,
          simplified_user_stats: true,
          public_leaderboard_only: true,
        },
      };
    }
  }
};