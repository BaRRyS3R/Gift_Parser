// src/hooks/useUser.tsx - Исправленная версия для устранения лагов и зацикленных функций

"use client";

import type { TournamentGameResult } from "@/types/tournaments";
import type { AchievementNotificationData } from "@/components/LeagueProgress/AchievementNotification";

import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
  useRef,
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
  forceRefreshAttempts: () => Promise<AttemptsStatus>;

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
  const [telegramUser, setTelegramUserState] = useState<TelegramUser | null>(null);
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

  // Стабильные refs для функций - предотвращают пересоздание зависимостей
  const stableFunctionsRef = useRef({
    getAttemptsStatus: null as (() => Promise<AttemptsStatus>) | null,
    consumeAttemptForGame: null as (() => Promise<AttemptsStatus>) | null,
    forceRefreshAttempts: null as (() => Promise<AttemptsStatus>) | null,
    saveGameResult: null as ((gameResult: GameResult) => Promise<GameSaveResult>) | null,
    saveTournamentResult: null as ((tournamentId: string, gameResult: SurvivalGameResult) => Promise<TournamentSaveResponse>) | null,
    refreshUser: null as (() => Promise<void>) | null,
  });

  // Ref для предотвращения множественных операций
  const operationInProgressRef = useRef({
    refreshUser: false,
    consumeAttempt: false,
    saveGame: false,
  });

  // Initialize authentication state - выполняется только один раз
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

  // Automatic Telegram user initialization - выполняется только один раз
  useEffect(() => {
    if (!telegramUser && typeof window !== "undefined" && window.Telegram?.WebApp) {
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

  // Стабильная функция для инвалидации кэша
  const invalidateAttemptsCache = useCallback(() => {
    setAttemptsCache({
      status: null,
      lastUpdate: 0,
      isValid: false,
      source: "initial",
    });
    console.log("Attempts cache invalidated");
  }, []);

  // Создание стабильных функций для работы с попытками
  useEffect(() => {
    if (!isAuthenticated) {
      // Очищаем функции если пользователь не аутентифицирован
      stableFunctionsRef.current = {
        getAttemptsStatus: null,
        consumeAttemptForGame: null,
        forceRefreshAttempts: null,
        saveGameResult: null,
        saveTournamentResult: null,
        refreshUser: null,
      };
      return;
    }

    // Стабильная функция получения статуса попыток
    stableFunctionsRef.current.getAttemptsStatus = async (): Promise<AttemptsStatus> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      const now = Date.now();

      // Проверяем кэш
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

        // Обновляем кэш
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

        if (error instanceof Error && error.message.includes("Authentication expired")) {
          console.log("Token expired during attempts check, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        throw error;
      }
    };

    // Стабильная функция потребления попытки
    stableFunctionsRef.current.consumeAttemptForGame = async (): Promise<AttemptsStatus> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      // Предотвращаем множественные операции
      if (operationInProgressRef.current.consumeAttempt) {
        throw new Error("Attempt consumption already in progress");
      }

      operationInProgressRef.current.consumeAttempt = true;

      try {
        console.log("Consuming attempt via secure API...");
        const newStatus = await consumeSecureAttempt();

        const now = Date.now();
        setAttemptsCache({
          status: newStatus,
          lastUpdate: now,
          isValid: true,
          source: "server",
        });

        console.log("Attempt consumed successfully via secure API");
        return newStatus;
      } catch (error) {
        console.error("Error consuming attempt via API:", error);
        invalidateAttemptsCache();

        if (error instanceof Error && error.message.includes("Authentication expired")) {
          console.log("Token expired during attempt consumption, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        throw error;
      } finally {
        operationInProgressRef.current.consumeAttempt = false;
      }
    };

    // Стабильная функция принудительного обновления попыток
    stableFunctionsRef.current.forceRefreshAttempts = async (): Promise<AttemptsStatus> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      try {
        console.log("Force refreshing attempts status from server...");

        // Инвалидируем кэш
        invalidateAttemptsCache();

        // Получаем свежие данные
        const status = await authService.getAttemptsStatus();

        const now = Date.now();
        setAttemptsCache({
          status,
          lastUpdate: now,
          isValid: true,
          source: "server",
        });

        console.log("Attempts status force refreshed successfully");
        return status;
      } catch (error) {
        console.error("Error force refreshing attempts status:", error);

        if (error instanceof Error && error.message.includes("Authentication expired")) {
          console.log("Token expired during force refresh, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        throw error;
      }
    };

    // Стабильная функция сохранения результата игры
    stableFunctionsRef.current.saveGameResult = async (gameResult: GameResult): Promise<GameSaveResult> => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      if (operationInProgressRef.current.saveGame) {
        throw new Error("Game save already in progress");
      }

      operationInProgressRef.current.saveGame = true;

      try {
        // Проверяем на турнирный результат
        if ("tournamentId" in gameResult) {
          const tournamentResult = await stableFunctionsRef.current.saveTournamentResult!(
            gameResult.tournamentId,
            gameResult,
          );
          console.log("Tournament result saved:", tournamentResult);
          return { success: true };
        }

        console.log("Saving regular game result via secure API:", {
          mode: gameResult.mode,
          score: gameResult.score,
          duration: gameResult.duration,
        });

        const saveOperation = async (): Promise<GameSaveResult> => {
          const result = await saveSecureGameResult(gameResult);

          // После сохранения обновляем пользователя и инвалидируем кэш попыток
          if (stableFunctionsRef.current.refreshUser) {
            await stableFunctionsRef.current.refreshUser();
          }

          invalidateAttemptsCache();

          return result;
        };

        const result = await retryOperation(saveOperation, 3, 1000);
        console.log("Game result saved successfully via secure API:", result);

        // Обрабатываем достижения
        processLeagueAchievements(result);

        return result;
      } catch (err) {
        console.error("Failed to save game result via API:", err);

        if (err instanceof Error && err.message.includes("Authentication expired")) {
          console.log("Token expired during game save, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        const errorMessage = err instanceof Error
          ? `Failed to save game result: ${err.message}`
          : "Failed to save game result";

        throw new Error(errorMessage);
      } finally {
        operationInProgressRef.current.saveGame = false;
      }
    };

    // Стабильная функция сохранения турнирного результата
    stableFunctionsRef.current.saveTournamentResult = async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> => {
      if (!isAuthenticated) {
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
        console.log("Tournament result saved successfully via secure API:", result);
        return result;
      } catch (err) {
        console.error("Failed to save tournament result via API:", err);

        if (err instanceof Error && err.message.includes("Authentication expired")) {
          console.log("Token expired during tournament save, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        const errorMessage = err instanceof Error
          ? `Failed to save tournament result: ${err.message}`
          : "Failed to save tournament result";

        throw new Error(errorMessage);
      }
    };

    // Стабильная функция обновления пользователя
    stableFunctionsRef.current.refreshUser = async (): Promise<void> => {
      if (!isAuthenticated) {
        console.log("User not authenticated, skipping refresh");
        return;
      }

      if (operationInProgressRef.current.refreshUser) {
        console.log("User refresh already in progress, skipping");
        return;
      }

      operationInProgressRef.current.refreshUser = true;

      try {
        setIsLoading(true);
        setError(null);

        console.log("Refreshing user data via secure API...");
        const userData = await authService.refreshUserData();

        // Конвертируем в формат User
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
        invalidateAttemptsCache();

        console.log("User data refreshed successfully via secure API");
      } catch (err) {
        console.error("Failed to refresh user data via API:", err);
        setError(err instanceof Error ? err.message : "Failed to refresh user data");

        if (err instanceof Error && err.message.includes("Authentication expired")) {
          console.log("Token expired, signing out user");
          signOutUser();
          setIsAuthenticated(false);
          setUser(null);
        }

        throw err;
      } finally {
        setIsLoading(false);
        operationInProgressRef.current.refreshUser = false;
      }
    };

  }, [isAuthenticated, telegramUser, attemptsCache, invalidateAttemptsCache]);

  // Стабильные wrapper функции для экспорта
  const getAttemptsStatus = useCallback(async (): Promise<AttemptsStatus> => {
    if (!stableFunctionsRef.current.getAttemptsStatus) {
      throw new Error("Attempts status function not initialized");
    }
    return stableFunctionsRef.current.getAttemptsStatus();
  }, []);

  const consumeAttemptForGame = useCallback(async (): Promise<AttemptsStatus> => {
    if (!stableFunctionsRef.current.consumeAttemptForGame) {
      throw new Error("Attempt consumption function not initialized");
    }
    return stableFunctionsRef.current.consumeAttemptForGame();
  }, []);

  const forceRefreshAttempts = useCallback(async (): Promise<AttemptsStatus> => {
    if (!stableFunctionsRef.current.forceRefreshAttempts) {
      throw new Error("Force refresh function not initialized");
    }
    return stableFunctionsRef.current.forceRefreshAttempts();
  }, []);

  const saveGameResult = useCallback(async (gameResult: GameResult): Promise<GameSaveResult> => {
    if (!stableFunctionsRef.current.saveGameResult) {
      throw new Error("Save game function not initialized");
    }
    return stableFunctionsRef.current.saveGameResult(gameResult);
  }, []);

  const saveTournamentResult = useCallback(async (
    tournamentId: string,
    gameResult: SurvivalGameResult,
  ): Promise<TournamentSaveResponse> => {
    if (!stableFunctionsRef.current.saveTournamentResult) {
      throw new Error("Save tournament function not initialized");
    }
    return stableFunctionsRef.current.saveTournamentResult(tournamentId, gameResult);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!stableFunctionsRef.current.refreshUser) {
      throw new Error("Refresh user function not initialized");
    }
    return stableFunctionsRef.current.refreshUser();
  }, []);

  // Get cached attempts status
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

  // JWT Authentication method
  const authenticateWithTelegram = useCallback(
    async (initData: string, referralCode?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const authUser = await authenticateUser(initData, referralCode);

        // Конвертируем в формат User для совместимости
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
        setError(error instanceof Error ? error.message : "Authentication failed");
        setIsLoading(false);
        throw error;
      }
    },
    [telegramUser, invalidateAttemptsCache],
  );

  // Sign out method
  const signOut = useCallback(() => {
    signOutUser();
    setIsAuthenticated(false);
    setUser(null);
    setTelegramUserState(null);
    invalidateAttemptsCache();
    setError(null);

    // Очищаем refs
    stableFunctionsRef.current = {
      getAttemptsStatus: null,
      consumeAttemptForGame: null,
      forceRefreshAttempts: null,
      saveGameResult: null,
      saveTournamentResult: null,
      refreshUser: null,
    };

    // Сброс флагов операций
    operationInProgressRef.current = {
      refreshUser: false,
      consumeAttempt: false,
      saveGame: false,
    };
  }, [invalidateAttemptsCache]);

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

  // Achievement notification methods - стабильные
  const showAchievement = useCallback((achievement: AchievementNotificationData) => {
    setCurrentAchievement(achievement);
  }, []);

  const hideAchievement = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  // Helper function to process league achievements - стабильная
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
          (gameResult.levelChanged ? 3000 : 0) + (gameResult.leagueChanged ? 3000 : 0),
        );
      }
    },
    [showAchievement],
  );

  // Cache invalidation on user change - выполняется только при смене пользователя
  useEffect(() => {
    if (telegramUser) {
      invalidateAttemptsCache();
    }
  }, [telegramUser?.id, invalidateAttemptsCache]); // Используем только id для стабильности

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
    // Achievement notifications
    currentAchievement,
    showAchievement,
    hideAchievement,
    // JWT Authentication
    isAuthenticated,
    authenticateWithTelegram,
    signOut,
  };

  return React.createElement(UserContext.Provider, { value: contextValue }, children);
};

export function useUser(): UserContextType {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }

  return context;
}