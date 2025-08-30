// src/hooks/modules/useTournaments.ts - Упрощенный хук для работы с активным турниром

import { useState, useCallback, useRef, useEffect } from "react";

// Tournament interfaces
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  mode: "survival" | "physics" | "rotation";
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  prizes: Prize[];
  created_at: string;
  updated_at: string;
}

export interface Prize {
  position: number;
  description: string;
  attempts?: number;
  special_title?: string;
  reward_type?: "attempts" | "title" | "custom";
}

export interface PublicTournamentLeaderboardEntry {
  tournament_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  best_score: number;
}

export interface TournamentUserPosition {
  position: number;
  entry: PublicTournamentLeaderboardEntry;
}

export interface TournamentStats {
  totalParticipants: number;
  totalGames: number;
  averageScore: number;
  highestScore: number;
}

export interface PublicTournamentData {
  tournament: Tournament;
  leaderboard: PublicTournamentLeaderboardEntry[];
  userPosition?: TournamentUserPosition;
  stats: TournamentStats;
}

export interface TournamentCacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
}

// Hook state interface
interface TournamentsState {
  activeTournament: PublicTournamentData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  cacheInfo: TournamentCacheInfo | null;
  lastFetchTime: number | null;
}

// API Response interface
interface TournamentResponse {
  success: boolean;
  tournament?: PublicTournamentData;
  cache_info?: TournamentCacheInfo;
  error?: string;
}

// Cache configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds for active tournament
const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute auto-refresh for active tournament

/**
 * Simplified tournaments hook focused on active tournament only
 */
export function useTournaments(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<TournamentsState>({
    activeTournament: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    cacheInfo: null,
    lastFetchTime: null,
  });

  const fetchingRef = useRef<boolean>(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if we need to fetch data
   */
  const shouldFetch = useCallback((): boolean => {
    if (!state.lastFetchTime) return true;
    
    const timeSinceLastFetch = Date.now() - state.lastFetchTime;
    return timeSinceLastFetch > CACHE_DURATION;
  }, [state.lastFetchTime]);

  /**
   * Fetch active tournament with leaderboard
   */
  const fetchActiveTournament = useCallback(
    async (force: boolean = false): Promise<PublicTournamentData | null> => {
      // Prevent concurrent requests
      if (fetchingRef.current && !force) {
        return state.activeTournament;
      }

      // Check if we should fetch
      if (!force && !shouldFetch() && state.activeTournament) {
        return state.activeTournament;
      }

      fetchingRef.current = true;
      setState((prev) => ({ 
        ...prev, 
        isLoading: !prev.activeTournament, // Don't show loading if we have data
        isRefreshing: !!prev.activeTournament, // Show refreshing if we have existing data
        error: null 
      }));

      try {
        const endpoint = force 
          ? "/api/tournaments?force_refresh=true"
          : "/api/tournaments";

        const response = await makeAuthenticatedRequest(endpoint);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result: TournamentResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch tournament data");
        }

        const tournamentData = result.tournament || null;

        setState((prev) => ({
          ...prev,
          activeTournament: tournamentData,
          cacheInfo: result.cache_info || null,
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastFetchTime: Date.now(),
        }));

        // Setup auto-refresh for active tournament
        if (tournamentData?.tournament.status === "active") {
          setupAutoRefresh();
        } else {
          clearAutoRefresh();
        }

        return tournamentData;
      } catch (error) {
        console.error("Error fetching tournament:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament data";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, shouldFetch, state.activeTournament],
  );

  /**
   * Force refresh tournament data
   */
  const forceRefresh = useCallback(() => {
    return fetchActiveTournament(true);
  }, [fetchActiveTournament]);

  /**
   * Setup auto-refresh for active tournaments
   */
  const setupAutoRefresh = useCallback(() => {
    clearAutoRefresh();
    
    autoRefreshRef.current = setInterval(() => {
      if (state.activeTournament?.tournament.status === "active") {
        fetchActiveTournament(false);
      } else {
        clearAutoRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);
  }, [fetchActiveTournament, state.activeTournament]);

  /**
   * Clear auto-refresh
   */
  const clearAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, []);

  /**
   * Get tournament status and time information
   */
  const getTournamentTimeInfo = useCallback((tournament: Tournament) => {
    const now = new Date().getTime();
    const start = new Date(tournament.start_time).getTime();
    const end = new Date(tournament.end_time).getTime();

    const isActive = now >= start && now <= end;
    const hasEnded = now > end;
    const timeRemaining = isActive ? Math.max(0, end - now) : undefined;
    const timeUntilStart = !isActive && !hasEnded ? Math.max(0, start - now) : undefined;

    let formattedTime = "";
    const timeToFormat = timeRemaining || timeUntilStart;

    if (timeToFormat) {
      const days = Math.floor(timeToFormat / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeToFormat % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((timeToFormat % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeToFormat % (1000 * 60)) / 1000);

      if (days > 0) formattedTime = `${days}d ${hours}h`;
      else if (hours > 0) formattedTime = `${hours}h ${minutes}m`;
      else if (minutes > 0) formattedTime = `${minutes}m ${seconds}s`;
      else formattedTime = `${seconds}s`;
    } else if (hasEnded) {
      formattedTime = "Ended";
    }

    return {
      isActive,
      timeRemaining,
      timeUntilStart,
      hasEnded,
      formattedTime,
    };
  }, []);

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
   * Check if user is participating in the tournament
   */
  const isUserParticipating = useCallback((): boolean => {
    return !!state.activeTournament?.userPosition;
  }, [state.activeTournament]);

  /**
   * Get user's position in tournament
   */
  const getUserPosition = useCallback((): TournamentUserPosition | null => {
    return state.activeTournament?.userPosition || null;
  }, [state.activeTournament]);

  /**
   * Check if tournament is active
   */
  const isTournamentActive = useCallback((): boolean => {
    return state.activeTournament?.tournament.status === "active";
  }, [state.activeTournament]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset tournament state
   */
  const resetTournamentState = useCallback(() => {
    clearAutoRefresh();
    setState({
      activeTournament: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      cacheInfo: null,
      lastFetchTime: null,
    });
  }, [clearAutoRefresh]);

  /**
   * Get cache status information
   */
  const getCacheStatus = useCallback(() => {
    return state.cacheInfo;
  }, [state.cacheInfo]);

  /**
   * Check if data is from cache
   */
  const isDataFromCache = useCallback(() => {
    return state.cacheInfo?.is_from_cache || false;
  }, [state.cacheInfo]);

  // Cleanup auto-refresh on unmount
  useEffect(() => {
    return () => {
      clearAutoRefresh();
    };
  }, [clearAutoRefresh]);

  return {
    // State
    activeTournament: state.activeTournament,
    tournament: state.activeTournament?.tournament || null,
    leaderboard: state.activeTournament?.leaderboard || [],
    userPosition: state.activeTournament?.userPosition || null,
    stats: state.activeTournament?.stats || null,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    cacheInfo: state.cacheInfo,
    lastFetchTime: state.lastFetchTime,

    // Computed values
    isParticipating: isUserParticipating(),
    isActive: isTournamentActive(),
    hasActiveTournament: !!state.activeTournament,

    // Actions
    fetchActiveTournament: () => fetchActiveTournament(false),
    forceRefresh,
    clearError,
    resetTournamentState,

    // Utilities
    getTournamentTimeInfo,
    formatTimeRemaining,
    getGameModeIcon,
    isUserParticipating,
    getUserPosition,
    isTournamentActive,

    // Cache-related functions
    getCacheStatus,
    isDataFromCache,
  };
}