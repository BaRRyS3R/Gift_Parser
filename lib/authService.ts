// src/lib/authService.ts - Updated with separate register method

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
    total_score: number;
    best_score: number;
    current_league_id?: number;
    trust_score: number;
    blocked_until?: string;
}

export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Registration result interface
export interface RegistrationResult {
    success: boolean;
    user?: AuthUser;
    token?: string;
    referralApplied?: boolean;
    referralBonus?: number;
    error?: string;
}

// Login result interface
export interface LoginResult {
    success: boolean;
    user?: AuthUser;
    token?: string;
    isExistingUser?: boolean;
    needsRegistration?: boolean;
    telegramUser?: any;
    referralCode?: string;
    error?: string;
    isBlocked?: boolean;
    timeUntilUnblock?: number;
    blockReason?: string;
}

// League progress interface
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

    private loadTokenFromStorage(): void {
        if (typeof window !== "undefined") {
            this.token = localStorage.getItem("auth_token");
        }
    }

    private saveTokenToStorage(token: string): void {
        if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", token);
            this.token = token;
        }
    }

    private removeTokenFromStorage(): void {
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            this.token = null;
        }
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        return headers;
    }

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
     * UPDATED: Check login status (for existing users)
     */
    async checkLoginStatus(
        initData: string,
        referralCode?: string,
    ): Promise<LoginResult> {
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

            const data = await response.json();

            if (response.status === 202) {
                // Registration needed
                return {
                    success: false,
                    needsRegistration: true,
                    telegramUser: data.telegramUser,
                    referralCode: data.referralCode,
                };
            }

            if (response.status === 403) {
                // User is blocked
                return {
                    success: false,
                    isBlocked: true,
                    timeUntilUnblock: data.timeUntilUnblock,
                    blockReason: data.blockReason,
                    error: data.error,
                };
            }

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    error: data.error || "Login failed",
                };
            }

            this.saveTokenToStorage(data.token);

            return {
                success: true,
                user: data.user,
                token: data.token,
                isExistingUser: data.isExistingUser,
            };
        } catch (error) {
            console.error("Login check error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Login failed",
            };
        }
    }

    /**
     * NEW: Register new user
     */
    async registerUser(
        initData: string,
        referralCode?: string,
    ): Promise<RegistrationResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    initData,
                    referralCode,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    error: data.error || "Registration failed",
                };
            }

            this.saveTokenToStorage(data.token);

            return {
                success: true,
                user: data.user,
                token: data.token,
                referralApplied: data.referralApplied,
                referralBonus: data.referralBonus,
            };
        } catch (error) {
            console.error("Registration error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Registration failed",
            };
        }
    }

    /**
     * UPDATED: Legacy method for backward compatibility
     */
    async authenticateWithTelegram(
        initData: string,
        referralCode?: string,
    ): Promise<AuthUser> {
        // First try login
        const loginResult = await this.checkLoginStatus(initData, referralCode);

        if (loginResult.success && loginResult.user) {
            return loginResult.user;
        }

        if (loginResult.isBlocked) {
            throw new Error(`User is blocked: ${loginResult.error}`);
        }

        if (loginResult.needsRegistration) {
            // Auto-register for backward compatibility
            const registerResult = await this.registerUser(initData, referralCode);

            if (registerResult.success && registerResult.user) {
                return registerResult.user;
            }

            throw new Error(registerResult.error || "Registration failed");
        }

        throw new Error(loginResult.error || "Authentication failed");
    }

    isAuthenticated(): boolean {
        return this.token !== null;
    }

    getToken(): string | null {
        return this.token;
    }

    signOut(): void {
        this.removeTokenFromStorage();
    }

    async getAttemptsStatus(): Promise<AttemptsStatus> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            "/user/attempts-status",
        ).then((data) => data.attemptsStatus);
    }

    async refreshUserData(): Promise<AuthUser> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{ user: AuthUser }>(
            "/user/profile",
        ).then((data) => data.user);
    }

    async checkUserSecurityStatus(): Promise<SecurityCheckResult> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        return this.makeAuthenticatedRequest<{
            securityResult: SecurityCheckResult;
        }>("/security/check-status").then((data) => data.securityResult);
    }

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

    async consumeAttempt(): Promise<AttemptsStatus> {
        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            "/game/consume-attempt",
            { method: "POST" },
        ).then((data) => data.attemptsStatus);
    }

    async saveGameResult(gameResult: GameResult): Promise<GameSaveResult> {
        return this.makeAuthenticatedRequest<{ saveResult: GameSaveResult }>(
            "/game/save-result",
            {
                method: "POST",
                body: JSON.stringify(gameResult),
            },
        ).then((data) => data.saveResult);
    }

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

    async updateTrustScore(scoreChange: number): Promise<number> {
        return this.makeAuthenticatedRequest<{ newTrustScore: number }>(
            "/security/update-trust-score",
            {
                method: "POST",
                body: JSON.stringify({ scoreChange }),
            },
        ).then((data) => data.newTrustScore);
    }

    async checkUserBlockedStatus(
        telegramId: number,
    ): Promise<SecurityCheckResult> {
        try {
            if (this.isAuthenticated()) {
                return await this.checkUserSecurityStatus();
            } else {
                console.warn("User not authenticated, using direct service call");
                return await userService.checkUserBlockStatus(telegramId);
            }
        } catch (error) {
            console.warn("Auth API failed, using direct service call");
            return await userService.checkUserBlockStatus(telegramId);
        }
    }

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

// Helper functions for backward compatibility
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

// Security helper functions
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

export async function getSecureLeagueProgress(): Promise<LeagueProgressInfo> {
    return authService.getLeagueProgress();
}

// NEW: Registration helper functions
export async function checkUserLoginStatus(
    initData: string,
    referralCode?: string,
): Promise<LoginResult> {
    return authService.checkLoginStatus(initData, referralCode);
}

export async function registerNewUser(
    initData: string,
    referralCode?: string,
): Promise<RegistrationResult> {
    return authService.registerUser(initData, referralCode);
}