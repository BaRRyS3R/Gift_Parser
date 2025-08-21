// src/lib/server/dailyQuestsService.ts - Fixed imports and types

import { supabaseServer } from "@/lib/supabase_server";
import { serverAttemptsService } from "./attemptsService";
import type {
  DailyQuest,
  UserDailyQuest,
  DailyQuestWithProgress,
  QuestProgressUpdate,
  QuestCompletionResult,
} from "@/types/daily-quests";
import { QuestType } from "@/types/daily-quests"; // Import as value
import { GameMode } from "@/types/game-modes/common";

/**
 * Server-side service for managing daily quests
 */
export const serverDailyQuestsService = {
  /**
   * Get current daily quest for today (UTC)
   */
  async getCurrentDailyQuest(): Promise<DailyQuest | null> {
    // Get today's date in UTC
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseServer
      .from("daily_quests")
      .select("*")
      .eq("quest_date", today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching current daily quest:", error);
      throw new Error("Failed to fetch current daily quest");
    }

    return data;
  },

  /**
   * Get user's progress for a specific quest
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
   * Get current daily quest with user progress
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
   * Initialize user quest progress (start tracking)
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
   * Update quest progress for a user
   */
  async updateQuestProgress(
    userId: string,
    update: QuestProgressUpdate,
  ): Promise<QuestCompletionResult | null> {
    // Get the quest details
    const quest = await this.getCurrentDailyQuest();

    if (!quest || quest.id !== update.questId) {
      return null; // Quest not found or not current
    }

    // Validate if this update should apply to this quest
    if (!this.shouldUpdateQuest(quest, update)) {
      return null; // Update doesn't apply to this quest
    }

    // Get or create user quest progress
    let userQuest = await this.getUserQuestProgress(userId, quest.id);

    if (!userQuest) {
      userQuest = await this.initializeUserQuestProgress(userId, quest.id);
    }

    // Check if quest is already completed
    if (userQuest.is_completed) {
      return null; // Quest already completed
    }

    const previousProgress = userQuest.progress_value;
    const newProgress = Math.min(
      previousProgress + update.value,
      quest.target_value,
    );
    const isCompleted = newProgress >= quest.target_value;

    // Update progress in database
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

    // If quest completed, award attempts
    let attemptsAwarded = 0;

    if (isCompleted && !userQuest.is_completed) {
      try {
        // Get user's telegram_id for attempts service
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
        // Don't fail the quest update if attempts award fails
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
   * Determine if a quest update should be applied based on game mode and quest type
   */
  shouldUpdateQuest(quest: DailyQuest, update: QuestProgressUpdate): boolean {
    // Check if game mode matches (or quest accepts any mode)
    if (quest.game_mode !== "any" && quest.game_mode !== update.gameMode) {
      return false;
    }

    // Check if quest type matches
    if (quest.quest_type !== update.questType) {
      return false;
    }

    return true;
  },

  /**
   * Create quest progress updates from game results
   */
  createQuestUpdatesFromGame(
    gameMode: GameMode,
    gameResult: any,
  ): QuestProgressUpdate[] {
    const updates: QuestProgressUpdate[] = [];

    // Always create a "play games" update
    updates.push({
      questId: "", // Will be filled by caller
      gameMode,
      questType: QuestType.PLAY_GAMES,
      value: 1, // One game played
    });

    // Create score points update
    if (gameResult.score && gameResult.score > 0) {
      updates.push({
        questId: "", // Will be filled by caller
        gameMode,
        questType: QuestType.SCORE_POINTS,
        value: Math.floor(gameResult.score), // Round down to integer
      });
    }

    // Create hit circles update (mode-specific)
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
        circlesHit = gameResult.missed ? 0 : 1; // 1 if hit, 0 if missed
        break;
    }

    if (circlesHit > 0) {
      updates.push({
        questId: "", // Will be filled by caller
        gameMode,
        questType: QuestType.HIT_CIRCLES,
        value: circlesHit,
      });
    }

    return updates;
  },

  /**
   * Process all quest updates for a user after a game
   */
  async processGameQuestUpdates(
    userId: string,
    gameMode: GameMode,
    gameResult: any,
  ): Promise<QuestCompletionResult[]> {
    const quest = await this.getCurrentDailyQuest();

    if (!quest) {
      return []; // No active quest
    }

    const updates = this.createQuestUpdatesFromGame(gameMode, gameResult);
    const results: QuestCompletionResult[] = [];

    // Set quest ID for all updates
    updates.forEach(update => {
      update.questId = quest.id;
    });

    // Process each update
    for (const update of updates) {
      try {
        const result = await this.updateQuestProgress(userId, update);

        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error("Error processing quest update:", error);
        // Continue processing other updates even if one fails
      }
    }

    return results;
  },

  /**
   * Get quest statistics for admin purposes
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
};