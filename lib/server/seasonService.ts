// src/lib/server/seasonService.ts - Server-side seasons management

import { supabaseServer } from "@/lib/supabase_server";

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
 * Server-side season service
 */
export const serverSeasonService = {
  /**
   * Get current active season
   */
  async getCurrentSeason(): Promise<Season | null> {
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

    return data;
  },

  /**
   * Get season by ID
   */
  async getSeasonById(seasonId: string): Promise<Season | null> {
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .eq("id", seasonId)
      .single();

    if (error) {
      console.error("Error fetching season:", error);
      throw new Error("Failed to fetch season");
    }

    return data;
  },

  /**
   * Get season leaderboard (top 10 players)
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
   */
  async getCompleteSeasonData(
    userId: string,
    telegramId: number,
    seasonId?: string,
  ): Promise<CompleteSeasonData | null> {
    try {
      // Get season (current or by ID)
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
   */
  async hasActiveSeason(): Promise<boolean> {
    const season = await this.getCurrentSeason();

    return !!season;
  },
};
