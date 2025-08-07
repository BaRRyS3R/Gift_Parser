// src/lib/server/tournamentService.ts - Fixed server-side tournament service

import { supabaseServer } from "@/lib/supabase_server";
import {
  Tournament,
  TournamentDetails,
  TournamentLeaderboardEntry,
  TournamentStats,
  TournamentResult,
  TournamentFilters,
  TournamentStatus,
  getTournamentStatusFromDates,
  TOURNAMENT_CONSTANTS,
} from "@/types/tournaments";

export interface TournamentLeaderboardData {
  leaderboard: TournamentLeaderboardEntry[];
  user_position?: number;
  total_participants: number;
  stats: TournamentStats;
}

export interface TournamentSubmitResult {
  result: TournamentResult;
  position: number;
  position_changed: boolean;
  is_new_best: boolean;
}

export const serverTournamentService = {
  /**
   * Получение списка турниров с фильтрацией
   */
  async getTournaments(filters: TournamentFilters = {}): Promise<Tournament[]> {
    try {
      let query = supabaseServer
        .from("tournaments")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (filters.status) {
        // Для статуса мы не можем полагаться только на БД,
        // так как статус вычисляется на основе дат
        query = query.eq("status", filters.status);
      }

      if (filters.game_mode) {
        query = query.eq("game_mode", filters.game_mode);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 50) - 1,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tournaments:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Обновляем статусы на основе текущего времени
      const tournaments = (data || []).map((tournament) => ({
        ...tournament,
        status: getTournamentStatusFromDates(
          tournament.start_date,
          tournament.end_date,
        ),
      }));

      // Применяем фильтр статуса после обновления
      if (filters.status) {
        return tournaments.filter((t) => t.status === filters.status);
      }

      return tournaments;
    } catch (error) {
      console.error("Error in getTournaments:", error);
      throw error;
    }
  },

  /**
   * Получение детальной информации о турнире
   */
  async getTournamentDetails(
    tournamentId: string,
    userId?: string,
  ): Promise<TournamentDetails> {
    try {
      // Основная информация о турнире
      const { data: tournament, error: tournamentError } = await supabaseServer
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .eq("is_active", true)
        .single();

      if (tournamentError || !tournament) {
        throw new Error("Tournament not found");
      }

      // Подсчет участников
      const { count: participantCount } = await supabaseServer
        .from("tournament_results")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);

      // Информация о пользователе (если передан userId)
      let userResult: TournamentResult | undefined;
      let userPosition: number | undefined;

      if (userId) {
        const { data: userResultData } = await supabaseServer
          .from("tournament_results")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("user_id", userId)
          .maybeSingle();

        if (userResultData) {
          userResult = userResultData;

          // Получаем позицию пользователя
          const { count: position } = await supabaseServer
            .from("tournament_results")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournamentId)
            .gt("best_score", userResultData.best_score);

          userPosition = (position || 0) + 1;
        }
      }

      const tournamentDetails: TournamentDetails = {
        ...tournament,
        status: getTournamentStatusFromDates(
          tournament.start_date,
          tournament.end_date,
        ),
        participant_count: participantCount || 0,
        user_result: userResult,
        user_position: userPosition,
      };

      return tournamentDetails;
    } catch (error) {
      console.error("Error in getTournamentDetails:", error);
      throw error;
    }
  },

  /**
   * Получение лидерборда турнира
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    userId?: string,
    limit: number = TOURNAMENT_CONSTANTS.DEFAULT_LEADERBOARD_LIMIT,
  ): Promise<TournamentLeaderboardData> {
    try {
      // Проверяем существование турнира
      const { data: tournament, error: tournamentError } = await supabaseServer
        .from("tournaments")
        .select("id, name")
        .eq("id", tournamentId)
        .eq("is_active", true)
        .single();

      if (tournamentError || !tournament) {
        throw new Error("Tournament not found");
      }

      // Получаем лидерборд
      const { data: leaderboardData, error: leaderboardError } =
        await supabaseServer
          .from("tournament_results")
          .select(
            `
                    *,
                    users!inner(
                        id,
                        telegram_id,
                        first_name,
                        last_name,
                        username
                    )
                `,
          )
          .eq("tournament_id", tournamentId)
          .order("best_score", { ascending: false })
          .order("last_game_at", { ascending: true }) // При равных очках, кто раньше достиг
          .limit(Math.min(limit, TOURNAMENT_CONSTANTS.MAX_LEADERBOARD_LIMIT));

      if (leaderboardError) {
        throw new Error(
          `Failed to fetch leaderboard: ${leaderboardError.message}`,
        );
      }

      // Формируем лидерборд
      const leaderboard: TournamentLeaderboardEntry[] = (
        leaderboardData || []
      ).map((entry, index) => ({
        position: index + 1,
        user_id: entry.user_id,
        first_name: entry.users.first_name,
        last_name: entry.users.last_name,
        username: entry.users.username,
        best_score: entry.best_score,
        games_played: entry.games_played,
        total_score: entry.total_score,
        last_game_at: entry.last_game_at,
        isCurrentUser: userId ? entry.user_id === userId : false,
      }));

      // Получаем общую статистику
      const { data: statsData } = await supabaseServer
        .from("tournament_results")
        .select("best_score, games_played, total_score")
        .eq("tournament_id", tournamentId);

      const totalParticipants = statsData?.length || 0;
      const totalGamesPlayed =
        statsData?.reduce((sum, result) => sum + result.games_played, 0) || 0;
      const highestScore = Math.max(
        ...(statsData?.map((r) => r.best_score) || [0]),
      );
      const averageScore =
        totalParticipants > 0
          ? (statsData?.reduce((sum, result) => sum + result.best_score, 0) ||
              0) / totalParticipants
          : 0;

      // Позиция пользователя (если не в топе)
      let userPosition: number | undefined;

      if (userId && !leaderboard.find((entry) => entry.user_id === userId)) {
        const { count: position } = await supabaseServer
          .from("tournament_results")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", tournamentId);

        if (position !== null) {
          userPosition = position + 1;
        }
      }

      const stats: TournamentStats = {
        total_participants: totalParticipants,
        total_games_played: totalGamesPlayed,
        average_score: Math.round(averageScore),
        highest_score: highestScore,
        games_per_day: [], // Можно добавить позже если нужно
      };

      return {
        leaderboard,
        user_position: userPosition,
        total_participants: totalParticipants,
        stats,
      };
    } catch (error) {
      console.error("Error in getTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * Проверка возможности участия в турнире
   */
  async canUserParticipate(
    tournamentId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data: tournament, error } = await supabaseServer
        .from("tournaments")
        .select("status, start_date, end_date, is_active, max_participants")
        .eq("id", tournamentId)
        .single();

      if (error || !tournament) {
        return false;
      }

      // Проверяем статус турнира
      const currentStatus = getTournamentStatusFromDates(
        tournament.start_date,
        tournament.end_date,
      );

      if (currentStatus !== TournamentStatus.ACTIVE || !tournament.is_active) {
        return false;
      }

      // Проверяем лимит участников (если установлен)
      if (tournament.max_participants) {
        const { count: participantCount } = await supabaseServer
          .from("tournament_results")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", tournamentId);

        if ((participantCount || 0) >= tournament.max_participants) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in canUserParticipate:", error);

      return false;
    }
  },

  /**
   * Отправка результата турнира
   */
  async submitTournamentResult(
    tournamentId: string,
    userId: string,
    telegramId: number,
    gameScore: number,
  ): Promise<TournamentSubmitResult> {
    try {
      // Проверяем возможность участия
      const canParticipate = await this.canUserParticipate(
        tournamentId,
        userId,
      );

      if (!canParticipate) {
        throw new Error("Cannot participate in this tournament");
      }

      // Получаем текущий результат пользователя
      const { data: existingResult } = await supabaseServer
        .from("tournament_results")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .maybeSingle();

      const now = new Date().toISOString();
      let result: TournamentResult;
      let isNewBest = false;

      if (existingResult) {
        // Обновляем существующий результат
        const newBestScore = Math.max(existingResult.best_score, gameScore);

        isNewBest = gameScore > existingResult.best_score;

        const { data: updatedResult, error } = await supabaseServer
          .from("tournament_results")
          .update({
            best_score: newBestScore,
            games_played: existingResult.games_played + 1,
            total_score: existingResult.total_score + gameScore,
            last_game_at: now,
            updated_at: now,
          })
          .eq("id", existingResult.id)
          .select()
          .single();

        if (error) {
          throw new Error(
            `Failed to update tournament result: ${error.message}`,
          );
        }

        result = updatedResult;
      } else {
        // Создаем новый результат
        isNewBest = true;

        const { data: newResult, error } = await supabaseServer
          .from("tournament_results")
          .insert({
            tournament_id: tournamentId,
            user_id: userId,
            telegram_id: telegramId,
            best_score: gameScore,
            games_played: 1,
            total_score: gameScore,
            first_game_at: now,
            last_game_at: now,
          })
          .select()
          .single();

        if (error) {
          throw new Error(
            `Failed to create tournament result: ${error.message}`,
          );
        }

        result = newResult;
      }

      // Получаем новую позицию
      const { count: position } = await supabaseServer
        .from("tournament_results")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .gt("best_score", result.best_score);

      const newPosition = (position || 0) + 1;

      // Определяем, изменилась ли позиция
      let positionChanged = false;

      if (existingResult && isNewBest) {
        const { count: oldPosition } = await supabaseServer
          .from("tournament_results")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", tournamentId)
          .gt("best_score", existingResult.best_score);

        positionChanged = newPosition !== (oldPosition || 0) + 1;
      } else if (!existingResult) {
        positionChanged = true;
      }

      return {
        result,
        position: newPosition,
        position_changed: positionChanged,
        is_new_best: isNewBest,
      };
    } catch (error) {
      console.error("Error in submitTournamentResult:", error);
      throw error;
    }
  },
};
