// src/hooks/useAttempts.ts - Specialized hook for managing user attempts

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from './useUser';

// Attempts status interface
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
 * Specialized hook for managing user attempts with server-side validation
 */
export function useAttempts() {
    const { makeAuthenticatedRequest, authState } = useUser();
    const [state, setState] = useState<AttemptsState>({
        status: null,
        isLoading: false,
        error: null,
        lastUpdate: 0,
    });

    // Track if we're currently fetching to prevent duplicate requests
    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch attempts status from server
     */
    const fetchAttemptsStatus = useCallback(async (forceRefresh = false): Promise<AttemptsStatus | null> => {
        // Check if we need to fetch (cache validity or force refresh)
        const now = Date.now();
        const isCacheValid = state.status && !forceRefresh && (now - state.lastUpdate) < CACHE_DURATION;

        if (isCacheValid && !forceRefresh) {
            console.log('Using cached attempts status');
            return state.status;
        }

        // Prevent duplicate requests
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
     * Consume one attempt
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
     * Get cached attempts status (if valid)
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
     * Invalidate cache and force refresh
     */
    const invalidateCache = useCallback(() => {
        console.log('Invalidating attempts cache');
        setState(prev => ({
            ...prev,
            lastUpdate: 0, // Force cache invalidation
        }));
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Initialize attempts data on first load
     */
    useEffect(() => {
        if (authState.isAuthenticated && !state.status && !state.isLoading && !fetchingRef.current) {
            console.log('Initializing attempts data...');
            fetchAttemptsStatus();
        }
    }, [authState.isAuthenticated, state.status, state.isLoading, fetchAttemptsStatus]);

    return {
        // Current state
        attemptsStatus: state.status,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchAttemptsStatus,
        consumeAttempt,
        getCachedStatus,
        invalidateCache,
        clearError,

        // Computed values
        canPlay: state.status?.canPlay ?? false,
        attemptsRemaining: state.status?.attemptsRemaining ?? 0,
        hasValidCache: state.status && (Date.now() - state.lastUpdate) < CACHE_DURATION,
    };
}