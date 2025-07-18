// ===== src/hooks/useUser.ts =====
// ИСПРАВЛЕНО: Убираем циклические зависимости

"use client";

import type { TelegramUser } from "@/lib/supabase";
import type {
  AuthState,
  RegistrationResult,
  LoginResult,
} from "./modules/useAuth";
import type { AchievementNotificationData } from "@/components/LeagueProgress/AchievementNotification";

import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "./modules/useAuth";
import { useLeaderboard } from "./modules/useLeaderboard";
import { useProfile } from "./modules/useProfile";
import { useLeagues } from "./modules/useLeagues";
import { useAttempts } from "./modules/useAttempts";
import { useGame } from "./modules/useGame";
import { useTournament } from "./modules/useTournament";

interface UserContextType {
  user: any | null;
  telegramUser: TelegramUser | null;
  authState: AuthState;
  isLoading: boolean;
  error: string | null;

  register: (
    initData: string,
    referralCode?: string,
  ) => Promise<RegistrationResult>;
  login: (initData: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;

  updateUser: (userData: any) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  currentAchievement: AchievementNotificationData | null;
  showAchievement: (achievement: AchievementNotificationData) => void;
  hideAchievement: () => void;

  profile: ReturnType<typeof useProfile>;
  leagues: ReturnType<typeof useLeagues>;
  leaderboard: ReturnType<typeof useLeaderboard>;
  attempts: ReturnType<typeof useAttempts>;
  game: ReturnType<typeof useGame>;
  tournament: ReturnType<typeof useTournament>;

  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // ИСПРАВЛЕНО: Используем auth модуль первым
  const {
    authState,
    register: authRegister,
    login: authLogin,
    logout: authLogout,
    checkAuthStatus,
    makeAuthenticatedRequest,
    clearError,
  } = useAuth();

  // ИСПРАВЛЕНО: Передаем зависимости как параметры, избегая циклических импортов
  const profileModule = useProfile(makeAuthenticatedRequest);
  const leaguesModule = useLeagues(makeAuthenticatedRequest);
  const leaderboardModule = useLeaderboard(makeAuthenticatedRequest);
  const attemptsModule = useAttempts(makeAuthenticatedRequest, authState.isAuthenticated);
  const gameModule = useGame(makeAuthenticatedRequest);
  const tournamentModule = useTournament(makeAuthenticatedRequest);

  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementNotificationData | null>(null);

  // Auto-detect Telegram user on mount
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

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
          console.log("No valid authentication found");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuthStatus]);

  // Auto-load profile data when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !profileModule.hasProfileData()) {
      console.log("Loading profile data for authenticated user");
      profileModule.fetchProfile();
    }
  }, [authState.isAuthenticated, profileModule]);

  // Auto-load compact league data when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !leaguesModule.hasValidCompactCache) {
      console.log("Loading compact league data for authenticated user");
      leaguesModule.fetchCompactLeagues();
    }
  }, [authState.isAuthenticated, leaguesModule]);

  // Update local error state when auth error changes
  useEffect(() => {
    setError(authState.error);
  }, [authState.error]);

  // Enhanced register function with referral support
  const register = useCallback(
    async (
      initData: string,
      referralCode?: string,
    ): Promise<RegistrationResult> => {
      try {
        setError(null);
        const result = await authRegister(initData, referralCode);

        if (result.success && result.user) {
          console.log("Registration successful:", result.user.first_name);
          if (result.referralBonus) {
            console.log("Referral bonus received:", result.referralBonus);
          }

          // Invalidate caches to refresh data
          profileModule.invalidateCache();
          leaguesModule.invalidateAllCaches();
          attemptsModule.invalidateCache();
          gameModule.resetGameState();
          tournamentModule.resetTournamentState();
        }

        return result;
      } catch (error) {
        console.error("Registration error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Registration failed";

        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [
      authRegister,
      profileModule,
      leaguesModule,
      attemptsModule,
      gameModule,
      tournamentModule,
    ],
  );

  // Enhanced login function
  const login = useCallback(
    async (initData: string): Promise<LoginResult> => {
      try {
        setError(null);
        const result = await authLogin(initData);

        if (result.success && result.user) {
          console.log("Login successful:", result.user.first_name);

          // Invalidate caches to refresh data
          profileModule.invalidateCache();
          leaguesModule.invalidateAllCaches();
          attemptsModule.invalidateCache();
          gameModule.resetGameState();
          tournamentModule.resetTournamentState();
        }

        return result;
      } catch (error) {
        console.error("Login error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";

        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [
      authLogin,
      profileModule,
      leaguesModule,
      attemptsModule,
      gameModule,
      tournamentModule,
    ],
  );

  // Enhanced logout function
  const logout = useCallback(() => {
    authLogout();
    setTelegramUserState(null);
    setError(null);

    // Reset all module data on logout
    profileModule.resetProfile();
    leaguesModule.resetLeagues();
    leaderboardModule.resetLeaderboard();
    attemptsModule.invalidateCache();
    gameModule.resetGameState();
    tournamentModule.resetTournamentState();

    console.log("User logged out");
  }, [
    authLogout,
    profileModule,
    leaguesModule,
    leaderboardModule,
    attemptsModule,
    gameModule,
    tournamentModule,
  ]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);
      // Refresh all module data
      await Promise.all([
        profileModule.fetchProfile(),
        leaguesModule.fetchCompactLeagues(true),
        attemptsModule.fetchAttemptsStatus(true),
      ]);

      console.log("User data refreshed");
    } catch (error) {
      console.error("Error refreshing user:", error);
      setError(
        error instanceof Error ? error.message : "Failed to refresh user data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    authState.isAuthenticated,
    authState.user,
    profileModule,
    leaguesModule,
    attemptsModule,
  ]);

  // Direct user update (for external updates) - now uses profile module
  const updateUser = useCallback(
    (userData: any) => {
      console.log("User data updated externally");
      // Invalidate profile cache to refresh on next access
      profileModule.invalidateCache();
    },
    [profileModule],
  );

  // Set Telegram user data
  const setTelegramUser = useCallback((userData: TelegramUser) => {
    setTelegramUserState(userData);
  }, []);

  // Achievement notification methods
  const showAchievement = useCallback(
    (achievement: AchievementNotificationData) => {
      setCurrentAchievement(achievement);
    },
    [],
  );

  const hideAchievement = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  // ИСПРАВЛЕНО: Memoized context value для предотвращения ненужных ре-рендеров
  const contextValue = useMemo<UserContextType>(() => ({
    user: profileModule.profile,
    telegramUser,
    authState,
    isLoading: isLoading || authState.isLoading || profileModule.isLoading,
    error,
    register,
    login,
    logout,
    refreshUser,
    updateUser,
    setTelegramUser,
    currentAchievement,
    showAchievement,
    hideAchievement,
    profile: profileModule,
    leagues: leaguesModule,
    leaderboard: leaderboardModule,
    attempts: attemptsModule,
    game: gameModule,
    tournament: tournamentModule,
    makeAuthenticatedRequest,
  }), [
    profileModule,
    telegramUser,
    authState,
    isLoading,
    error,
    register,
    login,
    logout,
    refreshUser,
    updateUser,
    setTelegramUser,
    currentAchievement,
    showAchievement,
    hideAchievement,
    leaguesModule,
    leaderboardModule,
    attemptsModule,
    gameModule,
    tournamentModule,
    makeAuthenticatedRequest,
  ]);

  return React.createElement(
    UserContext.Provider,
    { value: contextValue },
    children,
  );
};

export function useUser(): UserContextType {
  const context = useContext(UserContext);

  if (context === undefined) {
    // ИСПРАВЛЕНО: Более детальная ошибка для отладки
    console.error("useUser hook called outside of UserProvider. Component tree:");
    console.error("Current location:", new Error().stack);
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}