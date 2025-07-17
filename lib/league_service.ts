// src/lib/league_service.ts - Исправленный сервис с улучшенной логикой наград лиг

import { supabase } from "./supabase";

// Existing types remain the same...
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

export interface LeagueRewardResult {
  success: boolean;
  reward_type?: "gift" | "attempts";
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
  }>;
}

export interface LeagueNeighbors {
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

export const leagueService = {
  // Constants
  GAMES_PER_LEVEL: 100,
  MAX_LEVEL: 100,

  async getAllLeagues(): Promise<League[]> {
    const { data, error } = await supabase
      .from("leagues")
      .select("*")
      .order("min_games", { ascending: true });

    if (error) {
      console.error("Error fetching leagues:", error);
      throw error;
    }

    return data || [];
  },

  async getLeagueByGames(gamesCount: number): Promise<League | null> {
    const { data, error } = await supabase
      .from("leagues")
      .select("*")
      .lte("min_games", gamesCount)
      .or(`max_games.gte.${gamesCount},max_games.is.null`)
      .single();

    if (error) {
      console.error("Error fetching league by games:", error);

      return null;
    }

    return data;
  },

  calculateLevel(gamesCount: number): number {
    const level = Math.floor(gamesCount / this.GAMES_PER_LEVEL) + 1;

    return Math.min(level, this.MAX_LEVEL);
  },

  async getUserLeagueProgress(
    userId: string,
    totalGames: number,
  ): Promise<LeagueProgressInfo | null> {
    const currentLeague = await this.getLeagueByGames(totalGames);

    if (!currentLeague) return null;

    const leagues = await this.getAllLeagues();
    const currentLeagueIndex = leagues.findIndex(
      (l) => l.id === currentLeague.id,
    );
    const nextLeague =
      currentLeagueIndex < leagues.length - 1
        ? leagues[currentLeagueIndex + 1]
        : null;

    const currentLevel = this.calculateLevel(totalGames);
    const gamesToNextLeague = nextLeague
      ? Math.max(0, nextLeague.min_games - totalGames)
      : 0;

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
      progressPercent: Math.round(progressPercent),
    };
  },

  async getLeagueRewards(leagueId: number): Promise<LeagueReward[]> {
    const { data, error } = await supabase
      .from("league_rewards")
      .select("*")
      .eq("league_id", leagueId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching league rewards:", error);
      throw error;
    }

    return data || [];
  },

  async getAllLeagueRewards(): Promise<Record<number, LeagueReward[]>> {
    const { data, error } = await supabase
      .from("league_rewards")
      .select("*")
      .order("league_id", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching all league rewards:", error);
      throw error;
    }

    const rewardsByLeague: Record<number, LeagueReward[]> = {};

    (data || []).forEach((reward) => {
      if (!rewardsByLeague[reward.league_id]) {
        rewardsByLeague[reward.league_id] = [];
      }
      rewardsByLeague[reward.league_id].push(reward);
    });

    return rewardsByLeague;
  },

  async getLeagueNeighbors(
    userId: string,
    totalGames: number,
  ): Promise<LeagueNeighbors | null> {
    try {
      const currentLeague = await this.getLeagueByGames(totalGames);

      if (!currentLeague) return null;

      const { data: usersInLeague, error: usersError } = await supabase
        .from("users")
        .select(
          `
                    id,
                    first_name,
                    last_name,
                    username,
                    total_games
                `,
        )
        .gte("total_games", currentLeague.min_games)
        .lte("total_games", currentLeague.max_games || 999999)
        .order("total_games", { ascending: false });

      if (usersError) {
        console.error("Error fetching users in league:", usersError);

        return null;
      }

      if (!usersInLeague) return null;

      const userIndex = usersInLeague.findIndex((user) => user.id === userId);

      if (userIndex === -1) return null;

      const userPosition = userIndex + 1;
      const userGames = totalGames;

      const playersAhead = usersInLeague
        .slice(Math.max(0, userIndex - 2), userIndex)
        .map((player, index) => ({
          first_name: player.first_name,
          last_name: player.last_name,
          username: player.username,
          games_count: player.total_games,
          position: userPosition - (2 - index),
          games_ahead: player.total_games - userGames,
        }));

      const playersBehind = usersInLeague
        .slice(userIndex + 1, userIndex + 3)
        .map((player, index) => ({
          first_name: player.first_name,
          last_name: player.last_name,
          username: player.username,
          games_count: player.total_games,
          position: userPosition + index + 1,
          games_behind: userGames - player.total_games,
        }));

      return {
        league: currentLeague,
        userPosition,
        userGames,
        playersAhead,
        playersBehind,
      };
    } catch (error) {
      console.error("Error getting league neighbors:", error);

      return null;
    }
  },

  async getUserCurrentLeague(userId: string): Promise<UserLeague | null> {
    const { data, error } = await supabase
      .from("user_leagues")
      .select(
        `
                *,
                league:leagues(*)
            `,
      )
      .eq("user_id", userId)
      .eq("is_current", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user current league:", error);

      return null;
    }

    return data;
  },

  async getUserLeagueHistory(userId: string): Promise<UserLeague[]> {
    const { data, error } = await supabase
      .from("user_leagues")
      .select(
        `
                *,
                league:leagues(*)
            `,
      )
      .eq("user_id", userId)
      .order("promoted_at", { ascending: false });

    if (error) {
      console.error("Error fetching user league history:", error);
      throw error;
    }

    return data || [];
  },

  async getUserRewards(userId: string): Promise<UserLeagueReward[]> {
    const { data, error } = await supabase
      .from("user_league_rewards")
      .select(
        `
                *,
                reward:league_rewards(*),
                league:leagues(*)
            `,
      )
      .eq("user_id", userId)
      .order("received_at", { ascending: false });

    if (error) {
      console.error("Error fetching user rewards:", error);
      throw error;
    }

    return data || [];
  },

  // ИСПРАВЛЕНО: Улучшенная логика выдачи наград
  async claimLeagueReward(
    userId: string,
    leagueId: number,
    gamesCount: number,
  ): Promise<LeagueRewardResult> {
    try {
      return await this.claimLeagueRewardImproved(userId, leagueId, gamesCount);
    } catch (error) {
      console.error("Error in claimLeagueReward:", error);

      return {
        success: false,
        reason: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // НОВАЯ ФУНКЦИЯ: Правильная логика награждения с сортировкой по времени достижения лиги
  async claimLeagueRewardImproved(
    userId: string,
    leagueId: number,
    gamesCount: number,
  ): Promise<LeagueRewardResult> {
    try {
      // 1. Получаем информацию о лиге
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single();

      if (leagueError || !league) {
        return { success: false, reason: "league_not_found" };
      }

      // 2. Проверяем, что пользователь действительно достиг этой лиги
      if (gamesCount < league.min_games) {
        return { success: false, reason: "insufficient_games" };
      }

      // 3. Проверяем, не получал ли пользователь уже награду за эту лигу
      const { data: existingReward } = await supabase
        .from("user_league_rewards")
        .select("id")
        .eq("user_id", userId)
        .eq("league_id", leagueId)
        .maybeSingle();

      if (existingReward) {
        return { success: false, reason: "already_claimed" };
      }

      // 4. КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Получаем пользователей, отсортированных по времени достижения лиги
      const { data: usersInLeague, error: usersError } = await supabase
        .from("user_leagues")
        .select(
          `
                    user_id,
                    promoted_at,
                    games_at_promotion,
                    users!inner(
                        first_name,
                        last_name,
                        username
                    )
                `,
        )
        .eq("league_id", leagueId)
        .eq("is_current", true)
        .order("promoted_at", { ascending: true }); // Сортировка по времени достижения

      if (usersError || !usersInLeague) {
        return { success: false, reason: "error", error: usersError?.message };
      }

      // 5. Находим позицию текущего пользователя среди достигших лигу
      const userIndex = usersInLeague.findIndex((u) => u.user_id === userId);

      if (userIndex === -1) {
        return { success: false, reason: "user_not_in_league" };
      }

      const userPosition = userIndex + 1;

      // 6. Проверяем доступность наград для данной позиции
      const { data: availableRewards } = await supabase
        .from("league_rewards")
        .select("*")
        .eq("league_id", leagueId)
        .eq("position", userPosition)
        .maybeSingle();

      if (!availableRewards) {
        return { success: false, reason: "no_reward_for_position" };
      }

      // 7. Проверяем, не занята ли уже эта позиция другим игроком
      const { data: positionTaken } = await supabase
        .from("user_league_rewards")
        .select("id")
        .eq("league_id", leagueId)
        .eq("position", userPosition)
        .maybeSingle();

      if (positionTaken) {
        return { success: false, reason: "position_already_taken" };
      }

      // 8. Выдаем награду
      const { error: insertError } = await supabase
        .from("user_league_rewards")
        .insert({
          user_id: userId,
          league_id: leagueId,
          reward_id: availableRewards.id,
          position: userPosition,
          games_count: gamesCount,
          received_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error inserting reward:", insertError);

        return { success: false, reason: "error", error: insertError.message };
      }

      // 9. Возвращаем успешный результат
      return {
        success: true,
        reward_type: "gift",
        reward: {
          id: availableRewards.id,
          name: availableRewards.name,
          position: userPosition,
          league: league.name,
          type: "gift",
        },
      };
    } catch (error) {
      console.error("Error in claimLeagueRewardImproved:", error);

      return {
        success: false,
        reason: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // НОВАЯ ФУНКЦИЯ: Ретроактивная проверка пропущенных наград
  async checkMissedRewards(userId: string): Promise<LeagueRewardResult[]> {
    try {
      // Получаем историю лиг пользователя
      const { data: userLeagueHistory } = await supabase
        .from("user_leagues")
        .select(
          `
                    *,
                    league:leagues(*)
                `,
        )
        .eq("user_id", userId)
        .order("promoted_at", { ascending: true });

      if (!userLeagueHistory) return [];

      const missedRewards: LeagueRewardResult[] = [];

      // Проверяем каждую достигнутую лигу на предмет пропущенных наград
      for (const userLeague of userLeagueHistory) {
        if (userLeague.league?.name === "bronze") continue;

        const { data: existingReward } = await supabase
          .from("user_league_rewards")
          .select("id")
          .eq("user_id", userId)
          .eq("league_id", userLeague.league_id)
          .maybeSingle();

        // Если награда не была получена, пытаемся её выдать
        if (!existingReward) {
          const rewardResult = await this.claimLeagueRewardImproved(
            userId,
            userLeague.league_id,
            userLeague.games_at_promotion,
          );

          if (rewardResult.success) {
            missedRewards.push(rewardResult);
          }
        }
      }

      return missedRewards;
    } catch (error) {
      console.error("Error checking missed rewards:", error);

      return [];
    }
  },

  // ОБНОВЛЕНО: Включает проверку пропущенных наград
  async checkAndUpdateLeague(
    userId: string,
    newTotalGames: number,
  ): Promise<{
    leagueChanged: boolean;
    newLeague?: League;
    reward?: LeagueRewardResult;
    missedRewards?: LeagueRewardResult[];
  }> {
    try {
      const currentUserLeague = await this.getUserCurrentLeague(userId);
      const newLeague = await this.getLeagueByGames(newTotalGames);

      if (!newLeague) {
        return { leagueChanged: false };
      }

      if (currentUserLeague && currentUserLeague.league_id === newLeague.id) {
        // Даже если лига не изменилась, проверяем пропущенные награды
        const missedRewards = await this.checkMissedRewards(userId);

        return {
          leagueChanged: false,
          missedRewards: missedRewards.length > 0 ? missedRewards : undefined,
        };
      }

      const newLevel = this.calculateLevel(newTotalGames);

      await supabase
        .from("users")
        .update({
          current_level: newLevel,
          current_league_id: newLeague.id,
        })
        .eq("id", userId);

      if (currentUserLeague) {
        await supabase
          .from("user_leagues")
          .update({ is_current: false })
          .eq("id", currentUserLeague.id);
      }

      await supabase.from("user_leagues").insert({
        user_id: userId,
        league_id: newLeague.id,
        games_at_promotion: newTotalGames,
        is_current: true,
      });

      let rewardResult: LeagueRewardResult | undefined;

      if (newLeague.name !== "bronze") {
        rewardResult = await this.claimLeagueReward(
          userId,
          newLeague.id,
          newTotalGames,
        );
      }

      // Проверяем пропущенные награды из предыдущих лиг
      const missedRewards = await this.checkMissedRewards(userId);

      return {
        leagueChanged: true,
        newLeague,
        reward: rewardResult,
        missedRewards: missedRewards.length > 0 ? missedRewards : undefined,
      };
    } catch (error) {
      console.error("Error checking and updating league:", error);
      throw error;
    }
  },

  async getLeagueLeaderboard(
    leagueId: number,
    userId?: string,
  ): Promise<LeagueLeaderboard | null> {
    try {
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single();

      if (leagueError || !league) {
        console.error("Error fetching league:", leagueError);
        return null;
      }

      const { data: usersInLeague, error: usersError } = await supabase
        .from("users")
        .select(
          `
        id,
        first_name,
        last_name,
        username,
        total_games
      `,
        )
        .gte("total_games", league.min_games)
        .lte("total_games", league.max_games || 999999)
        .order("total_games", { ascending: false })
        .limit(100);

      if (usersError) {
        console.error("Error fetching users in league:", usersError);
        return null;
      }

      const { data: rewardsGiven, error: rewardsError } = await supabase
        .from("user_league_rewards")
        .select("user_id, position")
        .eq("league_id", leagueId)
        .order("position", { ascending: true });

      if (rewardsError) {
        console.error("Error fetching rewards given:", rewardsError);
      }

      const rewardsGivenCount = rewardsGiven?.length || 0;
      const rewardsRemaining = Math.max(
        0,
        league.rewards_count - rewardsGivenCount,
      );
      const rewardedUserIds = new Set(
        rewardsGiven?.map((r) => r.user_id) || [],
      );

      let userPosition: number | null = null;
      let userGamesToNextReward: number | null = null;

      if (userId && usersInLeague) {
        const userIndex = usersInLeague.findIndex((u) => u.id === userId);

        if (userIndex !== -1) {
          userPosition = userIndex + 1;

          if (rewardsRemaining > 0 && userPosition > rewardsGivenCount) {
            const nextRewardPosition = rewardsGivenCount + 1;

            if (userPosition > nextRewardPosition) {
              const userAheadGames =
                usersInLeague[nextRewardPosition - 1]?.total_games || 0;

              userGamesToNextReward = Math.max(
                0,
                userAheadGames - usersInLeague[userIndex].total_games + 1,
              );
            }
          }
        }
      }

      // ИСПРАВЛЕНИЕ: Убираем user_id из topPlayers для безопасности
      const topPlayers = (usersInLeague || [])
        .slice(0, 5)
        .map((user, index) => ({
          // user_id: user.id, // УБРАНО: не передаем чувствительную информацию
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          games_count: user.total_games,
          position: index + 1,
          got_reward: rewardedUserIds.has(user.id), // используем для проверки, но не передаем
        }));

      let nextRewardAt: number | null = null;

      if (
        rewardsRemaining > 0 &&
        usersInLeague &&
        usersInLeague.length > rewardsGivenCount
      ) {
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
        topPlayers,
      };
    } catch (error) {
      console.error("Error getting league leaderboard:", error);
      return null;
    }
  },

  async initializeUserLeague(
    userId: string,
    totalGames: number = 0,
  ): Promise<void> {
    try {
      const league = await this.getLeagueByGames(totalGames);

      if (!league) return;

      const level = this.calculateLevel(totalGames);

      await supabase
        .from("users")
        .update({
          current_level: level,
          current_league_id: league.id,
        })
        .eq("id", userId);

      await supabase.from("user_leagues").insert({
        user_id: userId,
        league_id: league.id,
        games_at_promotion: totalGames,
        is_current: true,
      });
    } catch (error) {
      console.error("Error initializing user league:", error);
      throw error;
    }
  },
};

export default leagueService;
