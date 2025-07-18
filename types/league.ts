// src/types/league.ts - Consolidated league type exports using new definitions

// Export core league type definitions
export type {
    League,
    LeagueReward,
    UserLeague,
    UserLeagueReward,
    LeagueProgressInfo,
    LeagueRewardResult,
    LeagueLeaderboard,
    LeagueNeighbors
} from './league-definitions';

// Re-export server service interfaces for API responses
export type {
    SafeLeagueProgressInfo,
    SafeLeagueNeighbors,
    SafeLeagueLeaderboard,
    SafeUserLeagueReward,
    AllLeagueDataResponse,
    LeagueCheckResult
} from '@/lib/server/leagueService';

// Re-export achievement notification types for UI components
export type {
    AchievementNotificationData
} from '@/components/LeagueProgress/AchievementNotification';