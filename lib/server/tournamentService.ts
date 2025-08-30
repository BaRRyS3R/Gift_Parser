// src/lib/server/tournamentService.ts - ИСПРАВЛЕНО: использует оптимизированные типы данных

import type {
  Tournament,
  FullTournamentLeaderboardEntry,
  OptimizedTournamentLeaderboardEntry,
  TournamentsData,
  Prize,
} from "@/types/tournaments";

import { sanitizeLeaderboardEntry } from "@/types/tournaments";
import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Re-export оптимизированных типов
export type {
  Tournament,
  FullTournamentLeaderboardEntry,
  OptimizedTournamentLeaderboardEntry,
  TournamentsData,
  Prize,
};

// Raw database tournament interface (остается без изменений)
interface RawTournament {
  id: string;
  name: string;
  description?: string;
  game_mode: string;
  start_time: string;
  end_time: string;
  status: string;
  prizes: Array<{ place: number | string; prize: string }>;
  created_at: string;
  updated_at: string;
}

// Transform raw tournament data (остается без изменений)
function transformTournament(rawTournament: RawTournament): Tournament {
  const transformedPrizes: Prize[] = rawTournament.prizes.map((prize) => ({
    position:
      typeof prize.place === "string"
        ? prize.place === "4-10"
          ? 4
          : parseInt(prize.place)
        : prize.place,
    description: prize.prize,
    attempts: prize.prize.includes("attempts")
      ? parseInt(
          prize.prize.match(/(\d+)\s+(?:bonus\s+)?attempts/i)?.[1] || "0",
        ) || undefined
      : undefined,
    reward_type: prize.prize.includes("attempts")
      ? ("attempts" as const)
      : ("custom" as const),
  }));

  return {
    id: rawTournament.id,
    name: rawTournament.name,
    description: rawTournament.description,
    mode: rawTournament.game_mode as any,
    start_time: rawTournament.start_time,
    end_time: rawTournament.end_time,
    status: rawTournament.status as any,
    prizes: transformedPrizes,
    created_at: rawTournament.created_at,
    updated_at: rawTournament.updated_at,
  };
}

// ✅ ОПТИМИЗИРОВАННЫЙ результат участия в турнире
export interface TournamentParticipationResult {
  tournamentId: string;
  tournamentName: string;
  newBestScore: boolean;
  position?: number;
  improved: boolean;
  previousPosition?: number;
  scoreImprovement?: number;
}

export interface GameResultForTournament {
  mode: GameMode;
  score: number;
  duration: number;
  // Mode-specific fields (остается без изменений)
  survivalTime?: number;
  maxLevelReached?: number;
  perfectStreak?: number;
  correctHits?: number;
  gameTime?: number;
  totalHits?: number;
  mistakesMade?: number;
}

// ✅ ИСПРАВЛЕННЫЙ server-side tournament service
export const serverTournamentService = {
  /**
   * ✅ ОПТИМИЗИРОВАНО: получение активного турнира
   */
  async getActiveTournament(): Promise<Tournament | null> {
    try {
      const { data, error } = await supabaseServer.rpc("get_active_tournament");

      if (error) {
        console.error("Error getting active tournament:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return transformTournament(data);
    } catch (error) {
      console.error("Error in getActiveTournament:", error);
      return null;
    }
  },

  /**
   * ✅ УПРОЩЕНО: проверка активности турнира для режима
   */
  async isTournamentActiveForMode(gameMode: GameMode): Promise<boolean> {
    try {
      let tournamentMode: string;

      switch (gameMode) {
        case GameMode.SURVIVAL:
          tournamentMode = "survival";
          break;
        case GameMode.PHYSICS:
          tournamentMode = "physics";
          break;
        case GameMode.ROTATION:
          tournamentMode = "rotation";
          break;
        default:
          return false;
      }

      const { data, error } = await supabaseServer.rpc(
        "is_tournament_active_for_mode",
        { game_mode: tournamentMode },
      );

      if (error) {
        console.error("Error checking tournament active for mode:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error in isTournamentActiveForMode:", error);
      return false;
    }
  },

  /**
   * ✅ УБРАНО: getAllTournaments (теперь только активный турнир)
   * Если нужен полный список - добавить отдельно
   */

  /**
   * Получение турнира по ID
   */
  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    try {
      const { data, error } = await supabaseServer
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        console.error("Error fetching tournament by ID:", error);
        throw error;
      }

      return transformTournament(data);
    } catch (error) {
      console.error("Error in getTournamentById:", error);
      return null;
    }
  },

  /**
   * ✅ ОПТИМИЗИРОВАНО: получение ПОЛНОГО лидерборда турнира (для внутреннего использования)
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<FullTournamentLeaderboardEntry[]> {
    try {
      const { data, error } = await supabaseServer
        .from("tournament_leaderboard")
        .select("*") // Полные данные для внутреннего использования
        .eq("tournament_id", tournamentId)
        .order("best_score", { ascending: false })
        .order("last_participation_at", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching tournament leaderboard:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ НОВЫЙ: получение оптимизированного лидерборда (только необходимые поля)
   */
  async getOptimizedTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<OptimizedTournamentLeaderboardEntry[]> {
    try {
      const { data, error } = await supabaseServer
        .from("tournament_leaderboard")
        .select(`
          first_name,
          last_name,
          username,
          best_score,
          updated_at
        `) // ✅ ТОЛЬКО необходимые поля
        .eq("tournament_id", tournamentId)
        .order("best_score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching optimized tournament leaderboard:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getOptimizedTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ LEGACY: получение публичного лидерборда (используется старым кодом)
   */
  async getPublicTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<OptimizedTournamentLeaderboardEntry[]> {
    try {
      const leaderboard = await this.getTournamentLeaderboard(
        tournamentId,
        limit,
      );

      return leaderboard.map(sanitizeLeaderboardEntry);
    } catch (error) {
      console.error("Error in getPublicTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ ОБНОВЛЕНО: обновление лидерборда турнира (остается без изменений)
   */
  async updateTournamentLeaderboard(
    tournamentId: string,
    telegramId: number,
    gameResult: GameResultForTournament,
    userInfo: {
      user_id: string;
      first_name: string;
      last_name?: string;
      username?: string;
      is_premium: boolean;
    },
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { data: existingEntry } = await supabaseServer
        .from("tournament_leaderboard")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("telegram_id", telegramId)
        .single();

      let tournamentScore = gameResult.score;

      // Apply mode-specific multipliers
      switch (gameResult.mode) {
        case GameMode.SURVIVAL:
          tournamentScore = gameResult.score * 2;
          break;
        case GameMode.PHYSICS:
          tournamentScore = gameResult.score * 4;
          break;
        case GameMode.ROTATION:
          tournamentScore = gameResult.score * 3;
          break;
      }

      if (existingEntry) {
        // Update existing entry
        const updates: any = {
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          username: userInfo.username,
          is_premium: userInfo.is_premium,
          total_games: existingEntry.total_games + 1,
          last_participation_at: now,
          updated_at: now,
        };

        if (tournamentScore > existingEntry.best_score) {
          updates.best_score = tournamentScore;
        }

        // Mode-specific updates (остается без изменений)
        if (gameResult.mode === GameMode.SURVIVAL && gameResult.survivalTime !== undefined) {
          if (!existingEntry.best_time || gameResult.survivalTime > existingEntry.best_time) {
            updates.best_time = gameResult.survivalTime;
          }
          if (gameResult.maxLevelReached !== undefined &&
              (!existingEntry.max_level || gameResult.maxLevelReached > existingEntry.max_level)) {
            updates.max_level = gameResult.maxLevelReached;
          }
          if (gameResult.perfectStreak !== undefined &&
              (!existingEntry.best_streak || gameResult.perfectStreak > existingEntry.best_streak)) {
            updates.best_streak = gameResult.perfectStreak;
          }
        } else if (gameResult.mode === GameMode.PHYSICS) {
          if (gameResult.gameTime !== undefined &&
              (!existingEntry.best_time || gameResult.gameTime > existingEntry.best_time)) {
            updates.best_time = Math.round(gameResult.gameTime);
          }
          if (gameResult.totalHits !== undefined) {
            if (!existingEntry.best_hits || gameResult.totalHits > existingEntry.best_hits) {
              updates.best_hits = gameResult.totalHits;
            }
          }
          if (gameResult.mistakesMade !== undefined) {
            if (existingEntry.least_mistakes === null || existingEntry.least_mistakes === undefined) {
              updates.least_mistakes = gameResult.mistakesMade;
            } else {
              updates.least_mistakes = Math.min(existingEntry.least_mistakes, gameResult.mistakesMade);
            }
          }
        } else if (gameResult.mode === GameMode.ROTATION) {
          if (gameResult.survivalTime !== undefined &&
              (!existingEntry.best_time || gameResult.survivalTime > existingEntry.best_time)) {
            updates.best_time = gameResult.survivalTime;
          }
          if (gameResult.maxLevelReached !== undefined &&
              (!existingEntry.max_level || gameResult.maxLevelReached > existingEntry.max_level)) {
            updates.max_level = gameResult.maxLevelReached;
          }
          if (gameResult.perfectStreak !== undefined &&
              (!existingEntry.best_streak || gameResult.perfectStreak > existingEntry.best_streak)) {
            updates.best_streak = gameResult.perfectStreak;
          }
        }

        const { error } = await supabaseServer
          .from("tournament_leaderboard")
          .update(updates)
          .eq("id", existingEntry.id);

        if (error) {
          console.error("Error updating tournament leaderboard entry:", error);
          throw error;
        }
      } else {
        // Create new entry
        const newEntry: any = {
          tournament_id: tournamentId,
          user_id: userInfo.user_id,
          telegram_id: telegramId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          username: userInfo.username,
          is_premium: userInfo.is_premium,
          best_score: tournamentScore,
          total_games: 1,
          first_participation_at: now,
          last_participation_at: now,
        };

        // Set mode-specific initial values
        if (gameResult.mode === GameMode.SURVIVAL) {
          newEntry.best_time = gameResult.survivalTime || 0;
          newEntry.max_level = gameResult.maxLevelReached || 0;
          newEntry.best_streak = gameResult.perfectStreak || 0;
        } else if (gameResult.mode === GameMode.PHYSICS) {
          newEntry.best_time = gameResult.gameTime ? Math.round(gameResult.gameTime) : 0;
          newEntry.best_hits = gameResult.totalHits || 0;
          newEntry.least_mistakes = gameResult.mistakesMade || 0;
        } else if (gameResult.mode === GameMode.ROTATION) {
          newEntry.best_time = gameResult.survivalTime || 0;
          newEntry.max_level = gameResult.maxLevelReached || 0;
          newEntry.best_streak = gameResult.perfectStreak || 0;
        }

        const { error } = await supabaseServer
          .from("tournament_leaderboard")
          .insert(newEntry);

        if (error) {
          console.error("Error creating tournament leaderboard entry:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error in updateTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * ✅ ОПТИМИЗИРОВАНО: получение позиции пользователя (используется кеш-сервисом)
   */
  async getUserTournamentPosition(
    tournamentId: string,
    telegramId: number,
  ): Promise<{
    position: number;
    entry: OptimizedTournamentLeaderboardEntry;
  } | null> {
    try {
      // Получаем оптимизированный лидерборд
      const leaderboard = await this.getOptimizedTournamentLeaderboard(
        tournamentId,
        1000, // Больше записей для точного определения позиции
      );

      // Находим пользователя через отдельный запрос
      const { data: userEntry, error } = await supabaseServer
        .from("tournament_leaderboard")
        .select(`
          first_name,
          last_name,
          username,
          best_score,
          updated_at
        `)
        .eq("tournament_id", tournamentId)
        .eq("telegram_id", telegramId)
        .single();

      if (error || !userEntry) {
        return null;
      }

      // Вычисляем позицию пользователя
      const betterCount = await supabaseServer
        .from("tournament_leaderboard")
        .select("id", { count: "exact" })
        .eq("tournament_id", tournamentId)
        .or(`best_score.gt.${userEntry.best_score},and(best_score.eq.${userEntry.best_score},updated_at.lt.${userEntry.updated_at})`);

      const position = (betterCount.count || 0) + 1;

      return {
        position,
        entry: {
          first_name: userEntry.first_name,
          last_name: userEntry.last_name,
          username: userEntry.username,
          best_score: userEntry.best_score,
          updated_at: userEntry.updated_at,
          isCurrentUser: true,
        },
      };
    } catch (error) {
      console.error("Error in getUserTournamentPosition:", error);
      return null;
    }
  },

  /**
   * ✅ УБРАНО: getTournamentByQuery (упрощена логика)
   * Если нужно - добавить отдельно
   */
};