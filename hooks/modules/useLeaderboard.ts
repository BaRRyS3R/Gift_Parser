// src/hooks/modules/useLeaderboard.ts - Исправленная версия без циклических запросов

import { useState, useCallback, useRef } from "react";

// Leaderboard interfaces (client-side, without sensitive data)
export interface SafeReactionLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_reaction_time: number;
  reaction_games: number;
  best_reaction_score: number;
  isCurrentUser?: boolean;
}

export interface SafeSurvivalLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_survival_time: number;
  best_survival_score: number;
  max_level: number;
  best_streak: number;
  survival_games: number;
  isCurrentUser?: boolean;
}

export interface SafePhysicsLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_physics_score: number; // Основной критерий сортировки
  best_physics_time: number;
  best_hits: number;
  least_mistakes: number;
  physics_games: number;
  isCurrentUser?: boolean;
}

export interface SafeRotationLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  best_rotation_score: number; // Основной критерий сортировки
  best_rotation_time: number;
  max_level: number;
  best_streak: number;
  total_hits: number;
  rotation_games: number;
  isCurrentUser?: boolean;
}

export interface UserRankings {
  reaction?: number;
  survival?: number;
  physics?: number;
  rotation?: number;
}

export interface LeaderboardData {
  reaction: SafeReactionLeaderboard[];
  survival: SafeSurvivalLeaderboard[];
  physics: SafePhysicsLeaderboard[];
  rotation: SafeRotationLeaderboard[];
  userRankings: UserRankings;
}

export interface LeaderboardState {
  data: LeaderboardData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Centralized leaderboard management hook (without caching)
 */
export function useLeaderboard(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<LeaderboardState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch all leaderboards from API (always fresh data)
   */
  const fetchLeaderboards =
    useCallback(async (): Promise<LeaderboardData | null> => {
      // Wait for current request to complete instead of returning cached data
      if (fetchingRef.current) {
        console.log("Leaderboard fetch already in progress, waiting...");

        // Wait for current fetch to complete
        return new Promise((resolve) => {
          const checkCompletion = () => {
            if (!fetchingRef.current) {
              resolve(state.data);
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
        console.log("Fetching fresh leaderboards from API...");

        const response = await makeAuthenticatedRequest(
          "/api/leaderboard/all?limit=100",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch leaderboards");
        }

        const leaderboardData: LeaderboardData = result.data;

        setState({
          data: leaderboardData,
          isLoading: false,
          error: null,
        });

        console.log("Successfully fetched fresh leaderboards:", {
          reaction: leaderboardData.reaction.length,
          survival: leaderboardData.survival.length,
          physics: leaderboardData.physics.length,
          rotation: leaderboardData.rotation.length,
        });

        return leaderboardData;
      } catch (error) {
        console.error("Error fetching leaderboards:", error);
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
   * Check if user is in top leaderboard (within top 100)
   */
  const isUserInTopLeaderboard = useCallback(
    (
      leaderboardType: "reaction" | "survival" | "physics" | "rotation",
    ): boolean => {
      if (!state.data) return false;

      const leaderboard = state.data[leaderboardType];

      return leaderboard.some((entry) => entry.isCurrentUser);
    },
    [state.data],
  );

  /**
   * Get user position for a specific leaderboard type
   */
  const getUserPosition = useCallback(
    (
      leaderboardType: "reaction" | "survival" | "physics" | "rotation",
    ): number | null => {
      if (!state.data || !state.data.userRankings) return null;

      return state.data.userRankings[leaderboardType] || null;
    },
    [state.data],
  );

  /**
   * Reset leaderboard state
   */
  const resetLeaderboard = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    // State
    leaderboardData: state.data,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchLeaderboards,
    clearError,
    resetLeaderboard,

    // Utility functions
    isUserInTopLeaderboard,
    getUserPosition,
  };
}
