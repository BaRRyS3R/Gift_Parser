// src/lib/server/tournamentService.ts - Обновленный сервис турниров с Redis кешированием

import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";
import { sanitizeLeaderboardEntry } from "@/types/tournaments";
import { tournamentCacheService, type PublicTournamentData, type TournamentResponseWithCache } from "@/lib/server/tournamentCacheService";
import type {
  Tournament,
  TournamentLeaderboardEntry,
  PublicTournamentLeaderboardEntry,
  TournamentUserPosition,
  Prize,
} from "@/types/tournaments";

// Re-export types for consistency
export type {
  Tournament,
  TournamentLeaderboardEntry,
  PublicTournamentLeaderboardEntry,
  TournamentUserPosition,
  Prize,
};

// Raw database tournament interface (what comes from Supabase)
interface RawTournament {
  id: string;
  name: string;
  description?: string;
  game_mode: string; // Note: this is 'game_mode' not 'mode'
  start_time: string;
  end_time: string;
  status: string;
  prizes: Array<{ place: number | string; prize: string }>; // ✅ ИСПРАВЛЕНО: соответствует структуре БД
  created_at: string;
  updated_at: string;
}

// Transform raw tournament data to frontend format
function transformTournament(rawTournament: RawTournament): Tournament {
  return {
    id: rawTournament.id,
    name: rawTournament.name,
    description: rawTournament.description,
    mode: rawTournament.game_mode as any, // Transform game_mode to mode
    start_time: rawTournament.start_time,
    end_time: rawTournament.end_time,
    status: rawTournament.status as any,
    prizes: rawTournament.prizes || [], // ✅ ИСПРАВЛЕНО: призы используются как есть из БД
    created_at: rawTournament.created_at,
    updated_at: rawTournament.updated_at,
  };
}

// Tournament participation result interface for game service integration
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
  // Mode-specific fields
  survivalTime?: number;
  maxLevelReached?: number;
  perfectStreak?: number;
  correctHits?: number;
  gameTime?: number;
  totalHits?: number;
  mistakesMade?: number;
}

// Server-side tournament service with Redis caching
export const serverTournamentService = {
  /**
   * ✅ ГЛАВНЫЙ МЕТОД - получение активного турнира с кешированным лидербордом
   */
  async getActiveTournamentWithLeaderboard(
    currentUserId: string, // 🔒 UUID остается ТОЛЬКО на сервере
    telegramId: number,
    limit: number = 100
  ): Promise<TournamentResponseWithCache> {
    try {
      console.log(`[TOURNAMENT_SERVICE] Getting active tournament with leaderboard for user: ${telegramId}`);
      
      // Используем кешированный сервис
      return await tournamentCacheService.getActiveTournamentData(
        currentUserId,
        telegramId,
        limit
      );
      
    } catch (error) {
      console.error("[TOURNAMENT_SERVICE] Error getting active tournament with leaderboard:", error);
      
      // Fallback к прямому запросу без кеша
      try {
        const tournament = await this.getActiveTournament();
        if (tournament) {
          const leaderboard = await this.getPublicTournamentLeaderboard(tournament.id, limit);
          const userPosition = await this.getUserTournamentPosition(tournament.id, telegramId);
          
          const publicData: PublicTournamentData = {
            tournament,
            leaderboard,
            userPosition: userPosition || undefined,
            stats: {
              totalParticipants: leaderboard.length,
              totalGames: 0, // Будет вычислено в кеше
              averageScore: 0, // Будет вычислено в кеше
              highestScore: leaderboard.length > 0 ? leaderboard[0].best_score : 0,
            }
          };
          
          return {
            tournament: publicData,
            cache_info: {
              is_from_cache: false,
              cached_at: Date.now(),
              cache_age_seconds: 0,
              next_update_in_seconds: 0
            }
          };
        }
      } catch (fallbackError) {
        console.error("[TOURNAMENT_SERVICE] Fallback also failed:", fallbackError);
      }
      
      // Возвращаем пустой результат
      return {
        tournament: null,
        cache_info: {
          is_from_cache: false,
          cached_at: Date.now(),
          cache_age_seconds: 0,
          next_update_in_seconds: 0
        }
      };
    }
  },

  /**
   * Get current active tournament (без кеша, для прямых обращений)
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

      // Transform the raw data to match frontend interface
      return transformTournament(data);
    } catch (error) {
      console.error("Error in getActiveTournament:", error);
      return null;
    }
  },

  /**
   * Check if tournament is active for specific game mode
   */
  async isTournamentActiveForMode(gameMode: GameMode): Promise<boolean> {
    try {
      // Convert GameMode enum to tournament mode string
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
          return false; // Reaction mode doesn't have tournaments
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
   * Get tournament by ID
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
   * Get tournament leaderboard (internal, full data)
   */
  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<TournamentLeaderboardEntry[]> {
    try {
      const { data, error } = await supabaseServer
        .from("tournament_leaderboard")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("best_score", { ascending: false })
        .order("last_participation_at", { ascending: true }) // Tiebreaker: earlier last participation wins
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
   * Get public tournament leaderboard (sanitized data)
   */
  async getPublicTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100,
  ): Promise<PublicTournamentLeaderboardEntry[]> {
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
   * Update or create tournament leaderboard entry
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

      // Get existing entry
      const { data: existingEntry } = await supabaseServer
        .from("tournament_leaderboard")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("telegram_id", telegramId)
        .single();

      // Calculate mode-specific score
      let tournamentScore = gameResult.score;

      // Apply mode-specific multipliers (same as in gameService)
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

        // Update best score if improved
        if (tournamentScore > existingEntry.best_score) {
          updates.best_score = tournamentScore;
        }

        // Update mode-specific fields
        if (
          gameResult.mode === GameMode.SURVIVAL &&
          gameResult.survivalTime !== undefined
        ) {
          if (
            !existingEntry.best_time ||
            gameResult.survivalTime > existingEntry.best_time
          ) {
            updates.best_time = gameResult.survivalTime;
          }
          if (
            gameResult.maxLevelReached !== undefined &&
            (!existingEntry.max_level ||
              gameResult.maxLevelReached > existingEntry.max_level)
          ) {
            updates.max_level = gameResult.maxLevelReached;
          }
          if (
            gameResult.perfectStreak !== undefined &&
            (!existingEntry.best_streak ||
              gameResult.perfectStreak > existingEntry.best_streak)
          ) {
            updates.best_streak = gameResult.perfectStreak;
          }
        } else if (gameResult.mode === GameMode.PHYSICS) {
          if (
            gameResult.gameTime !== undefined &&
            (!existingEntry.best_time ||
              gameResult.gameTime > existingEntry.best_time)
          ) {
            updates.best_time = Math.round(gameResult.gameTime);
          }
          if (gameResult.totalHits !== undefined) {
            if (
              !existingEntry.best_hits ||
              gameResult.totalHits > existingEntry.best_hits
            ) {
              updates.best_hits = gameResult.totalHits;
            }
          }
          if (gameResult.mistakesMade !== undefined) {
            if (
              existingEntry.least_mistakes === null ||
              existingEntry.least_mistakes === undefined
            ) {
              updates.least_mistakes = gameResult.mistakesMade;
            } else {
              updates.least_mistakes = Math.min(
                existingEntry.least_mistakes,
                gameResult.mistakesMade,
              );
            }
          }
        } else if (gameResult.mode === GameMode.ROTATION) {
          if (
            gameResult.survivalTime !== undefined &&
            (!existingEntry.best_time ||
              gameResult.survivalTime > existingEntry.best_time)
          ) {
            updates.best_time = gameResult.survivalTime;
          }
          if (
            gameResult.maxLevelReached !== undefined &&
            (!existingEntry.max_level ||
              gameResult.maxLevelReached > existingEntry.max_level)
          ) {
            updates.max_level = gameResult.maxLevelReached;
          }
          if (
            gameResult.perfectStreak !== undefined &&
            (!existingEntry.best_streak ||
              gameResult.perfectStreak > existingEntry.best_streak)
          ) {
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
          newEntry.best_time = gameResult.gameTime
            ? Math.round(gameResult.gameTime)
            : 0;
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

      // ✅ ИНВАЛИДИРУЕМ КЕШ после обновления лидерборда
      await tournamentCacheService.invalidateTournamentLeaderboardCache(tournamentId);
      console.log(`[TOURNAMENT_SERVICE] Invalidated leaderboard cache for tournament: ${tournamentId}`);

    } catch (error) {
      console.error("Error in updateTournamentLeaderboard:", error);
      throw error;
    }
  },

  /**
   * Get user's position in tournament (sanitized)
   */
  async getUserTournamentPosition(
    tournamentId: string,
    telegramId: number,
  ): Promise<TournamentUserPosition | null> {
    try {
      const leaderboard = await this.getTournamentLeaderboard(
        tournamentId,
        1000,
      );
      const userIndex = leaderboard.findIndex(
        (entry) => entry.telegram_id === telegramId,
      );

      if (userIndex === -1) {
        return null;
      }

      return {
        position: userIndex + 1,
        entry: sanitizeLeaderboardEntry(leaderboard[userIndex]),
      };
    } catch (error) {
      console.error("Error in getUserTournamentPosition:", error);
      return null;
    }
  },

  /**
   * Force refresh tournament cache
   */
  async forceRefreshTournamentCache(): Promise<void> {
    try {
      console.log("[TOURNAMENT_SERVICE] Force refreshing tournament cache");
      await tournamentCacheService.forceRefreshTournament();
      
      // Also refresh leaderboard cache for active tournament
      const activeTournament = await this.getActiveTournament();
      if (activeTournament) {
        await tournamentCacheService.forceRefreshTournamentLeaderboard(activeTournament.id);
      }
      
      console.log("[TOURNAMENT_SERVICE] Tournament cache force refresh completed");
    } catch (error) {
      console.error("Error in forceRefreshTournamentCache:", error);
      throw error;
    }
  },

  /**
   * Get tournament cache statistics
   */
  async getTournamentCacheStats() {
    try {
      return await tournamentCacheService.getCacheStats();
    } catch (error) {
      console.error("Error getting tournament cache stats:", error);
      return {
        active_tournament_cached: false,
        leaderboard_caches_count: 0,
        security_info: {
          user_ids_exposed_to_client: false,
          internal_ids_secured: true,
        },
      };
    }
  },

  /**
   * Invalidate all tournament caches (for admin use)
   */
  async invalidateAllTournamentCaches(): Promise<void> {
    try {
      console.log("[TOURNAMENT_SERVICE] Invalidating all tournament caches");
      await tournamentCacheService.invalidateAllTournamentCache();
      console.log("[TOURNAMENT_SERVICE] All tournament caches invalidated");
    } catch (error) {
      console.error("Error invalidating tournament caches:", error);
      throw error;
    }
  },

  // ============================================================================
  // ✅ LEGACY МЕТОДЫ - оставляем для совместимости, но используют кешированные версии
  // ============================================================================

  /**
   * LEGACY: Get tournament by query parameter (теперь с кешированием)
   */
  async getTournamentByQuery(query: string): Promise<Tournament | null> {
    try {
      console.log("Searching for tournament with query:", query);

      // Parse query format: physics-week-32-2025
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

      // Get active tournament using cached service
      const activeTournament = await this.getActiveTournament();

      if (activeTournament && activeTournament.mode === mode) {
        console.log("Found active tournament for mode:", mode);
        return activeTournament;
      }

      console.log("No active tournament found for mode:", mode);
      return null;

    } catch (error) {
      console.error("Error in getTournamentByQuery:", error);
      return null;
    }
  },
};