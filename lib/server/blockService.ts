// src/lib/server/blockService.ts - Nebula Security System Block Management

import { supabaseServer } from '@/lib/supabase_server';

// Block reason enum to match database
export type BlockReason =
    | 'failed_captcha'
    | 'failed_biometric'
    | 'failed_gyroscope'
    | 'device_unsupported_biometric'
    | 'device_unsupported_gyroscope'
    | 'manual_block'
    | 'suspicious_activity';

// Verification type for Nebula system
export type VerificationType = 'captcha' | 'biometric' | 'gyroscope';

// Trust score thresholds for different verification types
export const TRUST_THRESHOLDS = {
    CAPTCHA: 40,
    BIOMETRIC: 20,
    GYROSCOPE: 10,
} as const;

// Block durations in hours
export const BLOCK_DURATIONS = {
    FAILED_CAPTCHA: 2,           // 2 hours
    FAILED_BIOMETRIC: 48,        // 2 days  
    FAILED_GYROSCOPE: 720,       // 1 month (30 days)
    DEVICE_UNSUPPORTED_BIOMETRIC: 48,   // 2 days
    DEVICE_UNSUPPORTED_GYROSCOPE: 720,  // 1 month (30 days)
    MANUAL_BLOCK: 24,            // 1 day (default)
    SUSPICIOUS_ACTIVITY: 168,    // 1 week
} as const;

// Restored trust score after successful verification
export const RESTORED_TRUST_SCORE = 40;

// Block information interface
export interface UserBlock {
    blockId: string;
    userId: string;
    telegramId: number;
    blockReason: BlockReason;
    blockedAt: string;
    unblockedAt: string;
    timeRemainingSeconds: number;
    verificationType?: VerificationType;
    trustScoreAtBlock?: number;
    isActive: boolean;
}

// Verification requirement interface
export interface VerificationRequirement {
    required: boolean;
    type?: VerificationType;
    trustScore: number;
    threshold: number;
}

// Service response interfaces
export interface BlockServiceResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface UnblockServiceResponse extends BlockServiceResponse {
    unblocked?: boolean;
    blocksCleared?: number;
}

/**
 * Nebula Security System Block Service
 * Manages user blocks, verifications, and trust score enforcement
 */
export const serverBlockService = {
    /**
     * Check if user requires verification based on trust score
     */
    async checkVerificationRequirement(telegramId: number): Promise<VerificationRequirement> {
        try {
            const { data: user, error } = await supabaseServer
                .from('users')
                .select('trust_score')
                .eq('telegram_id', telegramId)
                .single();

            if (error || !user) {
                throw new Error('User not found');
            }

            const trustScore = user.trust_score || 50;

            // Determine required verification type based on trust score
            if (trustScore < TRUST_THRESHOLDS.GYROSCOPE) {
                return {
                    required: true,
                    type: 'gyroscope',
                    trustScore,
                    threshold: TRUST_THRESHOLDS.GYROSCOPE,
                };
            } else if (trustScore < TRUST_THRESHOLDS.BIOMETRIC) {
                return {
                    required: true,
                    type: 'biometric',
                    trustScore,
                    threshold: TRUST_THRESHOLDS.BIOMETRIC,
                };
            } else if (trustScore < TRUST_THRESHOLDS.CAPTCHA) {
                return {
                    required: true,
                    type: 'captcha',
                    trustScore,
                    threshold: TRUST_THRESHOLDS.CAPTCHA,
                };
            }

            return {
                required: false,
                trustScore,
                threshold: TRUST_THRESHOLDS.CAPTCHA,
            };
        } catch (error) {
            console.error('Error checking verification requirement:', error);
            throw new Error('Failed to check verification requirement');
        }
    },

    /**
     * Check if user is currently blocked
     */
    async checkUserBlock(telegramId: number): Promise<UserBlock | null> {
        try {
            // First, auto-unblock any expired blocks
            await this.autoUnblockExpiredBlocks();

            // Get user's current active block using database function
            const { data, error } = await supabaseServer
                .rpc('get_user_active_block', {
                    p_telegram_id: telegramId
                });

            if (error) {
                console.error('Error checking user block:', error);
                return null;
            }

            if (!data || data.length === 0) {
                return null;
            }

            const blockData = data[0];

            return {
                blockId: blockData.block_id,
                userId: '', // Will be filled if needed
                telegramId,
                blockReason: blockData.block_reason,
                blockedAt: blockData.blocked_at,
                unblockedAt: blockData.unblocked_at,
                timeRemainingSeconds: Math.max(0, blockData.time_remaining_seconds || 0),
                verificationType: blockData.verification_type,
                trustScoreAtBlock: blockData.trust_score_at_block,
                isActive: blockData.time_remaining_seconds > 0,
            };
        } catch (error) {
            console.error('Error checking user block:', error);
            return null;
        }
    },

    /**
     * Block user with specific reason and duration
     */
    async blockUser(
        userId: string,
        telegramId: number,
        blockReason: BlockReason,
        verificationType?: VerificationType,
        additionalData?: Record<string, any>
    ): Promise<BlockServiceResponse> {
        try {
            // Get user's current trust score
            const { data: user, error: userError } = await supabaseServer
                .from('users')
                .select('trust_score')
                .eq('telegram_id', telegramId)
                .single();

            if (userError) {
                throw new Error('User not found');
            }

            const trustScore = user.trust_score || 50;

            // Determine block duration based on reason
            let durationHours: number;
            switch (blockReason) {
                case 'failed_captcha':
                    durationHours = BLOCK_DURATIONS.FAILED_CAPTCHA;
                    break;
                case 'failed_biometric':
                    durationHours = BLOCK_DURATIONS.FAILED_BIOMETRIC;
                    break;
                case 'failed_gyroscope':
                    durationHours = BLOCK_DURATIONS.FAILED_GYROSCOPE;
                    break;
                case 'device_unsupported_biometric':
                    durationHours = BLOCK_DURATIONS.DEVICE_UNSUPPORTED_BIOMETRIC;
                    break;
                case 'device_unsupported_gyroscope':
                    durationHours = BLOCK_DURATIONS.DEVICE_UNSUPPORTED_GYROSCOPE;
                    break;
                case 'manual_block':
                    durationHours = BLOCK_DURATIONS.MANUAL_BLOCK;
                    break;
                case 'suspicious_activity':
                    durationHours = BLOCK_DURATIONS.SUSPICIOUS_ACTIVITY;
                    break;
                default:
                    durationHours = BLOCK_DURATIONS.MANUAL_BLOCK;
            }

            // Create block using database function
            const { data: blockId, error: blockError } = await supabaseServer
                .rpc('block_user_with_duration', {
                    p_user_id: userId,
                    p_telegram_id: telegramId,
                    p_block_reason: blockReason,
                    p_duration_hours: durationHours,
                    p_verification_type: verificationType || null,
                    p_trust_score: trustScore,
                    p_additional_data: additionalData || {}
                });

            if (blockError) {
                throw new Error(`Failed to create block: ${blockError.message}`);
            }

            console.log(`User ${telegramId} blocked for ${durationHours} hours. Reason: ${blockReason}, Block ID: ${blockId}`);

            return {
                success: true,
                data: {
                    blockId,
                    durationHours,
                    blockReason,
                    verificationType,
                    trustScore,
                }
            };
        } catch (error) {
            console.error('Error blocking user:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to block user'
            };
        }
    },

    /**
     * Unblock user manually or automatically
     */
    async unblockUser(telegramId: number, reason: string = 'manual_unblock'): Promise<UnblockServiceResponse> {
        try {
            // Deactivate all active blocks for this user
            const { data, error } = await supabaseServer
                .from('user_blocks')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                    additional_data: { unblock_reason: reason, unblocked_manually: true }
                })
                .eq('telegram_id', telegramId)
                .eq('is_active', true)
                .select('id');

            if (error) {
                throw new Error(`Failed to unblock user: ${error.message}`);
            }

            const blocksCleared = data?.length || 0;

            console.log(`User ${telegramId} unblocked. Blocks cleared: ${blocksCleared}, Reason: ${reason}`);

            return {
                success: true,
                unblocked: true,
                blocksCleared,
                data: { telegramId, reason, blocksCleared }
            };
        } catch (error) {
            console.error('Error unblocking user:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unblock user'
            };
        }
    },

    /**
     * Automatically unblock expired blocks
     */
    async autoUnblockExpiredBlocks(): Promise<number> {
        try {
            const { data: unblockedCount, error } = await supabaseServer
                .rpc('auto_unblock_expired_blocks');

            if (error) {
                console.error('Error auto-unblocking expired blocks:', error);
                return 0;
            }

            if (unblockedCount > 0) {
                console.log(`Auto-unblocked ${unblockedCount} expired blocks`);
            }

            return unblockedCount || 0;
        } catch (error) {
            console.error('Error in auto-unblock process:', error);
            return 0;
        }
    },

    /**
     * Restore user trust score after successful verification
     */
    async restoreTrustScore(telegramId: number, verificationType: VerificationType): Promise<BlockServiceResponse> {
        try {
            const { error } = await supabaseServer
                .from('users')
                .update({
                    trust_score: RESTORED_TRUST_SCORE,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_id', telegramId);

            if (error) {
                throw new Error(`Failed to restore trust score: ${error.message}`);
            }

            console.log(`Trust score restored to ${RESTORED_TRUST_SCORE} for user ${telegramId} after successful ${verificationType} verification`);

            return {
                success: true,
                data: {
                    telegramId,
                    verificationType,
                    newTrustScore: RESTORED_TRUST_SCORE
                }
            };
        } catch (error) {
            console.error('Error restoring trust score:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to restore trust score'
            };
        }
    },

    /**
     * Get user's block history
     */
    async getUserBlockHistory(telegramId: number, limit: number = 10): Promise<UserBlock[]> {
        try {
            const { data, error } = await supabaseServer
                .from('user_blocks')
                .select('*')
                .eq('telegram_id', telegramId)
                .order('blocked_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`Failed to get block history: ${error.message}`);
            }

            return (data || []).map(block => ({
                blockId: block.id,
                userId: block.user_id,
                telegramId: block.telegram_id,
                blockReason: block.block_reason,
                blockedAt: block.blocked_at,
                unblockedAt: block.unblocked_at,
                timeRemainingSeconds: Math.max(0, Math.floor((new Date(block.unblocked_at).getTime() - Date.now()) / 1000)),
                verificationType: block.verification_type,
                trustScoreAtBlock: block.trust_score_at_block,
                isActive: block.is_active,
            }));
        } catch (error) {
            console.error('Error getting user block history:', error);
            return [];
        }
    },

    /**
     * Get verification statistics
     */
    async getVerificationStats(telegramId?: number): Promise<any> {
        try {
            let query = supabaseServer
                .from('user_blocks')
                .select('block_reason, verification_type, created_at, is_active');

            if (telegramId) {
                query = query.eq('telegram_id', telegramId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to get verification stats: ${error.message}`);
            }

            // Process statistics
            const stats = {
                totalBlocks: data?.length || 0,
                activeBlocks: data?.filter(b => b.is_active).length || 0,
                byReason: {} as Record<BlockReason, number>,
                byVerificationType: {} as Record<VerificationType, number>,
            };

            data?.forEach(block => {
                const blockReason = block.block_reason as BlockReason;
                const verificationType = block.verification_type as VerificationType;

                stats.byReason[blockReason] = (stats.byReason[blockReason] || 0) + 1;

                if (verificationType) {
                    stats.byVerificationType[verificationType] = (stats.byVerificationType[verificationType] || 0) + 1;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error getting verification stats:', error);
            return {
                totalBlocks: 0,
                activeBlocks: 0,
                byReason: {},
                byVerificationType: {},
            };
        }
    },

    /**
     * Handle verification failure
     */
    async handleVerificationFailure(
        userId: string,
        telegramId: number,
        verificationType: VerificationType,
        isDeviceSupported: boolean = true
    ): Promise<BlockServiceResponse> {
        let blockReason: BlockReason;

        if (!isDeviceSupported) {
            switch (verificationType) {
                case 'biometric':
                    blockReason = 'device_unsupported_biometric';
                    break;
                case 'gyroscope':
                    blockReason = 'device_unsupported_gyroscope';
                    break;
                default:
                    blockReason = 'failed_captcha';
            }
        } else {
            switch (verificationType) {
                case 'captcha':
                    blockReason = 'failed_captcha';
                    break;
                case 'biometric':
                    blockReason = 'failed_biometric';
                    break;
                case 'gyroscope':
                    blockReason = 'failed_gyroscope';
                    break;
                default:
                    blockReason = 'failed_captcha';
            }
        }

        return await this.blockUser(
            userId,
            telegramId,
            blockReason,
            verificationType,
            {
                deviceSupported: isDeviceSupported,
                failedAt: new Date().toISOString(),
                verificationType,
            }
        );
    },

    /**
     * Handle successful verification
     */
    async handleVerificationSuccess(
        telegramId: number,
        verificationType: VerificationType
    ): Promise<BlockServiceResponse> {
        try {
            // Restore trust score
            const restoreResult = await this.restoreTrustScore(telegramId, verificationType);

            if (!restoreResult.success) {
                throw new Error(restoreResult.error);
            }

            // Log successful verification (optional)
            console.log(`Verification successful for user ${telegramId}, type: ${verificationType}`);

            return {
                success: true,
                data: {
                    telegramId,
                    verificationType,
                    trustScoreRestored: true,
                    newTrustScore: RESTORED_TRUST_SCORE,
                }
            };
        } catch (error) {
            console.error('Error handling verification success:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to handle verification success'
            };
        }
    },
};