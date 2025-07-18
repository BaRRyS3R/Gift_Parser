// src/hooks/useAttempts.ts - Обновленный хук с экспортированным типом для централизованного управления

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from './useUser';

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
    lastUpdate: number;
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

/**
 * Специализированный хук для управления попытками пользователя с серверной валидацией
 * Обеспечивает централизованное управление состоянием, кэширование и предотвращение дублирующих запросов
 */
export function useAttempts() {
    const { makeAuthenticatedRequest, authState } = useUser();
    const [state, setState] = useState<AttemptsState>({
        status: null,
        isLoading: false,
        error: null,
        lastUpdate: 0,
    });

    // Отслеживание текущих запросов для предотвращения дублирования
    const fetchingRef = useRef<boolean>(false);

    /**
     * Получение статуса попыток с сервера с поддержкой кэширования
     * @param forceRefresh - принудительное обновление данных, игнорируя кэш
     */
    const fetchAttemptsStatus = useCallback(async (forceRefresh = false): Promise<AttemptsStatus | null> => {
        // Проверка валидности кэша
        const now = Date.now();
        const isCacheValid = state.status && !forceRefresh && (now - state.lastUpdate) < CACHE_DURATION;

        if (isCacheValid && !forceRefresh) {
            console.log('Using cached attempts status');
            return state.status;
        }

        // Предотвращение дублирующих запросов
        if (fetchingRef.current) {
            console.log('Attempts fetch already in progress');
            return state.status;
        }

        if (!authState.isAuthenticated) {
            console.log('User not authenticated, cannot fetch attempts');
            return null;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching attempts status from server...');

            const response = await makeAuthenticatedRequest('/api/user/attempts/status');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to get attempts status');
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
                lastUpdate: now,
            });

            console.log('Successfully fetched attempts status:', attemptsStatus);
            return attemptsStatus;

        } catch (error) {
            console.error('Error fetching attempts status:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return null;
        } finally {
            fetchingRef.current = false;
        }
    }, [state.status, state.lastUpdate, authState.isAuthenticated, makeAuthenticatedRequest]);

    /**
     * Потребление одной попытки с серверной валидацией
     */
    const consumeAttempt = useCallback(async (): Promise<AttemptsStatus | null> => {
        if (!authState.isAuthenticated) {
            console.log('User not authenticated, cannot consume attempt');
            return null;
        }

        if (fetchingRef.current) {
            console.log('Attempt consumption already in progress');
            return state.status;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Consuming attempt...');

            const response = await makeAuthenticatedRequest('/api/user/attempts/consume', {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to consume attempt');
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
                lastUpdate: Date.now(),
            });

            console.log('Successfully consumed attempt:', attemptsStatus);
            return attemptsStatus;

        } catch (error) {
            console.error('Error consuming attempt:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
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
     * Получение кэшированного статуса попыток (если валиден)
     */
    const getCachedStatus = useCallback((): AttemptsStatus | null => {
        const now = Date.now();
        const isCacheValid = state.status && (now - state.lastUpdate) < CACHE_DURATION;

        if (isCacheValid) {
            return state.status;
        }

        return null;
    }, [state.status, state.lastUpdate]);

    /**
     * Инвалидация кэша и принудительное обновление
     */
    const invalidateCache = useCallback(() => {
        console.log('Invalidating attempts cache');
        setState(prev => ({
            ...prev,
            lastUpdate: 0, // Принудительная инвалидация кэша
        }));
    }, []);

    /**
     * Очистка состояния ошибки
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Инициализация данных попыток при первой загрузке
     */
    useEffect(() => {
        if (authState.isAuthenticated && !state.status && !state.isLoading && !fetchingRef.current) {
            console.log('Initializing attempts data...');
            fetchAttemptsStatus();
        }
    }, [authState.isAuthenticated, state.status, state.isLoading, fetchAttemptsStatus]);

    return {
        // Текущее состояние
        attemptsStatus: state.status,
        isLoading: state.isLoading,
        error: state.error,

        // Действия
        fetchAttemptsStatus,
        consumeAttempt,
        getCachedStatus,
        invalidateCache,
        clearError,

        // Вычисляемые значения для удобства
        canPlay: state.status?.canPlay ?? false,
        attemptsRemaining: state.status?.attemptsRemaining ?? 0,
        hasValidCache: state.status && (Date.now() - state.lastUpdate) < CACHE_DURATION,
    };
}