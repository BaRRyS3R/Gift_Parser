// src/hooks/modules/useSeasons.ts - React hook for seasons management

import { useState, useCallback, useRef } from "react";

// Season interfaces (client-side)
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

export interface SeasonLeaderboardEntry {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  survival_best_score: number;
  survival_best_time: number;
  survival_games: number;
  isCurrentUser?: boolean;
}

export interface SeasonUserStats {
  position: number | null;
  survival_best_score: number;
  survival_best_time: number;
  survival_games: number;
}

export interface CompleteSeasonData {
  season: Season;
  leaderboard: SeasonLeaderboardEntry[];
  userStats: SeasonUserStats;
  isActive: boolean;
  timeRemaining?: number;
  hasStarted?: boolean;
}

export interface SeasonsState {
  data: CompleteSeasonData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing season data and operations
 */
export function useSeasons(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<SeasonsState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch current season data from API
   */
  const fetchCurrentSeason =
    useCallback(async (): Promise<CompleteSeasonData | null> => {
      // Wait for current request to complete if already fetching
      if (fetchingRef.current) {
        console.log("Season fetch already in progress, waiting...");

        return new Promise((resolve) => {
          const checkCompletion = () => {
            if (!fetchingRef.current) {
              // Return current data from state without causing re-renders
              setState((currentState) => {
                resolve(currentState.data);

                return currentState;
              });
            } else {
              setTimeout(checkCompletion, 100);
            }
          };

          checkCompletion();
        });
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Fetching current season data from API...");

        const response = await makeAuthenticatedRequest("/api/seasons/current");

        if (!response.ok) {
          if (response.status === 404) {
            // No active season - this is expected behavior
            setState({
              data: null,
              isLoading: false,
              error: null,
            });

            console.log("No active season found");

            return null;
          }

          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch season data");
        }

        const seasonData: CompleteSeasonData = result.data;

        setState({
          data: seasonData,
          isLoading: false,
          error: null,
        });

        console.log("Successfully fetched season data:", {
          seasonName: seasonData.season.name,
          isActive: seasonData.isActive,
          leaderboardEntries: seasonData.leaderboard.length,
          userPosition: seasonData.userStats.position,
        });

        return seasonData;
      } catch (error) {
        console.error("Error fetching season data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset season state
   */
  const resetSeasonData = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Check if user is in top 10 leaderboard
   */
  const isUserInTopLeaderboard = useCallback((): boolean => {
    if (!state.data) return false;

    return state.data.leaderboard.some((entry) => entry.isCurrentUser);
  }, [state.data]);

  /**
   * Get user position (returns position from userStats)
   */
  const getUserPosition = useCallback((): number | null => {
    if (!state.data) return null;

    return state.data.userStats.position;
  }, [state.data]);

  /**
   * Check if season is currently active
   */
  const isSeasonActive = useCallback((): boolean => {
    if (!state.data) return false;

    return state.data.isActive;
  }, [state.data]);

  /**
   * Get formatted time remaining for active season
   */
  const getTimeRemaining = useCallback((): string | null => {
    if (!state.data?.timeRemaining) return null;

    const milliseconds = state.data.timeRemaining;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);

    if (days > 0) {
      const hours = totalHours % 24;

      return `${days}d ${hours}h`;
    } else if (totalHours > 0) {
      const minutes = totalMinutes % 60;

      return `${totalHours}h ${minutes}m`;
    } else if (totalMinutes > 0) {
      const seconds = totalSeconds % 60;

      return `${totalMinutes}m ${seconds}s`;
    } else {
      return `${totalSeconds}s`;
    }
  }, [state.data]);

  return {
    // State
    seasonData: state.data,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchCurrentSeason,
    clearError,
    resetSeasonData,

    // Utility functions
    isUserInTopLeaderboard,
    getUserPosition,
    isSeasonActive,
    getTimeRemaining,
  };
}
