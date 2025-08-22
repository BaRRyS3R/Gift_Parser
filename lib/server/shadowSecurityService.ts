// src/lib/server/shadowSecurityService.ts - Enhanced with strict validation to prevent database division by zero

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
 * Enhanced server-side service for managing suspicious activity records with strict validation
 * FIXED: Added comprehensive validation to prevent all database division by zero scenarios
 */
export class ShadowSecurityService {
  /**
   * Protected division helper method to prevent division by zero errors
   * @param numerator - The numerator value
   * @param denominator - The denominator value  
   * @param defaultValue - Value to return if division is unsafe (default: 0)
   * @returns Safe division result or default value
   */
  static safeDivision(numerator: number, denominator: number, defaultValue: number = 0): number {
    if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
      return defaultValue;
    }
    const result = numerator / denominator;
    return isFinite(result) ? result : defaultValue;
  }

  /**
   * Enhanced percentage calculation with safety checks
   * @param numerator - The numerator value
   * @param denominator - The denominator value
   * @returns Safe percentage (0-100) or 0 if calculation is unsafe
   */
  static safePercentage(numerator: number, denominator: number): number {
    const percentage = this.safeDivision(numerator, denominator, 0) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage * 100) / 100));
  }

  /**
   * Enhanced validation to determine if activity data should be recorded
   * FIXED: Prevents recording activities that could cause database division by zero
   * @param data - The suspicious activity data to validate
   * @returns true if data should be recorded, false otherwise
   */
  static shouldRecordActivity(data: SuspiciousActivityData): boolean {
    // Must have actual suspicious clicks OR meaningful gyroscope activity
    const hasSuspiciousClicks = data.suspiciousClicksCount > 0;
    const hasValidGyroscopeActivity = data.gyroscopeEnabled && data.totalGyroscopeChecks > 0;
    
    // Special case: If gyroscope is unavailable but we have clicks, it's worth recording
    const hasClicksWithGyroscopeUnavailable = data.totalClicks > 0 && 
      !data.gyroscopeEnabled && 
      data.gyroscopeErrorReason !== null &&
      data.gyroscopeErrorReason !== "ios_optimization_disabled";

    // CRITICAL: Don't record if we have no clicks AND no meaningful gyroscope data
    // This prevents database division by zero on empty records
    if (data.totalClicks === 0 && !hasValidGyroscopeActivity) {
      console.log(
        `Shadow Security: Skipping record for user ${data.telegramId} - ` +
        `no clicks (${data.totalClicks}) and no meaningful gyroscope data ` +
        `(enabled: ${data.gyroscopeEnabled}, checks: ${data.totalGyroscopeChecks})`
      );
      return false;
    }

    // Record if we have any of these conditions
    return hasSuspiciousClicks || hasValidGyroscopeActivity || hasClicksWithGyroscopeUnavailable;
  }

  /**
   * Submit enhanced suspicious activity data to the database with comprehensive validation
   * FIXED: Added strict pre-validation to prevent database division by zero scenarios
   * @param activityData - The suspicious activity data to store
   * @returns Promise with success status and error if any
   */
  static async submitSuspiciousActivity(
    activityData: SuspiciousActivityData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that there is actually suspicious activity worth recording
      if (!hasAnySuspiciousActivity(activityData)) {
        console.log(
          `Shadow Security: No suspicious activity detected for user ${activityData.telegramId} - skipping`
        );
        return {
          success: true, // No suspicious activity, no need to record
        };
      }

      // CRITICAL: Additional validation to prevent database division by zero
      if (!this.shouldRecordActivity(activityData)) {
        console.log(
          `Shadow Security: Activity data validation failed for user ${activityData.telegramId} - ` +
          `would cause database division by zero`
        );
        return {
          success: true, // Don't record problematic data
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

      // ENHANCED FIX: Comprehensive data normalization with database safety
      const normalizedActivityData = { ...activityData };

      // Step 1: Handle zero gyroscope checks scenario
      if (normalizedActivityData.totalGyroscopeChecks === 0) {
        normalizedActivityData.gyroscopeMovementsDetected = 0;
        normalizedActivityData.gyroscopeMovementPercentage = 0;
        // CRITICAL: Don't mark as suspicious if no checks were performed
        normalizedActivityData.gyroscopeSuspicious = false;

        const gameDuration =
          normalizedActivityData.gameEndTime -
          normalizedActivityData.gameStartTime;

        console.log(
          `Shadow Security: Zero gyroscope checks normalization for user ${normalizedActivityData.telegramId} - ` +
            `game duration: ${gameDuration}ms, forcing gyroscope_suspicious to false`,
        );
      } 
      // Step 2: Validate and recalculate percentage for non-zero checks
      else {
        // Ensure movements detected cannot exceed total checks
        normalizedActivityData.gyroscopeMovementsDetected = Math.min(
          normalizedActivityData.gyroscopeMovementsDetected,
          normalizedActivityData.totalGyroscopeChecks
        );

        // Recalculate percentage with protection against division by zero
        const recalculatedPercentage = this.safePercentage(
          normalizedActivityData.gyroscopeMovementsDetected,
          normalizedActivityData.totalGyroscopeChecks
        );

        // Check for discrepancy and use calculated value
        const percentageDifference = Math.abs(
          recalculatedPercentage - normalizedActivityData.gyroscopeMovementPercentage,
        );

        if (percentageDifference > 0.1) {
          normalizedActivityData.gyroscopeMovementPercentage = recalculatedPercentage;

          console.warn(
            `Shadow Security: Corrected gyroscope percentage for user ${normalizedActivityData.telegramId} - ` +
              `original: ${activityData.gyroscopeMovementPercentage}%, corrected: ${normalizedActivityData.gyroscopeMovementPercentage}%`,
          );
        }
      }

      // Step 3: Final validation of normalized gyroscope data
      if (normalizedActivityData.gyroscopeEnabled) {
        // Ensure movements cannot exceed checks
        if (
          normalizedActivityData.gyroscopeMovementsDetected >
          normalizedActivityData.totalGyroscopeChecks
        ) {
          return {
            success: false,
            error: "Gyroscope movements detected cannot exceed total checks",
          };
        }

        // Ensure percentage is within valid bounds
        if (
          normalizedActivityData.gyroscopeMovementPercentage < 0 ||
          normalizedActivityData.gyroscopeMovementPercentage > 100
        ) {
          normalizedActivityData.gyroscopeMovementPercentage = Math.max(
            0,
            Math.min(100, normalizedActivityData.gyroscopeMovementPercentage),
          );
        }

        // CRITICAL: Double-check that we won't cause division by zero in DB
        if (normalizedActivityData.totalGyroscopeChecks === 0) {
          normalizedActivityData.gyroscopeMovementsDetected = 0;
          normalizedActivityData.gyroscopeMovementPercentage = 0;
          normalizedActivityData.gyroscopeSuspicious = false;
          console.warn(
            `Shadow Security: Emergency zero-checks protection applied for user ${normalizedActivityData.telegramId}`,
          );
        }
      }

      // Step 4: Additional click data normalization
      if (normalizedActivityData.totalClicks === 0) {
        normalizedActivityData.suspiciousClicksCount = 0;
        normalizedActivityData.minReactionTime = 0;
        normalizedActivityData.maxReactionTime = 0;
        normalizedActivityData.avgReactionTime = 0;
      }

      // Step 5: CRITICAL DATABASE SAFETY CHECK
      // Prevent any record that could cause division by zero in database triggers/constraints
      if (normalizedActivityData.totalClicks === 0 && 
          normalizedActivityData.totalGyroscopeChecks === 0) {
        console.warn(
          `Shadow Security: Blocking potentially problematic record for user ${normalizedActivityData.telegramId} - ` +
          `both clicks and gyroscope checks are zero, could cause database division by zero`
        );
        return {
          success: true, // Don't record, but don't treat as error
        };
      }

      // Step 6: Prepare database record with extra safety checks
      const record: Omit<
        SuspiciousActivityRecord,
        "id" | "created_at" | "updated_at"
      > = {
        telegram_id: normalizedActivityData.telegramId,
        game_mode: normalizedActivityData.gameMode.toLowerCase(),

        // Click monitoring fields with safe defaults (ensure at least 1 if any clicks exist)
        total_clicks: Math.max(0, normalizedActivityData.totalClicks),
        suspicious_clicks_count: Math.max(0, normalizedActivityData.suspiciousClicksCount),
        min_reaction_time: Math.max(0, normalizedActivityData.minReactionTime),
        max_reaction_time: Math.max(0, normalizedActivityData.maxReactionTime),
        avg_reaction_time: Math.max(0, normalizedActivityData.avgReactionTime),

        // Gyroscope monitoring fields with division-by-zero protection
        gyroscope_enabled: normalizedActivityData.gyroscopeEnabled,
        gyroscope_permission_granted: normalizedActivityData.gyroscopePermissionGranted,
        gyroscope_data_available: normalizedActivityData.gyroscopeDataAvailable,
        total_gyroscope_checks: Math.max(0, normalizedActivityData.totalGyroscopeChecks),
        gyroscope_movements_detected: Math.max(0, normalizedActivityData.gyroscopeMovementsDetected),
        gyroscope_movement_percentage: Math.max(0, Math.min(100, normalizedActivityData.gyroscopeMovementPercentage)),
        gyroscope_suspicious: normalizedActivityData.gyroscopeSuspicious && normalizedActivityData.totalGyroscopeChecks > 0, // Force false if no checks
        gyroscope_error_reason: normalizedActivityData.gyroscopeErrorReason,
        gyroscope_min_sensitivity: Math.max(0.001, normalizedActivityData.gyroscopeMinSensitivity), // Ensure non-zero
        gyroscope_check_intervals_ms: JSON.stringify(
          normalizedActivityData.gyroscopeCheckIntervals || [],
        ),

        // Timing fields
        game_start_time: new Date(normalizedActivityData.gameStartTime).toISOString(),
        game_end_time: new Date(normalizedActivityData.gameEndTime).toISOString(),
      };

      // Step 7: Final validation before database insertion
      if (record.total_gyroscope_checks === 0) {
        record.gyroscope_movements_detected = 0;
        record.gyroscope_movement_percentage = 0;
        record.gyroscope_suspicious = false; // CRITICAL: Force false
      } else if (record.gyroscope_movements_detected > record.total_gyroscope_checks) {
        record.gyroscope_movements_detected = record.total_gyroscope_checks;
        record.gyroscope_movement_percentage = 100;
      }

      // Step 8: FINAL SAFETY CHECK - Ensure we have meaningful data to record
      const hasValidClickData = record.total_clicks > 0;
      const hasValidGyroscopeData = record.total_gyroscope_checks > 0;
      const hasGyroscopeError = record.gyroscope_error_reason !== null && 
                               record.gyroscope_error_reason !== "ios_optimization_disabled";

      if (!hasValidClickData && !hasValidGyroscopeData && !hasGyroscopeError) {
        console.log(
          `Shadow Security: Final safety check failed for user ${record.telegram_id} - ` +
          `no valid data to record (clicks: ${record.total_clicks}, gyro_checks: ${record.total_gyroscope_checks}, error: ${record.gyroscope_error_reason})`
        );
        return {
          success: true, // Don't record empty data
        };
      }

      // Pre-insertion logging for debugging
      console.log(
        `Shadow Security: Attempting database insertion for user ${record.telegram_id} - ` +
        `Clicks: ${record.total_clicks} (suspicious: ${record.suspicious_clicks_count}), ` +
        `Gyroscope: checks=${record.total_gyroscope_checks}, movements=${record.gyroscope_movements_detected}, percentage=${record.gyroscope_movement_percentage}%, suspicious=${record.gyroscope_suspicious}`,
      );

      // Insert record into database
      const { error } = await supabaseServer
        .from("suspicious_activity")
        .insert(record);

      if (error) {
        console.error(
          "Error inserting enhanced suspicious activity record:",
          error,
        );

        // Enhanced error handling for division by zero
        if (error.code === "22012" || error.message?.includes("division by zero")) {
          console.error("CRITICAL: Division by zero error detected. Record state:", {
            totalClicks: record.total_clicks,
            suspiciousClicks: record.suspicious_clicks_count,
            totalChecks: record.total_gyroscope_checks,
            movements: record.gyroscope_movements_detected,
            percentage: record.gyroscope_movement_percentage,
            gyroscopeSuspicious: record.gyroscope_suspicious,
            gameMode: record.game_mode,
            telegramId: record.telegram_id,
            sensitivity: record.gyroscope_min_sensitivity,
          });

          // Don't attempt emergency insertion - if our safety checks failed,
          // there's likely a fundamental issue with the database schema
          console.error(
            "Shadow Security: Comprehensive safety checks failed to prevent division by zero. " +
            "This indicates a database schema issue that needs investigation."
          );

          return {
            success: false,
            error: "Database division by zero error - schema investigation required",
          };
        }

        return {
          success: false,
          error: "Failed to record suspicious activity in database",
        };
      }

      // Success logging with enhanced details
      const logDetails = [];
      const gameDuration = normalizedActivityData.gameEndTime - normalizedActivityData.gameStartTime;

      if (gameDuration < 3000) {
        logDetails.push(`ultra-short session (${gameDuration}ms)`);
      }

      if (normalizedActivityData.suspiciousClicksCount > 0) {
        const clickSuspiciousPercentage = this.safePercentage(
          normalizedActivityData.suspiciousClicksCount,
          normalizedActivityData.totalClicks
        );

        logDetails.push(
          `${normalizedActivityData.suspiciousClicksCount}/${normalizedActivityData.totalClicks} suspicious clicks (${clickSuspiciousPercentage}%)`,
        );
      }

      if (normalizedActivityData.gyroscopeEnabled) {
        if (normalizedActivityData.totalGyroscopeChecks === 0) {
          logDetails.push("no gyroscope checks performed (game ended too quickly)");
        } else if (normalizedActivityData.gyroscopeErrorReason) {
          logDetails.push(`gyroscope error: ${normalizedActivityData.gyroscopeErrorReason}`);
        } else {
          logDetails.push(
            `gyroscope: ${normalizedActivityData.gyroscopeMovementsDetected}/${normalizedActivityData.totalGyroscopeChecks} movements (${normalizedActivityData.gyroscopeMovementPercentage.toFixed(1)}%)${normalizedActivityData.gyroscopeSuspicious ? " - SUSPICIOUS" : ""}`,
          );
        }
      }

      console.log(
        `Shadow Security: Enhanced record created for user ${normalizedActivityData.telegramId} in ${normalizedActivityData.gameMode} mode. ` +
        `Details: ${logDetails.join(", ")}. ` +
        `Reaction times: ${normalizedActivityData.minReactionTime}ms - ${normalizedActivityData.maxReactionTime}ms (avg: ${normalizedActivityData.avgReactionTime}ms)`,
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

      // Calculate enhanced statistics with safe division
      const totalRecords = data.length;

      // Click-based statistics with safe division
      const clickSuspiciousRecords = data.filter(
        (record) => record.suspicious_clicks_count > 0,
      );
      const clickSuspiciousGames = clickSuspiciousRecords.length;

      const clickSuspiciousPercentages = clickSuspiciousRecords.map((record) =>
        this.safePercentage(record.suspicious_clicks_count, record.total_clicks)
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

      // Gyroscope-based statistics with safe division
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

      // Overall suspicious percentage with safe calculations
      const overallSuspiciousPercentages = data.map((record) => {
        let combinedSuspiciousness = 0;
        let factorsCount = 0;

        // Click factor
        if (record.total_clicks > 0) {
          combinedSuspiciousness += this.safePercentage(
            record.suspicious_clicks_count,
            record.total_clicks
          );
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

        return factorsCount > 0 ? this.safeDivision(combinedSuspiciousness, factorsCount) : 0;
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

      // Group records by user and calculate enhanced risk metrics with safe division
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

      // Calculate enhanced user risk scores with safe division
      const mostSuspiciousUsers = Array.from(userStatsMap.entries())
        .map(([telegram_id, stats]) => {
          const clickSuspiciousPercentage = this.safePercentage(
            stats.clickSuspicious,
            stats.clickTotal
          );

          const gyroscopeMovementPercentage =
            stats.gyroscopeGames > 0
              ? Math.round(
                  this.safeDivision(stats.gyroscopeMovementSum, stats.gyroscopeGames) * 100,
                ) / 100
              : 100; // Default to 100% for users without gyroscope data

          // Enhanced risk score calculation with safe operations
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

      // Analyze gyroscope error patterns with safe percentage calculation
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
          percentage: this.safePercentage(count, totalRecords),
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

      // Calculate enhanced metrics with safe division
      const totalSuspiciousClicks = data.reduce(
        (sum, record) => sum + record.suspicious_clicks_count,
        0,
      );
      const totalClicks = data.reduce(
        (sum, record) => sum + record.total_clicks,
        0,
      );
      const clickSuspiciousPercentage = this.safePercentage(
        totalSuspiciousClicks,
        totalClicks
      );

      // Gyroscope metrics with safe calculations
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
          ? Math.round(this.safeDivision(totalGyroscopeMovement, gyroscopeEnabledGames) * 100) / 100
          : 100;

      // Enhanced risk assessment
      const hasClickSuspicion =
        clickSuspiciousPercentage >= clickSuspiciousThreshold;
      const hasGyroscopeSuspicion =
        gyroscopeEnabledGames > 0 &&
        gyroscopeAverageMovement <= gyroscopeMovementThreshold;

      // Combined risk score calculation with safe operations
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
      ultraShortSessions: number;
      ultraShortSessionPercentage: number;
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
            ultraShortSessions: 0,
            ultraShortSessionPercentage: 0,
          },
        };
      }

      const totalGames = data.length;
      const gyroscopeEnabledRecords = data.filter(
        (record) => record.gyroscope_enabled,
      );
      const gyroscopeEnabledGames = gyroscopeEnabledRecords.length;
      const gyroscopeEnabledPercentage = this.safePercentage(
        gyroscopeEnabledGames,
        totalGames
      );

      const totalMovementPercentage = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.gyroscope_movement_percentage || 0),
        0,
      );
      const averageMovementPercentage =
        gyroscopeEnabledGames > 0
          ? Math.round(
              this.safeDivision(totalMovementPercentage, gyroscopeEnabledGames) * 100,
            ) / 100
          : 0;

      const suspiciousGyroscopeGames = data.filter(
        (record) => record.gyroscope_suspicious,
      ).length;
      const suspiciousGyroscopePercentage = this.safePercentage(
        suspiciousGyroscopeGames,
        gyroscopeEnabledGames
      );

      // Error analysis with safe percentage calculation
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
          percentage: this.safePercentage(count, totalGames),
        }))
        .sort((a, b) => b.count - a.count);

      // Average checks and sensitivity with safe division
      const totalChecks = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.total_gyroscope_checks || 0),
        0,
      );
      const averageChecksPerGame =
        gyroscopeEnabledGames > 0
          ? Math.round(this.safeDivision(totalChecks, gyroscopeEnabledGames) * 100) / 100
          : 0;

      const totalSensitivity = gyroscopeEnabledRecords.reduce(
        (sum, record) => sum + (record.gyroscope_min_sensitivity || 0),
        0,
      );
      const averageSensitivity =
        gyroscopeEnabledGames > 0
          ? Math.round(this.safeDivision(totalSensitivity, gyroscopeEnabledGames) * 1000) / 1000
          : 0;

      // Ultra-short session analysis
      const ultraShortSessions = data.filter((record) => {
        const startTime = new Date(record.game_start_time).getTime();
        const endTime = new Date(record.game_end_time).getTime();
        const duration = endTime - startTime;

        return duration < 3000; // Less than 3 seconds
      }).length;

      const ultraShortSessionPercentage = this.safePercentage(
        ultraShortSessions,
        totalGames
      );

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
          ultraShortSessions,
          ultraShortSessionPercentage,
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