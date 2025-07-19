// src/hooks/modules/useLeagues.ts - Client-side leagues management hook

import { useState, useCallback, useRef } from 'react';

// Import types from server service
export interface League {
    id: number;
    name: string;
    display_name_en: string;
    display_name_ru: string;
    min_games: number;
    max_games: number | null;
    color: string;
    icon: string;
    rewards_count: number;
    created_at: string;
}

export interface LeagueReward {
    id: number;
    league_id: number;
    position: number;
    name: string;
    created_at: string;
}

export interface UserLeague {
    id: number;
    user_id: string;
    league_id: number;
    games_at_promotion: number;
    promoted_at: string;
    is_current: boolean;
    league?: League;
}

export interface UserLeagueReward {
    id: number;
    user_id: string;
    league_id: number;
    reward_id: number;
    position: number;
    games_count: number;
    received_at: string;
    reward?: LeagueReward;
    league?: League;
}

export interface LeagueProgressInfo {
    currentLeague: League;
    currentLevel: number;
    gamesToNextLeague: number;
    nextLeague: League | null;
    totalGames: number;
    progressPercent: number;
}

export interface LeagueLeaderboard {
    league: League;
    totalInLeague: number;
    rewardsGiven: number;
    rewardsRemaining: number;
    nextRewardAt: number | null;
    userPosition: number | null;
    userGamesToNextReward: number | null;
    topPlayers: Array<{
        user_id: string;
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        got_reward: boolean;
    }>;
}

export interface LeagueNeighbors {
    league: League;
    userPosition: number;
    userGames: number;
    playersAhead: Array<{
        user_id: string;
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        games_ahead: number;
    }>;
    playersBehind: Array<{
        user_id: string;
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        games_behind: number;
    }>;
}

export interface CompleteLeagueData {
    leagues: League[];
    progressInfo: LeagueProgressInfo | null;
    userRewards: UserLeagueReward[];
    leaderboards: Record<number, LeagueLeaderboard>;
    neighbors: LeagueNeighbors | null;
    allLeagueRewards: Record<number, LeagueReward[]>;
}

// Hook state interface
interface LeaguesState {
    data: CompleteLeagueData | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Client-side level calculation utilities
 */
export const leagueUtils = {
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,

    /**
     * Calculate level from games count
     */
    calculateLevel(gamesCount: number): number {
        const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;
        return Math.min(level, this.MAX_LEVEL);
    },

    /**
     * Get games needed for next level
     */
    getGamesToNextLevel(currentGames: number): number {
        const currentLevel = this.calculateLevel(currentGames);

        if (currentLevel >= this.MAX_LEVEL) {
            return 0; // Already at max level
        }

        const nextLevelGames = currentLevel * this.GAMES_PER_LEVEL;
        return nextLevelGames - currentGames;
    },

    /**
     * Get progress percentage to next level
     */
    getLevelProgress(currentGames: number): number {
        const currentLevel = this.calculateLevel(currentGames);

        if (currentLevel >= this.MAX_LEVEL) {
            return 100;
        }

        const gamesInCurrentLevel = currentGames % this.GAMES_PER_LEVEL;
        return Math.round((gamesInCurrentLevel / this.GAMES_PER_LEVEL) * 100);
    },

    /**
     * Check if user is at max level
     */
    isMaxLevel(currentGames: number): boolean {
        return this.calculateLevel(currentGames) >= this.MAX_LEVEL;
    },
};

/**
 * Client-side leagues management hook
 */
export function useLeagues(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<LeaguesState>({
        data: null,
        isLoading: false,
        error: null,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch complete league data from API
     */
    const fetchLeagueData = useCallback(async (): Promise<CompleteLeagueData | null> => {
        // Prevent duplicate requests
        if (fetchingRef.current) {
            console.log('League data fetch already in progress');
            return state.data;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching fresh league data from API...');

            const response = await makeAuthenticatedRequest('/api/leagues');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch league data');
            }

            const leagueData: CompleteLeagueData = result.data;

            setState({
                data: leagueData,
                isLoading: false,
                error: null,
            });

            console.log('Successfully fetched league data:', {
                leagues: leagueData.leagues.length,
                hasProgressInfo: !!leagueData.progressInfo,
                userRewards: leagueData.userRewards.length,
                hasNeighbors: !!leagueData.neighbors,
                leaderboards: Object.keys(leagueData.leaderboards).length,
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
     * Reset league data
     */
    const resetLeagueData = useCallback(() => {
        console.log('Resetting league data');
        setState({
            data: null,
            isLoading: false,
            error: null,
        });
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Get league by name
     */
    const getLeagueByName = useCallback((leagueName: string): League | null => {
        if (!state.data?.leagues) return null;
        return state.data.leagues.find(league => league.name === leagueName) || null;
    }, [state.data]);

    /**
     * Get user position in specific league leaderboard
     */
    const getUserPositionInLeague = useCallback((leagueId: number): number | null => {
        if (!state.data?.leaderboards) return null;
        const leaderboard = state.data.leaderboards[leagueId];
        return leaderboard?.userPosition || null;
    }, [state.data]);

    /**
     * Check if user has received reward for specific league
     */
    const hasUserReceivedReward = useCallback((leagueId: number): boolean => {
        if (!state.data?.userRewards) return false;
        return state.data.userRewards.some(reward => reward.league_id === leagueId);
    }, [state.data]);

    /**
     * Get total rewards earned by user
     */
    const getTotalRewardsEarned = useCallback((): number => {
        if (!state.data?.userRewards) return 0;
        return state.data.userRewards.length;
    }, [state.data]);

    /**
     * Check if user is in current league's top players
     * Note: This function requires the current user's ID to be passed as parameter
     * since the leagues data doesn't contain user identification
     */
    const isUserInTopPlayers = useCallback((currentUserId?: string, leagueId?: number): boolean => {
        if (!state.data?.leaderboards || !currentUserId) return false;

        const targetLeagueId = leagueId || state.data.progressInfo?.currentLeague.id;
        if (!targetLeagueId) return false;

        const leaderboard = state.data.leaderboards[targetLeagueId];
        if (!leaderboard) return false;

        return leaderboard.topPlayers.some(player =>
            player.user_id === currentUserId
        );
    }, [state.data]);

    return {
        // State
        leagueData: state.data,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchLeagueData,
        resetLeagueData,
        clearError,

        // Utility functions
        getLeagueByName,
        getUserPositionInLeague,
        hasUserReceivedReward,
        getTotalRewardsEarned,
        isUserInTopPlayers,

        // Client-side utilities
        leagueUtils,

        // Computed values for convenience
        leagues: state.data?.leagues || [],
        progressInfo: state.data?.progressInfo || null,
        userRewards: state.data?.userRewards || [],
        leaderboards: state.data?.leaderboards || {},
        neighbors: state.data?.neighbors || null,
        allLeagueRewards: state.data?.allLeagueRewards || {},
    };
}