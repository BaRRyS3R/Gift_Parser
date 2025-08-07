// src/hooks/modules/useTournaments.ts - Fixed tournament hook

import { useState, useCallback, useRef } from "react";
import {
    Tournament,
    TournamentDetails,
    TournamentLeaderboardEntry,
    TournamentStats,
    TournamentFilters,
    TournamentStatus,
    TournamentGameMode,
} from "@/types/tournaments";

interface TournamentLeaderboardData {
    leaderboard: TournamentLeaderboardEntry[];
    user_position?: number;
    total_participants: number;
    stats: TournamentStats;
}

interface TournamentState {
    tournaments: Tournament[];
    currentTournament: TournamentDetails | null;
    leaderboard: TournamentLeaderboardData | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Централизованный хук для управления турнирными данными
 */
export function useTournaments(
    makeAuthenticatedRequest: (
        endpoint: string,
        options?: RequestInit,
    ) => Promise<Response>,
) {
    const [state, setState] = useState<TournamentState>({
        tournaments: [],
        currentTournament: null,
        leaderboard: null,
        isLoading: false,
        error: null,
    });

    const fetchingRef = useRef<{ [key: string]: boolean }>({});

    /**
     * Получение списка турниров с фильтрацией
     */
    const fetchTournaments = useCallback(
        async (filters: TournamentFilters = {}): Promise<Tournament[]> => {
            const cacheKey = JSON.stringify(filters);

            if (fetchingRef.current[cacheKey]) {
                return state.tournaments;
            }

            fetchingRef.current[cacheKey] = true;
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const searchParams = new URLSearchParams();

                if (filters.status) searchParams.append("status", filters.status);
                if (filters.game_mode) searchParams.append("game_mode", filters.game_mode);
                if (filters.limit) searchParams.append("limit", filters.limit.toString());
                if (filters.offset) searchParams.append("offset", filters.offset.toString());

                const endpoint = `/api/tournaments${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
                const response = await makeAuthenticatedRequest(endpoint);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Failed to fetch tournaments");
                }

                const tournaments: Tournament[] = result.data;

                setState((prev) => ({
                    ...prev,
                    tournaments,
                    isLoading: false,
                    error: null,
                }));

                return tournaments;
            } catch (error) {
                console.error("Error fetching tournaments:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return [];
            } finally {
                fetchingRef.current[cacheKey] = false;
            }
        },
        [makeAuthenticatedRequest, state.tournaments],
    );

    /**
     * Получение детальной информации о турнире
     */
    const fetchTournamentDetails = useCallback(
        async (tournamentId: string): Promise<TournamentDetails | null> => {
            const cacheKey = `details_${tournamentId}`;

            if (fetchingRef.current[cacheKey]) {
                return state.currentTournament;
            }

            fetchingRef.current[cacheKey] = true;
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const response = await makeAuthenticatedRequest(`/api/tournaments/${tournamentId}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Failed to fetch tournament details");
                }

                const tournamentDetails: TournamentDetails = result.data;

                setState((prev) => ({
                    ...prev,
                    currentTournament: tournamentDetails,
                    isLoading: false,
                    error: null,
                }));

                return tournamentDetails;
            } catch (error) {
                console.error("Error fetching tournament details:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return null;
            } finally {
                fetchingRef.current[cacheKey] = false;
            }
        },
        [makeAuthenticatedRequest, state.currentTournament],
    );

    /**
     * Получение лидерборда турнира
     */
    const fetchTournamentLeaderboard = useCallback(
        async (tournamentId: string, limit: number = 100): Promise<TournamentLeaderboardData | null> => {
            const cacheKey = `leaderboard_${tournamentId}_${limit}`;

            if (fetchingRef.current[cacheKey]) {
                return state.leaderboard;
            }

            fetchingRef.current[cacheKey] = true;
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const endpoint = `/api/tournaments/${tournamentId}/leaderboard?limit=${limit}`;
                const response = await makeAuthenticatedRequest(endpoint);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Failed to fetch tournament leaderboard");
                }

                const leaderboardData: TournamentLeaderboardData = result.data;

                setState((prev) => ({
                    ...prev,
                    leaderboard: leaderboardData,
                    isLoading: false,
                    error: null,
                }));

                return leaderboardData;
            } catch (error) {
                console.error("Error fetching tournament leaderboard:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return null;
            } finally {
                fetchingRef.current[cacheKey] = false;
            }
        },
        [makeAuthenticatedRequest, state.leaderboard],
    );

    /**
     * Получение турниров по статусу
     */
    const getTournamentsByStatus = useCallback(
        (status: TournamentStatus): Tournament[] => {
            return state.tournaments.filter((tournament) => tournament.status === status);
        },
        [state.tournaments],
    );

    /**
     * Получение активных турниров для режима игры
     */
    const getActiveTournamentsForMode = useCallback(
        (gameMode: TournamentGameMode): Tournament[] => {
            return state.tournaments.filter(
                (tournament) =>
                    tournament.status === TournamentStatus.ACTIVE &&
                    tournament.game_mode === gameMode &&
                    tournament.is_active
            );
        },
        [state.tournaments],
    );

    /**
     * Проверка участия пользователя в турнире
     */
    const isUserParticipating = useCallback(
        (tournamentId: string): boolean => {
            if (state.currentTournament?.id === tournamentId) {
                return state.currentTournament.user_result !== undefined;
            }
            return false;
        },
        [state.currentTournament],
    );

    /**
     * Получение позиции пользователя в турнире
     */
    const getUserPosition = useCallback(
        (tournamentId: string): number | undefined => {
            if (state.currentTournament?.id === tournamentId) {
                return state.currentTournament.user_position;
            }
            return state.leaderboard?.user_position;
        },
        [state.currentTournament, state.leaderboard],
    );

    /**
     * Очистка ошибки
     */
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    /**
     * Сброс состояния турниров
     */
    const resetTournaments = useCallback(() => {
        setState({
            tournaments: [],
            currentTournament: null,
            leaderboard: null,
            isLoading: false,
            error: null,
        });
        fetchingRef.current = {};
    }, []);

    /**
     * Обновление данных (перезагрузка)
     */
    const refreshData = useCallback(async () => {
        fetchingRef.current = {};
        setState((prev) => ({
            ...prev,
            tournaments: [],
            currentTournament: null,
            leaderboard: null,
        }));

        // Перезагружаем основной список турниров
        await fetchTournaments();
    }, [fetchTournaments]);

    return {
        // Состояние
        tournaments: state.tournaments,
        currentTournament: state.currentTournament,
        leaderboard: state.leaderboard,
        isLoading: state.isLoading,
        error: state.error,

        // Основные действия
        fetchTournaments,
        fetchTournamentDetails,
        fetchTournamentLeaderboard,

        // Утилитарные функции
        getTournamentsByStatus,
        getActiveTournamentsForMode,
        isUserParticipating,
        getUserPosition,

        // Управление состоянием
        clearError,
        resetTournaments,
        refreshData,
    };
}