// src/lib/supabase_tournament_extension.ts - Tournament functions integration

import { supabase } from "./supabase";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus
} from "@/types/tournaments";

// Tournament service functions to integrate with existing userService object
export const tournamentService = {

    /**
     * Get the currently active tournament
     */
    async getActiveTournament(): Promise<Tournament | null> {
        try {
            const { data, error } = await supabase.rpc('get_active_tournament');

            if (error) {
                console.error('Error fetching active tournament:', error);
                throw error;
            }

            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error getting active tournament:', error);
            return null;
        }
    },

    /**
     * Get tournament status with time calculations
     */
    async getTournamentStatus(): Promise<TournamentStatus> {
        try {
            const activeTournament = await this.getActiveTournament();

            if (!activeTournament) {
                return {
                    isActive: false,
                    activeTournament: null,
                };
            }

            const now = new Date();
            const startDate = new Date(activeTournament.start_date);
            const endDate = new Date(activeTournament.end_date);

            const isActive = now >= startDate && now < endDate;
            const hasStarted = now >= startDate;
            const timeRemaining = isActive ? endDate.getTime() - now.getTime() : 0;

            return {
                isActive,
                activeTournament,
                timeRemaining,
                hasStarted,
            };
        } catch (error) {
            console.error('Error getting tournament status:', error);
            return {
                isActive: false,
                activeTournament: null,
            };
        }
    },

    /**
     * Get tournament leaderboard
     */
    async getTournamentLeaderboard(tournamentId: string, limit: number = 50): Promise<TournamentLeaderboardEntry[]> {
        try {
            const { data, error } = await supabase.rpc('get_tournament_leaderboard', {
                tournament_id_param: tournamentId,
                limit_param: limit
            });

            if (error) {
                console.error('Error fetching tournament leaderboard:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error getting tournament leaderboard:', error);
            throw error;
        }
    },

    /**
     * Get user's tournament result and rank
     */
    async getUserTournamentResult(tournamentId: string, userId: string): Promise<TournamentResult | null> {
        try {
            const { data, error } = await supabase.rpc('get_user_tournament_result', {
                tournament_id_param: tournamentId,
                user_id_param: userId
            });

            if (error) {
                console.error('Error fetching user tournament result:', error);
                throw error;
            }

            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error getting user tournament result:', error);
            return null;
        }
    },

    /**
     * Save tournament game result
     */
    async saveTournamentResult(
        tournamentId: string,
        userId: string,
        telegramId: number,
        gameResult: {
            survivalTime: number;
            score: number;
            maxLevelReached: number;
            perfectStreak: number;
            correctHits: number;
            deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
        }
    ): Promise<string | null> {
        try {
            console.log('Saving tournament result:', {
                tournamentId,
                userId,
                gameResult
            });

            const { data, error } = await supabase.rpc('save_tournament_result', {
                tournament_id_param: tournamentId,
                user_id_param: userId,
                telegram_id_param: telegramId,
                survival_time_param: gameResult.survivalTime,
                survival_score_param: gameResult.score,
                max_level_reached_param: gameResult.maxLevelReached,
                perfect_streak_param: gameResult.perfectStreak,
                correct_hits_param: gameResult.correctHits,
                death_cause_param: gameResult.deathCause
            });

            if (error) {
                console.error('Error saving tournament result:', error);
                throw error;
            }

            console.log('Tournament result saved successfully:', data);
            return data;
        } catch (error) {
            console.error('Error saving tournament result:', error);
            throw error;
        }
    },

    /**
     * Get top winners for a tournament (based on prize count)
     */
    async getTournamentWinners(tournamentId: string, prizeCount: number): Promise<TournamentLeaderboardEntry[]> {
        try {
            const leaderboard = await this.getTournamentLeaderboard(tournamentId, prizeCount);
            return leaderboard.slice(0, prizeCount);
        } catch (error) {
            console.error('Error getting tournament winners:', error);
            return [];
        }
    },

    /**
     * Check if user has participated in tournament
     */
    async hasUserParticipated(tournamentId: string, userId: string): Promise<boolean> {
        try {
            const result = await this.getUserTournamentResult(tournamentId, userId);
            return result !== null;
        } catch (error) {
            console.error('Error checking user participation:', error);
            return false;
        }
    },

    /**
     * Get tournament by ID
     */
    async getTournamentById(tournamentId: string): Promise<Tournament | null> {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (error) {
                console.error('Error fetching tournament by ID:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error getting tournament by ID:', error);
            return null;
        }
    },

    /**
     * Get all tournaments (for admin purposes)
     */
    async getAllTournaments(): Promise<Tournament[]> {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching all tournaments:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error getting all tournaments:', error);
            return [];
        }
    }
};

// Helper function to format tournament survival time with millisecond precision
export const formatTournamentSurvivalTime = (milliseconds: number): string => {
    let ms = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    ms = ms % 1000;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    }

    return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};