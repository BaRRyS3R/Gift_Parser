// src/hooks/useTournament.ts - React hook for tournament operations

"use client";

import type {
  Tournament,
  TournamentLeaderboardEntry,
  TournamentResult,
  TournamentStatus,
  TournamentListResponse,
  TournamentSaveResponse,
} from "@/types/tournaments";

import { useState, useEffect, useCallback, useRef } from "react";

import { authService } from "@/lib/authService";
import { SurvivalGameResult } from "@/types/game-modes/survival";

export interface TournamentState {
  isLoading: boolean;
  error: string | null;
  activeTournament: Tournament | null;
  tournamentStatus: TournamentStatus | null;
  leaderboard: TournamentLeaderboardEntry[];
  userResult: TournamentResult | null;
  allTournaments: TournamentListResponse;
}

interface TournamentHookReturn {
  // State
  state: TournamentState;

  // Actions
  loadActiveTournament: () => Promise<Tournament | null>;
  loadTournamentStatus: () => Promise<TournamentStatus>;
  loadLeaderboard: (
    tournamentId: string,
    limit?: number,
  ) => Promise<TournamentLeaderboardEntry[]>;
  loadUserResult: (tournamentId: string) => Promise<TournamentResult | null>;
  loadAllTournaments: () => Promise<TournamentListResponse>;
  saveTournamentResult: (
    tournamentId: string,
    gameResult: SurvivalGameResult,
  ) => Promise<TournamentSaveResponse>;
  getTournamentWinners: (
    tournamentId: string,
    prizeCount: number,
  ) => Promise<TournamentLeaderboardEntry[]>;

  // Utils
  refreshAll: () => Promise<void>;
  clearError: () => void;
  isUserAuthenticated: () => boolean;
}

const initialState: TournamentState = {
  isLoading: false,
  error: null,
  activeTournament: null,
  tournamentStatus: null,
  leaderboard: [],
  userResult: null,
  allTournaments: {
    active: [],
    upcoming: [],
    completed: [],
  },
};

export function useTournament(): TournamentHookReturn {
  const [state, setState] = useState<TournamentState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Error handler
  const handleError = useCallback((error: unknown, operation: string) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`Tournament ${operation} error:`, error);

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));

    return errorMessage;
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Check authentication
  const isUserAuthenticated = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  // Load active tournament
  const loadActiveTournament =
    useCallback(async (): Promise<Tournament | null> => {
      if (!isUserAuthenticated()) {
        handleError(
          new Error("User not authenticated"),
          "loadActiveTournament",
        );

        return null;
      }

      setLoading(true);
      clearError();

      try {
        const tournament = await authService.getActiveTournament();

        setState((prev) => ({
          ...prev,
          activeTournament: tournament,
          isLoading: false,
        }));

        return tournament;
      } catch (error) {
        handleError(error, "loadActiveTournament");

        return null;
      }
    }, [isUserAuthenticated, setLoading, clearError, handleError]);

  // Load tournament status
  const loadTournamentStatus =
    useCallback(async (): Promise<TournamentStatus> => {
      if (!isUserAuthenticated()) {
        const errorStatus: TournamentStatus = {
          isActive: false,
          activeTournament: null,
        };

        handleError(
          new Error("User not authenticated"),
          "loadTournamentStatus",
        );

        return errorStatus;
      }

      setLoading(true);
      clearError();

      try {
        const status = await authService.getTournamentStatus();

        setState((prev) => ({
          ...prev,
          tournamentStatus: status,
          isLoading: false,
        }));

        return status;
      } catch (error) {
        handleError(error, "loadTournamentStatus");

        return { isActive: false, activeTournament: null };
      }
    }, [isUserAuthenticated, setLoading, clearError, handleError]);

  // Load tournament leaderboard
  const loadLeaderboard = useCallback(
    async (
      tournamentId: string,
      limit: number = 50,
    ): Promise<TournamentLeaderboardEntry[]> => {
      if (!isUserAuthenticated()) {
        handleError(new Error("User not authenticated"), "loadLeaderboard");

        return [];
      }

      setLoading(true);
      clearError();

      try {
        const leaderboard = await authService.getTournamentLeaderboard(
          tournamentId,
          limit,
        );

        setState((prev) => ({
          ...prev,
          leaderboard,
          isLoading: false,
        }));

        return leaderboard;
      } catch (error) {
        handleError(error, "loadLeaderboard");

        return [];
      }
    },
    [isUserAuthenticated, setLoading, clearError, handleError],
  );

  // Load user tournament result
  const loadUserResult = useCallback(
    async (tournamentId: string): Promise<TournamentResult | null> => {
      if (!isUserAuthenticated()) {
        handleError(new Error("User not authenticated"), "loadUserResult");

        return null;
      }

      setLoading(true);
      clearError();

      try {
        const result = await authService.getUserTournamentResult(tournamentId);

        setState((prev) => ({
          ...prev,
          userResult: result,
          isLoading: false,
        }));

        return result;
      } catch (error) {
        handleError(error, "loadUserResult");

        return null;
      }
    },
    [isUserAuthenticated, setLoading, clearError, handleError],
  );

  // Load all tournaments
  const loadAllTournaments =
    useCallback(async (): Promise<TournamentListResponse> => {
      if (!isUserAuthenticated()) {
        const emptyResponse: TournamentListResponse = {
          active: [],
          upcoming: [],
          completed: [],
        };

        handleError(new Error("User not authenticated"), "loadAllTournaments");

        return emptyResponse;
      }

      setLoading(true);
      clearError();

      try {
        const tournaments = await authService.getAllTournaments();

        setState((prev) => ({
          ...prev,
          allTournaments: tournaments,
          isLoading: false,
        }));

        return tournaments;
      } catch (error) {
        handleError(error, "loadAllTournaments");

        return { active: [], upcoming: [], completed: [] };
      }
    }, [isUserAuthenticated, setLoading, clearError, handleError]);

  // Save tournament result
  const saveTournamentResult = useCallback(
    async (
      tournamentId: string,
      gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> => {
      if (!isUserAuthenticated()) {
        throw new Error("User not authenticated");
      }

      setLoading(true);
      clearError();

      try {
        const result = await authService.saveTournamentResult(
          tournamentId,
          gameResult,
        );

        setState((prev) => ({ ...prev, isLoading: false }));

        return result;
      } catch (error) {
        handleError(error, "saveTournamentResult");
        throw error;
      }
    },
    [isUserAuthenticated, setLoading, clearError, handleError],
  );

  // Get tournament winners
  const getTournamentWinners = useCallback(
    async (
      tournamentId: string,
      prizeCount: number,
    ): Promise<TournamentLeaderboardEntry[]> => {
      if (!isUserAuthenticated()) {
        handleError(
          new Error("User not authenticated"),
          "getTournamentWinners",
        );

        return [];
      }

      setLoading(true);
      clearError();

      try {
        const winners = await authService.getTournamentWinners(
          tournamentId,
          prizeCount,
        );

        setState((prev) => ({ ...prev, isLoading: false }));

        return winners;
      } catch (error) {
        handleError(error, "getTournamentWinners");

        return [];
      }
    },
    [isUserAuthenticated, setLoading, clearError, handleError],
  );

  // Refresh all tournament data
  const refreshAll = useCallback(async (): Promise<void> => {
    if (!isUserAuthenticated()) {
      handleError(new Error("User not authenticated"), "refreshAll");

      return;
    }

    setLoading(true);
    clearError();

    try {
      const [status, tournaments] = await Promise.all([
        authService.getTournamentStatus(),
        authService.getAllTournaments(),
      ]);

      // Load leaderboard for active tournament if exists
      let leaderboard: TournamentLeaderboardEntry[] = [];
      let userResult: TournamentResult | null = null;

      if (status.activeTournament) {
        const [boardData, resultData] = await Promise.all([
          authService.getTournamentLeaderboard(status.activeTournament.id, 100),
          authService.getUserTournamentResult(status.activeTournament.id),
        ]);

        leaderboard = boardData;
        userResult = resultData;
      }

      setState((prev) => ({
        ...prev,
        tournamentStatus: status,
        activeTournament: status.activeTournament,
        allTournaments: tournaments,
        leaderboard,
        userResult,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      handleError(error, "refreshAll");
    }
  }, [isUserAuthenticated, setLoading, clearError, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-load data when hook is first used and user is authenticated
  useEffect(() => {
    if (isUserAuthenticated() && !state.tournamentStatus) {
      refreshAll();
    }
  }, [isUserAuthenticated, refreshAll, state.tournamentStatus]);

  return {
    state,
    loadActiveTournament,
    loadTournamentStatus,
    loadLeaderboard,
    loadUserResult,
    loadAllTournaments,
    saveTournamentResult,
    getTournamentWinners,
    refreshAll,
    clearError,
    isUserAuthenticated,
  };
}
