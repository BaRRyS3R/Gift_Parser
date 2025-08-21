// src/hooks/modules/useAttempts.ts - ОПТИМИЗИРОВАННАЯ версия с кэшированием

import { useState, useCallback, useRef, useEffect } from "react";

// Enhanced attempts status interface
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

// User level information interface
export interface UserLevelInfo {
  currentLevel: number;
  totalGames: number;
  gamesInCurrentLevel: number;
  gamesToNextLevel: number;
}

// Enhanced state interface
interface AttemptsState {
  status: AttemptsStatus | null;
  userLevel: UserLevelInfo | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number; // Timestamp for caching
}

// Level calculation constants
const GAMES_PER_LEVEL = 20;

// ОПТИМИЗАЦИЯ: Кэширование конфигурация
const CACHE_CONFIG = {
  STATUS_CACHE_MS: 30000, // 30 секунд кэш для status
  FAST_CHECK_CACHE_MS: 10000, // 10 секунд для быстрой проверки
  DEBOUNCE_MS: 500, // Debounce для повторных запросов
} as const;

/**
 * Calculate level progress information
 */
function calculateLevelProgress(
  currentLevel: number,
  totalGames: number,
): UserLevelInfo {
  const gamesInCurrentLevel = totalGames % GAMES_PER_LEVEL;
  const gamesToNextLevel = GAMES_PER_LEVEL - gamesInCurrentLevel;

  return {
    currentLevel,
    totalGames,
    gamesInCurrentLevel,
    gamesToNextLevel,
  };
}

/**
 * ОПТИМИЗИРОВАННЫЙ attempts hook с кэшированием и debouncing
 */
export function useAttempts(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<AttemptsState>({
    status: null,
    userLevel: null,
    isLoading: false,
    error: null,
    lastFetch: 0,
  });

  const fetchingRef = useRef<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fastCheckCacheRef = useRef<{ canPlay: boolean; timestamp: number } | null>(null);

  /**
   * НОВЫЙ: Быстрая проверка возможности игры с кэшированием
   * Использует HEAD request для минимального трафика
   */
  const canPlayFast = useCallback(async (): Promise<boolean> => {
    const now = Date.now();

    // Проверяем кэш быстрой проверки
    if (fastCheckCacheRef.current &&
      (now - fastCheckCacheRef.current.timestamp) < CACHE_CONFIG.FAST_CHECK_CACHE_MS) {
      return fastCheckCacheRef.current.canPlay;
    }

    try {
      const response = await makeAuthenticatedRequest("/api/user/attempts/status", {
        method: "HEAD",
      });

      const canPlay = response.status === 200;

      // Обновляем кэш
      fastCheckCacheRef.current = {
        canPlay,
        timestamp: now,
      };

      return canPlay;
    } catch (error) {
      console.warn("Fast can play check failed:", error);
      return false;
    }
  }, [makeAuthenticatedRequest]);

  /**
   * ОПТИМИЗИРОВАННАЯ версия fetch с кэшированием
   */
  const fetchAttemptsStatus = useCallback(
    async (force: boolean = false): Promise<AttemptsStatus | null> => {
      const now = Date.now();

      // ОПТИМИЗАЦИЯ: Проверяем кэш если не force
      if (!force &&
        state.status &&
        state.lastFetch > 0 &&
        (now - state.lastFetch) < CACHE_CONFIG.STATUS_CACHE_MS) {
        return state.status;
      }

      // ОПТИМИЗАЦИЯ: Предотвращаем множественные одновременные запросы
      if (fetchingRef.current && !force) {
        return state.status;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await makeAuthenticatedRequest("/api/user/attempts/status");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch attempts status");
        }

        // Parse attempts status
        const attemptsStatus: AttemptsStatus = {
          canPlay: result.canPlay,
          attemptsRemaining: result.attemptsRemaining,
          resetTime: result.resetTime ? new Date(result.resetTime) : undefined,
          timeUntilReset: result.timeUntilReset,
        };

        // Parse and calculate level information
        let userLevel: UserLevelInfo | null = null;
        if (result.userLevel) {
          userLevel = calculateLevelProgress(
            result.userLevel.currentLevel,
            result.userLevel.totalGames,
          );
        }

        setState({
          status: attemptsStatus,
          userLevel,
          isLoading: false,
          error: null,
          lastFetch: now, // ОПТИМИЗАЦИЯ: Обновляем timestamp кэша
        });

        // Обновляем кэш быстрой проверки
        fastCheckCacheRef.current = {
          canPlay: attemptsStatus.canPlay,
          timestamp: now,
        };

        return attemptsStatus;
      } catch (error) {
        console.error("Error fetching attempts status:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, state.status, state.lastFetch],
  );

  /**
   * ОПТИМИЗИРОВАННАЯ версия consume с debouncing
   */
  const consumeAttempt = useCallback(async (): Promise<AttemptsStatus | null> => {
    // ОПТИМИЗАЦИЯ: Debouncing для предотвращения случайных двойных кликов
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    return new Promise((resolve) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const response = await makeAuthenticatedRequest("/api/user/attempts/consume", {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Failed to consume attempt");
          }

          // Parse updated attempts status
          const attemptsStatus: AttemptsStatus = {
            canPlay: result.canPlay,
            attemptsRemaining: result.attemptsRemaining,
            resetTime: result.resetTime ? new Date(result.resetTime) : undefined,
            timeUntilReset: result.timeUntilReset,
          };

          setState((prev) => ({
            ...prev,
            status: attemptsStatus,
            isLoading: false,
            lastFetch: Date.now(), // Обновляем кэш
          }));

          // Инвалидируем кэш быстрой проверки
          fastCheckCacheRef.current = {
            canPlay: attemptsStatus.canPlay,
            timestamp: Date.now(),
          };

          resolve(attemptsStatus);
        } catch (error) {
          console.error("Error consuming attempt:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));

          resolve(null);
        }
      }, CACHE_CONFIG.DEBOUNCE_MS);
    });
  }, [makeAuthenticatedRequest]);

  /**
   * ОПТИМИЗАЦИЯ: Debounced версия fetch для UI компонентов
   */
  const debouncedFetch = useCallback(
    (force: boolean = false) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        fetchAttemptsStatus(force);
      }, CACHE_CONFIG.DEBOUNCE_MS);
    },
    [fetchAttemptsStatus],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset attempts state и кэш
   */
  const resetAttemptsState = useCallback(() => {
    setState({
      status: null,
      userLevel: null,
      isLoading: false,
      error: null,
      lastFetch: 0,
    });

    // Очищаем кэши
    fastCheckCacheRef.current = null;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  /**
   * ОПТИМИЗАЦИЯ: Cleanup timeouts
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Enhanced state with level information
    attemptsStatus: state.status,
    userLevel: state.userLevel,
    isLoading: state.isLoading,
    error: state.error,

    // Computed values for convenience
    canPlay: state.status?.canPlay ?? false,
    attemptsRemaining: state.status?.attemptsRemaining ?? 0,

    // ОПТИМИЗИРОВАННЫЕ actions
    fetchAttemptsStatus,
    debouncedFetch, // НОВЫЙ: debounced версия
    consumeAttempt,
    canPlayFast, // НОВЫЙ: быстрая проверка
    clearError,
    resetAttemptsState,

    // Utility
    isCacheValid: state.lastFetch > 0 && (Date.now() - state.lastFetch) < CACHE_CONFIG.STATUS_CACHE_MS,
  };
}