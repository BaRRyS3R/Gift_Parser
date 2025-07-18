// src/lib/server/leagueService.ts - Server-side league service

import { supabaseServer } from '@/lib/supabase_server';
import type { League, LeagueReward, UserLeague, UserLeagueReward } from '@/lib/league_service';

// Safe interfaces without sensitive data
export interface SafeLeagueProgressInfo {
    currentLeague: League;
    currentLevel: number;
    gamesToNextLeague: number;
    nextLeague: League | null;
    totalGames: number;
    progressPercent: number;
}

export interface SafeLeagueNeighbors {
    league: League;
    userPosition: number;
    userGames: number;
    playersAhead: Array<{
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        games_ahead: number;
    }>;
    playersBehind: Array<{
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        games_behind: number;
    }>;
}

export interface SafeLeagueLeaderboard {
    league: League;
    totalInLeague: number;
    rewardsGiven: number;
    rewardsRemaining: number;
    nextRewardAt: number | null;
    userPosition: number | null;
    userGamesToNextReward: number | null;
    topPlayers: Array<{
        first_name: string;
        last_name?: string;
        username?: string;
        games_count: number;
        position: number;
        got_reward: boolean;
        isCurrentUser?: boolean;
    }>;
}

export interface SafeUserLeagueReward {
    id: number;
    league_id: number;
    position: number;
    games_count: number;
    received_at: string;
    reward?: LeagueReward;
    league?: League;
}

export interface AllLeagueDataResponse {
    progress: SafeLeagueProgressInfo | null;
    allLeagues: League[];
    userRewards: SafeUserLeagueReward[];
    leaderboards: Record<number, SafeLeagueLeaderboard>;
    neighbors: SafeLeagueNeighbors | null;
    allLeagueRewards: Record<number, LeagueReward[]>;
}

export const serverLeagueService = {
    // Constants
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,

    /**
     * Get all leagues
     */
    async getAllLeagues(): Promise<League[]> {
        const { data, error } = await supabaseServer
            .from('leagues')
            .select('*')
            .order('min_games', { ascending: true });

        if (error) {
            console.error('Error fetching leagues:', error);
            throw new Error('Failed to fetch leagues');
        }

        return data || [];
    },

    /**
     * Get league by games count
     */
    async getLeagueByGames(gamesCount: number): Promise<League | null> {
        const { data, error } = await supabaseServer
            .from('leagues')
            .select('*')
            .lte('min_games', gamesCount)
            .or(`max_games.gte.${gamesCount},max_games.is.null`)
            .single();

        if (error) {
            console.error('Error fetching league by games:', error);
            return null;
        }

        return data;
    },

    /**
     * Calculate level from games count
     */
    calculateLevel(gamesCount: number): number {
        const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;
        return Math.min(level, this.MAX_LEVEL);
    },

    /**
     * Get user league progress (safe data only)
     */
    async getUserLeagueProgress(userId: string, totalGames: number): Promise<SafeLeagueProgressInfo | null> {
        const currentLeague = await this.getLeagueByGames(totalGames);
        if (!currentLeague) return null;

        const leagues = await this.getAllLeagues();
        const currentLeagueIndex = leagues.findIndex(l => l.id === currentLeague.id);
        const nextLeague = currentLeagueIndex < leagues.length - 1 ? leagues[currentLeagueIndex + 1] : null;

        const currentLevel = this.calculateLevel(totalGames);
        const gamesToNextLeague = nextLeague ? Math.max(0, nextLeague.min_games - totalGames) : 0;

        let progressPercent = 0;
        if (nextLeague) {
            const leagueRange = nextLeague.min_games - currentLeague.min_games;
            const currentProgress = totalGames - currentLeague.min_games;
            progressPercent = Math.min(100, (currentProgress / leagueRange) * 100);
        } else {
            progressPercent = 100;
        }

        return {
            currentLeague,
            currentLevel,
            gamesToNextLeague,
            nextLeague,
            totalGames,
            progressPercent: Math.round(progressPercent)
        };
    },

    /**
     * Get league neighbors (safe data without user IDs)
     */
    async getLeagueNeighbors(userId: string, totalGames: number): Promise<SafeLeagueNeighbors | null> {
        try {
            const currentLeague = await this.getLeagueByGames(totalGames);
            if (!currentLeague) return null;

            const { data: usersInLeague, error: usersError } = await supabaseServer
                .from('users')
                .select(`
                    id,
                    first_name,
                    last_name,
                    username,
                    total_games
                `)
                .gte('total_games', currentLeague.min_games)
                .lte('total_games', currentLeague.max_games || 999999)
                .order('total_games', { ascending: false });

            if (usersError) {
                console.error('Error fetching users in league:', usersError);
                return null;
            }

            if (!usersInLeague) return null;

            const userIndex = usersInLeague.findIndex(user => user.id === userId);
            if (userIndex === -1) return null;

            const userPosition = userIndex + 1;
            const userGames = totalGames;

            // Get players ahead (without user IDs)
            const playersAhead = usersInLeague
                .slice(Math.max(0, userIndex - 2), userIndex)
                .map((player, index) => ({
                    first_name: player.first_name,
                    last_name: player.last_name,
                    username: player.username,
                    games_count: player.total_games,
                    position: userPosition - (2 - index),
                    games_ahead: player.total_games - userGames
                }));

            // Get players behind (without user IDs)
            const playersBehind = usersInLeague
                .slice(userIndex + 1, userIndex + 3)
                .map((player, index) => ({
                    first_name: player.first_name,
                    last_name: player.last_name,
                    username: player.username,
                    games_count: player.total_games,
                    position: userPosition + index + 1,
                    games_behind: userGames - player.total_games
                }));

            return {
                league: currentLeague,
                userPosition,
                userGames,
                playersAhead,
                playersBehind
            };

        } catch (error) {
            console.error('Error getting league neighbors:', error);
            return null;
        }
    },

    /**
     * Get league leaderboard (safe data without user IDs)
     */
    async getLeagueLeaderboard(leagueId: number, currentUserId?: string): Promise<SafeLeagueLeaderboard | null> {
        try {
            const { data: league, error: leagueError } = await supabaseServer
                .from('leagues')
                .select('*')
                .eq('id', leagueId)
                .single();

            if (leagueError || !league) {
                console.error('Error fetching league:', leagueError);
                return null;
            }

            const { data: usersInLeague, error: usersError } = await supabaseServer
                .from('users')
                .select(`
                    id,
                    first_name,
                    last_name,
                    username,
                    total_games
                `)
                .gte('total_games', league.min_games)
                .lte('total_games', league.max_games || 999999)
                .order('total_games', { ascending: false })
                .limit(100);

            if (usersError) {
                console.error('Error fetching users in league:', usersError);
                return null;
            }

            const { data: rewardsGiven, error: rewardsError } = await supabaseServer
                .from('user_league_rewards')
                .select('user_id, position')
                .eq('league_id', leagueId)
                .order('position', { ascending: true });

            if (rewardsError) {
                console.error('Error fetching rewards given:', rewardsError);
            }

            const rewardsGivenCount = rewardsGiven?.length || 0;
            const rewardsRemaining = Math.max(0, league.rewards_count - rewardsGivenCount);
            const rewardedUserIds = new Set(rewardsGiven?.map(r => r.user_id) || []);

            let userPosition: number | null = null;
            let userGamesToNextReward: number | null = null;

            if (currentUserId && usersInLeague) {
                const userIndex = usersInLeague.findIndex(u => u.id === currentUserId);
                if (userIndex !== -1) {
                    userPosition = userIndex + 1;

                    if (rewardsRemaining > 0 && userPosition > rewardsGivenCount) {
                        const nextRewardPosition = rewardsGivenCount + 1;
                        if (userPosition > nextRewardPosition) {
                            const userAheadGames = usersInLeague[nextRewardPosition - 1]?.total_games || 0;
                            userGamesToNextReward = Math.max(0, userAheadGames - usersInLeague[userIndex].total_games + 1);
                        }
                    }
                }
            }

            // Create safe top players list (without user IDs)
            const topPlayers = (usersInLeague || []).slice(0, 5).map((user, index) => ({
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                games_count: user.total_games,
                position: index + 1,
                got_reward: rewardedUserIds.has(user.id),
                isCurrentUser: currentUserId ? user.id === currentUserId : false
            }));

            let nextRewardAt: number | null = null;
            if (rewardsRemaining > 0 && usersInLeague && usersInLeague.length > rewardsGivenCount) {
                nextRewardAt = usersInLeague[rewardsGivenCount]?.total_games || null;
            }

            return {
                league,
                totalInLeague: usersInLeague?.length || 0,
                rewardsGiven: rewardsGivenCount,
                rewardsRemaining,
                nextRewardAt,
                userPosition,
                userGamesToNextReward,
                topPlayers
            };

        } catch (error) {
            console.error('Error getting league leaderboard:', error);
            return null;
        }
    },

    /**
     * Get user league rewards (safe data)
     */
    async getUserRewards(userId: string): Promise<SafeUserLeagueReward[]> {
        const { data, error } = await supabaseServer
            .from('user_league_rewards')
            .select(`
                id,
                league_id,
                position,
                games_count,
                received_at,
                reward:league_rewards(*),
                league:leagues(*)
            `)
            .eq('user_id', userId)
            .order('received_at', { ascending: false });

        if (error) {
            console.error('Error fetching user rewards:', error);
            throw new Error('Failed to fetch user rewards');
        }

        return (data || []).map((reward: any) => ({
            id: reward.id,
            league_id: reward.league_id,
            position: reward.position,
            games_count: reward.games_count,
            received_at: reward.received_at,
            reward: Array.isArray(reward.reward) ? reward.reward[0] : reward.reward,
            league: Array.isArray(reward.league) ? reward.league[0] : reward.league
        }));
    },

    /**
     * Get all league rewards
     */
    async getAllLeagueRewards(): Promise<Record<number, LeagueReward[]>> {
        const { data, error } = await supabaseServer
            .from('league_rewards')
            .select('*')
            .order('league_id', { ascending: true })
            .order('position', { ascending: true });

        if (error) {
            console.error('Error fetching all league rewards:', error);
            throw new Error('Failed to fetch league rewards');
        }

        const rewardsByLeague: Record<number, LeagueReward[]> = {};
        (data || []).forEach(reward => {
            if (!rewardsByLeague[reward.league_id]) {
                rewardsByLeague[reward.league_id] = [];
            }
            rewardsByLeague[reward.league_id].push(reward);
        });

        return rewardsByLeague;
    },

    /**
     * Get all league data in a single request
     */
    async getAllLeagueData(userId: string, totalGames: number): Promise<AllLeagueDataResponse> {
        try {
            console.log(`Fetching all league data for user: ${userId}`);

            const [
                progress,
                allLeagues,
                userRewards,
                neighbors,
                allLeagueRewards
            ] = await Promise.all([
                this.getUserLeagueProgress(userId, totalGames),
                this.getAllLeagues(),
                this.getUserRewards(userId),
                this.getLeagueNeighbors(userId, totalGames),
                this.getAllLeagueRewards()
            ]);

            // Load leaderboards for all leagues
            const leaderboardPromises = allLeagues.map(async (league) => {
                const leaderboard = await this.getLeagueLeaderboard(league.id, userId);
                return { leagueId: league.id, leaderboard };
            });

            const leaderboardResults = await Promise.all(leaderboardPromises);
            const leaderboards: Record<number, SafeLeagueLeaderboard> = {};

            leaderboardResults.forEach(({ leagueId, leaderboard }) => {
                if (leaderboard) {
                    leaderboards[leagueId] = leaderboard;
                }
            });

            return {
                progress,
                allLeagues,
                userRewards,
                leaderboards,
                neighbors,
                allLeagueRewards
            };

        } catch (error) {
            console.error('Error fetching all league data:', error);
            throw new Error('Failed to fetch league data');
        }
    }
};