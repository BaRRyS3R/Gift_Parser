// src/hooks/modules/useGame.ts - Enhanced with session validation

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

// Enhanced game save result interface
export interface GameSaveResult {
  success: boolean;
  leagueChanged?: boolean;
  newLeague?: any;
  levelChanged?: boolean;
  newLevel?: number;
  reward?: any;
  missedRewards?: any[];
  error?: string;
  sessionError?: string; // NEW: Session-specific errors
}

// Enhanced hook state interface
interface GameState {
  isLoading: boolean;
  error: string | null;
  sessionError: string | null; // NEW: Session validation errors
}

/**
 * Enhanced game logic module with session validation
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
   * Save game result with session validation
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
            sessionId, // NEW: Include session ID
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
    sessionError: state.sessionError, // NEW: Session-specific errors

    // Enhanced actions
    saveGameResult, // NEW: With session validation
    saveGameResultLegacy, // Deprecated method

    // Error management
    clearError,
    clearSessionError, // NEW: Clear session errors
    clearAllErrors, // NEW: Clear all errors
    isSessionError,
    getErrorSummary, // NEW: Get comprehensive error info

    // Utility
    hasAnyError: Boolean(state.error || state.sessionError),
    hasSessionError: Boolean(state.sessionError),
    hasGeneralError: Boolean(state.error),
  };
}
