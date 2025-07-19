// src/lib/server/userProfileService.ts - Unified profile service for referrals and stats

import { supabaseServer } from '@/lib/supabase_server';

// Profile interfaces
export interface ReferralInfo {
    code: string;
    count: number;
    bonus: number;
    referredBy?: string;
    referredByName?: string;
}

export interface UserRankings {
    overall: number | null;
    reaction: number | null;
    survival: number | null;
    physics: number | null;
    rotation: number | null;
}

export interface UserProfileData {
    referrals: ReferralInfo;
    rankings: UserRankings;
}

/**
 * Unified user profile service
 */
export const serverUserProfileService = {
    /**
     * Get user referral information
     */
    async getUserReferralInfo(telegramId: number): Promise<ReferralInfo> {
        const { data: user, error } = await supabaseServer
            .from('users')
            .select('referral_code, referral_count, referral_bonus, referred_by')
            .eq('telegram_id', telegramId)
            .single();

        if (error || !user) {
            throw new Error('User not found');
        }

        let referredByName: string | undefined;

        // Get referrer name if user was referred
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
                        referredByName = 'Someone';
                    }
                }
            } catch (error) {
                console.error('Error getting referrer info:', error);
                referredByName = 'Someone';
            }
        }

        return {
            code: user.referral_code,
            count: user.referral_count,
            bonus: user.referral_bonus,
            referredBy: user.referred_by || undefined,
            referredByName,
        };
    },

    /**
     * Get user rankings across all game modes
     */
    async getUserRankings(telegramId: number): Promise<UserRankings> {
        // Get user data first
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        const rankings: UserRankings = {
            overall: null,
            reaction: null,
            survival: null,
            physics: null,
            rotation: null,
        };

        // Overall ranking (by best_score for users with games > 0)
        if (user.total_games > 0) {
            const { count: overallCount, error: overallError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('total_games', 0)
                .gt('best_score', user.best_score);

            if (!overallError) {
                rankings.overall = (overallCount || 0) + 1;
            }
        }

        // Reaction ranking (by best reaction time)
        if (user.reaction_games > 0 && user.reaction_best_time > 0) {
            const { count: reactionCount, error: reactionError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('reaction_games', 0)
                .gt('reaction_best_time', 0)
                .lt('reaction_best_time', user.reaction_best_time);

            if (!reactionError) {
                rankings.reaction = (reactionCount || 0) + 1;
            }
        }

        // Survival ranking (by best survival time, then by max level)
        if (user.survival_games > 0) {
            const { count: survivalCount, error: survivalError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('survival_games', 0)
                .or(`survival_best_time.gt.${user.survival_best_time},and(survival_best_time.eq.${user.survival_best_time},survival_max_level.gt.${user.survival_max_level})`);

            if (!survivalError) {
                rankings.survival = (survivalCount || 0) + 1;
            }
        }

        // Physics ranking (by best score, then by best time)
        if (user.physics_games > 0) {
            const { count: physicsCount, error: physicsError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('physics_games', 0)
                .or(`physics_best_score.gt.${user.physics_best_score},and(physics_best_score.eq.${user.physics_best_score},physics_best_time.gt.${user.physics_best_time})`);

            if (!physicsError) {
                rankings.physics = (physicsCount || 0) + 1;
            }
        }

        // Rotation ranking (by best time, then by max level)
        if (user.rotation_games > 0) {
            const { count: rotationCount, error: rotationError } = await supabaseServer
                .from('users')
                .select('id', { count: 'exact' })
                .gt('rotation_games', 0)
                .or(`rotation_best_time.gt.${user.rotation_best_time},and(rotation_best_time.eq.${user.rotation_best_time},rotation_max_level.gt.${user.rotation_max_level})`);

            if (!rotationError) {
                rankings.rotation = (rotationCount || 0) + 1;
            }
        }

        return rankings;
    },

    /**
     * Get complete user profile data (referrals + rankings)
     */
    async getUserProfileData(telegramId: number): Promise<UserProfileData> {
        try {
            console.log(`Fetching profile data for user: ${telegramId}`);

            const [referrals, rankings] = await Promise.all([
                this.getUserReferralInfo(telegramId),
                this.getUserRankings(telegramId),
            ]);

            console.log(`Successfully fetched profile data for user ${telegramId}:`, {
                referralCount: referrals.count,
                hasRankings: Object.values(rankings).some(rank => rank !== null)
            });

            return {
                referrals,
                rankings,
            };

        } catch (error) {
            console.error('Error fetching user profile data:', error);
            throw new Error('Failed to fetch user profile data');
        }
    },
};