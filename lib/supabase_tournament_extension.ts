// src/lib/supabase_tournament_extension.ts - Обновленный сервис с поддержкой накопления турнирных очков

import { supabase } from "./supabase";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus,
    TournamentSaveResponse
} from "@/types/tournaments";

// Экспорт типов для внешнего использования
export type {
    TournamentLeaderboardEntry,
    Tournament,
    TournamentResult,
    TournamentStatus,
    TournamentSaveResponse
} from "@/types/tournaments";

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

// Основной сервис турнирной системы с поддержкой накопления очков
export const tournamentService = {

    /**
     * Получение активного турнира
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
     * Получение всех турниров с категоризацией по статусу
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
     * Получение всех турниров напрямую из базы данных
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
     * Получение статуса турнира с временными расчетами
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
     * Получение турнирного лидерборда с накопленными очками
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
     * Получение победителей турнира на основе количества призовых мест
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
     * Получение результата и ранга пользователя в турнире
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
     * Сохранение результата турнирной игры с накоплением очков
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
    ): Promise<TournamentSaveResponse> {
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

            // Парсинг JSON ответа от функции
            const saveResponse: TournamentSaveResponse = typeof data === 'string' ? JSON.parse(data) : data;

            console.log(`Points accumulated: +${saveResponse.game_score} (Total: ${saveResponse.total_score})`);

            return saveResponse;
        } catch (error) {
            console.error('Error saving accumulative tournament result:', error);
            throw error;
        }
    },

    /**
     * Проверка участия пользователя в турнире
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
     * Получение турнира по идентификатору
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

// Функция форматирования времени выживания с обработкой некорректных значений
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