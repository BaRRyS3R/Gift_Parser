// src/lib/server/gameService.ts - Server-side game saving service

import { supabaseServer } from '@/lib/supabase_server';
import leagueService, { type LeagueRewardResult, type League } from '@/lib/league_service';
import { GameMode } from '@/types/game-modes/common';
import { ReactionGameResult } from '@/types/game-modes/reaction';
import { SurvivalGameResult } from '@/types/game-modes/survival';
import { PhysicsGameResult } from '@/types/game-modes/physics';
import { RotationGameResult } from '@/types/game-modes/rotation';

// Game result union type
export type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

// Game save response interface
export interface GameSaveResponse {
    success: boolean;
    leagueChanged?: boolean;
    newLeague?: League;
    levelChanged?: boolean;
    newLevel?: number;
    reward?: LeagueRewardResult;
    missedRewards?: LeagueRewardResult[];
    error?: string;
}

// Server-side game service
export const serverGameService = {
    /**
     * Save game result and update user statistics
     */
    async saveGameResult(telegramId: number, gameResult: GameResult): Promise<GameSaveResponse> {
        try {
            console.log(`Saving game result for user ${telegramId}:`, {
                mode: gameResult.mode,
                score: gameResult.score,
                duration: gameResult.duration
            });

            // Get user data
            const { data: user, error: userError } = await supabaseServer
                .from('users')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();

            if (userError || !user) {
                throw new Error('User not found');
            }

            const previousTotalGames = user.total_games;

            // CRITICAL: Exclude reaction mode from total_games counting for competitive scoring
            const isCompetitiveMode = gameResult.mode !== GameMode.REACTION;
            const newTotalGames = isCompetitiveMode ? previousTotalGames + 1 : previousTotalGames;

            const previousLevel = user.current_level;
            const newLevel = leagueService.calculateLevel(newTotalGames);

            // Prepare base updates
            const updates: any = {
                total_games: newTotalGames,
                total_score: user.total_score + gameResult.score,
                best_score: Math.max(user.best_score, gameResult.score),
                current_level: newLevel,
                last_played_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Mode-specific statistics updates
            if (gameResult.mode === GameMode.REACTION) {
                const reactionResult = gameResult as ReactionGameResult;
                updates.reaction_games = user.reaction_games + 1;
                updates.reaction_best_score = Math.max(user.reaction_best_score || 0, reactionResult.score);

                if (!reactionResult.missed && reactionResult.reactionTime > 0) {
                    updates.reaction_best_time = user.reaction_best_time > 0
                        ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
                        : reactionResult.reactionTime;

                    const totalReactionGames = user.reaction_games;
                    const currentAverage = user.reaction_average_time || 0;
                    const newAverage = totalReactionGames > 0
                        ? (currentAverage * totalReactionGames + reactionResult.reactionTime) / (totalReactionGames + 1)
                        : reactionResult.reactionTime;

                    updates.reaction_average_time = Math.round(newAverage);
                }
            } else if (gameResult.mode === GameMode.SURVIVAL) {
                const survivalResult = gameResult as SurvivalGameResult;
                updates.survival_games = user.survival_games + 1;
                updates.survival_best_score = Math.max(user.survival_best_score || 0, survivalResult.score);
                updates.survival_best_time = Math.max(user.survival_best_time || 0, survivalResult.survivalTime);
                updates.survival_max_level = Math.max(user.survival_max_level || 0, survivalResult.maxLevelReached);
                updates.survival_best_streak = Math.max(user.survival_best_streak || 0, survivalResult.perfectStreak);
            } else if (gameResult.mode === GameMode.PHYSICS) {
                const physicsResult = gameResult as PhysicsGameResult;
                updates.physics_games = user.physics_games + 1;
                updates.physics_best_score = Math.max(user.physics_best_score || 0, physicsResult.score);
                updates.physics_best_time = Math.max(user.physics_best_time || 0, Math.round(physicsResult.gameTime));
                updates.physics_total_hits = (user.physics_total_hits || 0) + physicsResult.totalHits;
                updates.physics_best_hits = Math.max(user.physics_best_hits || 0, physicsResult.totalHits);

                if (user.physics_least_mistakes === undefined || user.physics_least_mistakes === null) {
                    updates.physics_least_mistakes = physicsResult.mistakesMade;
                } else {
                    updates.physics_least_mistakes = Math.min(user.physics_least_mistakes, physicsResult.mistakesMade);
                }
            } else if (gameResult.mode === GameMode.ROTATION) {
                const rotationResult = gameResult as RotationGameResult;
                updates.rotation_games = user.rotation_games + 1;
                updates.rotation_best_score = Math.max(user.rotation_best_score || 0, rotationResult.score);
                updates.rotation_best_time = Math.max(user.rotation_best_time || 0, rotationResult.survivalTime);
                updates.rotation_max_level = Math.max(user.rotation_max_level || 0, rotationResult.maxLevelReached);
                updates.rotation_best_streak = Math.max(user.rotation_best_streak || 0, rotationResult.perfectStreak);
                updates.rotation_total_hits = (user.rotation_total_hits || 0) + rotationResult.correctHits;
            }

            // Update user statistics
            const { error: updateError } = await supabaseServer
                .from('users')
                .update(updates)
                .eq('telegram_id', telegramId);

            if (updateError) {
                console.error('Error updating user statistics:', updateError);
                throw new Error('Failed to update user statistics');
            }

            console.log(`Successfully updated statistics for user ${telegramId}`);

            // League checking only for competitive modes
            if (isCompetitiveMode) {
                try {
                    const leagueResult = await leagueService.checkAndUpdateLeague(user.id, newTotalGames);

                    return {
                        success: true,
                        leagueChanged: leagueResult.leagueChanged,
                        newLeague: leagueResult.newLeague,
                        levelChanged: newLevel !== previousLevel,
                        newLevel: newLevel !== previousLevel ? newLevel : undefined,
                        reward: leagueResult.reward,
                        missedRewards: leagueResult.missedRewards
                    };
                } catch (leagueError) {
                    console.error('Error checking league after game:', leagueError);
                    return {
                        success: true,
                        leagueChanged: false,
                        levelChanged: newLevel !== previousLevel,
                        newLevel: newLevel !== previousLevel ? newLevel : undefined,
                        error: 'League check failed'
                    };
                }
            } else {
                // For reaction mode, return result without league checking
                return {
                    success: true,
                    leagueChanged: false,
                    levelChanged: false
                };
            }

        } catch (error) {
            console.error('Error saving game result:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save game result'
            };
        }
    },

    /**
     * Validate game result data
     */
    validateGameResult(gameResult: any): boolean {
        if (!gameResult || typeof gameResult !== 'object') {
            return false;
        }

        // Check required fields
        if (!gameResult.mode || !gameResult.hasOwnProperty('score') || !gameResult.hasOwnProperty('duration')) {
            return false;
        }

        // Validate mode
        const validModes = [GameMode.REACTION, GameMode.SURVIVAL, GameMode.PHYSICS, GameMode.ROTATION];
        if (!validModes.includes(gameResult.mode)) {
            return false;
        }

        // Validate score and duration
        if (typeof gameResult.score !== 'number' || gameResult.score < 0) {
            return false;
        }

        if (typeof gameResult.duration !== 'number' || gameResult.duration < 0) {
            return false;
        }

        // Mode-specific validation
        switch (gameResult.mode) {
            case GameMode.REACTION:
                return this.validateReactionResult(gameResult);
            case GameMode.SURVIVAL:
                return this.validateSurvivalResult(gameResult);
            case GameMode.PHYSICS:
                return this.validatePhysicsResult(gameResult);
            case GameMode.ROTATION:
                return this.validateRotationResult(gameResult);
            default:
                return false;
        }
    },

    /**
     * Validate reaction game result
     */
    validateReactionResult(result: any): boolean {
        return (
            typeof result.reactionTime === 'number' &&
            typeof result.missed === 'boolean' &&
            typeof result.rating === 'string'
        );
    },

    /**
     * Validate survival game result
     */
    validateSurvivalResult(result: any): boolean {
        return (
            typeof result.survivalTime === 'number' &&
            typeof result.maxLevelReached === 'number' &&
            typeof result.perfectStreak === 'number' &&
            typeof result.correctHits === 'number' &&
            typeof result.deathCause === 'string'
        );
    },

    /**
     * Validate physics game result
     */
    validatePhysicsResult(result: any): boolean {
        return (
            typeof result.gameTime === 'number' &&
            typeof result.totalHits === 'number' &&
            typeof result.mistakesMade === 'number' &&
            typeof result.finalScore === 'number' &&
            typeof result.survivalTime === 'number' &&
            typeof result.deathCause === 'string'
        );
    },

    /**
     * Validate rotation game result
     */
    validateRotationResult(result: any): boolean {
        return (
            typeof result.survivalTime === 'number' &&
            typeof result.maxLevelReached === 'number' &&
            typeof result.perfectStreak === 'number' &&
            typeof result.correctHits === 'number' &&
            typeof result.deathCause === 'string'
        );
    },
};