// src/lib/supabase.ts - Complete secured service with bot protection system

import { createClient } from "@supabase/supabase-js";

import leagueService, {
  type LeagueRewardResult,
  type League,
} from "./league_service";

import { GameMode } from "@/types/game-modes/common";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// SECURITY: Only log Supabase config in development
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL configured:', supabaseUrl ? 'Yes' : 'No');
  console.log('Supabase Key configured:', supabaseAnonKey ? 'Yes' : 'No');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000,
  REFERRAL_BONUS: 5,
} as const;

// SECURITY: Block duration configuration (easily adjustable)
const BLOCK_DURATIONS = {
  CAPTCHA_FAILED: 2, // minutes
  BIOMETRIC_FAILED: 5, // minutes
  SUSPICIOUS_ACTIVITY: 10, // minutes
} as const;

// SECURITY: Helper function for secure logging
const secureLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data && typeof data === 'object') {
      // Remove sensitive fields from logging
      const sanitizedData = { ...data };
      if (sanitizedData.id && typeof sanitizedData.id === 'string' && sanitizedData.id.length > 10) {
        sanitizedData.id = sanitizedData.id.substring(0, 8) + '...';
      }
      if (sanitizedData.user_id) {
        sanitizedData.user_id = '***';
      }
      console.log(message, sanitizedData);
    } else {
      console.log(message, data);
    }
  }
};

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

  // Security system
  trust_score: number;
  blocked_until?: string;

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

export interface UserBlock {
  id: string;
  user_id: string;
  telegram_id: number;
  block_reason: 'captcha_failed' | 'biometric_failed' | 'suspicious_activity';
  blocked_at: string;
  unblocked_at?: string;
  block_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecurityCheckResult {
  isBlocked: boolean;
  needsCaptcha: boolean;
  needsBiometric: boolean;
  trustScore: number;
  timeUntilUnblock?: number;
  blockReason?: string;
}

export interface GameSaveResult {
  success: boolean;
  leagueChanged?: boolean;
  newLeague?: League;
  levelChanged?: boolean;
  newLevel?: number;
  reward?: LeagueRewardResult;
  missedRewards?: LeagueRewardResult[];
  error?: string;
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
        secureLog("Failed to get server time, using client time:", error.message);
        return new Date();
      }

      return new Date(data);
    } catch (error) {
      secureLog("Error getting server time, falling back to client time:",
        error instanceof Error ? error.message : 'Unknown error');
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
      secureLog("Error finding user:", error.message);
      throw error;
    }

    // SECURITY: Don't log full user data in production
    if (data) {
      secureLog("User found for telegram_id:", telegramId);
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
        let referrerName = referrer.first_name;

        if (referrer.last_name) {
          referrerName += ` ${referrer.last_name}`;
        }

        secureLog("Valid referral code found");

        return {
          isValid: true,
          bonus: referrer.referral_bonus,
          referrerName,
          referrerUsername: referrer.username,
        };
      }

      return { isValid: false, bonus: 0 };
    } catch (error) {
      secureLog("Error validating referral code:", error instanceof Error ? error.message : 'Unknown error');
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
      secureLog("Error finding user by referral code:", error.message);
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
        code += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }

      const existingUser = await this.findByReferralCode(code);

      if (!existingUser) {
        isUnique = true;
      }
    }

    return code;
  },

  async create(
    telegramUser: TelegramUser,
    referralCode?: string,
  ): Promise<User> {
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

        secureLog("Referral bonus applied");
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
      current_level: 1,
      trust_score: telegramUser.is_premium ? 60 : 50, // Initial trust score with premium bonus
    };

    const { data, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      secureLog("Error creating user:", error.message);
      throw error;
    }

    try {
      await leagueService.initializeUserLeague(data.id, 0);
    } catch (leagueError) {
      secureLog("Error initializing user league:", leagueError instanceof Error ? leagueError.message : 'Unknown error');
    }

    secureLog("User created successfully");
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
            referredByName =
              referrer.first_name +
              (referrer.last_name ? ` ${referrer.last_name}` : "");
          } else {
            referredByName = "s0meone";
          }
        }
      } catch (error) {
        secureLog("Error getting referrer display name:", error instanceof Error ? error.message : 'Unknown error');
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
        name:
          referrer.first_name +
          (referrer.last_name ? ` ${referrer.last_name}` : ""),
        username: referrer.username,
        bonus: referrer.referral_bonus,
      };
    } catch (error) {
      secureLog("Error getting referrer info:", error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  },

  async checkAndUpdateAttemptsWithServerValidation(
    telegramId: number,
  ): Promise<AttemptsStatus> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) throw new Error("User not found");

    const serverTime = await this.getServerTime();
    const resetTime = user.attempts_reset_at
      ? new Date(user.attempts_reset_at)
      : null;

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
      const timeSinceLastAttempt =
        serverTime.getTime() - lastAttemptTime.getTime();

      if (timeSinceLastAttempt < 0) {
        secureLog("Potential time manipulation detected for user:", telegramId);
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

  async consumeAttemptWithServerValidation(
    telegramId: number,
  ): Promise<AttemptsStatus> {
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
      const resetTime = new Date(
        serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS,
      );

      updates.attempts_reset_at = resetTime.toISOString();
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (error) {
      secureLog("Error consuming attempt:", error.message);
      throw error;
    }

    const timeUntilReset =
      newAttemptsRemaining === 0
        ? ATTEMPTS_CONFIG.RESET_INTERVAL_MS
        : undefined;

    return {
      canPlay: newAttemptsRemaining > 0,
      attemptsRemaining: newAttemptsRemaining,
      resetTime:
        newAttemptsRemaining === 0
          ? new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS)
          : undefined,
      timeUntilReset,
    };
  },

  async resetAttempts(telegramId: number): Promise<void> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) throw new Error("User not found");

    const newAttempts = Math.max(
      ATTEMPTS_CONFIG.RESET_ATTEMPTS,
      user.attempts_remaining,
    );

    const { error } = await supabase
      .from("users")
      .update({
        attempts_remaining: newAttempts,
        attempts_reset_at: null,
      })
      .eq("telegram_id", telegramId);

    if (error) {
      secureLog("Error resetting attempts:", error.message);
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
      secureLog("Error performing instant reset:", error.message);
      throw error;
    }
  },

  async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
    return this.checkAndUpdateAttemptsWithServerValidation(telegramId);
  },

  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    return this.consumeAttemptWithServerValidation(telegramId);
  },

  // ============================================================================
  // SECURITY SYSTEM METHODS
  // ============================================================================

  /**
   * Check if user is currently blocked and unblock if time has passed
   */
  async checkUserBlockStatus(telegramId: number): Promise<SecurityCheckResult> {
    try {
      // First check and unblock if time has passed
      const { error: unblockError } = await supabase.rpc('check_and_unblock_user', {
        user_telegram_id: telegramId
      });

      if (unblockError) {
        secureLog("Error checking unblock status:", unblockError.message);
      }

      // Get current user data
      const user = await this.findByTelegramId(telegramId);
      if (!user) {
        throw new Error("User not found");
      }

      const serverTime = await this.getServerTime();
      const isBlocked = user.blocked_until ? new Date(user.blocked_until) > serverTime : false;

      let timeUntilUnblock: number | undefined;
      let blockReason: string | undefined;

      if (isBlocked && user.blocked_until) {
        timeUntilUnblock = new Date(user.blocked_until).getTime() - serverTime.getTime();

        // Get the most recent active block reason
        const { data: blockData } = await supabase
          .from("user_blocks")
          .select("block_reason")
          .eq("telegram_id", telegramId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (blockData) {
          blockReason = blockData.block_reason;
        }
      }

      const trustScore = user.trust_score || 50;

      return {
        isBlocked,
        needsCaptcha: !isBlocked && trustScore < 40,
        needsBiometric: !isBlocked && trustScore < 20,
        trustScore,
        timeUntilUnblock: timeUntilUnblock && timeUntilUnblock > 0 ? timeUntilUnblock : undefined,
        blockReason,
      };
    } catch (error) {
      secureLog("Error checking user block status:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Block user for security violation
   */
  async blockUser(
    telegramId: number,
    reason: 'captcha_failed' | 'biometric_failed' | 'suspicious_activity'
  ): Promise<boolean> {
    try {
      let duration: number;
      switch (reason) {
        case 'captcha_failed':
          duration = BLOCK_DURATIONS.CAPTCHA_FAILED;
          break;
        case 'biometric_failed':
          duration = BLOCK_DURATIONS.BIOMETRIC_FAILED;
          break;
        case 'suspicious_activity':
          duration = BLOCK_DURATIONS.SUSPICIOUS_ACTIVITY;
          break;
        default:
          duration = BLOCK_DURATIONS.CAPTCHA_FAILED;
      }

      const { data, error } = await supabase.rpc('block_user', {
        user_telegram_id: telegramId,
        reason: reason,
        duration_minutes: duration
      });

      if (error) {
        secureLog("Error blocking user:", error.message);
        throw error;
      }

      secureLog(`User ${telegramId} blocked for ${reason} for ${duration} minutes`);
      return data;
    } catch (error) {
      secureLog("Error in blockUser:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Update user trust score
   */
  async updateTrustScore(
    telegramId: number,
    scoreChange: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('update_trust_score', {
        user_telegram_id: telegramId,
        score_change: scoreChange
      });

      if (error) {
        secureLog("Error updating trust score:", error.message);
        throw error;
      }

      secureLog(`Trust score updated for user ${telegramId}: ${scoreChange > 0 ? '+' : ''}${scoreChange}`);
      return data || 0;
    } catch (error) {
      secureLog("Error in updateTrustScore:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Validate captcha and update trust score
   */
  async validateCaptcha(
    telegramId: number,
    userInput: string,
    correctAnswer: string,
    completedInTime: boolean
  ): Promise<{ success: boolean; newTrustScore: number }> {
    try {
      const isCorrect = userInput.toLowerCase() === correctAnswer.toLowerCase();

      if (isCorrect && completedInTime) {
        // Captcha passed - increase trust score
        const newTrustScore = await this.updateTrustScore(telegramId, 15);
        secureLog(`Captcha passed for user ${telegramId}`);
        return { success: true, newTrustScore };
      } else {
        // Captcha failed - block user and decrease trust score
        await this.updateTrustScore(telegramId, -10);
        await this.blockUser(telegramId, 'captcha_failed');
        secureLog(`Captcha failed for user ${telegramId}: ${!isCorrect ? 'incorrect answer' : 'timeout'}`);
        return { success: false, newTrustScore: 0 };
      }
    } catch (error) {
      secureLog("Error validating captcha:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Validate biometric authentication and update trust score
   */
  async validateBiometric(
    telegramId: number,
    success: boolean,
    completedInTime: boolean
  ): Promise<{ success: boolean; newTrustScore: number }> {
    try {
      if (success && completedInTime) {
        // Biometric passed - increase trust score significantly
        const newTrustScore = await this.updateTrustScore(telegramId, 30);
        secureLog(`Biometric authentication passed for user ${telegramId}`);
        return { success: true, newTrustScore };
      } else {
        // Biometric failed - block user and decrease trust score
        await this.updateTrustScore(telegramId, -15);
        await this.blockUser(telegramId, 'biometric_failed');
        secureLog(`Biometric authentication failed for user ${telegramId}: ${!success ? 'failed authentication' : 'timeout'}`);
        return { success: false, newTrustScore: 0 };
      }
    } catch (error) {
      secureLog("Error validating biometric:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Get user block history
   */
  async getUserBlockHistory(telegramId: number, limit: number = 10): Promise<UserBlock[]> {
    try {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("*")
        .eq("telegram_id", telegramId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        secureLog("Error fetching user block history:", error.message);
        throw error;
      }

      return data || [];
    } catch (error) {
      secureLog("Error in getUserBlockHistory:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  /**
   * Force unblock user (admin function)
   */
  async forceUnblockUser(telegramId: number): Promise<boolean> {
    try {
      const { error: updateUserError } = await supabase
        .from("users")
        .update({
          is_active: true,
          blocked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (updateUserError) {
        secureLog("Error force unblocking user (users table):", updateUserError.message);
        throw updateUserError;
      }

      const { error: updateBlockError } = await supabase
        .from("user_blocks")
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId)
        .eq("is_active", true);

      if (updateBlockError) {
        secureLog("Error force unblocking user (blocks table):", updateBlockError.message);
        throw updateBlockError;
      }

      secureLog(`User ${telegramId} force unblocked`);
      return true;
    } catch (error) {
      secureLog("Error in forceUnblockUser:", error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // ============================================================================
  // EXISTING GAME METHODS (unchanged)
  // ============================================================================

  async updateGameStats(
    telegramId: number,
    gameResult:
      | ReactionGameResult
      | SurvivalGameResult
      | PhysicsGameResult
      | RotationGameResult,
  ): Promise<GameSaveResult> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) throw new Error("User not found");

    const previousTotalGames = user.total_games;

    // CRITICAL CHANGE: Exclude reaction mode from total_games counting
    const isCompetitiveMode = gameResult.mode !== GameMode.REACTION;
    const newTotalGames = isCompetitiveMode
      ? previousTotalGames + 1
      : previousTotalGames;

    const previousLevel = user.current_level;
    const newLevel = leagueService.calculateLevel(newTotalGames);

    // SECURITY: Don't log detailed game result in production
    secureLog("Updating user statistics", {
      mode: gameResult.mode,
      score: gameResult.score,
      isCompetitive: isCompetitiveMode
    });

    const updates: any = {
      total_games: newTotalGames,
      total_score: user.total_score + gameResult.score,
      best_score: Math.max(user.best_score, gameResult.score),
      current_level: newLevel,
      last_played_at: new Date().toISOString(),
    };

    // Mode-specific stats updates
    if (gameResult.mode === GameMode.REACTION) {
      const reactionResult = gameResult as ReactionGameResult;

      updates.reaction_games = user.reaction_games + 1;
      updates.reaction_best_score = Math.max(
        user.reaction_best_score || 0,
        reactionResult.score,
      );

      if (!reactionResult.missed && reactionResult.reactionTime > 0) {
        updates.reaction_best_time =
          user.reaction_best_time > 0
            ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
            : reactionResult.reactionTime;

        const totalReactionGames = user.reaction_games;
        const currentAverage = user.reaction_average_time || 0;
        const newAverage =
          totalReactionGames > 0
            ? (currentAverage * totalReactionGames +
              reactionResult.reactionTime) /
            (totalReactionGames + 1)
            : reactionResult.reactionTime;

        updates.reaction_average_time = Math.round(newAverage);
      }
    } else if (gameResult.mode === GameMode.SURVIVAL) {
      const survivalResult = gameResult as SurvivalGameResult;

      updates.survival_games = user.survival_games + 1;
      updates.survival_best_score = Math.max(
        user.survival_best_score || 0,
        survivalResult.score,
      );
      updates.survival_best_time = Math.max(
        user.survival_best_time || 0,
        survivalResult.survivalTime,
      );
      updates.survival_max_level = Math.max(
        user.survival_max_level || 0,
        survivalResult.maxLevelReached,
      );
      updates.survival_best_streak = Math.max(
        user.survival_best_streak || 0,
        survivalResult.perfectStreak,
      );
    } else if (gameResult.mode === GameMode.PHYSICS) {
      const physicsResult = gameResult as PhysicsGameResult;

      updates.physics_games = user.physics_games + 1;
      updates.physics_best_score = Math.max(
        user.physics_best_score || 0,
        physicsResult.score,
      );
      updates.physics_best_time = Math.max(
        user.physics_best_time || 0,
        Math.round(physicsResult.gameTime),
      );
      updates.physics_total_hits =
        (user.physics_total_hits || 0) + physicsResult.totalHits;
      updates.physics_best_hits = Math.max(
        user.physics_best_hits || 0,
        physicsResult.totalHits,
      );

      if (
        user.physics_least_mistakes === undefined ||
        user.physics_least_mistakes === null
      ) {
        updates.physics_least_mistakes = physicsResult.mistakesMade;
      } else {
        updates.physics_least_mistakes = Math.min(
          user.physics_least_mistakes,
          physicsResult.mistakesMade,
        );
      }
    } else if (gameResult.mode === GameMode.ROTATION) {
      const rotationResult = gameResult as RotationGameResult;

      updates.rotation_games = user.rotation_games + 1;
      updates.rotation_best_score = Math.max(
        user.rotation_best_score || 0,
        rotationResult.score,
      );
      updates.rotation_best_time = Math.max(
        user.rotation_best_time || 0,
        rotationResult.survivalTime,
      );
      updates.rotation_max_level = Math.max(
        user.rotation_max_level || 0,
        rotationResult.maxLevelReached,
      );
      updates.rotation_best_streak = Math.max(
        user.rotation_best_streak || 0,
        rotationResult.perfectStreak,
      );
      updates.rotation_total_hits =
        (user.rotation_total_hits || 0) + rotationResult.correctHits;
    }

    // Update user stats
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (error) {
      secureLog("Error updating user stats:", error.message);
      throw error;
    }

    // League checking only for competitive modes
    try {
      if (isCompetitiveMode) {
        const leagueResult = await leagueService.checkAndUpdateLeague(
          user.id,
          newTotalGames,
        );

        return {
          success: true,
          leagueChanged: leagueResult.leagueChanged,
          newLeague: leagueResult.newLeague,
          levelChanged: newLevel !== previousLevel,
          newLevel: newLevel !== previousLevel ? newLevel : undefined,
          reward: leagueResult.reward,
          missedRewards: leagueResult.missedRewards,
        };
      } else {
        return {
          success: true,
          leagueChanged: false,
          levelChanged: false,
        };
      }
    } catch (leagueError) {
      secureLog("Error checking league after game:", leagueError instanceof Error ? leagueError.message : 'Unknown error');

      return {
        success: true,
        leagueChanged: false,
        levelChanged: newLevel !== previousLevel,
        newLevel: newLevel !== previousLevel ? newLevel : undefined,
        error: "League check failed",
      };
    }
  },

  async saveGameResult(
    telegramId: number,
    gameResult:
      | ReactionGameResult
      | SurvivalGameResult
      | PhysicsGameResult
      | RotationGameResult,
  ): Promise<GameSaveResult> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) throw new Error("User not found");

    return await this.updateGameStats(telegramId, gameResult);
  },

  // SECURITY: Secured leaderboard methods without UUID logging
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        best_score,
        total_games,
        last_played_at
      `,
      )
      .gt("total_games", 0)
      .order("best_score", { ascending: false })
      .limit(limit);

    if (error) {
      secureLog("Error fetching leaderboard:", error.message);
      throw error;
    }

    return data || [];
  },

  async getReactionLeaderboard(limit: number = 100): Promise<ReactionLeaderboard[]> {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        telegram_id,
        first_name,
        last_name,
        username,
        is_premium,
        reaction_best_time,
        reaction_games,
        reaction_best_score,
        last_played_at
      `,
      )
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .order("reaction_best_time", { ascending: true })
      .order("reaction_best_score", { ascending: false })
      .limit(limit);

    if (error) {
      secureLog("Error fetching reaction leaderboard:", error.message);
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
      .select(
        `
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
      `,
      )
      .gt("survival_games", 0)
      .order("survival_best_time", { ascending: false })
      .order("survival_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      secureLog("Error fetching survival leaderboard:", error.message);
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
      .select(
        `
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
      `,
      )
      .gt("physics_games", 0)
      .order("physics_best_score", { ascending: false })
      .order("physics_best_time", { ascending: false })
      .limit(limit);

    if (error) {
      secureLog("Error fetching physics leaderboard:", error.message);
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
      .select(
        `
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
      `,
      )
      .gt("rotation_games", 0)
      .order("rotation_best_time", { ascending: false })
      .order("rotation_max_level", { ascending: false })
      .limit(limit);

    if (error) {
      secureLog("Error fetching rotation leaderboard:", error.message);
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
      .select("telegram_id", { count: "exact" })
      .gt("total_games", 0)
      .gt("best_score", user.best_score);

    if (error) {
      secureLog("Error fetching user ranking:", error.message);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserReactionRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user || user.reaction_games === 0 || !user.reaction_best_time)
      return null;

    const { count, error } = await supabase
      .from("users")
      .select("telegram_id", { count: "exact" })
      .gt("reaction_games", 0)
      .gt("reaction_best_time", 0)
      .lt("reaction_best_time", user.reaction_best_time);

    if (error) {
      secureLog("Error fetching user reaction ranking:", error.message);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserSurvivalRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user || user.survival_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("telegram_id", { count: "exact" })
      .gt("survival_games", 0)
      .or(
        `survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`,
      );

    if (error) {
      secureLog("Error fetching user survival ranking:", error.message);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserPhysicsRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user || user.physics_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("telegram_id", { count: "exact" })
      .gt("physics_games", 0)
      .or(
        `physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`,
      );

    if (error) {
      secureLog("Error fetching user physics ranking:", error.message);
      throw error;
    }

    return (count || 0) + 1;
  },

  async getUserRotationRanking(telegramId: number): Promise<number | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user || user.rotation_games === 0) return null;

    const { count, error } = await supabase
      .from("users")
      .select("telegram_id", { count: "exact" })
      .gt("rotation_games", 0)
      .or(
        `rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`,
      );

    if (error) {
      secureLog("Error fetching user rotation ranking:", error.message);
      throw error;
    }

    return (count || 0) + 1;
  },
};

// SECURITY: Interfaces updated to remove UUID exposure
export interface LeaderboardEntry {
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