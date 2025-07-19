// src/hooks/modules/useProfile.ts - Unified profile hook for referrals, achievements, and stats

import { useState, useCallback, useRef } from 'react';
import type { User } from '@/lib/supabase';

// Profile interfaces
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

export interface ProfileData {
    referrals: ReferralInfo;
    rankings: UserRankings;
}

// Hook state interface
interface ProfileState {
    data: ProfileData | null;
    isLoading: boolean;
    error: string | null;
}

// Cache duration in milliseconds (2 minutes for profile data)
const CACHE_DURATION = 120000;

/**
 * Unified profile hook for referrals, rankings, and achievements
 */
export function useProfile(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<ProfileState>({
        data: null,
        isLoading: false,
        error: null,
    });

    const fetchingRef = useRef<boolean>(false);
    const lastFetchRef = useRef<number>(0);

    /**
     * Fetch profile data from API
     */
    const fetchProfileData = useCallback(async (forceRefresh = false): Promise<ProfileData | null> => {
        // Check cache validity
        const now = Date.now();
        const isCacheValid = state.data && !forceRefresh && (now - lastFetchRef.current) < CACHE_DURATION;

        if (isCacheValid) {
            console.log('Using cached profile data');
            return state.data;
        }

        // Prevent duplicate requests
        if (fetchingRef.current) {
            console.log('Profile fetch already in progress');
            return state.data;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching profile data from API...');

            const response = await makeAuthenticatedRequest('/api/user/profile');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch profile data');
            }

            // Process referral data to add computed fields
            const profileData: ProfileData = {
                ...result.data,
                referrals: {
                    ...result.data.referrals,
                    // Add computed referral link
                    referralLink: `https://t.me/marketaggregator_bot?startapp=${result.data.referrals.code}`,
                },
            };

            setState({
                data: profileData,
                isLoading: false,
                error: null,
            });

            lastFetchRef.current = now;

            console.log('Successfully fetched profile data:', {
                referralCode: profileData.referrals.code,
                referralCount: profileData.referrals.count,
                rankingsCount: Object.values(profileData.rankings).filter(rank => rank !== null).length
            });

            return profileData;

        } catch (error) {
            console.error('Error fetching profile data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return null;
        } finally {
            fetchingRef.current = false;
        }
    }, [state.data, makeAuthenticatedRequest]);

    /**
     * Get cached profile data if valid
     */
    const getCachedProfileData = useCallback((): ProfileData | null => {
        const now = Date.now();
        const isCacheValid = state.data && (now - lastFetchRef.current) < CACHE_DURATION;

        if (isCacheValid) {
            return state.data;
        }

        return null;
    }, [state.data]);

    /**
     * Invalidate cache and force refresh
     */
    const invalidateCache = useCallback(() => {
        console.log('Invalidating profile cache');
        lastFetchRef.current = 0;
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Calculate achievements based on user data and rankings
     */
    const calculateAchievements = useCallback((user: User, rankings: UserRankings) => {
        // This function can be called from components to get achievements
        // Implementation will be the same as in AchievementsModal but abstracted
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
    }, []);

    return {
        // State
        profileData: state.data,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchProfileData,
        getCachedProfileData,
        invalidateCache,
        clearError,

        // Utility functions
        calculateAchievements,

        // Computed values for convenience
        referrals: state.data?.referrals || null,
        rankings: state.data?.rankings || null,
        hasValidCache: state.data && (Date.now() - lastFetchRef.current) < CACHE_DURATION,
    };
}