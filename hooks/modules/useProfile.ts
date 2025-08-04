// src/hooks/modules/useProfile.ts - Обновленный хук профиля с полными данными пользователя

import { useState, useCallback, useRef } from "react";

// Profile interfaces (обновленные)
export interface ReferralInfo {
  code: string;
  count: number;
  bonus: number;
  referredBy?: string;
  referredByName?: string;
  // Add computed fields for modal
  referralLink: string;
}

export interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics: number | null;
  rotation: number | null;
}

// Полные данные пользователя для профиля
export interface UserProfileGameStats {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  attempts_remaining: number;
  last_attempt_at?: string;
  attempts_reset_at?: string;
  referral_code: string;
  referred_by?: string;
  referral_bonus: number;
  referral_count: number;
  total_games: number;
  total_score: number;
  best_score: number;
  current_level: number;
  current_league_id?: number;
  reaction_games: number;
  reaction_best_score: number;
  reaction_best_time: number;
  reaction_average_time: number;
  survival_games: number;
  survival_best_score: number;
  survival_best_time: number;
  survival_max_level: number;
  survival_best_streak: number;
  physics_games: number;
  physics_best_score: number;
  physics_best_time: number;
  physics_total_hits: number;
  physics_best_hits: number;
  physics_least_mistakes: number;
  rotation_games: number;
  rotation_best_score: number;
  rotation_best_time: number;
  rotation_max_level: number;
  rotation_best_streak: number;
  rotation_total_hits: number;
  total_correct_hits: number;
  total_wrong_hits: number;
  total_missed_circles: number;
  best_accuracy: number;
  last_played_at?: string;
  is_active: boolean;
}

export interface ProfileData {
  user: UserProfileGameStats;
  referrals: ReferralInfo;
  rankings: UserRankings;
}

// Hook state interface
interface ProfileState {
  data: ProfileData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Унифицированный хук профиля для рефералов, рейтингов и полной статистики пользователя
 * Всегда загружает свежие данные - без кеширования
 */
export function useProfile(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<ProfileState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchingRef = useRef<boolean>(false);

  /**
   * Загрузить свежие данные профиля из API (всегда актуальные данные)
   */
  const fetchProfileData =
    useCallback(async (): Promise<ProfileData | null> => {
      // Wait for current request to complete instead of returning cached data
      if (fetchingRef.current) {

        // Wait for current fetch to complete
        return new Promise((resolve) => {
          const checkCompletion = () => {
            if (!fetchingRef.current) {
              resolve(state.data);
            } else {
              setTimeout(checkCompletion, 100);
            }
          };

          checkCompletion();
        });
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {

        const response = await makeAuthenticatedRequest("/api/user/profile");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch profile data");
        }

        const profileData: ProfileData = result.data;

        setState({
          data: profileData,
          isLoading: false,
          error: null,
        });

        return profileData;
      } catch (error) {
        console.error("Error fetching profile data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Сброс данных профиля
   */
  const resetProfileData = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Очистка состояния ошибки
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Вычисление достижений на основе данных пользователя и рейтингов
   */
  const calculateAchievements = useCallback(
    (user: UserProfileGameStats, rankings: UserRankings) => {
      // Эта функция может быть вызвана из компонентов для получения достижений
      // Реализация будет такой же, как в AchievementsModal, но абстрагированной
      const achievements = [];

      // General achievements
      if (user.total_games >= 1) {
        achievements.push({
          id: "active_player",
          isUnlocked: true,
          progress: user.total_games,
          maxProgress: 1,
        });
      }

      if (user.total_games >= 10) {
        achievements.push({
          id: "dedicated_gamer",
          isUnlocked: true,
          progress: user.total_games,
          maxProgress: 10,
        });
      }

      if (user.total_games >= 50) {
        achievements.push({
          id: "game_master",
          isUnlocked: true,
          progress: user.total_games,
          maxProgress: 50,
        });
      }

      // Referral achievements
      if (user.referral_count >= 1) {
        achievements.push({
          id: "recruiter",
          isUnlocked: true,
          progress: user.referral_count,
          maxProgress: 1,
        });
      }

      if (user.referral_count >= 5) {
        achievements.push({
          id: "influencer",
          isUnlocked: true,
          progress: user.referral_count,
          maxProgress: 5,
        });
      }

      if (user.referral_count >= 20) {
        achievements.push({
          id: "ambassador",
          isUnlocked: true,
          progress: user.referral_count,
          maxProgress: 20,
        });
      }

      // Reaction mode achievements
      if (user.reaction_games >= 1) {
        achievements.push({
          id: "speed_tester",
          isUnlocked: true,
        });
      }

      if (user.reaction_games >= 10) {
        achievements.push({
          id: "quick_reflexes",
          isUnlocked: true,
          progress: user.reaction_games,
          maxProgress: 10,
        });
      }

      if (user.reaction_best_time > 0 && user.reaction_best_time <= 200) {
        achievements.push({
          id: "lightning_fast",
          isUnlocked: true,
        });
      }

      if (user.reaction_best_time > 0 && user.reaction_best_time <= 150) {
        achievements.push({
          id: "superhuman_speed",
          isUnlocked: true,
        });
      }

      if (rankings.reaction !== null && rankings.reaction <= 10) {
        achievements.push({
          id: "speed_demon",
          isUnlocked: true,
        });
      }

      // Survival mode achievements
      if (user.survival_games >= 1) {
        achievements.push({
          id: "survivor",
          isUnlocked: true,
        });
      }

      if (user.survival_games >= 10) {
        achievements.push({
          id: "persistent_survivor",
          isUnlocked: true,
          progress: user.survival_games,
          maxProgress: 10,
        });
      }

      if (user.survival_best_time >= 30000) {
        achievements.push({
          id: "endurance_master",
          isUnlocked: true,
        });
      }

      if (user.survival_best_time >= 60000) {
        achievements.push({
          id: "survival_legend",
          isUnlocked: true,
        });
      }

      if (user.survival_max_level >= 5) {
        achievements.push({
          id: "level_climber",
          isUnlocked: true,
          progress: user.survival_max_level,
          maxProgress: 5,
        });
      }

      if (user.survival_max_level >= 10) {
        achievements.push({
          id: "elite_survivor",
          isUnlocked: true,
          progress: user.survival_max_level,
          maxProgress: 10,
        });
      }

      if (user.survival_best_streak >= 50) {
        achievements.push({
          id: "streak_master",
          isUnlocked: true,
          progress: user.survival_best_streak,
          maxProgress: 50,
        });
      }

      if (rankings.survival !== null && rankings.survival <= 10) {
        achievements.push({
          id: "survival_elite",
          isUnlocked: true,
        });
      }

      // Physics mode achievements
      if (user.physics_games >= 1) {
        achievements.push({
          id: "physics_experimenter",
          isUnlocked: true,
        });
      }

      if (user.physics_games >= 10) {
        achievements.push({
          id: "impulse_master",
          isUnlocked: true,
          progress: user.physics_games,
          maxProgress: 10,
        });
      }

      if (user.physics_best_score >= 100) {
        achievements.push({
          id: "wall_breaker",
          isUnlocked: true,
          progress: user.physics_best_score,
          maxProgress: 100,
        });
      }

      // Rotation mode achievements
      if (user.rotation_games >= 1) {
        achievements.push({
          id: "rotation_tester",
          isUnlocked: true,
        });
      }

      if (user.rotation_games >= 10) {
        achievements.push({
          id: "spin_master",
          isUnlocked: true,
          progress: user.rotation_games,
          maxProgress: 10,
        });
      }

      if (user.rotation_best_time >= 60000) {
        achievements.push({
          id: "dizziness_resistant",
          isUnlocked: true,
          progress: Math.floor(user.rotation_best_time / 1000),
          maxProgress: 60,
        });
      }

      // Top player achievements
      if (rankings.overall !== null && rankings.overall <= 10) {
        achievements.push({
          id: "top_player",
          isUnlocked: true,
        });
      }

      return achievements;
    },
    [],
  );

  return {
    // State
    profileData: state.data,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchProfileData,
    resetProfileData,
    clearError,

    // Utility functions
    calculateAchievements,

    // Computed values for convenience
    user: state.data?.user || null,
    referrals: state.data?.referrals || null,
    rankings: state.data?.rankings || null,
  };
}
