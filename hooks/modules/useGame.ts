// src/hooks/modules/useGame.ts - Enhanced with session validation, Best Score tracking and Attempts Status

import { useState, useCallback } from "react";

// Import game result types
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Enhanced game save result interface with Best Score information and Attempts Status
export interface GameSaveResult {
  success: boolean;
  leagueChanged?: boolean;
  newLeague?: any;
  levelChanged?: boolean;
  newLevel?: number;
  reward?: any;
  missedRewards?: any[];
  attemptsAwarded?: number;
  achievementsUnlocked?: Array<{
    id: string;
    name: string;
    attemptsAwarded: number;
  }>;
  totalAttemptsAwarded?: number;
  tournamentInfo?: {
    tournamentId: string;
    tournamentName: string;
    newBestScore: boolean;
    participated: boolean;
  };
  questCompletions?: Array<{
    questId: string;
    completed: boolean;
    attemptsAwarded: number;
  }>;
  questAttemptsAwarded?: number;
  // Best score information for game modes
  bestScoreInfo?: {
    previousBestScore: number;
    currentScore: number;
    newBestScore: number;
    isBestScore: boolean;
    pointsNeeded?: number; // How many points needed to beat the record
  };
  // NEW: Current attempts status after game save
  attemptsStatus?: {
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: string; // ISO string
    timeUntilReset?: number;
  };
  error?: string;
  sessionError?: string; // Session-specific errors
}

// Enhanced hook state interface
interface GameState {
  isLoading: boolean;
  error: string | null;
  sessionError: string | null;
}

/**
 * Enhanced game logic module with session validation, Best Score tracking and Attempts Status
 */
export function useGame(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<GameState>({
    isLoading: false,
    error: null,
    sessionError: null,
  });

  /**
   * Save game result with session validation and get updated attempts status
   */
  const saveGameResult = useCallback(
    async (
      gameResult: GameResult,
      sessionId: string,
    ): Promise<GameSaveResult> => {
      // Validate session ID is provided
      if (!sessionId || typeof sessionId !== "string") {
        const error = "Session ID is required for game result validation";

        setState((prev) => ({
          ...prev,
          sessionError: error,
        }));
        throw new Error(error);
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        sessionError: null,
      }));

      try {
        const response = await makeAuthenticatedRequest("/api/game/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameResult,
            sessionId, // Include session ID
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Handle session-specific errors
          if (errorData.sessionError) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              sessionError: errorData.sessionError,
            }));
            throw new Error(errorData.sessionError);
          }

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          // Handle session-specific errors in response
          if (result.sessionError) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              sessionError: result.sessionError,
            }));
            throw new Error(result.sessionError);
          }

          throw new Error(result.error || "Failed to save game result");
        }

        setState((prev) => ({ ...prev, isLoading: false }));

        return result.data;
      } catch (error) {
        console.error("Error saving game result:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save game result";

        // Distinguish between session errors and general errors
        const isSessionError =
          errorMessage.includes("session") ||
          errorMessage.includes("Session") ||
          errorMessage.includes("expired") ||
          errorMessage.includes("invalid");

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: isSessionError ? null : errorMessage,
          sessionError: isSessionError ? errorMessage : null,
        }));

        throw error;
      }
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Legacy method for backwards compatibility (will be deprecated)
   */
  const saveGameResultLegacy = useCallback(
    async (gameResult: GameResult): Promise<GameSaveResult> => {
      console.warn(
        "saveGameResultLegacy is deprecated. Use saveGameResult with sessionId instead.",
      );

      // This should not be used anymore, but for safety we'll throw an error
      throw new Error(
        "Session validation is required. Please use the updated game flow.",
      );
    },
    [],
  );

  /**
   * Check if error is session-related
   */
  const isSessionError = useCallback((error: string): boolean => {
    const sessionKeywords = [
      "session",
      "expired",
      "invalid session",
      "Session",
    ];

    return sessionKeywords.some((keyword) =>
      error.toLowerCase().includes(keyword.toLowerCase()),
    );
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear session error state
   */
  const clearSessionError = useCallback(() => {
    setState((prev) => ({ ...prev, sessionError: null }));
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, sessionError: null }));
  }, []);

  /**
   * Get error summary
   */
  const getErrorSummary = useCallback(() => {
    const { error, sessionError } = state;

    if (sessionError) {
      return {
        hasError: true,
        errorType: "session" as const,
        message: sessionError,
        isRecoverable: false, // Session errors usually require restarting the game
      };
    }

    if (error) {
      return {
        hasError: true,
        errorType: "general" as const,
        message: error,
        isRecoverable: true, // General errors might be retryable
      };
    }

    return {
      hasError: false,
      errorType: null,
      message: null,
      isRecoverable: false,
    };
  }, [state.error, state.sessionError]);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    sessionError: state.sessionError,

    // Enhanced actions
    saveGameResult, // With session validation, Best Score tracking and Attempts Status
    saveGameResultLegacy, // Deprecated method

    // Error management
    clearError,
    clearSessionError,
    clearAllErrors,
    isSessionError,
    getErrorSummary,

    // Utility
    hasAnyError: Boolean(state.error || state.sessionError),
    hasSessionError: Boolean(state.sessionError),
    hasGeneralError: Boolean(state.error),
  };
}