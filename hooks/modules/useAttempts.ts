// src/hooks/modules/useAttempts.ts - Updated with level information support

import { useState, useCallback, useRef } from "react";

// Enhanced attempts status interface
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

// NEW: User level information interface
export interface UserLevelInfo {
  currentLevel: number;
  totalGames: number;
  gamesInCurrentLevel: number;
  gamesToNextLevel: number;
}

// Enhanced state interface
interface AttemptsState {
  status: AttemptsStatus | null;
  userLevel: UserLevelInfo | null; // NEW: Level information
  isLoading: boolean;
  error: string | null;
}

// Level calculation constants
const GAMES_PER_LEVEL = 20;

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
 * Enhanced attempts hook with level information
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
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch attempts status and level information
   */
  const fetchAttemptsStatus = useCallback(
    async (force: boolean = false): Promise<AttemptsStatus | null> => {
      if (fetchingRef.current && !force) {
        return state.status;
      }

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
        });

        return attemptsStatus;
      } catch (error) {
        console.error("Error fetching attempts status:", error);
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
    [makeAuthenticatedRequest, state.status],
  );

  /**
   * Consume an attempt
   */
  const consumeAttempt =
    useCallback(async (): Promise<AttemptsStatus | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await makeAuthenticatedRequest(
          "/api/user/attempts/consume",
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
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
        }));

        return attemptsStatus;
      } catch (error) {
        console.error("Error consuming attempt:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset attempts state
   */
  const resetAttemptsState = useCallback(() => {
    setState({
      status: null,
      userLevel: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    // Enhanced state with level information
    attemptsStatus: state.status,
    userLevel: state.userLevel, // NEW: Level information
    isLoading: state.isLoading,
    error: state.error,

    // Computed values for convenience
    canPlay: state.status?.canPlay ?? false,
    attemptsRemaining: state.status?.attemptsRemaining ?? 0,

    // Actions
    fetchAttemptsStatus,
    consumeAttempt,
    clearError,
    resetAttemptsState,
  };
}
