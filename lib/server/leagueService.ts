// src/lib/server/leagueService.ts - Updated server-side league service with consolidated type imports

import { supabaseServer } from '@/lib/supabase_server';
import type {
    League,
    LeagueReward,
    UserLeague,
    UserLeagueReward,
    LeagueRewardResult
} from '@/types/league-definitions';

// Safe interfaces without sensitive data for API responses
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

// League check result interface for game completion processing
export interface LeagueCheckResult {
    leagueChanged: boolean;
    newLeague?: League;
    reward?: LeagueRewardResult;
    missedRewards?: LeagueRewardResult[];
}

export const serverLeagueService = {
    // Configuration constants for level calculation
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,

    /**
     * Retrieve all leagues ordered by minimum games requirement
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
     * Determine appropriate league based on user's total games count
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
     * Calculate user level based on total games played
     */
    calculateLevel(gamesCount: number): number {
        const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;
        return Math.min(level, this.MAX_LEVEL);
    },

    /**
     * Generate comprehensive league progress information for user
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
     * Retrieve neighboring players in user's current league
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

            // Generate list of players positioned ahead of current user
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

            // Generate list of players positioned behind current user
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
     * Generate comprehensive leaderboard data for specific league
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

            // Generate sanitized top players list for public display
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
     * Retrieve sanitized league rewards data for user
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
     * Retrieve all available league rewards organized by league
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
     * Aggregate all league-related data for comprehensive user interface
     */
    async getAllLeagueData(userId: string, totalGames: number): Promise<AllLeagueDataResponse> {
        try {
            console.log(`Fetching comprehensive league data for user: ${userId}`);

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

            // Generate leaderboards for all leagues asynchronously
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
            console.error('Error fetching comprehensive league data:', error);
            throw new Error('Failed to fetch league data');
        }
    },

    /**
     * Initialize league configuration for new user accounts
     */
    async initializeUserLeague(userId: string, totalGames: number = 0): Promise<void> {
        try {
            const league = await this.getLeagueByGames(totalGames);
            if (!league) {
                throw new Error('No appropriate league found for game count');
            }

            const level = this.calculateLevel(totalGames);

            // Update user profile with initial league information
            await supabaseServer
                .from('users')
                .update({
                    current_level: level,
                    current_league_id: league.id
                })
                .eq('id', userId);

            // Create initial user league relationship record
            await supabaseServer
                .from('user_leagues')
                .insert({
                    user_id: userId,
                    league_id: league.id,
                    games_at_promotion: totalGames,
                    is_current: true
                });

            console.log(`League initialization completed for user ${userId}: ${league.name} (Level ${level})`);

        } catch (error) {
            console.error('Error initializing user league:', error);
            throw new Error('Failed to initialize user league configuration');
        }
    },

    /**
     * Process league advancement after game completion
     */
    async checkAndUpdateLeague(userId: string, newTotalGames: number): Promise<LeagueCheckResult> {
        try {
            // Retrieve current user league status
            const { data: currentUserLeague } = await supabaseServer
                .from('user_leagues')
                .select(`
                    *,
                    league:leagues(*)
                `)
                .eq('user_id', userId)
                .eq('is_current', true)
                .maybeSingle();

            const newLeague = await this.getLeagueByGames(newTotalGames);

            if (!newLeague) {
                return { leagueChanged: false };
            }

            // Determine if league advancement has occurred
            if (currentUserLeague && currentUserLeague.league_id === newLeague.id) {
                return { leagueChanged: false };
            }

            const newLevel = this.calculateLevel(newTotalGames);

            // Update user profile with new league and level information
            await supabaseServer
                .from('users')
                .update({
                    current_level: newLevel,
                    current_league_id: newLeague.id
                })
                .eq('id', userId);

            // Deactivate previous league relationship
            if (currentUserLeague) {
                await supabaseServer
                    .from('user_leagues')
                    .update({ is_current: false })
                    .eq('id', currentUserLeague.id);
            }

            // Establish new league relationship record
            await supabaseServer
                .from('user_leagues')
                .insert({
                    user_id: userId,
                    league_id: newLeague.id,
                    games_at_promotion: newTotalGames,
                    is_current: true
                });

            // Process reward eligibility for new league
            let rewardResult: LeagueRewardResult | undefined;
            if (newLeague.name !== 'bronze') {
                rewardResult = await this.claimLeagueReward(userId, newLeague.id, newTotalGames);
            }

            // Assess eligibility for previously missed rewards
            const missedRewards = await this.checkMissedRewards(userId);

            console.log(`League advancement processed for user ${userId}: ${newLeague.name} (Level ${newLevel})`);

            return {
                leagueChanged: true,
                newLeague,
                reward: rewardResult,
                missedRewards: missedRewards.length > 0 ? missedRewards : undefined
            };

        } catch (error) {
            console.error('Error processing league advancement:', error);
            throw new Error('Failed to update league status');
        }
    },

    /**
     * Process league reward claiming with position-based eligibility
     */
    async claimLeagueReward(userId: string, leagueId: number, gamesCount: number): Promise<LeagueRewardResult> {
        try {
            // Validate league configuration
            const { data: league, error: leagueError } = await supabaseServer
                .from('leagues')
                .select('*')
                .eq('id', leagueId)
                .single();

            if (leagueError || !league) {
                return { success: false, reason: 'league_not_found' };
            }

            // Verify reward eligibility
            const { data: existingReward } = await supabaseServer
                .from('user_league_rewards')
                .select('id')
                .eq('user_id', userId)
                .eq('league_id', leagueId)
                .maybeSingle();

            if (existingReward) {
                return { success: false, reason: 'already_claimed' };
            }

            // Determine user position based on league achievement timing
            const { data: usersInLeague, error: usersError } = await supabaseServer
                .from('user_leagues')
                .select(`
                    user_id,
                    promoted_at,
                    games_at_promotion,
                    users!inner(
                        first_name,
                        last_name,
                        username
                    )
                `)
                .eq('league_id', leagueId)
                .eq('is_current', true)
                .order('promoted_at', { ascending: true });

            if (usersError || !usersInLeague) {
                return { success: false, reason: 'error', error: usersError?.message };
            }

            // Calculate user position within league
            const userIndex = usersInLeague.findIndex(u => u.user_id === userId);
            if (userIndex === -1) {
                return { success: false, reason: 'user_not_in_league' };
            }

            const userPosition = userIndex + 1;

            // Validate reward availability for position
            const { data: availableRewards } = await supabaseServer
                .from('league_rewards')
                .select('*')
                .eq('league_id', leagueId)
                .eq('position', userPosition)
                .maybeSingle();

            if (!availableRewards) {
                return { success: false, reason: 'no_reward_for_position' };
            }

            // Ensure position exclusivity
            const { data: positionTaken } = await supabaseServer
                .from('user_league_rewards')
                .select('id')
                .eq('league_id', leagueId)
                .eq('position', userPosition)
                .maybeSingle();

            if (positionTaken) {
                return { success: false, reason: 'position_already_taken' };
            }

            // Execute reward granting
            const { error: insertError } = await supabaseServer
                .from('user_league_rewards')
                .insert({
                    user_id: userId,
                    league_id: leagueId,
                    reward_id: availableRewards.id,
                    position: userPosition,
                    games_count: gamesCount,
                    received_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Error granting reward:', insertError);
                return { success: false, reason: 'error', error: insertError.message };
            }

            return {
                success: true,
                reward_type: 'gift',
                reward: {
                    id: availableRewards.id,
                    name: availableRewards.name,
                    position: userPosition,
                    league: league.name,
                    type: 'gift'
                }
            };

        } catch (error) {
            console.error('Error processing league reward claim:', error);
            return {
                success: false,
                reason: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    /**
     * Audit and process previously missed league rewards
     */
    async checkMissedRewards(userId: string): Promise<LeagueRewardResult[]> {
        try {
            // Retrieve comprehensive user league history
            const { data: userLeagueHistory } = await supabaseServer
                .from('user_leagues')
                .select(`
                    *,
                    league:leagues(*)
                `)
                .eq('user_id', userId)
                .order('promoted_at', { ascending: true });

            if (!userLeagueHistory) return [];

            const missedRewards: LeagueRewardResult[] = [];

            // Process each achieved league for potential missed rewards
            for (const userLeague of userLeagueHistory) {
                if (userLeague.league?.name === 'bronze') continue;

                const { data: existingReward } = await supabaseServer
                    .from('user_league_rewards')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('league_id', userLeague.league_id)
                    .maybeSingle();

                // Attempt reward claiming for leagues without existing rewards
                if (!existingReward) {
                    const rewardResult = await this.claimLeagueReward(
                        userId,
                        userLeague.league_id,
                        userLeague.games_at_promotion
                    );

                    if (rewardResult.success) {
                        missedRewards.push(rewardResult);
                    }
                }
            }

            return missedRewards;
        } catch (error) {
            console.error('Error processing missed rewards audit:', error);
            return [];
        }
    }
};