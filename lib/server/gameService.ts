// src/lib/server/gameService.ts - Updated with comprehensive performance logging

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { supabaseServer } from "../supabase_server";

import { serverAchievementsService } from "./achievementsService";
import { serverTournamentService } from "./tournamentService";
import { serverDailyQuestsService } from "./dailyQuestsService";

import { GameMode } from "@/types/game-modes/common";

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Enhanced game save result with tournaments, achievements, and daily quests
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
    position?: number;
    improved: boolean;
  };
  // Daily quest information
  questCompletions?: Array<{
    questId: string;
    completed: boolean;
    attemptsAwarded: number;
  }>;
  questAttemptsAwarded?: number;
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
 * Performance logger utility
 */
class PerformanceLogger {
  private startTime: number;
  private lastCheckpoint: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    this.lastCheckpoint = this.startTime;
    console.log(`[GameService] 🚀 Started: ${operation}`);
  }

  checkpoint(step: string, data?: any) {
    const now = Date.now();
    const stepTime = now - this.lastCheckpoint;
    const totalTime = now - this.startTime;
    
    console.log(`[GameService] ⏱️  ${this.operation} -> ${step}: ${stepTime}ms (Total: ${totalTime}ms)`, data ? data : '');
    this.lastCheckpoint = now;
  }

  finish(result?: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[GameService] ✅ Completed: ${this.operation} in ${totalTime}ms`, result ? { success: result.success } : '');
  }

  error(error: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[GameService] ❌ Failed: ${this.operation} after ${totalTime}ms`, error.message || error);
  }
}

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
    const logger = new PerformanceLogger(`updateGameStats(telegramId: ${telegramId}, mode: ${gameResult.mode})`);

    try {
      // Get user data
      logger.checkpoint("Fetching user data from database");
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        logger.error(new Error("User not found"));
        throw new Error("User not found");
      }

      logger.checkpoint("User data fetched", { userId: user.id, currentLevel: user.current_level, totalGames: user.total_games });

      // Calculate game statistics
      logger.checkpoint("Calculating game statistics");
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

      logger.checkpoint("Statistics calculated", { 
        newTotalGames, 
        newLevel, 
        levelChanged, 
        totalScoreContribution, 
        modeSpecificScore 
      });

      // Prepare updates object
      logger.checkpoint("Preparing user updates");
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
        updates.attempts_remaining =
          user.attempts_remaining + levelAttemptsAwarded;
          
        logger.checkpoint("Level up calculated", { 
          levelsGained, 
          levelAttemptsAwarded, 
          newAttemptsRemaining: updates.attempts_remaining 
        });
      }

      // Mode-specific statistics updates
      logger.checkpoint("Applying mode-specific updates");
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

      logger.checkpoint("Mode-specific updates prepared", { updateFields: Object.keys(updates).length });

      // Update user stats in database
      logger.checkpoint("Updating user stats in database");
      const updateStartTime = Date.now();
      const { error: updateError } = await supabaseServer
        .from("users")
        .update(updates)
        .eq("telegram_id", telegramId);

      if (updateError) {
        logger.error(updateError);
        console.error("Error updating user stats:", updateError);
        throw new Error("Failed to update user statistics");
      }

      const updateTime = Date.now() - updateStartTime;
      logger.checkpoint("User stats updated in database", { updateTime: `${updateTime}ms` });

      // Process daily quest updates after user stats are updated
      logger.checkpoint("Processing daily quest updates");
      let questCompletions: any[] = [];
      let questAttemptsAwarded = 0;

      try {
        const questStartTime = Date.now();
        const questResults = await serverDailyQuestsService.processGameQuestUpdates(
          user.id,
          gameResult.mode,
          gameResult,
        );

        questCompletions = questResults.map(result => ({
          questId: result.questId,
          completed: result.completed,
          attemptsAwarded: result.attemptsAwarded,
        }));

        questAttemptsAwarded = questResults.reduce(
          (total, result) => total + result.attemptsAwarded,
          0,
        );

        const questTime = Date.now() - questStartTime;
        logger.checkpoint("Daily quests processed", { 
          questTime: `${questTime}ms`, 
          completions: questCompletions.length, 
          attemptsAwarded: questAttemptsAwarded 
        });
      } catch (questError) {
        const questTime = Date.now() - updateStartTime;
        const errorMessage = questError instanceof Error ? questError.message : String(questError);
        logger.checkpoint("Daily quest update failed", { questTime: `${questTime}ms`, error: errorMessage });
        console.warn("Daily quest update failed but game saved:", questError);
      }

      // Check and award achievements after stats update
      logger.checkpoint("Processing achievements");
      let newAchievements: any[] = [];
      let achievementAttemptsAwarded = 0;

      try {
        const achievementStartTime = Date.now();
        newAchievements =
          await serverAchievementsService.checkAndAwardAchievements(telegramId);

        achievementAttemptsAwarded = newAchievements.reduce(
          (total: number, achievement: any) =>
            total + achievement.attempts_awarded,
          0,
        );

        const achievementTime = Date.now() - achievementStartTime;
        logger.checkpoint("Achievements processed", { 
          achievementTime: `${achievementTime}ms`, 
          newAchievements: newAchievements.length, 
          attemptsAwarded: achievementAttemptsAwarded 
        });
      } catch (achievementError) {
        const achievementTime = Date.now() - updateStartTime;
        const errorMessage = achievementError instanceof Error ? achievementError.message : String(achievementError);
        logger.checkpoint("Achievement check failed", { achievementTime: `${achievementTime}ms`, error: errorMessage });
        console.warn("Achievement check failed but game saved:", achievementError);
      }

      // Check for active tournament and update tournament leaderboard
      logger.checkpoint("Processing tournament updates");
      let tournamentInfo: any = undefined;

      try {
        const tournamentStartTime = Date.now();

        const isTournamentActive =
          await serverTournamentService.isTournamentActiveForMode(
            gameResult.mode,
          );

        logger.checkpoint("Tournament active check completed", { 
          checkTime: `${Date.now() - tournamentStartTime}ms`, 
          isActive: isTournamentActive 
        });

        if (isTournamentActive) {
          const activeTournament =
            await serverTournamentService.getActiveTournament();

          if (
            activeTournament &&
            activeTournament.mode === gameResult.mode.toLowerCase()
          ) {
            logger.checkpoint("Active tournament found", { tournamentId: activeTournament.id, tournamentName: activeTournament.name });

            // Get previous tournament entry to check for improvements
            const previousPosition =
              await serverTournamentService.getUserTournamentPosition(
                activeTournament.id,
                telegramId,
              );

            logger.checkpoint("Previous tournament position fetched", { position: previousPosition?.position });

            // Update tournament leaderboard
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

            logger.checkpoint("Tournament leaderboard updated");

            // Get new position after update
            const newPosition =
              await serverTournamentService.getUserTournamentPosition(
                activeTournament.id,
                telegramId,
              );

            logger.checkpoint("New tournament position fetched", { position: newPosition?.position });

            // Check if this is a new best score in tournament
            const newBestScore =
              !previousPosition ||
              (newPosition &&
                newPosition.entry.best_score >
                  (previousPosition.entry.best_score || 0));

            tournamentInfo = {
              tournamentId: activeTournament.id,
              tournamentName: activeTournament.name,
              newBestScore,
              position: newPosition?.position,
              improved:
                !previousPosition ||
                (newPosition && newPosition.position < previousPosition.position),
              previousPosition: previousPosition?.position,
              scoreImprovement: newBestScore
                ? modeSpecificScore - (previousPosition?.entry.best_score || 0)
                : undefined,
            };

            const tournamentTime = Date.now() - tournamentStartTime;
            logger.checkpoint("Tournament processing completed", { 
              tournamentTime: `${tournamentTime}ms`, 
              newBestScore, 
              positionImproved: tournamentInfo.improved 
            });
          }
        }
      } catch (tournamentError) {
        const tournamentTime = Date.now() - updateStartTime;
        const errorMessage = tournamentError instanceof Error ? tournamentError.message : String(tournamentError);
        logger.checkpoint("Tournament update failed", { tournamentTime: `${tournamentTime}ms`, error: errorMessage });
        console.warn("Tournament update failed but game saved:", tournamentError);
      }

      const totalAttemptsAwarded =
        levelAttemptsAwarded + achievementAttemptsAwarded + questAttemptsAwarded;

      logger.checkpoint("Preparing response", { totalAttemptsAwarded });

      // Prepare response
      const response: GameSaveResult = {
        success: true,
        levelChanged,
        newLevel: levelChanged ? newLevel : undefined,
        attemptsAwarded:
          levelAttemptsAwarded > 0 ? levelAttemptsAwarded : undefined,
        tournamentInfo,
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

      logger.finish(response);
      return response;

    } catch (error) {
      logger.error(error);
      throw error;
    }
  },

  /**
   * Save regular game result (non-tournament)
   */
  async saveGameResult(
    telegramId: number,
    gameResult: GameResult,
  ): Promise<GameSaveResult> {
    const logger = new PerformanceLogger(`saveGameResult(telegramId: ${telegramId}, mode: ${gameResult.mode})`);

    try {
      const result = await this.updateGameStats(telegramId, gameResult);
      logger.finish(result);
      return result;
    } catch (error) {
      logger.error(error);
      throw error;
    }
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