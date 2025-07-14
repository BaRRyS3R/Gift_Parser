// src/lib/botDetectionService.ts - Corrected client-side bot detection service

import BotdAgent from '@fingerprintjs/botd';

export interface BotDetectionResult {
    bot: boolean;
    probability: number;
    reasons: string[];
    requestId: string;
    sessionId: string;
    timestamp: number;
}

export interface BotDetectionOptions {
    endpoint?: string;
    action?: string;
    context?: Record<string, any>;
    skipDetection?: boolean;
}

export interface BotAnalysisResult {
    isBot: boolean;
    riskScore: number;
    shouldBlock: boolean;
    reasons: string[];
    detectionData: any;
}

class BotDetectionService {
    private agent: any = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private sessionId: string;
    private requestCount = 0;
    private lastRequestTime = 0;
    private baseUrl: string;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.baseUrl = this.getApiBaseUrl();
    }

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

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize the bot detection agent
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this.performInitialization();
        return this.initPromise;
    }

    private async performInitialization(): Promise<void> {
        try {
            if (typeof window === 'undefined') {
                console.warn('Bot detection not available in server environment');
                return;
            }

            console.log('Initializing bot detection agent...');

            // Load and initialize the botd agent with correct configuration
            // Note: @fingerprintjs/botd does not require a public key for basic functionality
            this.agent = await BotdAgent.load({
                // Optional configuration options for botd
                monitoring: false, // Disable monitoring for better performance
            });

            this.isInitialized = true;
            console.log('Bot detection agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize bot detection agent:', error);
            this.isInitialized = false;

            // Graceful fallback - continue without bot detection rather than failing
            console.warn('Bot detection will be disabled due to initialization failure');
        }
    }

    /**
     * Perform bot detection
     */
    async detectBot(options: BotDetectionOptions = {}): Promise<BotDetectionResult | null> {
        try {
            if (options.skipDetection || !this.isInitialized || !this.agent) {
                return null;
            }

            console.log('Performing bot detection...');

            const startTime = performance.now();
            const result = await this.agent.detect();
            const endTime = performance.now();

            console.log(`Bot detection completed in ${endTime - startTime}ms`);

            const detectionResult: BotDetectionResult = {
                bot: result.bot,
                probability: result.probability || 0,
                reasons: result.reasons || [],
                requestId: this.generateRequestId(),
                sessionId: this.sessionId,
                timestamp: Date.now(),
            };

            // Update request tracking
            this.requestCount++;
            const now = Date.now();
            const timeSinceLastRequest = this.lastRequestTime > 0 ? now - this.lastRequestTime : 0;
            this.lastRequestTime = now;

            // Send results to server for logging
            await this.logDetectionResult(detectionResult, options, timeSinceLastRequest);

            return detectionResult;
        } catch (error) {
            console.error('Bot detection failed:', error);

            // Log the error to server
            await this.logDetectionError(error, options);

            // Return null instead of throwing to allow application to continue
            return null;
        }
    }

    /**
     * Analyze detection results and determine risk
     */
    analyzeResults(detection: BotDetectionResult | null): BotAnalysisResult {
        if (!detection) {
            return {
                isBot: false,
                riskScore: 0,
                shouldBlock: false,
                reasons: ['Detection unavailable'],
                detectionData: null,
            };
        }

        let riskScore = Math.round(detection.probability * 100);
        const reasons: string[] = [...detection.reasons];

        // Additional risk factors based on usage patterns
        if (this.requestCount > 50) {
            riskScore += 10;
            reasons.push('High request frequency detected');
        }

        if (detection.probability > 0.9) {
            riskScore += 20;
            reasons.push('Very high bot probability detected');
        }

        // Check for automated behavior patterns
        if (this.lastRequestTime > 0 && Date.now() - this.lastRequestTime < 100) {
            riskScore += 15;
            reasons.push('Rapid consecutive requests detected');
        }

        // Determine blocking threshold (configurable)
        const blockingThreshold = 80; // Can be made configurable via environment variables
        const shouldBlock = detection.bot && riskScore >= blockingThreshold;

        return {
            isBot: detection.bot,
            riskScore: Math.min(riskScore, 100),
            shouldBlock,
            reasons,
            detectionData: detection,
        };
    }

    /**
     * Send detection results to server
     */
    private async logDetectionResult(
        detection: BotDetectionResult,
        options: BotDetectionOptions,
        timeSinceLastRequest: number
    ): Promise<void> {
        try {
            const logData = {
                detection,
                options,
                requestCount: this.requestCount,
                timeSinceLastRequest,
                userAgent: navigator.userAgent,
                url: window.location.href,
            };

            await fetch(`${this.baseUrl}/api/bot-detection/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logData),
            });
        } catch (error) {
            console.error('Failed to log detection result:', error);
            // Continue execution even if logging fails
        }
    }

    /**
     * Send detection error to server
     */
    private async logDetectionError(error: any, options: BotDetectionOptions): Promise<void> {
        try {
            const errorData = {
                error: error.message || 'Unknown error',
                errorName: error.name || 'BotDetectionError',
                options,
                userAgent: navigator.userAgent,
                url: window.location.href,
                sessionId: this.sessionId,
                timestamp: Date.now(),
            };

            await fetch(`${this.baseUrl}/api/bot-detection/error`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(errorData),
            });
        } catch (logError) {
            console.error('Failed to log detection error:', logError);
        }
    }

    /**
     * Perform bot detection for authentication
     */
    async detectForAuth(): Promise<BotAnalysisResult> {
        const detection = await this.detectBot({
            endpoint: '/api/auth/login',
            action: 'authentication',
            context: { type: 'login' },
        });

        return this.analyzeResults(detection);
    }

    /**
     * Perform bot detection for game actions
     */
    async detectForGameAction(action: string): Promise<BotAnalysisResult> {
        const detection = await this.detectBot({
            endpoint: `/api/game/${action}`,
            action: `game_${action}`,
            context: { type: 'game', action },
        });

        return this.analyzeResults(detection);
    }

    /**
     * Perform bot detection for attempt consumption
     */
    async detectForAttemptConsumption(): Promise<BotAnalysisResult> {
        const detection = await this.detectBot({
            endpoint: '/api/game/consume-attempt',
            action: 'consume_attempt',
            context: { type: 'attempt_consumption' },
        });

        return this.analyzeResults(detection);
    }

    /**
     * Check if detection is enabled and working
     */
    isDetectionEnabled(): boolean {
        return this.isInitialized && !!this.agent;
    }

    /**
     * Get current session information
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            requestCount: this.requestCount,
            isInitialized: this.isInitialized,
            lastRequestTime: this.lastRequestTime,
            hasAgent: !!this.agent,
        };
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Reset session (useful for testing or new user sessions)
     */
    resetSession(): void {
        this.sessionId = this.generateSessionId();
        this.requestCount = 0;
        this.lastRequestTime = 0;
    }

    /**
     * Perform basic heuristic detection when agent is unavailable
     */
    private performBasicHeuristics(): BotDetectionResult {
        const reasons: string[] = [];
        let probability = 0;

        // Basic browser environment checks
        if (typeof window === 'undefined') {
            probability += 0.8;
            reasons.push('Server-side environment detected');
        }

        // Check for common automation indicators
        if (typeof navigator !== 'undefined') {
            if (!navigator.webdriver === undefined) {
                probability += 0.3;
                reasons.push('WebDriver property undefined');
            }

            if (navigator.languages && navigator.languages.length === 0) {
                probability += 0.2;
                reasons.push('No languages detected');
            }

            if (!navigator.plugins || navigator.plugins.length === 0) {
                probability += 0.1;
                reasons.push('No browser plugins detected');
            }
        }

        // Request timing analysis
        if (this.requestCount > 0 && this.lastRequestTime > 0) {
            const timeDiff = Date.now() - this.lastRequestTime;
            if (timeDiff < 50) {
                probability += 0.4;
                reasons.push('Extremely rapid requests detected');
            }
        }

        return {
            bot: probability > 0.5,
            probability: Math.min(probability, 1),
            reasons,
            requestId: this.generateRequestId(),
            sessionId: this.sessionId,
            timestamp: Date.now(),
        };
    }
}

// Singleton instance
export const botDetectionService = new BotDetectionService();

// Helper functions for easier integration
export async function initializeBotDetection(): Promise<void> {
    return botDetectionService.initialize();
}

export async function detectBotForAuth(): Promise<BotAnalysisResult> {
    return botDetectionService.detectForAuth();
}

export async function detectBotForGameAction(action: string): Promise<BotAnalysisResult> {
    return botDetectionService.detectForGameAction(action);
}

export async function detectBotForAttemptConsumption(): Promise<BotAnalysisResult> {
    return botDetectionService.detectForAttemptConsumption();
}

export function isBotDetectionEnabled(): boolean {
    return botDetectionService.isDetectionEnabled();
}