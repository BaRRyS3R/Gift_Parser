// src/lib/server/profileService.ts - Dedicated profile service module

import { supabaseServer } from '@/lib/supabase_server';

// Profile interfaces (server-side, safe data only)
export interface SafeProfileData {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium: boolean;
    created_at: string;
    updated_at: string;

    // Game statistics
    total_games: number;
    total_score: number;
    best_score: number;
    current_level: number;
    current_league_id?: number;

    // Mode-specific statistics
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

    // Legacy fields
    total_correct_hits: number;
    total_wrong_hits: number;
    total_missed_circles: number;
    best_accuracy: number;
    last_played_at?: string;
}

export interface SafeReferralData {
    referral_code: string;
    referral_count: number;
    referral_bonus: number;
    referred_by?: string;
    referred_by_name?: string;
}

export interface UserRankings {
    reaction?: number;
    survival?: number;
    physics?: number;
    rotation?: number;
}

export interface ProfileResponse {
    profile: SafeProfileData;
    referrals: SafeReferralData;
    rankings: UserRankings;
}

// Server-side profile service
export const serverProfileService = {
    /**
     * Get complete profile data for authenticated user
     */
    async getProfileData(telegramId: number): Promise<ProfileResponse> {
        // Get user data
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        // Prepare safe profile data (excluding sensitive fields)
        const profile: SafeProfileData = {
            id: user.id,
            telegram_id: user.telegram_id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium,
            created_at: user.created_at,
            updated_at: user.updated_at,

            total_games: user.total_games,
            total_score: user.total_score,
            best_score: user.best_score,
            current_level: user.current_level,
            current_league_id: user.current_league_id,

            reaction_games: user.reaction_games,
            reaction_best_score: user.reaction_best_score,
            reaction_best_time: user.reaction_best_time,
            reaction_average_time: user.reaction_average_time,

            survival_games: user.survival_games,
            survival_best_score: user.survival_best_score,
            survival_best_time: user.survival_best_time,
            survival_max_level: user.survival_max_level,
            survival_best_streak: user.survival_best_streak,

            physics_games: user.physics_games,
            physics_best_score: user.physics_best_score,
            physics_best_time: user.physics_best_time,
            physics_total_hits: user.physics_total_hits,
            physics_best_hits: user.physics_best_hits,
            physics_least_mistakes: user.physics_least_mistakes,

            rotation_games: user.rotation_games,
            rotation_best_score: user.rotation_best_score,
            rotation_best_time: user.rotation_best_time,
            rotation_max_level: user.rotation_max_level,
            rotation_best_streak: user.rotation_best_streak,
            rotation_total_hits: user.rotation_total_hits,

            total_correct_hits: user.total_correct_hits,
            total_wrong_hits: user.total_wrong_hits,
            total_missed_circles: user.total_missed_circles,
            best_accuracy: user.best_accuracy,
            last_played_at: user.last_played_at,
        };

        // Get referral data with referrer name
        let referredByName: string | undefined;
        if (user.referred_by) {
            try {
                const { data: referrer } = await supabaseServer
                    .from('users')
                    .select('first_name, last_name, username')
                    .eq('referral_code', user.referred_by)
                    .single();

                if (referrer) {
                    if (referrer.username) {
                        referredByName = `@${referrer.username}`;
                    } else if (referrer.first_name) {
                        referredByName = referrer.first_name + (referrer.last_name ? ` ${referrer.last_name}` : '');
                    } else {
                        referredByName = 's0meone';
                    }
                }
            } catch (error) {
                console.error('Error getting referrer display name:', error);
                referredByName = 's0meone';
            }
        }

        const referrals: SafeReferralData = {
            referral_code: user.referral_code,
            referral_count: user.referral_count,
            referral_bonus: user.referral_bonus,
            referred_by: user.referred_by || undefined,
            referred_by_name: referredByName,
        };

        // Get user rankings
        const rankings = await this.getUserRankings(telegramId, user);

        return {
            profile,
            referrals,
            rankings,
        };
    },

    /**
     * Get user rankings across all leaderboards
     */
    async getUserRankings(telegramId: number, user?: any): Promise<UserRankings> {
        // Use provided user data or fetch it
        let userData = user;
        if (!userData) {
            const { data, error } = await supabaseServer
                .from('users')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();

            if (error || !data) {
                throw new Error('User not found');
            }
            userData = data;
        }

        const rankings: UserRankings = {};

        // Reaction ranking
        if (userData.reaction_games > 0 && userData.reaction_best_time > 0) {
            const { count, error: reactionError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('reaction_games', 0)
                .gt('reaction_best_time', 0)
                .lt('reaction_best_time', userData.reaction_best_time);

            if (!reactionError) {
                rankings.reaction = (count || 0) + 1;
            }
        }

        // Survival ranking
        if (userData.survival_games > 0) {
            const { count, error: survivalError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('survival_games', 0)
                .or(`survival_best_time.gt.${userData.survival_best_time},and(survival_best_time.eq.${userData.survival_best_time},survival_max_level.gt.${userData.survival_max_level})`);

            if (!survivalError) {
                rankings.survival = (count || 0) + 1;
            }
        }

        // Physics ranking
        if (userData.physics_games > 0) {
            const { count, error: physicsError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('physics_games', 0)
                .or(`physics_best_score.gt.${userData.physics_best_score},and(physics_best_score.eq.${userData.physics_best_score},physics_best_time.gt.${userData.physics_best_time})`);

            if (!physicsError) {
                rankings.physics = (count || 0) + 1;
            }
        }

        // Rotation ranking
        if (userData.rotation_games > 0) {
            const { count, error: rotationError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('rotation_games', 0)
                .or(`rotation_best_time.gt.${userData.rotation_best_time},and(rotation_best_time.eq.${userData.rotation_best_time},rotation_max_level.gt.${userData.rotation_max_level})`);

            if (!rotationError) {
                rankings.rotation = (count || 0) + 1;
            }
        }

        return rankings;
    },

    /**
     * Update user profile data
     */
    async updateProfile(telegramId: number, updates: Partial<SafeProfileData>): Promise<SafeProfileData> {
        // Remove read-only fields
        const { id, telegram_id, created_at, ...allowedUpdates } = updates;

        const { data, error } = await supabaseServer
            .from('users')
            .update({
                ...allowedUpdates,
                updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', telegramId)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            throw new Error('Failed to update profile');
        }

        // Return safe profile data
        return {
            id: data.id,
            telegram_id: data.telegram_id,
            first_name: data.first_name,
            last_name: data.last_name,
            username: data.username,
            language_code: data.language_code,
            is_premium: data.is_premium,
            created_at: data.created_at,
            updated_at: data.updated_at,

            total_games: data.total_games,
            total_score: data.total_score,
            best_score: data.best_score,
            current_level: data.current_level,
            current_league_id: data.current_league_id,

            reaction_games: data.reaction_games,
            reaction_best_score: data.reaction_best_score,
            reaction_best_time: data.reaction_best_time,
            reaction_average_time: data.reaction_average_time,

            survival_games: data.survival_games,
            survival_best_score: data.survival_best_score,
            survival_best_time: data.survival_best_time,
            survival_max_level: data.survival_max_level,
            survival_best_streak: data.survival_best_streak,

            physics_games: data.physics_games,
            physics_best_score: data.physics_best_score,
            physics_best_time: data.physics_best_time,
            physics_total_hits: data.physics_total_hits,
            physics_best_hits: data.physics_best_hits,
            physics_least_mistakes: data.physics_least_mistakes,

            rotation_games: data.rotation_games,
            rotation_best_score: data.rotation_best_score,
            rotation_best_time: data.rotation_best_time,
            rotation_max_level: data.rotation_max_level,
            rotation_best_streak: data.rotation_best_streak,
            rotation_total_hits: data.rotation_total_hits,

            total_correct_hits: data.total_correct_hits,
            total_wrong_hits: data.total_wrong_hits,
            total_missed_circles: data.total_missed_circles,
            best_accuracy: data.best_accuracy,
            last_played_at: data.last_played_at,
        };
    },
};