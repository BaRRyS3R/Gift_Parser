// src/hooks/useUser.tsx - Безопасная версия с кэшированием

"use client";

import React, { useState, useCallback, useContext, createContext, useEffect } from "react";

import { userService, type User, type TelegramUser, type AttemptsStatus } from "@/lib/supabase";
import { tournamentService } from "@/lib/supabase_tournament_extension";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import type { TournamentGameResult } from "@/types/tournaments";

// Union type for all possible game results including tournament
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | TournamentGameResult;

interface AttemptsCache {
  status: AttemptsStatus | null;
  lastUpdate: number;
  isValid: boolean;
  // Добавляем флаг для отслеживания источника данных
  source: 'server' | 'optimistic' | 'initial';
}

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResult) => Promise<void>;
  saveTournamentResult: (tournamentId: string, gameResult: SurvivalGameResult) => Promise<void>;
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  // Новые методы для работы с попытками
  getAttemptsStatus: () => Promise<AttemptsStatus>;
  consumeAttemptForGame: () => Promise<AttemptsStatus>;
  invalidateAttemptsCache: () => void;
  getCachedAttemptsStatus: () => AttemptsStatus | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

const CACHE_DURATION = 60000; // 60 секунд - увеличено для лучшего UX
const OPTIMISTIC_UPDATE_TIMEOUT = 5000; // 5 секунд для отката оптимистических обновлений

// Helper function for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error = new Error("Unknown error occurred");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} to save game result`);
      const result = await operation();

      if (attempt > 1) {
        console.log(`Successfully saved game result on attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxAttempts) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  }

  console.error(`All ${maxAttempts} attempts to save game result failed`);
  throw new Error(
    `Failed to save game result after ${maxAttempts} attempts. Last error: ${lastError.message}`,
  );
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Кэш для попыток с безопасными настройками
  const [attemptsCache, setAttemptsCache] = useState<AttemptsCache>({
    status: null,
    lastUpdate: 0,
    isValid: false,
    source: 'initial'
  });

  // Автоматическая инициализация telegramUser при первом рендере
  useEffect(() => {
    if (!telegramUser && typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;

      if (user && user.id) {
        const telegramUserData = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          is_premium: user.is_premium,
        };
        setTelegramUserState(telegramUserData);
      }
    }
  }, [telegramUser]);

  // Метод для установки Telegram пользователя в контекст
  const setTelegramUserData = useCallback((tgUserData: TelegramUser) => {
    setTelegramUserState(tgUserData);
    setIsLoading(false);
  }, []);

  // Метод для прямого обновления пользователя в контексте
  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    setError(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!telegramUser) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const dbUser = await userService.findByTelegramId(telegramUser.id);

      if (dbUser) {
        setUser(dbUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("useUser - Error updating user data:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  }, [telegramUser]);

  // Инвалидация кэша попыток
  const invalidateAttemptsCache = useCallback(() => {
    setAttemptsCache({
      status: null,
      lastUpdate: 0,
      isValid: false,
      source: 'initial'
    });
  }, []);

  // Получение кэшированного статуса попыток (только для UI)
  const getCachedAttemptsStatus = useCallback((): AttemptsStatus | null => {
    const now = Date.now();

    if (attemptsCache.isValid &&
      attemptsCache.status &&
      (now - attemptsCache.lastUpdate) < CACHE_DURATION) {
      return attemptsCache.status;
    }

    return null;
  }, [attemptsCache]);

  // Получение актуального статуса попыток с кэшированием
  const getAttemptsStatus = useCallback(async (): Promise<AttemptsStatus> => {
    if (!telegramUser) {
      throw new Error("Пользователь Telegram не найден");
    }

    const now = Date.now();

    // Проверяем валидность кэша
    if (attemptsCache.isValid &&
      attemptsCache.status &&
      attemptsCache.source === 'server' &&
      (now - attemptsCache.lastUpdate) < CACHE_DURATION) {
      console.log("Returning cached attempts status");
      return attemptsCache.status;
    }

    try {
      console.log("Fetching fresh attempts status from server");
      const status = await userService.checkAndUpdateAttemptsWithServerValidation(
        telegramUser.id
      );

      // Обновляем кэш только серверными данными
      setAttemptsCache({
        status,
        lastUpdate: now,
        isValid: true,
        source: 'server'
      });

      return status;
    } catch (error) {
      console.error("Error fetching attempts status:", error);

      // В случае ошибки инвалидируем кэш
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, attemptsCache, invalidateAttemptsCache]);

  // Безопасное потребление попытки для игры
  const consumeAttemptForGame = useCallback(async (): Promise<AttemptsStatus> => {
    if (!telegramUser) {
      throw new Error("Пользователь Telegram не найден");
    }

    // КРИТИЧЕСКИ ВАЖНО: всегда делаем серверный запрос для потребления попытки
    console.log("Consuming attempt on server (security-critical operation)");

    try {
      const newStatus = await userService.consumeAttemptWithServerValidation(
        telegramUser.id
      );

      const now = Date.now();

      // Обновляем кэш только после успешного серверного запроса
      setAttemptsCache({
        status: newStatus,
        lastUpdate: now,
        isValid: true,
        source: 'server'
      });

      console.log("Attempt consumed successfully, cache updated with server data");
      return newStatus;

    } catch (error) {
      console.error("Error consuming attempt:", error);

      // При ошибке инвалидируем кэш и требуем повторную проверку
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, invalidateAttemptsCache]);

  // Автоматическая загрузка пользователя из БД при установке telegramUser
  useEffect(() => {
    if (telegramUser && !user && !isLoading) {
      refreshUser().catch(err => {
        console.error("useUser - Failed to auto-load user:", err);
      });
    }
  }, [telegramUser, user, isLoading, refreshUser]);

  // Инвалидация кэша при смене пользователя
  useEffect(() => {
    if (telegramUser) {
      invalidateAttemptsCache();
    }
  }, [telegramUser, invalidateAttemptsCache]);

  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<void> => {
      if (!telegramUser) {
        throw new Error("Пользователь Telegram не найден");
      }

      // Check if this is a tournament result
      if ('tournamentId' in gameResult) {
        return saveTournamentResult(gameResult.tournamentId, gameResult);
      }

      console.log("Saving game result:", {
        mode: gameResult.mode,
        score: gameResult.score,
        duration: gameResult.duration,
      });

      const saveOperation = async (): Promise<void> => {
        await userService.saveGameResult(telegramUser.id, gameResult);
        await refreshUser();
        // После сохранения результата инвалидируем кэш попыток
        invalidateAttemptsCache();
      };

      try {
        await retryOperation(saveOperation, 3, 1000);
        console.log("Game result saved successfully (with potential retries)");
      } catch (err) {
        console.error(
          "Failed to save game result after all retry attempts:",
          err,
        );

        const errorMessage =
          err instanceof Error
            ? `Не удалось сохранить результат игры после 3 попыток: ${err.message}`
            : "Не удалось сохранить результат игры после 3 попыток. Попробуйте позже.";

        throw new Error(errorMessage);
      }
    },
    [telegramUser, refreshUser, invalidateAttemptsCache],
  );

  const saveTournamentResult = useCallback(
    async (tournamentId: string, gameResult: SurvivalGameResult): Promise<void> => {
      if (!telegramUser || !user) {
        throw new Error("Пользователь не найден");
      }

      console.log("Saving tournament result with accumulation:", {
        tournamentId,
        mode: gameResult.mode,
        score: gameResult.score,
        survivalTime: gameResult.survivalTime,
      });

      const saveOperation = async (): Promise<void> => {
        await tournamentService.saveTournamentResult(
          tournamentId,
          user.id,
          telegramUser.id,
          {
            survivalTime: gameResult.survivalTime,
            score: gameResult.score,
            maxLevelReached: gameResult.maxLevelReached,
            perfectStreak: gameResult.perfectStreak,
            correctHits: gameResult.correctHits,
            deathCause: gameResult.deathCause,
          }
        );

        console.log(`Points accumulated: +${gameResult.score} added to tournament total`);
      };

      try {
        await retryOperation(saveOperation, 3, 1000);
        console.log("Tournament result with point accumulation saved successfully");
      } catch (err) {
        console.error("Failed to save accumulative tournament result:", err);

        const errorMessage = err instanceof Error
          ? `Не удалось сохранить результат турнира после 3 попыток: ${err.message}`
          : "Не удалось сохранить результат турнира после 3 попыток. Попробуйте позже.";

        throw new Error(errorMessage);
      }
    },
    [telegramUser, user],
  );

  const contextValue: UserContextType = {
    user,
    telegramUser,
    isLoading,
    error,
    refreshUser,
    saveGameResult,
    saveTournamentResult,
    updateUser,
    setTelegramUser: setTelegramUserData,
    getAttemptsStatus,
    consumeAttemptForGame,
    invalidateAttemptsCache,
    getCachedAttemptsStatus,
  };

  return React.createElement(
    UserContext.Provider,
    { value: contextValue },
    children,
  );
};

export function useUser(): UserContextType {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser должен использоваться внутри UserProvider");
  }

  return context;
}