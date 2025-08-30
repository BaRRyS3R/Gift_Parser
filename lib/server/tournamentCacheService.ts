// src/lib/server/tournamentCacheService.ts - Оптимизированное кеширование турниров БЕЗ избыточных полей

import { redis, REDIS_KEYS, acquireLock, releaseLock, safeRedisOperation } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabase_server";
import type { 
  Tournament, 
  OptimizedTournamentLeaderboardEntry,
  FullTournamentLeaderboardEntry,
  TournamentUserPosition 
} from "@/types/tournaments";

// ✅ РАСШИРЕННЫЕ Redis ключи для турниров
const TOURNAMENT_REDIS_KEYS = {
  ...REDIS_KEYS,
  // Активный турнир (долгоживущий кеш)
  ACTIVE_TOURNAMENT: "tournament:active",
  ACTIVE_TOURNAMENT_LOCK: "tournament:active:lock",
  
  // Лидерборд конкретного турнира (короткоживущий кеш)
  TOURNAMENT_LEADERBOARD: (tournamentId: string) => `tournament:${tournamentId}:leaderboard`,
  TOURNAMENT_LEADERBOARD_LOCK: (tournamentId: string) => `tournament:${tournamentId}:leaderboard:lock`,
  
  // Метаданные
  TOURNAMENT_LAST_UPDATE: "tournament:last_update",
} as const;

// ✅ ОПТИМИЗИРОВАННЫЕ TTL (время жизни кеша)
const TOURNAMENT_CACHE_TTL = {
  ACTIVE_TOURNAMENT: 3600, // 1 час (как планировали)
  TOURNAMENT_LEADERBOARD: 300, // 5 минут 
  LOCK_TIMEOUT: 30, // 30 секунд для блокировок
} as const;

// ✅ ВНУТРЕННИЕ кешируемые структуры (с UUID для сервера)
interface CachedActiveTournament {
  tournament: Tournament;
  cached_at: number;
  expires_at: number;
  version: string;
}

interface CachedTournamentLeaderboard {
  tournament_id: string;
  entries: InternalOptimizedEntry[]; // Внутренний формат с UUID
  cached_at: number;
  expires_at: number;
  version: string;
}

// ✅ ВНУТРЕННЯЯ структура записи лидерборда (с UUID для сервера)
interface InternalOptimizedEntry {
  user_id: string; // 🔒 UUID остается ТОЛЬКО на сервере
  telegram_id: number; // 🔒 Остается ТОЛЬКО на сервере
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
  updated_at: string;
}

// ✅ ПУБЛИЧНЫЙ ответ (БЕЗ UUID и telegram_id)
export interface TournamentLeaderboardResponse {
  tournament: Tournament;
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
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
   * ✅ ОСНОВНОЙ МЕТОД: получение активного турнира с кешированием
   */
  async getActiveTournament(): Promise<{
    tournament: Tournament | null;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      // Получаем из кеша
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
      
      // Получаем блокировку
      const lockAcquired = await acquireLock(
        TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT_LOCK, 
        TOURNAMENT_CACHE_TTL.LOCK_TIMEOUT
      );
      
      if (lockAcquired) {
        try {
          // Получаем свежие данные
          const freshTournament = await this.fetchActiveTournamentFromDB();
          
          // Сохраняем в кеш (даже если null)
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
        // Ждем и пытаемся получить из кеша еще раз
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
        
        // Fallback: прямой запрос
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
      
      // Fallback к прямому запросу
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
   * ✅ ОСНОВНОЙ МЕТОД: получение лидерборда турнира с персонализацией (БЕЗ UUID на клиенте)
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100
  ): Promise<{
    leaderboard: TournamentLeaderboardResponse;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      // Получаем из кеша
      const cached = await this.getCachedTournamentLeaderboard(tournamentId);
      
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[TOURNAMENT_CACHE] Tournament leaderboard cache hit for ${tournamentId}`);
        
        // Обрабатываем для конкретного пользователя (🔒 UUID НЕ передается на клиент)
        const processedData = await this.processTournamentLeaderboardForUser(
          tournamentId,
          cached.entries,
          currentUserId,
          telegramId,
          limit
        );
        
        return {
          leaderboard: processedData,
          cache_info: {
            is_from_cache: true,
            cached_at: cached.cached_at,
            cache_age_seconds: Math.floor((Date.now() - cached.cached_at) / 1000),
            next_update_in_seconds: Math.max(0, Math.floor((cached.expires_at - Date.now()) / 1000))
          }
        };
      }
      
      console.log(`[TOURNAMENT_CACHE] Tournament leaderboard cache miss for ${tournamentId}`);
      
      // Получаем блокировку
      const lockKey = TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD_LOCK(tournamentId);
      const lockAcquired = await acquireLock(lockKey, TOURNAMENT_CACHE_TTL.LOCK_TIMEOUT);
      
      if (lockAcquired) {
        try {
          // Получаем свежие данные
          const freshEntries = await this.fetchTournamentLeaderboardFromDB(tournamentId, 1000); // Получаем больше для кеша
          
          // Сохраняем в кеш
          await this.setCachedTournamentLeaderboard(tournamentId, freshEntries);
          
          // Обрабатываем для пользователя
          const processedData = await this.processTournamentLeaderboardForUser(
            tournamentId,
            freshEntries,
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
              next_update_in_seconds: TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD
            }
          };
          
        } finally {
          await releaseLock(lockKey);
        }
      } else {
        // Fallback к прямому запросу
        const fallbackEntries = await this.fetchTournamentLeaderboardFromDB(tournamentId, limit);
        const processedData = await this.processTournamentLeaderboardForUser(
          tournamentId,
          fallbackEntries,
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
      console.error("[TOURNAMENT_CACHE] Error getting tournament leaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ ЗАПРОС К БД: получение активного турнира
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
   * ✅ ОПТИМИЗИРОВАННЫЙ ЗАПРОС К БД: получение лидерборда (ТОЛЬКО необходимые поля)
   */
  async fetchTournamentLeaderboardFromDB(
    tournamentId: string, 
    limit: number
  ): Promise<InternalOptimizedEntry[]> {
    const { data, error } = await supabaseServer
      .from("tournament_leaderboard")
      .select(`
        user_id,
        telegram_id,
        first_name,
        last_name,
        username,
        best_score,
        updated_at
      `) // ✅ ТОЛЬКО необходимые поля (без total_games, best_time, etc.)
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
   * ✅ ОБРАБОТКА ДЛЯ ПОЛЬЗОВАТЕЛЯ: убираем UUID и добавляем персонализацию
   */
  async processTournamentLeaderboardForUser(
    tournamentId: string,
    entries: InternalOptimizedEntry[],
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number
  ): Promise<TournamentLeaderboardResponse> {
    // Получаем данные турнира
    const tournament = await this.fetchTournamentFromDB(tournamentId);
    
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Обрабатываем записи лидерборда (БЕЗ UUID для клиента)
    const leaderboard: OptimizedTournamentLeaderboardEntry[] = entries
      .slice(0, limit)
      .map((entry) => ({
        first_name: entry.first_name,
        last_name: entry.last_name,
        username: entry.username,
        best_score: entry.best_score,
        updated_at: entry.updated_at,
        isCurrentUser: entry.user_id === currentUserId, // 🔒 UUID остается на сервере
        // ❌ НЕ ОТПРАВЛЯЕМ: user_id, telegram_id
      }));

    // Находим позицию пользователя (используем telegram_id для поиска)
    const userEntry = entries.find(entry => entry.telegram_id === telegramId);
    let userPosition: TournamentUserPosition | undefined;
    
    if (userEntry) {
      const position = entries.findIndex(entry => entry.telegram_id === telegramId) + 1;
      userPosition = {
        position,
        entry: {
          first_name: userEntry.first_name,
          last_name: userEntry.last_name,
          username: userEntry.username,
          best_score: userEntry.best_score,
          updated_at: userEntry.updated_at,
          isCurrentUser: true,
        }
      };
    }

    return {
      tournament,
      leaderboard,
      userPosition,
    };
  },

  /**
   * ✅ ПОЛУЧЕНИЕ ТУРНИРА ПО ID
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
   * Кеш операции для активного турнира
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
        // Кешируем отсутствие турнира на короткое время
        const cachedData: CachedActiveTournament = {
          tournament: tournament as any, // null
          cached_at: Date.now(),
          expires_at: Date.now() + (300 * 1000), // 5 минут для null
          version: "1.0-optimized"
        };
        
        await redis!.setex(
          TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT,
          300, // 5 минут для null
          JSON.stringify(cachedData)
        );
      } else {
        const cachedData: CachedActiveTournament = {
          tournament,
          cached_at: Date.now(),
          expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT * 1000),
          version: "1.0-optimized"
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
   * Кеш операции для лидерборда турнира
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
    entries: InternalOptimizedEntry[]
  ): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedTournamentLeaderboard = {
        tournament_id: tournamentId,
        entries, // 🔒 Кешируем с UUID для внутреннего использования
        cached_at: Date.now(),
        expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD * 1000),
        version: "1.0-optimized"
      };
      
      await redis!.setex(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId),
        TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD,
        JSON.stringify(cachedData)
      );
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached leaderboard for tournament ${tournamentId} (${entries.length} entries, UUIDs secured)`);
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
   * Инвалидация кешей
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
      // Используем правильный синтаксис для @upstash/redis
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
      } else {
        console.log(`[TOURNAMENT_CACHE] ✅ No tournament cache keys found to invalidate`);
      }
    });
  },

  /**
   * Статистика кеша (БЕЗ чувствительных данных)
   */
  async getCacheStats(): Promise<{
    has_active_tournament_cache: boolean;
    cached_tournament_id?: string;
    cache_age_seconds?: number;
    optimization_info: {
      single_tournament_focus: boolean;
      minimal_fields_cached: boolean;
      uuid_exposure_prevented: boolean;
      leaderboard_optimized: boolean;
    };
  }> {
    try {
      const cached = await this.getCachedActiveTournament();
      
      return {
        has_active_tournament_cache: !!cached && !this.isCacheExpired(cached),
        cached_tournament_id: cached?.tournament?.id,
        cache_age_seconds: cached ? Math.floor((Date.now() - cached.cached_at) / 1000) : undefined,
        optimization_info: {
          single_tournament_focus: true, // ✅ Фокус на одном активном турнире
          minimal_fields_cached: true,   // ✅ Минимум полей в кеше
          uuid_exposure_prevented: true, // ✅ UUID не передаются на клиент
          leaderboard_optimized: true,   // ✅ Лидерборд оптимизирован
        },
      };
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting cache stats:", error);
      return {
        has_active_tournament_cache: false,
        optimization_info: {
          single_tournament_focus: true,
          minimal_fields_cached: true,
          uuid_exposure_prevented: true,
          leaderboard_optimized: true,
        },
      };
    }
  }
};