// src/hooks/modules/useAttempts.ts - Enhanced with better validation and cache synchronization

import { useState, useCallback, useRef, useEffect } from "react";

import { GameMode } from "@/types/game-modes/common";

// Enhanced attempts status interface with session data
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
  sessionToken?: string;
  // Session data
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
  // Session state
  currentSessionId: string | null;
  currentGameMode: GameMode | null;
}

// Level calculation constants
const GAMES_PER_LEVEL = 20;

// UPDATED: Enhanced caching configuration with more aggressive validation
const CACHE_CONFIG = {
  STATUS_CACHE_MS: 15000, // Reduced from 30s to 15s for better sync
  FAST_CHECK_CACHE_MS: 5000, // Reduced from 10s to 5s
  DEBOUNCE_MS: 300, // Reduced debounce time
  PRE_VALIDATE_CACHE_MS: 2000, // NEW: Very short cache for pre-validation
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
 * Enhanced attempts hook with improved validation and cache management
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
  const fastCheckCacheRef = useRef<{
    canPlay: boolean;
    timestamp: number;
  } | null>(null);
  
  // NEW: Pre-validation cache for play again scenarios
  const preValidateCacheRef = useRef<{
    canPlay: boolean;
    attemptsRemaining: number;
    timestamp: number;
  } | null>(null);

  /**
   * UPDATED: Enhanced cache update from game save with validation
   */
  const updateAttemptsFromGameSave = useCallback((attemptsFromGameSave: {
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: string;
    timeUntilReset?: number;
  }) => {
    console.log("[ATTEMPTS] Updating attempts from game save result:", attemptsFromGameSave);

    const now = Date.now();
    
    // Parse attempts status from game save
    const updatedStatus: AttemptsStatus = {
      canPlay: attemptsFromGameSave.canPlay,
      attemptsRemaining: attemptsFromGameSave.attemptsRemaining,
      resetTime: attemptsFromGameSave.resetTime ? new Date(attemptsFromGameSave.resetTime) : undefined,
      timeUntilReset: attemptsFromGameSave.timeUntilReset,
    };

    // Update state with fresh data from game save
    setState((prev) => ({
      ...prev,
      status: updatedStatus,
      lastFetch: now, // Mark as freshly fetched
      error: null, // Clear any previous errors
    }));

    // Update all caches with fresh data
    fastCheckCacheRef.current = {
      canPlay: updatedStatus.canPlay,
      timestamp: now,
    };

    preValidateCacheRef.current = {
      canPlay: updatedStatus.canPlay,
      attemptsRemaining: updatedStatus.attemptsRemaining,
      timestamp: now,
    };

    console.log("[ATTEMPTS] All caches updated with fresh data from game save:", {
      canPlay: updatedStatus.canPlay,
      attemptsRemaining: updatedStatus.attemptsRemaining,
    });
  }, []);

  /**
   * UPDATED: Enhanced fast check with better logging
   */
  const canPlayFast = useCallback(async (): Promise<boolean> => {
    const now = Date.now();

    // Check fast cache first
    if (
      fastCheckCacheRef.current &&
      now - fastCheckCacheRef.current.timestamp < CACHE_CONFIG.FAST_CHECK_CACHE_MS
    ) {
      console.log("[ATTEMPTS] Fast check - using cache:", fastCheckCacheRef.current.canPlay);
      return fastCheckCacheRef.current.canPlay;
    }

    console.log("[ATTEMPTS] Fast check - cache expired, making API call");

    try {
      const response = await makeAuthenticatedRequest(
        "/api/user/attempts/status",
        {
          method: "HEAD",
        },
      );

      const canPlay = response.status === 200;
      console.log("[ATTEMPTS] Fast check - API result:", canPlay);

      // Update cache
      fastCheckCacheRef.current = {
        canPlay,
        timestamp: now,
      };

      return canPlay;
    } catch (error) {
      console.warn("[ATTEMPTS] Fast can play check failed:", error);
      return false;
    }
  }, [makeAuthenticatedRequest]);

  /**
   * NEW: Pre-validation for play again scenarios
   */
  const preValidateCanPlay = useCallback(async (): Promise<{
    canPlay: boolean;
    attemptsRemaining: number;
    cached: boolean;
  }> => {
    const now = Date.now();

    // Check pre-validation cache (very short lived)
    if (
      preValidateCacheRef.current &&
      now - preValidateCacheRef.current.timestamp < CACHE_CONFIG.PRE_VALIDATE_CACHE_MS
    ) {
      console.log("[ATTEMPTS] Pre-validation - using cache:", preValidateCacheRef.current);
      return {
        canPlay: preValidateCacheRef.current.canPlay,
        attemptsRemaining: preValidateCacheRef.current.attemptsRemaining,
        cached: true,
      };
    }

    console.log("[ATTEMPTS] Pre-validation - fetching fresh data");

    try {
      const response = await makeAuthenticatedRequest("/api/user/attempts/status");

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();

      const canPlay = result.success && result.canPlay;
      const attemptsRemaining = result.attemptsRemaining || 0;

      // Update pre-validation cache
      preValidateCacheRef.current = {
        canPlay,
        attemptsRemaining,
        timestamp: now,
      };

      console.log("[ATTEMPTS] Pre-validation - fresh result:", {
        canPlay,
        attemptsRemaining,
      });

      return {
        canPlay,
        attemptsRemaining,
        cached: false,
      };
    } catch (error) {
      console.error("[ATTEMPTS] Pre-validation failed:", error);
      return {
        canPlay: false,
        attemptsRemaining: 0,
        cached: false,
      };
    }
  }, [makeAuthenticatedRequest]);

  /**
   * Fetch attempts status with enhanced caching
   */
  const fetchAttemptsStatus = useCallback(
    async (force: boolean = false): Promise<AttemptsStatus | null> => {
      const now = Date.now();

      // Check cache if not forced
      if (
        !force &&
        state.status &&
        state.lastFetch > 0 &&
        now - state.lastFetch < CACHE_CONFIG.STATUS_CACHE_MS
      ) {
        console.log("[ATTEMPTS] Fetch status - using cache");
        return state.status;
      }

      // Prevent multiple simultaneous requests
      if (fetchingRef.current && !force) {
        console.log("[ATTEMPTS] Fetch status - already fetching");
        return state.status;
      }

      console.log("[ATTEMPTS] Fetch status - making API call (force:", force, ")");

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await makeAuthenticatedRequest(
          "/api/user/attempts/status",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
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

        // Update all caches
        fastCheckCacheRef.current = {
          canPlay: attemptsStatus.canPlay,
          timestamp: now,
        };

        preValidateCacheRef.current = {
          canPlay: attemptsStatus.canPlay,
          attemptsRemaining: attemptsStatus.attemptsRemaining,
          timestamp: now,
        };

        console.log("[ATTEMPTS] Fetch status - success:", attemptsStatus);

        return attemptsStatus;
      } catch (error) {
        console.error("[ATTEMPTS] Error fetching attempts status:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

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
    [
      makeAuthenticatedRequest,
      state.status,
      state.lastFetch,
      state.currentSessionId,
      state.currentGameMode,
    ],
  );

  /**
   * UPDATED: Enhanced consume attempt with better error handling
   */
  const consumeAttemptWithSession = useCallback(
    async (gameMode: GameMode): Promise<AttemptsStatus | null> => {
      // Debouncing for accidental double clicks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      return new Promise((resolve) => {
        debounceTimeoutRef.current = setTimeout(async () => {
          console.log("[ATTEMPTS] Consuming attempt for game mode:", gameMode);
          
          setState((prev) => ({ ...prev, isLoading: true, error: null }));

          try {
            const response = await makeAuthenticatedRequest(
              "/api/user/attempts/consume",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameMode }),
              },
            );

            console.log("[ATTEMPTS] Consume response status:", response.status);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("[ATTEMPTS] Consume failed - response data:", errorData);

              // Specific handling for 423 Locked status
              if (response.status === 423) {
                // Clear all caches on 423 error to force fresh fetch
                fastCheckCacheRef.current = null;
                preValidateCacheRef.current = null;
                
                console.log("[ATTEMPTS] 423 Locked - cleared all caches");
              }

              throw new Error(
                errorData.error || `Server error: ${response.status}`,
              );
            }

            const result = await response.json();
            console.log("[ATTEMPTS] Consume success - result:", result);

            if (!result.success) {
              throw new Error(result.error || "Failed to consume attempt");
            }

            // Parse updated attempts status with session data
            const attemptsStatus: AttemptsStatus = {
              canPlay: result.canPlay,
              attemptsRemaining: result.attemptsRemaining,
              resetTime: result.resetTime
                ? new Date(result.resetTime)
                : undefined,
              timeUntilReset: result.timeUntilReset,
              sessionId: result.sessionId,
              sessionExpiresAt: result.sessionExpiresAt
                ? new Date(result.sessionExpiresAt)
                : undefined,
            };

            setState((prev) => ({
              ...prev,
              status: attemptsStatus,
              isLoading: false,
              lastFetch: Date.now(),
              currentSessionId: result.sessionId || null,
              currentGameMode: gameMode,
            }));

            // Update caches with new data
            const now = Date.now();
            fastCheckCacheRef.current = {
              canPlay: attemptsStatus.canPlay,
              timestamp: now,
            };

            preValidateCacheRef.current = {
              canPlay: attemptsStatus.canPlay,
              attemptsRemaining: attemptsStatus.attemptsRemaining,
              timestamp: now,
            };

            console.log("[ATTEMPTS] Consume complete - updated caches");

            resolve(attemptsStatus);
          } catch (error) {
            console.error("[ATTEMPTS] Error consuming attempt:", error);
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

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
   * UPDATED: Enhanced reset with cache clearing
   */
  const resetAttemptsState = useCallback(() => {
    console.log("[ATTEMPTS] Resetting all attempts state and caches");
    
    setState({
      status: null,
      userLevel: null,
      isLoading: false,
      error: null,
      lastFetch: 0,
      currentSessionId: null,
      currentGameMode: null,
    });

    // Clear all caches
    fastCheckCacheRef.current = null;
    preValidateCacheRef.current = null;

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

    // Main actions
    fetchAttemptsStatus,
    debouncedFetch,
    consumeAttemptWithSession, // Primary method for consuming attempts
    canPlayFast,
    preValidateCanPlay, // NEW: Enhanced pre-validation
    clearError,
    resetAttemptsState,

    // Cache management
    updateAttemptsFromGameSave, // Update cache with data from game save

    // Session management
    getCurrentSession,
    clearSession,
    currentSessionId: state.currentSessionId,
    currentGameMode: state.currentGameMode,

    // Utility
    isCacheValid:
      state.lastFetch > 0 &&
      Date.now() - state.lastFetch < CACHE_CONFIG.STATUS_CACHE_MS,
  };
}