// src/lib/authService.ts - Enhanced AuthService with bot detection integration

import { GameSaveResult, AttemptsStatus } from '@/lib/supabase';
import {
    ReactionGameResult,
    SurvivalGameResult,
    PhysicsGameResult,
    RotationGameResult
} from '@/types/game-modes';
import { TournamentSaveResponse } from '@/lib/supabase_tournament_extension';
import {
    botDetectionService,
    detectBotForAuth,
    detectBotForGameAction,
    detectBotForAttemptConsumption,
    type BotAnalysisResult
} from './botDetectionService';

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

export interface AuthenticationResult {
    success: boolean;
    user?: AuthUser;
    error?: string;
    botDetection?: BotAnalysisResult;
    blocked?: boolean;
}

type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

class EnhancedAuthService {
    private token: string | null = null;
    private baseUrl: string;

    constructor() {
        this.baseUrl = this.getApiBaseUrl();
        this.loadTokenFromStorage();
        this.initializeBotDetection();
    }

    /**
     * Get proper API base URL based on environment
     */
    private getApiBaseUrl(): string {
        if (typeof window !== 'undefined') {
            if (process.env.NODE_ENV === 'production') {
                return window.location.origin;
            }

            if (process.env.NEXT_PUBLIC_API_URL) {
                return process.env.NEXT_PUBLIC_API_URL;
            }

            return window.location.origin;
        }

        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    }

    /**
     * Initialize bot detection service
     */
    private async initializeBotDetection(): Promise<void> {
        try {
            await botDetectionService.initialize();
            console.log('Bot detection service initialized successfully');
        } catch (error) {
            console.warn('Bot detection initialization failed:', error);
        }
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
     * Make authenticated API request with bot detection
     */
    private async makeAuthenticatedRequest<T>(
        endpoint: string,
        options: RequestInit = {},
        performBotDetection = false
    ): Promise<T> {
        // Perform bot detection if requested
        if (performBotDetection) {
            const botAnalysis = await this.performBotDetectionForRequest(endpoint, options.method || 'GET');
            if (botAnalysis.shouldBlock) {
                throw new Error('Request blocked due to suspicious activity. Please try again later.');
            }
        }

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
                throw new Error('Authentication expired. Please log in again.');
            }

            if (response.status === 429) {
                throw new Error('Too many requests. Please slow down and try again.');
            }

            if (response.status === 403) {
                throw new Error('Access denied. Your account may be temporarily restricted.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            return response.json();
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error('Network error - check your connection and API URL:', url);
                throw new Error('Network connection failed. Please check your internet connection.');
            }
            throw error;
        }
    }

    /**
     * Perform bot detection for a specific request
     */
    private async performBotDetectionForRequest(endpoint: string, method: string): Promise<BotAnalysisResult> {
        try {
            const action = `${method.toLowerCase()}_${endpoint.replace('/api/', '').replace(/\//g, '_')}`;
            return await botDetectionService.detectBot({
                endpoint,
                action,
                context: { method, timestamp: Date.now() },
            }).then(detection => botDetectionService.analyzeResults(detection));
        } catch (error) {
            console.warn('Bot detection failed for request:', error);
            return {
                isBot: false,
                riskScore: 0,
                shouldBlock: false,
                reasons: ['Detection failed'],
                detectionData: null,
            };
        }
    }

    /**
     * Authenticate user with Telegram WebApp data and bot detection
     */
    async authenticateWithTelegram(initData: string, referralCode?: string): Promise<AuthenticationResult> {
        try {
            // Perform bot detection for authentication
            const botAnalysis = await detectBotForAuth();

            if (botAnalysis.shouldBlock) {
                return {
                    success: false,
                    error: 'Authentication blocked due to suspicious activity. Please try again later.',
                    botDetection: botAnalysis,
                    blocked: true,
                };
            }

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
                return {
                    success: false,
                    error: errorData.message || 'Authentication failed',
                    botDetection: botAnalysis,
                };
            }

            const data = await response.json();

            if (!data.success) {
                return {
                    success: false,
                    error: data.error || 'Authentication failed',
                    botDetection: botAnalysis,
                };
            }

            this.saveTokenToStorage(data.token);

            return {
                success: true,
                user: data.user,
                botDetection: botAnalysis,
            };
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Authentication error:', error);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
            };
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
        botDetectionService.resetSession();
    }

    /**
     * Get current attempts status with bot detection
     */
    async getAttemptsStatus(): Promise<AttemptsStatus> {
        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            '/user/attempts-status',
            {},
            false // Don't block for status checks
        ).then(data => data.attemptsStatus);
    }

    /**
     * Consume an attempt for game with bot detection
     */
    async consumeAttempt(): Promise<AttemptsStatus> {
        const botAnalysis = await detectBotForAttemptConsumption();

        if (botAnalysis.shouldBlock) {
            throw new Error('Request blocked due to suspicious activity. Please wait before trying again.');
        }

        return this.makeAuthenticatedRequest<{ attemptsStatus: AttemptsStatus }>(
            '/game/consume-attempt',
            { method: 'POST' },
            true
        ).then(data => data.attemptsStatus);
    }

    /**
     * Save game result securely with bot detection
     */
    async saveGameResult(gameResult: GameResult): Promise<GameSaveResult> {
        const botAnalysis = await detectBotForGameAction('save-result');

        if (botAnalysis.shouldBlock) {
            throw new Error('Game result submission blocked due to suspicious activity.');
        }

        return this.makeAuthenticatedRequest<{ saveResult: GameSaveResult }>(
            '/game/save-result',
            {
                method: 'POST',
                body: JSON.stringify(gameResult),
            },
            true
        ).then(data => data.saveResult);
    }

    /**
     * Save tournament result securely with bot detection
     */
    async saveTournamentResult(
        tournamentId: string,
        gameResult: SurvivalGameResult
    ): Promise<TournamentSaveResponse> {
        const botAnalysis = await detectBotForGameAction('tournament-result');

        if (botAnalysis.shouldBlock) {
            throw new Error('Tournament result submission blocked due to suspicious activity.');
        }

        return this.makeAuthenticatedRequest<{ tournamentResult: TournamentSaveResponse }>(
            '/tournament/save-result',
            {
                method: 'POST',
                body: JSON.stringify({
                    tournamentId,
                    gameResult,
                }),
            },
            true
        ).then(data => data.tournamentResult);
    }

    /**
     * Refresh user data
     */
    async refreshUserData(): Promise<AuthUser> {
        return this.makeAuthenticatedRequest<{ user: AuthUser }>(
            '/user/profile',
            {},
            false
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

                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }

        throw lastError;
    }

    /**
     * Get bot detection status and statistics
     */
    getBotDetectionInfo() {
        return {
            isEnabled: botDetectionService.isDetectionEnabled(),
            sessionInfo: botDetectionService.getSessionInfo(),
        };
    }
}

// Singleton instance
export const authService = new EnhancedAuthService();

// Helper functions for backward compatibility with enhanced bot detection
export async function authenticateUser(initData: string, referralCode?: string): Promise<AuthUser> {
    const result = await authService.authenticateWithTelegram(initData, referralCode);

    if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
    }

    if (!result.user) {
        throw new Error('Authentication succeeded but no user data received');
    }

    return result.user;
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

// Enhanced authentication function that returns full result including bot detection
export async function authenticateUserEnhanced(initData: string, referralCode?: string): Promise<AuthenticationResult> {
    return authService.authenticateWithTelegram(initData, referralCode);
}