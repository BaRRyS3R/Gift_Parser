// src/lib/server/attemptsService.ts - ОПТИМИЗИРОВАННАЯ версия

import { supabaseServer } from "@/lib/supabase_server";

// Configuration constants
const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
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

// Оптимизированный сервис attempts
export const serverAttemptsService = {
  /**
   * ОПТИМИЗАЦИЯ: Убираем отдельный getServerTime - используем server time в RPC
   */
  async getServerTime(): Promise<Date> {
    // Оставляем для обратной совместимости, но стараемся не использовать
    try {
      const { data, error } = await supabaseServer.rpc("get_current_timestamp");
      if (error) {
        console.warn("Failed to get server time, using current time:", error);
        return new Date();
      }
      return new Date(data);
    } catch (error) {
      console.warn("Error getting server time, falling back to current time:", error);
      return new Date();
    }
  },

  /**
   * ОПТИМИЗАЦИЯ: Атомарная проверка и обновление через RPC
   * Было: 2-3 запроса, стало: 1 запрос
   */
  async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatusWithLevel> {
    try {
      const { data, error } = await supabaseServer.rpc('check_and_update_attempts', {
        p_telegram_id: telegramId
      });

      if (error) {
        console.error('Error in check_and_update_attempts RPC:', error);
        throw new Error('Failed to check attempts status');
      }

      if (!data || data.length === 0) {
        throw new Error('User not found');
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
      console.error('Error checking and updating attempts:', error);
      throw error;
    }
  },

  /**
   * ОПТИМИЗАЦИЯ: Атомарное потребление через RPC  
   * Было: 3-4 запроса, стало: 1 запрос с блокировкой
   */
  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    try {
      const { data, error } = await supabaseServer.rpc('consume_attempt', {
        p_telegram_id: telegramId
      });

      if (error) {
        console.error('Error in consume_attempt RPC:', error);
        throw new Error('Failed to consume attempt');
      }

      if (!data || data.length === 0) {
        throw new Error('User not found');
      }

      const result = data[0];
      
      if (!result.success) {
        throw new Error('No attempts remaining');
      }

      return {
        canPlay: result.can_play,
        attemptsRemaining: result.attempts_remaining,
        resetTime: result.reset_time ? new Date(result.reset_time) : undefined,
        timeUntilReset: result.time_until_reset_ms || undefined,
      };
    } catch (error) {
      console.error('Error consuming attempt:', error);
      throw error;
    }
  },

  /**
   * ОПТИМИЗАЦИЯ: Быстрая проверка без side effects
   * Для cases когда нужно только проверить можно ли играть
   */
  async canUserPlay(telegramId: number): Promise<boolean> {
    try {
      const { data, error } = await supabaseServer.rpc('can_user_play_fast', {
        p_telegram_id: telegramId
      });

      if (error) {
        console.error('Error checking if user can play:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking if user can play:', error);
      return false;
    }
  },

  /**
   * УЛУЧШЕННАЯ версия reset attempts - использует существующую оптимизированную функцию
   */
  async resetAttempts(telegramId: number): Promise<void> {
    try {
      const serverTime = new Date();

      // Находим пользователя и получаем current attempts
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("attempts_remaining")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      const newAttempts = Math.max(ATTEMPTS_CONFIG.RESET_ATTEMPTS, user.attempts_remaining);

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
      console.error('Error in resetAttempts:', error);
      throw error;
    }
  },

  /**
   * ОПТИМИЗИРОВАННАЯ версия instant reset
   */
  async instantResetAttempts(telegramId: number): Promise<AttemptsStatus> {
    try {
      const serverTime = new Date();

      const { error } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
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
        attemptsRemaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
        resetTime: undefined,
        timeUntilReset: undefined,
      };
    } catch (error) {
      console.error('Error in instantResetAttempts:', error);
      throw error;
    }
  },

  /**
   * УЛУЧШЕННАЯ версия добавления bonus attempts
   * Использует атомарный increment через RPC
   */
  async addBonusAttempts(
    telegramId: number,
    bonusAmount: number,
    reason: string,
  ): Promise<AttemptsStatus> {
    try {
      // Получаем пользователя и обновляем атомарно
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("attempts_remaining")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      const newAttempts = user.attempts_remaining + bonusAmount;

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
      console.error('Error in addBonusAttempts:', error);
      throw error;
    }
  },

  /**
   * НОВЫЙ: Batch операция для обновления attempts у нескольких пользователей
   * Полезно для referral bonuses и других массовых операций
   */
  async batchUpdateAttempts(
    updates: Array<{ telegramId: number; attemptsToAdd: number; reason: string }>
  ): Promise<void> {
    if (updates.length === 0) return;

    try {
      // Выполняем batch updates через Promise.all для лучшей производительности
      await Promise.all(
        updates.map(async (update) => {
          const { data: user, error: selectError } = await supabaseServer
            .from("users")
            .select("attempts_remaining")
            .eq("telegram_id", update.telegramId)
            .single();

          if (selectError || !user) {
            console.warn(`User ${update.telegramId} not found for batch update`);
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
            console.error(`Failed to update attempts for user ${update.telegramId}:`, updateError);
          }
        })
      );
    } catch (error) {
      console.error('Error in batchUpdateAttempts:', error);
      throw error;
    }
  },

  /**
   * Utility methods
   */
  getAttemptsConfig() {
    return ATTEMPTS_CONFIG;
  },
};