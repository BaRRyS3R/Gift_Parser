// src/hooks/modules/useAuth.ts - Authentication module for user management

import { useState, useCallback, useRef } from 'react';
import type { User, TelegramUser } from '@/lib/supabase';

// Authentication state interface
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    isRegistering: boolean;
    error: string | null;
}

// Authentication tokens
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// Registration response with referral bonus
export interface RegistrationResult {
    success: boolean;
    user?: User;
    tokens?: AuthTokens;
    referralBonus?: {
        received: number;
        referrerName?: string;
        referrerUsername?: string;
    };
    error?: string;
}

// Login response
export interface LoginResult {
    success: boolean;
    user?: User;
    tokens?: AuthTokens;
    error?: string;
}

// Storage keys for tokens
const TOKEN_STORAGE_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
} as const;

// API endpoints
const API_ENDPOINTS = {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
} as const;

/**
 * Authentication module hook
 */
export function useAuth() {
    // State management
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isRegistering: false,
        error: null,
    });

    // Flag to prevent multiple simultaneous operations
    const operationInProgressRef = useRef<boolean>(false);

    /**
     * Store authentication tokens securely
     */
    const storeTokens = useCallback((tokens: AuthTokens) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
                localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            }
        } catch (error) {
            console.error('Error storing tokens:', error);
        }
    }, []);

    /**
     * Retrieve stored authentication tokens
     */
    const getStoredTokens = useCallback((): AuthTokens | null => {
        try {
            if (typeof window !== 'undefined') {
                const accessToken = localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
                const refreshToken = localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);

                if (accessToken && refreshToken) {
                    return { accessToken, refreshToken };
                }
            }
        } catch (error) {
            console.error('Error retrieving tokens:', error);
        }
        return null;
    }, []);

    /**
     * Clear stored authentication tokens
     */
    const clearTokens = useCallback(() => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
                localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
            }
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }, []);

    /**
     * Make authenticated API request
     */
    const makeAuthenticatedRequest = useCallback(async (
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Response> => {
        const tokens = getStoredTokens();

        if (!tokens) {
            throw new Error('No authentication tokens available');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`,
            ...options.headers,
        };

        const response = await fetch(endpoint, {
            ...options,
            headers,
        });

        // Handle token expiration
        if (response.status === 401) {
            // Try to refresh token
            try {
                const refreshResult = await refreshAuthToken();
                if (refreshResult.success && refreshResult.tokens) {
                    // Retry with new token
                    const retryHeaders = {
                        ...headers,
                        'Authorization': `Bearer ${refreshResult.tokens.accessToken}`,
                    };

                    return fetch(endpoint, {
                        ...options,
                        headers: retryHeaders,
                    });
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Clear invalid tokens and redirect to auth
                clearTokens();
                setAuthState(prev => ({
                    ...prev,
                    isAuthenticated: false,
                    user: null,
                    error: 'Session expired. Please log in again.',
                }));
            }
        }

        return response;
    }, [getStoredTokens, clearTokens]);

    /**
     * Register new user
     */
    const register = useCallback(async (
        initData: string,
        referralCode?: string
    ): Promise<RegistrationResult> => {
        if (operationInProgressRef.current) {
            return { success: false, error: 'Registration already in progress' };
        }

        operationInProgressRef.current = true;

        setAuthState(prev => ({
            ...prev,
            isRegistering: true,
            isLoading: true,
            error: null,
        }));

        try {
            const response = await fetch(API_ENDPOINTS.REGISTER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData,
                    referralCode,
                }),
            });

            const result = await response.json();

            if (result.success && result.user && result.tokens) {
                // Store tokens
                storeTokens(result.tokens);

                // Update auth state
                setAuthState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    user: result.user,
                    isRegistering: false,
                    isLoading: false,
                    error: null,
                }));

                console.log('Registration successful:', result.user.first_name);

                return {
                    success: true,
                    user: result.user,
                    tokens: result.tokens,
                    referralBonus: result.referralBonus,
                };
            } else {
                const errorMessage = result.error || 'Registration failed';

                setAuthState(prev => ({
                    ...prev,
                    isRegistering: false,
                    isLoading: false,
                    error: errorMessage,
                }));

                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';

            setAuthState(prev => ({
                ...prev,
                isRegistering: false,
                isLoading: false,
                error: errorMessage,
            }));

            return { success: false, error: errorMessage };
        } finally {
            operationInProgressRef.current = false;
        }
    }, [storeTokens]);

    /**
     * Login existing user
     */
    const login = useCallback(async (initData: string): Promise<LoginResult> => {
        if (operationInProgressRef.current) {
            return { success: false, error: 'Login already in progress' };
        }

        operationInProgressRef.current = true;

        setAuthState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
        }));

        try {
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData,
                }),
            });

            const result = await response.json();

            if (result.success && result.user && result.tokens) {
                // Store tokens
                storeTokens(result.tokens);

                // Update auth state
                setAuthState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    user: result.user,
                    isLoading: false,
                    error: null,
                }));

                console.log('Login successful:', result.user.first_name);

                return {
                    success: true,
                    user: result.user,
                    tokens: result.tokens,
                };
            } else {
                const errorMessage = result.error || 'Login failed';

                setAuthState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Login failed';

            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return { success: false, error: errorMessage };
        } finally {
            operationInProgressRef.current = false;
        }
    }, [storeTokens]);

    /**
     * Refresh authentication token
     */
    const refreshAuthToken = useCallback(async (): Promise<LoginResult> => {
        const tokens = getStoredTokens();

        if (!tokens?.refreshToken) {
            return { success: false, error: 'No refresh token available' };
        }

        try {
            const response = await fetch(API_ENDPOINTS.REFRESH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens.refreshToken}`,
                },
            });

            const result = await response.json();

            if (result.success && result.tokens) {
                storeTokens(result.tokens);

                if (result.user) {
                    setAuthState(prev => ({
                        ...prev,
                        user: result.user,
                        isAuthenticated: true,
                    }));
                }

                return {
                    success: true,
                    tokens: result.tokens,
                    user: result.user,
                };
            } else {
                clearTokens();
                setAuthState(prev => ({
                    ...prev,
                    isAuthenticated: false,
                    user: null,
                }));

                return { success: false, error: result.error || 'Token refresh failed' };
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            clearTokens();

            setAuthState(prev => ({
                ...prev,
                isAuthenticated: false,
                user: null,
            }));

            return { success: false, error: 'Token refresh failed' };
        }
    }, [getStoredTokens, storeTokens, clearTokens]);

    /**
     * Logout user
     */
    const logout = useCallback(() => {
        clearTokens();
        setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isRegistering: false,
            error: null,
        });

        console.log('User logged out successfully');
    }, [clearTokens]);

    /**
     * Check if user is authenticated with stored tokens
     */
    const checkAuthStatus = useCallback(async (): Promise<boolean> => {
        const tokens = getStoredTokens();

        if (!tokens) {
            return false;
        }

        try {
            const refreshResult = await refreshAuthToken();
            return refreshResult.success;
        } catch (error) {
            console.error('Auth status check failed:', error);
            return false;
        }
    }, [getStoredTokens, refreshAuthToken]);

    /**
     * Clear authentication error
     */
    const clearError = useCallback(() => {
        setAuthState(prev => ({
            ...prev,
            error: null,
        }));
    }, []);

    return {
        // State
        authState,

        // Actions
        register,
        login,
        logout,
        refreshAuthToken,
        checkAuthStatus,
        clearError,

        // Utilities
        makeAuthenticatedRequest,
        getStoredTokens,
    };
}