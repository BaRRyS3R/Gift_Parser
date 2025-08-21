// src/lib/server/achievementsService.ts - ОПТИМИЗИРОВАННАЯ версия

import { supabaseServer } from "../supabase_server";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  attempts_reward: number;
  icon: string;
  color: string;
  bg_color: string;
  unlocked: boolean;
  unlocked_at?: string;
  progress?: number;
  max_progress?: number;
}

export interface AchievementUnlockResult {
  achievement_id: string;
  achievement_name: string;
  attempts_awarded: number;
  newly_unlocked: boolean;
}

export interface UserAchievementsData {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  recentlyUnlocked: Achievement[];
  totalAttemptsEarned: number;
}

/**
 * ОПТИМИЗИРОВАННЫЙ сервис достижений
 */
export const serverAchievementsService = {
  /**
   * ОПТИМИЗИРОВАННАЯ проверка и выдача достижений
   * Использует новую быструю RPC функцию без логирования
   */
  async checkAndAwardAchievements(
    telegramId: number,
  ): Promise<AchievementUnlockResult[]> {
    try {
      console.log(`[DEBUG-ACH-NEW] Using optimized achievement function...`);
      
      const { data, error } = await supabaseServer.rpc(
        "check_and_award_achievements_optimized", // НОВАЯ ФУНКЦИЯ
        { p_telegram_id: telegramId }
      );

      if (error) {
        console.error("Error checking achievements:", error);
        return [];
      }

      console.log(`[DEBUG-ACH-NEW] Optimized function returned ${data?.length || 0} results`);
      
      return (data || []).map((item: any) => ({
        achievement_id: item.achievement_id,
        achievement_name: item.achievement_name,
        attempts_awarded: item.attempts_awarded,
        newly_unlocked: item.newly_unlocked,
      }));
    } catch (error) {
      console.error("Error in optimized checkAndAwardAchievements:", error);
      return [];
    }
  },

  /**
   * FALLBACK: Старая функция (если новая не работает)
   */
  async checkAndAwardAchievementsLegacy(
    telegramId: number,
  ): Promise<AchievementUnlockResult[]> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "check_and_award_achievements", // СТАРАЯ ФУНКЦИЯ
        { p_telegram_id: telegramId }
      );

      if (error) {
        console.error("Error checking achievements (legacy):", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in legacy checkAndAwardAchievements:", error);
      return [];
    }
  },

  /**
   * КЭШИРОВАННОЕ получение достижений пользователя
   */
  async getUserAchievements(telegramId: number): Promise<UserAchievementsData> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "get_user_achievements",
        { p_telegram_id: telegramId }
      );

      if (error) {
        console.error("Error getting user achievements:", error);
        throw error;
      }

      const achievements: Achievement[] = (data || []).map((item: any) => ({
        id: item.achievement_id,
        name: item.achievement_name,
        description: item.achievement_description,
        attempts_reward: item.attempts_reward,
        icon: item.icon,
        color: item.color,
        bg_color: item.bg_color,
        unlocked: item.unlocked,
        unlocked_at: item.unlocked_at,
        progress: item.progress,
        max_progress: item.max_progress,
      }));

      const unlockedAchievements = achievements.filter((a) => a.unlocked);
      const recentlyUnlocked = unlockedAchievements
        .filter((a) => a.unlocked_at)
        .sort((a, b) => {
          const dateA = new Date(a.unlocked_at!).getTime();
          const dateB = new Date(b.unlocked_at!).getTime();
          return dateB - dateA;
        })
        .slice(0, 3);

      const totalAttemptsEarned = unlockedAchievements.reduce(
        (total, achievement) => total + achievement.attempts_reward,
        0,
      );

      return {
        achievements,
        unlockedCount: unlockedAchievements.length,
        totalCount: achievements.length,
        recentlyUnlocked,
        totalAttemptsEarned,
      };
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      throw new Error("Failed to fetch user achievements");
    }
  },

  /**
   * БЫСТРОЕ получение только ID разблокированных достижений
   */
  async getUnlockedAchievementIds(telegramId: number): Promise<string[]> {
    try {
      // ОПТИМИЗАЦИЯ: Делаем JOIN сразу вместо двух запросов
      const { data, error } = await supabaseServer
        .from("users")
        .select(`
          user_achievements!inner(achievement_id)
        `)
        .eq("telegram_id", telegramId)
        .single();

      if (error) {
        console.error("Error getting unlocked achievements:", error);
        return [];
      }

      return data?.user_achievements?.map((item: any) => item.achievement_id) || [];
    } catch (error) {
      console.error("Error fetching unlocked achievement IDs:", error);
      return [];
    }
  },

  /**
   * Быстрая проверка конкретного достижения
   */
  async checkSpecificAchievement(
    telegramId: number,
    achievementId: string,
  ): Promise<boolean> {
    try {
      const { data: user, error } = await supabaseServer
        .from("users")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      if (error || !user) {
        return false;
      }

      switch (achievementId) {
        case "first_game":
          return user.total_games >= 1;
        case "all_modes_player":
          return (
            user.reaction_games >= 1 &&
            user.survival_games >= 1 &&
            user.physics_games >= 1 &&
            user.rotation_games >= 1
          );
        case "super_recruiter":
          return user.referral_count >= 100;
        case "lightning_reflexes":
          return user.reaction_best_time > 0 && user.reaction_best_time < 10;
        default:
          return false;
      }
    } catch (error) {
      console.error("Error checking specific achievement:", error);
      return false;
    }
  },

  /**
   * BATCH создание достижений для новых пользователей
   */
  async initializeUserAchievements(telegramId: number): Promise<void> {
    try {
      // Проверяем достижения которые новый пользователь может получить сразу
      await this.checkAndAwardAchievements(telegramId);
    } catch (error) {
      console.error("Error initializing user achievements:", error);
      // Не критично для регистрации пользователя
    }
  },

  /**
   * СТАТИСТИКА достижений (для админки)
   */
  async getAchievementStats(): Promise<any> {
    try {
      const { data, error } = await supabaseServer
        .from("achievements")
        .select(`
          id,
          name,
          user_achievements(count)
        `);

      if (error) {
        console.error("Error getting achievement stats:", error);
        return [];
      }

      return data?.map((achievement: any) => ({
        id: achievement.id,
        name: achievement.name,
        unlockedCount: achievement.user_achievements?.[0]?.count || 0,
      })) || [];
    } catch (error) {
      console.error("Error fetching achievement stats:", error);
      return [];
    }
  },
};