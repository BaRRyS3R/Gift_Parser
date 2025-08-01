// src/hooks/modules/useAttempts.ts - Оптимизированный хук с быстрой инициализацией

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
 * Оптимизированный хук для управления попытками пользователя
 * Устраняет задержки через параллельную загрузку и упрощенную валидацию
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
  const initializingRef = useRef<boolean>(false);

  /**
   * Быстрое получение статуса попыток без комплексной валидации
   */
  const fetchAttemptsStatus = useCallback(
    async (isInitialLoad = false): Promise<AttemptsStatus | null> => {
      // Предотвращение дублирующих запросов
      if (fetchingRef.current) {
        return state.status;
      }

      if (!authState.isAuthenticated) {
        console.log("Пользователь не аутентифицирован, отмена загрузки попыток");
        return null;
      }

      fetchingRef.current = true;
      
      // Показываем загрузку только для неинициальных запросов
      if (!isInitialLoad) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        console.log("Быстрая загрузка статуса попыток...");

        const response = await makeAuthenticatedRequest(
          "/api/user/attempts/status",
          {
            // Добавляем заголовок для упрощенной валидации
            headers: {
              'X-Fast-Check': 'true'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Ошибка сервера: ${response.status}`,
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Не удалось получить статус попыток");
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

        console.log("Статус попыток успешно загружен:", attemptsStatus);

        return attemptsStatus;
      } catch (error) {
        console.error("Ошибка загрузки статуса попыток:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Неизвестная ошибка";

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
    [authState.isAuthenticated, makeAuthenticatedRequest, state.status],
  );

  /**
   * Оптимистичное потребление попытки с немедленным откликом интерфейса
   */
  const consumeAttempt = useCallback(async (): Promise<AttemptsStatus | null> => {
    if (!authState.isAuthenticated || !state.status) {
      console.log("Невозможно потребить попытку: нет аутентификации или статуса");
      return null;
    }

    if (!state.status.canPlay) {
      throw new Error("Нет доступных попыток");
    }

    if (fetchingRef.current) {
      console.log("Потребление попытки уже в процессе");
      return state.status;
    }

    // Сохраняем текущее состояние для возможного отката
    const previousStatus = { ...state.status };

    // Оптимистичное обновление для немедленного отклика
    const optimisticStatus: AttemptsStatus = {
      ...state.status,
      attemptsRemaining: Math.max(0, state.status.attemptsRemaining - 1),
      canPlay: state.status.attemptsRemaining > 1,
    };

    // Если это последняя попытка, устанавливаем время сброса
    if (optimisticStatus.attemptsRemaining === 0) {
      const resetTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 часа
      optimisticStatus.resetTime = resetTime;
      optimisticStatus.timeUntilReset = 2 * 60 * 60 * 1000;
    }

    setState(prev => ({ ...prev, status: optimisticStatus }));

    fetchingRef.current = true;

    try {
      console.log("Потребление попытки...");

      const response = await makeAuthenticatedRequest(
        "/api/user/attempts/consume",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Ошибка сервера: ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Не удалось потребить попытку");
      }

      const actualStatus: AttemptsStatus = {
        canPlay: data.canPlay,
        attemptsRemaining: data.attemptsRemaining,
        resetTime: data.resetTime ? new Date(data.resetTime) : undefined,
        timeUntilReset: data.timeUntilReset,
      };

      setState({
        status: actualStatus,
        isLoading: false,
        error: null,
      });

      console.log("Попытка успешно потреблена:", actualStatus);

      return actualStatus;
    } catch (error) {
      console.error("Ошибка потребления попытки:", error);
      
      // Откатываем оптимистичное обновление при ошибке
      setState((prev) => ({
        ...prev,
        status: previousStatus,
        error: error instanceof Error ? error.message : "Ошибка потребления попытки",
      }));

      throw error;
    } finally {
      fetchingRef.current = false;
    }
  }, [authState.isAuthenticated, makeAuthenticatedRequest, state.status]);

  /**
   * Сброс состояния данных
   */
  const resetState = useCallback(() => {
    console.log("Сброс состояния попыток");
    setState({
      status: null,
      isLoading: false,
      error: null,
    });
    initializingRef.current = false;
  }, []);

  /**
   * Очистка состояния ошибки
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Быстрая инициализация данных попыток при аутентификации
   */
  useEffect(() => {
    if (
      authState.isAuthenticated &&
      !state.status &&
      !state.isLoading &&
      !fetchingRef.current &&
      !initializingRef.current
    ) {
      initializingRef.current = true;
      console.log("Быстрая инициализация данных попыток...");
      
      // Используем флаг isInitialLoad для предотвращения показа лоадера
      fetchAttemptsStatus(true).finally(() => {
        initializingRef.current = false;
      });
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