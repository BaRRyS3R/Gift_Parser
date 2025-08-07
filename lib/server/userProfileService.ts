// src/lib/server/userProfileService.ts - Расширенный сервис профиля с полными данными пользователя

import { supabaseServer } from "@/lib/supabase_server";

// Profile interfaces
export interface ReferralInfo {
  code: string;
  count: number;
  bonus: number;
  referredBy?: string;
  referredByName?: string;
  // Add computed fields for modal
  referralLink: string;
}

export interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics: number | null;
  rotation: number | null;
}

// Расширенные данные пользователя для профиля
export interface UserProfileGameStats {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  attempts_remaining: number;
  last_attempt_at?: string;
  attempts_reset_at?: string;
  referral_code: string;
  referred_by?: string;
  referral_bonus: number;
  referral_count: number;
  total_games: number;
  total_score: number;
  best_score: number;
  current_level: number;
  current_league_id?: number;
  reaction_games: number;
  reaction_best_score: number;
  reaction_best_time: number;
  reaction_average_time: number;
  survival_games: number;
  survival_best_score: number;
  survival_best_time: number;
  survival_max_level: number;
  survival_best_streak: number;
  physics_games: number;
  physics_best_score: number;
  physics_best_time: number;
  physics_total_hits: number;
  physics_best_hits: number;
  physics_least_mistakes: number;
  rotation_games: number;
  rotation_best_score: number;
  rotation_best_time: number;
  rotation_max_level: number;
  rotation_best_streak: number;
  rotation_total_hits: number;
  total_correct_hits: number;
  total_wrong_hits: number;
  total_missed_circles: number;
  best_accuracy: number;
  last_played_at?: string;
  is_active: boolean;
}

export interface UserProfileData {
  user: UserProfileGameStats;
  referrals: ReferralInfo;
  rankings: UserRankings;
}

/**
 * Унифицированный сервис профиля пользователя
 */
export const serverUserProfileService = {
  /**
   * Получить полные данные пользователя
   */
  async getUserData(telegramId: number): Promise<UserProfileGameStats> {
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    return user;
  },

  /**
   * Получить информацию о рефералах пользователя
   */
  async getUserReferralInfo(telegramId: number): Promise<ReferralInfo> {
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("referral_code, referral_count, referral_bonus, referred_by")
      .eq("telegram_id", telegramId)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    let referredByName: string | undefined;

    // Get referrer name if user was referred
    if (user.referred_by) {
      try {
        const { data: referrer } = await supabaseServer
          .from("users")
          .select("first_name, last_name, username")
          .eq("referral_code", user.referred_by)
          .single();

        if (referrer) {
          if (referrer.username) {
            referredByName = `@${referrer.username}`;
          } else if (referrer.first_name) {
            referredByName =
              referrer.first_name +
              (referrer.last_name ? ` ${referrer.last_name}` : "");
          } else {
            referredByName = "Someone";
          }
        }
      } catch (error) {
        console.error("Error getting referrer info:", error);
        referredByName = "Someone";
      }
    }

    return {
      code: user.referral_code,
      count: user.referral_count,
      bonus: user.referral_bonus,
      referredBy: user.referred_by || undefined,
      referredByName,
      // Add computed referral link
      referralLink: `https://t.me/circusle_bot?startapp=${user.referral_code}`,
    };
  },

  /**
   * Получить рейтинги пользователя по всем игровым режимам
   */
  async getUserRankings(telegramId: number): Promise<UserRankings> {
    // Get user data first
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const rankings: UserRankings = {
      overall: null,
      reaction: null,
      survival: null,
      physics: null,
      rotation: null,
    };

    // Overall ranking (by best_score for users with games > 0)
    if (user.total_games > 0) {
      const { count: overallCount, error: overallError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("total_games", 0)
        .gt("best_score", user.best_score);

      if (!overallError) {
        rankings.overall = (overallCount || 0) + 1;
      }
    }

    // Reaction ranking (by best reaction time)
    if (user.reaction_games > 0 && user.reaction_best_time > 0) {
      const { count: reactionCount, error: reactionError } =
        await supabaseServer
          .from("users")
          .select("id", { count: "exact" })
          .gt("reaction_games", 0)
          .gt("reaction_best_time", 0)
          .lt("reaction_best_time", user.reaction_best_time);

      if (!reactionError) {
        rankings.reaction = (reactionCount || 0) + 1;
      }
    }

    // Survival ranking (by best survival time, then by max level)
    if (user.survival_games > 0) {
      const { count: survivalCount, error: survivalError } =
        await supabaseServer
          .from("users")
          .select("id", { count: "exact" })
          .gt("survival_games", 0)
          .or(
            `survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`,
          );

      if (!survivalError) {
        rankings.survival = (survivalCount || 0) + 1;
      }
    }

    // Physics ranking (by best score, then by best time)
    if (user.physics_games > 0) {
      const { count: physicsCount, error: physicsError } = await supabaseServer
        .from("users")
        .select("id", { count: "exact" })
        .gt("physics_games", 0)
        .or(
          `physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`,
        );

      if (!physicsError) {
        rankings.physics = (physicsCount || 0) + 1;
      }
    }

    // Rotation ranking (by best time, then by max level)
    if (user.rotation_games > 0) {
      const { count: rotationCount, error: rotationError } =
        await supabaseServer
          .from("users")
          .select("id", { count: "exact" })
          .gt("rotation_games", 0)
          .or(
            `rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`,
          );

      if (!rotationError) {
        rankings.rotation = (rotationCount || 0) + 1;
      }
    }

    return rankings;
  },

  /**
   * Получить полные данные профиля пользователя (пользователь + рефералы + рейтинги)
   */
  async getUserProfileData(telegramId: number): Promise<UserProfileData> {
    try {

      const [user, referrals, rankings] = await Promise.all([
        this.getUserData(telegramId),
        this.getUserReferralInfo(telegramId),
        this.getUserRankings(telegramId),
      ]);

      return {
        user,
        referrals,
        rankings,
      };
    } catch (error) {
      console.error("Error fetching user profile data:", error);
      throw new Error("Failed to fetch user profile data");
    }
  },
};
