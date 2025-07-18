// src/types/league-definitions.ts - Core league type definitions

/**
 * Base league interface representing league configuration
 */
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

/**
 * League reward interface representing available rewards in leagues
 */
export interface LeagueReward {
    id: number;
    league_id: number;
    position: number;
    name: string;
    created_at: string;
}

/**
 * User league relationship interface
 */
export interface UserLeague {
    id: number;
    user_id: string;
    league_id: number;
    games_at_promotion: number;
    promoted_at: string;
    is_current: boolean;
    league?: League;
}

/**
 * User league reward interface representing rewards received by users
 */
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

/**
 * League progress information interface
 */
export interface LeagueProgressInfo {
    currentLeague: League;
    currentLevel: number;
    gamesToNextLeague: number;
    nextLeague: League | null;
    totalGames: number;
    progressPercent: number;
}

/**
 * League reward result interface for reward claiming operations
 */
export interface LeagueRewardResult {
    success: boolean;
    reward_type?: 'gift' | 'attempts';
    reward?: {
        id?: number;
        name?: string;
        position: number;
        league: string;
        type?: string;
        amount?: number;
    };
    reason?: string;
    error?: string;
}

/**
 * League leaderboard interface
 */
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

/**
 * League neighbors interface
 */
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