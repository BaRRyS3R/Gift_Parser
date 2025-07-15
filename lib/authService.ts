// src/lib/authService.ts - Updated with correct tournament type imports

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

// FIXED: Import tournament types from correct location
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus,
    TournamentListResponse,
    TournamentWithStatus,
} from "@/types/tournaments";
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
     * Check login status (for existing users)
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
     * Register new user
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
     * Legacy method for backward compatibility
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
    // GAME METHODS
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

    // ============================================================================
    // TOURNAMENT METHODS - Complete implementation with secured API calls
    // ============================================================================

    /**
     * Get active tournament
     */
    async getActiveTournament(): Promise<Tournament | null> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await this.makeAuthenticatedRequest<{
                tournament: Tournament | null;
            }>("/tournament/active");

            return response.tournament;
        } catch (error) {
            console.error("Error getting active tournament:", error);
            return null;
        }
    }

    /**
     * Get all tournaments categorized by status
     */
    async getAllTournaments(): Promise<TournamentListResponse> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await this.makeAuthenticatedRequest<{
                tournaments: TournamentListResponse;
            }>("/tournament/all");

            return response.tournaments;
        } catch (error) {
            console.error("Error getting all tournaments:", error);
            return {
                active: [],
                upcoming: [],
                completed: [],
            };
        }
    }

    /**
     * Get tournament status
     */
    async getTournamentStatus(): Promise<TournamentStatus> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await this.makeAuthenticatedRequest<{
                status: TournamentStatus;
            }>("/tournament/status");

            return response.status;
        } catch (error) {
            console.error("Error getting tournament status:", error);
            return {
                isActive: false,
                activeTournament: null,
            };
        }
    }

    /**
     * Get tournament leaderboard
     */
    async getTournamentLeaderboard(
        tournamentId: string,
        limit: number = 50,
    ): Promise<TournamentLeaderboardEntry[]> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await this.makeAuthenticatedRequest<{
                leaderboard: TournamentLeaderboardEntry[];
            }>(`/tournament/leaderboard?tournamentId=${tournamentId}&limit=${limit}`);

            return response.leaderboard;
        } catch (error) {
            console.error("Error getting tournament leaderboard:", error);
            return [];
        }
    }

    /**
     * Get user tournament result
     */
    async getUserTournamentResult(
        tournamentId: string,
    ): Promise<TournamentResult | null> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await this.makeAuthenticatedRequest<{
                result: TournamentResult | null;
            }>(`/tournament/user-result?tournamentId=${tournamentId}`);

            return response.result;
        } catch (error) {
            console.error("Error getting user tournament result:", error);
            return null;
        }
    }

    /**
     * Save tournament result
     */
    async saveTournamentResult(
        tournamentId: string,
        gameResult: SurvivalGameResult,
    ): Promise<TournamentSaveResponse> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

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
     * Get tournament winners (top N participants)
     */
    async getTournamentWinners(
        tournamentId: string,
        prizeCount: number,
    ): Promise<TournamentLeaderboardEntry[]> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const leaderboard = await this.getTournamentLeaderboard(tournamentId, prizeCount);
            return leaderboard.slice(0, prizeCount);
        } catch (error) {
            console.error("Error getting tournament winners:", error);
            return [];
        }
    }

    /**
     * Check if user has participated in tournament
     */
    async hasUserParticipated(tournamentId: string): Promise<boolean> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            const result = await this.getUserTournamentResult(tournamentId);
            return result !== null;
        } catch (error) {
            console.error("Error checking user participation:", error);
            return false;
        }
    }

    /**
     * Get tournament by ID
     */
    async getTournamentById(tournamentId: string): Promise<Tournament | null> {
        if (!this.isAuthenticated()) {
            throw new Error("User not authenticated");
        }

        try {
            // For now, get from all tournaments and find by ID
            // Could be optimized with a dedicated endpoint if needed
            const allTournaments = await this.getAllTournaments();
            const allTournamentsList = [
                ...allTournaments.active,
                ...allTournaments.upcoming,
                ...allTournaments.completed,
            ];

            return allTournamentsList.find(t => t.id === tournamentId) || null;
        } catch (error) {
            console.error("Error getting tournament by ID:", error);
            return null;
        }
    }

    // ============================================================================
    // SECURITY METHODS
    // ============================================================================

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

// Registration helper functions
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