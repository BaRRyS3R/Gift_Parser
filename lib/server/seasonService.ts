// src/lib/server/seasonService.ts - Server-side seasons management with Redis caching

import { supabaseServer } from "@/lib/supabase_server";
import { seasonCacheUtils, type CachedSeason } from "@/lib/redis";

// Season interfaces
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

export interface SeasonLeaderboardEntry {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  total_score: number;
  survival_best_time: number;
  survival_games: number;
  isCurrentUser?: boolean;
}

export interface SeasonUserStats {
  position: number | null;
  total_score: number;
  survival_best_time: number;
  survival_games: number;
}

export interface CompleteSeasonData {
  season: Season;
  leaderboard: SeasonLeaderboardEntry[];
  userStats: SeasonUserStats;
  isActive: boolean;
  timeRemaining?: number;
  hasStarted?: boolean;
}

/**
 * Конвертировать данные сезона из БД в формат для кеширования
 */
function convertToCache(season: any): CachedSeason {
  return {
    id: season.id,
    name: season.name,
    start_date: season.start_date,
    end_date: season.end_date,
    prizes: season.prizes,
    created_at: season.created_at,
    updated_at: season.updated_at,
  };
}

/**
 * Конвертировать кешированные данные в формат Season
 */
function convertFromCache(cachedSeason: CachedSeason): Season {
  return {
    id: cachedSeason.id,
    name: cachedSeason.name,
    start_date: cachedSeason.start_date,
    end_date: cachedSeason.end_date,
    prizes: cachedSeason.prizes,
    created_at: cachedSeason.created_at,
    updated_at: cachedSeason.updated_at,
  };
}

/**
 * Server-side season service with Redis caching
 */
export const serverSeasonService = {
  /**
   * Get current active season with Redis caching
   */
  async getCurrentSeason(): Promise<Season | null> {
    // Сначала проверяем кеш
    try {
      const cachedSeason = await seasonCacheUtils.getCachedCurrentSeason();
      if (cachedSeason) {
        console.log(`[SEASON_SERVICE] Retrieved current season from cache: ${cachedSeason.name}`);
        return convertFromCache(cachedSeason);
      }
    } catch (cacheError) {
      console.warn("[SEASON_SERVICE] Cache retrieval failed, falling back to database:", cacheError);
    }

    // Fallback на БД
    console.log("[SEASON_SERVICE] Cache miss, fetching current season from database");
    
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString())
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching current season:", error);
      throw new Error("Failed to fetch current season");
    }

    // Если сезон найден, кешируем его
    if (data) {
      const seasonForCache = convertToCache(data);
      
      try {
        await seasonCacheUtils.setCachedCurrentSeason(seasonForCache);
        console.log(`[SEASON_SERVICE] Cached current season: ${data.name} until ${data.end_date}`);
      } catch (cacheError) {
        console.warn("[SEASON_SERVICE] Failed to cache current season:", cacheError);
      }
    } else {
      console.log("[SEASON_SERVICE] No active season found");
    }

    return data;
  },

  /**
   * Get season by ID with Redis caching
   */
  async getSeasonById(seasonId: string): Promise<Season | null> {
    // Проверяем кеш
    try {
      const cachedSeason = await seasonCacheUtils.getCachedSeasonById(seasonId);
      if (cachedSeason) {
        console.log(`[SEASON_SERVICE] Retrieved season ${seasonId} from cache: ${cachedSeason.name}`);
        return convertFromCache(cachedSeason);
      }
    } catch (cacheError) {
      console.warn(`[SEASON_SERVICE] Cache retrieval failed for season ${seasonId}, falling back to database:`, cacheError);
    }

    // Fallback на БД
    console.log(`[SEASON_SERVICE] Cache miss, fetching season ${seasonId} from database`);
    
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .eq("id", seasonId)
      .single();

    if (error) {
      console.error("Error fetching season:", error);
      throw new Error("Failed to fetch season");
    }

    // Кешируем результат
    const seasonForCache = convertToCache(data);
    
    try {
      await seasonCacheUtils.setCachedSeasonById(seasonForCache);
      console.log(`[SEASON_SERVICE] Cached season ${seasonId}: ${data.name} until ${data.end_date}`);
    } catch (cacheError) {
      console.warn(`[SEASON_SERVICE] Failed to cache season ${seasonId}:`, cacheError);
    }

    return data;
  },

  /**
   * Get season leaderboard (top 10 players)
   * Не кешируется согласно требованиям
   */
  async getSeasonLeaderboard(
    currentUserId: string,
    limit: number = 10,
  ): Promise<SeasonLeaderboardEntry[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        username,
        total_score,
        survival_best_time,
        survival_games
      `,
      )
      .gt("survival_games", 0)
      .gt("total_score", 0)
      .order("total_score", { ascending: false })
      .order("survival_best_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching season leaderboard:", error);
      throw new Error("Failed to fetch season leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      total_score: user.total_score,
      survival_best_time: user.survival_best_time,
      survival_games: user.survival_games,
      isCurrentUser: user.id === currentUserId,
    }));
  },

  /**
   * Get user season stats and position
   * Не кешируется согласно требованиям
   */
  async getUserSeasonStats(telegramId: number): Promise<SeasonUserStats> {
    // Get user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("total_score, survival_best_time, survival_games")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    let position: number | null = null;

    // Get user position if they have played survival games
    if (user.survival_games > 0 && user.total_score > 0) {
      const { count, error: positionError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("survival_games", 0)
        .gt("total_score", 0)
        .or(
          `total_score.gt.${user.total_score},and(total_score.eq.${user.total_score},survival_best_time.gt.${user.survival_best_time})`,
        );

      if (!positionError) {
        position = (count || 0) + 1;
      }
    }

    return {
      position,
      total_score: user.total_score || 0,
      survival_best_time: user.survival_best_time || 0,
      survival_games: user.survival_games || 0,
    };
  },

  /**
   * Get complete season data (season + leaderboard + user stats)
   * Кешируются только данные сезона, лидерборд и статистика остаются динамичными
   */
  async getCompleteSeasonData(
    userId: string,
    telegramId: number,
    seasonId?: string,
  ): Promise<CompleteSeasonData | null> {
    try {
      // Get season (current or by ID) - используется кеширование
      const season = seasonId
        ? await this.getSeasonById(seasonId)
        : await this.getCurrentSeason();

      if (!season) {
        return null;
      }

      // Check if season is active and get time info
      const now = new Date();
      const startDate = new Date(season.start_date);
      const endDate = new Date(season.end_date);

      const isActive = now >= startDate && now <= endDate;
      const hasStarted = now >= startDate;
      const timeRemaining = isActive
        ? endDate.getTime() - now.getTime()
        : undefined;

      // Получаем лидерборд и пользовательскую статистику (не кешируются)
      const [leaderboard, userStats] = await Promise.all([
        this.getSeasonLeaderboard(userId, 10),
        this.getUserSeasonStats(telegramId),
      ]);

      return {
        season,
        leaderboard,
        userStats,
        isActive,
        hasStarted,
        timeRemaining,
      };
    } catch (error) {
      console.error("Error fetching complete season data:", error);
      throw new Error("Failed to fetch season data");
    }
  },

  /**
   * Check if there's an active season
   * Использует кешированный getCurrentSeason
   */
  async hasActiveSeason(): Promise<boolean> {
    const season = await this.getCurrentSeason();
    return !!season;
  },

  /**
   * Cache management methods for manual control
   */
  cacheManagement: {
    /**
     * Инвалидировать кеш текущего сезона вручную
     */
    async invalidateCurrentSeasonCache(): Promise<boolean> {
      try {
        const result = await seasonCacheUtils.invalidateCurrentSeasonCache();
        console.log("[SEASON_SERVICE] Current season cache invalidated manually");
        return result;
      } catch (error) {
        console.error("[SEASON_SERVICE] Failed to invalidate current season cache:", error);
        return false;
      }
    },

    /**
     * Инвалидировать кеш сезона по ID
     */
    async invalidateSeasonById(seasonId: string): Promise<boolean> {
      try {
        const result = await seasonCacheUtils.invalidateSeasonById(seasonId);
        console.log(`[SEASON_SERVICE] Season ${seasonId} cache invalidated manually`);
        return result;
      } catch (error) {
        console.error(`[SEASON_SERVICE] Failed to invalidate season ${seasonId} cache:`, error);
        return false;
      }
    },

    /**
     * Получить информацию о TTL кеша текущего сезона
     */
    async getCurrentSeasonCacheTTL(): Promise<number> {
      try {
        const ttl = await seasonCacheUtils.getCurrentSeasonCacheTTL();
        return ttl;
      } catch (error) {
        console.error("[SEASON_SERVICE] Failed to get cache TTL:", error);
        return -1;
      }
    },

    /**
     * Прогреть кеш текущего сезона принудительно
     */
    async warmupCurrentSeasonCache(): Promise<boolean> {
      try {
        console.log("[SEASON_SERVICE] Warming up current season cache");
        const season = await serverSeasonService.getCurrentSeason();
        return !!season;
      } catch (error) {
        console.error("[SEASON_SERVICE] Failed to warmup cache:", error);
        return false;
      }
    }
  }
};