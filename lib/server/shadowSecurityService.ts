// src/lib/server/shadowSecurityService.ts - Enhanced server service with gyroscope monitoring support

import { supabaseServer } from "../supabase_server";

import {
  SuspiciousActivityData,
  SuspiciousActivityRecord,
  SuspiciousActivityStats,
  GetUserSuspiciousActivityResponse,
  GetSuspiciousActivityStatsResponse,
  hasAnySuspiciousActivity,
} from "@/types/security/shadowSecurity";

/**
 * Enhanced server-side service for managing suspicious activity records with gyroscope monitoring
 * Handles database operations for the comprehensive shadow security system
 */
export class ShadowSecurityService {
  /**
   * Submit enhanced suspicious activity data to the database
   * Creates a record only if there are suspicious clicks OR suspicious gyroscope activity
   * @param activityData - The suspicious activity data to store
   * @returns Promise with success status and error if any
   */
  static async submitSuspiciousActivity(
    activityData: SuspiciousActivityData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that there is actually suspicious activity
      if (!hasAnySuspiciousActivity(activityData)) {
        return {
          success: true, // No suspicious activity, no need to record
        };
      }

      // Validate input data
      if (!activityData.telegramId || activityData.telegramId <= 0) {
        return {
          success: false,
          error: "Invalid telegram ID provided",
        };
      }

      if (!activityData.gameMode) {
        return {
          success: false,
          error: "Game mode is required",
        };
      }

      // Validate click data consistency
      if (
        activityData.totalClicks <= 0 &&
        activityData.suspiciousClicksCount > 0
      ) {
        return {
          success: false,
          error: "Cannot have suspicious clicks without total clicks",
        };
      }

      if (activityData.suspiciousClicksCount > activityData.totalClicks) {
        return {
          success: false,
          error: "Suspicious clicks count cannot exceed total clicks",
        };
      }

      // Validate gyroscope data consistency
      if (activityData.gyroscopeEnabled) {
        if (
          activityData.gyroscopeMovementsDetected >
          activityData.totalGyroscopeChecks
        ) {
          return {
            success: false,
            error: "Gyroscope movements detected cannot exceed total checks",
          };
        }

        if (activityData.totalGyroscopeChecks > 0) {
          const calculatedPercentage =
            (activityData.gyroscopeMovementsDetected /
              activityData.totalGyroscopeChecks) *
            100;
          const providedPercentage = activityData.gyroscopeMovementPercentage;

          // Allow small rounding differences
          if (Math.abs(calculatedPercentage - providedPercentage) > 0.1) {
            return {
              success: false,
              error: "Gyroscope movement percentage calculation mismatch",
            };
          }
        }
      }

      // Prepare database record with enhanced gyroscope fields
      const record: Omit<
        SuspiciousActivityRecord,
        "id" | "created_at" | "updated_at"
      > = {
        telegram_id: activityData.telegramId,
        game_mode: activityData.gameMode.toLowerCase(),

        // Click monitoring fields
        total_clicks: activityData.totalClicks,
        suspicious_clicks_count: activityData.suspiciousClicksCount,
        min_reaction_time: activityData.minReactionTime,
        max_reaction_time: activityData.maxReactionTime,
        avg_reaction_time: activityData.avgReactionTime,

        // Gyroscope monitoring fields
        gyroscope_enabled: activityData.gyroscopeEnabled,
        gyroscope_permission_granted: activityData.gyroscopePermissionGranted,
        gyroscope_data_available: activityData.gyroscopeDataAvailable,
        total_gyroscope_checks: activityData.totalGyroscopeChecks,
        gyroscope_movements_detected: activityData.gyroscopeMovementsDetected,
        gyroscope_movement_percentage: activityData.gyroscopeMovementPercentage,
        gyroscope_suspicious: activityData.gyroscopeSuspicious,
        gyroscope_error_reason: activityData.gyroscopeErrorReason,
        gyroscope_min_sensitivity: activityData.gyroscopeMinSensitivity,
        gyroscope_check_intervals_ms: JSON.stringify(
          activityData.gyroscopeCheckIntervals,
        ),

        // Timing fields
        game_start_time: new Date(activityData.gameStartTime).toISOString(),
        game_end_time: new Date(activityData.gameEndTime).toISOString(),
      };

      // Insert record into database
      const { error } = await supabaseServer
        .from("suspicious_activity")
        .insert(record);

      if (error) {
        console.error(
          "Error inserting enhanced suspicious activity record:",
          error,
        );

        return {
          success: false,
          error: "Failed to record suspicious activity in database",
        };
      }

      // Log successful recording for monitoring with enhanced details
      const logDetails = [];

      // Click monitoring details
      if (activityData.suspiciousClicksCount > 0) {
        const clickSuspiciousPercentage = Math.round(
          (activityData.suspiciousClicksCount / activityData.totalClicks) * 100,
        );

        logDetails.push(
          `${activityData.suspiciousClicksCount}/${activityData.totalClicks} suspicious clicks (${clickSuspiciousPercentage}%)`,
        );
      }

      // Gyroscope monitoring details
      if (activityData.gyroscopeEnabled) {
        if (activityData.gyroscopeErrorReason) {
          logDetails.push(
            `gyroscope error: ${activityData.gyroscopeErrorReason}`,
          );
        } else {
          logDetails.push(
            `gyroscope: ${activityData.gyroscopeMovementsDetected}/${activityData.totalGyroscopeChecks} movements (${activityData.gyroscopeMovementPercentage.toFixed(1)}%)${activityData.gyroscopeSuspicious ? " - SUSPICIOUS" : ""}`,
          );
        }
      }

      console.log(
        `Shadow Security: Enhanced record created for user ${activityData.telegramId} in ${activityData.gameMode} mode. ` +
          `Details: ${logDetails.join(", ")}. ` +
          `Reaction times: ${activityData.minReactionTime}ms - ${activityData.maxReactionTime}ms (avg: ${activityData.avgReactionTime}ms)`,
      );

      return { success: true };
    } catch (error) {
      console.error("Error in enhanced submitSuspiciousActivity:", error);

      return {
        success: false,
        error: "Internal server error while recording suspicious activity",
      };
    }
  }

  /**
   * Retrieve enhanced suspicious activity records for a specific user
   * @param telegramId - The user's Telegram ID
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Promise with user's suspicious activity records
   */
  static async getUserSuspiciousActivity(
    telegramId: number,
    limit: number = 50,
  ): Promise<GetUserSuspiciousActivityResponse> {
    try {
      // Validate input parameters
      if (!telegramId || telegramId <= 0) {
        return {
          success: false,
          error: "Invalid telegram ID provided",
        };
      }

      if (limit <= 0 || limit > 1000) {
        return {
          success: false,
          error: "Limit must be between 1 and 1000",
        };
      }

      // Query suspicious activity records for the user with all enhanced fields
      const { data, error } = await supabaseServer
        .from("suspicious_activity")
        .select("*")
        .eq("telegram_id", telegramId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error(
          "Error fetching enhanced suspicious activity records:",
          error,
        );

        return {
          success: false,
          error: "Failed to fetch suspicious activity records from database",
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Error in enhanced getUserSuspiciousActivity:", error);

      return {
        success: false,
        error:
          "Internal server error while fetching suspicious activity records",
      };
    }
  }

  /**
   * Get enhanced suspicious activity statistics for administrative analysis
   * @param gameMode - Optional filter by game mode
   * @param fromDate - Optional start date filter
   * @param toDate - Optional end date filter
   * @returns Promise with aggregated statistics including gyroscope data
   */
  static async getSuspiciousActivityStats(
    gameMode?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<GetSuspiciousActivityStatsResponse> {
    try {
      // Build query with optional filters
      let query = supabaseServer.from("suspicious_activity").select("*");

      if (gameMode) {
        const normalizedGameMode = gameMode.toLowerCase().trim();

        if (normalizedGameMode) {
          query = query.eq("game_mode", normalizedGameMode);
        }
      }

      if (fromDate) {
        query = query.gte("created_at", fromDate.toISOString());
      }

      if (toDate) {
        query = query.lte("created_at", toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "Error fetching enhanced suspicious activity stats:",
          error,
        );

        return {
          success: false,
          error: "Failed to fetch suspicious activity statistics from database",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            averageSuspiciousPercentage: 0,
            clickSuspiciousGames: 0,
            averageClickSuspiciousPercentage: 0,
            gyroscopeEnabledGames: 0,
            gyroscopeSuspiciousGames: 0,
            averageGyroscopeMovementPercentage: 0,
            combinedSuspiciousGames: 0,
            mostSuspiciousUsers: [],
            gyroscopeErrors: [],
          },
        };
      }

      // Calculate enhanced statistics
      const totalRecords = data.length;

      // Click-based statistics
      const clickSuspiciousRecords = data.filter(
        (record) => record.suspicious_clicks_count > 0,
      );
      const clickSuspiciousGames = clickSuspiciousRecords.length;

      const clickSuspiciousPercentages = clickSuspiciousRecords.map(
        (record) =>
          (record.suspicious_clicks_count / Math.max(record.total_clicks, 1)) *
          100,
      );
      const averageClickSuspiciousPercentage =
        clickSuspiciousPercentages.length > 0
          ? Math.round(
              (clickSuspiciousPercentages.reduce(
                (sum, percentage) => sum + percentage,
                0,
              ) /
                clickSuspiciousPercentages.length) *
                100,
            ) / 100
          : 0;

      // Gyroscope-based statistics
      const gyroscopeEnabledRecords = data.filter(
        (record) => record.gyroscope_enabled,
      );
      const gyroscopeEnabledGames = gyroscopeEnabledRecords.length;
      const gyroscopeSuspiciousGames = data.filter(
        (record) => record.gyroscope_suspicious,
      ).length;

      const gyroscopeMovementPercentages = gyroscopeEnabledRecords.map(
        (record) => record.gyroscope_movement_percentage || 0,
      );
      const averageGyroscopeMovementPercentage =
        gyroscopeMovementPercentages.length > 0
          ? Math.round(
              (gyroscopeMovementPercentages.reduce(
                (sum, percentage) => sum + percentage,
                0,
              ) /
                gyroscopeMovementPercentages.length) *
                100,
            ) / 100
          : 0;

      // Combined statistics
      const combinedSuspiciousGames = data.filter(
        (record) =>
          record.suspicious_clicks_count > 0 || record.gyroscope_suspicious,
      ).length;

      // Overall suspicious percentage (considering both click and gyroscope)
      const overallSuspiciousPercentages = data.map((record) => {
        let combinedSuspiciousness = 0;
        let factorsCount = 0;

        // Click factor
        if (record.total_clicks > 0) {
          combinedSuspiciousness +=
            (record.suspicious_clicks_count / record.total_clicks) * 100;
          factorsCount++;
        }

        // Gyroscope factor (inverted - lower movement percentage = higher suspicion)
        if (record.gyroscope_enabled && record.total_gyroscope_checks > 0) {
          const gyroscopeSuspiciousness = Math.max(
            0,
            100 - (record.gyroscope_movement_percentage || 0),
          );

          combinedSuspiciousness += gyroscopeSuspiciousness;
          factorsCount++;
        }

        return factorsCount > 0 ? combinedSuspiciousness / factorsCount : 0;
      });

      const averageSuspiciousPercentage =
        overallSuspiciousPercentages.length > 0
          ? Math.round(
              (overallSuspiciousPercentages.reduce(
                (sum, percentage) => sum + percentage,
                0,
              ) /
                overallSuspiciousPercentages.length) *
                100,
            ) / 100
          : 0;

      // Group records by user and calculate enhanced risk metrics
      const userStatsMap = new Map<
        number,
        {
          clickSuspicious: number;
          clickTotal: number;
          gyroscopeMovementSum: number;
          gyroscopeGames: number;
          games: number;
        }
      >();

      data.forEach((record) => {
        const userId = record.telegram_id;
        const existing = userStatsMap.get(userId) || {
          clickSuspicious: 0,
          clickTotal: 0,
          gyroscopeMovementSum: 0,
          gyroscopeGames: 0,
          games: 0,
        };

        userStatsMap.set(userId, {
          clickSuspicious:
            existing.clickSuspicious + record.suspicious_clicks_count,
          clickTotal: existing.clickTotal + record.total_clicks,
          gyroscopeMovementSum:
            existing.gyroscopeMovementSum +
            (record.gyroscope_enabled
              ? record.gyroscope_movement_percentage || 0
              : 0),
          gyroscopeGames:
            existing.gyroscopeGames + (record.gyroscope_enabled ? 1 : 0),
          games: existing.games + 1,
        });
      });

      // Calculate enhanced user risk scores
      const mostSuspiciousUsers = Array.from(userStatsMap.entries())
        .map(([telegram_id, stats]) => {
          const clickSuspiciousPercentage =
            stats.clickTotal > 0
              ? Math.round((stats.clickSuspicious / stats.clickTotal) * 10000) /
                100
              : 0;

          const gyroscopeMovementPercentage =
            stats.gyroscopeGames > 0
              ? Math.round(
                  (stats.gyroscopeMovementSum / stats.gyroscopeGames) * 100,
                ) / 100
              : 100; // Default to 100% for users without gyroscope data

          // Enhanced risk score calculation
          const clickRisk = clickSuspiciousPercentage * 0.6; // 60% weight for clicks
          const gyroscopeRisk = (100 - gyroscopeMovementPercentage) * 0.4; // 40% weight for gyroscope
          const combinedRisk = clickRisk + gyroscopeRisk;

          return {
            telegram_id,
            suspicious_percentage: clickSuspiciousPercentage,
            gyroscope_movement_percentage: gyroscopeMovementPercentage,
            total_games: stats.games,
            risk_score: Math.round(combinedRisk * 100) / 100,
          };
        })
        .filter(
          (user) =>
            user.suspicious_percentage > 0 ||
            user.gyroscope_movement_percentage < 90,
        )
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 10);

      // Analyze gyroscope error patterns
      const gyroscopeErrorMap = new Map<string, number>();

      data.forEach((record) => {
        if (record.gyroscope_error_reason) {
          const count =
            gyroscopeErrorMap.get(record.gyroscope_error_reason) || 0;

          gyroscopeErrorMap.set(record.gyroscope_error_reason, count + 1);
        }
      });

      const gyroscopeErrors = Array.from(gyroscopeErrorMap.entries())
        .map(([error_reason, count]) => ({
          error_reason,
          count,
          percentage: Math.round((count / totalRecords) * 10000) / 100,
        }))
        .sort((a, b) => b.count - a.count);

      const statsData: SuspiciousActivityStats = {
        totalRecords,
        averageSuspiciousPercentage,
        clickSuspiciousGames,
        averageClickSuspiciousPercentage,
        gyroscopeEnabledGames,
        gyroscopeSuspiciousGames,
        averageGyroscopeMovementPercentage,
        combinedSuspiciousGames,
        mostSuspiciousUsers,
        gyroscopeErrors,
      };

      return {
        success: true,
        data: statsData,
      };
    } catch (error) {
      console.error("Error in enhanced getSuspiciousActivityStats:", error);

      return {
        success: false,
        error:
          "Internal server error while calculating suspicious activity statistics",
      };
    }
  }

  /**
   * Check if a user has recent suspicious activity including gyroscope patterns
   * @param telegramId - The user's Telegram ID
   * @param hoursBack - How many hours back to check (default: 24)
   * @param clickSuspiciousThreshold - Minimum percentage for click suspicion (default: 30)
   * @param gyroscopeMovementThreshold - Maximum movement percentage for gyroscope suspicion (default: 20)
   * @returns Promise with enhanced suspicious activity analysis
   */
  static async hasRecentSuspiciousActivity(
    telegramId: number,
    hoursBack: number = 24,
    clickSuspiciousThreshold: number = 30,
    gyroscopeMovementThreshold: number = 20,
  ): Promise<{
    success: boolean;
    hasSuspiciousActivity?: boolean;
    recentGames?: number;
    clickSuspiciousPercentage?: number;
    gyroscopeAverageMovement?: number;
    gyroscopeEnabledGames?: number;
    combinedRiskScore?: number;
    error?: string;
  }> {
    try {
      // Validate input parameters
      if (!telegramId || telegramId <= 0) {
        return {
          success: false,
          error: "Invalid telegram ID provided",
        };
      }

      if (hoursBack <= 0 || hoursBack > 168) {
        // Max 1 week
        return {
          success: false,
          error: "Hours back must be between 1 and 168 (1 week)",
        };
      }

      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Query recent activity for the user
      const { data, error } = await supabaseServer
        .from("suspicious_activity")
        .select("*")
        .eq("telegram_id", telegramId)
        .gte("created_at", cutoffTime.toISOString());

      if (error) {
        console.error(
          "Error checking enhanced recent suspicious activity:",
          error,
        );

        return {
          success: false,
          error: "Failed to check recent suspicious activity",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          hasSuspiciousActivity: false,
          recentGames: 0,
          clickSuspiciousPercentage: 0,
          gyroscopeAverageMovement: 100,
          gyroscopeEnabledGames: 0,
          combinedRiskScore: 0,
        };
      }

      // Calculate enhanced metrics
      const totalSuspiciousClicks = data.reduce(
        (sum, record) => sum + record.suspicious_clicks_count,
        0,
      );
      const totalClicks = data.reduce(
        (sum, record) => sum + record.total_clicks,
        0,
      );
      const clickSuspiciousPercentage =
        totalClicks > 0
          ? Math.round((totalSuspiciousClicks / totalClicks) * 10000) / 100
          : 0;

      // Gyroscope metrics
      const gyroscopeEnabledRecords = data.filter(
        (record) => record.gyroscope_enabled,
      );
      const gyroscopeEnabledGames = gyroscopeEnabledRecords.length;
      const totalGyroscopeMovement = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.gyroscope_movement_percentage || 0),
        0,
      );
      const gyroscopeAverageMovement =
        gyroscopeEnabledGames > 0
          ? Math.round((totalGyroscopeMovement / gyroscopeEnabledGames) * 100) /
            100
          : 100;

      // Enhanced risk assessment
      const hasClickSuspicion =
        clickSuspiciousPercentage >= clickSuspiciousThreshold;
      const hasGyroscopeSuspicion =
        gyroscopeEnabledGames > 0 &&
        gyroscopeAverageMovement <= gyroscopeMovementThreshold;

      // Combined risk score calculation
      const clickRisk = clickSuspiciousPercentage * 0.6;
      const gyroscopeRisk =
        gyroscopeEnabledGames > 0 ? (100 - gyroscopeAverageMovement) * 0.4 : 0;
      const combinedRiskScore =
        Math.round((clickRisk + gyroscopeRisk) * 100) / 100;

      const hasSuspiciousActivity =
        hasClickSuspicion || hasGyroscopeSuspicion || combinedRiskScore >= 40;

      return {
        success: true,
        hasSuspiciousActivity,
        recentGames: data.length,
        clickSuspiciousPercentage,
        gyroscopeAverageMovement,
        gyroscopeEnabledGames,
        combinedRiskScore,
      };
    } catch (error) {
      console.error("Error in enhanced hasRecentSuspiciousActivity:", error);

      return {
        success: false,
        error:
          "Internal server error while checking recent suspicious activity",
      };
    }
  }

  /**
   * Get gyroscope monitoring statistics for administrative analysis
   * @param gameMode - Optional filter by game mode
   * @param fromDate - Optional start date filter
   * @param toDate - Optional end date filter
   * @returns Promise with gyroscope-specific statistics
   */
  static async getGyroscopeMonitoringStats(
    gameMode?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    success: boolean;
    data?: {
      totalGames: number;
      gyroscopeEnabledGames: number;
      gyroscopeEnabledPercentage: number;
      averageMovementPercentage: number;
      suspiciousGyroscopeGames: number;
      suspiciousGyroscopePercentage: number;
      commonErrors: Array<{ error: string; count: number; percentage: number }>;
      averageChecksPerGame: number;
      averageSensitivity: number;
    };
    error?: string;
  }> {
    try {
      // Build query
      let query = supabaseServer.from("suspicious_activity").select("*");

      if (gameMode) {
        query = query.eq("game_mode", gameMode.toLowerCase());
      }

      if (fromDate) {
        query = query.gte("created_at", fromDate.toISOString());
      }

      if (toDate) {
        query = query.lte("created_at", toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching gyroscope monitoring stats:", error);

        return {
          success: false,
          error: "Failed to fetch gyroscope monitoring statistics",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: {
            totalGames: 0,
            gyroscopeEnabledGames: 0,
            gyroscopeEnabledPercentage: 0,
            averageMovementPercentage: 0,
            suspiciousGyroscopeGames: 0,
            suspiciousGyroscopePercentage: 0,
            commonErrors: [],
            averageChecksPerGame: 0,
            averageSensitivity: 0,
          },
        };
      }

      const totalGames = data.length;
      const gyroscopeEnabledRecords = data.filter(
        (record) => record.gyroscope_enabled,
      );
      const gyroscopeEnabledGames = gyroscopeEnabledRecords.length;
      const gyroscopeEnabledPercentage =
        Math.round((gyroscopeEnabledGames / totalGames) * 10000) / 100;

      const totalMovementPercentage = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.gyroscope_movement_percentage || 0),
        0,
      );
      const averageMovementPercentage =
        gyroscopeEnabledGames > 0
          ? Math.round(
              (totalMovementPercentage / gyroscopeEnabledGames) * 100,
            ) / 100
          : 0;

      const suspiciousGyroscopeGames = data.filter(
        (record) => record.gyroscope_suspicious,
      ).length;
      const suspiciousGyroscopePercentage =
        gyroscopeEnabledGames > 0
          ? Math.round(
              (suspiciousGyroscopeGames / gyroscopeEnabledGames) * 10000,
            ) / 100
          : 0;

      // Error analysis
      const errorMap = new Map<string, number>();

      data.forEach((record) => {
        if (record.gyroscope_error_reason) {
          const count = errorMap.get(record.gyroscope_error_reason) || 0;

          errorMap.set(record.gyroscope_error_reason, count + 1);
        }
      });

      const commonErrors = Array.from(errorMap.entries())
        .map(([error, count]) => ({
          error,
          count,
          percentage: Math.round((count / totalGames) * 10000) / 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Average checks and sensitivity
      const totalChecks = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.total_gyroscope_checks || 0),
        0,
      );
      const averageChecksPerGame =
        gyroscopeEnabledGames > 0
          ? Math.round((totalChecks / gyroscopeEnabledGames) * 100) / 100
          : 0;

      const totalSensitivity = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.gyroscope_min_sensitivity || 0),
        0,
      );
      const averageSensitivity =
        gyroscopeEnabledGames > 0
          ? Math.round((totalSensitivity / gyroscopeEnabledGames) * 1000) / 1000
          : 0;

      return {
        success: true,
        data: {
          totalGames,
          gyroscopeEnabledGames,
          gyroscopeEnabledPercentage,
          averageMovementPercentage,
          suspiciousGyroscopeGames,
          suspiciousGyroscopePercentage,
          commonErrors,
          averageChecksPerGame,
          averageSensitivity,
        },
      };
    } catch (error) {
      console.error("Error in getGyroscopeMonitoringStats:", error);

      return {
        success: false,
        error:
          "Internal server error while fetching gyroscope monitoring statistics",
      };
    }
  }

  /**
   * Delete old suspicious activity records
   * This method is intended for data maintenance and cleanup
   * @param daysOld - Delete records older than this many days (minimum: 30 days)
   * @returns Promise with deletion results
   */
  static async cleanupOldRecords(daysOld: number = 90): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      // Validate minimum age requirement
      if (daysOld < 30) {
        return {
          success: false,
          error: "Cannot delete records less than 30 days old",
        };
      }

      // Calculate cutoff date
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      // Delete old records
      const { data, error } = await supabaseServer
        .from("suspicious_activity")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .select("id");

      if (error) {
        console.error(
          "Error cleaning up old suspicious activity records:",
          error,
        );

        return {
          success: false,
          error: "Failed to clean up old records",
        };
      }

      const deletedCount = data ? data.length : 0;

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      console.error("Error in cleanupOldRecords:", error);

      return {
        success: false,
        error: "Internal server error while cleaning up old records",
      };
    }
  }
}

// Export a singleton instance for use throughout the application
export const shadowSecurityService = ShadowSecurityService;
