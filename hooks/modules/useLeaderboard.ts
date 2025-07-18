// src/hooks/modules/useLeaderboard.ts - Centralized leaderboard management

import { useState, useCallback, useRef } from 'react';

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
    cacheInfo: {
        lastUpdated: string;
        nextUpdate: string;
    };
}

export interface LeaderboardState {
    data: LeaderboardData | null;
    isLoading: boolean;
    error: string | null;
    lastFetch: number;
}

// Cache duration in milliseconds (5 minutes for client cache)
const CLIENT_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Centralized leaderboard management hook
 */
export function useLeaderboard(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<LeaderboardState>({
        data: null,
        isLoading: false,
        error: null,
        lastFetch: 0,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch all leaderboards from API
     */
    const fetchLeaderboards = useCallback(async (forceRefresh = false): Promise<LeaderboardData | null> => {
        // Check client-side cache
        const now = Date.now();
        const isCacheValid = state.data && !forceRefresh && (now - state.lastFetch) < CLIENT_CACHE_DURATION;

        if (isCacheValid && !forceRefresh) {
            console.log('Using cached leaderboard data');
            return state.data;
        }

        // Prevent duplicate requests
        if (fetchingRef.current) {
            console.log('Leaderboard fetch already in progress');
            return state.data;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching leaderboards from API...');

            const response = await makeAuthenticatedRequest('/api/leaderboard/all?limit=100');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch leaderboards');
            }

            const leaderboardData: LeaderboardData = result.data;

            setState({
                data: leaderboardData,
                isLoading: false,
                error: null,
                lastFetch: now,
            });

            console.log('Successfully fetched leaderboards:', {
                reaction: leaderboardData.reaction.length,
                survival: leaderboardData.survival.length,
                physics: leaderboardData.physics.length,
                rotation: leaderboardData.rotation.length,
                cacheInfo: leaderboardData.cacheInfo
            });

            return leaderboardData;

        } catch (error) {
            console.error('Error fetching leaderboards:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return null;
        } finally {
            fetchingRef.current = false;
        }
    }, [state.data, state.lastFetch, makeAuthenticatedRequest]);

    /**
     * Clear leaderboard cache (both client and server)
     */
    const clearCache = useCallback(async (): Promise<boolean> => {
        try {
            console.log('Clearing leaderboard cache...');

            // Clear server cache
            const response = await makeAuthenticatedRequest('/api/leaderboard/all', {
                method: 'POST',
            });

            if (!response.ok) {
                console.error('Failed to clear server cache');
                return false;
            }

            // Clear client cache
            setState(prev => ({
                ...prev,
                data: null,
                lastFetch: 0,
            }));

            console.log('Cache cleared successfully');
            return true;

        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Get cached leaderboard data if valid
     */
    const getCachedData = useCallback((): LeaderboardData | null => {
        const now = Date.now();
        const isCacheValid = state.data && (now - state.lastFetch) < CLIENT_CACHE_DURATION;

        if (isCacheValid) {
            return state.data;
        }

        return null;
    }, [state.data, state.lastFetch]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Check if user is in top leaderboard (within top 100)
     */
    const isUserInTopLeaderboard = useCallback((leaderboardType: 'reaction' | 'survival' | 'physics' | 'rotation'): boolean => {
        if (!state.data) return false;

        const leaderboard = state.data[leaderboardType];
        return leaderboard.some(entry => entry.isCurrentUser);
    }, [state.data]);

    /**
     * Get user position for a specific leaderboard type
     */
    const getUserPosition = useCallback((leaderboardType: 'reaction' | 'survival' | 'physics' | 'rotation'): number | null => {
        if (!state.data || !state.data.userRankings) return null;

        return state.data.userRankings[leaderboardType] || null;
    }, [state.data]);

    /**
     * Get time until next cache update
     */
    const getTimeUntilNextUpdate = useCallback((): number | null => {
        if (!state.data || !state.data.cacheInfo) return null;

        const nextUpdate = new Date(state.data.cacheInfo.nextUpdate).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, nextUpdate - now);

        return timeRemaining;
    }, [state.data]);

    /**
     * Format time remaining until next update
     */
    const formatTimeUntilUpdate = useCallback((): string | null => {
        const timeRemaining = getTimeUntilNextUpdate();
        if (timeRemaining === null) return null;

        const minutes = Math.floor(timeRemaining / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }, [getTimeUntilNextUpdate]);

    return {
        // State
        leaderboardData: state.data,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchLeaderboards,
        clearCache,
        getCachedData,
        clearError,

        // Utility functions
        isUserInTopLeaderboard,
        getUserPosition,
        getTimeUntilNextUpdate,
        formatTimeUntilUpdate,

        // Cache info
        hasValidCache: state.data && (Date.now() - state.lastFetch) < CLIENT_CACHE_DURATION,
        lastFetch: state.lastFetch,
        cacheInfo: state.data?.cacheInfo,
    };
}