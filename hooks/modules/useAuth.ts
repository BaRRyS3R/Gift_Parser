// src/hooks/modules/useAuth.ts - Fixed 404 handling for new users

import type { User } from "@/lib/supabase";

import { useState, useCallback, useRef } from "react";

// [Previous interfaces remain the same...]
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    isRegistering: boolean;
    error: string | null;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegistrationResult {
    success: boolean;
    user?: {
        id: string;
        telegram_id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
        is_premium: boolean;
        trust_score: number;
        blocked_until?: string;
        current_level: number;
        total_games: number;
        attempts_remaining: number;
        referral_code: string;
        created_at: string;
    };
    tokens?: AuthTokens;
    referralBonus?: {
        received: number;
        referrerName?: string;
        referrerUsername?: string;
    };
    error?: string;
}

export interface LoginResult {
    success: boolean;
    user?: {
        id: string;
        telegram_id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
        is_premium: boolean;
        trust_score: number;
        blocked_until?: string;
        current_level: number;
        current_league_id?: number;
        total_games: number;
        total_score: number;
        best_score: number;
        attempts_remaining: number;
        last_attempt_at?: string;
        attempts_reset_at?: string;
        referral_code: string;
        referral_count: number;
        created_at: string;
        updated_at: string;
        last_played_at?: string;
    };
    tokens?: AuthTokens;
    // Nebula security fields
    security?: {
        blocked: boolean;
        verificationRequired: boolean;
        verificationType?: "captcha" | "biometric" | "gyroscope";
        trustScore: number;
        blockInfo?: any;
    };
    error?: string;
}

const TOKEN_STORAGE_KEYS = {
    ACCESS_TOKEN: "auth_access_token",
    REFRESH_TOKEN: "auth_refresh_token",
} as const;

const API_ENDPOINTS = {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
} as const;

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isRegistering: false,
        error: null,
    });

    const operationInProgressRef = useRef<boolean>(false);

    const storeTokens = useCallback((tokens: AuthTokens) => {
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(
                    TOKEN_STORAGE_KEYS.ACCESS_TOKEN,
                    tokens.accessToken,
                );
                localStorage.setItem(
                    TOKEN_STORAGE_KEYS.REFRESH_TOKEN,
                    tokens.refreshToken,
                );
            }
        } catch (error) {
            console.error("Error storing tokens:", error);
        }
    }, []);

    const getStoredTokens = useCallback((): AuthTokens | null => {
        try {
            if (typeof window !== "undefined") {
                const accessToken = localStorage.getItem(
                    TOKEN_STORAGE_KEYS.ACCESS_TOKEN,
                );
                const refreshToken = localStorage.getItem(
                    TOKEN_STORAGE_KEYS.REFRESH_TOKEN,
                );

                if (accessToken && refreshToken) {
                    return { accessToken, refreshToken };
                }
            }
        } catch (error) {
            console.error("Error retrieving tokens:", error);
        }

        return null;
    }, []);

    const clearTokens = useCallback(() => {
        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
                localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
            }
        } catch (error) {
            console.error("Error clearing tokens:", error);
        }
    }, []);

    /**
     * Make authenticated API request
     */
    const makeAuthenticatedRequest = useCallback(
        async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
            const tokens = getStoredTokens();

            if (!tokens) {
                throw new Error("No authentication tokens available");
            }

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens.accessToken}`,
                ...options.headers,
            };

            const response = await fetch(endpoint, {
                ...options,
                headers,
            });

            // Handle token expiration
            if (response.status === 401) {
                try {
                    const refreshResult = await refreshAuthToken();

                    if (refreshResult.success && refreshResult.tokens) {
                        const retryHeaders = {
                            ...headers,
                            Authorization: `Bearer ${refreshResult.tokens.accessToken}`,
                        };

                        return fetch(endpoint, {
                            ...options,
                            headers: retryHeaders,
                        });
                    }
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    clearTokens();
                    setAuthState((prev) => ({
                        ...prev,
                        isAuthenticated: false,
                        user: null,
                        error: "Session expired. Please log in again.",
                    }));
                }
            }

            return response;
        },
        [getStoredTokens, clearTokens],
    );

    /**
     * FIXED: Login with proper 404 handling for new users
     */
    const login = useCallback(
        async (initData: string): Promise<LoginResult> => {
            if (operationInProgressRef.current) {
                console.log("Login already in progress, skipping...");

                return { success: false, error: "Login already in progress" };
            }

            operationInProgressRef.current = true;

            setAuthState((prev) => ({
                ...prev,
                isLoading: true,
                error: null,
            }));

            try {
                console.log("Attempting login...");

                const response = await fetch(API_ENDPOINTS.LOGIN, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        initData,
                    }),
                });

                console.log("Login response status:", response.status);

                // CRITICAL FIX: Handle 404 (user not found) as expected behavior for new users
                if (response.status === 404) {
                    console.log("User not found - this is expected for new users");

                    setAuthState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: null, // Clear any previous errors
                    }));

                    return {
                        success: false,
                        error: "USER_NOT_FOUND", // Use a specific error code
                    };
                }

                // Handle other HTTP errors
                if (!response.ok) {
                    const errorText = await response.text();

                    console.error(
                        "Login failed with status:",
                        response.status,
                        errorText,
                    );

                    const errorMessage = `Login failed: ${response.status} ${response.statusText}`;

                    setAuthState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage,
                    }));

                    return { success: false, error: errorMessage };
                }

                // Parse successful response
                const result = await response.json();

                if (result.success && result.user && result.tokens) {
                    storeTokens(result.tokens);

                    setAuthState((prev) => ({
                        ...prev,
                        isAuthenticated: true,
                        user: result.user,
                        isLoading: false,
                        error: null,
                    }));

                    console.log("Login successful:", result.user.first_name);

                    return {
                        success: true,
                        user: result.user,
                        tokens: result.tokens,
                        security: result.security, // Добавить эту строку
                    };
                } else {
                    const errorMessage = result.error || "Login failed";

                    setAuthState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage,
                    }));

                    return { success: false, error: errorMessage };
                }
            } catch (error) {
                console.error("Login error:", error);
                const errorMessage =
                    error instanceof Error ? error.message : "Login failed";

                setAuthState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return { success: false, error: errorMessage };
            } finally {
                operationInProgressRef.current = false;
            }
        },
        [storeTokens],
    );

    /**
     * Register new user
     */
    const register = useCallback(
        async (
            initData: string,
            referralCode?: string,
        ): Promise<RegistrationResult> => {
            if (operationInProgressRef.current) {
                console.log("Registration already in progress, skipping...");

                return { success: false, error: "Registration already in progress" };
            }

            operationInProgressRef.current = true;

            setAuthState((prev) => ({
                ...prev,
                isRegistering: true,
                isLoading: true,
                error: null,
            }));

            try {
                console.log("Attempting registration...");

                const response = await fetch(API_ENDPOINTS.REGISTER, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        initData,
                        referralCode,
                    }),
                });

                console.log("Registration response status:", response.status);

                if (!response.ok) {
                    const errorText = await response.text();

                    console.error(
                        "Registration failed with status:",
                        response.status,
                        errorText,
                    );
                    throw new Error(
                        `Registration failed: ${response.status} ${response.statusText}`,
                    );
                }

                const result = await response.json();

                if (result.success && result.user && result.tokens) {
                    storeTokens(result.tokens);

                    setAuthState((prev) => ({
                        ...prev,
                        isAuthenticated: true,
                        user: result.user,
                        isRegistering: false,
                        isLoading: false,
                        error: null,
                    }));

                    console.log("Registration successful:", result.user.first_name);

                    return {
                        success: true,
                        user: result.user,
                        tokens: result.tokens,
                        referralBonus: result.referralBonus,
                    };
                } else {
                    const errorMessage = result.error || "Registration failed";

                    setAuthState((prev) => ({
                        ...prev,
                        isRegistering: false,
                        isLoading: false,
                        error: errorMessage,
                    }));

                    return { success: false, error: errorMessage };
                }
            } catch (error) {
                console.error("Registration error:", error);
                const errorMessage =
                    error instanceof Error ? error.message : "Registration failed";

                setAuthState((prev) => ({
                    ...prev,
                    isRegistering: false,
                    isLoading: false,
                    error: errorMessage,
                }));

                return { success: false, error: errorMessage };
            } finally {
                operationInProgressRef.current = false;
            }
        },
        [storeTokens],
    );

    /**
     * Refresh authentication token
     */
    const refreshAuthToken = useCallback(async (): Promise<LoginResult> => {
        const tokens = getStoredTokens();

        if (!tokens?.refreshToken) {
            return { success: false, error: "No refresh token available" };
        }

        try {
            const response = await fetch(API_ENDPOINTS.REFRESH, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokens.refreshToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.tokens) {
                storeTokens(result.tokens);

                if (result.user) {
                    setAuthState((prev) => ({
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
                setAuthState((prev) => ({
                    ...prev,
                    isAuthenticated: false,
                    user: null,
                }));

                return {
                    success: false,
                    error: result.error || "Token refresh failed",
                };
            }
        } catch (error) {
            console.error("Token refresh error:", error);
            clearTokens();

            setAuthState((prev) => ({
                ...prev,
                isAuthenticated: false,
                user: null,
            }));

            return { success: false, error: "Token refresh failed" };
        }
    }, [getStoredTokens, storeTokens, clearTokens]);

    const logout = useCallback(() => {
        clearTokens();
        setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            isRegistering: false,
            error: null,
        });

        console.log("User logged out successfully");
    }, [clearTokens]);

    /**
     * FIXED: Check auth status with better error handling
     */
    const checkAuthStatus = useCallback(async (): Promise<boolean> => {
        const tokens = getStoredTokens();

        if (!tokens) {
            console.log("No stored tokens found");
            setAuthState((prev) => ({
                ...prev,
                isAuthenticated: false,
                user: null,
            }));

            return false;
        }

        try {
            console.log("Checking auth status with stored tokens...");
            const refreshResult = await refreshAuthToken();

            if (refreshResult.success) {
                console.log("Auth status check successful");

                return true;
            } else {
                console.log("Auth status check failed:", refreshResult.error);

                return false;
            }
        } catch (error) {
            console.error("Auth status check failed:", error);

            return false;
        }
    }, [getStoredTokens, refreshAuthToken]);

    const clearError = useCallback(() => {
        setAuthState((prev) => ({
            ...prev,
            error: null,
        }));
    }, []);

    return {
        authState,
        register,
        login,
        logout,
        refreshAuthToken,
        checkAuthStatus,
        clearError,
        makeAuthenticatedRequest,
        getStoredTokens,
    };
}
