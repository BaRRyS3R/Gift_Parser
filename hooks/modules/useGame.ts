// src/hooks/modules/useGame.ts - Enhanced game logic module with performance logging
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
 * Client-side performance logger
 */
class ClientPerformanceLogger {
  private startTime: number;
  private lastCheckpoint: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    this.lastCheckpoint = this.startTime;
    console.log(`[Client] 🚀 Started: ${operation}`);
  }

  checkpoint(step: string, data?: any) {
    const now = Date.now();
    const stepTime = now - this.lastCheckpoint;
    const totalTime = now - this.startTime;
    
    console.log(`[Client] ⏱️  ${this.operation} -> ${step}: ${stepTime}ms (Total: ${totalTime}ms)`, data ? data : '');
    this.lastCheckpoint = now;
  }

  finish(result?: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[Client] ✅ Completed: ${this.operation} in ${totalTime}ms`, result ? { success: result.success } : '');
  }

  error(error: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[Client] ❌ Failed: ${this.operation} after ${totalTime}ms`, error.message || error);
  }
}

/**
 * Enhanced game logic module with tournament support and performance logging
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
   * Save regular game result (non-tournament modes) with comprehensive logging
   */
  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<GameSaveResult> => {
      const logger = new ClientPerformanceLogger(`saveGameResult(mode: ${gameResult.mode}, score: ${gameResult.score})`);

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      logger.checkpoint("State updated - loading started");

      try {
        // Prepare request body
        logger.checkpoint("Preparing request body");
        const requestBody = JSON.stringify({ gameResult });
        const bodySize = new Blob([requestBody]).size;
        logger.checkpoint("Request body prepared", { bodySize: `${bodySize} bytes` });

        // Make authenticated request
        logger.checkpoint("Making authenticated request to /api/game/save");
        const requestStart = Date.now();
        
        const response = await makeAuthenticatedRequest("/api/game/save", {
          method: "POST",
          body: requestBody,
        });

        const requestTime = Date.now() - requestStart;
        logger.checkpoint("Request completed", { 
          requestTime: `${requestTime}ms`, 
          status: response.status,
          ok: response.ok 
        });

        if (!response.ok) {
          logger.checkpoint("Response not ok, parsing error");
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Server error: ${response.status}`;
          
          logger.error(new Error(errorMessage));
          throw new Error(errorMessage);
        }

        // Parse response
        logger.checkpoint("Parsing response JSON");
        const parseStart = Date.now();
        const result = await response.json();
        const parseTime = Date.now() - parseStart;
        
        logger.checkpoint("Response parsed", { 
          parseTime: `${parseTime}ms`,
          success: result.success,
          hasData: !!result.data
        });

        if (!result.success) {
          const errorMessage = result.error || "Failed to save game result";
          logger.error(new Error(errorMessage));
          throw new Error(errorMessage);
        }

        logger.checkpoint("Processing result data", {
          levelChanged: result.data?.levelChanged,
          newLevel: result.data?.newLevel,
          attemptsAwarded: result.data?.attemptsAwarded,
          achievementsUnlocked: result.data?.achievementsUnlocked?.length || 0,
          questCompletions: result.data?.questCompletions?.length || 0,
          tournamentInfo: !!result.data?.tournamentInfo
        });

        setState((prev) => ({ ...prev, isLoading: false }));
        logger.checkpoint("State updated - loading finished");

        logger.finish(result.data);
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

        logger.error(error);
        throw error;
      }
    },
    [makeAuthenticatedRequest],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    console.log(`[Client] 🧹 Clearing error state`);
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Log hook initialization
  console.log(`[Client] 🔧 useGame hook initialized`);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,

    // Regular game actions
    saveGameResult,
    clearError,
  };
}