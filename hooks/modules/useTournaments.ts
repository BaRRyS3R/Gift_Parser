// src/hooks/modules/useTournaments.ts - ИСПРАВЛЕНО: убрано автообновление, оптимизированы типы данных

import type {
  Tournament,
  TournamentsData,
  OptimizedTournamentLeaderboardEntry,
  TournamentQuery,
  TournamentTimeInfo,
} from "@/types/tournaments";

import { useState, useCallback, useRef } from "react";

import { calculateTournamentTimeInfo } from "@/types/tournaments";

// Оптимизированные типы для уменьшения нагрузки на Redis
export interface OptimizedTournamentUserPosition {
  position: number;
  entry: OptimizedTournamentLeaderboardEntry;
}

export interface OptimizedTournamentLeaderboardData {
  tournament: Tournament;
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition?: OptimizedTournamentUserPosition;
}

// Упрощенная структура состояния хука
interface TournamentsState {
  tournament: Tournament | null; // Только один активный турнир
  leaderboard: OptimizedTournamentLeaderboardEntry[];
  userPosition: OptimizedTournamentUserPosition | null;
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  error: string | null;
  leaderboardError: string | null;
  lastFetchTime: number | null;
}

// Кеш конфигурация - оптимизированная
const TOURNAMENT_CACHE_DURATION = 60 * 60 * 1000; // 1 час для турнира
const LEADERBOARD_CACHE_DURATION = 5 * 60 * 1000; // 5 минут для лидерборда

/**
 * ИСПРАВЛЕННЫЙ хук управления турниром БЕЗ автообновления
 */
export function useTournaments(
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>,
) {
  const [state, setState] = useState<TournamentsState>({
    tournament: null,
    leaderboard: [],
    userPosition: null,
    isLoading: false,
    isLeaderboardLoading: false,
    error: null,
    leaderboardError: null,
    lastFetchTime: null,
  });

  const fetchingRef = useRef<boolean>(false);
  const leaderboardFetchingRef = useRef<boolean>(false);
  
  // Оптимизированный кеш только для активного турнира
  const tournamentCache = useRef<{
    data: Tournament;
    timestamp: number;
  } | null>(null);
  
  const leaderboardCache = useRef<{
    data: OptimizedTournamentLeaderboardData;
    timestamp: number;
  } | null>(null);

  /**
   * Проверка валидности кеша
   */
  const isCacheValid = useCallback(
    (timestamp: number, duration: number): boolean => {
      return Date.now() - timestamp < duration;
    },
    [],
  );

  /**
   * Получение статуса и времени турнира
   */
  const getTournamentStatus = useCallback(
    (tournament: Tournament): TournamentTimeInfo => {
      return calculateTournamentTimeInfo(tournament);
    },
    [],
  );

  /**
   * Форматирование оставшегося времени
   */
  const formatTimeRemaining = useCallback((endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining === 0) return "Ended";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  }, []);

  /**
   * ИСПРАВЛЕНО: получение активного турнира БЕЗ автообновления
   */
  const fetchActiveTournament = useCallback(
    async (force: boolean = false): Promise<Tournament | null> => {
      // Проверяем кеш турнира
      if (
        !force &&
        tournamentCache.current &&
        isCacheValid(tournamentCache.current.timestamp, TOURNAMENT_CACHE_DURATION)
      ) {
        setState((prev) => ({
          ...prev,
          tournament: tournamentCache.current!.data,
        }));
        return tournamentCache.current.data;
      }

      if (fetchingRef.current && !force) {
        return state.tournament;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await makeAuthenticatedRequest("/api/tournaments/active");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch active tournament");
        }

        const tournament = result.tournament;

        // Обновляем кеш только если турнир существует
        if (tournament) {
          tournamentCache.current = {
            data: tournament,
            timestamp: Date.now(),
          };
        } else {
          tournamentCache.current = null;
        }

        setState((prev) => ({
          ...prev,
          tournament: tournament || null,
          isLoading: false,
          error: null,
          lastFetchTime: Date.now(),
        }));

        return tournament || null;
      } catch (error) {
        console.error("Error fetching active tournament:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, isCacheValid, state.tournament],
  );

  /**
   * ИСПРАВЛЕНО: получение лидерборда турнира с оптимизированными данными
   */
  const fetchTournamentLeaderboard = useCallback(
    async (
      tournamentId: string,
      force: boolean = false,
    ): Promise<OptimizedTournamentLeaderboardData | null> => {
      // Проверяем кеш лидерборда
      const cacheKey = tournamentId;
      
      if (
        !force &&
        leaderboardCache.current &&
        leaderboardCache.current.data.tournament.id === cacheKey &&
        isCacheValid(leaderboardCache.current.timestamp, LEADERBOARD_CACHE_DURATION)
      ) {
        setState((prev) => ({
          ...prev,
          leaderboard: leaderboardCache.current!.data.leaderboard,
          userPosition: leaderboardCache.current!.data.userPosition || null,
        }));
        return leaderboardCache.current.data;
      }

      if (leaderboardFetchingRef.current && !force) {
        return null;
      }

      leaderboardFetchingRef.current = true;
      setState((prev) => ({
        ...prev,
        isLeaderboardLoading: true,
        leaderboardError: null,
      }));

      try {
        const response = await makeAuthenticatedRequest(
          `/api/tournaments/leaderboard?tournamentId=${encodeURIComponent(tournamentId)}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.error || "Failed to fetch tournament leaderboard",
          );
        }

        const leaderboardData: OptimizedTournamentLeaderboardData = {
          tournament: result.tournament,
          leaderboard: result.leaderboard || [],
          userPosition: result.userPosition,
        };

        // Обновляем кеш
        leaderboardCache.current = {
          data: leaderboardData,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          leaderboard: leaderboardData.leaderboard,
          userPosition: leaderboardData.userPosition || null,
          isLeaderboardLoading: false,
          leaderboardError: null,
        }));

        return leaderboardData;
      } catch (error) {
        console.error("Error fetching tournament leaderboard:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament leaderboard";

        setState((prev) => ({
          ...prev,
          isLeaderboardLoading: false,
          leaderboardError: errorMessage,
        }));

        return null;
      } finally {
        leaderboardFetchingRef.current = false;
      }
    },
    [makeAuthenticatedRequest, isCacheValid],
  );

  /**
   * Обновление данных турнира
   */
  const refreshTournament = useCallback(() => {
    tournamentCache.current = null;
    return fetchActiveTournament(true);
  }, [fetchActiveTournament]);

  /**
   * Обновление лидерборда
   */
  const refreshLeaderboard = useCallback(
    (tournamentId: string) => {
      leaderboardCache.current = null;
      return fetchTournamentLeaderboard(tournamentId, true);
    },
    [fetchTournamentLeaderboard],
  );

  /**
   * Очистка ошибок
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearLeaderboardError = useCallback(() => {
    setState((prev) => ({ ...prev, leaderboardError: null }));
  }, []);

  /**
   * Сброс состояния
   */
  const resetTournamentState = useCallback(() => {
    setState({
      tournament: null,
      leaderboard: [],
      userPosition: null,
      isLoading: false,
      isLeaderboardLoading: false,
      error: null,
      leaderboardError: null,
      lastFetchTime: null,
    });

    tournamentCache.current = null;
    leaderboardCache.current = null;
  }, []);

  /**
   * Проверка участия пользователя
   */
  const isUserParticipating = useCallback((): boolean => {
    return state.userPosition !== null;
  }, [state.userPosition]);

  /**
   * Получение позиции пользователя
   */
  const getUserPosition = useCallback((): OptimizedTournamentUserPosition | null => {
    return state.userPosition;
  }, [state.userPosition]);

  // УБРАНО: автообновление для активных турниров
  // Теперь обновления происходят только по требованию пользователя

  return {
    // Состояние
    tournament: state.tournament,
    leaderboard: state.leaderboard,
    userPosition: state.userPosition,
    isLoading: state.isLoading,
    isLeaderboardLoading: state.isLeaderboardLoading,
    error: state.error,
    leaderboardError: state.leaderboardError,
    lastFetchTime: state.lastFetchTime,

    // Вычисляемые значения
    isParticipating: state.userPosition !== null,
    hasActiveTournament: state.tournament !== null,

    // Действия
    fetchActiveTournament: () => fetchActiveTournament(false),
    fetchTournamentLeaderboard: (tournamentId: string) => fetchTournamentLeaderboard(tournamentId, false),
    refreshTournament,
    refreshLeaderboard,

    // Утилиты
    isUserParticipating,
    getUserPosition,
    getTournamentStatus,
    formatTimeRemaining,

    // Обработка ошибок
    clearError,
    clearLeaderboardError,
    resetTournamentState,
  };
}