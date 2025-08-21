// src/lib/server/tournamentService.ts - СУПЕР ОПТИМИЗИРОВАННАЯ версия

import type {
  Tournament,
  TournamentLeaderboardEntry,
  PublicTournamentLeaderboardEntry,
  TournamentsData,
  Prize,
} from "@/types/tournaments";

import { sanitizeLeaderboardEntry } from "@/types/tournaments";
import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Re-export types
export type {
  Tournament,
  TournamentLeaderboardEntry,
  PublicTournamentLeaderboardEntry,
  TournamentsData,
  Prize,
};

// Raw database tournament interface
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

// СУПЕР ОПТИМИЗАЦИЯ: Агрессивный кэш для турниров
let activeTournamentCache: {
  tournament: Tournament | null;
  mode: string;
  timestamp: number;
} = {
  tournament: null,
  mode: "",
  timestamp: 0,
};

const ACTIVE_TOURNAMENT_CACHE_MS = 120000; // 2 минуты кэш (увеличили)

// Transform function
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
      ? parseInt(prize.prize.match(/(\d+)\s+(?:bonus\s+)?attempts/i)?.[1] || "0") || undefined
      : undefined,
    reward_type: prize.prize.includes("attempts") ? "attempts" : "custom",
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
  survivalTime?: number;
  maxLevelReached?: number;
  perfectStreak?: number;
  correctHits?: number;
  gameTime?: number;
  totalHits?: number;
  mistakesMade?: number;
}

/**
 * СУПЕР ОПТИМИЗИРОВАННЫЙ сервис турниров
 */
export const serverTournamentService = {
  /**
   * СУПЕР БЫСТРОЕ получение активного турнира с агрессивным кэшем
   */
  async getActiveTournament(): Promise<Tournament | null> {
    const now = Date.now();
    
    // Проверяем кэш
    if (activeTournamentCache.tournament && 
        (now - activeTournamentCache.timestamp) < ACTIVE_TOURNAMENT_CACHE_MS) {
      return activeTournamentCache.tournament;
    }

    try {
      // ОПТИМИЗАЦИЯ: Используем прямой запрос вместо RPC
      const { data, error } = await supabaseServer
        .from("tournaments")
        .select("*")
        .eq("status", "active")
        .gte("end_time", new Date().toISOString())
        .lte("start_time", new Date().toISOString())
        .single();

      if (error || !data) {
        // Обновляем кэш с null
        activeTournamentCache = {
          tournament: null,
          mode: "",
          timestamp: now,
        };
        return null;
      }

      const tournament = transformTournament(data);
      
      // Обновляем кэш
      activeTournamentCache = {
        tournament,
        mode: tournament.mode,
        timestamp: now,
      };

      return tournament;
    } catch (error) {
      console.error("Error in getActiveTournament:", error);
      return null;
    }
  },

  /**
   * МОЛНИЕНОСНАЯ проверка активности турнира для режима
   */
  async isTournamentActiveForMode(gameMode: GameMode): Promise<boolean> {
    const now = Date.now();
    
    // Проверяем кэш
    if (activeTournamentCache.tournament && 
        (now - activeTournamentCache.timestamp) < ACTIVE_TOURNAMENT_CACHE_MS) {
      
      let tournamentMode: string;
      switch (gameMode) {
        case GameMode.SURVIVAL: tournamentMode = "survival"; break;
        case GameMode.PHYSICS: tournamentMode = "physics"; break;
        case GameMode.ROTATION: tournamentMode = "rotation"; break;
        default: return false;
      }
      
      return activeTournamentCache.mode === tournamentMode;
    }

    // Если кэш не актуален, загружаем заново
    const activeTournament = await this.getActiveTournament();
    
    if (!activeTournament) return false;

    switch (gameMode) {
      case GameMode.SURVIVAL: return activeTournament.mode === "survival";
      case GameMode.PHYSICS: return activeTournament.mode === "physics";
      case GameMode.ROTATION: return activeTournament.mode === "rotation";
      default: return false;
    }
  },

  /**
   * СУПЕР БЫСТРОЕ получение данных турнира для игры (1 запрос)
   */
  async getTournamentGameData(
    gameMode: GameMode,
    telegramId: number,
  ): Promise<{
    tournamentId: string;
    tournamentName: string;
    isActive: boolean;
    userPosition?: number;
    userBestScore?: number;
    userTotalGames?: number;
  } | null> {
    try {
      let tournamentMode: string;
      switch (gameMode) {
        case GameMode.SURVIVAL: tournamentMode = "survival"; break;
        case GameMode.PHYSICS: tournamentMode = "physics"; break;
        case GameMode.ROTATION: tournamentMode = "rotation"; break;
        default: return null;
      }

      // ИСПОЛЬЗУЕМ НОВУЮ BATCH RPC ФУНКЦИЮ
      const { data, error } = await supabaseServer.rpc('get_tournament_game_data', {
        p_game_mode: tournamentMode,
        p_telegram_id: telegramId,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const result = data[0];
      
      if (!result.tournament_active) {
        return null;
      }

      return {
        tournamentId: result.tournament_id,
        tournamentName: result.tournament_name,
        isActive: result.tournament_active,
        userPosition: result.user_position || undefined,
        userBestScore: result.user_best_score || undefined,
        userTotalGames: result.user_total_games || undefined,
      };
    } catch (error) {
      console.error("Error in getTournamentGameData:", error);
      return null;
    }
  },

  /**
   * Получение всех турниров (существующий метод, оптимизированный)
   */
  async getAllTournaments(): Promise<TournamentsData> {
    try {
      const { data: tournaments, error } = await supabaseServer
        .from("tournaments")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching tournaments:", error);
        throw error;
      }

      const result: TournamentsData = {
        upcoming: [],
        completed: [],
      };

      for (const rawTournament of tournaments || []) {
        const tournament = transformTournament(rawTournament);

        if (tournament.status === "active") {
          result.active = tournament;
        } else if (tournament.status === "upcoming") {
          result.upcoming.push(tournament);
        } else if (tournament.status === "completed") {
          result.completed.push(tournament);
        }
      }

      result.upcoming.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

      result.completed.sort(
        (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
      );

      return result;
    } catch (error) {
      console.error("Error in getAllTournaments:", error);
      throw error;
    }
  },

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
   * ОПТИМИЗИРОВАННОЕ получение leaderboard (используем новую RPC функцию)
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<TournamentLeaderboardEntry[]> {
    try {
      // ИСПОЛЬЗУЕМ НОВУЮ ОПТИМИЗИРОВАННУЮ RPC ФУНКЦИЮ
      const { data, error } = await supabaseServer.rpc(
        'get_tournament_leaderboard_top',
        {
          p_tournament_id: tournamentId,
          p_limit: limit,
          p_offset: 0,
        }
      );

      if (error) {
        console.error("Error fetching tournament leaderboard:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: `${tournamentId}-${item.telegram_id}`, // Генерируем ID
        tournament_id: tournamentId,
        user_id: null, // Не возвращаем sensitive данные
        telegram_id: item.telegram_id,
        first_name: item.first_name,
        last_name: item.last_name,
        username: item.username,
        is_premium: item.is_premium,
        best_score: item.best_score,
        total_games: item.total_games,
        best_time: item.best_time,
        max_level: item.max_level,
        best_streak: item.best_streak,
        best_hits: item.best_hits,
        least_mistakes: item.least_mistakes,
        first_participation_at: null, // Не критично для отображения
        last_participation_at: item.last_participation_at,
        created_at: null,
        updated_at: null,
      }));
    } catch (error) {
      console.error("Error in getTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * Получение публичного leaderboard
   */
  async getPublicTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<PublicTournamentLeaderboardEntry[]> {
    try {
      const leaderboard = await this.getTournamentLeaderboard(tournamentId, limit);
      return leaderboard.map(sanitizeLeaderboardEntry);
    } catch (error) {
      console.error("Error in getPublicTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * МОЛНИЕНОСНОЕ обновление турнирного leaderboard (ИСПОЛЬЗУЕМ BATCH RPC)
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
  ): Promise<{
    updated: boolean;
    previousBestScore: number;
    newBestScore: number;
    scoreImproved: boolean;
  }> {
    try {
      // Calculate mode-specific score
      let tournamentScore = gameResult.score;

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

      // Prepare game data for RPC
      const gameData = {
        score: gameResult.score,
        survivalTime: gameResult.survivalTime,
        maxLevelReached: gameResult.maxLevelReached,
        perfectStreak: gameResult.perfectStreak,
        gameTime: gameResult.gameTime,
        totalHits: gameResult.totalHits,
        mistakesMade: gameResult.mistakesMade,
      };

      // ИСПОЛЬЗУЕМ НОВУЮ SUPER BATCH RPC ФУНКЦИЮ
      const { data, error } = await supabaseServer.rpc('update_tournament_leaderboard_atomic', {
        p_tournament_id: tournamentId,
        p_telegram_id: telegramId,
        p_user_id: userInfo.user_id,
        p_first_name: userInfo.first_name,
        p_last_name: userInfo.last_name,
        p_username: userInfo.username,
        p_is_premium: userInfo.is_premium,
        p_new_score: tournamentScore,
        p_game_mode: gameResult.mode.toLowerCase(),
        p_game_data: gameData,
      });

      if (error) {
        console.error("Error updating tournament leaderboard:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from tournament leaderboard update");
      }

      const result = data[0];
      return {
        updated: result.updated,
        previousBestScore: result.previous_best_score,
        newBestScore: result.new_best_score,
        scoreImproved: result.score_improved,
      };
    } catch (error) {
      console.error("Error in updateTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * МОЛНИЕНОСНОЕ получение позиции пользователя (НОВАЯ RPC ФУНКЦИЯ)
   */
  async getUserTournamentPosition(
    tournamentId: string,
    telegramId: number,
  ): Promise<{
    position: number;
    entry: PublicTournamentLeaderboardEntry;
  } | null> {
    try {
      // ИСПОЛЬЗУЕМ НОВУЮ ОПТИМИЗИРОВАННУЮ RPC ФУНКЦИЮ
      const { data, error } = await supabaseServer.rpc('get_user_tournament_position_fast', {
        p_tournament_id: tournamentId,
        p_telegram_id: telegramId,
      });

      if (error) {
        console.error("Error getting user tournament position:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      
      return {
        position: Number(result.user_position), // ИСПРАВЛЕНО: Используем user_position и приводим к number
        entry: {
          tournament_id: tournamentId,
          first_name: result.first_name,
          last_name: result.last_name,
          username: result.username,
          best_score: result.best_score,
        },
      };
    } catch (error) {
      console.error("Error in getUserTournamentPosition:", error);
      return null;
    }
  },

  /**
   * Получение турнира по query (оптимизированная версия)
   */
  async getTournamentByQuery(query: string): Promise<Tournament | null> {
    try {
      console.log("Searching for tournament with query:", query);

      const parts = query.split("-");
      if (parts.length < 1) {
        console.error("Invalid query format:", query);
        return null;
      }

      const mode = parts[0];
      if (!["survival", "physics", "rotation"].includes(mode)) {
        console.error("Invalid tournament mode in query:", mode);
        return null;
      }

      console.log("Looking for tournament with mode:", mode);

      // Сначала проверяем кэш активного турнира
      const now = Date.now();
      if (activeTournamentCache.tournament && 
          activeTournamentCache.mode === mode &&
          (now - activeTournamentCache.timestamp) < ACTIVE_TOURNAMENT_CACHE_MS) {
        return activeTournamentCache.tournament;
      }

      // Поиск активного турнира
      const { data: activeTournaments, error: activeError } = await supabaseServer
        .from("tournaments")
        .select("*")
        .eq("game_mode", mode)
        .eq("status", "active")
        .order("start_time", { ascending: false })
        .limit(1);

      if (activeError) {
        console.error("Error searching for active tournament:", activeError);
      } else if (activeTournaments && activeTournaments.length > 0) {
        console.log("Found active tournament for mode:", mode);
        const tournament = transformTournament(activeTournaments[0]);
        
        // Обновляем кэш
        activeTournamentCache = {
          tournament,
          mode,
          timestamp: now,
        };
        
        return tournament;
      }

      // Поиск последнего турнира для режима
      const { data: allTournaments, error: allError } = await supabaseServer
        .from("tournaments")
        .select("*")
        .eq("game_mode", mode)
        .order("start_time", { ascending: false })
        .limit(1);

      if (allError) {
        console.error("Error searching tournament by mode:", allError);
        return null;
      }

      const rawTournament = allTournaments?.[0] || null;
      if (!rawTournament) {
        console.log("No tournament found for mode:", mode);
        return null;
      }

      const tournament = transformTournament(rawTournament);
      console.log("Found tournament:", tournament.id, "with status:", tournament.status);
      return tournament;
    } catch (error) {
      console.error("Error in getTournamentByQuery:", error);
      return null;
    }
  },

  /**
   * УТИЛИТА: Очистка кэша
   */
  clearCache() {
    activeTournamentCache = {
      tournament: null,
      mode: "",
      timestamp: 0,
    };
  },
};