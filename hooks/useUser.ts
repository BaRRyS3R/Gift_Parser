// src/hooks/useUser.tsx

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
} from "react";

import { userService, type User, type TelegramUser } from "@/lib/supabase";

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: any) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getTelegramUser = useCallback((): TelegramUser | null => {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      return null;
    }

    const tg = window.Telegram.WebApp;
    const telegramUserData = tg.initDataUnsafe?.user;

    if (!telegramUserData || !telegramUserData.id) {
      return null;
    }

    return {
      id: telegramUserData.id,
      first_name: telegramUserData.first_name,
      last_name: telegramUserData.last_name,
      username: telegramUserData.username,
      language_code: telegramUserData.language_code,
      is_premium: telegramUserData.is_premium,
    };
  }, []);

  const findUserWithRetry = async (telegramId: number, maxRetries = 3): Promise<User | null> => {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < maxRetries) {
      try {
        const dbUser = await userService.findByTelegramId(telegramId);
        if (dbUser) {
          return dbUser;
        }
        
        // Если пользователь не найден, ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1)));
        retries++;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        console.error(`Attempt ${retries + 1} failed:`, err);
        retries++;
      }
    }

    if (lastError) {
      throw lastError;
    }
    return null;
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const tgUser = getTelegramUser();

      if (!tgUser) {
        throw new Error("Данные пользователя Telegram недоступны");
      }

      setTelegramUser(tgUser);

      // Пытаемся найти пользователя с повторными попытками
      const dbUser = await findUserWithRetry(tgUser.id);
      
      if (!dbUser) {
        throw new Error("Не удалось найти данные пользователя после нескольких попыток");
      }

      setUser(dbUser);
    } catch (err) {
      console.error("Ошибка при обновлении данных пользователя:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  }, [getTelegramUser]);

  const saveGameResult = useCallback(
    async (gameResult: any): Promise<void> => {
      if (!telegramUser) {
        throw new Error("Пользователь Telegram не найден");
      }

      try {
        await userService.saveGameResult(telegramUser.id, gameResult);
        await refreshUser();
      } catch (err) {
        console.error("Ошибка при сохранении результата игры:", err);
        throw err;
      }
    },
    [telegramUser, refreshUser],
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const contextValue: UserContextType = {
    user,
    telegramUser,
    isLoading,
    error,
    refreshUser,
    saveGameResult,
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
