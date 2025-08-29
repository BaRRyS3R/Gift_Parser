// src/hooks/modules/useLeaderboard.ts - ИСПРАВЛЕННАЯ версия без бесконечного цикла

import { useState, useCallback, useRef } from "react";

// Existing interfaces remain the same...
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
  best_physics_score: number;
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
  best_rotation_score: number;
  best_rotation_time: number;
  max_level: number;
  best_streak: number;
  total_hits: number;
  rotation_games: number;
  isCurrentUser?: boolean;
}

export interface SafeSeasonLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  total_score: number;
  total_games: number;
  isCurrentUser?: boolean;
}

export interface UserRankings {
  season?: number;
  reaction?: number;
  survival?: number;
  physics?: number;
  rotation?: number;
}

export interface LeaderboardData {
  season: SafeSeasonLeaderboard[];
  reaction: SafeReactionLeaderboard[];
  survival: SafeSurvivalLeaderboard[];
  physics: SafePhysicsLeaderboard[];
  rotation: SafeRotationLeaderboard[];
  userRankings: UserRankings;
}

// NEW: Cache info interface
export interface CacheInfo {
  is_from_cache: boolean;
  cached_at?: number;
  cache_age_seconds?: number;
  next_update_in_seconds?: number;
}

// Updated state interface with cache info
export interface LeaderboardState {
  data: LeaderboardData | null;
  cacheInfo: CacheInfo | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced leaderboard management hook with Redis cache support
 */
export function useLeaderboard(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<LeaderboardState>({
    data: null,
    cacheInfo: null,
    isLoading: false,
    error: null,
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch leaderboards with cache support
   * ✅ ИСПРАВЛЕНО: убрана зависимость от state.data чтобы избежать бесконечного цикла
   */
  const fetchLeaderboards = useCallback(async (
    forceRefresh: boolean = false
  ): Promise<LeaderboardData | null> => {
    // Prevent concurrent requests
    if (fetchingRef.current) {
      return new Promise((resolve) => {
        const checkCompletion = () => {
          if (!fetchingRef.current) {
            // ✅ Возвращаем null вместо state.data чтобы избежать зависимости
            resolve(null);
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
      // Build URL with force refresh parameter if needed
      const endpoint = forceRefresh 
        ? "/api/leaderboard/all?limit=100&force_refresh=true"
        : "/api/leaderboard/all?limit=100";

      const response = await makeAuthenticatedRequest(endpoint);

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
      const cacheInfo: CacheInfo | null = result.cache_info || null;

      // Log cache information for debugging
      if (cacheInfo) {
        console.log(`[LEADERBOARD_HOOK] Cache info:`, {
          from_cache: cacheInfo.is_from_cache,
          age_seconds: cacheInfo.cache_age_seconds,
          next_update_in: cacheInfo.next_update_in_seconds,
        });
      }

      setState({
        data: leaderboardData,
        cacheInfo,
        isLoading: false,
        error: null,
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
        cacheInfo: null, // Clear cache info on error
      }));

      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, [makeAuthenticatedRequest]); // ✅ ИСПРАВЛЕНО: убрали state.data из зависимостей

  /**
   * Force refresh leaderboards (bypass cache)
   */
  const forceRefreshLeaderboards = useCallback(async (): Promise<LeaderboardData | null> => {
    return await fetchLeaderboards(true);
  }, [fetchLeaderboards]);

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
      cacheInfo: null,
      isLoading: false,
      error: null,
    });
  }, []);

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

  /**
   * Get cache age in seconds
   */
  const getCacheAge = useCallback(() => {
    return state.cacheInfo?.cache_age_seconds || 0;
  }, [state.cacheInfo]);

  /**
   * Get time until next cache update
   */
  const getTimeUntilNextUpdate = useCallback(() => {
    return state.cacheInfo?.next_update_in_seconds || 0;
  }, [state.cacheInfo]);

  return {
    // State
    leaderboardData: state.data,
    cacheInfo: state.cacheInfo,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchLeaderboards: () => fetchLeaderboards(false), // ✅ ИСПРАВЛЕНО: возвращаем функцию без параметров
    forceRefreshLeaderboards,
    clearError,
    resetLeaderboard,

    // Utility functions
    isUserInTopLeaderboard,
    getUserPosition,

    // NEW: Cache-related functions
    getCacheStatus,
    isDataFromCache,
    getCacheAge,
    getTimeUntilNextUpdate,
  };
}