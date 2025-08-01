// src/hooks/useUser.ts - Оптимизированный с параллельной инициализацией данных

"use client";

import type { User, TelegramUser } from "@/lib/supabase";
import type {
  AuthState,
  RegistrationResult,
  LoginResult,
} from "./modules/useAuth";

import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
} from "react";

import { useAuth } from "./modules/useAuth";
import { useLeaderboard } from "./modules/useLeaderboard";
import { useProfile } from "./modules/useProfile";
import { useGame } from "./modules/useGame";
import { useSeasons } from "./modules/useSeasons";

// Основной интерфейс контекста пользователя
interface UserContextType {
  // Данные пользователя
  user: User | null;
  telegramUser: TelegramUser | null;

  // Состояние аутентификации
  authState: AuthState;

  // Состояния загрузки
  isLoading: boolean;
  error: string | null;

  // Методы аутентификации
  register: (
    initData: string,
    referralCode?: string,
  ) => Promise<RegistrationResult>;
  login: (initData: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;

  // Управление пользователем
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  // Интеграции модулей
  leaderboard: ReturnType<typeof useLeaderboard>;
  profile: ReturnType<typeof useProfile>;
  game: ReturnType<typeof useGame>;
  seasons: ReturnType<typeof useSeasons>;

  // Утилитарные методы
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>;

  // НОВОЕ: Предварительная загрузка данных
  preloadUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // Использование модуля аутентификации
  const {
    authState,
    register: authRegister,
    login: authLogin,
    logout: authLogout,
    checkAuthStatus,
    makeAuthenticatedRequest,
    clearError,
  } = useAuth();

  // Использование специализированных модулей
  const leaderboardModule = useLeaderboard(makeAuthenticatedRequest);
  const profileModule = useProfile(makeAuthenticatedRequest);
  const gameModule = useGame(makeAuthenticatedRequest);
  const seasonsModule = useSeasons(makeAuthenticatedRequest);

  // Локальное состояние для данных пользователя и интерфейса
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Автоматическое определение пользователя Telegram при монтировании
  useEffect(() => {
    if (
      !telegramUser &&
      typeof window !== "undefined" &&
      window.Telegram?.WebApp
    ) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;

      if (user && user.id) {
        const telegramUserData: TelegramUser = {
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

  /**
   * НОВОЕ: Предварительная загрузка критичных данных пользователя
   */
  const preloadUserData = useCallback(async (): Promise<void> => {
    if (!authState.isAuthenticated) {
      console.log("Пользователь не аутентифицирован, пропускаем предварительную загрузку");
      return;
    }

    try {
      console.log("Запуск предварительной загрузки критичных данных пользователя...");

      // Параллельная загрузка критичных данных для игровой страницы
      const dataPromises = [
        // Попытки пользователя (самые критичные для игровой страницы)
        makeAuthenticatedRequest("/api/user/attempts/status", {
          headers: { 'X-Fast-Check': 'true' }
        }).catch((error: Error) => {
          console.warn("Не удалось предварительно загрузить данные попыток:", error);
          return null;
        }),

        // Профиль пользователя
        profileModule.fetchProfileData().catch((error: Error) => {
          console.warn("Не удалось предварительно загрузить профиль:", error);
          return null;
        }),

        // Данные текущего сезона
        seasonsModule.fetchCurrentSeason().catch((error: Error) => {
          console.warn("Не удалось предварительно загрузить данные сезона:", error);
          return null;
        }),
      ];

      const results = await Promise.allSettled(dataPromises);

      console.log("Предварительная загрузка завершена:", {
        attemptsLoaded: results[0].status === 'fulfilled',
        profileLoaded: results[1].status === 'fulfilled',
        seasonLoaded: results[2].status === 'fulfilled',
      });

    } catch (error) {
      console.error("Ошибка предварительной загрузки данных:", error);
      // Не показываем ошибки предварительной загрузки пользователю
    }
  }, [authState.isAuthenticated, makeAuthenticatedRequest, profileModule, seasonsModule]);

  /**
   * ОПТИМИЗИРОВАННОЕ: Проверка статуса аутентификации с параллельной загрузкой
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("Инициализация аутентификации с параллельной загрузкой...");

        // Запускаем проверку аутентификации
        const isAuthenticated = await checkAuthStatus();

        if (isAuthenticated) {
          console.log("Пользователь аутентифицирован, запускаем предварительную загрузку");

          // Немедленно запускаем предварительную загрузку данных без ожидания
          preloadUserData().catch(error => {
            console.warn("Предварительная загрузка не удалась:", error);
          });
        } else {
          console.log("Действительная аутентификация не найдена");
        }
      } catch (error) {
        console.error("Ошибка инициализации аутентификации:", error);
        setError(
          error instanceof Error ? error.message : "Ошибка инициализации аутентификации"
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuthStatus, preloadUserData]);

  // Обновление локального состояния ошибки при изменении ошибки аутентификации
  useEffect(() => {
    setError(authState.error);
  }, [authState.error]);

  // Улучшенная функция регистрации с поддержкой рефералов
  const register = useCallback(
    async (
      initData: string,
      referralCode?: string,
    ): Promise<RegistrationResult> => {
      try {
        setError(null);
        const result = await authRegister(initData, referralCode);

        if (result.success && result.user) {
          console.log("Регистрация успешна:", result.user.first_name);
          if (result.referralBonus) {
            console.log("Получен реферальный бонус:", result.referralBonus);
          }

          // Запускаем предварительную загрузку для нового пользователя
          setTimeout(() => {
            preloadUserData().catch((error: Error) => console.error(error));
          }, 100);
        }

        return result;
      } catch (error) {
        console.error("Ошибка регистрации:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Регистрация не удалась";

        setError(errorMessage);

        return { success: false, error: errorMessage };
      }
    },
    [authRegister, preloadUserData],
  );

  // Улучшенная функция входа
  const login = useCallback(
    async (initData: string): Promise<LoginResult> => {
      try {
        setError(null);
        const result = await authLogin(initData);

        if (result.success && result.user) {
          console.log("Вход успешен:", result.user.first_name);

          // Запускаем предварительную загрузку для вошедшего пользователя
          setTimeout(() => {
            preloadUserData().catch((error: Error) => console.error(error));
          }, 100);
        }

        return result;
      } catch (error) {
        console.error("Ошибка входа:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Вход не удался";

        setError(errorMessage);

        return { success: false, error: errorMessage };
      }
    },
    [authLogin, preloadUserData],
  );

  // Улучшенная функция выхода
  const logout = useCallback(() => {
    authLogout();
    setTelegramUserState(null);
    setError(null);

    // Сброс всех данных модулей при выходе
    leaderboardModule.resetLeaderboard();
    profileModule.resetProfileData();
    gameModule.resetTournamentState();
    seasonsModule.resetSeasonData();

    console.log("Пользователь вышел из системы");
  }, [authLogout, leaderboardModule, profileModule, gameModule, seasonsModule]);

  // Обновление данных пользователя
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);

      // Повторно загружаем критичные данные
      await preloadUserData();

      console.log("Данные пользователя обновлены");
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      setError(
        error instanceof Error ? error.message : "Не удалось обновить данные пользователя",
      );
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated, authState.user, preloadUserData]);

  // Прямое обновление пользователя (для внешних обновлений)
  const updateUser = useCallback((userData: User) => {
    console.log("Данные пользователя обновлены внешне");
  }, []);

  // Установка данных пользователя Telegram
  const setTelegramUser = useCallback((userData: TelegramUser) => {
    setTelegramUserState(userData);
  }, []);

  // Очистка состояния ошибки
  const clearErrorState = useCallback(() => {
    setError(null);
    clearError();
  }, [clearError]);

  // Значение контекста
  const contextValue: UserContextType = {
    // Данные пользователя
    user: authState.user,
    telegramUser,

    // Состояние аутентификации
    authState,

    // Состояния загрузки
    isLoading: isLoading || authState.isLoading,
    error,

    // Методы аутентификации
    register,
    login,
    logout,
    refreshUser,

    // Управление пользователем
    updateUser,
    setTelegramUser,

    // Интеграции модулей
    leaderboard: leaderboardModule,
    profile: profileModule,
    game: gameModule,
    seasons: seasonsModule,

    // Утилитарные методы
    makeAuthenticatedRequest,
    preloadUserData,
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