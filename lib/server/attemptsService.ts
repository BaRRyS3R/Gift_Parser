// src/lib/server/attemptsService.ts - Оптимизированный серверный сервис попыток

import { supabaseServer } from "@/lib/supabase_server";

// Configuration constants
const ATTEMPTS_CONFIG = {
  BASE_ATTEMPTS: 10,
  RESET_ATTEMPTS: 10,
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 часа
  REFERRAL_BONUS: 5,
  INSTANT_RESET_COST: 100,
} as const;

// Attempts status interface
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

// Оптимизированный серверный сервис попыток
export const serverAttemptsService = {
  /**
   * Получение текущего серверного времени для консистентной валидации
   */
  async getServerTime(): Promise<Date> {
    try {
      const { data, error } = await supabaseServer.rpc("get_current_timestamp");

      if (error) {
        console.warn("Не удалось получить серверное время, используем текущее:", error);
        return new Date();
      }

      return new Date(data);
    } catch (error) {
      console.warn(
        "Ошибка получения серверного времени, используем локальное:",
        error,
      );
      return new Date();
    }
  },

  /**
   * Быстрая проверка статуса попыток с использованием функции БД
   */
  async checkAndUpdateAttemptsFast(telegramId: number): Promise<AttemptsStatus> {
    try {
      // Используем оптимизированную функцию PostgreSQL
      const { data, error } = await supabaseServer.rpc('check_and_update_attempts', {
        user_telegram_id: telegramId
      });

      if (error) {
        console.error("Ошибка выполнения функции БД:", error);
        throw new Error("Не удалось проверить статус попыток");
      }

      if (!data || data.length === 0) {
        throw new Error("Пользователь не найден");
      }

      const result = data[0];

      return {
        canPlay: result.can_play,
        attemptsRemaining: result.attempts_remaining,
        resetTime: result.reset_time ? new Date(result.reset_time) : undefined,
        timeUntilReset: result.time_until_reset || undefined,
      };
    } catch (error) {
      console.error("Ошибка быстрой проверки попыток:", error);
      
      // Фоллбэк на стандартную проверку при ошибке функции БД
      return this.checkAndUpdateAttempts(telegramId);
    }
  },

  /**
   * Стандартная проверка и обновление попыток (фоллбэк)
   */
  async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
    // Получаем данные пользователя
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("Пользователь не найден");
    }

    const serverTime = await this.getServerTime();
    const resetTime = user.attempts_reset_at
      ? new Date(user.attempts_reset_at)
      : null;

    // Проверяем, нужен ли сброс попыток
    if (resetTime && serverTime >= resetTime) {
      console.log(
        `Время сброса достигнуто для пользователя ${telegramId}, сбрасываем попытки`,
      );
      await this.resetAttempts(telegramId);

      return {
        canPlay: true,
        attemptsRemaining: Math.max(
          ATTEMPTS_CONFIG.RESET_ATTEMPTS,
          user.attempts_remaining,
        ),
        resetTime: undefined,
        timeUntilReset: undefined,
      };
    }

    // Рассчитываем время до сброса если у пользователя нет попыток
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

  /**
   * Оптимизированное потребление попытки
   */
  async consumeAttemptFast(telegramId: number): Promise<AttemptsStatus> {
    try {
      // Используем специализированную функцию для потребления попытки
      const { data, error } = await supabaseServer.rpc('consume_user_attempt', {
        user_telegram_id: telegramId
      });

      if (error) {
        console.error("Ошибка потребления попытки через функцию БД:", error);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        throw new Error("Пользователь не найден");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.error_message || "Нет доступных попыток");
      }

      return {
        canPlay: result.can_play,
        attemptsRemaining: result.attempts_remaining,
        resetTime: result.reset_time ? new Date(result.reset_time) : undefined,
        timeUntilReset: result.time_until_reset || undefined,
      };
    } catch (error) {
      console.error("Ошибка быстрого потребления попытки:", error);
      
      // Фоллбэк на стандартное потребление
      return this.consumeAttempt(telegramId);
    }
  },

  /**
   * Стандартное потребление попытки (фоллбэк)
   */
  async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
    // Сначала проверяем текущий статус
    const currentStatus = await this.checkAndUpdateAttempts(telegramId);

    if (!currentStatus.canPlay) {
      throw new Error("Нет оставшихся попыток");
    }

    const serverTime = await this.getServerTime();
    const newAttemptsRemaining = Math.max(
      0,
      currentStatus.attemptsRemaining - 1,
    );

    const updates: any = {
      attempts_remaining: newAttemptsRemaining,
      last_attempt_at: serverTime.toISOString(),
      updated_at: serverTime.toISOString(),
    };

    // Если это была последняя попытка, устанавливаем время сброса
    if (newAttemptsRemaining === 0) {
      const resetTime = new Date(
        serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS,
      );

      updates.attempts_reset_at = resetTime.toISOString();
    }

    // Обновляем базу данных
    const { error } = await supabaseServer
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Ошибка потребления попытки:", error);
      throw new Error("Не удалось потребить попытку");
    }

    console.log(
      `Попытка потреблена для пользователя ${telegramId}. Осталось: ${newAttemptsRemaining}`,
    );

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

  /**
   * Сброс попыток пользователя до значения по умолчанию
   */
  async resetAttempts(telegramId: number): Promise<void> {
    const serverTime = await this.getServerTime();

    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("attempts_remaining")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("Пользователь не найден");
    }

    const newAttempts = Math.max(
      ATTEMPTS_CONFIG.RESET_ATTEMPTS,
      user.attempts_remaining,
    );

    const { error } = await supabaseServer
      .from("users")
      .update({
        attempts_remaining: newAttempts,
        attempts_reset_at: null,
        updated_at: serverTime.toISOString(),
      })
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Ошибка сброса попыток:", error);
      throw new Error("Не удалось сбросить попытки");
    }

    console.log(`Попытки сброшены для пользователя ${telegramId} до ${newAttempts}`);
  },

  /**
   * Мгновенный сброс попыток (например, через покупку)
   */
  async instantResetAttempts(telegramId: number): Promise<AttemptsStatus> {
    const serverTime = await this.getServerTime();

    const { error } = await supabaseServer
      .from("users")
      .update({
        attempts_remaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
        attempts_reset_at: null,
        updated_at: serverTime.toISOString(),
      })
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Ошибка мгновенного сброса:", error);
      throw new Error("Не удалось выполнить мгновенный сброс");
    }

    console.log(`Мгновенный сброс выполнен для пользователя ${telegramId}`);

    return {
      canPlay: true,
      attemptsRemaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
      resetTime: undefined,
      timeUntilReset: undefined,
    };
  },

  /**
   * Добавление бонусных попыток (например, от рефералов или покупок)
   */
  async addBonusAttempts(
    telegramId: number,
    bonusAmount: number,
    reason: string,
  ): Promise<AttemptsStatus> {
    const serverTime = await this.getServerTime();

    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("attempts_remaining")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("Пользователь не найден");
    }

    const newAttempts = user.attempts_remaining + bonusAmount;

    const { error } = await supabaseServer
      .from("users")
      .update({
        attempts_remaining: newAttempts,
        updated_at: serverTime.toISOString(),
      })
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("Ошибка добавления бонусных попыток:", error);
      throw new Error("Не удалось добавить бонусные попытки");
    }

    console.log(
      `Добавлено ${bonusAmount} бонусных попыток для пользователя ${telegramId}. Причина: ${reason}`,
    );

    return {
      canPlay: true,
      attemptsRemaining: newAttempts,
      resetTime: undefined,
      timeUntilReset: undefined,
    };
  },

  /**
   * Получение конфигурации попыток
   */
  getAttemptsConfig() {
    return ATTEMPTS_CONFIG;
  },

  /**
   * Валидация возможности игры пользователя
   */
  async canUserPlay(telegramId: number): Promise<boolean> {
    try {
      const status = await this.checkAndUpdateAttemptsFast(telegramId);
      return status.canPlay;
    } catch (error) {
      console.error("Ошибка проверки возможности игры:", error);
      return false;
    }
  },
};