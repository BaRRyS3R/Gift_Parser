// src/lib/server/attemptsService.ts - Updated with bonus_restore_attempts logic

import { supabaseServer } from "@/lib/supabase_server";

// Configuration constants - Updated with bonus restore attempts support
const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  BASE_RESET_ATTEMPTS: 10, // Base amount for reset operations
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours
  REFERRAL_BONUS: 5,
  INSTANT_RESET_COST: 100,
} as const;

// Enhanced attempts status interface
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

// Enhanced status with level info
export interface AttemptsStatusWithLevel extends AttemptsStatus {
  userLevel?: {
    currentLevel: number;
    totalGames: number;
  };
}

// Helper function to calculate restore amount based on user's bonus
function calculateRestoreAmount(bonusRestoreAttempts: number): number {
  return ATTEMPTS_CONFIG.BASE_RESET_ATTEMPTS + bonusRestoreAttempts;
}

// Optimized attempts service
export const serverAttemptsService = {
  /**
   * Get server time for operations
   */
  async getServerTime(): Promise<Date> {
    try {
      const { data, error } = await supabaseServer.rpc("get_current_timestamp");

      if (error) {
        console.warn("Failed to get server time, using current time:", error);

        return new Date();
      }

      return new Date(data);
    } catch (error) {
      console.warn(
        "Error getting server time, falling back to current time:",
        error,
      );

      return new Date();
    }
  },

  /**
   * Atomic check and update through RPC
   */
  async checkAndUpdateAttempts(
    telegramId: number,
  ): Promise<AttemptsStatusWithLevel> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "check_and_update_attempts",
        {
          p_telegram_id: telegramId,
        },
      );

      if (error) {
        console.error("Error in check_and_update_attempts RPC:", error);
        throw new Error("Failed to check attempts status");
      }

      if (!data || data.length === 0) {
        throw new Error("User not found");
      }

      const result = data[0];

      return {
        canPlay: result.can_play,
        attemptsRemaining: result.attempts_remaining,
        resetTime: result.reset_time ? new Date(result.reset_time) : undefined,
        timeUntilReset: result.time_until_reset_ms || undefined,
        userLevel: {
          currentLevel: result.current_level,
          totalGames: result.total_games,
        },
      };
    } catch (error) {
      console.error("Error checking and updating attempts:", error);
      throw error;
    }
  },

  /**
   * Atomic consumption through RPC
   */
  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    try {
      const { data, error } = await supabaseServer.rpc("consume_attempt", {
        p_telegram_id: telegramId,
      });

      if (error) {
        console.error("Error in consume_attempt RPC:", error);
        throw new Error("Failed to consume attempt");
      }

      if (!data || data.length === 0) {
        throw new Error("User not found");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error("No attempts remaining");
      }

      return {
        canPlay: result.can_play,
        attemptsRemaining: result.attempts_remaining,
        resetTime: result.reset_time ? new Date(result.reset_time) : undefined,
        timeUntilReset: result.time_until_reset_ms || undefined,
      };
    } catch (error) {
      console.error("Error consuming attempt:", error);
      throw error;
    }
  },

  /**
   * Fast check if user can play (cached)
   */
  async canUserPlay(telegramId: number): Promise<boolean> {
    try {
      const { data, error } = await supabaseServer.rpc("can_user_play_fast", {
        p_telegram_id: telegramId,
      });

      if (error) {
        console.error("Error checking if user can play:", error);

        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error checking if user can play:", error);

      return false;
    }
  },

  /**
   * UPDATED: Reset attempts with bonus restore amount
   * New formula: BASE_RESET_ATTEMPTS (10) + user.bonus_restore_attempts
   */
  async resetAttempts(telegramId: number): Promise<void> {
    try {
      const serverTime = new Date();

      // Get user data including bonus_restore_attempts
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("attempts_remaining, bonus_restore_attempts")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      // Calculate restore amount using bonus
      const restoreAmount = calculateRestoreAmount(user.bonus_restore_attempts);
      const newAttempts = Math.max(restoreAmount, user.attempts_remaining);

      console.log(`[ATTEMPTS] Resetting attempts for user ${telegramId}: base=${ATTEMPTS_CONFIG.BASE_RESET_ATTEMPTS}, bonus=${user.bonus_restore_attempts}, total=${restoreAmount}`);

      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: newAttempts,
          attempts_reset_at: null,
          updated_at: serverTime.toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("Error resetting attempts:", error);
        throw new Error("Failed to reset attempts");
      }
    } catch (error) {
      console.error("Error in resetAttempts:", error);
      throw error;
    }
  },

  /**
   * UPDATED: Instant reset with bonus restore amount
   * New formula: BASE_RESET_ATTEMPTS (10) + user.bonus_restore_attempts
   */
  async instantResetAttempts(telegramId: number): Promise<AttemptsStatus> {
    try {
      const serverTime = new Date();

      // Get user data including bonus_restore_attempts
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("bonus_restore_attempts")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      // Calculate restore amount using bonus
      const restoreAmount = calculateRestoreAmount(user.bonus_restore_attempts);

      console.log(`[ATTEMPTS] Instant resetting attempts for user ${telegramId}: base=${ATTEMPTS_CONFIG.BASE_RESET_ATTEMPTS}, bonus=${user.bonus_restore_attempts}, total=${restoreAmount}`);

      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: restoreAmount,
          attempts_reset_at: null,
          updated_at: serverTime.toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("Error performing instant reset:", error);
        throw new Error("Failed to perform instant reset");
      }

      return {
        canPlay: true,
        attemptsRemaining: restoreAmount,
        resetTime: undefined,
        timeUntilReset: undefined,
      };
    } catch (error) {
      console.error("Error in instantResetAttempts:", error);
      throw error;
    }
  },

  /**
   * Add bonus attempts (unchanged - this is for additional bonuses, not restore operations)
   */
  async addBonusAttempts(
    telegramId: number,
    bonusAmount: number,
    reason: string,
  ): Promise<AttemptsStatus> {
    try {
      // Get user and update atomically
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("attempts_remaining")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      const newAttempts = user.attempts_remaining + bonusAmount;

      console.log(`[ATTEMPTS] Adding bonus attempts for user ${telegramId}: ${bonusAmount} (reason: ${reason})`);

      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: newAttempts,
          attempts_reset_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("Error adding bonus attempts:", error);
        throw new Error("Failed to add bonus attempts");
      }

      return {
        canPlay: true,
        attemptsRemaining: newAttempts,
        resetTime: undefined,
        timeUntilReset: undefined,
      };
    } catch (error) {
      console.error("Error in addBonusAttempts:", error);
      throw error;
    }
  },

  /**
   * NEW: Update user's bonus restore attempts
   * This function allows changing the bonus_restore_attempts value for a user
   */
  async updateBonusRestoreAttempts(
    telegramId: number,
    newBonusAmount: number,
    reason: string,
  ): Promise<void> {
    try {
      // Validate bonus amount (prevent negative values)
      if (newBonusAmount < 0) {
        throw new Error("Bonus restore attempts cannot be negative");
      }

      console.log(`[ATTEMPTS] Updating bonus restore attempts for user ${telegramId}: ${newBonusAmount} (reason: ${reason})`);

      const { error } = await supabaseServer
        .from("users")
        .update({
          bonus_restore_attempts: newBonusAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("Error updating bonus restore attempts:", error);
        throw new Error("Failed to update bonus restore attempts");
      }
    } catch (error) {
      console.error("Error in updateBonusRestoreAttempts:", error);
      throw error;
    }
  },

  /**
   * NEW: Get user's current bonus restore attempts value
   */
  async getUserBonusRestoreAttempts(telegramId: number): Promise<number> {
    try {
      const { data: user, error } = await supabaseServer
        .from("users")
        .select("bonus_restore_attempts")
        .eq("telegram_id", telegramId)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      return user.bonus_restore_attempts || 0;
    } catch (error) {
      console.error("Error getting user bonus restore attempts:", error);
      throw error;
    }
  },

  /**
   * Batch operations for multiple users
   */
  async batchUpdateAttempts(
    updates: Array<{
      telegramId: number;
      attemptsToAdd: number;
      reason: string;
    }>,
  ): Promise<void> {
    if (updates.length === 0) return;

    try {
      // Execute batch updates through Promise.all for better performance
      await Promise.all(
        updates.map(async (update) => {
          const { data: user, error: selectError } = await supabaseServer
            .from("users")
            .select("attempts_remaining")
            .eq("telegram_id", update.telegramId)
            .single();

          if (selectError || !user) {
            console.warn(
              `User ${update.telegramId} not found for batch update`,
            );

            return;
          }

          const newAttempts = user.attempts_remaining + update.attemptsToAdd;

          const { error: updateError } = await supabaseServer
            .from("users")
            .update({
              attempts_remaining: newAttempts,
              attempts_reset_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("telegram_id", update.telegramId);

          if (updateError) {
            console.error(
              `Failed to update attempts for user ${update.telegramId}:`,
              updateError,
            );
          }
        }),
      );
    } catch (error) {
      console.error("Error in batchUpdateAttempts:", error);
      throw error;
    }
  },

  /**
   * Utility methods
   */
  getAttemptsConfig() {
    return ATTEMPTS_CONFIG;
  },

  /**
   * Calculate what the restore amount would be for a given bonus
   */
  calculateRestoreAmount(bonusRestoreAttempts: number): number {
    return calculateRestoreAmount(bonusRestoreAttempts);
  },
};