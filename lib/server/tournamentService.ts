// src/lib/server/tournamentService.ts - Tournament management service

import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Tournament interfaces
export interface Tournament {
    id: string;
    name: string;
    description?: string;
    game_mode: 'survival' | 'physics' | 'rotation';
    start_time: string;
    end_time: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    prizes: TournamentPrize[];
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface TournamentPrize {
    place: number | string; // Can be "4-10" for range
    prize: string;
}

export interface TournamentLeaderboardEntry {
    id: string;
    tournament_id: string;
    user_id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_score: number;
    total_games: number;
    best_time?: number;
    best_hits?: number;
    best_streak?: number;
    max_level?: number;
    least_mistakes?: number;
    first_participation_at?: string;
    last_participation_at?: string;
    rank?: number;
    created_at: string;
    updated_at: string;
}

export interface TournamentParticipationResult {
    success: boolean;
    tournamentId: string;
    previousBestScore: number;
    newBestScore: number;
    rankImproved: boolean;
    newRank?: number;
    error?: string;
}

/**
 * Server-side tournament service for managing tournament operations
 */
export const serverTournamentService = {
    /**
     * Get currently active tournament
     */
    async getActiveTournament(): Promise<Tournament | null> {
        try {
            const { data, error } = await supabaseServer
                .rpc('get_active_tournament');

            if (error) {
                console.error('Error getting active tournament:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getActiveTournament:', error);
            return null;
        }
    },

    /**
     * Get tournament by ID
     */
    async getTournamentById(tournamentId: string): Promise<Tournament | null> {
        try {
            const { data, error } = await supabaseServer
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (error) {
                console.error('Error getting tournament by ID:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getTournamentById:', error);
            return null;
        }
    },

    /**
     * Get all tournaments with optional filtering
     */
    async getTournaments(
        status?: Tournament['status'],
        limit: number = 10,
        offset: number = 0
    ): Promise<Tournament[]> {
        try {
            let query = supabaseServer
                .from('tournaments')
                .select('*')
                .order('start_time', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error getting tournaments:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getTournaments:', error);
            return [];
        }
    },

    /**
     * Get tournament leaderboard with rankings
     */
    async getTournamentLeaderboard(
        tournamentId: string,
        limit: number = 100
    ): Promise<TournamentLeaderboardEntry[]> {
        try {
            const { data, error } = await supabaseServer
                .from('tournament_leaderboard_ranked')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('rank', { ascending: true })
                .limit(limit);

            if (error) {
                console.error('Error getting tournament leaderboard:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getTournamentLeaderboard:', error);
            return [];
        }
    },

    /**
     * Get user's position in tournament leaderboard
     */
    async getUserTournamentRank(
        tournamentId: string,
        telegramId: number
    ): Promise<{ rank: number; entry: TournamentLeaderboardEntry } | null> {
        try {
            const { data, error } = await supabaseServer
                .from('tournament_leaderboard_ranked')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('telegram_id', telegramId)
                .single();

            if (error || !data) {
                return null;
            }

            return {
                rank: data.rank,
                entry: data
            };
        } catch (error) {
            console.error('Error in getUserTournamentRank:', error);
            return null;
        }
    },

    /**
     * Record tournament participation when user plays during active tournament
     */
    async recordTournamentParticipation(
        telegramId: number,
        gameMode: GameMode,
        gameResult: any
    ): Promise<TournamentParticipationResult | null> {
        try {
            // Get active tournament
            const activeTournament = await this.getActiveTournament();

            if (!activeTournament) {
                return null; // No active tournament
            }

            // Check if tournament mode matches game mode
            const tournamentMode = activeTournament.game_mode;
            let matchesMode = false;

            switch (gameMode) {
                case GameMode.SURVIVAL:
                    matchesMode = tournamentMode === 'survival';
                    break;
                case GameMode.PHYSICS:
                    matchesMode = tournamentMode === 'physics';
                    break;
                case GameMode.ROTATION:
                    matchesMode = tournamentMode === 'rotation';
                    break;
                default:
                    return null; // Mode not supported in tournaments
            }

            if (!matchesMode) {
                return null; // Game mode doesn't match tournament
            }

            // Get user data
            const { data: user, error: userError } = await supabaseServer
                .from('users')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();

            if (userError || !user) {
                throw new Error('User not found');
            }

            // Calculate new scores based on game mode
            const currentTime = new Date().toISOString();
            let updateData: any = {
                tournament_id: activeTournament.id,
                user_id: user.id,
                telegram_id: telegramId,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                is_premium: user.is_premium,
                last_participation_at: currentTime,
                updated_at: currentTime
            };

            // Mode-specific score calculation
            switch (tournamentMode) {
                case 'survival':
                    updateData.best_score = gameResult.score * 2; // Same multiplier as in gameService
                    updateData.best_time = gameResult.survivalTime;
                    updateData.best_streak = gameResult.perfectStreak;
                    updateData.max_level = gameResult.maxLevelReached;
                    break;
                case 'physics':
                    updateData.best_score = gameResult.score * 4; // Same multiplier as in gameService
                    updateData.best_time = Math.round(gameResult.gameTime);
                    updateData.best_hits = gameResult.totalHits;
                    updateData.least_mistakes = gameResult.mistakesMade;
                    break;
                case 'rotation':
                    updateData.best_score = gameResult.score * 3; // Same multiplier as in gameService
                    updateData.best_time = gameResult.survivalTime;
                    updateData.best_streak = gameResult.perfectStreak;
                    updateData.max_level = gameResult.maxLevelReached;
                    break;
            }

            // Check if user already has an entry
            const { data: existingEntry } = await supabaseServer
                .from('tournament_leaderboard')
                .select('*')
                .eq('tournament_id', activeTournament.id)
                .eq('telegram_id', telegramId)
                .single();

            let previousBestScore = 0;
            let newBestScore = updateData.best_score;

            if (existingEntry) {
                previousBestScore = existingEntry.best_score;

                // Only update if new score is better
                if (updateData.best_score > existingEntry.best_score) {
                    // Update existing entry with better scores
                    const { error: updateError } = await supabaseServer
                        .from('tournament_leaderboard')
                        .update({
                            best_score: updateData.best_score,
                            best_time: updateData.best_time,
                            best_hits: updateData.best_hits,
                            best_streak: updateData.best_streak,
                            max_level: updateData.max_level,
                            least_mistakes: updateData.least_mistakes,
                            total_games: existingEntry.total_games + 1,
                            last_participation_at: currentTime,
                            updated_at: currentTime
                        })
                        .eq('id', existingEntry.id);

                    if (updateError) {
                        throw updateError;
                    }
                } else {
                    // Just update game count and participation time
                    const { error: updateError } = await supabaseServer
                        .from('tournament_leaderboard')
                        .update({
                            total_games: existingEntry.total_games + 1,
                            last_participation_at: currentTime,
                            updated_at: currentTime
                        })
                        .eq('id', existingEntry.id);

                    if (updateError) {
                        throw updateError;
                    }

                    newBestScore = existingEntry.best_score; // Keep existing best score
                }
            } else {
                // Create new entry
                updateData.total_games = 1;
                updateData.first_participation_at = currentTime;

                const { error: insertError } = await supabaseServer
                    .from('tournament_leaderboard')
                    .insert(updateData);

                if (insertError) {
                    throw insertError;
                }
            }

            // Get new rank
            const rankData = await this.getUserTournamentRank(activeTournament.id, telegramId);

            return {
                success: true,
                tournamentId: activeTournament.id,
                previousBestScore,
                newBestScore,
                rankImproved: newBestScore > previousBestScore,
                newRank: rankData?.rank
            };

        } catch (error) {
            console.error('Error recording tournament participation:', error);
            return {
                success: false,
                tournamentId: '',
                previousBestScore: 0,
                newBestScore: 0,
                rankImproved: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    /**
     * Create new tournament (admin function)
     */
    async createTournament(
        tournamentData: Omit<Tournament, 'id' | 'created_at' | 'updated_at' | 'status'>
    ): Promise<Tournament | null> {
        try {
            const { data, error } = await supabaseServer
                .from('tournaments')
                .insert({
                    ...tournamentData,
                    status: 'upcoming' // Will be auto-updated by trigger
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating tournament:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in createTournament:', error);
            return null;
        }
    },

    /**
     * Update tournament status and other fields
     */
    async updateTournament(
        tournamentId: string,
        updates: Partial<Tournament>
    ): Promise<Tournament | null> {
        try {
            const { data, error } = await supabaseServer
                .from('tournaments')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId)
                .select()
                .single();

            if (error) {
                console.error('Error updating tournament:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in updateTournament:', error);
            return null;
        }
    },

    /**
     * Get tournaments summary for different time periods
     */
    async getTournamentsSummary(): Promise<{
        active: Tournament | null;
        upcoming: Tournament[];
        completed: Tournament[];
    }> {
        try {
            const [active, upcoming, completed] = await Promise.all([
                this.getActiveTournament(),
                this.getTournaments('upcoming', 5),
                this.getTournaments('completed', 10)
            ]);

            return {
                active,
                upcoming,
                completed
            };
        } catch (error) {
            console.error('Error getting tournaments summary:', error);
            return {
                active: null,
                upcoming: [],
                completed: []
            };
        }
    }
};