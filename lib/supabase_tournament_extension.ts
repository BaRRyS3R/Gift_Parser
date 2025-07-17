// src/lib/supabase_tournament_extension.ts - Обновленные типы с полями спонсора

import { supabase } from "./supabase";

// Обновленные типы с поддержкой спонсорских полей
export interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;

  // Новые поля для спонсора
  sponsor_name?: string;
  sponsor_channel_url?: string;
  sponsor_image_url?: string;
}

export interface TournamentLeaderboardEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  survival_time: number;
  survival_score: number;
  last_game_score: number;
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  created_at: string;
  rank: number;
}

export interface TournamentResult {
  id?: string;
  tournament_id: string;
  user_id: string;
  survival_time: number;
  survival_score: number;
  last_game_score: number;
  max_level_reached: number;
  perfect_streak: number;
  correct_hits: number;
  death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  games_played: number;
  rank?: number;
  created_at?: string;
}

export interface TournamentStatus {
  isActive: boolean;
  activeTournament: Tournament | null;
  timeRemaining?: number;
  hasStarted?: boolean;
}

export interface TournamentSaveResponse {
  result_id: string;
  total_score: number;
  game_score: number;
  games_played: number;
  previous_total: number;
}

// Обновленный интерфейс TournamentWithStatus с полями спонсора
export interface TournamentWithStatus extends Tournament {
  status: "upcoming" | "active" | "completed";
  participants_count?: number;
  time_until_start?: number;
  time_until_end?: number;

  // Спонсорские поля уже наследуются от Tournament
  // sponsor_name?: string;
  // sponsor_channel_url?: string;
  // sponsor_image_url?: string;
}

export interface TournamentListResponse {
  active: TournamentWithStatus[];
  upcoming: TournamentWithStatus[];
  completed: TournamentWithStatus[];
}

// Остальной код сервиса остается без изменений
export const tournamentService = {
  async getActiveTournament(): Promise<Tournament | null> {
    try {
      const { data, error } = await supabase.rpc("get_active_tournament");

      if (error) {
        console.error("Error fetching active tournament:", error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error getting active tournament:", error);

      return null;
    }
  },

  async getAllTournaments(): Promise<TournamentListResponse> {
    try {
      const allTournaments = await this.getAllTournamentsRaw();
      const now = new Date();

      const categorized: TournamentListResponse = {
        active: [],
        upcoming: [],
        completed: [],
      };

      for (const tournament of allTournaments) {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);

        let status: "upcoming" | "active" | "completed";
        let timeUntilStart: number | undefined;
        let timeUntilEnd: number | undefined;

        if (now < startDate) {
          status = "upcoming";
          timeUntilStart = startDate.getTime() - now.getTime();
        } else if (now >= startDate && now < endDate) {
          status = "active";
          timeUntilEnd = endDate.getTime() - now.getTime();
        } else {
          status = "completed";
        }

        const tournamentWithStatus: TournamentWithStatus = {
          ...tournament,
          status,
          time_until_start: timeUntilStart,
          time_until_end: timeUntilEnd,
        };

        if (status === "completed") {
          try {
            const leaderboard = await this.getTournamentLeaderboard(
              tournament.id,
              1000,
            );

            tournamentWithStatus.participants_count = leaderboard.length;
          } catch (error) {
            console.error(
              `Error getting participants count for tournament ${tournament.id}:`,
              error,
            );
            tournamentWithStatus.participants_count = 0;
          }
        }

        categorized[status].push(tournamentWithStatus);
      }

      categorized.active.sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
      categorized.upcoming.sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
      categorized.completed.sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
      );

      return categorized;
    } catch (error) {
      console.error("Error getting all tournaments:", error);

      return {
        active: [],
        upcoming: [],
        completed: [],
      };
    }
  },

  async getAllTournamentsRaw(): Promise<Tournament[]> {
    try {
      // Обновленный запрос для получения всех полей включая спонсорские
      const { data, error } = await supabase
        .from("tournaments")
        .select(
          `
                    id,
                    name,
                    start_date,
                    end_date,
                    prizes,
                    created_at,
                    updated_at,
                    sponsor_name,
                    sponsor_channel_url,
                    sponsor_image_url
                `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all tournaments:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error getting all tournaments:", error);

      return [];
    }
  },

  async getTournamentStatus(): Promise<TournamentStatus> {
    try {
      const activeTournament = await this.getActiveTournament();

      if (!activeTournament) {
        return {
          isActive: false,
          activeTournament: null,
        };
      }

      const now = new Date();
      const startDate = new Date(activeTournament.start_date);
      const endDate = new Date(activeTournament.end_date);

      const isActive = now >= startDate && now < endDate;
      const hasStarted = now >= startDate;
      const timeRemaining = isActive ? endDate.getTime() - now.getTime() : 0;

      return {
        isActive,
        activeTournament,
        timeRemaining,
        hasStarted,
      };
    } catch (error) {
      console.error("Error getting tournament status:", error);

      return {
        isActive: false,
        activeTournament: null,
      };
    }
  },

  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 50,
  ): Promise<TournamentLeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc(
        "get_tournament_leaderboard_accumulative",
        {
          tournament_id_param: tournamentId,
          limit_param: limit,
        },
      );

      if (error) {
        console.error(
          "Error fetching accumulative tournament leaderboard:",
          error,
        );
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(
        "Error getting accumulative tournament leaderboard:",
        error,
      );
      throw error;
    }
  },

  async getTournamentWinners(
    tournamentId: string,
    prizeCount: number,
  ): Promise<TournamentLeaderboardEntry[]> {
    try {
      const leaderboard = await this.getTournamentLeaderboard(
        tournamentId,
        prizeCount,
      );

      return leaderboard.slice(0, prizeCount);
    } catch (error) {
      console.error("Error getting tournament winners:", error);

      return [];
    }
  },

  async getUserTournamentResult(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResult | null> {
    try {
      const { data, error } = await supabase.rpc("get_user_tournament_result", {
        tournament_id_param: tournamentId,
        user_id_param: userId,
      });

      if (error) {
        console.error("Error fetching user tournament result:", error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error getting user tournament result:", error);

      return null;
    }
  },

  async saveTournamentResult(
    tournamentId: string,
    userId: string,
    telegramId: number,
    gameResult: {
      survivalTime: number;
      score: number;
      maxLevelReached: number;
      perfectStreak: number;
      correctHits: number;
      deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
    },
  ): Promise<TournamentSaveResponse> {
    try {
      console.log("Saving accumulative tournament result:", {
        tournamentId,
        userId,
        gameResult,
      });

      const { data, error } = await supabase.rpc(
        "save_tournament_result_accumulative",
        {
          tournament_id_param: tournamentId,
          user_id_param: userId,
          telegram_id_param: telegramId,
          survival_time_param: gameResult.survivalTime,
          survival_score_param: gameResult.score,
          max_level_reached_param: gameResult.maxLevelReached,
          perfect_streak_param: gameResult.perfectStreak,
          correct_hits_param: gameResult.correctHits,
          death_cause_param: gameResult.deathCause,
        },
      );

      if (error) {
        console.error("Error saving accumulative tournament result:", error);
        throw error;
      }

      console.log("Tournament result saved with point accumulation:", data);

      const saveResponse: TournamentSaveResponse =
        typeof data === "string" ? JSON.parse(data) : data;

      console.log(
        `Points accumulated: +${saveResponse.game_score} (Total: ${saveResponse.total_score})`,
      );

      return saveResponse;
    } catch (error) {
      console.error("Error saving accumulative tournament result:", error);
      throw error;
    }
  },

  async hasUserParticipated(
    tournamentId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await this.getUserTournamentResult(tournamentId, userId);

      return result !== null;
    } catch (error) {
      console.error("Error checking user participation:", error);

      return false;
    }
  },

  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    try {
      // Обновленный запрос для получения турнира по ID включая спонсорские поля
      const { data, error } = await supabase
        .from("tournaments")
        .select(
          `
                    id,
                    name,
                    start_date,
                    end_date,
                    prizes,
                    created_at,
                    updated_at,
                    sponsor_name,
                    sponsor_channel_url,
                    sponsor_image_url
                `,
        )
        .eq("id", tournamentId)
        .single();

      if (error) {
        console.error("Error fetching tournament by ID:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error getting tournament by ID:", error);

      return null;
    }
  },
};

// Функция форматирования времени выживания с обработкой некорректных значений
export const formatTournamentSurvivalTime = (milliseconds: number): string => {
  if (milliseconds < 0) {
    console.warn("Negative survival time detected:", milliseconds);

    return "0.000s";
  }

  if (isNaN(milliseconds) || !isFinite(milliseconds)) {
    console.warn("Invalid survival time value:", milliseconds);

    return "0.000s";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};
