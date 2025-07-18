// src/hooks/modules/useAttempts.ts - Обновленный хук с экспортированным типом для централизованного управления

import { useState, useCallback, useEffect, useRef } from "react";

export interface AttemptsStatus {
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: Date;
    timeUntilReset?: number;
}

interface AttemptsState {
    status: AttemptsStatus | null;
    isLoading: boolean;
    error: string | null;
    lastUpdate: number;
}

const CACHE_DURATION = 30000;

/**
 * ИСПРАВЛЕНО: Хук теперь принимает зависимости как параметры
 */
export function useAttempts(
    makeAuthenticatedRequest: (
        endpoint: string,
        options?: RequestInit,
    ) => Promise<Response>,
    isAuthenticated: boolean,
) {
    const [state, setState] = useState<AttemptsState>({
        status: null,
        isLoading: false,
        error: null,
        lastUpdate: 0,
    });

    const fetchingRef = useRef<boolean>(false);

    const fetchAttemptsStatus = useCallback(
        async (forceRefresh = false): Promise<AttemptsStatus | null> => {
            const now = Date.now();
            const isCacheValid =
                state.status &&
                !forceRefresh &&
                now - state.lastUpdate < CACHE_DURATION;

            if (isCacheValid && !forceRefresh) {
                console.log("Using cached attempts status");
                return state.status;
            }

            if (fetchingRef.current) {
                console.log("Attempts fetch already in progress");
                return state.status;
            }

            if (!isAuthenticated) {
                console.log("User not authenticated, cannot fetch attempts");
                return null;
            }

            fetchingRef.current = true;
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                console.log("Fetching attempts status from server...");

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
                    lastUpdate: now,
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
        [state.status, state.lastUpdate, isAuthenticated, makeAuthenticatedRequest],
    );

    const consumeAttempt = useCallback(async (): Promise<AttemptsStatus | null> => {
        if (!isAuthenticated) {
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
                lastUpdate: Date.now(),
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
    }, [isAuthenticated, makeAuthenticatedRequest, state.status]);

    const getCachedStatus = useCallback((): AttemptsStatus | null => {
        const now = Date.now();
        const isCacheValid =
            state.status && now - state.lastUpdate < CACHE_DURATION;

        return isCacheValid ? state.status : null;
    }, [state.status, state.lastUpdate]);

    const invalidateCache = useCallback(() => {
        console.log("Invalidating attempts cache");
        setState((prev) => ({
            ...prev,
            lastUpdate: 0,
        }));
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    // ИСПРАВЛЕНО: useEffect теперь не зависит от внешних хуков
    useEffect(() => {
        if (
            isAuthenticated &&
            !state.status &&
            !state.isLoading &&
            !fetchingRef.current
        ) {
            console.log("Initializing attempts data...");
            fetchAttemptsStatus();
        }
    }, [isAuthenticated, state.status, state.isLoading, fetchAttemptsStatus]);

    return {
        attemptsStatus: state.status,
        isLoading: state.isLoading,
        error: state.error,
        fetchAttemptsStatus,
        consumeAttempt,
        getCachedStatus,
        invalidateCache,
        clearError,
        canPlay: state.status?.canPlay ?? false,
        attemptsRemaining: state.status?.attemptsRemaining ?? 0,
        hasValidCache:
            state.status && Date.now() - state.lastUpdate < CACHE_DURATION,
    };
}
