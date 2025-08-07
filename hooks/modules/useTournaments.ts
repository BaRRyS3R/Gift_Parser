// src/hooks/modules/useTournaments.ts - Tournaments management hook

import type {
  Tournament,
  TournamentsData,
  TournamentLeaderboardData,
  TournamentUserPosition,
  TournamentLeaderboardEntry,
  TournamentQuery,
  TournamentTimeInfo,
} from "@/types/tournaments";

import { useState, useCallback, useRef, useEffect } from "react";

import { calculateTournamentTimeInfo } from "@/types/tournaments";

// Re-export types for external use
export type {
  Tournament,
  TournamentsData,
  TournamentLeaderboardData,
  TournamentUserPosition,
  TournamentLeaderboardEntry,
  TournamentQuery,
  TournamentTimeInfo,
};

// Prize interface for tournament prizes
export interface Prize {
  position: number;
  description: string;
  attempts?: number;
  special_title?: string;
  reward_type?: "attempts" | "title" | "custom";
}

// Hook state interface
interface TournamentsState {
  tournaments: TournamentsData | null;
  selectedTournament: Tournament | null;
  currentDetail: Tournament | null; // NEW: Current tournament detail
  leaderboard: TournamentLeaderboardEntry[];
  userPosition: TournamentUserPosition | null;
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  isDetailLoading: boolean; // NEW: Detail loading state
  error: string | null;
  leaderboardError: string | null;
  detailError: string | null; // NEW: Detail error state
  lastFetchTime: number | null;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for tournaments list
const LEADERBOARD_CACHE_DURATION = 30 * 1000; // 30 seconds for leaderboard

/**
 * Tournaments management hook
 */
export function useTournaments(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<TournamentsState>({
    tournaments: null,
    selectedTournament: null,
    currentDetail: null, // NEW: Initialize current detail
    leaderboard: [],
    userPosition: null,
    isLoading: false,
    isLeaderboardLoading: false,
    isDetailLoading: false, // NEW: Initialize detail loading
    error: null,
    leaderboardError: null,
    detailError: null, // NEW: Initialize detail error
    lastFetchTime: null,
  });

  const fetchingRef = useRef<boolean>(false);
  const leaderboardFetchingRef = useRef<boolean>(false);
  const tournamentsCache = useRef<{
    data: TournamentsData;
    timestamp: number;
  } | null>(null);
  const leaderboardCache = useRef<
    Map<
      string,
      {
        data: TournamentLeaderboardData;
        timestamp: number;
      }
    >
  >(new Map());

  /**
   * Get tournament status and time information
   */
  const getTournamentStatus = useCallback(
    (tournament: Tournament): TournamentTimeInfo => {
      return calculateTournamentTimeInfo(tournament);
    },
    [],
  );

  /**
   * Format time remaining for display
   */
  const formatTimeRemaining = useCallback((endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining === 0) return "Ended";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  }, []);

  /**
   * Get game mode icon name
   */
  const getGameModeIcon = useCallback((mode: string): string => {
    switch (mode) {
      case "survival":
        return "Crosshair";
      case "physics":
        return "Atom";
      case "rotation":
        return "RotateCw";
      default:
        return "Target";
    }
  }, []);

  /**
   * Fetch tournament detail by ID
   */
  const fetchTournamentDetail = useCallback(
    async (tournamentId: string): Promise<Tournament | null> => {
      setState((prev) => ({
        ...prev,
        isDetailLoading: true,
        detailError: null,
      }));

      try {
        // For now, find tournament in existing data
        const allTournaments = [
          ...(state.tournaments?.upcoming || []),
          ...(state.tournaments?.completed || []),
        ];

        if (state.tournaments?.active) {
          allTournaments.unshift(state.tournaments.active);
        }

        const tournament = allTournaments.find((t) => t.id === tournamentId);

        if (tournament) {
          setState((prev) => ({
            ...prev,
            currentDetail: tournament,
            isDetailLoading: false,
          }));

          return tournament;
        } else {
          throw new Error("Tournament not found");
        }
      } catch (error) {
        console.error("Error fetching tournament detail:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament detail";

        setState((prev) => ({
          ...prev,
          isDetailLoading: false,
          detailError: errorMessage,
        }));

        return null;
      }
    },
    [state.tournaments],
  );
  const isCacheValid = useCallback(
    (timestamp: number, duration: number): boolean => {
      return Date.now() - timestamp < duration;
    },
    [],
  );

  /**
   * Fetch all tournaments grouped by status
   */
  const fetchTournaments = useCallback(
    async (force: boolean = false): Promise<TournamentsData | null> => {
      // Check cache first
      if (
        !force &&
        tournamentsCache.current &&
        isCacheValid(tournamentsCache.current.timestamp, CACHE_DURATION)
      ) {
        setState((prev) => ({
          ...prev,
          tournaments: tournamentsCache.current!.data,
        }));

        return tournamentsCache.current.data;
      }

      if (fetchingRef.current && !force) {
        return state.tournaments;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await makeAuthenticatedRequest("/api/tournaments");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch tournaments");
        }

        const tournamentsData = result.data;

        // Update cache
        tournamentsCache.current = {
          data: tournamentsData,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          tournaments: tournamentsData,
          isLoading: false,
          error: null,
          lastFetchTime: Date.now(),
        }));

        return tournamentsData;
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournaments";

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
    [makeAuthenticatedRequest, isCacheValid, state.tournaments],
  );

  /**
   * Fetch specific tournament and its leaderboard
   */
  const fetchTournamentLeaderboard = useCallback(
    async (
      tournamentQuery: string,
      force: boolean = false,
    ): Promise<TournamentLeaderboardData | null> => {
      // Check cache first
      const cacheKey = tournamentQuery;
      const cached = leaderboardCache.current.get(cacheKey);

      if (
        !force &&
        cached &&
        isCacheValid(cached.timestamp, LEADERBOARD_CACHE_DURATION)
      ) {
        setState((prev) => ({
          ...prev,
          selectedTournament: cached.data.tournament,
          leaderboard: cached.data.leaderboard,
          userPosition: cached.data.userPosition || null,
        }));

        return cached.data;
      }

      if (leaderboardFetchingRef.current && !force) {
        return null;
      }

      leaderboardFetchingRef.current = true;
      setState((prev) => ({
        ...prev,
        isLeaderboardLoading: true,
        leaderboardError: null,
      }));

      try {
        const response = await makeAuthenticatedRequest(
          `/api/tournaments?tournament=${encodeURIComponent(tournamentQuery)}`,
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

        const leaderboardData: TournamentLeaderboardData = {
          tournament: result.tournament,
          leaderboard: result.leaderboard || [],
          userPosition: result.userPosition,
        };

        // Update cache
        leaderboardCache.current.set(cacheKey, {
          data: leaderboardData,
          timestamp: Date.now(),
        });

        setState((prev) => ({
          ...prev,
          selectedTournament: leaderboardData.tournament,
          leaderboard: leaderboardData.leaderboard,
          userPosition: leaderboardData.userPosition || null,
          isLeaderboardLoading: false,
          leaderboardError: null,
        }));

        return leaderboardData;
      } catch (error) {
        console.error("Error fetching tournament leaderboard:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament leaderboard";

        setState((prev) => ({
          ...prev,
          isLeaderboardLoading: false,
          leaderboardError: errorMessage,
        }));

        return null;
      } finally {
        leaderboardFetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, isCacheValid],
  );

  /**
   * Get active tournament
   */
  const getActiveTournament = useCallback((): Tournament | null => {
    return state.tournaments?.active || null;
  }, [state.tournaments]);

  /**
   * Get upcoming tournaments
   */
  const getUpcomingTournaments = useCallback((): Tournament[] => {
    return state.tournaments?.upcoming || [];
  }, [state.tournaments]);

  /**
   * Get completed tournaments
   */
  const getCompletedTournaments = useCallback((): Tournament[] => {
    return state.tournaments?.completed || [];
  }, [state.tournaments]);

  /**
   * Check if user is participating in a tournament
   */
  const isUserParticipating = useCallback(
    (tournamentId: string): boolean => {
      return (
        state.userPosition !== null &&
        state.selectedTournament?.id === tournamentId
      );
    },
    [state.userPosition, state.selectedTournament],
  );

  /**
   * Get user's position in current tournament
   */
  const getUserPosition = useCallback((): TournamentUserPosition | null => {
    return state.userPosition;
  }, [state.userPosition]);

  /**
   * Refresh tournaments data
   */
  const refreshTournaments = useCallback(() => {
    tournamentsCache.current = null;

    return fetchTournaments(true);
  }, [fetchTournaments]);

  /**
   * Refresh leaderboard data
   */
  const refreshLeaderboard = useCallback(
    (tournamentQuery: string) => {
      leaderboardCache.current.delete(tournamentQuery);

      return fetchTournamentLeaderboard(tournamentQuery, true);
    },
    [fetchTournamentLeaderboard],
  );

  /**
   * Clear error states
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearLeaderboardError = useCallback(() => {
    setState((prev) => ({ ...prev, leaderboardError: null }));
  }, []);

  /**
   * Clear detail error state
   */
  const clearDetailError = useCallback(() => {
    setState((prev) => ({ ...prev, detailError: null }));
  }, []);

  /**
   * Reset tournament state
   */
  const resetTournamentState = useCallback(() => {
    setState({
      tournaments: null,
      selectedTournament: null,
      currentDetail: null, // NEW: Reset current detail
      leaderboard: [],
      userPosition: null,
      isLoading: false,
      isLeaderboardLoading: false,
      isDetailLoading: false, // NEW: Reset detail loading
      error: null,
      leaderboardError: null,
      detailError: null, // NEW: Reset detail error
      lastFetchTime: null,
    });

    tournamentsCache.current = null;
    leaderboardCache.current.clear();
  }, []);

  /**
   * Set selected tournament
   */
  const setSelectedTournament = useCallback((tournament: Tournament | null) => {
    setState((prev) => ({
      ...prev,
      selectedTournament: tournament,
      leaderboard: tournament ? prev.leaderboard : [],
      userPosition: tournament ? prev.userPosition : null,
    }));
  }, []);

  /**
   * Auto-refresh active tournament leaderboard
   */
  useEffect(() => {
    if (state.selectedTournament?.status === "active") {
      const tournamentQuery = `${state.selectedTournament.mode}-week-${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7))}-${new Date().getFullYear()}`;

      const interval = setInterval(() => {
        fetchTournamentLeaderboard(tournamentQuery, true);
      }, 30000); // Refresh every 30 seconds for active tournaments

      return () => clearInterval(interval);
    }
  }, [state.selectedTournament, fetchTournamentLeaderboard]);

  return {
    // State
    tournaments: state.tournaments,
    selectedTournament: state.selectedTournament,
    currentDetail: state.currentDetail, // NEW: Current detail
    leaderboard: state.leaderboard,
    userPosition: state.userPosition,
    isLoading: state.isLoading,
    isLeaderboardLoading: state.isLeaderboardLoading,
    isDetailLoading: state.isDetailLoading, // NEW: Detail loading
    error: state.error,
    leaderboardError: state.leaderboardError,
    detailError: state.detailError, // NEW: Detail error
    lastFetchTime: state.lastFetchTime,

    // Computed values
    activeTournament: getActiveTournament(),
    upcomingTournaments: getUpcomingTournaments(),
    completedTournaments: getCompletedTournaments(),
    isParticipating: state.userPosition !== null,

    // Actions
    fetchTournaments,
    fetchTournamentLeaderboard,
    fetchTournamentDetail, // NEW: Fetch tournament detail
    refreshTournaments,
    refreshLeaderboard,
    setSelectedTournament,

    // Utilities
    getActiveTournament,
    getUpcomingTournaments,
    getCompletedTournaments,
    isUserParticipating,
    getUserPosition,
    getTournamentStatus, // NEW: Get tournament status
    formatTimeRemaining, // NEW: Format time remaining
    getGameModeIcon, // NEW: Get game mode icon

    // Error handling
    clearError,
    clearLeaderboardError,
    clearDetailError, // NEW: Clear detail error
    resetTournamentState,
  };
}
