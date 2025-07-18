// src/hooks/modules/useLeagues.ts - Leagues management hook module

import { useState, useCallback, useRef } from 'react';
import type {
    CompactLeagueData,
    FullLeagueData,
    SafeLeague,
    SafeLeagueProgress,
    SafeUserLeagueReward,
    SafeLeagueLeaderboard,
    SafeLeagueNeighbors
} from '@/lib/server/leaguesService';

// Leagues state interface
interface LeaguesState {
    // Compact data for main page
    compactData: CompactLeagueData | null;
    compactLastUpdate: number;
    compactLoading: boolean;
    compactError: string | null;

    // Full data for leagues modal
    fullData: FullLeagueData | null;
    fullLastUpdate: number;
    fullLoading: boolean;
    fullError: string | null;
}

// Cache duration in milliseconds
const COMPACT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for main page data
const FULL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for modal data

/**
 * Leagues management hook with separate compact and full data management
 * Provides league progress, rewards, leaderboards, and neighbor information
 */
export function useLeagues(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<LeaguesState>({
        compactData: null,
        compactLastUpdate: 0,
        compactLoading: false,
        compactError: null,

        fullData: null,
        fullLastUpdate: 0,
        fullLoading: false,
        fullError: null,
    });

    // Track current requests to prevent duplicates
    const fetchingCompactRef = useRef<boolean>(false);
    const fetchingFullRef = useRef<boolean>(false);

    /**
     * Fetch compact league data for main page
     */
    const fetchCompactLeagues = useCallback(async (forceRefresh = false): Promise<CompactLeagueData | null> => {
        // Check cache validity
        const now = Date.now();
        const isCacheValid = state.compactData && !forceRefresh && (now - state.compactLastUpdate) < COMPACT_CACHE_DURATION;

        if (isCacheValid && !forceRefresh) {
            console.log('Using cached compact league data');
            return state.compactData;
        }

        // Prevent duplicate requests
        if (fetchingCompactRef.current) {
            console.log('Compact league fetch already in progress');
            return state.compactData;
        }

        fetchingCompactRef.current = true;
        setState(prev => ({ ...prev, compactLoading: true, compactError: null }));

        try {
            console.log('Fetching compact league data from API...');

            const response = await makeAuthenticatedRequest('/api/leagues/progress');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch league progress');
            }

            const compactData: CompactLeagueData = result.data;

            setState(prev => ({
                ...prev,
                compactData,
                compactLastUpdate: now,
                compactLoading: false,
                compactError: null,
            }));

            console.log('Successfully fetched compact league data:', {
                currentLeague: compactData.currentLeague.name,
                currentLevel: compactData.currentLevel,
                progressPercent: compactData.progressPercent
            });

            return compactData;

        } catch (error) {
            console.error('Error fetching compact league data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                compactLoading: false,
                compactError: errorMessage,
            }));

            return null;
        } finally {
            fetchingCompactRef.current = false;
        }
    }, [state.compactData, state.compactLastUpdate, makeAuthenticatedRequest]);

    /**
     * Fetch full league data for leagues modal
     */
    const fetchFullLeagues = useCallback(async (forceRefresh = false): Promise<FullLeagueData | null> => {
        // Check cache validity
        const now = Date.now();
        const isCacheValid = state.fullData && !forceRefresh && (now - state.fullLastUpdate) < FULL_CACHE_DURATION;

        if (isCacheValid && !forceRefresh) {
            console.log('Using cached full league data');
            return state.fullData;
        }

        // Prevent duplicate requests
        if (fetchingFullRef.current) {
            console.log('Full league fetch already in progress');
            return state.fullData;
        }

        fetchingFullRef.current = true;
        setState(prev => ({ ...prev, fullLoading: true, fullError: null }));

        try {
            console.log('Fetching full league data from API...');

            const response = await makeAuthenticatedRequest('/api/leagues/full');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch league data');
            }

            const fullData: FullLeagueData = result.data;

            setState(prev => ({
                ...prev,
                fullData,
                fullLastUpdate: now,
                fullLoading: false,
                fullError: null,
            }));

            console.log('Successfully fetched full league data:', {
                currentLeague: fullData.progress.currentLeague.name,
                allLeaguesCount: fullData.allLeagues.length,
                userRewardsCount: fullData.userRewards.length,
                leaderboardsCount: Object.keys(fullData.leaderboards).length,
                hasNeighbors: !!fullData.neighbors
            });

            return fullData;

        } catch (error) {
            console.error('Error fetching full league data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                fullLoading: false,
                fullError: errorMessage,
            }));

            return null;
        } finally {
            fetchingFullRef.current = false;
        }
    }, [state.fullData, state.fullLastUpdate, makeAuthenticatedRequest]);

    /**
     * Get cached compact league data if valid
     */
    const getCachedCompactLeagues = useCallback((): CompactLeagueData | null => {
        const now = Date.now();
        const isCacheValid = state.compactData && (now - state.compactLastUpdate) < COMPACT_CACHE_DURATION;

        return isCacheValid ? state.compactData : null;
    }, [state.compactData, state.compactLastUpdate]);

    /**
     * Get cached full league data if valid
     */
    const getCachedFullLeagues = useCallback((): FullLeagueData | null => {
        const now = Date.now();
        const isCacheValid = state.fullData && (now - state.fullLastUpdate) < FULL_CACHE_DURATION;

        return isCacheValid ? state.fullData : null;
    }, [state.fullData, state.fullLastUpdate]);

    /**
     * Invalidate compact cache
     */
    const invalidateCompactCache = useCallback(() => {
        console.log('Invalidating compact league cache');
        setState(prev => ({
            ...prev,
            compactLastUpdate: 0,
        }));
    }, []);

    /**
     * Invalidate full cache
     */
    const invalidateFullCache = useCallback(() => {
        console.log('Invalidating full league cache');
        setState(prev => ({
            ...prev,
            fullLastUpdate: 0,
        }));
    }, []);

    /**
     * Invalidate all league caches
     */
    const invalidateAllCaches = useCallback(() => {
        console.log('Invalidating all league caches');
        setState(prev => ({
            ...prev,
            compactLastUpdate: 0,
            fullLastUpdate: 0,
        }));
    }, []);

    /**
     * Clear compact error state
     */
    const clearCompactError = useCallback(() => {
        setState(prev => ({ ...prev, compactError: null }));
    }, []);

    /**
     * Clear full error state
     */
    const clearFullError = useCallback(() => {
        setState(prev => ({ ...prev, fullError: null }));
    }, []);

    /**
     * Clear all error states
     */
    const clearAllErrors = useCallback(() => {
        setState(prev => ({
            ...prev,
            compactError: null,
            fullError: null,
        }));
    }, []);

    /**
     * Reset all league state
     */
    const resetLeagues = useCallback(() => {
        setState({
            compactData: null,
            compactLastUpdate: 0,
            compactLoading: false,
            compactError: null,

            fullData: null,
            fullLastUpdate: 0,
            fullLoading: false,
            fullError: null,
        });
    }, []);

    /**
     * Get current league from compact data
     */
    const getCurrentLeague = useCallback((): SafeLeague | null => {
        return state.compactData?.currentLeague || state.fullData?.progress.currentLeague || null;
    }, [state.compactData, state.fullData]);

    /**
     * Get current level from any available data
     */
    const getCurrentLevel = useCallback((): number | null => {
        return state.compactData?.currentLevel || state.fullData?.progress.currentLevel || null;
    }, [state.compactData, state.fullData]);

    /**
     * Check if user has any league rewards
     */
    const hasRewards = useCallback((): boolean => {
        return !!(state.fullData?.userRewards && state.fullData.userRewards.length > 0);
    }, [state.fullData]);

    /**
     * Check if compact data is available
     */
    const hasCompactData = useCallback((): boolean => {
        return !!state.compactData;
    }, [state.compactData]);

    /**
     * Check if full data is available
     */
    const hasFullData = useCallback((): boolean => {
        return !!state.fullData;
    }, [state.fullData]);

    return {
        // Compact data state
        compactData: state.compactData,
        compactLoading: state.compactLoading,
        compactError: state.compactError,

        // Full data state
        fullData: state.fullData,
        fullLoading: state.fullLoading,
        fullError: state.fullError,

        // Actions
        fetchCompactLeagues,
        fetchFullLeagues,
        getCachedCompactLeagues,
        getCachedFullLeagues,

        // Cache management
        invalidateCompactCache,
        invalidateFullCache,
        invalidateAllCaches,

        // Error management
        clearCompactError,
        clearFullError,
        clearAllErrors,
        resetLeagues,

        // Utility functions
        getCurrentLeague,
        getCurrentLevel,
        hasRewards,
        hasCompactData,
        hasFullData,
        hasValidCompactCache: state.compactData && (Date.now() - state.compactLastUpdate) < COMPACT_CACHE_DURATION,
        hasValidFullCache: state.fullData && (Date.now() - state.fullLastUpdate) < FULL_CACHE_DURATION,
    };
}