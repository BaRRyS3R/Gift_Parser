// src/hooks/modules/useSeasons.ts - Упрощенный React hook с простой проверкой времени

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
  total_score: number;
  survival_best_time: number;
  survival_games: number;
  isCurrentUser?: boolean;
}

export interface SeasonUserStats {
  position: number | null;
  total_score: number;
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

// Константы для localStorage
const STORAGE_KEY = 'circusle_current_season';

/**
 * Простые утилиты для работы с localStorage кешем
 */
const seasonCache = {
  /**
   * Проверить доступность localStorage
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
   * Проверить, не закончился ли сезон
   */
  isSeasonExpired(endDate: string): boolean {
    const endTime = new Date(endDate).getTime();
    const currentTime = Date.now();
    return currentTime >= endTime;
  },

  /**
   * Сохранить данные сезона в localStorage
   */
  setCachedSeason(season: Season): boolean {
    if (!this.isAvailable()) return false;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(season));
      console.log(`[SEASONS_CACHE] Cached season "${season.name}" until ${season.end_date}`);
      return true;
    } catch (error) {
      console.warn('[SEASONS_CACHE] Failed to cache season:', error);
      return false;
    }
  },

  /**
   * Получить данные сезона из localStorage с проверкой времени
   */
  getCachedSeason(): Season | null {
    if (!this.isAvailable()) return null;

    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (!cached) {
        console.log('[SEASONS_CACHE] No cached season found');
        return null;
      }

      const season: Season = JSON.parse(cached);

      // Проверяем, не закончился ли сезон
      if (this.isSeasonExpired(season.end_date)) {
        console.log(`[SEASONS_CACHE] Season "${season.name}" expired, clearing cache`);
        this.clearCache();
        return null;
      }

      console.log(`[SEASONS_CACHE] Using cached season "${season.name}"`);
      return season;
    } catch (error) {
      console.warn('[SEASONS_CACHE] Failed to retrieve cached season:', error);
      this.clearCache(); // Очищаем поврежденные данные
      return null;
    }
  },

  /**
   * Очистить кеш
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
 * Hook для управления данными сезонов с простым кешированием
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
   * Получить данные сезона с простой логикой кеширования
   */
  const fetchCurrentSeason = useCallback(async (): Promise<CompleteSeasonData | null> => {
    // Предотвращаем параллельные запросы
    if (fetchingRef.current) {
      return new Promise((resolve) => {
        const checkCompletion = () => {
          if (!fetchingRef.current) {
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
      // 1️⃣ Проверяем кеш (с автоматической очисткой если сезон закончился)
      const cachedSeason = seasonCache.getCachedSeason();
      
      if (cachedSeason) {
        console.log(`[SEASONS_HOOK] Using cached season data for: ${cachedSeason.name}`);
        
        // Получаем только динамические данные (лидерборд и статистику)
        const response = await makeAuthenticatedRequest("/api/seasons/current");
        
        if (!response.ok) {
          if (response.status === 404) {
            // Если сезон больше не активен, очищаем кеш
            seasonCache.clearCache();
            setState({
              data: null,
              isLoading: false,
              error: null,
            });
            return null;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          // Объединяем кешированную статичную информацию с актуальными динамическими данными
          const completeData: CompleteSeasonData = {
            season: cachedSeason, // Из кеша
            leaderboard: result.data.leaderboard, // Свежие данные
            userStats: result.data.userStats, // Свежие данные
            isActive: result.data.isActive,
            timeRemaining: result.data.timeRemaining,
            hasStarted: result.data.hasStarted,
          };

          setState({
            data: completeData,
            isLoading: false,
            error: null,
          });

          return completeData;
        }
      }

      // 2️⃣ Кеша нет или сезон закончился - делаем полный запрос к API
      console.log('[SEASONS_HOOK] No valid cached data, fetching from API');
      
      const response = await makeAuthenticatedRequest("/api/seasons/current");

      if (!response.ok) {
        if (response.status === 404) {
          setState({
            data: null,
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

      const seasonData: CompleteSeasonData = result.data;

      // 3️⃣ Кешируем статичные данные нового сезона
      if (seasonData.season) {
        seasonCache.setCachedSeason(seasonData.season);
      }

      setState({
        data: seasonData,
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
    }
  }, [makeAuthenticatedRequest]);

  /**
   * Очистить кеш и принудительно загрузить данные
   */
  const refetchWithoutCache = useCallback(async (): Promise<CompleteSeasonData | null> => {
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
      data: null,
      isLoading: false,
      error: null,
    });
    seasonCache.clearCache();
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

  /**
   * Cache management utilities
   */
  const cacheManagement = {
    /**
     * Проверить наличие кешированных данных
     */
    hasCachedData(): boolean {
      return seasonCache.getCachedSeason() !== null;
    },

    /**
     * Получить информацию о кеше
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
     * Очистить кеш
     */
    clearCache(): boolean {
      return seasonCache.clearCache();
    },

    /**
     * Принудительно обновить данные без кеша
     */
    forceRefresh: refetchWithoutCache,
  };

  return {
    // State
    seasonData: state.data,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchCurrentSeason,
    clearError,
    resetSeasonData,
    refetchWithoutCache,

    // Utility functions
    isUserInTopLeaderboard,
    getUserPosition,
    isSeasonActive,
    getTimeRemaining,

    // Cache management
    cacheManagement,
  };
}