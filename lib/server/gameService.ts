// src/lib/server/gameService.ts - Updated game service with consolidated type imports

import { supabaseServer } from '@/lib/supabase_server';
import { serverLeagueService, type LeagueCheckResult } from '@/lib/server/leagueService';
import type { League, LeagueRewardResult } from '@/types/league-definitions';
import { GameMode } from '@/types/game-modes/common';
import type { ReactionGameResult } from '@/types/game-modes/reaction';
import type { SurvivalGameResult } from '@/types/game-modes/survival';
import type { PhysicsGameResult } from '@/types/game-modes/physics';
import type { RotationGameResult } from '@/types/game-modes/rotation';

// Unified game result type encompassing all supported game modes
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

// Comprehensive game save result interface with league progression data
export interface GameSaveResult {
    success: boolean;
    leagueChanged?: boolean;
    newLeague?: League;
    levelChanged?: boolean;
    newLevel?: number;
    reward?: LeagueRewardResult;
    missedRewards?: LeagueRewardResult[];
    error?: string;
}

// Tournament game save response interface for competitive play
export interface TournamentSaveResponse {
    result_id: string;
    total_score: number;
    game_score: number;
    games_played: number;
    previous_total: number;
}

// Centralized server-side game processing service
export const serverGameService = {
    /**
     * Comprehensive user statistics update with integrated league progression logic
     */
    async updateGameStats(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
        // Retrieve current user data for statistics calculation
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User account not found for statistics update');
        }

        const previousTotalGames = user.total_games;

        // Strategic exclusion of reaction mode from competitive game counting
        const isCompetitiveMode = gameResult.mode !== GameMode.REACTION;
        const newTotalGames = isCompetitiveMode ? previousTotalGames + 1 : previousTotalGames;

        const previousLevel = user.current_level;
        const newLevel = serverLeagueService.calculateLevel(newTotalGames);

        // Core statistics updates applicable to all game modes
        const updates: any = {
            total_games: newTotalGames,
            total_score: user.total_score + gameResult.score,
            best_score: Math.max(user.best_score, gameResult.score),
            current_level: newLevel,
            last_played_at: new Date().toISOString(),
        };

        // Mode-specific statistical enhancements
        if (gameResult.mode === GameMode.REACTION) {
            const reactionResult = gameResult as ReactionGameResult;
            updates.reaction_games = user.reaction_games + 1;
            updates.reaction_best_score = Math.max(user.reaction_best_score || 0, reactionResult.score);

            // Advanced reaction time tracking for successful attempts
            if (!reactionResult.missed && reactionResult.reactionTime > 0) {
                updates.reaction_best_time = user.reaction_best_time > 0
                    ? Math.min(user.reaction_best_time, reactionResult.reactionTime)
                    : reactionResult.reactionTime;

                // Rolling average calculation for reaction time performance
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

            // Optimistic mistake tracking with initial value handling
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

        // Execute comprehensive statistics update
        const { error: updateError } = await supabaseServer
            .from('users')
            .update(updates)
            .eq('telegram_id', telegramId);

        if (updateError) {
            console.error('Critical error updating user statistics:', updateError);
            throw new Error('Failed to update user game statistics');
        }

        // League progression assessment for competitive modes only
        try {
            if (isCompetitiveMode) {
                const leagueResult: LeagueCheckResult = await serverLeagueService.checkAndUpdateLeague(user.id, newTotalGames);

                return {
                    success: true,
                    leagueChanged: leagueResult.leagueChanged,
                    newLeague: leagueResult.newLeague,
                    levelChanged: newLevel !== previousLevel,
                    newLevel: newLevel !== previousLevel ? newLevel : undefined,
                    reward: leagueResult.reward,
                    missedRewards: leagueResult.missedRewards
                };
            } else {
                // Simplified response for non-competitive modes
                return {
                    success: true,
                    leagueChanged: false,
                    levelChanged: false
                };
            }
        } catch (leagueError) {
            console.error('League progression assessment failed:', leagueError);
            return {
                success: true,
                leagueChanged: false,
                levelChanged: newLevel !== previousLevel,
                newLevel: newLevel !== previousLevel ? newLevel : undefined,
                error: 'League progression assessment encountered an error'
            };
        }
    },

    /**
     * Standard game result processing for regular gameplay sessions
     */
    async saveGameResult(telegramId: number, gameResult: GameResult): Promise<GameSaveResult> {
        console.log('Processing standard game result:', {
            mode: gameResult.mode,
            score: gameResult.score,
            duration: gameResult.duration
        });

        return await this.updateGameStats(telegramId, gameResult);
    },

    /**
     * Tournament-specific result processing with competitive point accumulation
     */
    async saveTournamentResult(
        tournamentId: string,
        telegramId: number,
        gameResult: SurvivalGameResult
    ): Promise<TournamentSaveResponse> {
        console.log('Processing tournament game result:', {
            tournamentId,
            telegramId,
            score: gameResult.score,
            survivalTime: gameResult.survivalTime
        });

        // Validate user account existence
        const { data: user, error: userError } = await supabaseServer
            .from('users')
            .select('id')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !user) {
            throw new Error('User account not found for tournament result processing');
        }

        // Execute specialized tournament result accumulation procedure
        const { data, error } = await supabaseServer.rpc('save_tournament_result_accumulative', {
            tournament_id_param: tournamentId,
            user_id_param: user.id,
            telegram_id_param: telegramId,
            survival_time_param: gameResult.survivalTime,
            survival_score_param: gameResult.score,
            max_level_reached_param: gameResult.maxLevelReached,
            perfect_streak_param: gameResult.perfectStreak,
            correct_hits_param: gameResult.correctHits,
            death_cause_param: gameResult.deathCause
        });

        if (error) {
            console.error('Tournament result processing failed:', error);
            throw new Error('Failed to save tournament game result');
        }

        // Parse and validate tournament save response
        const saveResponse: TournamentSaveResponse = typeof data === 'string' ? JSON.parse(data) : data;

        console.log(`Tournament points successfully accumulated: +${saveResponse.game_score} (Total: ${saveResponse.total_score})`);

        return saveResponse;
    },
};