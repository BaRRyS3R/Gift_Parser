// src/lib/supabase_tournament_extension.ts - Updated tournament functions with points-based system

import { supabase } from "./supabase";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus,
    calculateRoundPoints
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
     * Get tournament leaderboard (sorted by total points, then survival time)
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
     * Get user's tournament result and rank (based on points)
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
     * Save tournament game result with points accumulation
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
            console.log('Saving tournament result with points system:', {
                tournamentId,
                userId,
                gameResult,
                pointsEarned: gameResult.correctHits // 1 point per correct hit
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

            console.log('Tournament result saved successfully with points:', {
                resultId: data,
                pointsAdded: gameResult.correctHits
            });
            return data;
        } catch (error) {
            console.error('Error saving tournament result:', error);
            throw error;
        }
    },

    /**
     * Get tournament statistics including total points and participants
     */
    async getTournamentStatistics(tournamentId: string): Promise<{
        totalParticipants: number;
        totalPointsAwarded: number;
        averagePointsPerPlayer: number;
        topScore: number;
        topSurvivalTime: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('tournament_leaderboard')
                .select('total_points, survival_time')
                .eq('tournament_id', tournamentId);

            if (error) {
                console.error('Error fetching tournament statistics:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                return {
                    totalParticipants: 0,
                    totalPointsAwarded: 0,
                    averagePointsPerPlayer: 0,
                    topScore: 0,
                    topSurvivalTime: 0,
                };
            }

            const totalParticipants = data.length;
            const totalPointsAwarded = data.reduce((sum, entry) => sum + (entry.total_points || 0), 0);
            const averagePointsPerPlayer = Math.round(totalPointsAwarded / totalParticipants);
            const topScore = Math.max(...data.map(entry => entry.total_points || 0));
            const topSurvivalTime = Math.max(...data.map(entry => entry.survival_time || 0));

            return {
                totalParticipants,
                totalPointsAwarded,
                averagePointsPerPlayer,
                topScore,
                topSurvivalTime,
            };
        } catch (error) {
            console.error('Error getting tournament statistics:', error);
            return {
                totalParticipants: 0,
                totalPointsAwarded: 0,
                averagePointsPerPlayer: 0,
                topScore: 0,
                topSurvivalTime: 0,
            };
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
     * Get user's tournament progress including points earned
     */
    async getUserTournamentProgress(tournamentId: string, userId: string): Promise<{
        totalPoints: number;
        gamesPlayed: number;
        averagePointsPerGame: number;
        bestSingleGameScore: number;
        bestSurvivalTime: number;
        currentRank: number;
    } | null> {
        try {
            const userResult = await this.getUserTournamentResult(tournamentId, userId);
            
            if (!userResult) {
                return null;
            }

            // Estimate games played based on total hits and average hits per game
            // This is an approximation since we don't store games count directly
            const estimatedGamesPlayed = Math.max(1, Math.ceil(userResult.correct_hits / 20)); // Assume ~20 hits per game average
            const averagePointsPerGame = Math.round(userResult.total_points / estimatedGamesPlayed);

            return {
                totalPoints: userResult.total_points,
                gamesPlayed: estimatedGamesPlayed,
                averagePointsPerGame,
                bestSingleGameScore: userResult.survival_score,
                bestSurvivalTime: userResult.survival_time,
                currentRank: userResult.rank || 0,
            };
        } catch (error) {
            console.error('Error getting user tournament progress:', error);
            return null;
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

// Updated function for formatting tournament survival time with proper error handling
export const formatTournamentSurvivalTime = (milliseconds: number): string => {
    if (milliseconds < 0) {
        console.warn('Negative survival time detected:', milliseconds);
        return "0.000s";
    }

    if (isNaN(milliseconds) || !isFinite(milliseconds)) {
        console.warn('Invalid survival time value:', milliseconds);
        return "0.000s";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    }

    return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};

// New utility function for formatting points with appropriate suffixes
export const formatTournamentPoints = (points: number): string => {
    if (points >= 1000000) {
        return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
        return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
};