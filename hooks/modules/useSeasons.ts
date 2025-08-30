// src/hooks/modules/useSeasons.ts - SIMPLIFIED VERSION: Only static season data caching

import { useState, useCallback, useRef, useMemo } from "react";

// SIMPLIFIED: Only static season data interface
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

// SIMPLIFIED: Season state without leaderboard/userStats
export interface SeasonsState {
  seasonData: Season | null;
  isLoading: boolean;
  error: string | null;
}

// Constants for localStorage
const STORAGE_KEY = 'circusle_current_season_static';

/**
 * Utilities for caching ONLY static season data
 */
const seasonCache = {
  /**
   * Check localStorage availability
   */
  isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      const testKey = 'test_localStorage_availability';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('[SEASONS_CACHE] localStorage is not available:', error);
      return false;
    }
  },

  /**
   * Check if season has expired
   */
  isSeasonExpired(endDate: string): boolean {
    const endTime = new Date(endDate).getTime();
    const currentTime = Date.now();
    return currentTime >= endTime;
  },

  /**
   * Save ONLY static season data to localStorage
   */
  setCachedSeason(season: Season): boolean {
    if (!this.isAvailable()) return false;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(season));
      console.log(`[SEASONS_CACHE] Cached static season data for "${season.name}" until ${season.end_date}`);
      return true;
    } catch (error) {
      console.warn('[SEASONS_CACHE] Failed to cache season:', error);
      return false;
    }
  },

  /**
   * Get ONLY static season data from localStorage with time validation
   */
  getCachedSeason(): Season | null {
    if (!this.isAvailable()) return null;

    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (!cached) {
        console.log('[SEASONS_CACHE] No cached static season data found');
        return null;
      }

      const season: Season = JSON.parse(cached);

      // Check if season has expired
      if (this.isSeasonExpired(season.end_date)) {
        console.log(`[SEASONS_CACHE] Season "${season.name}" expired, clearing cache`);
        this.clearCache();
        return null;
      }

      console.log(`[SEASONS_CACHE] Using cached static season data "${season.name}"`);
      return season;
    } catch (error) {
      console.warn('[SEASONS_CACHE] Failed to retrieve cached season:', error);
      this.clearCache(); // Clear corrupted data
      return null;
    }
  },

  /**
   * Clear cache
   */
  clearCache(): boolean {
    if (!this.isAvailable()) return false;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      console.log('[SEASONS_CACHE] Cache cleared');
      return true;
    } catch (error) {
      console.warn('[SEASONS_CACHE] Failed to clear cache:', error);
      return false;
    }
  }
};

/**
 * Hook for managing ONLY static season data with caching
 * Leaderboard and user stats are handled separately by the leaderboard system
 */
export function useSeasons(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<SeasonsState>({
    seasonData: null,
    isLoading: false,
    error: null,
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Get ONLY static season data - full caching, no API requests if cache exists
   */
  const fetchCurrentSeason = useCallback(async (): Promise<Season | null> => {
    // Prevent concurrent requests
    if (fetchingRef.current) {
      console.log('[SEASONS_HOOK] Another fetch is in progress, waiting...');
      return new Promise((resolve) => {
        const checkCompletion = () => {
          if (!fetchingRef.current) {
            resolve(state.seasonData);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });
    }

    console.log('[SEASONS_HOOK] Starting static season data fetch...');
    fetchingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1️⃣ PRIORITY: Check cache for static season data (auto-clears if expired)
      const cachedSeason = seasonCache.getCachedSeason();
      
      if (cachedSeason) {
        console.log(`[SEASONS_HOOK] ✅ Using CACHED static season data "${cachedSeason.name}" - NO API REQUEST!`);
        
        setState({
          seasonData: cachedSeason,
          isLoading: false,
          error: null,
        });

        return cachedSeason;
      }

      // 2️⃣ No cache - make SINGLE API request for static season data only
      console.log('[SEASONS_HOOK] 📡 No cached data found, fetching static data from API...');
      
      const response = await makeAuthenticatedRequest("/api/seasons/current");

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[SEASONS_HOOK] No active season found');
          setState({
            seasonData: null,
            isLoading: false,
            error: null,
          });
          return null;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch season data");
      }

      const seasonData: Season = result.data; // API now returns only static season data

      // 3️⃣ Cache ONLY static season data for future requests
      seasonCache.setCachedSeason(seasonData);
      console.log(`[SEASONS_HOOK] 💾 Cached static season data: ${seasonData.name}`);

      setState({
        seasonData: seasonData,
        isLoading: false,
        error: null,
      });

      return seasonData;

    } catch (error) {
      console.error("Error fetching season data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return null;
    } finally {
      fetchingRef.current = false;
      console.log('[SEASONS_HOOK] Fetch completed');
    }
  }, [makeAuthenticatedRequest]);

  /**
   * Clear cache and force refresh
   */
  const refetchWithoutCache = useCallback(async (): Promise<Season | null> => {
    console.log('[SEASONS_HOOK] Force refresh without cache');
    seasonCache.clearCache();
    return await fetchCurrentSeason();
  }, [fetchCurrentSeason]);

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
      seasonData: null,
      isLoading: false,
      error: null,
    });
    seasonCache.clearCache();
  }, []);

  /**
   * Check if season is currently active (client-side calculation)
   */
  const isSeasonActive = useCallback((): boolean => {
    if (!state.seasonData) return false;
    
    const now = new Date();
    const startDate = new Date(state.seasonData.start_date);
    const endDate = new Date(state.seasonData.end_date);
    
    return now >= startDate && now <= endDate;
  }, [state.seasonData]);

  /**
   * Check if season has started (client-side calculation)
   */
  const hasSeasonStarted = useCallback((): boolean => {
    if (!state.seasonData) return false;
    
    const now = new Date();
    const startDate = new Date(state.seasonData.start_date);
    
    return now >= startDate;
  }, [state.seasonData]);

  /**
   * Get formatted time remaining for active season (client-side calculation)
   */
  const getTimeRemaining = useCallback((): string | null => {
    if (!state.seasonData) return null;

    const now = new Date();
    const endDate = new Date(state.seasonData.end_date);
    const timeRemaining = endDate.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return null;

    const totalSeconds = Math.floor(timeRemaining / 1000);
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
  }, [state.seasonData]);

  /**
   * Cache management utilities - stable object through useMemo
   */
  const cacheManagement = useMemo(() => ({
    /**
     * Check if cached static season data exists
     */
    hasCachedData(): boolean {
      return seasonCache.getCachedSeason() !== null;
    },

    /**
     * Get cache information
     */
    getCacheInfo(): { hasCached: boolean; cachedSeasonName?: string; expiresAt?: string } | null {
      if (!seasonCache.isAvailable()) return null;

      const cached = seasonCache.getCachedSeason();
      if (!cached) return { hasCached: false };

      return {
        hasCached: true,
        cachedSeasonName: cached.name,
        expiresAt: cached.end_date,
      };
    },

    /**
     * Clear cache
     */
    clearCache(): boolean {
      return seasonCache.clearCache();
    },

    /**
     * Force refresh without cache
     */
    forceRefresh: refetchWithoutCache,
  }), [refetchWithoutCache]);

  return {
    // State - SIMPLIFIED: only static season data
    seasonData: state.seasonData,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchCurrentSeason,
    clearError,
    resetSeasonData,
    refetchWithoutCache,

    // Utility functions - client-side calculations
    isSeasonActive,
    hasSeasonStarted,
    getTimeRemaining,

    // Cache management
    cacheManagement,
  };
}