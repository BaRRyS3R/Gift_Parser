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

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      console.log('useUser - Starting refreshUser')
      setIsLoading(true);
      setError(null);

      const tgUser = getTelegramUser();
      console.log('useUser - Telegram User:', tgUser)

      if (!tgUser) {
        throw new Error("Данные пользователя Telegram недоступны");
      }

      setTelegramUser(tgUser);

      // Даем время на то, чтобы данные стали доступны в БД
      console.log('useUser - Waiting for DB to be ready...')
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('useUser - Fetching user from DB:', tgUser.id)
      const dbUser = await userService.findByTelegramId(tgUser.id);
      console.log('useUser - DB User:', dbUser)

      if (dbUser) {
        setUser(dbUser);
      }
    } catch (err) {
      console.error("useUser - Error updating user data:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
      console.log('useUser - refreshUser completed')
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
    console.log('useUser - Initial effect triggered')
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
