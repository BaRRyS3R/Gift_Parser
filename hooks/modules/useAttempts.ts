// src/hooks/modules/useAttempts.ts - Исправленный хук без кеширования

import { useState, useCallback, useEffect, useRef } from "react";

import { useUser } from "../useUser";

// Экспортированный интерфейс для использования в других компонентах
export interface AttemptsStatus {
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
  timeUntilReset?: number;
}

// Hook state interface
interface AttemptsState {
  status: AttemptsStatus | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Специализированный хук для управления попытками пользователя с серверной валидацией
 * Обеспечивает централизованное управление состоянием без кеширования для актуальных данных
 */
export function useAttempts() {
  const { makeAuthenticatedRequest, authState } = useUser();
  const [state, setState] = useState<AttemptsState>({
    status: null,
    isLoading: false,
    error: null,
  });

  // Отслеживание текущих запросов для предотвращения дублирования
  const fetchingRef = useRef<boolean>(false);

  /**
   * Получение актуального статуса попыток с сервера (без кеширования)
   * @param forceRefresh - параметр сохранен для совместимости, но игнорируется
   */
  const fetchAttemptsStatus = useCallback(
    async (forceRefresh = false): Promise<AttemptsStatus | null> => {
      // Предотвращение дублирующих запросов
      if (fetchingRef.current) {
        console.log("Attempts fetch already in progress");

        return state.status;
      }

      if (!authState.isAuthenticated) {
        console.log("User not authenticated, cannot fetch attempts");

        return null;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Fetching fresh attempts status from server...");

        const response = await makeAuthenticatedRequest(
          "/api/user/attempts/status",
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to get attempts status");
        }

        const attemptsStatus: AttemptsStatus = {
          canPlay: data.canPlay,
          attemptsRemaining: data.attemptsRemaining,
          resetTime: data.resetTime ? new Date(data.resetTime) : undefined,
          timeUntilReset: data.timeUntilReset,
        };

        setState({
          status: attemptsStatus,
          isLoading: false,
          error: null,
        });

        console.log("Successfully fetched attempts status:", attemptsStatus);

        return attemptsStatus;
      } catch (error) {
        console.error("Error fetching attempts status:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

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
    [authState.isAuthenticated, makeAuthenticatedRequest],
  );

  /**
   * Потребление одной попытки с серверной валидацией
   */
  const consumeAttempt =
    useCallback(async (): Promise<AttemptsStatus | null> => {
      if (!authState.isAuthenticated) {
        console.log("User not authenticated, cannot consume attempt");

        return null;
      }

      if (fetchingRef.current) {
        console.log("Attempt consumption already in progress");

        return state.status;
      }

      fetchingRef.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log("Consuming attempt...");

        const response = await makeAuthenticatedRequest(
          "/api/user/attempts/consume",
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to consume attempt");
        }

        const attemptsStatus: AttemptsStatus = {
          canPlay: data.canPlay,
          attemptsRemaining: data.attemptsRemaining,
          resetTime: data.resetTime ? new Date(data.resetTime) : undefined,
          timeUntilReset: data.timeUntilReset,
        };

        setState({
          status: attemptsStatus,
          isLoading: false,
          error: null,
        });

        console.log("Successfully consumed attempt:", attemptsStatus);

        return attemptsStatus;
      } catch (error) {
        console.error("Error consuming attempt:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return null;
      } finally {
        fetchingRef.current = false;
      }
    }, [authState.isAuthenticated, makeAuthenticatedRequest, state.status]);

  /**
   * Сброс состояния данных
   */
  const resetState = useCallback(() => {
    console.log("Resetting attempts state");
    setState({
      status: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Очистка состояния ошибки
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Инициализация данных попыток при первой загрузке
   */
  useEffect(() => {
    if (
      authState.isAuthenticated &&
      !state.status &&
      !state.isLoading &&
      !fetchingRef.current
    ) {
      console.log("Initializing attempts data...");
      fetchAttemptsStatus();
    }
  }, [
    authState.isAuthenticated,
    state.status,
    state.isLoading,
    fetchAttemptsStatus,
  ]);

  return {
    // Текущее состояние
    attemptsStatus: state.status,
    isLoading: state.isLoading,
    error: state.error,

    // Действия
    fetchAttemptsStatus,
    consumeAttempt,
    resetState,
    clearError,

    // Вычисляемые значения для удобства
    canPlay: state.status?.canPlay ?? false,
    attemptsRemaining: state.status?.attemptsRemaining ?? 0,
  };
}
