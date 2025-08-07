// src/lib/server/gameService.ts - Updated with achievement system integration

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { GameMode } from "@/types/game-modes/common";
import { supabaseServer } from "../supabase_server";
import { serverAchievementsService } from "./achievementsService";

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Enhanced game save result with achievements
export interface GameSaveResult {
  success: boolean;
  levelChanged?: boolean;
  newLevel?: number;
  attemptsAwarded?: number;
  // NEW: Achievement rewards
  achievementsUnlocked?: Array<{
    id: string;
    name: string;
    attemptsAwarded: number;
  }>;
  totalAttemptsAwarded?: number;
  error?: string;
}

// Tournament save response interface
export interface TournamentSaveResponse {
  result_id: string;
  total_score: number;
  game_score: number;
  games_played: number;
  previous_total: number;
}

// Level system constants
const LEVEL_CONFIG = {
  GAMES_PER_LEVEL: 20,
  ATTEMPTS_PER_LEVEL: 10,
  MAX_LEVEL: 10000,
  STARTING_LEVEL: 1,
} as const;

/**
 * Calculate user level based on total games played
 */
function calculateLevel(totalGames: number): number {
  const calculatedLevel =
    Math.floor(totalGames / LEVEL_CONFIG.GAMES_PER_LEVEL) +
    LEVEL_CONFIG.STARTING_LEVEL;

  return Math.min(calculatedLevel, LEVEL_CONFIG.MAX_LEVEL);
}

/**
 * Calculate reaction time score based on timing
 */
function calculateReactionScore(reactionTime: number, missed: boolean): number {
  if (missed) return 0;

  if (reactionTime < 50) return 50;
  if (reactionTime <= 150) return 40;
  if (reactionTime <= 250) return 30;
  if (reactionTime <= 400) return 20;

  return 10;
}

/**
 * Get score multiplier for total_score calculation
 */
function getScoreMultiplier(mode: GameMode): number {
  switch (mode) {
    case GameMode.REACTION:
      return 1; // No multiplier for reaction mode (already calculated)
    case GameMode.SURVIVAL:
      return 2;
    case GameMode.PHYSICS:
      return 4;
    case GameMode.ROTATION:
      return 3;
    default:
      return 1;
  }
}

/**
 * Calculate total score contribution based on game mode
 */
function calculateTotalScoreContribution(gameResult: GameResult): number {
  let baseScore = gameResult.score;

  // For reaction mode, recalculate score based on reaction time
  if (gameResult.mode === GameMode.REACTION) {
    const reactionResult = gameResult as ReactionGameResult;

    baseScore = calculateReactionScore(
      reactionResult.reactionTime,
      reactionResult.missed,
    );
  }

  const multiplier = getScoreMultiplier(gameResult.mode);

  return baseScore * multiplier;
}

/**
 * Calculate mode-specific best score with multiplier
 */
function calculateModeSpecificScore(gameResult: GameResult): number {
  let baseScore = gameResult.score;

  // For reaction mode, use calculated score
  if (gameResult.mode === GameMode.REACTION) {
    const reactionResult = gameResult as ReactionGameResult;

    return calculateReactionScore(
      reactionResult.reactionTime,
      reactionResult.missed,
    );
  }

  // For other modes, apply multiplier to mode-specific best score
  const multiplier = getScoreMultiplier(gameResult.mode);

  return baseScore * multiplier;
}

// Server-side game service
export const serverGameService = {
  /**
   * Update user game statistics with level and achievement system integration
   */
  async updateGameStats(
    telegramId: number,
    gameResult: GameResult,
  ): Promise<GameSaveResult> {
    // Get user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    const previousTotalGames = user.total_games;
    const previousLevel = user.current_level;

    // All modes count towards total_games
    const newTotalGames = previousTotalGames + 1;

    // Calculate new level based on total games
    const newLevel = calculateLevel(newTotalGames);
    const levelChanged = newLevel > previousLevel;

    // Calculate score contributions
    const totalScoreContribution = calculateTotalScoreContribution(gameResult);
    const modeSpecificScore = calculateModeSpecificScore(gameResult);

    const updates: any = {
      total_games: newTotalGames,
      total_score: user.total_score + totalScoreContribution,
      best_score: Math.max(user.best_score, totalScoreContribution),
      current_level: newLevel,
      last_played_at: new Date().toISOString(),
    };

    // Award attempts for level increase
    let levelAttemptsAwarded = 0;

    if (levelChanged) {
      const levelsGained = newLevel - previousLevel;
      levelAttemptsAwarded = levelsGained * LEVEL_CONFIG.ATTEMPTS_PER_LEVEL;
      updates.attempts_remaining = user.attempts_remaining + levelAttemptsAwarded;
    }

    // Mode-specific statistics updates
    if (gameResult.mode === GameMode.REACTION) {
      const reactionResult = gameResult as ReactionGameResult;

      // Calculate actual score for reaction mode
      const calculatedScore = calculateReactionScore(
        reactionResult.reactionTime,
        reactionResult.missed,
      );

      updates.reaction_games = user.reaction_games + 1;
      updates.reaction_best_score = Math.max(
        user.reaction_best_score || 0,
        calculatedScore,
      );

      if (!reactionResult.missed && reactionResult.reactionTime > 0) {
        updates.reaction_best_time =
          user.reaction_best_time > 0
            ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
            : reactionResult.reactionTime;

        const totalReactionGames = user.reaction_games;
        const currentAverage = user.reaction_average_time || 0;
        const newAverage =
          totalReactionGames > 0
            ? (currentAverage * totalReactionGames +
              reactionResult.reactionTime) /
            (totalReactionGames + 1)
            : reactionResult.reactionTime;

        updates.reaction_average_time = Math.round(newAverage);
      }
    } else if (gameResult.mode === GameMode.SURVIVAL) {
      const survivalResult = gameResult as SurvivalGameResult;

      updates.survival_games = user.survival_games + 1;
      updates.survival_best_score = Math.max(
        user.survival_best_score || 0,
        survivalResult.score * 2,
      );
      updates.survival_best_time = Math.max(
        user.survival_best_time || 0,
        survivalResult.survivalTime,
      );
      updates.survival_max_level = Math.max(
        user.survival_max_level || 0,
        survivalResult.maxLevelReached,
      );
      updates.survival_best_streak = Math.max(
        user.survival_best_streak || 0,
        survivalResult.perfectStreak,
      );
    } else if (gameResult.mode === GameMode.PHYSICS) {
      const physicsResult = gameResult as PhysicsGameResult;

      updates.physics_games = user.physics_games + 1;
      updates.physics_best_score = Math.max(
        user.physics_best_score || 0,
        physicsResult.score * 4,
      );
      updates.physics_best_time = Math.max(
        user.physics_best_time || 0,
        Math.round(physicsResult.gameTime),
      );
      updates.physics_total_hits =
        (user.physics_total_hits || 0) + physicsResult.totalHits;
      updates.physics_best_hits = Math.max(
        user.physics_best_hits || 0,
        physicsResult.totalHits,
      );

      if (
        user.physics_least_mistakes === undefined ||
        user.physics_least_mistakes === null
      ) {
        updates.physics_least_mistakes = physicsResult.mistakesMade;
      } else {
        updates.physics_least_mistakes = Math.min(
          user.physics_least_mistakes,
          physicsResult.mistakesMade,
        );
      }
    } else if (gameResult.mode === GameMode.ROTATION) {
      const rotationResult = gameResult as RotationGameResult;

      updates.rotation_games = user.rotation_games + 1;
      updates.rotation_best_score = Math.max(
        user.rotation_best_score || 0,
        rotationResult.score * 3,
      );
      updates.rotation_best_time = Math.max(
        user.rotation_best_time || 0,
        rotationResult.survivalTime,
      );
      updates.rotation_max_level = Math.max(
        user.rotation_max_level || 0,
        rotationResult.maxLevelReached,
      );
      updates.rotation_best_streak = Math.max(
        user.rotation_best_streak || 0,
        rotationResult.perfectStreak,
      );
      updates.rotation_total_hits =
        (user.rotation_total_hits || 0) + rotationResult.correctHits;
    }

    // Update user stats in database
    const { error: updateError } = await supabaseServer
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramId);

    if (updateError) {
      console.error("Error updating user stats:", updateError);
      throw new Error("Failed to update user statistics");
    }

    // NEW: Check and award achievements after stats update (with error handling)
    let newAchievements: any[] = [];
    let achievementAttemptsAwarded = 0;

    try {
      // The database trigger will automatically check, but we also get the results here
      newAchievements = await serverAchievementsService.checkAndAwardAchievements(
        telegramId
      );

      // Calculate total attempts awarded
      achievementAttemptsAwarded = newAchievements.reduce(
        (total: number, achievement: any) => total + achievement.attempts_awarded,
        0
      );
    } catch (achievementError) {
      // Log achievement error but don't fail the game save
      console.warn("Achievement check failed but game saved:", achievementError);
      // Continue without achievements - game save is more important
    }

    const totalAttemptsAwarded = levelAttemptsAwarded + achievementAttemptsAwarded;

    // Prepare response
    const response: GameSaveResult = {
      success: true,
      levelChanged,
      newLevel: levelChanged ? newLevel : undefined,
      attemptsAwarded: levelAttemptsAwarded > 0 ? levelAttemptsAwarded : undefined,
    };

    // Add achievement information if any were unlocked
    if (newAchievements.length > 0) {
      response.achievementsUnlocked = newAchievements.map((achievement) => ({
        id: achievement.achievement_id,
        name: achievement.achievement_name,
        attemptsAwarded: achievement.attempts_awarded,
      }));
      response.totalAttemptsAwarded = totalAttemptsAwarded;
    }

    return response;
  },

  /**
   * Save regular game result (non-tournament)
   */
  async saveGameResult(
    telegramId: number,
    gameResult: GameResult,
  ): Promise<GameSaveResult> {
    return await this.updateGameStats(telegramId, gameResult);
  },

  /**
   * Save tournament game result with point accumulation
   */
  async saveTournamentResult(
    tournamentId: string,
    telegramId: number,
    gameResult: SurvivalGameResult,
  ): Promise<TournamentSaveResponse> {
    // Get user data
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Call the tournament accumulation RPC function
    const { data, error } = await supabaseServer.rpc(
      "save_tournament_result_accumulative",
      {
        tournament_id_param: tournamentId,
        user_id_param: user.id,
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
      console.error("Error saving tournament result:", error);
      throw new Error("Failed to save tournament result");
    }

    // Parse JSON response from the RPC function
    const saveResponse: TournamentSaveResponse =
      typeof data === "string" ? JSON.parse(data) : data;

    // Also check achievements after tournament game
    await serverAchievementsService.checkAndAwardAchievements(telegramId);

    return saveResponse;
  },

  // Export utility functions for use in game logic
  calculateReactionScore,
  getScoreMultiplier,
  calculateTotalScoreContribution,
  calculateModeSpecificScore,
  calculateLevel,

  // Export level system constants
  LEVEL_CONFIG,
};