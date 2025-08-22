// src/hooks/modules/useAttempts.ts - Updated with game session support

import { useState, useCallback, useRef, useEffect } from "react";
import { GameMode } from "@/types/game-modes/common";

// Enhanced attempts status interface with session data
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
  sessionToken?: string;
  // NEW: Session data
  sessionId?: string;
  sessionExpiresAt?: Date;
}

// User level information interface
export interface UserLevelInfo {
  currentLevel: number;
  totalGames: number;
  gamesInCurrentLevel: number;
  gamesToNextLevel: number;
}

// Enhanced state interface with session management
interface AttemptsState {
  status: AttemptsStatus | null;
  userLevel: UserLevelInfo | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number; // Timestamp for caching
  // NEW: Session state
  currentSessionId: string | null;
  currentGameMode: GameMode | null;
}

// Level calculation constants
const GAMES_PER_LEVEL = 20;

// Caching configuration
const CACHE_CONFIG = {
  STATUS_CACHE_MS: 30000, // 30 seconds cache for status
  FAST_CHECK_CACHE_MS: 10000, // 10 seconds for fast check
  DEBOUNCE_MS: 500, // Debounce for repeated requests
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
 * Enhanced attempts hook with session management
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
    currentSessionId: null,
    currentGameMode: null,
  });

  const fetchingRef = useRef<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fastCheckCacheRef = useRef<{ canPlay: boolean; timestamp: number } | null>(null);

  /**
   * Fast check if user can play (cached)
   */
  const canPlayFast = useCallback(async (): Promise<boolean> => {
    const now = Date.now();

    // Check fast cache
    if (fastCheckCacheRef.current &&
      (now - fastCheckCacheRef.current.timestamp) < CACHE_CONFIG.FAST_CHECK_CACHE_MS) {
      return fastCheckCacheRef.current.canPlay;
    }

    try {
      const response = await makeAuthenticatedRequest("/api/user/attempts/status", {
        method: "HEAD",
      });

      const canPlay = response.status === 200;

      // Update cache
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
   * Fetch attempts status (cached)
   */
  const fetchAttemptsStatus = useCallback(
    async (force: boolean = false): Promise<AttemptsStatus | null> => {
      const now = Date.now();

      // Check cache if not forced
      if (!force &&
        state.status &&
        state.lastFetch > 0 &&
        (now - state.lastFetch) < CACHE_CONFIG.STATUS_CACHE_MS) {
        return state.status;
      }

      // Prevent multiple simultaneous requests
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

        // Parse level information
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
          lastFetch: now,
          currentSessionId: state.currentSessionId,
          currentGameMode: state.currentGameMode,
        });

        // Update fast check cache
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
    [makeAuthenticatedRequest, state.status, state.lastFetch, state.currentSessionId, state.currentGameMode],
  );

  /**
   * NEW: Consume attempt with game mode and session creation
   */
  const consumeAttemptWithSession = useCallback(
    async (gameMode: GameMode): Promise<AttemptsStatus | null> => {
      // Debouncing for accidental double clicks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      return new Promise((resolve) => {
        debounceTimeoutRef.current = setTimeout(async () => {
          setState((prev) => ({ ...prev, isLoading: true, error: null }));

          try {
            const response = await makeAuthenticatedRequest("/api/user/attempts/consume", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ gameMode }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || "Failed to consume attempt");
            }

            // Parse updated attempts status with session data
            const attemptsStatus: AttemptsStatus = {
              canPlay: result.canPlay,
              attemptsRemaining: result.attemptsRemaining,
              resetTime: result.resetTime ? new Date(result.resetTime) : undefined,
              timeUntilReset: result.timeUntilReset,
              sessionId: result.sessionId,
              sessionExpiresAt: result.sessionExpiresAt ? new Date(result.sessionExpiresAt) : undefined,
            };

            setState((prev) => ({
              ...prev,
              status: attemptsStatus,
              isLoading: false,
              lastFetch: Date.now(),
              currentSessionId: result.sessionId || null,
              currentGameMode: gameMode,
            }));

            // Invalidate fast check cache
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
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Legacy method for backwards compatibility
   */
  const consumeAttempt = useCallback(async (): Promise<AttemptsStatus | null> => {
    // Default to survival mode for backwards compatibility
    return consumeAttemptWithSession(GameMode.SURVIVAL);
  }, [consumeAttemptWithSession]);

  /**
   * Clear current session
   */
  const clearSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSessionId: null,
      currentGameMode: null,
    }));
  }, []);

  /**
   * Get current session info
   */
  const getCurrentSession = useCallback(() => {
    return {
      sessionId: state.currentSessionId,
      gameMode: state.currentGameMode,
      isActive: Boolean(state.currentSessionId),
    };
  }, [state.currentSessionId, state.currentGameMode]);

  /**
   * Debounced fetch for UI components
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
   * Reset attempts state and session
   */
  const resetAttemptsState = useCallback(() => {
    setState({
      status: null,
      userLevel: null,
      isLoading: false,
      error: null,
      lastFetch: 0,
      currentSessionId: null,
      currentGameMode: null,
    });

    // Clear caches
    fastCheckCacheRef.current = null;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  /**
   * Cleanup timeouts on unmount
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

    // Enhanced actions with session support
    fetchAttemptsStatus,
    debouncedFetch,
    consumeAttempt, // Legacy method
    consumeAttemptWithSession, // NEW: Enhanced method with game mode
    canPlayFast,
    clearError,
    resetAttemptsState,

    // NEW: Session management
    getCurrentSession,
    clearSession,
    currentSessionId: state.currentSessionId,
    currentGameMode: state.currentGameMode,

    // Utility
    isCacheValid: state.lastFetch > 0 && (Date.now() - state.lastFetch) < CACHE_CONFIG.STATUS_CACHE_MS,
  };
}