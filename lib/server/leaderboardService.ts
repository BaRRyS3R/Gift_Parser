// src/lib/server/leaderboardService.ts - Dedicated leaderboard service module (without caching)

import { supabaseServer } from "@/lib/supabase_server";

// Leaderboard interfaces (without sensitive data)
export interface SafeReactionLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_reaction_time: number;
  reaction_games: number;
  best_reaction_score: number;
  isCurrentUser?: boolean;
}

export interface SafeSurvivalLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_survival_time: number;
  max_level: number;
  best_streak: number;
  survival_games: number;
  isCurrentUser?: boolean;
}

export interface SafePhysicsLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_physics_score: number;
  best_physics_time: number;
  best_hits: number;
  least_mistakes: number;
  physics_games: number;
  isCurrentUser?: boolean;
}

export interface SafeRotationLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_rotation_time: number;
  max_level: number;
  best_streak: number;
  total_hits: number;
  rotation_games: number;
  isCurrentUser?: boolean;
}

export interface UserRankings {
  reaction?: number;
  survival?: number;
  physics?: number;
  rotation?: number;
}

export interface AllLeaderboardsResponse {
  reaction: SafeReactionLeaderboard[];
  survival: SafeSurvivalLeaderboard[];
  physics: SafePhysicsLeaderboard[];
  rotation: SafeRotationLeaderboard[];
  userRankings: UserRankings;
}

// Server-side leaderboard service
export const serverLeaderboardService = {
  /**
   * Get reaction mode leaderboard with safe data
   */
  async getReactionLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeReactionLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
                id,
                first_name,
                last_name,
                username,
                reaction_best_time,
                reaction_games,
                reaction_best_score
            `,
      )
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .order("reaction_best_time", { ascending: true })
      .order("reaction_best_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching reaction leaderboard:", error);
      throw new Error("Failed to fetch reaction leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_reaction_time: user.reaction_best_time,
      reaction_games: user.reaction_games,
      best_reaction_score: user.reaction_best_score,
      isCurrentUser: user.id === currentUserId,
    }));
  },

  /**
   * Get survival mode leaderboard with safe data
   */
  async getSurvivalLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeSurvivalLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
                id,
                first_name,
                last_name,
                username,
                survival_best_time,
                survival_max_level,
                survival_best_streak,
                survival_games
            `,
      )
      .gt("survival_games", 0)
      .order("survival_best_time", { ascending: false })
      .order("survival_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching survival leaderboard:", error);
      throw new Error("Failed to fetch survival leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_survival_time: user.survival_best_time,
      max_level: user.survival_max_level,
      best_streak: user.survival_best_streak,
      survival_games: user.survival_games,
      isCurrentUser: user.id === currentUserId,
    }));
  },

  /**
   * Get physics mode leaderboard with safe data
   */
  async getPhysicsLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafePhysicsLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
                id,
                first_name,
                last_name,
                username,
                physics_best_score,
                physics_best_time,
                physics_best_hits,
                physics_least_mistakes,
                physics_games
            `,
      )
      .gt("physics_games", 0)
      .order("physics_best_score", { ascending: false })
      .order("physics_best_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching physics leaderboard:", error);
      throw new Error("Failed to fetch physics leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_physics_score: user.physics_best_score,
      best_physics_time: user.physics_best_time,
      best_hits: user.physics_best_hits,
      least_mistakes: user.physics_least_mistakes,
      physics_games: user.physics_games,
      isCurrentUser: user.id === currentUserId,
    }));
  },

  /**
   * Get rotation mode leaderboard with safe data
   */
  async getRotationLeaderboard(
    currentUserId: string,
    limit: number = 100,
  ): Promise<SafeRotationLeaderboard[]> {
    const { data, error } = await supabaseServer
      .from("users")
      .select(
        `
                id,
                first_name,
                last_name,
                username,
                rotation_best_time,
                rotation_max_level,
                rotation_best_streak,
                rotation_total_hits,
                rotation_games
            `,
      )
      .gt("rotation_games", 0)
      .order("rotation_best_time", { ascending: false })
      .order("rotation_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching rotation leaderboard:", error);
      throw new Error("Failed to fetch rotation leaderboard");
    }

    return (data || []).map((user: any, index: number) => ({
      position: index + 1,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      best_rotation_time: user.rotation_best_time,
      max_level: user.rotation_max_level,
      best_streak: user.rotation_best_streak,
      total_hits: user.rotation_total_hits,
      rotation_games: user.rotation_games,
      isCurrentUser: user.id === currentUserId,
    }));
  },

  /**
   * Get user rankings across all leaderboards
   */
  async getUserRankings(telegramId: number): Promise<UserRankings> {
    // Get user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const rankings: UserRankings = {};

    // Reaction ranking
    if (user.reaction_games > 0 && user.reaction_best_time > 0) {
      const { count, error: reactionError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("reaction_games", 0)
        .gt("reaction_best_time", 0)
        .lt("reaction_best_time", user.reaction_best_time);

      if (!reactionError) {
        rankings.reaction = (count || 0) + 1;
      }
    }

    // Survival ranking
    if (user.survival_games > 0) {
      const { count, error: survivalError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("survival_games", 0)
        .or(
          `survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`,
        );

      if (!survivalError) {
        rankings.survival = (count || 0) + 1;
      }
    }

    // Physics ranking
    if (user.physics_games > 0) {
      const { count, error: physicsError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("physics_games", 0)
        .or(
          `physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`,
        );

      if (!physicsError) {
        rankings.physics = (count || 0) + 1;
      }
    }

    // Rotation ranking
    if (user.rotation_games > 0) {
      const { count, error: rotationError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("rotation_games", 0)
        .or(
          `rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`,
        );

      if (!rotationError) {
        rankings.rotation = (count || 0) + 1;
      }
    }

    return rankings;
  },

  /**
   * Get all leaderboards in a single request
   */
  async getAllLeaderboards(
    currentUserId: string,
    telegramId: number,
    limit: number = 100,
  ): Promise<AllLeaderboardsResponse> {
    try {
      console.log(`Fetching all leaderboards for user: ${currentUserId}`);

      const [reaction, survival, physics, rotation, userRankings] =
        await Promise.all([
          this.getReactionLeaderboard(currentUserId, limit),
          this.getSurvivalLeaderboard(currentUserId, limit),
          this.getPhysicsLeaderboard(currentUserId, limit),
          this.getRotationLeaderboard(currentUserId, limit),
          this.getUserRankings(telegramId),
        ]);

      return {
        reaction,
        survival,
        physics,
        rotation,
        userRankings,
      };
    } catch (error) {
      console.error("Error fetching all leaderboards:", error);
      throw new Error("Failed to fetch leaderboards");
    }
  },
};
