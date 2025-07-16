// src/hooks/useUser.tsx - Complete secured version with fixed attempts cache management

"use client";

import type { TournamentGameResult } from "@/types/tournaments";
import type { AchievementNotificationData } from "@/components/LeagueProgress/AchievementNotification";

import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
} from "react";

import {
  type User,
  type TelegramUser,
  type AttemptsStatus,
  type GameSaveResult,
} from "@/lib/supabase";
import { type TournamentSaveResponse } from "@/lib/supabase_tournament_extension";
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

// JWT Authentication integration
import {
  authService,
  authenticateUser,
  isUserAuthenticated,
  signOutUser,
  consumeSecureAttempt,
  saveSecureGameResult,
  saveSecureTournamentResult,
} from "@/lib/authService";

type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult
  | TournamentGameResult;

interface AttemptsCache {
  status: AttemptsStatus | null;
  lastUpdate: number;
  isValid: boolean;
  source: "server" | "optimistic" | "initial";
}

interface UserContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  saveGameResult: (gameResult: GameResult) => Promise<GameSaveResult>;
  saveTournamentResult: (
    tournamentId: string,
    gameResult: SurvivalGameResult,
  ) => Promise<TournamentSaveResponse>;
  updateUser: (userData: User) => void;
  setTelegramUser: (userData: TelegramUser) => void;

  // Methods for working with attempts
  getAttemptsStatus: () => Promise<AttemptsStatus>;
  consumeAttemptForGame: () => Promise<AttemptsStatus>;
  invalidateAttemptsCache: () => void;
  getCachedAttemptsStatus: () => AttemptsStatus | null;

  // NEW: Force refresh attempts from server
  forceRefreshAttempts: () => Promise<AttemptsStatus>;

  // NEW: Trigger for external updates
  triggerAttemptsUpdate: () => void;

  // Achievement notifications
  currentAchievement: AchievementNotificationData | null;
  showAchievement: (achievement: AchievementNotificationData) => void;
  hideAchievement: () => void;

  // JWT Authentication methods
  isAuthenticated: boolean;
  authenticateWithTelegram: (
    initData: string,
    referralCode?: string,
  ) => Promise<void>;
  signOut: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

const CACHE_DURATION = 60000; // 60 seconds for optimal user experience
const OPTIMISTIC_UPDATE_TIMEOUT = 5000; // 5 seconds for optimistic update rollback

// Helper function for operation retries
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error = new Error("Unknown error occurred");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} to execute operation`);
      const result = await operation();

      if (attempt > 1) {
        console.log(`Operation succeeded on attempt ${attempt}`);
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

  console.error(`All ${maxAttempts} attempts failed`);
  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError.message}`,
  );
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Achievement notifications state
  const [currentAchievement, setCurrentAchievement] =
    useState<AchievementNotificationData | null>(null);

  // Cache for attempts with secure settings
  const [attemptsCache, setAttemptsCache] = useState<AttemptsCache>({
    status: null,
    lastUpdate: 0,
    isValid: false,
    source: "initial",
  });

  // NEW: Trigger for external updates (购买、任务等)
  const [attemptsUpdateTrigger, setAttemptsUpdateTrigger] = useState(0);

  // Initialize authentication state
  useEffect(() => {
    const checkAuthState = () => {
      const authStatus = isUserAuthenticated();

      setIsAuthenticated(authStatus);

      if (!authStatus) {
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Automatic Telegram user initialization on first render
  useEffect(() => {
    if (
      !telegramUser &&
      typeof window !== "undefined" &&
      window.Telegram?.WebApp
    ) {
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

  // JWT Authentication method
  const authenticateWithTelegram = useCallback(
    async (initData: string, referralCode?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Use JWT authentication
        const authUser = await authenticateUser(initData, referralCode);

        // Convert auth user to regular user format for compatibility
        const user: User = {
          id: authUser.id,
          trust_score: authUser.trust_score,
          telegram_id: authUser.telegram_id,
          first_name: authUser.first_name,
          last_name: authUser.last_name,
          username: authUser.username,
          language_code: telegramUser?.language_code,
          is_premium: telegramUser?.is_premium || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attempts_remaining: authUser.attempts_remaining,
          last_attempt_at: undefined,
          attempts_reset_at: undefined,
          referral_code: "",
          referred_by: undefined,
          referral_bonus: 5,
          referral_count: 0,
          total_games: authUser.total_games,
          total_score: 0,
          best_score: 0,
          current_level: authUser.current_level,
          current_league_id: undefined,
          reaction_games: 0,
          reaction_best_score: 0,
          reaction_best_time: 0,
          reaction_average_time: 0,
          survival_games: 0,
          survival_best_score: 0,
          survival_best_time: 0,
          survival_max_level: 0,
          survival_best_streak: 0,
          physics_games: 0,
          physics_best_score: 0,
          physics_best_time: 0,
          physics_total_hits: 0,
          physics_best_hits: 0,
          physics_least_mistakes: 0,
          rotation_games: 0,
          rotation_best_score: 0,
          rotation_best_time: 0,
          rotation_max_level: 0,
          rotation_best_streak: 0,
          rotation_total_hits: 0,
          total_correct_hits: 0,
          total_wrong_hits: 0,
          total_missed_circles: 0,
          best_accuracy: 0,
          last_played_at: undefined,
          is_active: true,
        };

        setUser(user);
        setIsAuthenticated(true);
        setIsLoading(false);
        invalidateAttemptsCache();
      } catch (error) {
        console.error("JWT Authentication failed:", error);
        setError(
          error instanceof Error ? error.message : "Authentication failed",
        );
        setIsLoading(false);
        throw error;
      }
    },
    [telegramUser],
  );

  // Sign out method
  const signOut = useCallback(() => {
    signOutUser();
    setIsAuthenticated(false);
    setUser(null);
    setTelegramUserState(null);
    invalidateAttemptsCache();
    setError(null);
  }, []);

  // Method for direct user update in context
  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    setError(null);
    setIsLoading(false);
  }, []);

  // Method for setting Telegram user in context
  const setTelegramUserData = useCallback((tgUserData: TelegramUser) => {
    setTelegramUserState(tgUserData);
    setIsLoading(false);
  }, []);

  // FIXED: Enhanced refreshUser method with attempts cache invalidation
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping refresh");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("Refreshing user data via secure API...");

      const userData = await authService.refreshUserData();

      // Convert to User format and update
      const user: User = {
        id: userData.id,
        trust_score: userData.trust_score,
        telegram_id: userData.telegram_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        language_code: telegramUser?.language_code,
        is_premium: telegramUser?.is_premium || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attempts_remaining: userData.attempts_remaining,
        last_attempt_at: undefined,
        attempts_reset_at: undefined,
        referral_code: "",
        referred_by: undefined,
        referral_bonus: 5,
        referral_count: 0,
        total_games: userData.total_games,
        total_score: 0,
        best_score: 0,
        current_level: userData.current_level,
        current_league_id: undefined,
        reaction_games: 0,
        reaction_best_score: 0,
        reaction_best_time: 0,
        reaction_average_time: 0,
        survival_games: 0,
        survival_best_score: 0,
        survival_best_time: 0,
        survival_max_level: 0,
        survival_best_streak: 0,
        physics_games: 0,
        physics_best_score: 0,
        physics_best_time: 0,
        physics_total_hits: 0,
        physics_best_hits: 0,
        physics_least_mistakes: 0,
        rotation_games: 0,
        rotation_best_score: 0,
        rotation_best_time: 0,
        rotation_max_level: 0,
        rotation_best_streak: 0,
        rotation_total_hits: 0,
        total_correct_hits: 0,
        total_wrong_hits: 0,
        total_missed_circles: 0,
        best_accuracy: 0,
        last_played_at: undefined,
        is_active: true,
      };

      setUser(user);

      // CRITICAL FIX: Invalidate attempts cache after user refresh
      invalidateAttemptsCache();

      // CRITICAL FIX: Trigger attempts update for components
      triggerAttemptsUpdate();

      console.log("User data refreshed successfully via secure API");
    } catch (err) {
      console.error("Failed to refresh user data via API:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh user data",
      );

      if (
        err instanceof Error &&
        err.message.includes("Authentication expired")
      ) {
        console.log("Token expired, signing out user");
        signOut();
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [telegramUser, isAuthenticated, signOut]);

  // Invalidate attempts cache
  const invalidateAttemptsCache = useCallback(() => {
    setAttemptsCache({
      status: null,
      lastUpdate: 0,
      isValid: false,
      source: "initial",
    });
    console.log("Attempts cache invalidated");
  }, []);

  // NEW: Trigger attempts update for external components
  const triggerAttemptsUpdate = useCallback(() => {
    setAttemptsUpdateTrigger(prev => prev + 1);
    console.log("Attempts update triggered");
  }, []);

  // Get cached attempts status for interface
  const getCachedAttemptsStatus = useCallback((): AttemptsStatus | null => {
    const now = Date.now();

    if (
      attemptsCache.isValid &&
      attemptsCache.status &&
      now - attemptsCache.lastUpdate < CACHE_DURATION
    ) {
      return attemptsCache.status;
    }

    return null;
  }, [attemptsCache]);

  // Secure getAttemptsStatus method using API only
  const getAttemptsStatus = useCallback(async (): Promise<AttemptsStatus> => {
    if (!isAuthenticated) {
      throw new Error("User not authenticated");
    }

    const now = Date.now();

    // Check cache validity
    if (
      attemptsCache.isValid &&
      attemptsCache.status &&
      attemptsCache.source === "server" &&
      now - attemptsCache.lastUpdate < CACHE_DURATION
    ) {
      console.log("Returning cached attempts status");

      return attemptsCache.status;
    }

    try {
      console.log("Fetching fresh attempts status via secure API...");

      const status = await authService.getAttemptsStatus();

      // Update cache with server data only
      setAttemptsCache({
        status,
        lastUpdate: now,
        isValid: true,
        source: "server",
      });

      console.log("Attempts status fetched successfully via secure API");

      return status;
    } catch (error) {
      console.error("Error fetching attempts status via API:", error);

      invalidateAttemptsCache();

      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.log("Token expired during attempts check, signing out user");
        signOut();
      }

      throw error;
    }
  }, [attemptsCache, invalidateAttemptsCache, isAuthenticated, signOut]);

  // NEW: Force refresh attempts from server (bypass cache)
  const forceRefreshAttempts = useCallback(async (): Promise<AttemptsStatus> => {
    if (!isAuthenticated) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Force refreshing attempts status from server...");

      // Invalidate cache first
      invalidateAttemptsCache();

      // Fetch fresh data
      const status = await authService.getAttemptsStatus();

      // Update cache with fresh data
      const now = Date.now();
      setAttemptsCache({
        status,
        lastUpdate: now,
        isValid: true,
        source: "server",
      });

      // Trigger update for components
      triggerAttemptsUpdate();

      console.log("Attempts status force refreshed successfully");

      return status;
    } catch (error) {
      console.error("Error force refreshing attempts status:", error);

      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.log("Token expired during force refresh, signing out user");
        signOut();
      }

      throw error;
    }
  }, [isAuthenticated, invalidateAttemptsCache, triggerAttemptsUpdate, signOut]);

  // Secure consumeAttemptForGame method using API only
  const consumeAttemptForGame =
    useCallback(async (): Promise<AttemptsStatus> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      console.log("Consuming attempt via secure API...");

      try {
        const newStatus = await consumeSecureAttempt();

        const now = Date.now();

        // Update cache after successful server request
        setAttemptsCache({
          status: newStatus,
          lastUpdate: now,
          isValid: true,
          source: "server",
        });

        // Trigger update for components
        triggerAttemptsUpdate();

        console.log("Attempt consumed successfully via secure API");

        return newStatus;
      } catch (error) {
        console.error("Error consuming attempt via API:", error);

        invalidateAttemptsCache();

        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log(
            "Token expired during attempt consumption, signing out user",
          );
          signOut();
        }

        throw error;
      }
    }, [invalidateAttemptsCache, isAuthenticated, signOut, triggerAttemptsUpdate]);

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

  // Helper function to process league achievements
  const processLeagueAchievements = useCallback(
    (gameResult: GameSaveResult) => {
      if (!gameResult.success) return;

      // Show level up notification
      if (gameResult.levelChanged && gameResult.newLevel) {
        showAchievement({
          type: "level_up",
          level: gameResult.newLevel,
        });
      }

      // Show league promotion notification with higher priority
      if (gameResult.leagueChanged && gameResult.newLeague) {
        const position = gameResult.reward?.reward?.position;

        setTimeout(
          () => {
            showAchievement({
              type: "league_promotion",
              league: gameResult.newLeague,
              position,
            });
          },
          gameResult.levelChanged ? 3000 : 0,
        );
      }

      // Show reward notification with highest priority
      if (gameResult.reward?.success && gameResult.reward.reward) {
        setTimeout(
          () => {
            showAchievement({
              type: "reward_received",
              league: gameResult.newLeague,
              reward: gameResult.reward?.reward,
            });
          },
          (gameResult.levelChanged ? 3000 : 0) +
          (gameResult.leagueChanged ? 3000 : 0),
        );
      }
    },
    [showAchievement],
  );

  // Cache invalidation on user change
  useEffect(() => {
    if (telegramUser) {
      invalidateAttemptsCache();
    }
  }, [telegramUser, invalidateAttemptsCache]);

  // Secure saveGameResult using API only
  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<GameSaveResult> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      // Check for tournament result
      if ("tournamentId" in gameResult) {
        const tournamentResult = await saveTournamentResult(
          gameResult.tournamentId,
          gameResult,
        );

        console.log(
          "Tournament result saved with accumulation:",
          tournamentResult,
        );

        return { success: true };
      }

      console.log("Saving regular game result via secure API:", {
        mode: gameResult.mode,
        score: gameResult.score,
        duration: gameResult.duration,
      });

      const saveOperation = async (): Promise<GameSaveResult> => {
        const result = await saveSecureGameResult(gameResult);

        // CRITICAL: Refresh user data and attempts after game save
        await refreshUser();

        // CRITICAL: Force refresh attempts to ensure UI is updated
        await forceRefreshAttempts();

        return result;
      };

      try {
        const result = await retryOperation(saveOperation, 3, 1000);

        console.log("Game result saved successfully via secure API:", result);

        // Process league achievements
        processLeagueAchievements(result);

        return result;
      } catch (err) {
        console.error(
          "Failed to save game result via API after all retry attempts:",
          err,
        );

        if (
          err instanceof Error &&
          err.message.includes("Authentication expired")
        ) {
          console.log("Token expired during game save, signing out user");
          signOut();
        }

        const errorMessage =
          err instanceof Error
            ? `Failed to save game result via secure API: ${err.message}`
            : "Failed to save game result via secure API";

        throw new Error(errorMessage);
      }
    },
    [
      isAuthenticated,
      refreshUser,
      forceRefreshAttempts,
      processLeagueAchievements,
      signOut,
    ],
  );

  // Secure tournament result saving
  const saveTournamentResult = useCallback(
    async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> => {
      if (!isAuthenticated || !user) {
        throw new Error("User not authenticated");
      }

      console.log("Saving tournament result via secure API:", {
        tournamentId,
        mode: gameResult.mode,
        score: gameResult.score,
        survivalTime: gameResult.survivalTime,
      });

      const saveOperation = async (): Promise<TournamentSaveResponse> => {
        return await saveSecureTournamentResult(tournamentId, gameResult);
      };

      try {
        const result = await retryOperation(saveOperation, 3, 1000);

        console.log(
          "Tournament result saved successfully via secure API:",
          result,
        );

        return result;
      } catch (err) {
        console.error("Failed to save tournament result via API:", err);

        if (
          err instanceof Error &&
          err.message.includes("Authentication expired")
        ) {
          console.log("Token expired during tournament save, signing out user");
          signOut();
        }

        const errorMessage =
          err instanceof Error
            ? `Failed to save tournament result via secure API: ${err.message}`
            : "Failed to save tournament result via secure API";

        throw new Error(errorMessage);
      }
    },
    [isAuthenticated, user, signOut],
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
    forceRefreshAttempts,
    triggerAttemptsUpdate,
    // Achievement notifications
    currentAchievement,
    showAchievement,
    hideAchievement,
    // JWT Authentication
    isAuthenticated,
    authenticateWithTelegram,
    signOut,
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