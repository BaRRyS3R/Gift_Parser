// src/lib/authService.ts - Updated with getLeagueProgress method

import {
    GameSaveResult,
    AttemptsStatus,
    SecurityCheckResult,
    userService,
} from "@/lib/supabase";
import {
    ReactionGameResult,
    SurvivalGameResult,
    PhysicsGameResult,
    RotationGameResult,
} from "@/types/game-modes";
import { TournamentSaveResponse } from "@/lib/supabase_tournament_extension";

export interface AuthUser {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    current_level: number;
    attempts_remaining: number;
    total_games: number;
    trust_score: number; // NEW: Security field
    blocked_until?: string; // NEW: Security field
}

export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// NEW: League progress interface
export interface LeagueProgressInfo {
    currentLevel: number;
    totalGames: number;
    currentLeague: {
        id: number;
        name: string;
        display_name_en: string;
        color: string;
        icon: string;
    };
    nextLeague?: {
        id: number;
        name: string;
        display_name_en: string;
        color: string;
        icon: string;
    };
    gamesToNextLeague: number;
    progressPercent: number;
    isMaxLeague: boolean;
}

type GameResult =
    | ReactionGameResult
    | SurvivalGameResult
    | PhysicsGameResult
    | RotationGameResult;

class AuthService {
    private token: string | null = null;
    private baseUrl: string;

    constructor() {
        this.baseUrl = this.getApiBaseUrl();
        this.loadTokenFromStorage();
    }

    /**
     * Get proper API base URL based on environment
     */
    private getApiBaseUrl(): string {
        if (typeof window !== "undefined") {
            if (process.env.NODE_ENV === "production") {
                return window.location.origin;
            }

            if (process.env.NEXT_PUBLIC_API_URL) {
                return process.env.NEXT_PUBLIC_API_URL;
            }

            return window.location.origin;
        }

        return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    }

    /**
     * Load JWT token from localStorage
     */
    private loadTokenFromStorage(): void {
        if (typeof window !== "undefined") {
            this.token = localStorage.getItem("auth_token");
        }
    }

    /**
     * Save JWT token to localStorage
     */
    private saveTokenToStorage(token: string): void {
        if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", token);
            this.token = token;
        }
    }

    /**
     * Remove JWT token from localStorage
     */
    private removeTokenFromStorage(): void {
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            this.token = null;
        }
    }

    /**
     * Get authorization headers for API requests
     */
    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make authenticated API request with better error handling
     */
    private async makeAuthenticatedRequest<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<T> {
        const url = `${this.baseUrl}/api${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getAuthHeaders(),
                    ...options.headers,
                },
            });

            if (response.status === 401) {
                this.removeTokenFromStorage();
                throw new Error("Authentication expired. Please log in again.");
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(
                    errorData.message || `Request failed with status ${response.status}`,
                );
            }

            return response.json();
        } catch (error) {
            if (
                error instanceof TypeError &&
                error.message.includes("Failed to fetch")
            ) {
                console.error(
                    "Network error - check your connection and API URL:",
                    url,
                );
                throw new Error(
                    "Network connection failed. Please check your internet connection.",
                );
            }
            throw error;
        }
    }

    /**
     * Authenticate user with Telegram WebApp data
     */
    async authenticateWithTelegram(
        initData: string,
        referralCode?: string,
    ): Promise<AuthUser> {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    initData,
                    referralCode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(errorData.message || "Authentication failed");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Authentication failed");
            }

            this.saveTokenToStorage(data.token);

            return data.user;
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.error("Authentication error:", error);
            }
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.token !== null;
    }

    /**
     * Get current token
     */
    getToken(): string | null {
        return this.token;
    }

    /**
     * Sign out user
     */
    signOut(): void {
        this.removeTokenFromStorage();
    }

    /**
     * NEW: Get current attempts status via API
     */
    async getAttemptsStatus(): Promise<AttemptsStatus> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            "/user/attempts-status",
        ).then((data) => data.attemptsStatus);
    }

    /**
     * NEW: Refresh user data via API
     */
    async refreshUserData(): Promise<AuthUser> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{ user: AuthUser }>(
            "/user/profile",
        ).then((data) => data.user);
    }

    /**
     * NEW: Check user security status via API
     */
    async checkUserSecurityStatus(): Promise<SecurityCheckResult> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{
            securityResult: SecurityCheckResult;
        }>("/security/check-status").then((data) => data.securityResult);
    }

    /**
     * NEW: Get league progress via API
     */
    async getLeagueProgress(): Promise<LeagueProgressInfo> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{ progressInfo: LeagueProgressInfo }>(
            "/leagues/progress",
        ).then((data) => data.progressInfo);
    }

    // ============================================================================
    // EXISTING METHODS - Keep all existing functionality unchanged
    // ============================================================================

    /**
     * Consume an attempt for game
     */
    async consumeAttempt(): Promise<AttemptsStatus> {
        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            "/game/consume-attempt",
            { method: "POST" },
        ).then((data) => data.attemptsStatus);
    }

    /**
     * Save game result securely
     */
    async saveGameResult(gameResult: GameResult): Promise<GameSaveResult> {
        return this.makeAuthenticatedRequest<{ saveResult: GameSaveResult }>(
            "/game/save-result",
            {
                method: "POST",
                body: JSON.stringify(gameResult),
            },
        ).then((data) => data.saveResult);
    }

    /**
     * Save tournament result securely
     */
    async saveTournamentResult(
        tournamentId: string,
        gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> {
        return this.makeAuthenticatedRequest<{
            tournamentResult: TournamentSaveResponse;
        }>("/tournament/save-result", {
            method: "POST",
            body: JSON.stringify({
                tournamentId,
                gameResult,
            }),
        }).then((data) => data.tournamentResult);
    }

    /**
     * Generate captcha challenge
     */
    async generateCaptcha(): Promise<{
        challenge: string;
        correctAnswer: string;
        expiresAt: number;
    }> {
        return this.makeAuthenticatedRequest<{
            challenge: string;
            correctAnswer: string;
            expiresAt: number;
        }>("/security/generate-captcha", { method: "POST" });
    }

    /**
     * Validate captcha response
     */
    async validateCaptcha(
        userInput: string,
        correctAnswer: string,
        completedInTime: boolean,
    ): Promise<{ success: boolean; newTrustScore: number }> {
        return this.makeAuthenticatedRequest<{
            success: boolean;
            newTrustScore: number;
        }>("/security/validate-captcha", {
            method: "POST",
            body: JSON.stringify({
                userInput,
                correctAnswer,
                completedInTime,
            }),
        });
    }

    /**
     * Validate biometric authentication
     */
    async validateBiometric(
        success: boolean,
        completedInTime: boolean,
    ): Promise<{ success: boolean; newTrustScore: number }> {
        return this.makeAuthenticatedRequest<{
            success: boolean;
            newTrustScore: number;
        }>("/security/validate-biometric", {
            method: "POST",
            body: JSON.stringify({
                success,
                completedInTime,
            }),
        });
    }

    /**
     * Update user trust score
     */
    async updateTrustScore(scoreChange: number): Promise<number> {
        return this.makeAuthenticatedRequest<{ newTrustScore: number }>(
            "/security/update-trust-score",
            {
                method: "POST",
                body: JSON.stringify({ scoreChange }),
            },
        ).then((data) => data.newTrustScore);
    }

    /**
     * Check if user is blocked (fallback method using direct service)
     */
    async checkUserBlockedStatus(
        telegramId: number,
    ): Promise<SecurityCheckResult> {
        try {
            // Try authenticated API first
            if (this.isAuthenticated()) {
                return await this.checkUserSecurityStatus();
            } else {
                // Fallback to direct service call for non-authenticated users
                console.warn("User not authenticated, using direct service call");

                return await userService.checkUserBlockStatus(telegramId);
            }
        } catch (error) {
            // Fallback to direct service call
            console.warn("Auth API failed, using direct service call");

            return await userService.checkUserBlockStatus(telegramId);
        }
    }

    /**
     * Handle network errors with retry logic
     */
    async makeRequestWithRetry<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000,
    ): Promise<T> {
        let lastError: Error = new Error("Unknown error");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt === maxRetries) {
                    throw lastError;
                }

                await new Promise((resolve) => setTimeout(resolve, delay * attempt));
            }
        }

        throw lastError;
    }
}

// Singleton instance
export const authService = new AuthService();

// Helper functions for backward compatibility - KEEP ALL EXISTING FUNCTIONS
export async function authenticateUser(
    initData: string,
    referralCode?: string,
): Promise<AuthUser> {
    return authService.authenticateWithTelegram(initData, referralCode);
}

export function isUserAuthenticated(): boolean {
    return authService.isAuthenticated();
}

export function signOutUser(): void {
    authService.signOut();
}

export async function getSecureAttemptsStatus(): Promise<AttemptsStatus> {
    return authService.getAttemptsStatus();
}

export async function consumeSecureAttempt(): Promise<AttemptsStatus> {
    return authService.consumeAttempt();
}

export async function saveSecureGameResult(
    gameResult: GameResult,
): Promise<GameSaveResult> {
    return authService.saveGameResult(gameResult);
}

export async function saveSecureTournamentResult(
    tournamentId: string,
    gameResult: SurvivalGameResult,
): Promise<TournamentSaveResponse> {
    return authService.saveTournamentResult(tournamentId, gameResult);
}

// NEW: Security helper functions
export async function checkSecurityStatus(): Promise<SecurityCheckResult> {
    return authService.checkUserSecurityStatus();
}

export async function generateSecureCaptcha(): Promise<{
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
}> {
    return authService.generateCaptcha();
}

export async function validateSecureCaptcha(
    userInput: string,
    correctAnswer: string,
    completedInTime: boolean,
): Promise<{ success: boolean; newTrustScore: number }> {
    return authService.validateCaptcha(userInput, correctAnswer, completedInTime);
}

export async function validateSecureBiometric(
    success: boolean,
    completedInTime: boolean,
): Promise<{ success: boolean; newTrustScore: number }> {
    return authService.validateBiometric(success, completedInTime);
}

export async function updateSecureTrustScore(
    scoreChange: number,
): Promise<number> {
    return authService.updateTrustScore(scoreChange);
}

// NEW: League progress helper function
export async function getSecureLeagueProgress(): Promise<LeagueProgressInfo> {
    return authService.getLeagueProgress();
}