// src/hooks/useUser.tsx - Updated for new game modes

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
} from "react";

import { userService, type User, type TelegramUser } from "@/lib/supabase";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";

// Union type for all possible game results
type GameResult = ReactionGameResult | SurvivalGameResult;

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResult) => Promise<void>;
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

// Helper function for retry logic
const retryOperation = async <T,>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error = new Error('Unknown error occurred');

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
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay for subsequent attempts (exponential backoff)
        delay *= 1.5;
      }
    }
  }

  // If we get here, all attempts failed
  console.error(`All ${maxAttempts} attempts to save game result failed`);
  throw new Error(
    `Failed to save game result after ${maxAttempts} attempts. Last error: ${lastError.message}`
  );
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Метод для установки Telegram пользователя в контекст
  const setTelegramUserData = useCallback((tgUserData: TelegramUser) => {
    console.log('useUser - Setting telegram user data:', tgUserData);
    setTelegramUserState(tgUserData);
    setIsLoading(false);
  }, []);

  // Метод для прямого обновления пользователя в контексте
  const updateUser = useCallback((userData: User) => {
    console.log('useUser - Updating user data directly:', userData);
    setUser(userData);
    setError(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!telegramUser) {
      console.log('useUser - No telegram user available for refresh');
      return;
    }

    try {
      console.log('useUser - Refreshing user data for:', telegramUser.id);
      setIsLoading(true);
      setError(null);

      // Однократная попытка поиска пользователя в БД
      const dbUser = await userService.findByTelegramId(telegramUser.id);
      console.log('useUser - DB User:', dbUser);

      if (dbUser) {
        console.log('useUser - User found, updating context');
        setUser(dbUser);
      } else {
        console.log('useUser - User not found in database');
        setUser(null);
      }
    } catch (err) {
      console.error("useUser - Error updating user data:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
      console.log('useUser - refreshUser completed');
    }
  }, [telegramUser]);

  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<void> => {
      if (!telegramUser) {
        throw new Error("Пользователь Telegram не найден");
      }

      // Log the game result for debugging
      console.log('Saving game result:', {
        mode: gameResult.mode,
        score: gameResult.score,
        duration: gameResult.duration
      });

      // Create the operation function that will be retried
      const saveOperation = async (): Promise<void> => {
        await userService.saveGameResult(telegramUser.id, gameResult);
        await refreshUser();
      };

      try {
        // Use retry logic with up to 3 attempts
        await retryOperation(saveOperation, 3, 1000);
        console.log('Game result saved successfully (with potential retries)');
      } catch (err) {
        console.error("Failed to save game result after all retry attempts:", err);

        // Create a more descriptive error message for the user
        const errorMessage = err instanceof Error
          ? `Не удалось сохранить результат игры после 3 попыток: ${err.message}`
          : "Не удалось сохранить результат игры после 3 попыток. Попробуйте позже.";

        throw new Error(errorMessage);
      }
    },
    [telegramUser, refreshUser],
  );

  const contextValue: UserContextType = {
    user,
    telegramUser,
    isLoading,
    error,
    refreshUser,
    saveGameResult,
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