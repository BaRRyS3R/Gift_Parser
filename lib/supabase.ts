// src/lib/supabase.ts - Updated with league service integration

import { createClient } from "@supabase/supabase-js";

import { GameMode } from "@/types/game-modes/common";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

// Import league service
import { leagueService } from "./leagueService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
  REFERRAL_BONUS: 5,
} as const;

// League type
export type League = "Bronze" | "Silver" | "Gold" | "Diamond";

// Reward type
export interface PlayerReward {
  id: string;
  level: number;
  name: string;
  description: string;
  claimed_at?: string;
}

// Updated User interface with league and level system
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

  // Attempts management system
  attempts_remaining: number;
  last_attempt_at?: string;
  attempts_reset_at?: string;

  // Referral system
  referral_code: string; // Unique referral code
  referred_by?: string; // Referral code of who invited this user
  referral_bonus: number; // How many attempts this user gives to new referrals (default: 1)
  referral_count: number; // Number of users referred by this user

  // NEW: League and Level System
  player_level: number; // Player level (1-100)
  league: League; // Current league
  total_qualifying_games: number; // Games that count towards level (survival + physics + rotation)
  rewards_claimed: string[]; // Array of claimed reward IDs

  // General game statistics
  total_games: number;
  total_score: number;
  best_score: number;

  // Reaction Mode specific statistics (не считается для уровня)
  reaction_games: number;
  reaction_best_score: number;
  reaction_best_time: number; // Best reaction time in milliseconds
  reaction_average_time: number; // Average reaction time in milliseconds

  // Survival Mode specific statistics
  survival_games: number;
  survival_best_score: number;
  survival_best_time: number; // Best survival time in milliseconds
  survival_max_level: number; // Maximum level reached
  survival_best_streak: number; // Best perfect streak

  // Physics Mode specific statistics
  physics_games: number;
  physics_best_score: number;
  physics_best_time: number; // Best physics game time in milliseconds
  physics_total_hits: number; // Total correct hits across all physics games
  physics_best_hits: number; // Best hits in a single physics game
  physics_least_mistakes: number; // Fewest mistakes in a single physics game

  // Rotation Mode specific statistics
  rotation_games: number;
  rotation_best_score: number;
  rotation_best_time: number; // Best rotation game time in milliseconds
  rotation_max_level: number; // Maximum level reached in rotation mode
  rotation_best_streak: number; // Best perfect streak in rotation mode
  rotation_total_hits: number; // Total correct hits across all rotation games

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
      console.warn("Error getting server time, falling back to client time:", error);
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

  async validateReferralCodeAndGetReferrer(referralCode: string): Promise<{
    isValid: boolean;
    bonus: number;
    referrerName?: string;
    referrerUsername?: string;
  }> {
    try {
      const referrer = await this.findByReferralCode(referralCode);

      if (referrer) {
        // Формируем имя пригласившего
        let referrerName = referrer.first_name;
        if (referrer.last_name) {
          referrerName += ` ${referrer.last_name}`;
        }

        return {
          isValid: true,
          bonus: referrer.referral_bonus,
          referrerName,
          referrerUsername: referrer.username,
        };
      }

      return { isValid: false, bonus: 0 };
    } catch (error) {
      console.error("Error validating referral code and getting referrer info:", error);
      return { isValid: false, bonus: 0 };
    }
  },

  async findByReferralCode(referralCode: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) {
      console.error("Error finding user by referral code:", error);
      throw error;
    }

    return data;
  },

  async generateUniqueReferralCode(): Promise<string> {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
      code = "";
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existingUser = await this.findByReferralCode(code);
      if (!existingUser) {
        isUnique = true;
      }
    }

    return code;
  },

  async create(telegramUser: TelegramUser, referralCode?: string): Promise<User> {
    const referralCodeToUse = await this.generateUniqueReferralCode();
    let additionalAttempts = 10;
    let referredBy = null;

    // Handle referral
    if (referralCode) {
      const referrer = await this.findByReferralCode(referralCode);
      if (referrer) {
        referredBy = referralCode;
        additionalAttempts += referrer.referral_bonus;

        await supabase
          .from("users")
          .update({
            referral_count: referrer.referral_count + 1,
            attempts_remaining: referrer.attempts_remaining + 5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", referrer.id);

        console.log(`User referred by ${referralCode}, adding ${referrer.referral_bonus} bonus attempts to new user`);
      }
    }

    const userData = {
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || null,
      username: telegramUser.username || null,
      language_code: telegramUser.language_code || null,
      is_premium: telegramUser.is_premium || false,
      attempts_remaining: additionalAttempts,
      referral_code: referralCodeToUse,
      referred_by: referredBy,
      referral_bonus: 5,
      referral_count: 0,
      // Initialize league system for new users
      player_level: 1,
      league: "Bronze" as League,
      total_qualifying_games: 0,
      rewards_claimed: [],
    };

    const { data, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }

    return data;
  },

  async getReferralInfo(telegramId: number): Promise<ReferralInfo | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    let referredByName: string | undefined;

    if (user.referred_by) {
      try {
        const referrer = await this.findByReferralCode(user.referred_by);
        if (referrer) {
          if (referrer.username) {
            referredByName = `@${referrer.username}`;
          } else if (referrer.first_name) {
            referredByName = referrer.first_name + (referrer.last_name ? ` ${referrer.last_name}` : "");
          } else {
            referredByName = "s0meone";
          }
        }
      } catch (error) {
        console.error("Error getting referrer display name:", error);
        referredByName = "s0meone";
      }
    }

    return {
      referralCode: user.referral_code,
      referralLink: `https://t.me/marketaggregator_bot?startapp=${user.referral_code}`,
      referralCount: user.referral_count,
      referralBonus: user.referral_bonus,
      referredBy: user.referred_by || undefined,
      referredByName: referredByName,
    };
  },

  async getReferrerInfo(referralCode: string): Promise<{
    name: string;
    username?: string;
    bonus: number;
  } | null> {
    try {
      const referrer = await this.findByReferralCode(referralCode);
      if (!referrer) return null;

      return {
        name: referrer.first_name + (referrer.last_name ? ` ${referrer.last_name}` : ""),
        username: referrer.username,
        bonus: referrer.referral_bonus,
      };
    } catch (error) {
      console.error("Error getting referrer info:", error);
      return null;
    }
  },

  async checkAndUpdateAttemptsWithServerValidation(telegramId: number): Promise<AttemptsStatus> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");

    const serverTime = await this.getServerTime();
    const resetTime = user.attempts_reset_at ? new Date(user.attempts_reset_at) : null;

    if (resetTime && serverTime >= resetTime) {
      await this.resetAttempts(telegramId);
      return {
        canPlay: true,
        attemptsRemaining: Math.max(5, user.attempts_remaining),
        resetTime: undefined,
        timeUntilReset: undefined,
      };
    }

    if (user.last_attempt_at) {
      const lastAttemptTime = new Date(user.last_attempt_at);
      const timeSinceLastAttempt = serverTime.getTime() - lastAttemptTime.getTime();
      if (timeSinceLastAttempt < 0) {
        console.warn("Potential time manipulation detected for user:", telegramId);
      }
    }

    let timeUntilReset: number | undefined;
    if (resetTime && user.attempts_remaining === 0) {
      timeUntilReset = Math.max(0, resetTime.getTime() - serverTime.getTime());
    }

    return {
      canPlay: user.attempts_remaining > 0,
      attemptsRemaining: user.attempts_remaining,
      resetTime: resetTime || undefined,
      timeUntilReset,
    };
  },

  async consumeAttemptWithServerValidation(telegramId: number): Promise<AttemptsStatus> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");
    if (user.attempts_remaining <= 0) {
      throw new Error("No attempts remaining");
    }

    const serverTime = await this.getServerTime();
    const newAttemptsRemaining = Math.max(0, user.attempts_remaining - 1);

    const updates: any = {
      attempts_remaining: newAttemptsRemaining,
      last_attempt_at: serverTime.toISOString(),
    };

    if (newAttemptsRemaining === 0) {
      const resetTime = new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS);
      updates.attempts_reset_at = resetTime.toISOString();
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Error consuming attempt:", error);
      throw error;
    }

    const timeUntilReset = newAttemptsRemaining === 0 ? ATTEMPTS_CONFIG.RESET_INTERVAL_MS : undefined;

    return {
      canPlay: newAttemptsRemaining > 0,
      attemptsRemaining: newAttemptsRemaining,
      resetTime: newAttemptsRemaining === 0
        ? new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS)
        : undefined,
      timeUntilReset,
    };
  },

  async resetAttempts(telegramId: number): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");

    const newAttempts = Math.max(ATTEMPTS_CONFIG.RESET_ATTEMPTS, user.attempts_remaining);

    const { error } = await supabase
      .from("users")
      .update({
        attempts_remaining: newAttempts,
        attempts_reset_at: null,
      })
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Error resetting attempts:", error);
      throw error;
    }
  },

  async instantResetAttempts(telegramId: number): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");

    const { error } = await supabase
      .from("users")
      .update({
        attempts_remaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
        attempts_reset_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Error performing instant reset:", error);
      throw error;
    }
  },

  // Legacy methods maintained for backward compatibility
  async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
    return this.checkAndUpdateAttemptsWithServerValidation(telegramId);
  },

  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    return this.consumeAttemptWithServerValidation(telegramId);
  },

  // UPDATED: Enhanced updateGameStats method with league system integration
  async updateGameStats(telegramId: number, gameResult: ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");

    const updates: any = {
      total_games: user.total_games + 1,
      total_score: user.total_score + gameResult.score,
      best_score: Math.max(user.best_score, gameResult.score),
      last_played_at: new Date().toISOString(),
    };

    // Update mode-specific statistics
    if (gameResult.mode === GameMode.REACTION) {
      const reactionResult = gameResult as ReactionGameResult;
      updates.reaction_games = user.reaction_games + 1;
      updates.reaction_best_score = Math.max(user.reaction_best_score || 0, reactionResult.score);

      if (!reactionResult.missed && reactionResult.reactionTime > 0) {
        updates.reaction_best_time = user.reaction_best_time > 0
          ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
          : reactionResult.reactionTime;

        const totalReactionGames = user.reaction_games;
        const currentAverage = user.reaction_average_time || 0;
        const newAverage = totalReactionGames > 0
          ? (currentAverage * totalReactionGames + reactionResult.reactionTime) / (totalReactionGames + 1)
          : reactionResult.reactionTime;

        updates.reaction_average_time = Math.round(newAverage);
      }
    } else if (gameResult.mode === GameMode.SURVIVAL) {
      const survivalResult = gameResult as SurvivalGameResult;
      updates.survival_games = user.survival_games + 1;
      updates.survival_best_score = Math.max(user.survival_best_score || 0, survivalResult.score);
      updates.survival_best_time = Math.max(user.survival_best_time || 0, survivalResult.survivalTime);
      updates.survival_max_level = Math.max(user.survival_max_level || 0, survivalResult.maxLevelReached);
      updates.survival_best_streak = Math.max(user.survival_best_streak || 0, survivalResult.perfectStreak);
    } else if (gameResult.mode === GameMode.PHYSICS) {
      const physicsResult = gameResult as PhysicsGameResult;
      updates.physics_games = user.physics_games + 1;
      updates.physics_best_score = Math.max(user.physics_best_score || 0, physicsResult.score);

      updates.physics_best_time = Math.max(
        user.physics_best_time || 0,
        Math.round(physicsResult.gameTime)
      );

      updates.physics_total_hits = (user.physics_total_hits || 0) + physicsResult.totalHits;
      updates.physics_best_hits = Math.max(user.physics_best_hits || 0, physicsResult.totalHits);

      if (user.physics_least_mistakes === undefined || user.physics_least_mistakes === null) {
        updates.physics_least_mistakes = physicsResult.mistakesMade;
      } else {
        updates.physics_least_mistakes = Math.min(user.physics_least_mistakes, physicsResult.mistakesMade);
      }
    } else if (gameResult.mode === GameMode.ROTATION) {
      const rotationResult = gameResult as RotationGameResult;
      updates.rotation_games = user.rotation_games + 1;
      updates.rotation_best_score = Math.max(user.rotation_best_score || 0, rotationResult.score);
      updates.rotation_best_time = Math.max(user.rotation_best_time || 0, rotationResult.survivalTime);
      updates.rotation_max_level = Math.max(user.rotation_max_level || 0, rotationResult.maxLevelReached);
      updates.rotation_best_streak = Math.max(user.rotation_best_streak || 0, rotationResult.perfectStreak);
      updates.rotation_total_hits = (user.rotation_total_hits || 0) + rotationResult.correctHits;
    }

    // Update main game statistics in database
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Error updating user stats:", error);
      throw error;
    }

    // Update league and level statistics using dedicated service
    const updatedUser = { ...user, ...updates };
    const leagueUpdateResult = await leagueService.updateLeagueStats(updatedUser, gameResult);

    if (!leagueUpdateResult.success) {
      console.error("Error updating league stats:", leagueUpdateResult.error);
      // Continue execution - league update failure should not break main flow
    } else if (leagueUpdateResult.levelChanged || leagueUpdateResult.leagueChanged) {
      console.log(`League progression: Level ${leagueUpdateResult.levelChanged ? `→ ${leagueUpdateResult.newLevel}` : 'unchanged'}, League ${leagueUpdateResult.leagueChanged ? `→ ${leagueUpdateResult.newLeague}` : 'unchanged'}`);
    }
  },

  async saveGameResult(telegramId: number, gameResult: ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");

    console.log("Updating user statistics with game result:", {
      mode: gameResult.mode,
      score: gameResult.score,
      duration: gameResult.duration
    });

    await this.updateGameStats(telegramId, gameResult);
  },

  // Legacy leaderboard methods (existing methods remain unchanged)
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        best_score,
        total_games,
        last_played_at
      `)
      .gt("total_games", 0)
      .order("best_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      throw error;
    }

    return data || [];
  },

  async getReactionLeaderboard(limit: number = 100): Promise<ReactionLeaderboard[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        reaction_best_time,
        reaction_games,
        reaction_best_score,
        last_played_at
      `)
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .order("reaction_best_time", { ascending: true })
      .order("reaction_best_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching reaction leaderboard:", error);
      throw error;
    }

    return (data || []).map((user: any) => ({
      ...user,
      best_reaction_time: user.reaction_best_time,
      reaction_games: user.reaction_games,
      best_reaction_score: user.reaction_best_score,
    }));
  },

  async getSurvivalLeaderboard(limit: number = 100): Promise<SurvivalLeaderboard[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        survival_best_time,
        survival_max_level,
        survival_best_streak,
        survival_games,
        last_played_at
      `)
      .gt("survival_games", 0)
      .order("survival_best_time", { ascending: false })
      .order("survival_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching survival leaderboard:", error);
      throw error;
    }

    return (data || []).map((user: any) => ({
      ...user,
      best_survival_time: user.survival_best_time,
      max_level: user.survival_max_level,
      best_streak: user.survival_best_streak,
      survival_games: user.survival_games,
    }));
  },

  async getPhysicsLeaderboard(limit: number = 100): Promise<PhysicsLeaderboard[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        physics_best_score,
        physics_best_time,
        physics_best_hits,
        physics_least_mistakes,
        physics_games,
        last_played_at
      `)
      .gt("physics_games", 0)
      .order("physics_best_score", { ascending: false })
      .order("physics_best_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching physics leaderboard:", error);
      throw error;
    }

    return (data || []).map((user: any) => ({
      ...user,
      best_physics_score: user.physics_best_score,
      best_physics_time: user.physics_best_time,
      best_hits: user.physics_best_hits,
      least_mistakes: user.physics_least_mistakes,
      physics_games: user.physics_games,
    }));
  },

  async getRotationLeaderboard(limit: number = 100): Promise<RotationLeaderboard[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        rotation_best_time,
        rotation_max_level,
        rotation_best_streak,
        rotation_total_hits,
        rotation_games,
        last_played_at
      `)
      .gt("rotation_games", 0)
      .order("rotation_best_time", { ascending: false })
      .order("rotation_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching rotation leaderboard:", error);
      throw error;
    }

    return (data || []).map((user: any) => ({
      ...user,
      best_rotation_time: user.rotation_best_time,
      max_level: user.rotation_max_level,
      best_streak: user.rotation_best_streak,
      total_hits: user.rotation_total_hits,
      rotation_games: user.rotation_games,
    }));
  },

  async getUserRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user || user.total_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("total_games", 0)
      .gt("best_score", user.best_score);

    if (error) {
      console.error("Error fetching user ranking:", error);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserReactionRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user || user.reaction_games === 0 || !user.reaction_best_time) return null;

    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .lt("reaction_best_time", user.reaction_best_time);

    if (error) {
      console.error("Error fetching user reaction ranking:", error);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserSurvivalRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user || user.survival_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("survival_games", 0)
      .or(`survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`);

    if (error) {
      console.error("Error fetching user survival ranking:", error);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserPhysicsRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user || user.physics_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("physics_games", 0)
      .or(`physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`);

    if (error) {
      console.error("Error fetching user physics ranking:", error);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserRotationRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user || user.rotation_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("rotation_games", 0)
      .or(`rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`);

    if (error) {
      console.error("Error fetching user rotation ranking:", error);
      throw error;
    }

    return (count || 0) + 1;
  },

  // NEW: Expose league service methods through userService for convenience
  async claimReward(telegramId: number, rewardId: string): Promise<boolean> {
    const result = await leagueService.claimReward(telegramId, rewardId);
    if (!result.success) {
      throw new Error(result.error || "Failed to claim reward");
    }
    return true;
  },

  async getUserWithLeagueStats(telegramId: number) {
    return await leagueService.getUserWithLeagueStats(telegramId);
  },

  async initializeLeagueSystem(telegramId: number): Promise<void> {
    const result = await leagueService.initializeLeagueSystem(telegramId);
    if (!result.success) {
      throw new Error(result.error || "Failed to initialize league system");
    }
  },

  async getLeagueLeaderboard(league: League, limit: number = 50) {
    return await leagueService.getLeagueLeaderboard(league, limit);
  },

  async getLeagueStatistics() {
    return await leagueService.getLeagueStatistics();
  },

  async validateAndRepairLeagueData(telegramId?: number) {
    return await leagueService.validateAndRepairLeagueData(telegramId);
  },
};

// Export league service for direct access if needed
export { leagueService };

// Updated interfaces (existing interfaces remain unchanged)
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