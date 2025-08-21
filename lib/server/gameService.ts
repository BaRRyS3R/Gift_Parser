// src/lib/server/gameService.ts - ОПТИМИЗИРОВАННАЯ версия

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { supabaseServer } from "../supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Game result union type
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

// Enhanced game save result
export interface GameSaveResult {
  success: boolean;
  levelChanged?: boolean;
  newLevel?: number;
  attemptsAwarded?: number;
  achievementsUnlocked?: Array<{
    id: string;
    name: string;
    attemptsAwarded: number;
  }>;
  totalAttemptsAwarded?: number;
  tournamentInfo?: {
    tournamentId: string;
    tournamentName: string;
    newBestScore: boolean;
    position?: number;
    improved: boolean;
  };
  questCompletions?: Array<{
    questId: string;
    completed: boolean;
    attemptsAwarded: number;
  }>;
  questAttemptsAwarded?: number;
  error?: string;
}

// Вспомогательные интерфейсы для дополнительных систем
interface AchievementResult {
  achievements: Array<{
    id: string;
    name: string;
    attemptsAwarded: number;
  }>;
  attemptsAwarded: number;
}

interface QuestResult {
  completions: Array<{
    questId: string;
    completed: boolean;
    attemptsAwarded: number;
  }>;
  attemptsAwarded: number;
}

interface TournamentResult {
  tournamentId: string;
  tournamentName: string;
  newBestScore: boolean;
  position?: number;
  improved: boolean;
}

/**
 * Convert GameResult to JSONB format for RPC
 */
function convertToGameData(gameResult: GameResult): Record<string, any> {
  const base = {
    mode: gameResult.mode,
    score: gameResult.score,
    duration: gameResult.duration,
  };

  switch (gameResult.mode) {
    case GameMode.REACTION:
      const reactionResult = gameResult as ReactionGameResult;
      return {
        ...base,
        reactionTime: reactionResult.reactionTime,
        missed: reactionResult.missed,
      };

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

/**
 * ОПТИМИЗИРОВАННЫЙ сервис сохранения игры
 */
export const serverGameService = {
  /**
   * ОСНОВНОЙ метод - атомарное сохранение через RPC
   * Было: 5-7 последовательных запросов, стало: 1 + 3 параллельных
   */
  async saveGameResult(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
    const startTime = Date.now();
    console.log(`[DEBUG] Starting game save for mode ${gameResult.mode}`);

    try {
      // ЭТАП 1: АТОМАРНОЕ сохранение основных данных
      const step1Start = Date.now();
      const gameData = convertToGameData(gameResult);

      console.log(`[DEBUG] Calling RPC save_game_with_level_system...`);

      const { data: mainResult, error: mainError } = await supabaseServer.rpc(
        'save_game_with_level_system',
        {
          p_telegram_id: telegramId,
          p_game_mode: gameResult.mode.toLowerCase(),
          p_score: gameResult.score,
          p_duration: gameResult.duration,
          p_game_data: gameData,
        }
      );

      const step1End = Date.now();
      console.log(`[DEBUG] RPC completed in ${step1End - step1Start}ms`);

      if (mainError || !mainResult || mainResult.length === 0) {
        console.error('Error in save_game_with_level_system:', mainError);
        throw new Error('Failed to save game data');
      }

      const result = mainResult[0];

      if (!result.success) {
        throw new Error('Game save operation failed');
      }

      console.log(`[DEBUG] Main save successful, level_changed: ${result.level_changed}`);

      // ЭТАП 2: ПАРАЛЛЕЛЬНОЕ выполнение дополнительных систем
      const step2Start = Date.now();
      console.log(`[DEBUG] Starting parallel additional systems...`);

      const [achievementsResult, questsResult, tournamentResult] = await Promise.allSettled([
        this.processAchievements(telegramId).catch(error => {
          console.warn('Achievement processing failed but game saved:', error);
          return null;
        }),
        this.processQuests(result.user_id, gameResult).catch(error => {
          console.warn('Quest processing failed but game saved:', error);
          return null;
        }),
        this.processTournament(telegramId, gameResult, result.mode_score_added).catch(error => {
          console.warn('Tournament processing failed but game saved:', error);
          return null;
        }),
      ]);

      const step2End = Date.now();
      console.log(`[DEBUG] Parallel systems completed in ${step2End - step2Start}ms`);

      // Логирование результатов каждой системы
      console.log(`[DEBUG] Achievements: ${achievementsResult.status}`);
      console.log(`[DEBUG] Quests: ${questsResult.status}`);
      console.log(`[DEBUG] Tournament: ${tournamentResult.status}`);

      // ЭТАП 3: Обработка результатов
      const step3Start = Date.now();

      let achievementsUnlocked: any[] = [];
      let achievementAttemptsAwarded = 0;

      if (achievementsResult.status === 'fulfilled' && achievementsResult.value) {
        achievementsUnlocked = achievementsResult.value.achievements;
        achievementAttemptsAwarded = achievementsResult.value.attemptsAwarded;
        console.log(`[DEBUG] Achievements unlocked: ${achievementsUnlocked.length}`);
      }

      let questCompletions: any[] = [];
      let questAttemptsAwarded = 0;

      if (questsResult.status === 'fulfilled' && questsResult.value) {
        questCompletions = questsResult.value.completions;
        questAttemptsAwarded = questsResult.value.attemptsAwarded;
        console.log(`[DEBUG] Quest completions: ${questCompletions.length}`);
      }

      let tournamentInfo: any = undefined;

      if (tournamentResult.status === 'fulfilled' && tournamentResult.value) {
        tournamentInfo = tournamentResult.value;
        console.log(`[DEBUG] Tournament updated: ${tournamentInfo.tournamentId}`);
      }

      // ЭТАП 4: Финальное обновление attempts
      const additionalAttempts = achievementAttemptsAwarded + questAttemptsAwarded;

      if (additionalAttempts > 0) {
        const step4Start = Date.now();
        console.log(`[DEBUG] Awarding additional attempts: ${additionalAttempts}`);
        await this.awardAdditionalAttempts(telegramId, additionalAttempts);
        const step4End = Date.now();
        console.log(`[DEBUG] Additional attempts awarded in ${step4End - step4Start}ms`);
      }

      const step3End = Date.now();
      console.log(`[DEBUG] Results processing completed in ${step3End - step3Start}ms`);

      const totalTime = Date.now() - startTime;
      console.log(`[DEBUG] Total game save time: ${totalTime}ms`);

      // Формирование ответа...
      const totalAttemptsAwarded = result.attempts_awarded + additionalAttempts;

      const response: GameSaveResult = {
        success: true,
        levelChanged: result.level_changed,
        newLevel: result.level_changed ? result.new_level : undefined,
        attemptsAwarded: result.attempts_awarded > 0 ? result.attempts_awarded : undefined,
        tournamentInfo,
      };

      if (achievementsUnlocked.length > 0) {
        response.achievementsUnlocked = achievementsUnlocked;
      }

      if (questCompletions.length > 0) {
        response.questCompletions = questCompletions;
        response.questAttemptsAwarded = questAttemptsAwarded;
      }

      if (totalAttemptsAwarded > 0) {
        response.totalAttemptsAwarded = totalAttemptsAwarded;
      }

      return response;

    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`[DEBUG] Game save failed after ${errorTime}ms:`, error);
      throw error;
    }
  },

  /**
   * ВСПОМОГАТЕЛЬНЫЕ методы для дополнительных систем
   */
  async processAchievements(telegramId: number): Promise<AchievementResult | null> {
    const startTime = Date.now();
    console.log(`[DEBUG-ACH] Starting achievements check for user ${telegramId}`);

    try {
      // Импорт должен быть динамическим для избежания circular dependencies
      const { serverAchievementsService } = await import('./achievementsService');

      console.log(`[DEBUG-ACH] Calling serverAchievementsService.checkAndAwardAchievements...`);
      const achievements = await serverAchievementsService.checkAndAwardAchievements(telegramId);

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[DEBUG-ACH] Achievements check completed in ${duration}ms, found ${achievements.length} achievements`);

      return {
        achievements: achievements.map((achievement: any) => ({
          id: achievement.achievement_id,
          name: achievement.achievement_name,
          attemptsAwarded: achievement.attempts_awarded,
        })),
        attemptsAwarded: achievements.reduce(
          (total: number, achievement: any) => total + achievement.attempts_awarded,
          0
        ),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`[DEBUG-ACH] Achievements error after ${duration}ms:`, error);
      return null;
    }
  },

  async processQuests(userId: string, gameResult: GameResult): Promise<QuestResult | null> {
    const startTime = Date.now();
    console.log(`[DEBUG-QUEST] Starting quests check for user ${userId}, mode ${gameResult.mode}`);

    try {
      // Импорт должен быть динамическим для избежания circular dependencies
      const { serverDailyQuestsService } = await import('./dailyQuestsService');

      console.log(`[DEBUG-QUEST] Calling serverDailyQuestsService.processGameQuestUpdates...`);
      const questResults = await serverDailyQuestsService.processGameQuestUpdates(
        userId,
        gameResult.mode,
        gameResult
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[DEBUG-QUEST] Quests check completed in ${duration}ms, found ${questResults.length} quest updates`);

      return {
        completions: questResults.map(result => ({
          questId: result.questId,
          completed: result.completed,
          attemptsAwarded: result.attemptsAwarded,
        })),
        attemptsAwarded: questResults.reduce(
          (total, result) => total + result.attemptsAwarded,
          0
        ),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`[DEBUG-QUEST] Quests error after ${duration}ms:`, error);
      return null;
    }
  },

  async processTournament(
    telegramId: number,
    gameResult: GameResult,
    modeSpecificScore: number
  ): Promise<TournamentResult | null> {
    const startTime = Date.now();
    console.log(`[DEBUG-TOUR] Starting tournament check for user ${telegramId}, mode ${gameResult.mode}`);

    try {
      // Импорт должен быть динамическим для избежания circular dependencies
      const { serverTournamentService } = await import('./tournamentService');

      console.log(`[DEBUG-TOUR] Checking if tournament is active for mode ${gameResult.mode}...`);
      const isTournamentActive = await serverTournamentService.isTournamentActiveForMode(
        gameResult.mode
      );

      if (!isTournamentActive) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[DEBUG-TOUR] No active tournament for mode ${gameResult.mode} (${duration}ms)`);
        return null;
      }

      console.log(`[DEBUG-TOUR] Getting active tournament...`);
      const activeTournament = await serverTournamentService.getActiveTournament();

      if (!activeTournament || activeTournament.mode !== gameResult.mode.toLowerCase()) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[DEBUG-TOUR] Tournament mode mismatch or not found (${duration}ms)`);
        return null;
      }

      console.log(`[DEBUG-TOUR] Getting previous position...`);
      const previousPosition = await serverTournamentService.getUserTournamentPosition(
        activeTournament.id,
        telegramId
      );

      console.log(`[DEBUG-TOUR] Getting user info...`);
      const { data: user } = await supabaseServer
        .from('users')
        .select('id, first_name, last_name, username, is_premium')
        .eq('telegram_id', telegramId)
        .single();

      if (!user) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[DEBUG-TOUR] User not found for tournament (${duration}ms)`);
        return null;
      }

      console.log(`[DEBUG-TOUR] Converting game result to tournament format...`);
      const tournamentGameResult = this.convertToTournamentFormat(gameResult);

      console.log(`[DEBUG-TOUR] Updating tournament leaderboard...`);
      await serverTournamentService.updateTournamentLeaderboard(
        activeTournament.id,
        telegramId,
        tournamentGameResult,
        {
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          is_premium: user.is_premium,
        }
      );

      console.log(`[DEBUG-TOUR] Getting new position...`);
      const newPosition = await serverTournamentService.getUserTournamentPosition(
        activeTournament.id,
        telegramId
      );

      const newBestScore = !previousPosition ||
        (newPosition && newPosition.entry.best_score > (previousPosition.entry.best_score || 0));

      const improved = !previousPosition ||
        (newPosition && newPosition.position < previousPosition.position);

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[DEBUG-TOUR] Tournament processing completed in ${duration}ms`);

      return {
        tournamentId: activeTournament.id,
        tournamentName: activeTournament.name,
        newBestScore: Boolean(newBestScore),
        position: newPosition?.position,
        improved: Boolean(improved),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`[DEBUG-TOUR] Tournament error after ${duration}ms:`, error);
      return null;
    }
  },

  /**
   * Конвертация результата игры в турнирный формат
   */
  convertToTournamentFormat(gameResult: GameResult): any {
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
  },

  /**
   * Атомарное добавление дополнительных attempts
   */
  async awardAdditionalAttempts(telegramId: number, attemptsToAdd: number): Promise<void> {
    if (attemptsToAdd <= 0) return;

    try {
      // Получаем текущее количество attempts
      const { data: user, error: selectError } = await supabaseServer
        .from('users')
        .select('attempts_remaining')
        .eq('telegram_id', telegramId)
        .single();

      if (selectError || !user) {
        console.error('Error getting user attempts for additional award:', selectError);
        return;
      }

      // Обновляем с новым значением
      const { error } = await supabaseServer
        .from('users')
        .update({
          attempts_remaining: user.attempts_remaining + attemptsToAdd,
          attempts_reset_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', telegramId);

      if (error) {
        console.error('Error awarding additional attempts:', error);
        // Не бросаем ошибку - это не критично для основной функциональности
      }
    } catch (error) {
      console.error('Error in awardAdditionalAttempts:', error);
    }
  },

  // Compatibility methods (существующие utility функции)
  calculateLevel(totalGames: number): number {
    const GAMES_PER_LEVEL = 20;
    const STARTING_LEVEL = 1;
    const MAX_LEVEL = 10000;

    const calculatedLevel = Math.floor(totalGames / GAMES_PER_LEVEL) + STARTING_LEVEL;
    return Math.min(calculatedLevel, MAX_LEVEL);
  },

  calculateReactionScore(reactionTime: number, missed: boolean): number {
    if (missed) return 0;
    if (reactionTime < 50) return 50;
    if (reactionTime <= 150) return 40;
    if (reactionTime <= 250) return 30;
    if (reactionTime <= 400) return 20;
    return 10;
  },

  getScoreMultiplier(mode: GameMode): number {
    switch (mode) {
      case GameMode.REACTION: return 1;
      case GameMode.SURVIVAL: return 2;
      case GameMode.PHYSICS: return 4;
      case GameMode.ROTATION: return 3;
      default: return 1;
    }
  },

  // Legacy method for backward compatibility
  async updateGameStats(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
    return this.saveGameResult(telegramId, gameResult);
  },
};