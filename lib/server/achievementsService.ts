// src/lib/server/achievementsService.ts - Server-side achievements management

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
 * Server-side achievements service
 */
export const serverAchievementsService = {
  /**
   * Check and award achievements for a user
   * This is called automatically after each game save
   */
  async checkAndAwardAchievements(
    telegramId: number,
  ): Promise<AchievementUnlockResult[]> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "check_and_award_achievements",
        {
          p_telegram_id: telegramId,
        },
      );

      if (error) {
        console.error("Error checking achievements:", error);

        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in checkAndAwardAchievements:", error);

      return [];
    }
  },

  /**
   * Get all achievements for a user with their unlock status
   */
  async getUserAchievements(telegramId: number): Promise<UserAchievementsData> {
    try {
      const { data, error } = await supabaseServer.rpc(
        "get_user_achievements",
        {
          p_telegram_id: telegramId,
        },
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
   * Get list of unlocked achievement IDs for quick display
   */
  async getUnlockedAchievementIds(telegramId: number): Promise<string[]> {
    try {
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (userError || !user) {
        console.error("User not found:", userError);

        return [];
      }

      const { data, error } = await supabaseServer
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error getting unlocked achievements:", error);

        return [];
      }

      return data?.map((item) => item.achievement_id) || [];
    } catch (error) {
      console.error("Error fetching unlocked achievement IDs:", error);

      return [];
    }
  },

  /**
   * Manually check if a specific achievement should be unlocked
   * Used for debugging or manual verification
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
};
