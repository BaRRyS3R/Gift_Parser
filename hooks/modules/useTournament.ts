// src/hooks/modules/useTournament.ts - Tournament management hook module

import { useState, useCallback, useRef } from "react";

import { SurvivalGameResult } from "@/types/game-modes/survival";

// Tournament save response interface
export interface TournamentSaveResponse {
  success: boolean;
  result_id: string;
  total_score: number;
  game_score: number;
  games_played: number;
  previous_total: number;
  error?: string;
}

// Tournament save state interface
interface TournamentSaveState {
  isLoading: boolean;
  error: string | null;
  lastSaveResult: TournamentSaveResponse | null;
}

/**
 * Tournament management hook with centralized tournament saving logic
 * Handles saving tournament results and leaderboard updates
 */
export function useTournament(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<TournamentSaveState>({
    isLoading: false,
    error: null,
    lastSaveResult: null,
  });

  // Track current request to prevent duplicates
  const savingRef = useRef<boolean>(false);

  /**
   * Save tournament game result with automatic retry logic
   */
  const saveTournamentResult = useCallback(
    async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
      maxRetries: number = 3,
    ): Promise<TournamentSaveResponse> => {
      // Prevent duplicate save requests
      if (savingRef.current) {
        console.log("Tournament save already in progress");

        return (
          state.lastSaveResult || {
            success: false,
            result_id: "",
            total_score: 0,
            game_score: 0,
            games_played: 0,
            previous_total: 0,
            error: "Save already in progress",
          }
        );
      }

      savingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let attemptCount = 1;

      const attemptSave = async (): Promise<TournamentSaveResponse> => {
        try {
          console.log(
            `Attempting to save tournament result (attempt ${attemptCount}/${maxRetries}):`,
            {
              tournamentId,
              score: gameResult.score,
              survivalTime: gameResult.survivalTime,
              maxLevelReached: gameResult.maxLevelReached,
            },
          );

          const response = await makeAuthenticatedRequest(
            "/api/tournament/save",
            {
              method: "POST",
              body: JSON.stringify({ tournamentId, gameResult }),
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
            throw new Error(result.error || "Failed to save tournament result");
          }

          const saveResponse: TournamentSaveResponse = result.data;

          setState({
            isLoading: false,
            error: null,
            lastSaveResult: saveResponse,
          });

          console.log("Successfully saved tournament result:", {
            tournamentId,
            resultId: saveResponse.result_id,
            totalScore: saveResponse.total_score,
            gamesPlayed: saveResponse.games_played,
          });

          return saveResponse;
        } catch (error) {
          console.error(
            `Tournament save attempt ${attemptCount} failed:`,
            error,
          );

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
        console.error("All tournament save attempts failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save tournament result";

        setState({
          isLoading: false,
          error: errorMessage,
          lastSaveResult: {
            success: false,
            result_id: "",
            total_score: 0,
            game_score: 0,
            games_played: 0,
            previous_total: 0,
            error: errorMessage,
          },
        });

        return {
          success: false,
          result_id: "",
          total_score: 0,
          game_score: 0,
          games_played: 0,
          previous_total: 0,
          error: errorMessage,
        };
      } finally {
        savingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, state.lastSaveResult],
  );

  /**
   * Save tournament result with custom retry behavior (for UI components)
   */
  const saveTournamentResultWithRetry = useCallback(
    async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
      onRetry?: (attempt: number, maxAttempts: number) => void,
    ): Promise<TournamentSaveResponse> => {
      const maxRetries = 3;
      let attemptCount = 1;

      const attemptSaveWithCallback =
        async (): Promise<TournamentSaveResponse> => {
          if (attemptCount > 1 && onRetry) {
            onRetry(attemptCount, maxRetries);
            // Wait for UI to update
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          try {
            const response = await makeAuthenticatedRequest(
              "/api/tournament/save",
              {
                method: "POST",
                body: JSON.stringify({ tournamentId, gameResult }),
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
              throw new Error(
                result.error || "Failed to save tournament result",
              );
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
   * Reset tournament save state
   */
  const resetTournamentState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastSaveResult: null,
    });
  }, []);

  /**
   * Check if tournament game result is valid for saving
   */
  const isValidTournamentResult = useCallback(
    (gameResult: any): gameResult is SurvivalGameResult => {
      if (!gameResult || typeof gameResult !== "object") {
        return false;
      }

      // Check required fields for survival game result (tournaments only use survival mode)
      return (
        typeof gameResult.score === "number" &&
        typeof gameResult.survivalTime === "number" &&
        typeof gameResult.maxLevelReached === "number" &&
        typeof gameResult.perfectStreak === "number" &&
        typeof gameResult.correctHits === "number" &&
        typeof gameResult.deathCause === "string" &&
        typeof gameResult.duration === "number" &&
        gameResult.score >= 0 &&
        gameResult.survivalTime >= 0 &&
        gameResult.maxLevelReached >= 0 &&
        gameResult.perfectStreak >= 0 &&
        gameResult.correctHits >= 0 &&
        gameResult.duration >= 0
      );
    },
    [],
  );

  /**
   * Validate tournament ID format
   */
  const isValidTournamentId = useCallback(
    (tournamentId: any): tournamentId is string => {
      return typeof tournamentId === "string" && tournamentId.trim() !== "";
    },
    [],
  );

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    lastSaveResult: state.lastSaveResult,

    // Actions
    saveTournamentResult,
    saveTournamentResultWithRetry,
    clearError,
    resetTournamentState,

    // Utility functions
    isValidTournamentResult,
    isValidTournamentId,
    isSaving: savingRef.current,
  };
}
