// src/hooks/modules/useProfile.ts - Updated with achievements support

import { useState, useCallback, useRef } from "react";

// Profile interfaces (existing)
export interface ReferralInfo {
  code: string;
  count: number;
  bonus: number;
  referredBy?: string;
  referredByName?: string;
  referralLink: string;
}

export interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics: number | null;
  rotation: number | null;
}

// User profile game stats (existing)
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

// NEW: Achievement interfaces
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

export interface UserAchievementsData {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  recentlyUnlocked: Achievement[];
  totalAttemptsEarned: number;
}

// Enhanced profile data interface
export interface ProfileData {
  user: UserProfileGameStats;
  referrals: ReferralInfo;
  rankings: UserRankings;
  achievements?: UserAchievementsData; // NEW: Achievements data
}

// Hook state interface
interface ProfileState {
  data: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  achievementsLoading: boolean; // NEW: Separate loading state for achievements
}

/**
 * Enhanced profile hook with achievements support
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
    achievementsLoading: false,
  });

  const fetchingRef = useRef<boolean>(false);
  const fetchingAchievementsRef = useRef<boolean>(false);

  /**
   * Fetch profile data including achievements
   */
  const fetchProfileData =
    useCallback(async (): Promise<ProfileData | null> => {
      if (fetchingRef.current) {
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
        // Fetch profile data and achievements in parallel
        const [profileResponse, achievementsResponse] = await Promise.all([
          makeAuthenticatedRequest("/api/user/profile"),
          makeAuthenticatedRequest("/api/user/achievements"),
        ]);

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${profileResponse.status}`,
          );
        }

        const profileResult = await profileResponse.json();
        if (!profileResult.success) {
          throw new Error(
            profileResult.error || "Failed to fetch profile data",
          );
        }

        // Parse achievements if available
        let achievementsData: UserAchievementsData | undefined;
        if (achievementsResponse.ok) {
          const achievementsResult = await achievementsResponse.json();
          if (achievementsResult.success) {
            achievementsData = achievementsResult.data;
          }
        }

        const profileData: ProfileData = {
          ...profileResult.data,
          achievements: achievementsData,
        };

        setState({
          data: profileData,
          isLoading: false,
          error: null,
          achievementsLoading: false,
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
   * Fetch only achievements data
   */
  const fetchAchievements =
    useCallback(async (): Promise<UserAchievementsData | null> => {
      if (fetchingAchievementsRef.current) {
        return null;
      }

      fetchingAchievementsRef.current = true;
      setState((prev) => ({ ...prev, achievementsLoading: true }));

      try {
        const response = await makeAuthenticatedRequest(
          "/api/user/achievements",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch achievements");
        }

        const achievementsData: UserAchievementsData = result.data;

        setState((prev) => ({
          ...prev,
          data: prev.data
            ? { ...prev.data, achievements: achievementsData }
            : null,
          achievementsLoading: false,
        }));

        return achievementsData;
      } catch (error) {
        console.error("Error fetching achievements:", error);
        setState((prev) => ({
          ...prev,
          achievementsLoading: false,
        }));
        return null;
      } finally {
        fetchingAchievementsRef.current = false;
      }
    }, [makeAuthenticatedRequest]);

  /**
   * Reset profile data
   */
  const resetProfileData = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      achievementsLoading: false,
    });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Get unlocked achievement icons for header display
   */
  const getUnlockedAchievementIcons = useCallback(() => {
    if (!state.data?.achievements) return [];

    return state.data.achievements.achievements
      .filter((achievement) => achievement.unlocked)
      .map((achievement) => ({
        id: achievement.id,
        icon: achievement.icon,
        color: achievement.color,
        name: achievement.name,
      }));
  }, [state.data?.achievements]);

  return {
    // State
    profileData: state.data,
    isLoading: state.isLoading,
    error: state.error,
    achievementsLoading: state.achievementsLoading,

    // Actions
    fetchProfileData,
    fetchAchievements,
    resetProfileData,
    clearError,

    // Computed values for convenience
    user: state.data?.user || null,
    referrals: state.data?.referrals || null,
    rankings: state.data?.rankings || null,
    achievements: state.data?.achievements || null,

    // Achievement helpers
    getUnlockedAchievementIcons,
  };
}