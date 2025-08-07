// src/lib/server/blockService.ts - Updated with corrected expiration times for verification attempts

import { supabaseServer } from "@/lib/supabase_server";

// Updated block reason enum to match database with new permission-related reasons
export type BlockReason =
  | "failed_captcha"
  | "failed_biometric"
  | "failed_gyroscope"
  | "device_unsupported_biometric"
  | "device_unsupported_gyroscope"
  | "biometric_unavailable"
  | "gyroscope_unavailable"
  | "biometric_permission_denied"
  | "gyroscope_permission_denied"
  | "manual_block"
  | "suspicious_activity"
  | "abandoned_verification";

// Verification type for Nebula system
export type VerificationType = "captcha" | "biometric" | "gyroscope";

// Trust score thresholds for different verification types
export const TRUST_THRESHOLDS = {
  CAPTCHA: 40,
  BIOMETRIC: 20,
  GYROSCOPE: 10,
} as const;

// Updated block durations in hours with new permission-related blocks
export const BLOCK_DURATIONS = {
  FAILED_CAPTCHA: 2, // 2 hours
  FAILED_BIOMETRIC: 48, // 2 days
  FAILED_GYROSCOPE: 720, // 1 month (30 days)
  DEVICE_UNSUPPORTED_BIOMETRIC: 48, // 2 days
  DEVICE_UNSUPPORTED_GYROSCOPE: 720, // 1 month (30 days)
  BIOMETRIC_UNAVAILABLE: 48, // 2 days - biometric not available on device
  GYROSCOPE_UNAVAILABLE: 720, // 1 month - gyroscope not available on device
  BIOMETRIC_PERMISSION_DENIED: 48, // 2 days - permission denied for biometric
  GYROSCOPE_PERMISSION_DENIED: 720, // 1 month - permission denied for gyroscope
  MANUAL_BLOCK: 24, // 1 day (default)
  SUSPICIOUS_ACTIVITY: 168, // 1 week
  ABANDONED_VERIFICATION: 2, // 2 hours for abandoned attempts
} as const;

// Verification attempt timeout durations in milliseconds
export const VERIFICATION_TIMEOUTS = {
  CAPTCHA: 15000, // 15 seconds for captcha
  BIOMETRIC: 5 * 60 * 1000, // 5 minutes for biometric permission setup
  GYROSCOPE: 5 * 60 * 1000, // 5 minutes for gyroscope permission setup
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

// Enhanced verification attempt interface (backwards compatible)
export interface VerificationAttempt {
  id: string;
  userId: string;
  telegramId: number;
  verificationType: VerificationType;
  startedAt: string;
  expiresAt: string;
  deviceSupported: boolean;
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
 * Enhanced with permission-related blocking and device availability checks
 */
export const serverBlockService = {
  /**
   * Check if user requires verification based on trust score
   */
  async checkVerificationRequirement(
    telegramId: number,
  ): Promise<VerificationRequirement> {
    try {
      const { data: user, error } = await supabaseServer
        .from("users")
        .select("trust_score")
        .eq("telegram_id", telegramId)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      const trustScore = user.trust_score || 50;

      // Determine required verification type based on trust score
      if (trustScore < TRUST_THRESHOLDS.GYROSCOPE) {
        return {
          required: true,
          type: "gyroscope",
          trustScore,
          threshold: TRUST_THRESHOLDS.GYROSCOPE,
        };
      } else if (trustScore < TRUST_THRESHOLDS.BIOMETRIC) {
        return {
          required: true,
          type: "biometric",
          trustScore,
          threshold: TRUST_THRESHOLDS.BIOMETRIC,
        };
      } else if (trustScore < TRUST_THRESHOLDS.CAPTCHA) {
        return {
          required: true,
          type: "captcha",
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
      console.error("Error checking verification requirement:", error);
      throw new Error("Failed to check verification requirement");
    }
  },

  /**
   * Create verification attempt with correct timeout based on verification type
   */
  async createVerificationAttempt(
    userId: string,
    telegramId: number,
    verificationType: VerificationType,
    deviceSupported: boolean = true,
  ): Promise<string> {
    try {
      const startedAt = new Date().toISOString();

      // Set expiration time based on verification type
      const timeoutMs =
        VERIFICATION_TIMEOUTS[
          verificationType.toUpperCase() as keyof typeof VERIFICATION_TIMEOUTS
        ] || VERIFICATION_TIMEOUTS.CAPTCHA;
      const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

      const { data, error } = await supabaseServer
        .from("verification_attempts")
        .insert({
          user_id: userId,
          telegram_id: telegramId,
          verification_type: verificationType,
          started_at: startedAt,
          expires_at: expiresAt,
          device_supported: deviceSupported,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Failed to create verification attempt: ${error.message}`,
        );
      }

      return data.id;
    } catch (error) {
      console.error("Error creating verification attempt:", error);
      throw new Error("Failed to create verification attempt");
    }
  },

  /**
   * Check for active or expired verification attempt (compatible with existing schema)
   */
  async checkVerificationAttempt(telegramId: number): Promise<{
    attempt: VerificationAttempt | null;
    isExpired: boolean;
  }> {
    try {
      const { data, error } = await supabaseServer
        .from("verification_attempts")
        .select("*")
        .eq("telegram_id", telegramId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return { attempt: null, isExpired: false };
      }

      const attempt: VerificationAttempt = {
        id: data.id,
        userId: data.user_id,
        telegramId: data.telegram_id,
        verificationType: data.verification_type,
        startedAt: data.started_at,
        expiresAt: data.expires_at,
        deviceSupported: data.device_supported,
      };

      const isExpired = new Date(data.expires_at) < new Date();

      return { attempt, isExpired };
    } catch (error) {
      console.error("Error checking verification attempt:", error);

      return { attempt: null, isExpired: false };
    }
  },

  /**
   * Remove verification attempt (called after successful or failed verification)
   */
  async removeVerificationAttempt(attemptId: string): Promise<void> {
    try {
      const { error } = await supabaseServer
        .from("verification_attempts")
        .delete()
        .eq("id", attemptId);

      if (error) {
        console.error("Error removing verification attempt:", error);
      }
    } catch (error) {
      console.error("Error removing verification attempt:", error);
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
      const { data, error } = await supabaseServer.rpc(
        "get_user_active_block",
        {
          p_telegram_id: telegramId,
        },
      );

      if (error) {
        console.error("Error checking user block:", error);

        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const blockData = data[0];

      return {
        blockId: blockData.block_id,
        userId: "", // Will be filled if needed
        telegramId,
        blockReason: blockData.block_reason,
        blockedAt: blockData.blocked_at,
        unblockedAt: blockData.unblocked_at,
        timeRemainingSeconds: Math.max(
          0,
          blockData.time_remaining_seconds || 0,
        ),
        verificationType: blockData.verification_type,
        trustScoreAtBlock: blockData.trust_score_at_block,
        isActive: blockData.time_remaining_seconds > 0,
      };
    } catch (error) {
      console.error("Error checking user block:", error);

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
    additionalData?: Record<string, any>,
  ): Promise<BlockServiceResponse> {
    try {
      // Get user's current trust score
      const { data: user, error: userError } = await supabaseServer
        .from("users")
        .select("trust_score")
        .eq("telegram_id", telegramId)
        .single();

      if (userError) {
        throw new Error("User not found");
      }

      const trustScore = user.trust_score || 50;

      // Determine block duration based on reason
      let durationHours: number;

      switch (blockReason) {
        case "failed_captcha":
          durationHours = BLOCK_DURATIONS.FAILED_CAPTCHA;
          break;
        case "failed_biometric":
          durationHours = BLOCK_DURATIONS.FAILED_BIOMETRIC;
          break;
        case "failed_gyroscope":
          durationHours = BLOCK_DURATIONS.FAILED_GYROSCOPE;
          break;
        case "device_unsupported_biometric":
          durationHours = BLOCK_DURATIONS.DEVICE_UNSUPPORTED_BIOMETRIC;
          break;
        case "device_unsupported_gyroscope":
          durationHours = BLOCK_DURATIONS.DEVICE_UNSUPPORTED_GYROSCOPE;
          break;
        case "biometric_unavailable":
          durationHours = BLOCK_DURATIONS.BIOMETRIC_UNAVAILABLE;
          break;
        case "gyroscope_unavailable":
          durationHours = BLOCK_DURATIONS.GYROSCOPE_UNAVAILABLE;
          break;
        case "biometric_permission_denied":
          durationHours = BLOCK_DURATIONS.BIOMETRIC_PERMISSION_DENIED;
          break;
        case "gyroscope_permission_denied":
          durationHours = BLOCK_DURATIONS.GYROSCOPE_PERMISSION_DENIED;
          break;
        case "manual_block":
          durationHours = BLOCK_DURATIONS.MANUAL_BLOCK;
          break;
        case "suspicious_activity":
          durationHours = BLOCK_DURATIONS.SUSPICIOUS_ACTIVITY;
          break;
        case "abandoned_verification":
          durationHours = BLOCK_DURATIONS.ABANDONED_VERIFICATION;
          break;
        default:
          durationHours = BLOCK_DURATIONS.MANUAL_BLOCK;
      }

      // Create block using database function
      const { data: blockId, error: blockError } = await supabaseServer.rpc(
        "block_user_with_duration",
        {
          p_user_id: userId,
          p_telegram_id: telegramId,
          p_block_reason: blockReason,
          p_duration_hours: durationHours,
          p_verification_type: verificationType || null,
          p_trust_score: trustScore,
          p_additional_data: additionalData || {},
        },
      );

      if (blockError) {
        throw new Error(`Failed to create block: ${blockError.message}`);
      }

      return {
        success: true,
        data: {
          blockId,
          durationHours,
          blockReason,
          verificationType,
          trustScore,
        },
      };
    } catch (error) {
      console.error("Error blocking user:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to block user",
      };
    }
  },

  /**
   * Unblock user manually or automatically
   */
  async unblockUser(
    telegramId: number,
    reason: string = "manual_unblock",
  ): Promise<UnblockServiceResponse> {
    try {
      // Deactivate all active blocks for this user
      const { data, error } = await supabaseServer
        .from("user_blocks")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
          additional_data: { unblock_reason: reason, unblocked_manually: true },
        })
        .eq("telegram_id", telegramId)
        .eq("is_active", true)
        .select("id");

      if (error) {
        throw new Error(`Failed to unblock user: ${error.message}`);
      }

      const blocksCleared = data?.length || 0;

      return {
        success: true,
        unblocked: true,
        blocksCleared,
        data: { telegramId, reason, blocksCleared },
      };
    } catch (error) {
      console.error("Error unblocking user:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to unblock user",
      };
    }
  },

  /**
   * Automatically unblock expired blocks
   */
  async autoUnblockExpiredBlocks(): Promise<number> {
    try {
      const { data: unblockedCount, error } = await supabaseServer.rpc(
        "auto_unblock_expired_blocks",
      );

      if (error) {
        console.error("Error auto-unblocking expired blocks:", error);

        return 0;
      }

      return unblockedCount || 0;
    } catch (error) {
      console.error("Error in auto-unblock process:", error);

      return 0;
    }
  },

  /**
   * Restore user trust score after successful verification
   */
  async restoreTrustScore(
    telegramId: number,
    verificationType: VerificationType,
  ): Promise<BlockServiceResponse> {
    try {
      const { error } = await supabaseServer
        .from("users")
        .update({
          trust_score: RESTORED_TRUST_SCORE,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        throw new Error(`Failed to restore trust score: ${error.message}`);
      }

      return {
        success: true,
        data: {
          telegramId,
          verificationType,
          newTrustScore: RESTORED_TRUST_SCORE,
        },
      };
    } catch (error) {
      console.error("Error restoring trust score:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to restore trust score",
      };
    }
  },

  /**
   * Enhanced verification failure handler with new permission-related reasons
   */
  async handleVerificationFailure(
    userId: string,
    telegramId: number,
    verificationType: VerificationType,
    blockReason: BlockReason,
  ): Promise<BlockServiceResponse> {
    return await this.blockUser(
      userId,
      telegramId,
      blockReason,
      verificationType,
      {
        failedAt: new Date().toISOString(),
        verificationType,
        reason: blockReason,
      },
    );
  },

  /**
   * Handle successful verification
   */
  async handleVerificationSuccess(
    telegramId: number,
    verificationType: VerificationType,
  ): Promise<BlockServiceResponse> {
    try {
      // Restore trust score
      const restoreResult = await this.restoreTrustScore(
        telegramId,
        verificationType,
      );

      if (!restoreResult.success) {
        throw new Error(restoreResult.error);
      }

      return {
        success: true,
        data: {
          telegramId,
          verificationType,
          trustScoreRestored: true,
          newTrustScore: RESTORED_TRUST_SCORE,
        },
      };
    } catch (error) {
      console.error("Error handling verification success:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to handle verification success",
      };
    }
  },

  /**
   * Handle abandoned verification attempt
   */
  async handleAbandonedVerification(
    attempt: VerificationAttempt,
  ): Promise<BlockServiceResponse> {
    try {
      // Block user for abandoning verification
      const blockResult = await this.blockUser(
        attempt.userId,
        attempt.telegramId,
        "abandoned_verification",
        attempt.verificationType,
        {
          abandonedAt: new Date().toISOString(),
          originalStartTime: attempt.startedAt,
          originalExpireTime: attempt.expiresAt,
          deviceSupported: attempt.deviceSupported,
        },
      );

      // Remove verification attempt record
      await this.removeVerificationAttempt(attempt.id);

      return blockResult;
    } catch (error) {
      console.error("Error handling abandoned verification:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to handle abandoned verification",
      };
    }
  },
};
