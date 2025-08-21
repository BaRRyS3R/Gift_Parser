// src/lib/server/dailyQuestsService.ts - ОПТИМИЗИРОВАННАЯ версия

import { supabaseServer } from "@/lib/supabase_server";
import { serverAttemptsService } from "./attemptsService";
import type {
  DailyQuest,
  UserDailyQuest,
  DailyQuestWithProgress,
  QuestProgressUpdate,
  QuestCompletionResult,
} from "@/types/daily-quests";
import { QuestType } from "@/types/daily-quests";
import { GameMode } from "@/types/game-modes/common";

// ОПТИМИЗАЦИЯ: Кэш для текущего квеста (сбрасывается каждый день)
let currentQuestCache: {
  quest: DailyQuest | null;
  date: string;
} = {
  quest: null,
  date: "",
};

/**
 * ОПТИМИЗИРОВАННЫЙ сервис для управления daily quests
 */
export const serverDailyQuestsService = {
  /**
   * ОПТИМИЗИРОВАННОЕ получение текущего квеста с кэшированием
   */
  async getCurrentDailyQuest(): Promise<DailyQuest | null> {
    const today = new Date().toISOString().split("T")[0];

    // Проверяем кэш
    if (currentQuestCache.date === today && currentQuestCache.quest) {
      return currentQuestCache.quest;
    }

    console.log(`[DEBUG-QUEST] Fetching quest from DB for date ${today}`);

    const { data, error } = await supabaseServer
      .from("daily_quests")
      .select("*")
      .eq("quest_date", today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching current daily quest:", error);
      throw new Error("Failed to fetch current daily quest");
    }

    // Обновляем кэш
    currentQuestCache = {
      quest: data,
      date: today,
    };

    return data;
  },

  /**
   * Получение прогресса пользователя
   */
  async getUserQuestProgress(
    userId: string,
    questId: string,
  ): Promise<UserDailyQuest | null> {
    const { data, error } = await supabaseServer
      .from("users_daily_quests")
      .select("*")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user quest progress:", error);
      throw new Error("Failed to fetch user quest progress");
    }

    return data;
  },

  /**
   * Получение текущего квеста с прогрессом пользователя
   */
  async getCurrentDailyQuestWithProgress(
    userId: string,
  ): Promise<DailyQuestWithProgress | null> {
    const quest = await this.getCurrentDailyQuest();

    if (!quest) {
      return null;
    }

    const progress = await this.getUserQuestProgress(userId, quest.id);

    return {
      quest,
      progress,
    };
  },

  /**
   * Инициализация прогресса квеста для пользователя
   */
  async initializeUserQuestProgress(
    userId: string,
    questId: string,
  ): Promise<UserDailyQuest> {
    const { data, error } = await supabaseServer
      .from("users_daily_quests")
      .insert({
        user_id: userId,
        quest_id: questId,
        progress_value: 0,
        is_completed: false,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error initializing user quest progress:", error);
      throw new Error("Failed to initialize user quest progress");
    }

    return data;
  },

  /**
   * ОПТИМИЗИРОВАННОЕ обновление прогресса квеста
   */
  async updateQuestProgress(
    userId: string,
    update: QuestProgressUpdate,
  ): Promise<QuestCompletionResult | null> {
    // Используем кэшированный квест
    const quest = await this.getCurrentDailyQuest();

    if (!quest || quest.id !== update.questId) {
      return null;
    }

    // Валидация обновления
    if (!this.shouldUpdateQuest(quest, update)) {
      return null;
    }

    // Получаем или создаем прогресс пользователя
    let userQuest = await this.getUserQuestProgress(userId, quest.id);

    if (!userQuest) {
      userQuest = await this.initializeUserQuestProgress(userId, quest.id);
    }

    // Проверяем завершен ли квест
    if (userQuest.is_completed) {
      return null;
    }

    const previousProgress = userQuest.progress_value;
    const newProgress = Math.min(
      previousProgress + update.value,
      quest.target_value,
    );
    const isCompleted = newProgress >= quest.target_value;

    // Обновляем прогресс в БД
    const { data: updatedQuest, error } = await supabaseServer
      .from("users_daily_quests")
      .update({
        progress_value: newProgress,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", userQuest.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating quest progress:", error);
      throw new Error("Failed to update quest progress");
    }

    // Если квест завершен, начисляем попытки
    let attemptsAwarded = 0;

    if (isCompleted && !userQuest.is_completed) {
      try {
        // Получаем telegram_id пользователя
        const { data: user, error: userError } = await supabaseServer
          .from("users")
          .select("telegram_id")
          .eq("id", userId)
          .single();

        if (userError || !user) {
          console.error("Error finding user for quest completion:", userError);
        } else {
          await serverAttemptsService.addBonusAttempts(
            user.telegram_id,
            quest.reward_attempts,
            `Daily quest completion: ${quest.quest_type}`,
          );
          attemptsAwarded = quest.reward_attempts;
        }
      } catch (attemptsError) {
        console.error("Error awarding quest completion attempts:", attemptsError);
      }
    }

    return {
      questId: quest.id,
      completed: isCompleted,
      attemptsAwarded,
      previousProgress,
      newProgress,
      targetValue: quest.target_value,
    };
  },

  /**
   * Определение применимости обновления квеста
   */
  shouldUpdateQuest(quest: DailyQuest, update: QuestProgressUpdate): boolean {
    // Проверяем режим игры
    if (quest.game_mode !== "any" && quest.game_mode !== update.gameMode) {
      return false;
    }

    // Проверяем тип квеста
    if (quest.quest_type !== update.questType) {
      return false;
    }

    return true;
  },

  /**
   * Создание обновлений квеста из результата игры
   */
  createQuestUpdatesFromGame(
    gameMode: GameMode,
    gameResult: any,
  ): QuestProgressUpdate[] {
    const updates: QuestProgressUpdate[] = [];

    // Всегда создаем обновление "сыграть игры"
    updates.push({
      questId: "", // Будет заполнено вызывающим кодом
      gameMode,
      questType: QuestType.PLAY_GAMES,
      value: 1,
    });

    // Создаем обновление очков
    if (gameResult.score && gameResult.score > 0) {
      updates.push({
        questId: "",
        gameMode,
        questType: QuestType.SCORE_POINTS,
        value: Math.floor(gameResult.score),
      });
    }

    // Создаем обновление попаданий по кругам
    let circlesHit = 0;

    switch (gameMode) {
      case GameMode.SURVIVAL:
      case GameMode.ROTATION:
        circlesHit = gameResult.correctHits || 0;
        break;
      case GameMode.PHYSICS:
        circlesHit = gameResult.totalHits || 0;
        break;
      case GameMode.REACTION:
        circlesHit = gameResult.missed ? 0 : 1;
        break;
    }

    if (circlesHit > 0) {
      updates.push({
        questId: "",
        gameMode,
        questType: QuestType.HIT_CIRCLES,
        value: circlesHit,
      });
    }

    return updates;
  },

  /**
   * МАКСИМАЛЬНО ОПТИМИЗИРОВАННАЯ обработка обновлений квестов после игры
   */
  async processGameQuestUpdates(
    userId: string,
    gameMode: GameMode,
    gameResult: any,
  ): Promise<QuestCompletionResult[]> {
    const startTime = Date.now();
    console.log(`[DEBUG-QUEST-OPT] Starting optimized quest processing...`);

    // ЭТАП 1: Получаем кэшированный квест (быстро)
    const quest = await this.getCurrentDailyQuest();

    if (!quest) {
      console.log(`[DEBUG-QUEST-OPT] No active quest found (${Date.now() - startTime}ms)`);
      return [];
    }

    console.log(`[DEBUG-QUEST-OPT] Got quest from cache: ${quest.id} (${Date.now() - startTime}ms)`);

    // ЭТАП 2: Создаем все обновления
    const updates = this.createQuestUpdatesFromGame(gameMode, gameResult);
    console.log(`[DEBUG-QUEST-OPT] Created ${updates.length} quest updates (${Date.now() - startTime}ms)`);

    // Устанавливаем ID квеста для всех обновлений
    updates.forEach(update => {
      update.questId = quest.id;
    });

    // ЭТАП 3: Фильтруем только применимые обновления (до DB запросов)
    const applicableUpdates = updates.filter(update => 
      this.shouldUpdateQuest(quest, update)
    );

    if (applicableUpdates.length === 0) {
      console.log(`[DEBUG-QUEST-OPT] No applicable updates for quest type ${quest.quest_type}, mode ${quest.game_mode} (${Date.now() - startTime}ms)`);
      return [];
    }

    console.log(`[DEBUG-QUEST-OPT] ${applicableUpdates.length} applicable updates after filtering (${Date.now() - startTime}ms)`);

    // ЭТАП 4: Получаем прогресс пользователя ОДИН раз
    let userQuest = await this.getUserQuestProgress(userId, quest.id);

    if (!userQuest) {
      console.log(`[DEBUG-QUEST-OPT] Creating new user quest progress (${Date.now() - startTime}ms)`);
      userQuest = await this.initializeUserQuestProgress(userId, quest.id);
    }

    // Если квест уже завершен, возвращаем пустой результат
    if (userQuest.is_completed) {
      console.log(`[DEBUG-QUEST-OPT] Quest already completed (${Date.now() - startTime}ms)`);
      return [];
    }

    console.log(`[DEBUG-QUEST-OPT] User quest progress loaded (${Date.now() - startTime}ms)`);

    // ЭТАП 5: BATCH обновление - суммируем все применимые обновления
    const totalValue = applicableUpdates.reduce((sum, update) => sum + update.value, 0);
    const previousProgress = userQuest.progress_value;
    const newProgress = Math.min(
      previousProgress + totalValue,
      quest.target_value,
    );
    const isCompleted = newProgress >= quest.target_value;

    console.log(`[DEBUG-QUEST-OPT] Calculated progress: ${previousProgress} + ${totalValue} = ${newProgress}/${quest.target_value} (${Date.now() - startTime}ms)`);

    // ЭТАП 6: ОДНО обновление в БД вместо множественных
    const { data: updatedQuest, error } = await supabaseServer
      .from("users_daily_quests")
      .update({
        progress_value: newProgress,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", userQuest.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating quest progress:", error);
      throw new Error("Failed to update quest progress");
    }

    console.log(`[DEBUG-QUEST-OPT] Progress updated in DB (${Date.now() - startTime}ms)`);

    // ЭТАП 7: Начисляем попытки если квест завершен
    let attemptsAwarded = 0;

    if (isCompleted && !userQuest.is_completed) {
      console.log(`[DEBUG-QUEST-OPT] Quest completed! Awarding attempts... (${Date.now() - startTime}ms)`);
      
      try {
        const { data: user, error: userError } = await supabaseServer
          .from("users")
          .select("telegram_id")
          .eq("id", userId)
          .single();

        if (userError || !user) {
          console.error("Error finding user for quest completion:", userError);
        } else {
          await serverAttemptsService.addBonusAttempts(
            user.telegram_id,
            quest.reward_attempts,
            `Daily quest completion: ${quest.quest_type}`,
          );
          attemptsAwarded = quest.reward_attempts;
          console.log(`[DEBUG-QUEST-OPT] Awarded ${attemptsAwarded} attempts (${Date.now() - startTime}ms)`);
        }
      } catch (attemptsError) {
        console.error("Error awarding quest completion attempts:", attemptsError);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[DEBUG-QUEST-OPT] Quest processing completed in ${totalTime}ms`);

    // ЭТАП 8: Возвращаем результат
    return [{
      questId: quest.id,
      completed: isCompleted,
      attemptsAwarded,
      previousProgress,
      newProgress,
      targetValue: quest.target_value,
    }];
  },

  /**
   * Статистика квестов (для админа)
   */
  async getQuestStatistics(questId: string) {
    const { data, error } = await supabaseServer
      .from("users_daily_quests")
      .select("*")
      .eq("quest_id", questId);

    if (error) {
      console.error("Error fetching quest statistics:", error);
      throw new Error("Failed to fetch quest statistics");
    }

    const totalParticipants = data.length;
    const completedCount = data.filter(q => q.is_completed).length;
    const averageProgress = data.length > 0 
      ? data.reduce((sum, q) => sum + q.progress_value, 0) / data.length
      : 0;

    return {
      questId,
      totalParticipants,
      completedCount,
      completionRate: totalParticipants > 0 ? completedCount / totalParticipants : 0,
      averageProgress,
    };
  },

  /**
   * УТИЛИТА: Очистка кэша (для тестирования)
   */
  clearCache() {
    currentQuestCache = {
      quest: null,
      date: "",
    };
  },
};