// src/hooks/modules/useLeague.ts - Client-side league management hook

import { useState, useCallback, useRef } from 'react';

// Import types from league service for compatibility
import type { League, LeagueReward } from '@/lib/league_service';

// Import server types for API responses
import type {
    SafeLeagueProgressInfo,
    SafeLeagueNeighbors,
    SafeLeagueLeaderboard,
    SafeUserLeagueReward,
    AllLeagueDataResponse
} from '@/lib/server/leagueService';

// Hook state interface
interface LeagueState {
    data: AllLeagueDataResponse | null;
    isLoading: boolean;
    error: string | null;
    lastUpdate: number;
}

/**
 * Centralized league management hook
 * Replaces direct usage of league_service.ts in components
 */
export function useLeague(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<LeagueState>({
        data: null,
        isLoading: false,
        error: null,
        lastUpdate: 0,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch all league data from API
     */
    const fetchLeagueData = useCallback(async (): Promise<AllLeagueDataResponse | null> => {
        // Prevent duplicate requests
        if (fetchingRef.current) {
            console.log('League data fetch already in progress');
            return state.data;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching league data from API...');

            const response = await makeAuthenticatedRequest('/api/league/all');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch league data');
            }

            const leagueData: AllLeagueDataResponse = result.data;

            setState({
                data: leagueData,
                isLoading: false,
                error: null,
                lastUpdate: Date.now(),
            });

            console.log('League data fetched successfully:', {
                hasProgress: !!leagueData.progress,
                leaguesCount: leagueData.allLeagues.length,
                userRewardsCount: leagueData.userRewards.length,
                leaderboardsCount: Object.keys(leagueData.leaderboards).length,
                hasNeighbors: !!leagueData.neighbors,
            });

            return leagueData;

        } catch (error) {
            console.error('Error fetching league data:', error);
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
    }, [makeAuthenticatedRequest]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Reset league state
     */
    const resetLeagueData = useCallback(() => {
        setState({
            data: null,
            isLoading: false,
            error: null,
            lastUpdate: 0,
        });
    }, []);

    /**
     * Get current league progress info
     */
    const getProgressInfo = useCallback((): SafeLeagueProgressInfo | null => {
        return state.data?.progress || null;
    }, [state.data]);

    /**
     * Get all leagues
     */
    const getAllLeagues = useCallback((): League[] => {
        return state.data?.allLeagues || [];
    }, [state.data]);

    /**
     * Get user league rewards
     */
    const getUserRewards = useCallback((): SafeUserLeagueReward[] => {
        return state.data?.userRewards || [];
    }, [state.data]);

    /**
     * Get league leaderboards
     */
    const getLeaderboards = useCallback((): Record<number, SafeLeagueLeaderboard> => {
        return state.data?.leaderboards || {};
    }, [state.data]);

    /**
     * Get league neighbors
     */
    const getNeighbors = useCallback((): SafeLeagueNeighbors | null => {
        return state.data?.neighbors || null;
    }, [state.data]);

    /**
     * Get all league rewards
     */
    const getAllLeagueRewards = useCallback((): Record<number, LeagueReward[]> => {
        return state.data?.allLeagueRewards || {};
    }, [state.data]);

    /**
     * Get leaderboard for specific league
     */
    const getLeagueLeaderboard = useCallback((leagueId: number): SafeLeagueLeaderboard | null => {
        return state.data?.leaderboards[leagueId] || null;
    }, [state.data]);

    /**
     * Get current league info
     */
    const getCurrentLeague = useCallback((): League | null => {
        return state.data?.progress?.currentLeague || null;
    }, [state.data]);

    /**
     * Get next league info
     */
    const getNextLeague = useCallback((): League | null => {
        return state.data?.progress?.nextLeague || null;
    }, [state.data]);

    /**
     * Calculate level from games count (client-side utility)
     */
    const calculateLevel = useCallback((gamesCount: number): number => {
        const GAMES_PER_LEVEL = 100;
        const MAX_LEVEL = 100;
        const level = Math.floor(gamesCount / GAMES_PER_LEVEL) + 1;
        return Math.min(level, MAX_LEVEL);
    }, []);

    /**
     * Get current level
     */
    const getCurrentLevel = useCallback((): number => {
        return state.data?.progress?.currentLevel || 1;
    }, [state.data]);

    /**
     * Check if user is in specific league
     */
    const isUserInLeague = useCallback((leagueName: string): boolean => {
        return state.data?.progress?.currentLeague?.name === leagueName;
    }, [state.data]);

    /**
     * Check if user has received reward for specific league
     */
    const hasRewardForLeague = useCallback((leagueId: number): boolean => {
        const userRewards = state.data?.userRewards || [];
        return userRewards.some(reward => reward.league_id === leagueId);
    }, [state.data]);

    /**
     * Get user position in specific league leaderboard
     */
    const getUserPositionInLeague = useCallback((leagueId: number): number | null => {
        const leaderboard = state.data?.leaderboards[leagueId];
        return leaderboard?.userPosition || null;
    }, [state.data]);

    return {
        // State
        leagueData: state.data,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchLeagueData,
        clearError,
        resetLeagueData,

        // Data getters
        getProgressInfo,
        getAllLeagues,
        getUserRewards,
        getLeaderboards,
        getNeighbors,
        getAllLeagueRewards,
        getLeagueLeaderboard,
        getCurrentLeague,
        getNextLeague,
        getCurrentLevel,

        // Utility functions
        calculateLevel,
        isUserInLeague,
        hasRewardForLeague,
        getUserPositionInLeague,
    };
}