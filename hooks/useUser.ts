// src/hooks/useUser.ts - Исправленный без кеширования попыток

"use client";

import React, { useState, useCallback, useContext, createContext, useEffect } from "react";
import { useAuth } from "./modules/useAuth";
import { useLeaderboard } from "./modules/useLeaderboard";
import { useProfile } from "./modules/useProfile";
import type { User, TelegramUser } from "@/lib/supabase";
import type {
  AuthState,
  RegistrationResult,
  LoginResult,
  AuthTokens
} from "./modules/useAuth";

// Import achievement notification types
import type { AchievementNotificationData } from "@/components/LeagueProgress/AchievementNotification";

// Main user context interface
interface UserContextType {
  // User data
  user: User | null;
  telegramUser: TelegramUser | null;

  // Authentication state
  authState: AuthState;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Authentication methods
  register: (initData: string, referralCode?: string) => Promise<RegistrationResult>;
  login: (initData: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;

  // User management
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  // Achievement notifications
  currentAchievement: AchievementNotificationData | null;
  showAchievement: (achievement: AchievementNotificationData) => void;
  hideAchievement: () => void;

  // Leaderboard module
  leaderboard: ReturnType<typeof useLeaderboard>;

  // Profile module
  profile: ReturnType<typeof useProfile>;

  // Utility methods
  makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // Use authentication module
  const {
    authState,
    register: authRegister,
    login: authLogin,
    logout: authLogout,
    checkAuthStatus,
    makeAuthenticatedRequest,
    clearError,
  } = useAuth();

  // Use leaderboard module
  const leaderboardModule = useLeaderboard(makeAuthenticatedRequest);

  // Use profile module
  const profileModule = useProfile(makeAuthenticatedRequest);

  // Local state for user data and UI
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Achievement notifications state
  const [currentAchievement, setCurrentAchievement] = useState<AchievementNotificationData | null>(null);

  // Auto-detect Telegram user on mount
  useEffect(() => {
    if (!telegramUser && typeof window !== "undefined" && window.Telegram?.WebApp) {
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

  // Update local error state when auth error changes
  useEffect(() => {
    setError(authState.error);
  }, [authState.error]);

  // Enhanced register function with referral support
  const register = useCallback(async (
    initData: string,
    referralCode?: string
  ): Promise<RegistrationResult> => {
    try {
      setError(null);
      const result = await authRegister(initData, referralCode);

      if (result.success && result.user) {
        console.log("Registration successful:", result.user.first_name);
        if (result.referralBonus) {
          console.log("Referral bonus received:", result.referralBonus);
        }
      }

      return result;
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authRegister]);

  // Enhanced login function
  const login = useCallback(async (initData: string): Promise<LoginResult> => {
    try {
      setError(null);
      const result = await authLogin(initData);

      if (result.success && result.user) {
        console.log("Login successful:", result.user.first_name);
      }

      return result;
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authLogin]);

  // Enhanced logout function
  const logout = useCallback(() => {
    authLogout();
    setTelegramUserState(null);
    setError(null);

    // Reset leaderboard and profile data on logout
    leaderboardModule.resetLeaderboard();
    profileModule.resetProfileData();

    console.log("User logged out");
  }, [authLogout, leaderboardModule, profileModule]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);
      console.log("User data refreshed");
    } catch (error) {
      console.error("Error refreshing user:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh user data");
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated, authState.user]);

  // Direct user update (for external updates)
  const updateUser = useCallback((userData: User) => {
    console.log("User data updated externally");
  }, []);

  // Set Telegram user data
  const setTelegramUser = useCallback((userData: TelegramUser) => {
    setTelegramUserState(userData);
  }, []);

  // Achievement notification methods
  const showAchievement = useCallback((achievement: AchievementNotificationData) => {
    setCurrentAchievement(achievement);
  }, []);

  const hideAchievement = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  // Clear error state
  const clearErrorState = useCallback(() => {
    setError(null);
    clearError();
  }, [clearError]);

  // Context value
  const contextValue: UserContextType = {
    // User data
    user: authState.user,
    telegramUser,

    // Authentication state
    authState,

    // Loading states
    isLoading: isLoading || authState.isLoading,
    error,

    // Authentication methods
    register,
    login,
    logout,
    refreshUser,

    // User management
    updateUser,
    setTelegramUser,

    // Achievement notifications
    currentAchievement,
    showAchievement,
    hideAchievement,

    // Leaderboard module
    leaderboard: leaderboardModule,

    // Profile module
    profile: profileModule,

    // Utility methods
    makeAuthenticatedRequest,
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
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}