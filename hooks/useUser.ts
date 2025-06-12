// src/hooks/useUser.tsx

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
} from "react";

import { userService, type User, type TelegramUser, type GameResultDB } from "@/lib/supabase";

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResultDB) => Promise<void>;
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

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
    async (gameResult: GameResultDB): Promise<void> => {
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