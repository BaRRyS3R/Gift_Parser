// src/lib/server/shadowSecurityService.ts - Complete server service for handling suspicious activity data

import { supabaseServer } from "../supabase_server";
import {
    SuspiciousActivityData,
    SuspiciousActivityRecord,
    SuspiciousActivityStats,
    GetUserSuspiciousActivityResponse,
    GetSuspiciousActivityStatsResponse,
} from "@/types/security/shadowSecurity";

/**
 * Server-side service for managing suspicious activity records
 * Handles database operations for the shadow security system
 */
export class ShadowSecurityService {
    /**
     * Submit suspicious activity data to the database
     * Only creates a record if there are suspicious clicks detected
     * @param activityData - The suspicious activity data to store
     * @returns Promise with success status and error if any
     */
    static async submitSuspiciousActivity(
        activityData: SuspiciousActivityData
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Validate that there are actually suspicious clicks
            if (activityData.suspiciousClicksCount === 0) {
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

            if (activityData.totalClicks <= 0) {
                return {
                    success: false,
                    error: "Total clicks must be greater than zero",
                };
            }

            if (activityData.suspiciousClicksCount > activityData.totalClicks) {
                return {
                    success: false,
                    error: "Suspicious clicks count cannot exceed total clicks",
                };
            }

            // Prepare database record
            const record: Omit<SuspiciousActivityRecord, "id" | "created_at" | "updated_at"> = {
                telegram_id: activityData.telegramId,
                game_mode: activityData.gameMode.toLowerCase(),
                total_clicks: activityData.totalClicks,
                suspicious_clicks_count: activityData.suspiciousClicksCount,
                min_reaction_time: activityData.minReactionTime,
                max_reaction_time: activityData.maxReactionTime,
                avg_reaction_time: activityData.avgReactionTime,
                game_start_time: new Date(activityData.gameStartTime).toISOString(),
                game_end_time: new Date(activityData.gameEndTime).toISOString(),
            };

            // Insert record into database
            const { error } = await supabaseServer
                .from("suspicious_activity")
                .insert(record);

            if (error) {
                console.error("Error inserting suspicious activity record:", error);
                return {
                    success: false,
                    error: "Failed to record suspicious activity in database",
                };
            }

            // Log successful recording for monitoring
            console.log(
                `Shadow Security: Recorded suspicious activity for user ${activityData.telegramId}. ` +
                `${activityData.suspiciousClicksCount}/${activityData.totalClicks} suspicious clicks ` +
                `(${Math.round((activityData.suspiciousClicksCount / activityData.totalClicks) * 100)}%) ` +
                `in ${activityData.gameMode} mode. ` +
                `Reaction times: ${activityData.minReactionTime}ms - ${activityData.maxReactionTime}ms ` +
                `(avg: ${activityData.avgReactionTime}ms)`
            );

            return { success: true };
        } catch (error) {
            console.error("Error in submitSuspiciousActivity:", error);
            return {
                success: false,
                error: "Internal server error while recording suspicious activity",
            };
        }
    }

    /**
     * Retrieve suspicious activity records for a specific user
     * This is intended for administrative use only
     * @param telegramId - The user's Telegram ID
     * @param limit - Maximum number of records to return (default: 50)
     * @returns Promise with user's suspicious activity records
     */
    static async getUserSuspiciousActivity(
        telegramId: number,
        limit: number = 50
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

            // Query suspicious activity records for the user
            const { data, error } = await supabaseServer
                .from("suspicious_activity")
                .select("*")
                .eq("telegram_id", telegramId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching suspicious activity records:", error);
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
            console.error("Error in getUserSuspiciousActivity:", error);
            return {
                success: false,
                error: "Internal server error while fetching suspicious activity records",
            };
        }
    }

    /**
     * Get suspicious activity statistics for administrative analysis
     * @param gameMode - Optional filter by game mode
     * @param fromDate - Optional start date filter
     * @param toDate - Optional end date filter
     * @returns Promise with aggregated statistics
     */
    static async getSuspiciousActivityStats(
        gameMode?: string,
        fromDate?: Date,
        toDate?: Date
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
                console.error("Error fetching suspicious activity stats:", error);
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
                        mostSuspiciousUsers: [],
                    },
                };
            }

            // Calculate total records
            const totalRecords = data.length;

            // Calculate average suspicious percentage across all games
            const suspiciousPercentages = data.map(
                (record) => (record.suspicious_clicks_count / record.total_clicks) * 100
            );
            const averageSuspiciousPercentage = suspiciousPercentages.length > 0
                ? Math.round((suspiciousPercentages.reduce((sum, percentage) => sum + percentage, 0) /
                    suspiciousPercentages.length) * 100) / 100
                : 0;

            // Group records by user and calculate their overall suspicious percentage
            const userStatsMap = new Map<number, { suspicious: number; total: number; games: number }>();

            data.forEach((record) => {
                const userId = record.telegram_id;
                const existing = userStatsMap.get(userId) || { suspicious: 0, total: 0, games: 0 };
                userStatsMap.set(userId, {
                    suspicious: existing.suspicious + record.suspicious_clicks_count,
                    total: existing.total + record.total_clicks,
                    games: existing.games + 1,
                });
            });

            // Calculate most suspicious users (top 10)
            const mostSuspiciousUsers = Array.from(userStatsMap.entries())
                .map(([telegram_id, stats]) => ({
                    telegram_id,
                    suspicious_percentage: Math.round((stats.suspicious / stats.total) * 10000) / 100, // Round to 2 decimal places
                    total_games: stats.games,
                }))
                .filter(user => user.suspicious_percentage > 0) // Only include users with suspicious activity
                .sort((a, b) => b.suspicious_percentage - a.suspicious_percentage)
                .slice(0, 10);

            const statsData: SuspiciousActivityStats = {
                totalRecords,
                averageSuspiciousPercentage,
                mostSuspiciousUsers,
            };

            return {
                success: true,
                data: statsData,
            };
        } catch (error) {
            console.error("Error in getSuspiciousActivityStats:", error);
            return {
                success: false,
                error: "Internal server error while calculating suspicious activity statistics",
            };
        }
    }

    /**
     * Get suspicious activity records with user information for enhanced analysis
     * This method joins suspicious activity data with user information
     * @param limit - Maximum number of records to return (default: 100)
     * @param gameMode - Optional filter by game mode
     * @returns Promise with enhanced suspicious activity records
     */
    static async getSuspiciousActivityWithUserInfo(
        limit: number = 100,
        gameMode?: string
    ): Promise<{
        success: boolean;
        data?: Array<SuspiciousActivityRecord & {
            first_name?: string;
            last_name?: string;
            username?: string;
            is_premium?: boolean;
            trust_score?: number;
            suspicious_percentage: number;
            game_duration_seconds: number;
        }>;
        error?: string;
    }> {
        try {
            // Validate limit
            if (limit <= 0 || limit > 1000) {
                return {
                    success: false,
                    error: "Limit must be between 1 and 1000",
                };
            }

            // Use the analysis view that joins with user data
            let query = supabaseServer
                .from("suspicious_activity_analysis")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);

            if (gameMode) {
                const normalizedGameMode = gameMode.toLowerCase().trim();
                if (normalizedGameMode) {
                    query = query.eq("game_mode", normalizedGameMode);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching suspicious activity with user info:", error);
                return {
                    success: false,
                    error: "Failed to fetch enhanced suspicious activity records",
                };
            }

            return {
                success: true,
                data: data || [],
            };
        } catch (error) {
            console.error("Error in getSuspiciousActivityWithUserInfo:", error);
            return {
                success: false,
                error: "Internal server error while fetching enhanced suspicious activity records",
            };
        }
    }

    /**
     * Check if a user has recent suspicious activity
     * @param telegramId - The user's Telegram ID
     * @param hoursBack - How many hours back to check (default: 24)
     * @param suspiciousThreshold - Minimum percentage to consider suspicious (default: 30)
     * @returns Promise with boolean indicating if user has recent suspicious activity
     */
    static async hasRecentSuspiciousActivity(
        telegramId: number,
        hoursBack: number = 24,
        suspiciousThreshold: number = 30
    ): Promise<{
        success: boolean;
        hasSuspiciousActivity?: boolean;
        recentGames?: number;
        averageSuspiciousPercentage?: number;
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

            if (hoursBack <= 0 || hoursBack > 168) { // Max 1 week
                return {
                    success: false,
                    error: "Hours back must be between 1 and 168 (1 week)",
                };
            }

            if (suspiciousThreshold < 0 || suspiciousThreshold > 100) {
                return {
                    success: false,
                    error: "Suspicious threshold must be between 0 and 100",
                };
            }

            // Calculate cutoff time
            const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));

            // Query recent suspicious activity for the user
            const { data, error } = await supabaseServer
                .from("suspicious_activity")
                .select("*")
                .eq("telegram_id", telegramId)
                .gte("created_at", cutoffTime.toISOString());

            if (error) {
                console.error("Error checking recent suspicious activity:", error);
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
                    averageSuspiciousPercentage: 0,
                };
            }

            // Calculate average suspicious percentage for recent games
            const totalSuspicious = data.reduce((sum, record) => sum + record.suspicious_clicks_count, 0);
            const totalClicks = data.reduce((sum, record) => sum + record.total_clicks, 0);
            const averageSuspiciousPercentage = totalClicks > 0
                ? Math.round((totalSuspicious / totalClicks) * 10000) / 100
                : 0;

            const hasSuspiciousActivity = averageSuspiciousPercentage >= suspiciousThreshold;

            return {
                success: true,
                hasSuspiciousActivity,
                recentGames: data.length,
                averageSuspiciousPercentage,
            };
        } catch (error) {
            console.error("Error in hasRecentSuspiciousActivity:", error);
            return {
                success: false,
                error: "Internal server error while checking recent suspicious activity",
            };
        }
    }

    /**
     * Delete old suspicious activity records
     * This method is intended for data maintenance and cleanup
     * @param daysOld - Delete records older than this many days (minimum: 30 days)
     * @returns Promise with deletion results
     */
    static async cleanupOldRecords(
        daysOld: number = 90
    ): Promise<{
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
            const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

            // Delete old records
            const { data, error } = await supabaseServer
                .from("suspicious_activity")
                .delete()
                .lt("created_at", cutoffDate.toISOString())
                .select("id");

            if (error) {
                console.error("Error cleaning up old suspicious activity records:", error);
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