// src/hooks/useUser.tsx - Updated with league system and progress notification support

"use client";

import React, { useState, useCallback, useContext, createContext, useEffect } from "react";

import { userService, leagueService, type User, type TelegramUser, type AttemptsStatus } from "@/lib/supabase";
import { tournamentService, type TournamentSaveResponse } from "@/lib/supabase_tournament_extension";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";
import type { TournamentGameResult } from "@/types/tournaments";

// Updated to include rotation mode and league notifications
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult | TournamentGameResult;

interface AttemptsCache {
  status: AttemptsStatus | null;
  lastUpdate: number;
  isValid: boolean;
  source: 'server' | 'optimistic' | 'initial';
}

// NEW: Interface for progress notifications from game results
export interface ProgressNotificationData {
  type: "level_up" | "league_promotion" | "reward_available";
  level?: number;
  league?: string;
  previousLeague?: string;
  rewardName?: string;
}

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResult) => Promise<ProgressNotificationData[]>; // NEW: Returns notification data
  saveTournamentResult: (tournamentId: string, gameResult: SurvivalGameResult) => Promise<TournamentSaveResponse>;
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  // Методы для работы с попытками
  getAttemptsStatus: () => Promise<AttemptsStatus>;
  consumeAttemptForGame: () => Promise<AttemptsStatus>;
  invalidateAttemptsCache: () => void;
  getCachedAttemptsStatus: () => AttemptsStatus | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

const CACHE_DURATION = 60000; // 60 секунд для оптимального пользовательского опыта
const OPTIMISTIC_UPDATE_TIMEOUT = 5000; // 5 секунд для отката оптимистических обновлений

// Вспомогательная функция для повторных попыток операций
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

  // Автоматическая инициализация Telegram пользователя при первом рендере
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

  // Получение кэшированного статуса попыток для интерфейса
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

    // Проверка валидности кэша
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

      // Обновление кэша только серверными данными
      setAttemptsCache({
        status,
        lastUpdate: now,
        isValid: true,
        source: 'server'
      });

      return status;
    } catch (error) {
      console.error("Error fetching attempts status:", error);

      // При ошибке инвалидация кэша
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, attemptsCache, invalidateAttemptsCache]);

  // Безопасное потребление попытки для игры
  const consumeAttemptForGame = useCallback(async (): Promise<AttemptsStatus> => {
    if (!telegramUser) {
      throw new Error("Пользователь Telegram не найден");
    }

    console.log("Consuming attempt on server (security-critical operation)");

    try {
      const newStatus = await userService.consumeAttemptWithServerValidation(
        telegramUser.id
      );

      const now = Date.now();

      // Обновление кэша после успешного серверного запроса
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

      // При ошибке инвалидация кэша и требование повторной проверки
      invalidateAttemptsCache();
      throw error;
    }
  }, [telegramUser, invalidateAttemptsCache]);

  // Автоматическая загрузка пользователя из базы данных при установке telegramUser
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

  // UPDATED: Enhanced saveGameResult with progress notification support
  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<ProgressNotificationData[]> => {
      if (!telegramUser || !user) {
        throw new Error("Пользователь Telegram не найден");
      }

      // Проверка турнирного результата
      if ('tournamentId' in gameResult) {
        const tournamentResult = await saveTournamentResult(gameResult.tournamentId, gameResult);
        console.log("Tournament result saved with accumulation:", tournamentResult);
        return []; // No league notifications for tournament games
      }

      console.log("Saving regular game result:", {
        mode: gameResult.mode,
        score: gameResult.score,
        duration: gameResult.duration,
      });

      const saveOperation = async (): Promise<ProgressNotificationData[]> => {
        // Save standard game statistics
        await userService.updateGameStats(telegramUser.id, gameResult);

        // Update league statistics and get notification data
        const leagueUpdateResult = await leagueService.updateLeagueStats(user, gameResult);

        if (!leagueUpdateResult.success) {
          console.error("League update failed:", leagueUpdateResult.error);
          // Continue with user refresh even if league update fails
          await refreshUser();
          invalidateAttemptsCache();
          return [];
        }

        // Generate notification data
        const notifications: ProgressNotificationData[] = [];

        if (leagueUpdateResult.levelChanged && leagueUpdateResult.newLevel) {
          notifications.push({
            type: "level_up",
            level: leagueUpdateResult.newLevel,
          });

          // Check for reward eligibility
          if (leagueUpdateResult.newLevel % 20 === 0) {
            const rewardNumber = leagueUpdateResult.newLevel / 20;
            notifications.push({
              type: "reward_available",
              level: leagueUpdateResult.newLevel,
              rewardName: `Test Gift ${rewardNumber}`,
            });
          }
        }

        if (leagueUpdateResult.leagueChanged && leagueUpdateResult.newLeague && leagueUpdateResult.previousLeague) {
          notifications.push({
            type: "league_promotion",
            league: leagueUpdateResult.newLeague,
            previousLeague: leagueUpdateResult.previousLeague,
          });
        }

        // Refresh user data
        await refreshUser();
        invalidateAttemptsCache();

        return notifications;
      };

      try {
        const notifications = await retryOperation(saveOperation, 3, 1000);
        console.log("Game result saved successfully with notifications:", notifications);
        return notifications;
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
    [telegramUser, user, refreshUser, invalidateAttemptsCache],
  );

  const saveTournamentResult = useCallback(
    async (tournamentId: string, gameResult: SurvivalGameResult): Promise<TournamentSaveResponse> => {
      if (!telegramUser || !user) {
        throw new Error("Пользователь не найден");
      }

      console.log("Saving tournament result with accumulation:", {
        tournamentId,
        mode: gameResult.mode,
        score: gameResult.score,
        survivalTime: gameResult.survivalTime,
      });

      const saveOperation = async (): Promise<TournamentSaveResponse> => {
        return await tournamentService.saveTournamentResult(
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
      };

      try {
        const result = await retryOperation(saveOperation, 3, 1000);
        console.log("Tournament result with point accumulation saved successfully:", result);
        return result;
      } catch (err) {
        console.error(
          "Failed to save tournament result after all retry attempts:",
          err,
        );

        const errorMessage =
          err instanceof Error
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