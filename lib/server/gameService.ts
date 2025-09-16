// src/lib/server/gameService.ts - Updated with Best Score tracking and Attempts Status in response

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { supabaseServer } from "../supabase_server";

import { serverAchievementsService } from "./achievementsService";
import { serverTournamentService } from "./tournamentService";
import { serverDailyQuestsService } from "./dailyQuestsService";
import { serverAttemptsService } from "./attemptsService";

import { GameMode } from "@/types/game-modes/common";

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Enhanced game save result with Best Score information and Attempts Status
export interface GameSaveResult {
  success: boolean;
  levelChanged?: boolean;
  newLevel?: number;
  attemptsAwarded?: number;
  // Achievement rewards
  achievementsUnlocked?: Array<{
    id: string;
    name: string;
    attemptsAwarded: number;
  }>;
  totalAttemptsAwarded?: number;
  // Tournament information
  tournamentInfo?: {
    tournamentId: string;
    tournamentName: string;
    newBestScore: boolean;
    participated: boolean;
  };
  // Daily quest information
  questCompletions?: Array<{
    questId: string;
    completed: boolean;
    attemptsAwarded: number;
  }>;
  questAttemptsAwarded?: number;
  // Best score information for game modes
  bestScoreInfo?: {
    previousBestScore: number;
    currentScore: number;
    newBestScore: number;
    isBestScore: boolean;
    pointsNeeded?: number; // How many points needed to beat the record
  };
  // NEW: Current attempts status after game processing
  attemptsStatus?: {
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: string; // ISO string
    timeUntilReset?: number;
  };
  error?: string;
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
      return 1;
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

  if (gameResult.mode === GameMode.REACTION) {
    const reactionResult = gameResult as ReactionGameResult;
    return calculateReactionScore(
      reactionResult.reactionTime,
      reactionResult.missed,
    );
  }

  const multiplier = getScoreMultiplier(gameResult.mode);
  return baseScore * multiplier;
}

/**
 * Calculate best score information for a specific game mode
 */
function calculateBestScoreInfo(
  gameResult: GameResult,
  currentBestScore: number,
): {
  previousBestScore: number;
  currentScore: number;
  newBestScore: number;
  isBestScore: boolean;
  pointsNeeded?: number;
} {
  const currentScore = calculateModeSpecificScore(gameResult);
  const previousBestScore = currentBestScore || 0;
  const newBestScore = Math.max(previousBestScore, currentScore);
  const isBestScore = currentScore > previousBestScore;
  
  let pointsNeeded: number | undefined;
  if (!isBestScore && previousBestScore > 0) {
    pointsNeeded = previousBestScore - currentScore;
  }

  return {
    previousBestScore,
    currentScore,
    newBestScore,
    isBestScore,
    pointsNeeded,
  };
}

/**
 * Convert GameResult to tournament format
 */
function convertToTournamentGameResult(gameResult: GameResult): any {
  const base = {
    mode: gameResult.mode,
    score: gameResult.score,
    duration: gameResult.duration,
  };

  switch (gameResult.mode) {
    case GameMode.SURVIVAL:
      const survivalResult = gameResult as SurvivalGameResult;
      return {
        ...base,
        survivalTime: survivalResult.survivalTime,
        maxLevelReached: survivalResult.maxLevelReached,
        perfectStreak: survivalResult.perfectStreak,
        correctHits: survivalResult.correctHits,
      };

    case GameMode.PHYSICS:
      const physicsResult = gameResult as PhysicsGameResult;
      return {
        ...base,
        gameTime: physicsResult.gameTime,
        totalHits: physicsResult.totalHits,
        mistakesMade: physicsResult.mistakesMade,
      };

    case GameMode.ROTATION:
      const rotationResult = gameResult as RotationGameResult;
      return {
        ...base,
        survivalTime: rotationResult.survivalTime,
        maxLevelReached: rotationResult.maxLevelReached,
        perfectStreak: rotationResult.perfectStreak,
        correctHits: rotationResult.correctHits,
      };

    default:
      return base;
  }
}

// Server-side game service
export const serverGameService = {
  /**
   * Update user game statistics with level, achievement, tournament, and quest system integration
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
      updates.attempts_reset_at = null;
      updates.attempts_remaining = user.attempts_remaining + levelAttemptsAwarded;
    }

    // Calculate best score information before updating stats
    let bestScoreInfo: GameSaveResult["bestScoreInfo"];

    // Mode-specific statistics updates
    if (gameResult.mode === GameMode.REACTION) {
      const reactionResult = gameResult as ReactionGameResult;
      const calculatedScore = calculateReactionScore(
        reactionResult.reactionTime,
        reactionResult.missed,
      );

      // Calculate best score info for reaction mode
      bestScoreInfo = calculateBestScoreInfo(gameResult, user.reaction_best_score || 0);

      updates.reaction_games = user.reaction_games + 1;
      updates.reaction_best_score = bestScoreInfo.newBestScore;

      if (!reactionResult.missed && reactionResult.reactionTime > 0) {
        updates.reaction_best_time =
          user.reaction_best_time > 0
            ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
            : reactionResult.reactionTime;

        const totalReactionGames = user.reaction_games;
        const currentAverage = user.reaction_average_time || 0;
        const newAverage =
          totalReactionGames > 0
            ? (currentAverage * totalReactionGames + reactionResult.reactionTime) /
              (totalReactionGames + 1)
            : reactionResult.reactionTime;

        updates.reaction_average_time = Math.round(newAverage);
      }
    } else if (gameResult.mode === GameMode.SURVIVAL) {
      const survivalResult = gameResult as SurvivalGameResult;

      // Calculate best score info for survival mode
      bestScoreInfo = calculateBestScoreInfo(gameResult, user.survival_best_score || 0);

      updates.survival_games = user.survival_games + 1;
      updates.survival_best_score = bestScoreInfo.newBestScore;
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

      // Calculate best score info for physics mode
      bestScoreInfo = calculateBestScoreInfo(gameResult, user.physics_best_score || 0);

      updates.physics_games = user.physics_games + 1;
      updates.physics_best_score = bestScoreInfo.newBestScore;
      updates.physics_best_time = Math.max(
        user.physics_best_time || 0,
        Math.round(physicsResult.gameTime),
      );
      updates.physics_total_hits = (user.physics_total_hits || 0) + physicsResult.totalHits;
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

      // Calculate best score info for rotation mode
      bestScoreInfo = calculateBestScoreInfo(gameResult, user.rotation_best_score || 0);

      updates.rotation_games = user.rotation_games + 1;
      updates.rotation_best_score = bestScoreInfo.newBestScore;
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

    // Process daily quest updates after user stats are updated
    let questCompletions: any[] = [];
    let questAttemptsAwarded = 0;

    try {
      const questResults = await serverDailyQuestsService.processGameQuestUpdates(
        user.id,
        gameResult.mode,
        gameResult,
      );

      questCompletions = questResults.map((result) => ({
        questId: result.questId,
        completed: result.completed,
        attemptsAwarded: result.attemptsAwarded,
      }));

      questAttemptsAwarded = questResults.reduce(
        (total, result) => total + result.attemptsAwarded,
        0,
      );
    } catch (questError) {
      console.warn("Daily quest update failed but game saved:", questError);
    }

    // Check and award achievements after stats update
    let newAchievements: any[] = [];
    let achievementAttemptsAwarded = 0;

    try {
      newAchievements = await serverAchievementsService.checkAndAwardAchievements(telegramId);
      achievementAttemptsAwarded = newAchievements.reduce(
        (total: number, achievement: any) => total + achievement.attempts_awarded,
        0,
      );
    } catch (achievementError) {
      console.warn("Achievement check failed but game saved:", achievementError);
    }

    // Tournament processing
    let tournamentInfo: any = undefined;

    try {
      const isTournamentActive = await serverTournamentService.isTournamentActiveForMode(
        gameResult.mode,
      );

      if (isTournamentActive) {
        const activeTournament = await serverTournamentService.getActiveTournament();

        if (activeTournament && activeTournament.mode === gameResult.mode.toLowerCase()) {
          console.log(`[GAME_SERVICE] Processing tournament game for ${activeTournament.name}`);

          const previousStats = await serverTournamentService.getUserTournamentStats(
            activeTournament.id,
            telegramId,
          );

          const previousBestScore = previousStats.is_participating
            ? previousStats.user_score || 0
            : 0;

          await serverTournamentService.updateTournamentLeaderboard(
            activeTournament.id,
            telegramId,
            convertToTournamentGameResult(gameResult),
            {
              user_id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username,
              is_premium: user.is_premium,
            },
          );

          const tournamentScore = modeSpecificScore;
          const newBestScore = tournamentScore > previousBestScore;

          console.log(`[GAME_SERVICE] Tournament result:`, {
            tournament_id: activeTournament.id,
            previous_score: previousBestScore,
            new_score: tournamentScore,
            is_new_best: newBestScore,
            was_participating: previousStats.is_participating,
          });

          tournamentInfo = {
            tournamentId: activeTournament.id,
            tournamentName: activeTournament.name,
            newBestScore,
            participated: true,
          };
        }
      }
    } catch (tournamentError) {
      console.warn("Tournament update failed but game saved:", tournamentError);
    }

    // NEW: Get current attempts status after all processing
    let attemptsStatus: GameSaveResult["attemptsStatus"];

    try {
      const currentAttemptsStatus = await serverAttemptsService.checkAndUpdateAttempts(telegramId);
      
      attemptsStatus = {
        canPlay: currentAttemptsStatus.canPlay,
        attemptsRemaining: currentAttemptsStatus.attemptsRemaining,
        resetTime: currentAttemptsStatus.resetTime?.toISOString(),
        timeUntilReset: currentAttemptsStatus.timeUntilReset,
      };

      console.log(`[GAME_SERVICE] Current attempts status:`, attemptsStatus);
    } catch (attemptsError) {
      console.error("Failed to get current attempts status:", attemptsError);
      // Don't throw error, just log warning - game save was successful
    }

    const totalAttemptsAwarded = levelAttemptsAwarded + achievementAttemptsAwarded + questAttemptsAwarded;

    // Prepare response with best score information and attempts status
    const response: GameSaveResult = {
      success: true,
      levelChanged,
      newLevel: levelChanged ? newLevel : undefined,
      attemptsAwarded: levelAttemptsAwarded > 0 ? levelAttemptsAwarded : undefined,
      tournamentInfo,
      bestScoreInfo, // Best score information
      attemptsStatus, // NEW: Current attempts status
    };

    // Add achievement information if any were unlocked
    if (newAchievements.length > 0) {
      response.achievementsUnlocked = newAchievements.map((achievement) => ({
        id: achievement.achievement_id,
        name: achievement.achievement_name,
        attemptsAwarded: achievement.attempts_awarded,
      }));
    }

    // Add quest completion information
    if (questCompletions.length > 0) {
      response.questCompletions = questCompletions;
      response.questAttemptsAwarded = questAttemptsAwarded;
    }

    // Update total attempts awarded to include all sources
    if (totalAttemptsAwarded > 0) {
      response.totalAttemptsAwarded = totalAttemptsAwarded;
    }

    return response;
  },

  /**
   * Save regular game result
   */
  async saveGameResult(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
    return await this.updateGameStats(telegramId, gameResult);
  },

  // Export utility functions
  calculateReactionScore,
  getScoreMultiplier,
  calculateTotalScoreContribution,
  calculateModeSpecificScore,
  calculateLevel,
  LEVEL_CONFIG,
};