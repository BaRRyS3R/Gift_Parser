// src/lib/server/leaguesService.ts - Dedicated leagues service module

import { supabaseServer } from '@/lib/supabase_server';
import leagueService from '@/lib/league_service';

// Safe league interfaces (server-side, no sensitive user data)
export interface SafeLeague {
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

export interface SafeLeagueProgress {
    currentLeague: SafeLeague;
    currentLevel: number;
    gamesToNextLeague: number;
    nextLeague: SafeLeague | null;
    totalGames: number;
    progressPercent: number;
}

export interface SafeLeagueReward {
    id: number;
    league_id: number;
    position: number;
    name: string;
    created_at: string;
}

export interface SafeUserLeagueReward {
    id: number;
    league_id: number;
    reward_id: number;
    position: number;
    games_count: number;
    received_at: string;
    reward?: SafeLeagueReward;
    league?: SafeLeague;
}

export interface SafeLeagueLeaderboardPlayer {
    // NOTE: No user_id or telegram_id exposed for security
    first_name: string;
    last_name?: string;
    username?: string;
    games_count: number;
    position: number;
    got_reward: boolean;
    is_current_user?: boolean;
}

export interface SafeLeagueLeaderboard {
    league: SafeLeague;
    totalInLeague: number;
    rewardsGiven: number;
    rewardsRemaining: number;
    nextRewardAt: number | null;
    userPosition: number | null;
    userGamesToNextReward: number | null;
    topPlayers: SafeLeagueLeaderboardPlayer[];
}

export interface SafeLeagueNeighborPlayer {
    // NOTE: No user_id or telegram_id exposed for security
    first_name: string;
    last_name?: string;
    username?: string;
    games_count: number;
    position: number;
    games_difference: number; // positive = ahead, negative = behind
}

export interface SafeLeagueNeighbors {
    league: SafeLeague;
    userPosition: number;
    userGames: number;
    playersAhead: SafeLeagueNeighborPlayer[];
    playersBehind: SafeLeagueNeighborPlayer[];
}

// Compact league data for main page
export interface CompactLeagueData {
    currentLeague: SafeLeague;
    currentLevel: number;
    totalGames: number;
    gamesToNextLeague: number;
    nextLeague: SafeLeague | null;
    progressPercent: number;
}

// Full league data for leagues modal
export interface FullLeagueData {
    progress: SafeLeagueProgress;
    allLeagues: SafeLeague[];
    userRewards: SafeUserLeagueReward[];
    leaderboards: Record<number, SafeLeagueLeaderboard>;
    neighbors: SafeLeagueNeighbors | null;
    allLeagueRewards: Record<number, SafeLeagueReward[]>;
}

// Server-side leagues service
export const serverLeaguesService = {
    /**
     * Get compact league data for main page
     */
    async getCompactLeagueData(userId: string, totalGames: number): Promise<CompactLeagueData | null> {
        try {
            const progressInfo = await leagueService.getUserLeagueProgress(userId, totalGames);

            if (!progressInfo) {
                return null;
            }

            return {
                currentLeague: this.sanitizeLeague(progressInfo.currentLeague),
                currentLevel: progressInfo.currentLevel,
                totalGames: progressInfo.totalGames,
                gamesToNextLeague: progressInfo.gamesToNextLeague,
                nextLeague: progressInfo.nextLeague ? this.sanitizeLeague(progressInfo.nextLeague) : null,
                progressPercent: progressInfo.progressPercent,
            };
        } catch (error) {
            console.error('Error getting compact league data:', error);
            return null;
        }
    },

    /**
     * Get full league data for leagues modal
     */
    async getFullLeagueData(userId: string, totalGames: number): Promise<FullLeagueData> {
        try {
            const [
                progressInfo,
                allLeagues,
                userRewards,
                neighbors,
                allLeagueRewards
            ] = await Promise.all([
                leagueService.getUserLeagueProgress(userId, totalGames),
                leagueService.getAllLeagues(),
                leagueService.getUserRewards(userId),
                leagueService.getLeagueNeighbors(userId, totalGames),
                leagueService.getAllLeagueRewards(),
            ]);

            if (!progressInfo) {
                throw new Error('Unable to get league progress');
            }

            // Get leaderboards for all leagues
            const leaderboardPromises = allLeagues.map(async (league) => {
                const leaderboard = await leagueService.getLeagueLeaderboard(league.id, userId);
                return { leagueId: league.id, leaderboard };
            });

            const leaderboardResults = await Promise.all(leaderboardPromises);
            const leaderboards: Record<number, SafeLeagueLeaderboard> = {};

            leaderboardResults.forEach(({ leagueId, leaderboard }) => {
                if (leaderboard) {
                    leaderboards[leagueId] = this.sanitizeLeagueLeaderboard(leaderboard, userId);
                }
            });

            return {
                progress: {
                    currentLeague: this.sanitizeLeague(progressInfo.currentLeague),
                    currentLevel: progressInfo.currentLevel,
                    gamesToNextLeague: progressInfo.gamesToNextLeague,
                    nextLeague: progressInfo.nextLeague ? this.sanitizeLeague(progressInfo.nextLeague) : null,
                    totalGames: progressInfo.totalGames,
                    progressPercent: progressInfo.progressPercent,
                },
                allLeagues: allLeagues.map(league => this.sanitizeLeague(league)),
                userRewards: userRewards.map(reward => this.sanitizeUserReward(reward)),
                leaderboards,
                neighbors: neighbors ? this.sanitizeLeagueNeighbors(neighbors, userId) : null,
                allLeagueRewards: this.sanitizeAllLeagueRewards(allLeagueRewards),
            };
        } catch (error) {
            console.error('Error getting full league data:', error);
            throw new Error('Failed to get league data');
        }
    },

    /**
     * Sanitize league data (remove sensitive fields)
     */
    sanitizeLeague(league: any): SafeLeague {
        return {
            id: league.id,
            name: league.name,
            display_name_en: league.display_name_en,
            display_name_ru: league.display_name_ru,
            min_games: league.min_games,
            max_games: league.max_games,
            color: league.color,
            icon: league.icon,
            rewards_count: league.rewards_count,
            created_at: league.created_at,
        };
    },

    /**
     * Sanitize user league reward (remove sensitive fields)
     */
    sanitizeUserReward(reward: any): SafeUserLeagueReward {
        return {
            id: reward.id,
            league_id: reward.league_id,
            reward_id: reward.reward_id,
            position: reward.position,
            games_count: reward.games_count,
            received_at: reward.received_at,
            reward: reward.reward ? {
                id: reward.reward.id,
                league_id: reward.reward.league_id,
                position: reward.reward.position,
                name: reward.reward.name,
                created_at: reward.reward.created_at,
            } : undefined,
            league: reward.league ? this.sanitizeLeague(reward.league) : undefined,
        };
    },

    /**
     * Sanitize league leaderboard (remove sensitive user data)
     * WARNING: This removes user_id and telegram_id for security
     */
    sanitizeLeagueLeaderboard(leaderboard: any, currentUserId: string): SafeLeagueLeaderboard {
        return {
            league: this.sanitizeLeague(leaderboard.league),
            totalInLeague: leaderboard.totalInLeague,
            rewardsGiven: leaderboard.rewardsGiven,
            rewardsRemaining: leaderboard.rewardsRemaining,
            nextRewardAt: leaderboard.nextRewardAt,
            userPosition: leaderboard.userPosition,
            userGamesToNextReward: leaderboard.userGamesToNextReward,
            topPlayers: leaderboard.topPlayers.map((player: any) => ({
                // SECURITY: Do not include user_id or telegram_id
                first_name: player.first_name,
                last_name: player.last_name,
                username: player.username,
                games_count: player.games_count,
                position: player.position,
                got_reward: player.got_reward,
                is_current_user: player.user_id === currentUserId,
            })),
        };
    },

    /**
     * Sanitize league neighbors (remove sensitive user data)
     * WARNING: This removes user_id and telegram_id for security
     */
    sanitizeLeagueNeighbors(neighbors: any, currentUserId: string): SafeLeagueNeighbors {
        return {
            league: this.sanitizeLeague(neighbors.league),
            userPosition: neighbors.userPosition,
            userGames: neighbors.userGames,
            playersAhead: neighbors.playersAhead.map((player: any) => ({
                // SECURITY: Do not include user_id or telegram_id
                first_name: player.first_name,
                last_name: player.last_name,
                username: player.username,
                games_count: player.games_count,
                position: player.position,
                games_difference: player.games_ahead, // positive for ahead
            })),
            playersBehind: neighbors.playersBehind.map((player: any) => ({
                // SECURITY: Do not include user_id or telegram_id
                first_name: player.first_name,
                last_name: player.last_name,
                username: player.username,
                games_count: player.games_count,
                position: player.position,
                games_difference: -player.games_behind, // negative for behind
            })),
        };
    },

    /**
     * Sanitize all league rewards
     */
    sanitizeAllLeagueRewards(allRewards: Record<number, any[]>): Record<number, SafeLeagueReward[]> {
        const sanitized: Record<number, SafeLeagueReward[]> = {};

        Object.entries(allRewards).forEach(([leagueId, rewards]) => {
            sanitized[parseInt(leagueId)] = rewards.map(reward => ({
                id: reward.id,
                league_id: reward.league_id,
                position: reward.position,
                name: reward.name,
                created_at: reward.created_at,
            }));
        });

        return sanitized;
    },
};