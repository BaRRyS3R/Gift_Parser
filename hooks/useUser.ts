// src/hooks/useUser.ts - Updated with league module integration

"use client";

import React, { useState, useCallback, useContext, createContext, useEffect } from "react";
import { useAuth } from "./modules/useAuth";
import { useLeaderboard } from "./modules/useLeaderboard";
import { useLeague } from "./modules/useLeague"; // NEW: League module
import type { User, TelegramUser, AttemptsStatus } from "@/lib/supabase";
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

  // Attempts management (will be moved to separate module later)
  getAttemptsStatus: () => Promise<AttemptsStatus>;
  consumeAttemptForGame: () => Promise<AttemptsStatus>;
  invalidateAttemptsCache: () => void;
  getCachedAttemptsStatus: () => AttemptsStatus | null;

  // Achievement notifications
  currentAchievement: AchievementNotificationData | null;
  showAchievement: (achievement: AchievementNotificationData) => void;
  hideAchievement: () => void;

  // Leaderboard module (replaces individual leaderboard methods)
  leaderboard: ReturnType<typeof useLeaderboard>;

  // NEW: League module (replaces direct league_service usage)
  league: ReturnType<typeof useLeague>;

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

  // Use leaderboard module (centralized leaderboard management without caching)
  const leaderboardModule = useLeaderboard(makeAuthenticatedRequest);

  // NEW: Use league module (centralized league management)
  const leagueModule = useLeague(makeAuthenticatedRequest);

  // Local state for user data and UI
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Achievement notifications state
  const [currentAchievement, setCurrentAchievement] = useState<AchievementNotificationData | null>(null);

  // Attempts cache (temporary - will be moved to separate module)
  const [attemptsCache, setAttemptsCache] = useState<{
    status: AttemptsStatus | null;
    lastUpdate: number;
    isValid: boolean;
  }>({
    status: null,
    lastUpdate: 0,
    isValid: false,
  });

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
    setAttemptsCache({ status: null, lastUpdate: 0, isValid: false });

    // Reset leaderboard and league data on logout
    leaderboardModule.resetLeaderboard();
    leagueModule.resetLeagueData(); // NEW: Reset league data

    console.log("User logged out");
  }, [authLogout, leaderboardModule, leagueModule]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);
      // In the future, this will call a dedicated user refresh API
      // For now, we rely on the authentication system
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
    // This will be enhanced when we create a dedicated user data module
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

  // ========================================
  // TEMPORARY METHODS (to be moved to modules)
  // ========================================

  // Temporary attempts methods (will be moved to attempts module)
  const getAttemptsStatus = useCallback(async (): Promise<AttemptsStatus> => {
    if (!authState.isAuthenticated) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await makeAuthenticatedRequest('/api/user/attempts/status');

      if (!response.ok) {
        throw new Error('Failed to get attempts status');
      }

      const status = await response.json();

      // Update cache
      setAttemptsCache({
        status,
        lastUpdate: Date.now(),
        isValid: true,
      });

      return status;
    } catch (error) {
      console.error("Error getting attempts status:", error);
      throw error;
    }
  }, [authState.isAuthenticated, makeAuthenticatedRequest]);

  const consumeAttemptForGame = useCallback(async (): Promise<AttemptsStatus> => {
    if (!authState.isAuthenticated) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await makeAuthenticatedRequest('/api/user/attempts/consume', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to consume attempt');
      }

      const status = await response.json();

      // Update cache
      setAttemptsCache({
        status,
        lastUpdate: Date.now(),
        isValid: true,
      });

      return status;
    } catch (error) {
      console.error("Error consuming attempt:", error);
      throw error;
    }
  }, [authState.isAuthenticated, makeAuthenticatedRequest]);

  const invalidateAttemptsCache = useCallback(() => {
    setAttemptsCache({ status: null, lastUpdate: 0, isValid: false });
  }, []);

  const getCachedAttemptsStatus = useCallback((): AttemptsStatus | null => {
    const now = Date.now();
    const CACHE_DURATION = 60000; // 1 minute

    if (attemptsCache.isValid &&
      attemptsCache.status &&
      (now - attemptsCache.lastUpdate) < CACHE_DURATION) {
      return attemptsCache.status;
    }

    return null;
  }, [attemptsCache]);

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

    // Attempts management (temporary)
    getAttemptsStatus,
    consumeAttemptForGame,
    invalidateAttemptsCache,
    getCachedAttemptsStatus,

    // Achievement notifications
    currentAchievement,
    showAchievement,
    hideAchievement,

    // Leaderboard module (without caching - fresh data on each request)
    leaderboard: leaderboardModule,

    // NEW: League module (centralized league management)
    league: leagueModule,

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