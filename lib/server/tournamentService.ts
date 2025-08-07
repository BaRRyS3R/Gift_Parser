// src/lib/server/tournamentService.ts - Tournament management service

import { supabaseServer } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";
import type {
    ReactionGameResult,
    SurvivalGameResult,
    PhysicsGameResult,
    RotationGameResult
} from "@/types/game-modes";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentsData,
    Prize
} from "@/types/tournaments";

// Re-export types from the main types file to ensure consistency
export type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentsData,
    Prize
};

// Tournament participation result interface for game service integration
export interface TournamentParticipationResult {
    tournamentId: string;
    tournamentName: string;
    newBestScore: boolean;
    position?: number;
    improved: boolean;
    previousPosition?: number;
    scoreImprovement?: number;
}

export interface GameResultForTournament {
    mode: GameMode;
    score: number;
    duration: number;
    // Mode-specific fields
    survivalTime?: number;
    maxLevelReached?: number;
    perfectStreak?: number;
    correctHits?: number;
    gameTime?: number;
    totalHits?: number;
    mistakesMade?: number;
}

// Server-side tournament service
export const serverTournamentService = {
    /**
     * Get current active tournament
     */
    async getActiveTournament(): Promise<Tournament | null> {
        try {
            const { data, error } = await supabaseServer
                .rpc('get_active_tournament');

            if (error) {
                console.error('Error getting active tournament:', error);
                return null;
            }

            return data || null;
        } catch (error) {
            console.error('Error in getActiveTournament:', error);
            return null;
        }
    },

    /**
     * Check if tournament is active for specific game mode
     */
    async isTournamentActiveForMode(gameMode: GameMode): Promise<boolean> {
        try {
            // Convert GameMode enum to tournament mode string
            let tournamentMode: string;
            switch (gameMode) {
                case GameMode.SURVIVAL:
                    tournamentMode = 'survival';
                    break;
                case GameMode.PHYSICS:
                    tournamentMode = 'physics';
                    break;
                case GameMode.ROTATION:
                    tournamentMode = 'rotation';
                    break;
                default:
                    return false; // Reaction mode doesn't have tournaments
            }

            const { data, error } = await supabaseServer
                .rpc('is_tournament_active_for_mode', { game_mode: tournamentMode });

            if (error) {
                console.error('Error checking tournament active for mode:', error);
                return false;
            }

            return data || false;
        } catch (error) {
            console.error('Error in isTournamentActiveForMode:', error);
            return false;
        }
    },

    /**
     * Get all tournaments grouped by status
     */
    async getAllTournaments(): Promise<TournamentsData> {
        try {
            const { data: tournaments, error } = await supabaseServer
                .from('tournaments')
                .select('*')
                .order('start_time', { ascending: false });

            if (error) {
                console.error('Error fetching tournaments:', error);
                throw error;
            }

            const result: TournamentsData = {
                upcoming: [],
                completed: []
            };

            for (const tournament of tournaments || []) {
                if (tournament.status === 'active') {
                    result.active = tournament;
                } else if (tournament.status === 'upcoming') {
                    result.upcoming.push(tournament);
                } else if (tournament.status === 'completed') {
                    result.completed.push(tournament);
                }
            }

            // Sort upcoming by start time (earliest first)
            result.upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            // Sort completed by end time (most recent first)
            result.completed.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

            return result;
        } catch (error) {
            console.error('Error in getAllTournaments:', error);
            throw error;
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
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                console.error('Error fetching tournament by ID:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in getTournamentById:', error);
            return null;
        }
    },

    /**
     * Get tournament leaderboard
     */
    async getTournamentLeaderboard(
        tournamentId: string,
        limit: number = 100
    ): Promise<TournamentLeaderboardEntry[]> {
        try {
            const { data, error } = await supabaseServer
                .from('tournament_leaderboards')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('best_score', { ascending: false })
                .order('last_game_at', { ascending: true }) // Tiebreaker: earlier last game wins
                .limit(limit);

            if (error) {
                console.error('Error fetching tournament leaderboard:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getTournamentLeaderboard:', error);
            throw error;
        }
    },

    /**
     * Update or create tournament leaderboard entry
     */
    async updateTournamentLeaderboard(
        tournamentId: string,
        telegramId: number,
        gameResult: GameResultForTournament,
        userInfo: {
            user_id: string;
            first_name: string;
            last_name?: string;
            username?: string;
            is_premium: boolean;
        }
    ): Promise<void> {
        try {
            const now = new Date().toISOString();

            // Get existing entry
            const { data: existingEntry } = await supabaseServer
                .from('tournament_leaderboards')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('telegram_id', telegramId)
                .single();

            // Calculate mode-specific score
            let tournamentScore = gameResult.score;

            // Apply mode-specific multipliers (same as in gameService)
            switch (gameResult.mode) {
                case GameMode.SURVIVAL:
                    tournamentScore = gameResult.score * 2;
                    break;
                case GameMode.PHYSICS:
                    tournamentScore = gameResult.score * 4;
                    break;
                case GameMode.ROTATION:
                    tournamentScore = gameResult.score * 3;
                    break;
            }

            if (existingEntry) {
                // Update existing entry
                const updates: any = {
                    first_name: userInfo.first_name,
                    last_name: userInfo.last_name,
                    username: userInfo.username,
                    is_premium: userInfo.is_premium,
                    total_games: existingEntry.total_games + 1,
                    last_game_at: now,
                    updated_at: now,
                };

                // Update best score if improved
                if (tournamentScore > existingEntry.best_score) {
                    updates.best_score = tournamentScore;
                }

                // Update mode-specific fields
                if (gameResult.mode === GameMode.SURVIVAL && gameResult.survivalTime !== undefined) {
                    if (!existingEntry.best_time || gameResult.survivalTime > existingEntry.best_time) {
                        updates.best_time = gameResult.survivalTime;
                    }
                    if (gameResult.maxLevelReached !== undefined && (!existingEntry.max_level || gameResult.maxLevelReached > existingEntry.max_level)) {
                        updates.max_level = gameResult.maxLevelReached;
                    }
                    if (gameResult.perfectStreak !== undefined && (!existingEntry.best_streak || gameResult.perfectStreak > existingEntry.best_streak)) {
                        updates.best_streak = gameResult.perfectStreak;
                    }
                } else if (gameResult.mode === GameMode.PHYSICS) {
                    if (gameResult.gameTime !== undefined && (!existingEntry.best_time || gameResult.gameTime > existingEntry.best_time)) {
                        updates.best_time = Math.round(gameResult.gameTime);
                    }
                    if (gameResult.totalHits !== undefined) {
                        updates.total_hits = (existingEntry.total_hits || 0) + gameResult.totalHits;
                    }
                    if (gameResult.mistakesMade !== undefined) {
                        if (existingEntry.least_mistakes === null || existingEntry.least_mistakes === undefined) {
                            updates.least_mistakes = gameResult.mistakesMade;
                        } else {
                            updates.least_mistakes = Math.min(existingEntry.least_mistakes, gameResult.mistakesMade);
                        }
                    }
                } else if (gameResult.mode === GameMode.ROTATION) {
                    if (gameResult.survivalTime !== undefined && (!existingEntry.best_time || gameResult.survivalTime > existingEntry.best_time)) {
                        updates.best_time = gameResult.survivalTime;
                    }
                    if (gameResult.maxLevelReached !== undefined && (!existingEntry.max_level || gameResult.maxLevelReached > existingEntry.max_level)) {
                        updates.max_level = gameResult.maxLevelReached;
                    }
                    if (gameResult.perfectStreak !== undefined && (!existingEntry.best_streak || gameResult.perfectStreak > existingEntry.best_streak)) {
                        updates.best_streak = gameResult.perfectStreak;
                    }
                    if (gameResult.correctHits !== undefined) {
                        updates.total_hits = (existingEntry.total_hits || 0) + gameResult.correctHits;
                    }
                }

                const { error } = await supabaseServer
                    .from('tournament_leaderboards')
                    .update(updates)
                    .eq('id', existingEntry.id);

                if (error) {
                    console.error('Error updating tournament leaderboard entry:', error);
                    throw error;
                }
            } else {
                // Create new entry
                const newEntry: any = {
                    tournament_id: tournamentId,
                    user_id: userInfo.user_id,
                    telegram_id: telegramId,
                    first_name: userInfo.first_name,
                    last_name: userInfo.last_name,
                    username: userInfo.username,
                    is_premium: userInfo.is_premium,
                    best_score: tournamentScore,
                    total_games: 1,
                    first_game_at: now,
                    last_game_at: now,
                };

                // Set mode-specific initial values
                if (gameResult.mode === GameMode.SURVIVAL) {
                    newEntry.best_time = gameResult.survivalTime || 0;
                    newEntry.max_level = gameResult.maxLevelReached || 0;
                    newEntry.best_streak = gameResult.perfectStreak || 0;
                } else if (gameResult.mode === GameMode.PHYSICS) {
                    newEntry.best_time = gameResult.gameTime ? Math.round(gameResult.gameTime) : 0;
                    newEntry.total_hits = gameResult.totalHits || 0;
                    newEntry.least_mistakes = gameResult.mistakesMade || 0;
                } else if (gameResult.mode === GameMode.ROTATION) {
                    newEntry.best_time = gameResult.survivalTime || 0;
                    newEntry.max_level = gameResult.maxLevelReached || 0;
                    newEntry.best_streak = gameResult.perfectStreak || 0;
                    newEntry.total_hits = gameResult.correctHits || 0;
                }

                const { error } = await supabaseServer
                    .from('tournament_leaderboards')
                    .insert(newEntry);

                if (error) {
                    console.error('Error creating tournament leaderboard entry:', error);
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error in updateTournamentLeaderboard:', error);
            throw error;
        }
    },

    /**
     * Get user's position in tournament
     */
    async getUserTournamentPosition(
        tournamentId: string,
        telegramId: number
    ): Promise<{ position: number; entry: TournamentLeaderboardEntry } | null> {
        try {
            const leaderboard = await this.getTournamentLeaderboard(tournamentId, 1000);
            const userIndex = leaderboard.findIndex(entry => entry.telegram_id === telegramId);

            if (userIndex === -1) {
                return null;
            }

            return {
                position: userIndex + 1,
                entry: leaderboard[userIndex]
            };
        } catch (error) {
            console.error('Error in getUserTournamentPosition:', error);
            return null;
        }
    },

    /**
     * Get tournament by query parameter (format: mode-week-number-year)
     */
    async getTournamentByQuery(query: string): Promise<Tournament | null> {
        try {
            // Parse query format: physics-week-32-2025
            const parts = query.split('-');
            if (parts.length < 4) {
                return null;
            }

            const mode = parts[0];
            if (!['survival', 'physics', 'rotation'].includes(mode)) {
                return null;
            }

            // For now, we'll search by mode and approximate time
            // In future, you might want to add a query_identifier column to tournaments table
            const { data, error } = await supabaseServer
                .from('tournaments')
                .select('*')
                .eq('mode', mode)
                .order('start_time', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error searching tournament by query:', error);
                return null;
            }

            // Return the most recent tournament for the mode
            // You can enhance this logic based on your specific query format needs
            return data?.[0] || null;
        } catch (error) {
            console.error('Error in getTournamentByQuery:', error);
            return null;
        }
    }
};