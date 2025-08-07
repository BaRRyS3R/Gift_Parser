// src/hooks/modules/useGame.ts - Enhanced game logic module with tournament support
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

// Game save result interface
export interface GameSaveResult {
  success: boolean;
  leagueChanged?: boolean;
  newLeague?: any;
  levelChanged?: boolean;
  newLevel?: number;
  reward?: any;
  missedRewards?: any[];
  error?: string;
}

// Hook state interface
interface GameState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced game logic module with tournament support
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
  });

  /**
   * Save regular game result (non-tournament modes)
   */
  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<GameSaveResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

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

        setState((prev) => ({ ...prev, isLoading: false }));

        return result.data;
      } catch (error) {
        console.error("Error saving game result:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save game result";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,

    // Regular game actions
    saveGameResult,
    clearError,
  };
}
