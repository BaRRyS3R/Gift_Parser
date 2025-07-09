// src/lib/league_service.ts - Сервис для работы с системой лиг и уровней

import { supabase } from './supabase';

// Типы для системы лиг
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
    league?: League; // Joined data
}

export interface UserLeagueReward {
    id: number;
    user_id: string;
    league_id: number;
    reward_id: number;
    position: number;
    games_count: number;
    received_at: string;
    reward?: LeagueReward; // Joined data
    league?: League; // Joined data
}

export interface LeagueProgressInfo {
    currentLeague: League;
    currentLevel: number;
    gamesToNextLeague: number;
    nextLeague: League | null;
    totalGames: number;
    progressPercent: number;
}

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

export interface LeagueLeaderboard {
    league: League;
    totalInLeague: number;
    rewardsGiven: number;
    rewardsRemaining: number;
    nextRewardAt: number | null; // games needed for next reward
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

export const leagueService = {
    // Константы системы
    GAMES_PER_LEVEL: 100,
    MAX_LEVEL: 100,

    // Получение всех лиг
    async getAllLeagues(): Promise<League[]> {
        const { data, error } = await supabase
            .from('leagues')
            .select('*')
            .order('min_games', { ascending: true });

        if (error) {
            console.error('Error fetching leagues:', error);
            throw error;
        }

        return data || [];
    },

    // Получение лиги по количеству игр
    async getLeagueByGames(gamesCount: number): Promise<League | null> {
        const { data, error } = await supabase
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

    // Расчет уровня по количеству игр
    calculateLevel(gamesCount: number): number {
        const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;
        return Math.min(level, this.MAX_LEVEL);
    },

    // Получение прогресса игрока
    async getUserLeagueProgress(userId: string, totalGames: number): Promise<LeagueProgressInfo | null> {
        const currentLeague = await this.getLeagueByGames(totalGames);
        if (!currentLeague) return null;

        const leagues = await this.getAllLeagues();
        const currentLeagueIndex = leagues.findIndex(l => l.id === currentLeague.id);
        const nextLeague = currentLeagueIndex < leagues.length - 1 ? leagues[currentLeagueIndex + 1] : null;

        const currentLevel = this.calculateLevel(totalGames);
        const gamesToNextLeague = nextLeague ? Math.max(0, nextLeague.min_games - totalGames) : 0;

        // Расчет процента прогресса в текущей лиге
        let progressPercent = 0;
        if (nextLeague) {
            const leagueRange = nextLeague.min_games - currentLeague.min_games;
            const currentProgress = totalGames - currentLeague.min_games;
            progressPercent = Math.min(100, (currentProgress / leagueRange) * 100);
        } else {
            // Для последней лиги показываем 100%
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

    // Получение текущей лиги пользователя
    async getUserCurrentLeague(userId: string): Promise<UserLeague | null> {
        const { data, error } = await supabase
            .from('user_leagues')
            .select(`
        *,
        league:leagues(*)
      `)
            .eq('user_id', userId)
            .eq('is_current', true)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user current league:', error);
            return null;
        }

        return data;
    },

    // Получение истории лиг пользователя
    async getUserLeagueHistory(userId: string): Promise<UserLeague[]> {
        const { data, error } = await supabase
            .from('user_leagues')
            .select(`
        *,
        league:leagues(*)
      `)
            .eq('user_id', userId)
            .order('promoted_at', { ascending: false });

        if (error) {
            console.error('Error fetching user league history:', error);
            throw error;
        }

        return data || [];
    },

    // Получение наград пользователя
    async getUserRewards(userId: string): Promise<UserLeagueReward[]> {
        const { data, error } = await supabase
            .from('user_league_rewards')
            .select(`
        *,
        reward:league_rewards(*),
        league:leagues(*)
      `)
            .eq('user_id', userId)
            .order('received_at', { ascending: false });

        if (error) {
            console.error('Error fetching user rewards:', error);
            throw error;
        }

        return data || [];
    },

    // Проверка и обновление лиги после игры
    async checkAndUpdateLeague(userId: string, newTotalGames: number): Promise<{
        leagueChanged: boolean;
        newLeague?: League;
        reward?: LeagueRewardResult;
    }> {
        try {
            // Получаем текущую лигу пользователя
            const currentUserLeague = await this.getUserCurrentLeague(userId);
            const newLeague = await this.getLeagueByGames(newTotalGames);

            if (!newLeague) {
                return { leagueChanged: false };
            }

            // Если лига не изменилась
            if (currentUserLeague && currentUserLeague.league_id === newLeague.id) {
                return { leagueChanged: false };
            }

            // Обновляем уровень пользователя
            const newLevel = this.calculateLevel(newTotalGames);
            await supabase
                .from('users')
                .update({
                    current_level: newLevel,
                    current_league_id: newLeague.id
                })
                .eq('id', userId);

            // Деактивируем текущую лигу
            if (currentUserLeague) {
                await supabase
                    .from('user_leagues')
                    .update({ is_current: false })
                    .eq('id', currentUserLeague.id);
            }

            // Создаем запись о новой лиге
            await supabase
                .from('user_leagues')
                .insert({
                    user_id: userId,
                    league_id: newLeague.id,
                    games_at_promotion: newTotalGames,
                    is_current: true
                });

            // Проверяем награды только если это не бронзовая лига
            let rewardResult: LeagueRewardResult | undefined;
            if (newLeague.name !== 'bronze') {
                rewardResult = await this.claimLeagueReward(userId, newLeague.id, newTotalGames);
            }

            return {
                leagueChanged: true,
                newLeague,
                reward: rewardResult
            };

        } catch (error) {
            console.error('Error checking and updating league:', error);
            throw error;
        }
    },

    // Получение награды за лигу (атомарно)
    async claimLeagueReward(userId: string, leagueId: number, gamesCount: number): Promise<LeagueRewardResult> {
        try {
            const { data, error } = await supabase.rpc('claim_league_reward', {
                p_user_id: userId,
                p_league_id: leagueId,
                p_games_count: gamesCount
            });

            if (error) {
                console.error('Error claiming league reward:', error);
                throw error;
            }

            return data as LeagueRewardResult;
        } catch (error) {
            console.error('Error in claimLeagueReward:', error);
            return {
                success: false,
                reason: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    // Получение лидерборда лиги
    async getLeagueLeaderboard(leagueId: number, userId?: string): Promise<LeagueLeaderboard | null> {
        try {
            // Получаем информацию о лиге
            const { data: league, error: leagueError } = await supabase
                .from('leagues')
                .select('*')
                .eq('id', leagueId)
                .single();

            if (leagueError || !league) {
                console.error('Error fetching league:', leagueError);
                return null;
            }

            // Получаем пользователей в этой лиге
            const { data: usersInLeague, error: usersError } = await supabase
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
                .limit(50);

            if (usersError) {
                console.error('Error fetching users in league:', usersError);
                return null;
            }

            // Получаем информацию о выданных наградах
            const { data: rewardsGiven, error: rewardsError } = await supabase
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

            // Определяем позицию пользователя и расстояние до награды
            let userPosition: number | null = null;
            let userGamesToNextReward: number | null = null;

            if (userId && usersInLeague) {
                const userIndex = usersInLeague.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    userPosition = userIndex + 1;

                    // Расчет игр до следующей награды
                    if (rewardsRemaining > 0 && userPosition > rewardsGivenCount) {
                        const nextRewardPosition = rewardsGivenCount + 1;
                        if (userPosition > nextRewardPosition) {
                            const userAheadGames = usersInLeague[nextRewardPosition - 1]?.total_games || 0;
                            userGamesToNextReward = Math.max(0, userAheadGames - usersInLeague[userIndex].total_games + 1);
                        }
                    }
                }
            }

            // Формируем топ игроков
            const topPlayers = (usersInLeague || []).slice(0, 10).map((user, index) => ({
                user_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                games_count: user.total_games,
                position: index + 1,
                got_reward: rewardedUserIds.has(user.id)
            }));

            // Определяем количество игр для следующей награды
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

    // Инициализация лиги для нового пользователя
    async initializeUserLeague(userId: string, totalGames: number = 0): Promise<void> {
        try {
            const league = await this.getLeagueByGames(totalGames);
            if (!league) return;

            const level = this.calculateLevel(totalGames);

            // Обновляем пользователя
            await supabase
                .from('users')
                .update({
                    current_level: level,
                    current_league_id: league.id
                })
                .eq('id', userId);

            // Создаем запись о лиге
            await supabase
                .from('user_leagues')
                .insert({
                    user_id: userId,
                    league_id: league.id,
                    games_at_promotion: totalGames,
                    is_current: true
                });

        } catch (error) {
            console.error('Error initializing user league:', error);
            throw error;
        }
    }
};

export default leagueService;