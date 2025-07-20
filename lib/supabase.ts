// src/lib/supabase.ts - Cleaned client service with moved logic to API endpoints

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
  REFERRAL_BONUS: 5,
} as const;

export interface User {
  id: string; // UUID v4
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;

  // Trust and moderation system
  trust_score: number; // Default: 50, Premium: 60
  blocked_until?: string; // ISO timestamp when user is blocked until (null if not blocked)

  // Attempts management system
  attempts_remaining: number;
  last_attempt_at?: string;
  attempts_reset_at?: string;

  // Referral system
  referral_code: string;
  referred_by?: string;
  referral_bonus: number;
  referral_count: number;

  // General game statistics
  total_games: number;
  total_score: number;
  best_score: number;

  // League and Level system
  current_level: number;
  current_league_id?: number;

  // Game mode specific statistics
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

  // Legacy fields (for backward compatibility)
  total_correct_hits: number;
  total_wrong_hits: number;
  total_missed_circles: number;
  best_accuracy: number;

  last_played_at?: string;
  is_active: boolean;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export const userService = {
  async getServerTime(): Promise<Date> {
    try {
      const { data, error } = await supabase.rpc("get_current_timestamp");

      if (error) {
        console.warn("Failed to get server time, using client time:", error);

        return new Date();
      }

      return new Date(data);
    } catch (error) {
      console.warn(
        "Error getting server time, falling back to client time:",
        error,
      );

      return new Date();
    }
  },

  async findByTelegramId(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("Error finding user:", error);
      throw error;
    }

    return data;
  },

  // REMOVED: validateReferralCodeAndGetReferrer - moved to profile module/API
  // REMOVED: findByReferralCode - moved to server service
  // REMOVED: generateUniqueReferralCode - moved to server service

  async create(
    telegramUser: TelegramUser,
    referralCode?: string,
  ): Promise<User> {
    // This method should primarily be used for client-side data creation
    // Most creation logic should go through the registration API
    throw new Error(
      "User creation should go through /api/auth/register endpoint",
    );
  },

  // REMOVED: getReferralInfo - moved to profile module/API
  // REMOVED: getReferrerInfo - moved to profile module/API

  async checkAndUpdateAttemptsWithServerValidation(
    telegramId: number,
  ): Promise<AttemptsStatus> {
    // These should now go through the attempts API
    throw new Error(
      "Attempts management should go through /api/user/attempts endpoints",
    );
  },

  async consumeAttemptWithServerValidation(
    telegramId: number,
  ): Promise<AttemptsStatus> {
    throw new Error(
      "Attempts management should go through /api/user/attempts endpoints",
    );
  },

  async resetAttempts(telegramId: number): Promise<void> {
    throw new Error(
      "Attempts management should go through /api/user/attempts endpoints",
    );
  },

  async instantResetAttempts(telegramId: number): Promise<void> {
    throw new Error(
      "Attempts management should go through /api/user/attempts endpoints",
    );
  },

  // Convenience methods for backwards compatibility
  async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
    return this.checkAndUpdateAttemptsWithServerValidation(telegramId);
  },

  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    return this.consumeAttemptWithServerValidation(telegramId);
  },

  // REMOVED: All leaderboard methods - moved to leaderboard module/API
  // These include:
  // - getLeaderboard
  // - getReactionLeaderboard
  // - getSurvivalLeaderboard
  // - getPhysicsLeaderboard
  // - getRotationLeaderboard
  // - getUserRanking
  // - getUserReactionRanking
  // - getUserSurvivalRanking
  // - getUserPhysicsRanking
  // - getUserRotationRanking

  // NOTE: All removed methods should now be accessed through:
  // - useProfile hook for referrals and rankings
  // - useLeaderboard hook for leaderboard data
  // - useAttempts hook for attempts management (when created)
  // - Respective API endpoints for server operations
};

// Existing interfaces (for backward compatibility)
export interface LeaderboardEntry {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_score: number;
  total_games: number;
  last_played_at?: string;
}

export interface ReactionLeaderboard {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_reaction_time: number;
  reaction_games: number;
  best_reaction_score: number;
  last_played_at?: string;
}

export interface SurvivalLeaderboard {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_survival_time: number;
  max_level: number;
  best_streak: number;
  survival_games: number;
  last_played_at?: string;
}

export interface PhysicsLeaderboard {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_physics_score: number;
  best_physics_time: number;
  best_hits: number;
  least_mistakes: number;
  physics_games: number;
  last_played_at?: string;
}

export interface RotationLeaderboard {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  best_rotation_time: number;
  max_level: number;
  best_streak: number;
  total_hits: number;
  rotation_games: number;
  last_played_at?: string;
}

export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  referralBonus: number;
  referredBy?: string;
  referredByName?: string;
}
