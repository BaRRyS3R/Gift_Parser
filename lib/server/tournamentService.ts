// src/lib/server/tournamentService.ts - Server-side tournament service

import { supabaseServer } from '@/lib/supabase_server';
import { SurvivalGameResult } from '@/types/game-modes/survival';

// Tournament save response interface
export interface TournamentSaveResponse {
    success: boolean;
    result_id: string;
    total_score: number;
    game_score: number;
    games_played: number;
    previous_total: number;
    error?: string;
}

// Server-side tournament service
export const serverTournamentService = {
    /**
     * Save tournament game result
     */
    async saveTournamentResult(
        telegramId: number,
        tournamentId: string,
        gameResult: SurvivalGameResult
    ): Promise<TournamentSaveResponse> {
        try {
            console.log(`Saving tournament result for user ${telegramId}, tournament ${tournamentId}:`, {
                score: gameResult.score,
                survivalTime: gameResult.survivalTime,
                maxLevelReached: gameResult.maxLevelReached
            });

            // Get user data
            const { data: user, error: userError } = await supabaseServer
                .from('users')
                .select('id, first_name, last_name, username')
                .eq('telegram_id', telegramId)
                .single();

            if (userError || !user) {
                throw new Error('User not found');
            }

            // Verify tournament exists and is active
            const { data: tournament, error: tournamentError } = await supabaseServer
                .from('tournaments')
                .select('id, name, status, start_time, end_time')
                .eq('id', tournamentId)
                .single();

            if (tournamentError || !tournament) {
                throw new Error('Tournament not found');
            }

            if (tournament.status !== 'active') {
                throw new Error('Tournament is not active');
            }

            // Check if tournament is within time bounds
            const now = new Date();
            const startTime = new Date(tournament.start_time);
            const endTime = new Date(tournament.end_time);

            if (now < startTime || now > endTime) {
                throw new Error('Tournament is not currently running');
            }

            // Get existing participant data
            const { data: existingParticipant, error: participantError } = await supabaseServer
                .from('tournament_participants')
                .select('id, total_score, games_played')
                .eq('tournament_id', tournamentId)
                .eq('user_id', user.id)
                .maybeSingle();

            let participantId: string;
            let previousTotal = 0;
            let currentGamesPlayed = 0;

            if (existingParticipant) {
                participantId = existingParticipant.id;
                previousTotal = existingParticipant.total_score || 0;
                currentGamesPlayed = existingParticipant.games_played || 0;
            } else {
                // Create new participant record
                const { data: newParticipant, error: createError } = await supabaseServer
                    .from('tournament_participants')
                    .insert({
                        tournament_id: tournamentId,
                        user_id: user.id,
                        total_score: 0,
                        games_played: 0,
                        best_score: 0,
                        joined_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();

                if (createError || !newParticipant) {
                    throw new Error('Failed to create tournament participant');
                }

                participantId = newParticipant.id;
            }

            // Save individual game result
            const { data: gameResultRecord, error: resultError } = await supabaseServer
                .from('tournament_results')
                .insert({
                    tournament_id: tournamentId,
                    participant_id: participantId,
                    user_id: user.id,
                    score: gameResult.score,
                    survival_time: gameResult.survivalTime,
                    max_level_reached: gameResult.maxLevelReached,
                    perfect_streak: gameResult.perfectStreak,
                    correct_hits: gameResult.correctHits,
                    death_cause: gameResult.deathCause,
                    game_duration: gameResult.duration,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (resultError || !gameResultRecord) {
                throw new Error('Failed to save tournament result');
            }

            // Calculate new totals
            const newTotal = previousTotal + gameResult.score;
            const newGamesPlayed = currentGamesPlayed + 1;

            // Update participant statistics
            const { error: updateError } = await supabaseServer
                .from('tournament_participants')
                .update({
                    total_score: newTotal,
                    games_played: newGamesPlayed,
                    best_score: Math.max(
                        existingParticipant?.total_score || 0,
                        gameResult.score
                    ),
                    last_played_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', participantId);

            if (updateError) {
                console.error('Error updating tournament participant:', updateError);
                throw new Error('Failed to update tournament statistics');
            }

            console.log(`Successfully saved tournament result for user ${telegramId}`);

            return {
                success: true,
                result_id: gameResultRecord.id,
                total_score: newTotal,
                game_score: gameResult.score,
                games_played: newGamesPlayed,
                previous_total: previousTotal,
            };

        } catch (error) {
            console.error('Error saving tournament result:', error);
            return {
                success: false,
                result_id: '',
                total_score: 0,
                game_score: 0,
                games_played: 0,
                previous_total: 0,
                error: error instanceof Error ? error.message : 'Failed to save tournament result'
            };
        }
    },

    /**
     * Validate tournament game result
     */
    validateTournamentResult(gameResult: any): boolean {
        if (!gameResult || typeof gameResult !== 'object') {
            return false;
        }

        // Check required fields for survival game result
        return (
            typeof gameResult.score === 'number' &&
            typeof gameResult.survivalTime === 'number' &&
            typeof gameResult.maxLevelReached === 'number' &&
            typeof gameResult.perfectStreak === 'number' &&
            typeof gameResult.correctHits === 'number' &&
            typeof gameResult.deathCause === 'string' &&
            typeof gameResult.duration === 'number' &&
            gameResult.score >= 0 &&
            gameResult.survivalTime >= 0 &&
            gameResult.maxLevelReached >= 0 &&
            gameResult.perfectStreak >= 0 &&
            gameResult.correctHits >= 0 &&
            gameResult.duration >= 0
        );
    },

    /**
     * Get tournament leaderboard
     */
    async getTournamentLeaderboard(tournamentId: string, limit: number = 100) {
        try {
            const { data, error } = await supabaseServer
                .from('tournament_participants')
                .select(`
                    id,
                    total_score,
                    games_played,
                    best_score,
                    joined_at,
                    last_played_at,
                    users!inner(
                        first_name,
                        last_name,
                        username
                    )
                `)
                .eq('tournament_id', tournamentId)
                .order('total_score', { ascending: false })
                .order('games_played', { ascending: true })
                .limit(limit);

            if (error) {
                throw new Error('Failed to fetch tournament leaderboard');
            }

            return data || [];

        } catch (error) {
            console.error('Error fetching tournament leaderboard:', error);
            throw error;
        }
    },

    /**
     * Get user tournament statistics
     */
    async getUserTournamentStats(tournamentId: string, userId: string) {
        try {
            const { data: participant, error: participantError } = await supabaseServer
                .from('tournament_participants')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('user_id', userId)
                .maybeSingle();

            if (participantError) {
                throw new Error('Failed to fetch tournament participant data');
            }

            if (!participant) {
                return null;
            }

            // Get recent game results
            const { data: results, error: resultsError } = await supabaseServer
                .from('tournament_results')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (resultsError) {
                throw new Error('Failed to fetch tournament results');
            }

            return {
                participant,
                recentResults: results || [],
            };

        } catch (error) {
            console.error('Error fetching user tournament stats:', error);
            throw error;
        }
    },
};