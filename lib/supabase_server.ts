// src/lib/supabase_server.ts - Updated with profile service integration

import { createClient } from '@supabase/supabase-js';
import { serverAttemptsService, type AttemptsStatus } from './server/attemptsService';
import { serverGameService, type GameSaveResult, type TournamentSaveResponse } from './server/gameService';
import { serverLeaderboardService } from './server/leaderboardService';
import { serverUserProfileService, type UserProfileData } from './server/userProfileService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

// Server-side client with service key for admin operations
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Types for server operations
export interface ServerUser {
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

export interface ServerTelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

// Server-side user service
export const serverUserService = {
    async findByTelegramId(telegramId: number): Promise<ServerUser | null> {
        const { data, error } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (error) {
            console.error('Error finding user:', error);
            throw error;
        }

        return data;
    },

    async findByReferralCode(referralCode: string): Promise<ServerUser | null> {
        const { data, error } = await supabaseServer
            .from('users')
            .select('*')
            .eq('referral_code', referralCode)
            .maybeSingle();

        if (error) {
            console.error('Error finding user by referral code:', error);
            throw error;
        }

        return data;
    },

    async generateUniqueReferralCode(): Promise<string> {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let isUnique = false;

        while (!isUnique) {
            code = '';
            for (let i = 0; i < 8; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            const existingUser = await this.findByReferralCode(code);
            if (!existingUser) {
                isUnique = true;
            }
        }

        return code;
    },

    async validateReferralCodeAndGetReferrer(referralCode: string): Promise<{
        isValid: boolean;
        bonus: number;
        referrerName?: string;
        referrerUsername?: string;
    }> {
        try {
            const referrer = await this.findByReferralCode(referralCode);

            if (referrer) {
                let referrerName = referrer.first_name;
                if (referrer.last_name) {
                    referrerName += ` ${referrer.last_name}`;
                }

                return {
                    isValid: true,
                    bonus: referrer.referral_bonus,
                    referrerName,
                    referrerUsername: referrer.username,
                };
            }

            return { isValid: false, bonus: 0 };
        } catch (error) {
            console.error('Error validating referral code and getting referrer info:', error);
            return { isValid: false, bonus: 0 };
        }
    },

    async create(telegramUser: ServerTelegramUser, referralCode?: string): Promise<ServerUser> {
        const referralCodeToUse = await this.generateUniqueReferralCode();
        let additionalAttempts = 10;
        let referredBy = null;

        // Handle referral
        if (referralCode) {
            const referrer = await this.findByReferralCode(referralCode);
            if (referrer) {
                referredBy = referralCode;
                additionalAttempts += referrer.referral_bonus;

                // Update referrer
                await supabaseServer
                    .from('users')
                    .update({
                        referral_count: referrer.referral_count + 1,
                        attempts_remaining: referrer.attempts_remaining + 5,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', referrer.id);
            }
        }

        const userData = {
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            language_code: telegramUser.language_code || null,
            is_premium: telegramUser.is_premium || false,
            attempts_remaining: additionalAttempts,
            referral_code: referralCodeToUse,
            referred_by: referredBy,
            referral_bonus: 5,
            referral_count: 0,
            current_level: 1,
        };

        const { data, error } = await supabaseServer
            .from('users')
            .insert(userData)
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            throw error;
        }

        return data;
    },

    async updateUser(telegramId: number, updates: Partial<ServerUser>): Promise<ServerUser> {
        const { data, error } = await supabaseServer
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('telegram_id', telegramId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            throw error;
        }

        return data;
    },

    async getServerTime(): Promise<Date> {
        return serverAttemptsService.getServerTime();
    },

    // Delegate attempts management to specialized service
    async checkAndUpdateAttemptsWithServerValidation(telegramId: number): Promise<AttemptsStatus> {
        return serverAttemptsService.checkAndUpdateAttempts(telegramId);
    },

    async consumeAttemptWithServerValidation(telegramId: number): Promise<AttemptsStatus> {
        return serverAttemptsService.consumeAttempt(telegramId);
    },

    async resetAttempts(telegramId: number): Promise<void> {
        return serverAttemptsService.resetAttempts(telegramId);
    },

    async instantResetAttempts(telegramId: number): Promise<void> {
        await serverAttemptsService.instantResetAttempts(telegramId);
    },

    // Convenience methods for backwards compatibility
    async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
        return this.checkAndUpdateAttemptsWithServerValidation(telegramId);
    },

    async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
        return this.consumeAttemptWithServerValidation(telegramId);
    },

    // Delegate game operations to game service
    async saveGameResult(telegramId: number, gameResult: any): Promise<GameSaveResult> {
        return serverGameService.saveGameResult(telegramId, gameResult);
    },

    async saveTournamentResult(tournamentId: string, telegramId: number, gameResult: any): Promise<TournamentSaveResponse> {
        return serverGameService.saveTournamentResult(tournamentId, telegramId, gameResult);
    },

    // Delegate profile operations to profile service
    async getUserProfileData(telegramId: number): Promise<UserProfileData> {
        return serverUserProfileService.getUserProfileData(telegramId);
    },
};

// Export specialized services
export { serverAttemptsService };
export { serverGameService };
export { serverLeaderboardService };
export { serverUserProfileService };