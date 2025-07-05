// src/hooks/useUser.tsx - Complete version with tournament integration

"use client";

import React, { useState, useCallback, useContext, createContext, useEffect } from "react";

import { userService, type User, type TelegramUser } from "@/lib/supabase";
import { tournamentService } from "@/lib/supabase_tournament_extension";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import type { TournamentGameResult } from "@/types/tournaments";

// Union type for all possible game results including tournament
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | TournamentGameResult;

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

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

      // If this is not the last attempt, wait before retrying
      if (attempt < maxAttempts) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Increase delay for subsequent attempts (exponential backoff)
        delay *= 1.5;
      }
    }
  }

  // If we get here, all attempts failed
  console.error(`All ${maxAttempts} attempts to save game result failed`);
  throw new Error(
    `Failed to save game result after ${maxAttempts} attempts. Last error: ${lastError.message}`,
  );
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Автоматическая инициализация telegramUser при первом рендере
  useEffect(() => {
    console.log('=== useUser: Auto-init telegramUser effect ===');
    console.log('Current telegramUser:', telegramUser);
    console.log('Window Telegram WebApp available:', typeof window !== "undefined" && !!window.Telegram?.WebApp);
    
    if (!telegramUser && typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;
      
      console.log('Telegram WebApp user data:', user);

      if (user && user.id) {
        const telegramUserData = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          is_premium: user.is_premium,
        };
        console.log('Setting telegramUser data:', telegramUserData);
        setTelegramUserState(telegramUserData);
        console.log("useUser - Auto-initialized telegram user:", telegramUserData);
      } else {
        console.log('No valid user data in Telegram WebApp');
      }
    } else {
      console.log('Auto-init conditions not met:', {
        hasTelegramUser: !!telegramUser,
        windowAvailable: typeof window !== "undefined",
        telegramWebAppAvailable: typeof window !== "undefined" && !!window.Telegram?.WebApp
      });
    }
    console.log('=== useUser: Auto-init telegramUser effect END ===');
  }, [telegramUser]);

  // Метод для установки Telegram пользователя в контекст
  const setTelegramUserData = useCallback((tgUserData: TelegramUser) => {
    console.log("useUser - Setting telegram user data:", tgUserData);
    setTelegramUserState(tgUserData);
    setIsLoading(false);
  }, []);

  // Метод для прямого обновления пользователя в контексте
  const updateUser = useCallback((userData: User) => {
    console.log("useUser - Updating user data directly:", userData);
    setUser(userData);
    setError(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    console.log('=== useUser: refreshUser START ===');
    console.log('Current telegramUser:', telegramUser);
    
    if (!telegramUser) {
      console.log("useUser - No telegram user available for refresh");
      console.log('=== useUser: refreshUser END (no telegramUser) ===');
      return;
    }

    try {
      console.log("useUser - Refreshing user data for:", telegramUser.id);
      setIsLoading(true);
      setError(null);

      // Однократная попытка поиска пользователя в БД
      console.log('Calling userService.findByTelegramId...');
      const dbUser = await userService.findByTelegramId(telegramUser.id);

      console.log("useUser - DB User:", dbUser ? {
        id: dbUser.id,
        telegram_id: dbUser.telegram_id,
        first_name: dbUser.first_name,
        attempts_remaining: dbUser.attempts_remaining
      } : null);

      if (dbUser) {
        console.log("useUser - User found, updating context");
        setUser(dbUser);
      } else {
        console.log("useUser - User not found in database");
        setUser(null);
      }
    } catch (err) {
      console.error("useUser - Error updating user data:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
      console.log("useUser - refreshUser completed");
      console.log('=== useUser: refreshUser END ===');
    }
  }, [telegramUser]);

  // Автоматическая загрузка пользователя из БД при установке telegramUser
  useEffect(() => {
    console.log('=== useUser: Auto-load effect ===');
    console.log('telegramUser:', telegramUser);
    console.log('user:', user);
    console.log('isLoading:', isLoading);
    
    if (telegramUser && !user && !isLoading) {
      console.log("useUser - Auto-loading user from DB for telegram user:", telegramUser.id);
      refreshUser().catch(err => {
        console.error("useUser - Failed to auto-load user:", err);
      });
    } else {
      console.log('Auto-load conditions not met:', {
        hasTelegramUser: !!telegramUser,
        hasUser: !!user,
        isLoading
      });
    }
    console.log('=== useUser: Auto-load effect END ===');
  }, [telegramUser, user, isLoading, refreshUser]);

  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<void> => {
      if (!telegramUser) {
        throw new Error("Пользователь Telegram не найден");
      }

      // Check if this is a tournament result
      if ('tournamentId' in gameResult) {
        // This is a tournament result, delegate to saveTournamentResult
        return saveTournamentResult(gameResult.tournamentId, gameResult);
      }

      // Log the game result for debugging
      console.log("Saving game result:", {
        mode: gameResult.mode,
        score: gameResult.score,
        duration: gameResult.duration,
      });

      // Create the operation function that will be retried
      const saveOperation = async (): Promise<void> => {
        await userService.saveGameResult(telegramUser.id, gameResult);
        await refreshUser();
      };

      try {
        // Use retry logic with up to 3 attempts
        await retryOperation(saveOperation, 3, 1000);
        console.log("Game result saved successfully (with potential retries)");
      } catch (err) {
        console.error(
          "Failed to save game result after all retry attempts:",
          err,
        );

        // Create a more descriptive error message for the user
        const errorMessage =
          err instanceof Error
            ? `Не удалось сохранить результат игры после 3 попыток: ${err.message}`
            : "Не удалось сохранить результат игры после 3 попыток. Попробуйте позже.";

        throw new Error(errorMessage);
      }
    },
    [telegramUser, refreshUser],
  );

  const saveTournamentResult = useCallback(
    async (tournamentId: string, gameResult: SurvivalGameResult): Promise<void> => {
      if (!telegramUser || !user) {
        throw new Error("Пользователь не найден");
      }

      // Log the tournament result for debugging
      console.log("Saving tournament result:", {
        tournamentId,
        mode: gameResult.mode,
        score: gameResult.score,
        survivalTime: gameResult.survivalTime,
      });

      // Create the operation function that will be retried
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
        // Don't refresh user for tournament results as they don't affect user stats
      };

      try {
        // Use retry logic with up to 3 attempts
        await retryOperation(saveOperation, 3, 1000);
        console.log("Tournament result saved successfully (with potential retries)");
      } catch (err) {
        console.error(
          "Failed to save tournament result after all retry attempts:",
          err,
        );

        // Create a more descriptive error message for the user
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