// src/lib/supabase_tournament_extension.ts - Расширенный сервис с поддержкой всех турниров

import { supabase } from "./supabase";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus
} from "@/types/tournaments";

// Re-export types for external use
export type { TournamentLeaderboardEntry, Tournament, TournamentResult, TournamentStatus } from "@/types/tournaments";

export interface TournamentWithStatus extends Tournament {
    status: 'upcoming' | 'active' | 'completed';
    participants_count?: number;
    time_until_start?: number;
    time_until_end?: number;
}

export interface TournamentListResponse {
    active: TournamentWithStatus[];
    upcoming: TournamentWithStatus[];
    completed: TournamentWithStatus[];
}

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
     * Get all tournaments categorized by status
     */
    async getAllTournaments(): Promise<TournamentListResponse> {
        try {
            const allTournaments = await this.getAllTournamentsRaw();
            const now = new Date();

            const categorized: TournamentListResponse = {
                active: [],
                upcoming: [],
                completed: []
            };

            for (const tournament of allTournaments) {
                const startDate = new Date(tournament.start_date);
                const endDate = new Date(tournament.end_date);

                let status: 'upcoming' | 'active' | 'completed';
                let timeUntilStart: number | undefined;
                let timeUntilEnd: number | undefined;

                if (now < startDate) {
                    status = 'upcoming';
                    timeUntilStart = startDate.getTime() - now.getTime();
                } else if (now >= startDate && now < endDate) {
                    status = 'active';
                    timeUntilEnd = endDate.getTime() - now.getTime();
                } else {
                    status = 'completed';
                }

                const tournamentWithStatus: TournamentWithStatus = {
                    ...tournament,
                    status,
                    time_until_start: timeUntilStart,
                    time_until_end: timeUntilEnd
                };

                // Get participants count for completed tournaments
                if (status === 'completed') {
                    try {
                        const leaderboard = await this.getTournamentLeaderboard(tournament.id, 1000);
                        tournamentWithStatus.participants_count = leaderboard.length;
                    } catch (error) {
                        console.error(`Error getting participants count for tournament ${tournament.id}:`, error);
                        tournamentWithStatus.participants_count = 0;
                    }
                }

                categorized[status].push(tournamentWithStatus);
            }

            // Sort tournaments
            categorized.active.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
            categorized.upcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
            categorized.completed.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

            return categorized;
        } catch (error) {
            console.error('Error getting all tournaments:', error);
            return {
                active: [],
                upcoming: [],
                completed: []
            };
        }
    },

    /**
     * Get all tournaments (raw from database)
     */
    async getAllTournamentsRaw(): Promise<Tournament[]> {
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
 * Get tournament leaderboard sorted by accumulated points (client-side sorting)
 */
    async getTournamentLeaderboard(tournamentId: string, limit: number = 50): Promise<TournamentLeaderboardEntry[]> {
        try {
            const { data, error } = await supabase.rpc('get_tournament_leaderboard_accumulative', {
                tournament_id_param: tournamentId,
                limit_param: limit
            });

            if (error) {
                console.error('Error fetching accumulative tournament leaderboard:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error getting accumulative tournament leaderboard:', error);
            throw error;
        }
    },

    /**
     * Get tournament winners (top N based on prize count)
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
            console.log('Saving accumulative tournament result:', {
                tournamentId,
                userId,
                gameResult
            });

            const { data, error } = await supabase.rpc('save_tournament_result_accumulative', {
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
                console.error('Error saving accumulative tournament result:', error);
                throw error;
            }

            console.log('Tournament result saved with point accumulation:', data);
            return data;
        } catch (error) {
            console.error('Error saving accumulative tournament result:', error);
            throw error;
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
    }
};

// ИСПРАВЛЕННАЯ функция для форматирования времени турнира с обработкой отрицательных значений
export const formatTournamentSurvivalTime = (milliseconds: number): string => {
    // Обрабатываем отрицательные значения
    if (milliseconds < 0) {
        console.warn('Negative survival time detected:', milliseconds);
        return "0.000s";
    }

    // Убеждаемся, что значение является числом
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