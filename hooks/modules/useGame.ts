// src/hooks/modules/useGame.ts - Enhanced game logic module with tournament support

import type { TournamentGameResult } from "@/types/tournaments";

import { useState, useCallback } from "react";

// Import game result types
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";

// Tournament types
export interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
  sponsor_name?: string;
  sponsor_channel_url?: string;
  sponsor_image_url?: string;
}

export interface TournamentWithStatus extends Tournament {
  status: "upcoming" | "active" | "completed";
  participants_count?: number;
  time_until_start?: number;
  time_until_end?: number;
}

export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  survival_time: number;
  survival_score: number;
  last_game_score: number;
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  created_at: string;
  rank: number;
}

export interface TournamentResult {
  id?: string;
  tournament_id: string;
  user_id: string;
  survival_time: number;
  survival_score: number;
  last_game_score: number;
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  rank?: number;
  created_at?: string;
}

export interface TournamentListResponse {
  active: TournamentWithStatus[];
  upcoming: TournamentWithStatus[];
  completed: TournamentWithStatus[];
}

export interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number;
  hasStarted?: boolean;
}

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult
  | TournamentGameResult;

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

// Tournament save response interface
export interface TournamentSaveResponse {
  result_id: string;
  total_score: number;
  game_score: number;
  games_played: number;
  previous_total: number;
}

// Hook state interface
interface GameState {
  isLoading: boolean;
  error: string | null;
  tournaments: TournamentListResponse | null;
  activeTournament: Tournament | null;
  tournamentStatus: TournamentStatus | null;
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
    tournaments: null,
    activeTournament: null,
    tournamentStatus: null,
  });

  /**
   * Save regular game result (non-tournament modes)
   */
  const saveGameResult = useCallback(
    async (gameResult: GameResult): Promise<GameSaveResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Saving game result:", {
          mode: gameResult.mode,
          score: gameResult.score,
          duration: gameResult.duration,
        });

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

        console.log("Game result saved successfully:", {
          leagueChanged: result.data.leagueChanged,
          levelChanged: result.data.levelChanged,
          hasReward: !!result.data.reward,
        });

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
   * Save tournament game result with point accumulation
   */
  const saveTournamentResult = useCallback(
    async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Saving tournament result:", {
          tournamentId,
          score: gameResult.score,
          survivalTime: gameResult.survivalTime,
        });

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

        setState((prev) => ({ ...prev, isLoading: false }));

        console.log("Tournament result saved successfully:", {
          gameScore: result.data.game_score,
          totalScore: result.data.total_score,
        });

        return result.data;
      } catch (error) {
        console.error("Error saving tournament result:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save tournament result";

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
   * Get active tournament status
   */
  const getActiveTournament =
    useCallback(async (): Promise<TournamentStatus> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Fetching active tournament...");

        const response = await makeAuthenticatedRequest(
          "/api/tournament/active",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch active tournament");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          tournamentStatus: result.data,
          activeTournament: result.data.activeTournament,
        }));

        console.log("Active tournament fetched:", {
          isActive: result.data.isActive,
          tournamentName: result.data.activeTournament?.name,
        });

        return result.data;
      } catch (error) {
        console.error("Error fetching active tournament:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch active tournament";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Get all tournaments categorized by status
   */
  const getAllTournaments =
    useCallback(async (): Promise<TournamentListResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Fetching tournament list...");

        const response = await makeAuthenticatedRequest("/api/tournament/list");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch tournament list");
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          tournaments: result.data,
        }));

        console.log("Tournament list fetched:", {
          active: result.data.active.length,
          upcoming: result.data.upcoming.length,
          completed: result.data.completed.length,
        });

        return result.data;
      } catch (error) {
        console.error("Error fetching tournament list:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament list";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Get tournament leaderboard
   */
  const getTournamentLeaderboard = useCallback(
    async (
      tournamentId: string,
      limit: number = 100,
    ): Promise<TournamentLeaderboardEntry[]> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log(`Fetching leaderboard for tournament ${tournamentId}...`);

        const response = await makeAuthenticatedRequest(
          "/api/tournament/leaderboard",
          {
            method: "POST",
            body: JSON.stringify({ tournamentId, limit }),
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
            result.error || "Failed to fetch tournament leaderboard",
          );
        }

        setState((prev) => ({ ...prev, isLoading: false }));

        console.log(`Tournament leaderboard fetched for ${tournamentId}:`, {
          entries: result.data.length,
        });

        return result.data;
      } catch (error) {
        console.error("Error fetching tournament leaderboard:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament leaderboard";

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
   * Get tournament winners
   */
  const getTournamentWinners = useCallback(
    async (
      tournamentId: string,
      prizeCount: number,
    ): Promise<TournamentLeaderboardEntry[]> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log(`Fetching winners for tournament ${tournamentId}...`);

        const response = await makeAuthenticatedRequest(
          "/api/tournament/winners",
          {
            method: "POST",
            body: JSON.stringify({ tournamentId, prizeCount }),
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
          throw new Error(result.error || "Failed to fetch tournament winners");
        }

        setState((prev) => ({ ...prev, isLoading: false }));

        console.log(`Tournament winners fetched for ${tournamentId}:`, {
          winners: result.data.length,
        });

        return result.data;
      } catch (error) {
        console.error("Error fetching tournament winners:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament winners";

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
   * Get user result in tournament
   */
  const getUserTournamentResult = useCallback(
    async (tournamentId: string): Promise<TournamentResult | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log(`Fetching user result for tournament ${tournamentId}...`);

        const response = await makeAuthenticatedRequest(
          "/api/tournament/user-result",
          {
            method: "POST",
            body: JSON.stringify({ tournamentId }),
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
            result.error || "Failed to fetch user tournament result",
          );
        }

        setState((prev) => ({ ...prev, isLoading: false }));

        console.log(`User tournament result fetched for ${tournamentId}:`, {
          hasResult: !!result.data,
          score: result.data?.survival_score,
        });

        return result.data;
      } catch (error) {
        console.error("Error fetching user tournament result:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch user tournament result";

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
   * Reset tournament state
   */
  const resetTournamentState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tournaments: null,
      activeTournament: null,
      tournamentStatus: null,
      error: null,
    }));
  }, []);

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
    tournaments: state.tournaments,
    activeTournament: state.activeTournament,
    tournamentStatus: state.tournamentStatus,

    // Regular game actions
    saveGameResult,
    clearError,

    // Tournament actions
    saveTournamentResult,
    getActiveTournament,
    getAllTournaments,
    getTournamentLeaderboard,
    getTournamentWinners,
    getUserTournamentResult,
    resetTournamentState,
  };
}
