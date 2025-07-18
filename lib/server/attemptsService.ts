// src/lib/server/attemptsService.ts - Server-side attempts management service

import { supabaseServer } from '@/lib/supabase_server';

// Configuration constants
const ATTEMPTS_CONFIG = {
    BASE_ATTEMPTS: 10,
    RESET_ATTEMPTS: 10,
    RESET_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours
    REFERRAL_BONUS: 5,
    INSTANT_RESET_COST: 100, // Example: cost in some currency
} as const;

// Attempts status interface
export interface AttemptsStatus {
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: Date;
    timeUntilReset?: number;
}

// Server-side attempts service
export const serverAttemptsService = {
    /**
     * Get current server time for consistent validation
     */
    async getServerTime(): Promise<Date> {
        try {
            const { data, error } = await supabaseServer.rpc('get_current_timestamp');
            if (error) {
                console.warn('Failed to get server time, using current time:', error);
                return new Date();
            }
            return new Date(data);
        } catch (error) {
            console.warn('Error getting server time, falling back to current time:', error);
            return new Date();
        }
    },

    /**
     * Check and update user attempts with comprehensive server validation
     */
    async checkAndUpdateAttempts(telegramId: number): Promise<AttemptsStatus> {
        // Get user data
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        const serverTime = await this.getServerTime();
        const resetTime = user.attempts_reset_at ? new Date(user.attempts_reset_at) : null;

        // Check if reset time has passed
        if (resetTime && serverTime >= resetTime) {
            console.log(`Reset time reached for user ${telegramId}, resetting attempts`);
            await this.resetAttempts(telegramId);

            return {
                canPlay: true,
                attemptsRemaining: Math.max(ATTEMPTS_CONFIG.RESET_ATTEMPTS, user.attempts_remaining),
                resetTime: undefined,
                timeUntilReset: undefined,
            };
        }

        // Validate against potential time manipulation
        if (user.last_attempt_at) {
            const lastAttemptTime = new Date(user.last_attempt_at);
            const timeSinceLastAttempt = serverTime.getTime() - lastAttemptTime.getTime();

            if (timeSinceLastAttempt < 0) {
                console.warn(`Potential time manipulation detected for user ${telegramId}`);
                // Could implement additional security measures here
            }
        }

        // Calculate time until reset if user has no attempts
        let timeUntilReset: number | undefined;
        if (resetTime && user.attempts_remaining === 0) {
            timeUntilReset = Math.max(0, resetTime.getTime() - serverTime.getTime());
        }

        return {
            canPlay: user.attempts_remaining > 0,
            attemptsRemaining: user.attempts_remaining,
            resetTime: resetTime || undefined,
            timeUntilReset,
        };
    },

    /**
     * Consume one attempt with server validation
     */
    async consumeAttempt(telegramId: number): Promise<AttemptsStatus> {
        // First, check current status
        const currentStatus = await this.checkAndUpdateAttempts(telegramId);

        if (!currentStatus.canPlay) {
            throw new Error('No attempts remaining');
        }

        const serverTime = await this.getServerTime();
        const newAttemptsRemaining = Math.max(0, currentStatus.attemptsRemaining - 1);

        const updates: any = {
            attempts_remaining: newAttemptsRemaining,
            last_attempt_at: serverTime.toISOString(),
            updated_at: serverTime.toISOString(),
        };

        // If this was the last attempt, set reset time
        if (newAttemptsRemaining === 0) {
            const resetTime = new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS);
            updates.attempts_reset_at = resetTime.toISOString();
        }

        // Update database
        const { error } = await supabaseServer
            .from('users')
            .update(updates)
            .eq('telegram_id', telegramId);

        if (error) {
            console.error('Error consuming attempt:', error);
            throw new Error('Failed to consume attempt');
        }

        console.log(`Attempt consumed for user ${telegramId}. Remaining: ${newAttemptsRemaining}`);

        const timeUntilReset = newAttemptsRemaining === 0
            ? ATTEMPTS_CONFIG.RESET_INTERVAL_MS
            : undefined;

        return {
            canPlay: newAttemptsRemaining > 0,
            attemptsRemaining: newAttemptsRemaining,
            resetTime: newAttemptsRemaining === 0
                ? new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS)
                : undefined,
            timeUntilReset,
        };
    },

    /**
     * Reset user attempts to default value
     */
    async resetAttempts(telegramId: number): Promise<void> {
        const serverTime = await this.getServerTime();

        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('attempts_remaining')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        const newAttempts = Math.max(ATTEMPTS_CONFIG.RESET_ATTEMPTS, user.attempts_remaining);

        const { error } = await supabaseServer
            .from('users')
            .update({
                attempts_remaining: newAttempts,
                attempts_reset_at: null,
                updated_at: serverTime.toISOString(),
            })
            .eq('telegram_id', telegramId);

        if (error) {
            console.error('Error resetting attempts:', error);
            throw new Error('Failed to reset attempts');
        }

        console.log(`Attempts reset for user ${telegramId} to ${newAttempts}`);
    },

    /**
     * Instantly reset attempts (e.g., through purchase)
     */
    async instantResetAttempts(telegramId: number): Promise<AttemptsStatus> {
        const serverTime = await this.getServerTime();

        const { error } = await supabaseServer
            .from('users')
            .update({
                attempts_remaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
                attempts_reset_at: null,
                updated_at: serverTime.toISOString(),
            })
            .eq('telegram_id', telegramId);

        if (error) {
            console.error('Error performing instant reset:', error);
            throw new Error('Failed to perform instant reset');
        }

        console.log(`Instant reset performed for user ${telegramId}`);

        return {
            canPlay: true,
            attemptsRemaining: ATTEMPTS_CONFIG.RESET_ATTEMPTS,
            resetTime: undefined,
            timeUntilReset: undefined,
        };
    },

    /**
     * Add bonus attempts (e.g., from referrals or purchases)
     */
    async addBonusAttempts(telegramId: number, bonusAmount: number, reason: string): Promise<AttemptsStatus> {
        const serverTime = await this.getServerTime();

        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('attempts_remaining')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User not found');
        }

        const newAttempts = user.attempts_remaining + bonusAmount;

        const { error } = await supabaseServer
            .from('users')
            .update({
                attempts_remaining: newAttempts,
                updated_at: serverTime.toISOString(),
            })
            .eq('telegram_id', telegramId);

        if (error) {
            console.error('Error adding bonus attempts:', error);
            throw new Error('Failed to add bonus attempts');
        }

        console.log(`Added ${bonusAmount} bonus attempts for user ${telegramId}. Reason: ${reason}`);

        return {
            canPlay: true,
            attemptsRemaining: newAttempts,
            resetTime: undefined,
            timeUntilReset: undefined,
        };
    },

    /**
     * Get attempts configuration
     */
    getAttemptsConfig() {
        return ATTEMPTS_CONFIG;
    },

    /**
     * Validate if user can play based on attempts
     */
    async canUserPlay(telegramId: number): Promise<boolean> {
        try {
            const status = await this.checkAndUpdateAttempts(telegramId);
            return status.canPlay;
        } catch (error) {
            console.error('Error checking if user can play:', error);
            return false;
        }
    },
};