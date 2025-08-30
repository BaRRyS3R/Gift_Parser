// src/lib/server/tournamentCacheService.ts - РЕФАКТОРИНГ: полное кеширование всех участников турнира

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
  
  // ИЗМЕНЕНО: полный лидерборд турнира (ВСЕ участники)
  TOURNAMENT_FULL_LEADERBOARD: (tournamentId: string) => `tournament:${tournamentId}:leaderboard:full`,
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

// РАСШИРЕННАЯ структура для полного кеширования
interface CachedFullTournamentLeaderboard {
  tournament_id: string;
  tournament: Tournament;
  // ВСЕ участники турнира с telegram_id для серверной идентификации
  all_entries: FullLeaderboardEntry[];
  participants_count: number;
  cached_at: number;
  expires_at: number;
  version: string;
}

// Полная структура записи лидерборда (для сервера)
interface FullLeaderboardEntry {
  telegram_id: number; // ✅ ДОБАВЛЕНО для идентификации пользователя
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  total_games: number;
  updated_at: string;
}

// Публичная структура записи лидерборда (для клиента)
interface PublicLeaderboardEntry {
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  updated_at: string;
  isCurrentUser?: boolean; // Добавляется при персонализации
}

// ОБНОВЛЕННЫЙ ответ с использованием полного кеша
export interface TournamentLeaderboardResponse {
  tournament: Tournament;
  leaderboard: PublicLeaderboardEntry[]; // Топ-N для клиента
  user_stats: UserTournamentStats;
  cache_info: TournamentCacheInfo;
  data_source: 'redis' | 'database'; // ✅ ДОБАВЛЕНО для индикации источника
}

// Обновленная статистика пользователя из кеша
export interface UserTournamentStats {
  is_participating: boolean;
  user_score?: number;
  games_played?: number;
  user_position?: number; // ✅ ВОЗВРАЩЕНО точная позиция из кеша
  is_in_top_100: boolean;
}

// Метаданные кеша для UI
export interface TournamentCacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
  total_participants_in_cache: number; // ✅ ДОБАВЛЕНО
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
            next_update_in_seconds: Math.max(0, Math.floor((cached.expires_at - Date.now()) / 1000)),
            total_participants_in_cache: 0
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
              next_update_in_seconds: TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT,
              total_participants_in_cache: 0
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
              next_update_in_seconds: Math.max(0, Math.floor((retryCached.expires_at - Date.now()) / 1000)),
              total_participants_in_cache: 0
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
            next_update_in_seconds: 0,
            total_participants_in_cache: 0
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
          next_update_in_seconds: 0,
          total_participants_in_cache: 0
        }
      };
    }
  },

  /**
   * НОВОЕ: получение лидерборда турнира с полным кешированием всех участников
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    userId: string,
    telegramId: number,
    limit: number = 100
  ): Promise<{
    leaderboard: TournamentLeaderboardResponse;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      // Проверяем кеш полного лидерборда
      const cached = await this.getCachedFullTournamentLeaderboard(tournamentId);
      let fullLeaderboardData: CachedFullTournamentLeaderboard;
      let cacheInfo: TournamentCacheInfo;
      let dataSource: 'redis' | 'database' = 'redis';
      
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[TOURNAMENT_CACHE] Full leaderboard cache hit for ${tournamentId} (${cached.participants_count} participants)`);
        fullLeaderboardData = cached;
        cacheInfo = {
          is_from_cache: true,
          cached_at: cached.cached_at,
          cache_age_seconds: Math.floor((Date.now() - cached.cached_at) / 1000),
          next_update_in_seconds: Math.max(0, Math.floor((cached.expires_at - Date.now()) / 1000)),
          total_participants_in_cache: cached.participants_count
        };
      } else {
        console.log(`[TOURNAMENT_CACHE] Full leaderboard cache miss for ${tournamentId}`);
        
        const lockKey = TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD_LOCK(tournamentId);
        const lockAcquired = await acquireLock(lockKey, TOURNAMENT_CACHE_TTL.LOCK_TIMEOUT);
        
        if (lockAcquired) {
          try {
            // Получаем ВСЕ записи участников турнира
            const allEntries = await this.fetchAllTournamentParticipantsFromDB(tournamentId);
            const tournament = await this.fetchTournamentFromDB(tournamentId);
            
            if (!tournament) {
              throw new Error("Tournament not found");
            }
            
            fullLeaderboardData = {
              tournament_id: tournamentId,
              tournament,
              all_entries: allEntries,
              participants_count: allEntries.length,
              cached_at: Date.now(),
              expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD * 1000),
              version: "2.0-full-cache"
            };
            
            await this.setCachedFullTournamentLeaderboard(tournamentId, fullLeaderboardData);
            
            cacheInfo = {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD,
              total_participants_in_cache: allEntries.length
            };
            
            console.log(`[TOURNAMENT_CACHE] Cached full leaderboard for ${tournamentId} (${allEntries.length} participants)`);
            
          } finally {
            await releaseLock(lockKey);
          }
        } else {
          // Fallback к прямому запросу БД
          console.warn(`[TOURNAMENT_CACHE] Failed to acquire lock, falling back to database for ${tournamentId}`);
          dataSource = 'database';
          
          const allEntries = await this.fetchAllTournamentParticipantsFromDB(tournamentId);
          const tournament = await this.fetchTournamentFromDB(tournamentId);
          
          if (!tournament) {
            throw new Error("Tournament not found");
          }
          
          fullLeaderboardData = {
            tournament_id: tournamentId,
            tournament,
            all_entries: allEntries,
            participants_count: allEntries.length,
            cached_at: Date.now(),
            expires_at: Date.now() + 30000, // 30 секунд для fallback
            version: "2.0-database-fallback"
          };
          
          cacheInfo = {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0,
            total_participants_in_cache: allEntries.length
          };
        }
      }
      
      // Обрабатываем данные для клиента
      const { publicLeaderboard, userStats } = this.processFullLeaderboardForClient(
        fullLeaderboardData,
        telegramId,
        limit
      );
      
      return {
        leaderboard: {
          tournament: fullLeaderboardData.tournament,
          leaderboard: publicLeaderboard,
          user_stats: userStats,
          cache_info: cacheInfo,
          data_source: dataSource,
        },
        cache_info: cacheInfo
      };
      
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting tournament leaderboard:", error);
      throw error;
    }
  },

  /**
   * НОВАЯ ФУНКЦИЯ: обработка полного лидерборда для клиента
   */
  processFullLeaderboardForClient(
    fullData: CachedFullTournamentLeaderboard,
    telegramId: number,
    limit: number
  ): { publicLeaderboard: PublicLeaderboardEntry[]; userStats: UserTournamentStats } {
    const allEntries = fullData.all_entries;
    
    // Сортируем всех участников по счету (убывание) и времени (возрастание)
    const sortedEntries = [...allEntries].sort((a, b) => {
      if (b.best_score !== a.best_score) {
        return b.best_score - a.best_score;
      }
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    });
    
    // Находим пользователя и его позицию
    const userIndex = sortedEntries.findIndex(entry => entry.telegram_id === telegramId);
    const userEntry = userIndex !== -1 ? sortedEntries[userIndex] : null;
    
    // Формируем статистику пользователя
    const userStats: UserTournamentStats = {
      is_participating: userEntry !== null,
      user_score: userEntry?.best_score,
      games_played: userEntry?.total_games,
      user_position: userEntry ? userIndex + 1 : undefined, // ✅ Точная позиция
      is_in_top_100: userEntry ? userIndex < 100 : false,
    };
    
    // Формируем топ-N для клиента
    const topEntries = sortedEntries.slice(0, limit);
    const publicLeaderboard: PublicLeaderboardEntry[] = topEntries.map(entry => ({
      first_name: entry.first_name,
      last_name: entry.last_name,
      username: entry.username,
      best_score: entry.best_score,
      updated_at: entry.updated_at,
      isCurrentUser: entry.telegram_id === telegramId, // ✅ Помечаем текущего пользователя
    }));
    
    console.log(`[TOURNAMENT_CACHE] Processed leaderboard: ${allEntries.length} total, top ${limit} returned, user position: ${userStats.user_position || 'not participating'}`);
    
    return { publicLeaderboard, userStats };
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
   * НОВОЕ: получение ВСЕХ участников турнира из БД
   */
  async fetchAllTournamentParticipantsFromDB(tournamentId: string): Promise<FullLeaderboardEntry[]> {
    console.log(`[TOURNAMENT_CACHE] Fetching ALL participants for tournament ${tournamentId}`);
    
    const { data, error } = await supabaseServer
      .from("tournament_leaderboard")
      .select(`
        telegram_id,
        first_name,
        last_name,
        username,
        best_score,
        total_games,
        updated_at
      `) // ✅ Включаем telegram_id для серверной идентификации
      .eq("tournament_id", tournamentId)
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true }); // БЕЗ лимита - получаем ВСЕХ

    if (error) {
      console.error("Error fetching all tournament participants:", error);
      throw error;
    }

    console.log(`[TOURNAMENT_CACHE] Fetched ${data?.length || 0} participants for tournament ${tournamentId}`);
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
          version: "2.0-full-cache"
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
          version: "2.0-full-cache"
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
   * НОВЫЕ кеш операции для полного лидерборда
   */
  async getCachedFullTournamentLeaderboard(tournamentId: string): Promise<CachedFullTournamentLeaderboard | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedFullTournamentLeaderboard>(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_FULL_LEADERBOARD(tournamentId)
      );
      return cached;
    });
  },

  async setCachedFullTournamentLeaderboard(
    tournamentId: string, 
    fullData: CachedFullTournamentLeaderboard
  ): Promise<boolean> {
    return await safeRedisOperation(async () => {
      await redis!.setex(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_FULL_LEADERBOARD(tournamentId),
        TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD,
        JSON.stringify(fullData)
      );
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached full leaderboard for tournament ${tournamentId} (${fullData.participants_count} participants)`);
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
   * Инвалидация кешей (обновлено)
   */
  async invalidateActiveTournament(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT);
      console.log(`[TOURNAMENT_CACHE] ✅ Active tournament cache invalidated`);
    });
  },

  async invalidateTournamentLeaderboard(tournamentId: string): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.TOURNAMENT_FULL_LEADERBOARD(tournamentId));
      console.log(`[TOURNAMENT_CACHE] ✅ Tournament full leaderboard cache invalidated: ${tournamentId}`);
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
   * ОБНОВЛЕННАЯ статистика кеша
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
      full_participant_caching: boolean; // ✅ ДОБАВЛЕНО
      redis_fallback_to_database: boolean; // ✅ ДОБАВЛЕНО
    };
  }> {
    try {
      const cached = await this.getCachedActiveTournament();
      
      return {
        has_active_tournament_cache: !!cached && !this.isCacheExpired(cached),
        cached_tournament_id: cached?.tournament?.id,
        cache_age_seconds: cached ? Math.floor((Date.now() - cached.cached_at) / 1000) : undefined,
        optimization_info: {
          client_side_positioning: true,
          no_server_position_calculation: false, // ✅ Теперь сервер считает позиции из кеша
          simplified_user_stats: false, // ✅ Полная статистика включая позицию
          public_leaderboard_only: false, // ✅ Полный лидерборд с telegram_id на сервере
          full_participant_caching: true, // ✅ Кешируем всех участников
          redis_fallback_to_database: true, // ✅ Fallback на БД
        },
      };
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting cache stats:", error);
      return {
        has_active_tournament_cache: false,
        optimization_info: {
          client_side_positioning: true,
          no_server_position_calculation: false,
          simplified_user_stats: false,
          public_leaderboard_only: false,
          full_participant_caching: true,
          redis_fallback_to_database: true,
        },
      };
    }
  }
};