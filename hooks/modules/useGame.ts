// src/hooks/modules/useGame.ts - Game management hook module

import { useState, useCallback, useRef } from "react";

import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

// Game result union type
export type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Game save response interface
export interface GameSaveResponse {
  success: boolean;
  leagueChanged?: boolean;
  newLeague?: any; // League type from leagues service
  levelChanged?: boolean;
  newLevel?: number;
  reward?: any; // Reward type from leagues service
  missedRewards?: any[]; // Rewards array from leagues service
  error?: string;
}

// Game save state interface
interface GameSaveState {
  isLoading: boolean;
  error: string | null;
  lastSaveResult: GameSaveResponse | null;
}

/**
 * Game management hook with centralized game saving logic
 * Handles saving game results and achievement processing
 */
export function useGame(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<GameSaveState>({
    isLoading: false,
    error: null,
    lastSaveResult: null,
  });

  // Track current request to prevent duplicates
  const savingRef = useRef<boolean>(false);

  /**
   * Save game result with automatic retry logic
   */
  const saveGameResult = useCallback(
    async (
      gameResult: GameResult,
      maxRetries: number = 3,
    ): Promise<GameSaveResponse> => {
      // Prevent duplicate save requests
      if (savingRef.current) {
        console.log("Game save already in progress");

        return (
          state.lastSaveResult || {
            success: false,
            error: "Save already in progress",
          }
        );
      }

      savingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let attemptCount = 1;

      const attemptSave = async (): Promise<GameSaveResponse> => {
        try {
          console.log(
            `Attempting to save game result (attempt ${attemptCount}/${maxRetries}):`,
            {
              mode: gameResult.mode,
              score: gameResult.score,
              duration: gameResult.duration,
            },
          );

          const response = await makeAuthenticatedRequest("/api/game/save", {
            method: "POST",
            body: JSON.stringify({ gameResult }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
              errorData.error || `Server error: ${response.status}`,
            );
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Failed to save game result");
          }

          const saveResponse: GameSaveResponse = result.data;

          setState({
            isLoading: false,
            error: null,
            lastSaveResult: saveResponse,
          });

          console.log("Successfully saved game result:", {
            leagueChanged: saveResponse.leagueChanged,
            levelChanged: saveResponse.levelChanged,
            hasReward: !!saveResponse.reward,
            hasMissedRewards: !!(
              saveResponse.missedRewards &&
              saveResponse.missedRewards.length > 0
            ),
          });

          return saveResponse;
        } catch (error) {
          console.error(`Game save attempt ${attemptCount} failed:`, error);

          if (attemptCount < maxRetries) {
            attemptCount++;
            // Wait before retry (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attemptCount - 1) * 1000),
            );

            return attemptSave();
          } else {
            throw error;
          }
        }
      };

      try {
        const result = await attemptSave();

        return result;
      } catch (error) {
        console.error("All game save attempts failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save game result";

        setState({
          isLoading: false,
          error: errorMessage,
          lastSaveResult: { success: false, error: errorMessage },
        });

        return { success: false, error: errorMessage };
      } finally {
        savingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, state.lastSaveResult],
  );

  /**
   * Save game result with custom retry behavior (for UI components)
   */
  const saveGameResultWithRetry = useCallback(
    async (
      gameResult: GameResult,
      onRetry?: (attempt: number, maxAttempts: number) => void,
    ): Promise<GameSaveResponse> => {
      const maxRetries = 3;
      let attemptCount = 1;

      const attemptSaveWithCallback = async (): Promise<GameSaveResponse> => {
        if (attemptCount > 1 && onRetry) {
          onRetry(attemptCount, maxRetries);
          // Wait for UI to update
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          const response = await makeAuthenticatedRequest("/api/game/save", {
            method: "POST",
            body: JSON.stringify({ gameResult }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
              errorData.error || `Server error: ${response.status}`,
            );
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Failed to save game result");
          }

          return result.data;
        } catch (error) {
          if (attemptCount < maxRetries) {
            attemptCount++;
            await new Promise((resolve) => setTimeout(resolve, 1500));

            return attemptSaveWithCallback();
          } else {
            throw error;
          }
        }
      };

      return attemptSaveWithCallback();
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset game save state
   */
  const resetGameState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastSaveResult: null,
    });
  }, []);

  /**
   * Check if game result is valid for saving
   */
  const isValidGameResult = useCallback(
    (gameResult: any): gameResult is GameResult => {
      if (!gameResult || typeof gameResult !== "object") {
        return false;
      }

      // Check required fields
      return (
        typeof gameResult.mode === "string" &&
        typeof gameResult.score === "number" &&
        typeof gameResult.duration === "number" &&
        gameResult.score >= 0 &&
        gameResult.duration >= 0
      );
    },
    [],
  );

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    lastSaveResult: state.lastSaveResult,

    // Actions
    saveGameResult,
    saveGameResultWithRetry,
    clearError,
    resetGameState,

    // Utility functions
    isValidGameResult,
    isSaving: savingRef.current,
  };
}
