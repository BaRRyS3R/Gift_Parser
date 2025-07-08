// src/lib/leagueService.ts - Updated service with notification support

import { supabase } from "./supabase";
import type { User, League, PlayerReward } from "./supabase";
import type { ReactionGameResult, SurvivalGameResult, PhysicsGameResult, RotationGameResult } from "@/types/game-modes";
import { GameMode } from "@/types/game-modes";
import {
    calculatePlayerLevel,
    calculateLeague,
    shouldUpdateUserStats,
    getUnclaimedRewards,
    LEVEL_CONSTANTS
} from "@/utils/leagueSystem";

export interface LeagueStats {
    calculatedLevel: number;
    calculatedLeague: League;
    unclaimedRewards: PlayerReward[];
    levelChanged: boolean;
    leagueChanged: boolean;
}

export interface LeagueUpdateResult {
    success: boolean;
    newLevel?: number;
    newLeague?: League;
    levelChanged: boolean;
    leagueChanged: boolean;
    previousLevel?: number;
    previousLeague?: League;
    hasNewRewards: boolean;
    error?: string;
}

export interface NotificationData {
    type: "level_up" | "league_promotion" | "reward_available";
    level?: number;
    league?: League;
    previousLeague?: League;
    rewardName?: string;
}

/**
 * Service for managing player league and level progression system
 */
export const leagueService = {
    /**
     * Updates user league and level statistics after game completion
     * Now includes notification data generation for UI components
     */
    async updateLeagueStats(
        user: User,
        gameResult: ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult
    ): Promise<LeagueUpdateResult> {
        try {
            // Calculate qualifying games increment (all modes except reaction)
            let qualifyingGamesIncrement = 0;
            if (gameResult.mode !== GameMode.REACTION) {
                qualifyingGamesIncrement = 1;
            }

            // Create updated user object for calculations
            const updatedUser = {
                ...user,
                total_qualifying_games: (user.total_qualifying_games || 0) + qualifyingGamesIncrement,
                // Update mode-specific game counts for accurate calculations
                survival_games: gameResult.mode === GameMode.SURVIVAL ? user.survival_games + 1 : user.survival_games,
                physics_games: gameResult.mode === GameMode.PHYSICS ? user.physics_games + 1 : user.physics_games,
                rotation_games: gameResult.mode === GameMode.ROTATION ? user.rotation_games + 1 : user.rotation_games,
            };

            // Calculate new level and league based on updated stats
            const statsCheck = shouldUpdateUserStats(updatedUser);

            // Prepare update object
            const updates: Partial<User> = {
                total_qualifying_games: updatedUser.total_qualifying_games,
            };

            // Apply level and league updates if changes detected
            if (statsCheck.levelChanged || statsCheck.leagueChanged) {
                updates.player_level = statsCheck.newLevel;
                updates.league = statsCheck.newLeague;
                updates.updated_at = new Date().toISOString();

                console.log(`League system update: Level ${statsCheck.previousLevel} → ${statsCheck.newLevel}, League ${statsCheck.previousLeague} → ${statsCheck.newLeague}`);
            }

            // Execute database update
            const { error } = await supabase
                .from("users")
                .update(updates)
                .eq("telegram_id", user.telegram_id);

            if (error) {
                console.error("Error updating league stats:", error);
                return {
                    success: false,
                    levelChanged: false,
                    leagueChanged: false,
                    hasNewRewards: false,
                    error: error.message,
                };
            }

            return {
                success: true,
                newLevel: statsCheck.newLevel,
                newLeague: statsCheck.newLeague,
                levelChanged: statsCheck.levelChanged,
                leagueChanged: statsCheck.leagueChanged,
                previousLevel: statsCheck.previousLevel,
                previousLeague: statsCheck.previousLeague,
                hasNewRewards: statsCheck.hasNewRewards,
            };

        } catch (error) {
            console.error("Error in updateLeagueStats:", error);
            return {
                success: false,
                levelChanged: false,
                leagueChanged: false,
                hasNewRewards: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },

    /**
     * Generate notification data based on league update results
     */
    generateNotifications(updateResult: LeagueUpdateResult): NotificationData[] {
        const notifications: NotificationData[] = [];

        // Level up notification
        if (updateResult.levelChanged && updateResult.newLevel) {
            notifications.push({
                type: "level_up",
                level: updateResult.newLevel,
            });
        }

        // League promotion notification
        if (updateResult.leagueChanged && updateResult.newLeague && updateResult.previousLeague) {
            notifications.push({
                type: "league_promotion",
                league: updateResult.newLeague,
                previousLeague: updateResult.previousLeague,
            });
        }

        // Reward available notification
        if (updateResult.hasNewRewards && updateResult.newLevel) {
            // Check if the new level is a reward level (multiple of 20)
            if (updateResult.newLevel % LEVEL_CONSTANTS.REWARD_INTERVAL === 0) {
                const rewardNumber = updateResult.newLevel / LEVEL_CONSTANTS.REWARD_INTERVAL;
                notifications.push({
                    type: "reward_available",
                    level: updateResult.newLevel,
                    rewardName: `Test Gift ${rewardNumber}`,
                });
            }
        }

        return notifications;
    },

    /**
     * Claims a reward for the user
     * Validates reward availability and updates user's claimed rewards list
     */
    async claimReward(telegramId: number, rewardId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Fetch current user data
            const { data: user, error: fetchError } = await supabase
                .from("users")
                .select("*")
                .eq("telegram_id", telegramId)
                .single();

            if (fetchError || !user) {
                return { success: false, error: "User not found" };
            }

            // Validate reward eligibility using updated logic
            const unclaimedRewards = getUnclaimedRewards(user);
            const rewardToClaim = unclaimedRewards.find(r => r.id === rewardId);

            if (!rewardToClaim) {
                return { success: false, error: "Reward not available for claiming" };
            }

            // Update claimed rewards list
            const updatedRewardsClaimed = [...(user.rewards_claimed || []), rewardId];

            const { error: updateError } = await supabase
                .from("users")
                .update({
                    rewards_claimed: updatedRewardsClaimed,
                    updated_at: new Date().toISOString(),
                })
                .eq("telegram_id", telegramId);

            if (updateError) {
                console.error("Error claiming reward:", updateError);
                return { success: false, error: updateError.message };
            }

            console.log(`Reward claimed successfully: ${rewardId} for user ${telegramId}`);
            return { success: true };

        } catch (error) {
            console.error("Error in claimReward:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    /**
     * Retrieves user statistics enhanced with league and level information
     * Provides calculated values alongside stored database values
     */
    async getUserWithLeagueStats(telegramId: number): Promise<(User & LeagueStats) | null> {
        try {
            const { data: user, error } = await supabase
                .from("users")
                .select("*")
                .eq("telegram_id", telegramId)
                .single();

            if (error || !user) {
                console.error("Error fetching user with league stats:", error);
                return null;
            }

            // Calculate current league and level statistics
            const calculatedLevel = calculatePlayerLevel(user);
            const calculatedLeague = calculateLeague(user);
            const unclaimedRewards = getUnclaimedRewards(user);

            // Determine if recalculation indicates changes
            const statsCheck = shouldUpdateUserStats(user);

            return {
                ...user,
                calculatedLevel,
                calculatedLeague,
                unclaimedRewards,
                levelChanged: statsCheck.levelChanged,
                leagueChanged: statsCheck.leagueChanged,
            };

        } catch (error) {
            console.error("Error in getUserWithLeagueStats:", error);
            return null;
        }
    },

    /**
     * Initializes league and level system for existing users
     * Migrates users who were created before the league system implementation
     */
    async initializeLeagueSystem(telegramId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user, error: fetchError } = await supabase
                .from("users")
                .select("*")
                .eq("telegram_id", telegramId)
                .single();

            if (fetchError || !user) {
                return { success: false, error: "User not found" };
            }

            // Calculate initial league and level values
            const calculatedLevel = calculatePlayerLevel(user);
            const calculatedLeague = calculateLeague(user);
            const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;

            const updates = {
                player_level: calculatedLevel,
                league: calculatedLeague,
                total_qualifying_games: qualifyingGames,
                rewards_claimed: user.rewards_claimed || [],
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from("users")
                .update(updates)
                .eq("telegram_id", telegramId);

            if (updateError) {
                console.error("Error initializing league system:", updateError);
                return { success: false, error: updateError.message };
            }

            console.log(`League system initialized for user ${telegramId}: Level ${calculatedLevel}, League ${calculatedLeague}`);
            return { success: true };

        } catch (error) {
            console.error("Error in initializeLeagueSystem:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },

    /**
     * Retrieves leaderboard for a specific league
     * Returns players sorted by level and qualifying games within the league
     */
    async getLeagueLeaderboard(league: League, limit: number = 50): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("league", league)
                .gt("total_qualifying_games", 0)
                .order("player_level", { ascending: false })
                .order("total_qualifying_games", { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching league leaderboard:", error);
                throw error;
            }

            return data || [];

        } catch (error) {
            console.error("Error in getLeagueLeaderboard:", error);
            throw error;
        }
    },

    /**
     * Retrieves comprehensive league statistics for the application
     * Provides distribution of players across leagues and levels
     */
    async getLeagueStatistics(): Promise<{
        totalPlayers: number;
        leagueDistribution: Record<League, number>;
        averageLevel: number;
        maxLevel: number;
    }> {
        try {
            const { data: users, error } = await supabase
                .from("users")
                .select("league, player_level")
                .gt("total_qualifying_games", 0);

            if (error) {
                console.error("Error fetching league statistics:", error);
                throw error;
            }

            const totalPlayers = users?.length || 0;
            const leagueDistribution: Record<League, number> = {
                Bronze: 0,
                Silver: 0,
                Gold: 0,
                Diamond: 0,
            };

            let totalLevels = 0;
            let maxLevel = 0;

            users?.forEach(user => {
                if (user.league) {
                    leagueDistribution[user.league as League]++;
                }
                if (user.player_level) {
                    totalLevels += user.player_level;
                    maxLevel = Math.max(maxLevel, user.player_level);
                }
            });

            const averageLevel = totalPlayers > 0 ? Math.round(totalLevels / totalPlayers) : 0;

            return {
                totalPlayers,
                leagueDistribution,
                averageLevel,
                maxLevel,
            };

        } catch (error) {
            console.error("Error in getLeagueStatistics:", error);
            throw error;
        }
    },

    /**
     * Validates and repairs league system data inconsistencies
     * Utility method for maintaining data integrity
     */
    async validateAndRepairLeagueData(telegramId?: number): Promise<{
        repaired: number;
        errors: number;
        details: string[]
    }> {
        try {
            let query = supabase.from("users").select("*");

            if (telegramId) {
                query = query.eq("telegram_id", telegramId);
            }

            const { data: users, error } = await query;

            if (error) {
                throw error;
            }

            let repaired = 0;
            let errors = 0;
            const details: string[] = [];

            for (const user of users || []) {
                try {
                    const calculatedLevel = calculatePlayerLevel(user);
                    const calculatedLeague = calculateLeague(user);
                    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;

                    const needsUpdate =
                        user.player_level !== calculatedLevel ||
                        user.league !== calculatedLeague ||
                        user.total_qualifying_games !== qualifyingGames;

                    if (needsUpdate) {
                        const { error: updateError } = await supabase
                            .from("users")
                            .update({
                                player_level: calculatedLevel,
                                league: calculatedLeague,
                                total_qualifying_games: qualifyingGames,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("telegram_id", user.telegram_id);

                        if (updateError) {
                            errors++;
                            details.push(`Error updating user ${user.telegram_id}: ${updateError.message}`);
                        } else {
                            repaired++;
                            details.push(`Repaired user ${user.telegram_id}: Level ${user.player_level} → ${calculatedLevel}, League ${user.league} → ${calculatedLeague}`);
                        }
                    }
                } catch (userError) {
                    errors++;
                    details.push(`Error processing user ${user.telegram_id}: ${userError instanceof Error ? userError.message : "Unknown error"}`);
                }
            }

            return { repaired, errors, details };

        } catch (error) {
            console.error("Error in validateAndRepairLeagueData:", error);
            return {
                repaired: 0,
                errors: 1,
                details: [`System error: ${error instanceof Error ? error.message : "Unknown error"}`]
            };
        }
    },
};