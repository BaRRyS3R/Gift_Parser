// src/lib/authService.ts - Client-side authentication service with JWT integration

import { GameSaveResult, AttemptsStatus } from '@/lib/supabase';
import {
    ReactionGameResult,
    SurvivalGameResult,
    PhysicsGameResult,
    RotationGameResult
} from '@/types/game-modes';
import { TournamentSaveResponse } from '@/lib/supabase_tournament_extension';

export interface AuthUser {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    current_level: number;
    attempts_remaining: number;
    total_games: number;
}

export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

class AuthService {
    private token: string | null = null;
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        this.loadTokenFromStorage();
    }

    /**
     * Load JWT token from localStorage
     */
    private loadTokenFromStorage(): void {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
    }

    /**
     * Save JWT token to localStorage
     */
    private saveTokenToStorage(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
            this.token = token;
        }
    }

    /**
     * Remove JWT token from localStorage
     */
    private removeTokenFromStorage(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            this.token = null;
        }
    }

    /**
     * Get authorization headers for API requests
     */
    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make authenticated API request
     */
    private async makeAuthenticatedRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}/api${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            // Token expired or invalid - clear authentication
            this.removeTokenFromStorage();
            throw new Error('Authentication expired. Please log in again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    /**
     * Authenticate user with Telegram WebApp data
     */
    async authenticateWithTelegram(initData: string, referralCode?: string): Promise<AuthUser> {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData,
                    referralCode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Authentication failed');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Save token and return user data
            this.saveTokenToStorage(data.token);
            return data.user;
        } catch (error) {
            console.error('Authentication error:', error);
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
     * Get current attempts status
     */
    async getAttemptsStatus(): Promise<AttemptsStatus> {
        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            '/user/attempts-status'
        ).then(data => data.attemptsStatus);
    }

    /**
     * Consume an attempt for game
     */
    async consumeAttempt(): Promise<AttemptsStatus> {
        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            '/game/consume-attempt',
            { method: 'POST' }
        ).then(data => data.attemptsStatus);
    }

    /**
     * Save game result securely
     */
    async saveGameResult(gameResult: GameResult): Promise<GameSaveResult> {
        return this.makeAuthenticatedRequest<{ saveResult: GameSaveResult }>(
            '/game/save-result',
            {
                method: 'POST',
                body: JSON.stringify(gameResult),
            }
        ).then(data => data.saveResult);
    }

    /**
     * Save tournament result securely
     */
    async saveTournamentResult(
        tournamentId: string,
        gameResult: SurvivalGameResult
    ): Promise<TournamentSaveResponse> {
        return this.makeAuthenticatedRequest<{ tournamentResult: TournamentSaveResponse }>(
            '/tournament/save-result',
            {
                method: 'POST',
                body: JSON.stringify({
                    tournamentId,
                    gameResult,
                }),
            }
        ).then(data => data.tournamentResult);
    }

    /**
     * Refresh user data
     */
    async refreshUserData(): Promise<AuthUser> {
        return this.makeAuthenticatedRequest<{ user: AuthUser }>(
            '/user/profile'
        ).then(data => data.user);
    }

    /**
     * Handle network errors with retry logic
     */
    async makeRequestWithRetry<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error = new Error('Unknown error');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }

        throw lastError;
    }
}

// Singleton instance
export const authService = new AuthService();

// Helper functions for backward compatibility
export async function authenticateUser(initData: string, referralCode?: string): Promise<AuthUser> {
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

export async function saveSecureGameResult(gameResult: GameResult): Promise<GameSaveResult> {
    return authService.saveGameResult(gameResult);
}

export async function saveSecureTournamentResult(
    tournamentId: string,
    gameResult: SurvivalGameResult
): Promise<TournamentSaveResponse> {
    return authService.saveTournamentResult(tournamentId, gameResult);
}