// src/lib/server/gameService.ts - СУПЕР ОПТИМИЗИРОВАННАЯ версия

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
 * СУПЕР ОПТИМИЗИРОВАННЫЙ сервис сохранения игры
 */
export const serverGameService = {
  /**
   * ОСНОВНОЙ МЕТОД - Максимально оптимизированное сохранение
   * Цель: 1 RPC + 2 параллельных запроса = ~800ms вместо 6000ms
   */
  async saveGameResult(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
    const startTime = Date.now();
    console.log(`[DEBUG-OPT] Starting optimized game save for mode ${gameResult.mode}`);

    try {
      // ЭТАП 1: АТОМАРНОЕ сохранение основной статистики
      const step1Start = Date.now();
      const gameData = convertToGameData(gameResult);

      console.log(`[DEBUG-OPT] Calling optimized RPC save_game_with_level_system...`);

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
      console.log(`[DEBUG-OPT] Main RPC completed in ${step1End - step1Start}ms`);

      if (mainError || !mainResult || mainResult.length === 0) {
        console.error('Error in save_game_with_level_system:', mainError);
        throw new Error('Failed to save game data');
      }

      const result = mainResult[0];

      if (!result.success) {
        throw new Error('Game save operation failed');
      }

      // ЭТАП 2: ТОЛЬКО 2 ПАРАЛЛЕЛЬНЫХ СИСТЕМЫ (убрали Quests из параллельности)
      const step2Start = Date.now();
      console.log(`[DEBUG-OPT] Starting 2 parallel systems (achievements + tournaments)...`);

      const [achievementsResult, tournamentResult] = await Promise.allSettled([
        this.processAchievementsOptimized(telegramId).catch(error => {
          console.warn('Achievement processing failed but game saved:', error);
          return null;
        }),
        this.processTournamentOptimized(telegramId, gameResult, result.user_id).catch(error => {
          console.warn('Tournament processing failed but game saved:', error);
          return null;
        }),
      ]);

      const step2End = Date.now();
      console.log(`[DEBUG-OPT] Parallel systems completed in ${step2End - step2Start}ms`);

      // ЭТАП 3: ПОСЛЕДОВАТЕЛЬНАЯ обработка квестов (если нужно)
      const step3Start = Date.now();
      console.log(`[DEBUG-OPT] Processing quests sequentially...`);
      
      let questsResult: any = null;
      try {
        const { serverDailyQuestsService } = await import('./dailyQuestsService');
        const questResults = await serverDailyQuestsService.processGameQuestUpdates(
          result.user_id,
          gameResult.mode,
          gameResult
        );

        questsResult = {
          completions: questResults.map(r => ({
            questId: r.questId,
            completed: r.completed,
            attemptsAwarded: r.attemptsAwarded,
          })),
          attemptsAwarded: questResults.reduce((total, r) => total + r.attemptsAwarded, 0),
        };
      } catch (error) {
        console.warn('Quest processing failed but game saved:', error);
      }

      const step3End = Date.now();
      console.log(`[DEBUG-OPT] Quests completed in ${step3End - step3Start}ms`);

      // ЭТАП 4: Обработка результатов
      const step4Start = Date.now();

      let achievementsUnlocked: any[] = [];
      let achievementAttemptsAwarded = 0;

      if (achievementsResult.status === 'fulfilled' && achievementsResult.value) {
        achievementsUnlocked = achievementsResult.value.achievements;
        achievementAttemptsAwarded = achievementsResult.value.attemptsAwarded;
        console.log(`[DEBUG-OPT] Achievements unlocked: ${achievementsUnlocked.length}`);
      }

      let questCompletions: any[] = [];
      let questAttemptsAwarded = 0;

      if (questsResult) {
        questCompletions = questsResult.completions;
        questAttemptsAwarded = questsResult.attemptsAwarded;
        console.log(`[DEBUG-OPT] Quest completions: ${questCompletions.length}`);
      }

      let tournamentInfo: any = undefined;

      if (tournamentResult.status === 'fulfilled' && tournamentResult.value) {
        tournamentInfo = tournamentResult.value;
        console.log(`[DEBUG-OPT] Tournament updated: ${tournamentInfo.tournamentId}`);
      }

      // ЭТАП 5: BATCH обновление attempts (если есть дополнительные)
      const additionalAttempts = achievementAttemptsAwarded + questAttemptsAwarded;

      if (additionalAttempts > 0) {
        console.log(`[DEBUG-OPT] Awarding ${additionalAttempts} additional attempts...`);
        await this.awardAdditionalAttemptsBatch(telegramId, additionalAttempts);
      }

      const step4End = Date.now();
      console.log(`[DEBUG-OPT] Results processing completed in ${step4End - step4Start}ms`);

      const totalTime = Date.now() - startTime;
      console.log(`[DEBUG-OPT] TOTAL optimized save time: ${totalTime}ms`);

      // Формирование ответа
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
      console.error(`[DEBUG-OPT] Optimized save failed after ${errorTime}ms:`, error);
      throw error;
    }
  },

  /**
   * ОПТИМИЗИРОВАННАЯ обработка достижений
   */
  async processAchievementsOptimized(telegramId: number): Promise<any> {
    const startTime = Date.now();
    console.log(`[DEBUG-ACH-OPT] Starting optimized achievements...`);

    try {
      const { data, error } = await supabaseServer.rpc(
        "check_and_award_achievements_optimized", // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
        { p_telegram_id: telegramId }
      );

      if (error) {
        console.error("Error checking achievements:", error);
        return { achievements: [], attemptsAwarded: 0 };
      }

      const achievements = (data || []).map((item: any) => ({
        id: item.achievement_id,
        name: item.achievement_name,
        attemptsAwarded: item.attempts_awarded,
      }));

      const endTime = Date.now();
      console.log(`[DEBUG-ACH-OPT] Optimized achievements completed in ${endTime - startTime}ms, found ${achievements.length}`);

      return {
        achievements,
        attemptsAwarded: achievements.reduce((total: number, achievement: any) => total + achievement.attemptsAwarded, 0),
      };
    } catch (error) {
      const endTime = Date.now();
      console.error(`[DEBUG-ACH-OPT] Achievements error after ${endTime - startTime}ms:`, error);
      return { achievements: [], attemptsAwarded: 0 };
    }
  },

  /**
   * ОПТИМИЗИРОВАННАЯ обработка турниров
   */
  async processTournamentOptimized(
    telegramId: number,
    gameResult: GameResult,
    userId: string
  ): Promise<any> {
    const startTime = Date.now();
    console.log(`[DEBUG-TOUR-OPT] Starting optimized tournament...`);

    try {
      // ОПТИМИЗАЦИЯ: Сначала проверяем есть ли активные турниры для режима
      const { data: activeTournament, error: tournamentError } = await supabaseServer
        .from('tournaments')
        .select('id, name, game_mode')
        .eq('game_mode', gameResult.mode.toLowerCase())
        .eq('status', 'active')
        .gte('end_time', new Date().toISOString())
        .lte('start_time', new Date().toISOString())
        .single();

      if (tournamentError || !activeTournament) {
        console.log(`[DEBUG-TOUR-OPT] No active tournament for ${gameResult.mode} (${Date.now() - startTime}ms)`);
        return null;
      }

      // Получаем данные пользователя
      const { data: user } = await supabaseServer
        .from('users')
        .select('first_name, last_name, username, is_premium')
        .eq('telegram_id', telegramId)
        .single();

      if (!user) {
        console.log(`[DEBUG-TOUR-OPT] User not found (${Date.now() - startTime}ms)`);
        return null;
      }

      // Calculate tournament score
      let tournamentScore = gameResult.score;
      switch (gameResult.mode) {
        case GameMode.SURVIVAL: tournamentScore = gameResult.score * 2; break;
        case GameMode.PHYSICS: tournamentScore = gameResult.score * 4; break;
        case GameMode.ROTATION: tournamentScore = gameResult.score * 3; break;
      }

      const gameData = {
        score: gameResult.score,
        survivalTime: (gameResult as any).survivalTime,
        maxLevelReached: (gameResult as any).maxLevelReached,
        perfectStreak: (gameResult as any).perfectStreak,
        gameTime: (gameResult as any).gameTime,
        totalHits: (gameResult as any).totalHits,
        mistakesMade: (gameResult as any).mistakesMade,
      };

      // ИСПОЛЬЗУЕМ НОВУЮ BATCH ФУНКЦИЮ
      const { data: tournamentResult, error: processError } = await supabaseServer.rpc(
        'process_tournament_game_batch',
        {
          p_tournament_id: activeTournament.id,
          p_telegram_id: telegramId,
          p_user_id: userId,
          p_first_name: user.first_name,
          p_last_name: user.last_name,
          p_username: user.username,
          p_is_premium: user.is_premium,
          p_new_score: tournamentScore,
          p_game_mode: gameResult.mode.toLowerCase(),
          p_game_data: gameData,
        }
      );

      if (processError || !tournamentResult || tournamentResult.length === 0) {
        console.error("Error in tournament batch processing:", processError);
        return null;
      }

      const result = tournamentResult[0];
      const endTime = Date.now();
      console.log(`[DEBUG-TOUR-OPT] Optimized tournament completed in ${endTime - startTime}ms`);

      return {
        tournamentId: activeTournament.id,
        tournamentName: activeTournament.name,
        newBestScore: result.score_improved,
        position: result.new_position,
        improved: result.new_position < (result.previous_position || 999999),
      };

    } catch (error) {
      const endTime = Date.now();
      console.error(`[DEBUG-TOUR-OPT] Tournament error after ${endTime - startTime}ms:`, error);
      return null;
    }
  },

  /**
   * BATCH обновление attempts
   */
  async awardAdditionalAttemptsBatch(telegramId: number, attemptsToAdd: number): Promise<void> {
    if (attemptsToAdd <= 0) return;

    try {
      // ИСПРАВЛЕНО: Используем простой RPC запрос для безопасного обновления
      const { error } = await supabaseServer.rpc('add_user_attempts', {
        p_telegram_id: telegramId,
        p_attempts_to_add: attemptsToAdd,
      });

      if (error) {
        console.error('Error awarding additional attempts:', error);
        // FALLBACK: Если RPC не существует, делаем через обычный UPDATE
        const { data: user } = await supabaseServer
          .from('users')
          .select('attempts_remaining')
          .eq('telegram_id', telegramId)
          .single();

        if (user) {
          await supabaseServer
            .from('users')
            .update({
              attempts_remaining: user.attempts_remaining + attemptsToAdd,
              attempts_reset_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', telegramId);
        }
      }
    } catch (error) {
      console.error('Error in awardAdditionalAttemptsBatch:', error);
    }
  },

  // Legacy compatibility methods
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

  async updateGameStats(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
    return this.saveGameResult(telegramId, gameResult);
  },
};