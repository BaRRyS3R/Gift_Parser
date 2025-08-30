// src/lib/server/tournamentCacheService.ts - Redis кеширование для турниров

import { redis, REDIS_KEYS, CACHE_TTL, acquireLock, releaseLock, safeRedisOperation } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabase_server";
import { sanitizeLeaderboardEntry } from "@/types/tournaments";
import type { 
  Tournament, 
  TournamentLeaderboardEntry, 
  PublicTournamentLeaderboardEntry,
  TournamentUserPosition 
} from "@/types/tournaments";

// ✅ ВНУТРЕННЯЯ СТРУКТУРА - используется ТОЛЬКО на сервере и в Redis
interface InternalActiveTournament extends Tournament {
  // Все поля уже есть в Tournament interface
}

// ✅ ВНУТРЕННЯЯ СТРУКТУРА лидерборда - используется ТОЛЬКО на сервере и в Redis
interface InternalTournamentLeaderboard {
  tournament: InternalActiveTournament;
  entries: TournamentLeaderboardEntry[]; // Полные данные с UUID и telegram_id
}

// ✅ ПУБЛИЧНАЯ СТРУКТУРА - отправляется на клиент (БЕЗ UUID и telegram_id)
export interface PublicTournamentData {
  tournament: Tournament;
  leaderboard: PublicTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
  stats: {
    totalParticipants: number;
    totalGames: number;
    averageScore: number;
    highestScore: number;
  };
}

// ✅ КЕШИРУЕМЫЕ ДАННЫЕ для активного турнира
interface CachedActiveTournament {
  tournament: InternalActiveTournament;
  cached_at: number;
  expires_at: number;
  version: string;
}

// ✅ КЕШИРУЕМЫЕ ДАННЫЕ для лидерборда турнира
interface CachedTournamentLeaderboard {
  leaderboard: InternalTournamentLeaderboard;
  cached_at: number;
  expires_at: number;
  version: string;
}

// Метаданные кеша для UI
export interface TournamentCacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
}

// Расширенный ответ с метаданными кеша
export interface TournamentResponseWithCache {
  tournament: PublicTournamentData | null;
  cache_info: TournamentCacheInfo;
}

// Расширяем REDIS_KEYS для турниров
const TOURNAMENT_REDIS_KEYS = {
  ACTIVE_TOURNAMENT: "tournament:active",
  ACTIVE_TOURNAMENT_LOCK: "tournament:active:lock",
  TOURNAMENT_LEADERBOARD: (tournamentId: string) => `tournament:${tournamentId}:leaderboard`,
  TOURNAMENT_LEADERBOARD_LOCK: (tournamentId: string) => `tournament:${tournamentId}:leaderboard:lock`,
  TOURNAMENT_LAST_UPDATE: "tournament:last_update",
} as const;

// Константы времени кеширования (в секундах)
const TOURNAMENT_CACHE_TTL = {
  ACTIVE_TOURNAMENT: 3600, // 1 час (закомментируй для изменения позже)
  TOURNAMENT_LEADERBOARD: 300, // 5 минут
  LOCK_TIMEOUT: 30, // 30 секунд для блокировок
} as const;

export const tournamentCacheService = {
  
  /**
   * ✅ ГЛАВНЫЙ МЕТОД - получение активного турнира с лидербордом и персонализацией
   */
  async getActiveTournamentData(
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100
  ): Promise<TournamentResponseWithCache> {
    try {
      // 1. Получаем активный турнир (из кеша или БД)
      const cachedTournament = await this.getCachedActiveTournament();
      
      let activeTournament: InternalActiveTournament | null = null;
      let tournamentFromCache = false;
      
      if (cachedTournament && !this.isTournamentCacheExpired(cachedTournament)) {
        console.log(`[TOURNAMENT_CACHE] Active tournament cache hit, age: ${Math.floor((Date.now() - cachedTournament.cached_at) / 1000)}s`);
        activeTournament = cachedTournament.tournament;
        tournamentFromCache = true;
        
        // Background refresh за 5 минут до истечения
        const timeUntilExpiry = cachedTournament.expires_at - Date.now();
        if (timeUntilExpiry < 300000) { // 5 минут
          this.backgroundRefreshActiveTournament().catch(error => {
            console.error("[TOURNAMENT_CACHE] Background tournament refresh failed:", error);
          });
        }
      } else {
        console.log(`[TOURNAMENT_CACHE] Active tournament cache miss or expired`);
        activeTournament = await this.fetchActiveTournamentFromDB();
        
        if (activeTournament) {
          await this.setCachedActiveTournament(activeTournament);
          tournamentFromCache = false;
        }
      }
      
      // Если нет активного турнира
      if (!activeTournament) {
        return {
          tournament: null,
          cache_info: {
            is_from_cache: false,
            cached_at: Date.now(),
            cache_age_seconds: 0,
            next_update_in_seconds: 0
          }
        };
      }
      
      // 2. Получаем лидерборд турнира (из кеша или БД)
      const leaderboardResult = await this.getTournamentLeaderboard(
        activeTournament.id, 
        currentUserId, 
        telegramId, 
        limit
      );
      
      // 3. Формируем безопасный ответ для клиента
      const publicTournamentData: PublicTournamentData = {
        tournament: activeTournament, // Tournament interface уже безопасен
        leaderboard: leaderboardResult.leaderboard,
        userPosition: leaderboardResult.userPosition,
        stats: leaderboardResult.stats
      };
      
      return {
        tournament: publicTournamentData,
        cache_info: {
          is_from_cache: tournamentFromCache && leaderboardResult.cache_info.is_from_cache,
          cached_at: Math.min(
            cachedTournament?.cached_at || Date.now(), 
            leaderboardResult.cache_info.cached_at || Date.now()
          ),
          cache_age_seconds: Math.max(
            tournamentFromCache ? Math.floor((Date.now() - (cachedTournament?.cached_at || Date.now())) / 1000) : 0,
            leaderboardResult.cache_info.cache_age_seconds || 0
          ),
          next_update_in_seconds: Math.min(
            tournamentFromCache ? Math.max(0, Math.floor(((cachedTournament?.expires_at || Date.now()) - Date.now()) / 1000)) : TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT,
            leaderboardResult.cache_info.next_update_in_seconds || TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD
          )
        }
      };
      
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error in getActiveTournamentData:", error);
      
      // Fallback к прямому запросу
      try {
        const fallbackTournament = await this.fetchActiveTournamentFromDB();
        
        if (fallbackTournament) {
          const fallbackLeaderboard = await this.fetchTournamentLeaderboardFromDB(fallbackTournament.id);
          const processedData = this.processLeaderboardForUser(
            fallbackTournament,
            fallbackLeaderboard,
            currentUserId,
            telegramId,
            limit
          );
          
          return {
            tournament: processedData,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: 0
            }
          };
        }
      } catch (fallbackError) {
        console.error("[TOURNAMENT_CACHE] Fallback also failed:", fallbackError);
      }
      
      return {
        tournament: null,
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
   * ✅ ПОЛУЧЕНИЕ ЛИДЕРБОРДА ТУРНИРА с кешированием
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100
  ): Promise<{
    leaderboard: PublicTournamentLeaderboardEntry[];
    userPosition?: TournamentUserPosition;
    stats: any;
    cache_info: TournamentCacheInfo;
  }> {
    try {
      // Получаем кешированный лидерборд
      const cachedLeaderboard = await this.getCachedTournamentLeaderboard(tournamentId);
      
      let leaderboardData: InternalTournamentLeaderboard | null = null;
      let fromCache = false;
      
      if (cachedLeaderboard && !this.isLeaderboardCacheExpired(cachedLeaderboard)) {
        console.log(`[TOURNAMENT_CACHE] Leaderboard cache hit for ${tournamentId}, age: ${Math.floor((Date.now() - cachedLeaderboard.cached_at) / 1000)}s`);
        leaderboardData = cachedLeaderboard.leaderboard;
        fromCache = true;
        
        // Background refresh за 30 секунд до истечения
        const timeUntilExpiry = cachedLeaderboard.expires_at - Date.now();
        if (timeUntilExpiry < 30000) {
          this.backgroundRefreshLeaderboard(tournamentId).catch(error => {
            console.error("[TOURNAMENT_CACHE] Background leaderboard refresh failed:", error);
          });
        }
      } else {
        console.log(`[TOURNAMENT_CACHE] Leaderboard cache miss for ${tournamentId}`);
        
        // Получаем турнир и лидерборд из БД
        const tournament = await this.fetchActiveTournamentFromDB();
        if (tournament && tournament.id === tournamentId) {
          const entries = await this.fetchTournamentLeaderboardFromDB(tournamentId);
          leaderboardData = { tournament, entries };
          await this.setCachedTournamentLeaderboard(tournamentId, leaderboardData);
          fromCache = false;
        }
      }
      
      if (!leaderboardData) {
        throw new Error("Tournament leaderboard not found");
      }
      
      // Обрабатываем данные для конкретного пользователя
      const processedData = this.processLeaderboardForUser(
        leaderboardData.tournament,
        leaderboardData.entries,
        currentUserId,
        telegramId,
        limit
      );
      
      return {
        leaderboard: processedData.leaderboard,
        userPosition: processedData.userPosition,
        stats: processedData.stats,
        cache_info: {
          is_from_cache: fromCache,
          cached_at: cachedLeaderboard?.cached_at || Date.now(),
          cache_age_seconds: fromCache ? Math.floor((Date.now() - (cachedLeaderboard?.cached_at || Date.now())) / 1000) : 0,
          next_update_in_seconds: fromCache ? Math.max(0, Math.floor(((cachedLeaderboard?.expires_at || Date.now()) - Date.now()) / 1000)) : TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD
        }
      };
      
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error in getTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ ПОЛУЧЕНИЕ АКТИВНОГО ТУРНИРА из БД
   */
  async fetchActiveTournamentFromDB(): Promise<InternalActiveTournament | null> {
    const { data, error } = await supabaseServer.rpc("get_active_tournament");

    if (error) {
      console.error("Error fetching active tournament from DB:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Трансформируем данные из БД в Tournament interface
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      mode: data.game_mode, // Преобразуем game_mode в mode
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status,
      prizes: data.prizes || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * ✅ ПОЛУЧЕНИЕ ЛИДЕРБОРДА ТУРНИРА из БД (полные данные с UUID)
   */
  async fetchTournamentLeaderboardFromDB(tournamentId: string): Promise<TournamentLeaderboardEntry[]> {
    const { data, error } = await supabaseServer
      .from("tournament_leaderboard")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("best_score", { ascending: false })
      .order("last_participation_at", { ascending: true }); // Tiebreaker

    if (error) {
      console.error("Error fetching tournament leaderboard from DB:", error);
      throw new Error("Failed to fetch tournament leaderboard");
    }

    return data || [];
  },

  /**
   * ✅ БЕЗОПАСНАЯ ОБРАБОТКА - убираем внутренние UUID перед отправкой на клиент
   */
  processLeaderboardForUser(
    tournament: InternalActiveTournament,
    entries: TournamentLeaderboardEntry[],
    currentUserId: string, // 🔒 UUID - используется ТОЛЬКО для внутреннего сравнения
    telegramId: number,
    limit: number
  ): PublicTournamentData {
    
    // Сортируем и ограничиваем записи
    const sortedEntries = entries
      .sort((a, b) => {
        if (b.best_score !== a.best_score) {
          return b.best_score - a.best_score;
        }
        // Tiebreaker: более раннее участие побеждает
        return new Date(a.last_game_at || a.created_at).getTime() - 
               new Date(b.last_game_at || b.created_at).getTime();
      })
      .slice(0, limit);

    // ✅ Создаем публичный лидерборд БЕЗ UUID и telegram_id
    const publicLeaderboard = sortedEntries.map(sanitizeLeaderboardEntry);

    // ✅ Находим позицию пользователя (используем telegram_id для поиска)
    let userPosition: TournamentUserPosition | undefined = undefined;
    const fullLeaderboard = entries.sort((a, b) => {
      if (b.best_score !== a.best_score) {
        return b.best_score - a.best_score;
      }
      return new Date(a.last_game_at || a.created_at).getTime() - 
             new Date(b.last_game_at || b.created_at).getTime();
    });
    
    const userEntryIndex = fullLeaderboard.findIndex(entry => entry.telegram_id === telegramId);
    if (userEntryIndex !== -1) {
      const userEntry = fullLeaderboard[userEntryIndex];
      userPosition = {
        position: userEntryIndex + 1,
        entry: sanitizeLeaderboardEntry(userEntry) // ✅ Безопасная версия
      };
    }

    // Вычисляем статистику
    const stats = {
      totalParticipants: entries.length,
      totalGames: entries.reduce((sum, entry) => sum + entry.total_games, 0),
      averageScore: entries.length > 0 ? Math.round(entries.reduce((sum, entry) => sum + entry.best_score, 0) / entries.length) : 0,
      highestScore: entries.length > 0 ? Math.max(...entries.map(entry => entry.best_score)) : 0,
    };

    return {
      tournament,
      leaderboard: publicLeaderboard,
      userPosition,
      stats,
    };
  },

  /**
   * Получение кешированного активного турнира
   */
  async getCachedActiveTournament(): Promise<CachedActiveTournament | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedActiveTournament>(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT);
      return cached;
    });
  },

  /**
   * Сохранение активного турнира в кеш
   */
  async setCachedActiveTournament(tournament: InternalActiveTournament): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedActiveTournament = {
        tournament,
        cached_at: Date.now(),
        expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT * 1000),
        version: "1.0-secure"
      };
      
      await redis!.setex(
        TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT,
        TOURNAMENT_CACHE_TTL.ACTIVE_TOURNAMENT,
        JSON.stringify(cachedData)
      );
      
      await redis!.set(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LAST_UPDATE, Date.now().toString());
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached active tournament: ${tournament.id}`);
      return true;
    }) || false;
  },

  /**
   * Получение кешированного лидерборда турнира
   */
  async getCachedTournamentLeaderboard(tournamentId: string): Promise<CachedTournamentLeaderboard | null> {
    return await safeRedisOperation(async () => {
      const cached = await redis!.get<CachedTournamentLeaderboard>(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId));
      return cached;
    });
  },

  /**
   * Сохранение лидерборда турнира в кеш
   */
  async setCachedTournamentLeaderboard(tournamentId: string, data: InternalTournamentLeaderboard): Promise<boolean> {
    return await safeRedisOperation(async () => {
      const cachedData: CachedTournamentLeaderboard = {
        leaderboard: data,
        cached_at: Date.now(),
        expires_at: Date.now() + (TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD * 1000),
        version: "1.0-secure"
      };
      
      await redis!.setex(
        TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId),
        TOURNAMENT_CACHE_TTL.TOURNAMENT_LEADERBOARD,
        JSON.stringify(cachedData)
      );
      
      console.log(`[TOURNAMENT_CACHE] ✅ Cached leaderboard for tournament: ${tournamentId}, entries: ${data.entries.length}`);
      return true;
    }) || false;
  },

  /**
   * Проверка истечения кеша турнира
   */
  isTournamentCacheExpired(cachedData: CachedActiveTournament): boolean {
    return Date.now() > cachedData.expires_at;
  },

  /**
   * Проверка истечения кеша лидерборда
   */
  isLeaderboardCacheExpired(cachedData: CachedTournamentLeaderboard): boolean {
    return Date.now() > cachedData.expires_at;
  },

  /**
   * Background refresh активного турнира
   */
  async backgroundRefreshActiveTournament(): Promise<void> {
    const lockAcquired = await acquireLock(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT_LOCK, 30);
    if (!lockAcquired) return;

    try {
      console.log(`[TOURNAMENT_CACHE] Starting background refresh of active tournament`);
      const freshTournament = await this.fetchActiveTournamentFromDB();
      if (freshTournament) {
        await this.setCachedActiveTournament(freshTournament);
        console.log(`[TOURNAMENT_CACHE] Background tournament refresh completed`);
      }
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Background tournament refresh failed:", error);
    } finally {
      await releaseLock(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT_LOCK);
    }
  },

  /**
   * Background refresh лидерборда турнира
   */
  async backgroundRefreshLeaderboard(tournamentId: string): Promise<void> {
    const lockAcquired = await acquireLock(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD_LOCK(tournamentId), 30);
    if (!lockAcquired) return;

    try {
      console.log(`[TOURNAMENT_CACHE] Starting background refresh of leaderboard: ${tournamentId}`);
      const tournament = await this.fetchActiveTournamentFromDB();
      if (tournament && tournament.id === tournamentId) {
        const entries = await this.fetchTournamentLeaderboardFromDB(tournamentId);
        const data = { tournament, entries };
        await this.setCachedTournamentLeaderboard(tournamentId, data);
        console.log(`[TOURNAMENT_CACHE] Background leaderboard refresh completed: ${tournamentId}`);
      }
    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Background leaderboard refresh failed:", error);
    } finally {
      await releaseLock(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD_LOCK(tournamentId));
    }
  },

  /**
   * Принудительное обновление кеша турнира
   */
  async forceRefreshTournament(): Promise<InternalActiveTournament | null> {
    await this.invalidateActiveTournamentCache();
    const freshTournament = await this.fetchActiveTournamentFromDB();
    if (freshTournament) {
      await this.setCachedActiveTournament(freshTournament);
    }
    return freshTournament;
  },

  /**
   * Принудительное обновление лидерборда турнира
   */
  async forceRefreshTournamentLeaderboard(tournamentId: string): Promise<void> {
    await this.invalidateTournamentLeaderboardCache(tournamentId);
    const tournament = await this.fetchActiveTournamentFromDB();
    if (tournament && tournament.id === tournamentId) {
      const entries = await this.fetchTournamentLeaderboardFromDB(tournamentId);
      const data = { tournament, entries };
      await this.setCachedTournamentLeaderboard(tournamentId, data);
    }
  },

  /**
   * Инвалидация кеша активного турнира
   */
  async invalidateActiveTournamentCache(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT);
      console.log(`[TOURNAMENT_CACHE] ✅ Active tournament cache invalidated`);
    });
  },

  /**
   * Инвалидация кеша лидерборда турнира
   */
  async invalidateTournamentLeaderboardCache(tournamentId: string): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LEADERBOARD(tournamentId));
      console.log(`[TOURNAMENT_CACHE] ✅ Tournament leaderboard cache invalidated: ${tournamentId}`);
    });
  },

  /**
   * Полная инвалидация кеша турниров
   */
  async invalidateAllTournamentCache(): Promise<void> {
    await safeRedisOperation(async () => {
      await redis!.del(TOURNAMENT_REDIS_KEYS.ACTIVE_TOURNAMENT);
      await redis!.del(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LAST_UPDATE);
      
      // Инвалидируем все кеши лидербордов турниров (используем паттерн)
      const keys = await redis!.keys("tournament:*:leaderboard");
      if (keys.length > 0) {
        await redis!.del(...keys);
      }
      
      console.log(`[TOURNAMENT_CACHE] ✅ All tournament cache invalidated`);
    });
  },

  /**
   * Статистика кеша турниров
   */
  async getCacheStats(): Promise<{
    active_tournament_cached: boolean;
    tournament_cache_age_seconds?: number;
    tournament_time_until_expiry_seconds?: number;
    leaderboard_caches_count: number;
    last_update_timestamp?: number;
    security_info: {
      user_ids_exposed_to_client: boolean;
      internal_ids_secured: boolean;
    };
  }> {
    try {
      const cachedTournament = await this.getCachedActiveTournament();
      const lastUpdate = await safeRedisOperation(async () => {
        const timestamp = await redis!.get(TOURNAMENT_REDIS_KEYS.TOURNAMENT_LAST_UPDATE);
        return timestamp ? parseInt(timestamp as string) : null;
      });

      // Подсчитываем количество кешированных лидербордов
      const leaderboardKeys = await safeRedisOperation(async () => {
        return await redis!.keys("tournament:*:leaderboard");
      }) || [];

      if (cachedTournament && !this.isTournamentCacheExpired(cachedTournament)) {
        return {
          active_tournament_cached: true,
          tournament_cache_age_seconds: Math.floor((Date.now() - cachedTournament.cached_at) / 1000),
          tournament_time_until_expiry_seconds: Math.max(0, Math.floor((cachedTournament.expires_at - Date.now()) / 1000)),
          leaderboard_caches_count: leaderboardKeys.length,
          last_update_timestamp: lastUpdate || cachedTournament.cached_at,
          security_info: {
            user_ids_exposed_to_client: false,
            internal_ids_secured: true,
          },
        };
      }

      return {
        active_tournament_cached: false,
        leaderboard_caches_count: leaderboardKeys.length,
        last_update_timestamp: lastUpdate || undefined,
        security_info: {
          user_ids_exposed_to_client: false,
          internal_ids_secured: true,
        },
      };

    } catch (error) {
      console.error("[TOURNAMENT_CACHE] Error getting cache stats:", error);
      return {
        active_tournament_cached: false,
        leaderboard_caches_count: 0,
        security_info: {
          user_ids_exposed_to_client: false,
          internal_ids_secured: true,
        },
      };
    }
  }
};