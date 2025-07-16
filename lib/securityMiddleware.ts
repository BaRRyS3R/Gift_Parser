// src/lib/securityMiddleware.ts - Enhanced security middleware with stricter trust score evaluation

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { verifyToken } from "@/lib/jwt";

interface SecurityContext {
    sessionId: string;
    telegramId: number;
    userAgent: string;
    timestamp: number;
    requestPath: string;
}

interface SecurityDecision {
    action: "allow" | "require_verification" | "block";
    verificationMethod?: "interactive" | "biometric";
    sessionToken?: string;
    expiresAt?: number;
}

export class SecurityProcessor {
    private static instance: SecurityProcessor;
    private securityCache = new Map<string, SecurityDecision>();
    private suspiciousActivities = new Map<string, number>();
    private requestCounts = new Map<string, { count: number; resetTime: number }>();

    // Enhanced security thresholds
    private readonly TRUST_THRESHOLDS = {
        BIOMETRIC_REQUIRED: 20,
        INTERACTIVE_REQUIRED: 40,
        SUSPICIOUS_ACTIVITY: 15,
        AUTO_BLOCK: 10,
    };

    private readonly RATE_LIMITS = {
        MAX_REQUESTS_PER_MINUTE: 20,
        MAX_FAILED_ATTEMPTS: 3,
        SUSPICIOUS_PATTERN_THRESHOLD: 5,
    };

    public static getInstance(): SecurityProcessor {
        if (!SecurityProcessor.instance) {
            SecurityProcessor.instance = new SecurityProcessor();
        }
        return SecurityProcessor.instance;
    }

    private generateSecurityToken(): string {
        return Buffer.from(
            `${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
        ).toString('base64');
    }

    private async calculateSecurityScore(context: SecurityContext): Promise<number> {
        try {
            const { data: user } = await supabaseServer
                .from("users")
                .select("trust_score, blocked_until, last_played_at, total_games")
                .eq("telegram_id", context.telegramId)
                .single();

            if (!user) return 0;

            let score = user.trust_score || 50;

            // Enhanced temporal analysis
            const now = Date.now();
            const lastActivity = user.last_played_at ? new Date(user.last_played_at).getTime() : 0;
            const timeSinceLastActivity = now - lastActivity;

            // Suspicious activity patterns
            const suspiciousCount = this.suspiciousActivities.get(context.sessionId) || 0;
            score -= suspiciousCount * 8; // Increased penalty

            // Rate limiting analysis
            const requestData = this.requestCounts.get(context.sessionId);
            if (requestData && requestData.count > this.RATE_LIMITS.MAX_REQUESTS_PER_MINUTE) {
                score -= 25; // Heavy penalty for rate limit abuse
            }

            // Behavioral pattern analysis
            if (timeSinceLastActivity < 500) { // Very rapid requests
                score -= 15;
                this.reportSuspiciousActivity(context.sessionId);
            }

            // New user with low activity gets reduced trust
            if (user.total_games < 5 && score > 60) {
                score = Math.min(score, 55);
            }

            // Time-based security adjustments
            const hour = new Date().getHours();
            if (hour < 6 || hour > 23) { // Late night/early morning activity
                score -= 5;
            }

            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error("Error calculating security score:", error);
            return 25; // Conservative fallback
        }
    }

    private async evaluateSecurityRequirements(
        context: SecurityContext
    ): Promise<SecurityDecision> {
        try {
            const securityScore = await this.calculateSecurityScore(context);

            console.log(`Security evaluation for ${context.telegramId}: score=${securityScore}`);

            // Check for active blocks
            const { data: user } = await supabaseServer
                .from("users")
                .select("blocked_until")
                .eq("telegram_id", context.telegramId)
                .single();

            if (user?.blocked_until && new Date(user.blocked_until) > new Date()) {
                return { action: "block" };
            }

            // Auto-block for extremely low scores
            if (securityScore <= this.TRUST_THRESHOLDS.AUTO_BLOCK) {
                await this.autoBlockUser(context.telegramId, "trust_score_critical");
                return { action: "block" };
            }

            // Generate session token for verification
            const sessionToken = this.generateSecurityToken();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

            // Enhanced biometric requirement (stricter threshold)
            if (securityScore <= this.TRUST_THRESHOLDS.BIOMETRIC_REQUIRED) {
                console.log(`Biometric verification required for score: ${securityScore}`);
                return {
                    action: "require_verification",
                    verificationMethod: "biometric",
                    sessionToken,
                    expiresAt
                };
            }

            // Enhanced interactive requirement (stricter threshold)
            if (securityScore <= this.TRUST_THRESHOLDS.INTERACTIVE_REQUIRED) {
                console.log(`Interactive verification required for score: ${securityScore}`);
                return {
                    action: "require_verification",
                    verificationMethod: "interactive",
                    sessionToken,
                    expiresAt
                };
            }

            // Additional checks for suspicious patterns
            const suspiciousCount = this.suspiciousActivities.get(context.sessionId) || 0;
            if (suspiciousCount >= this.RATE_LIMITS.SUSPICIOUS_PATTERN_THRESHOLD) {
                console.log(`Suspicious pattern detected for session: ${context.sessionId}`);
                return {
                    action: "require_verification",
                    verificationMethod: "interactive",
                    sessionToken,
                    expiresAt
                };
            }

            console.log(`Access allowed for score: ${securityScore}`);
            return { action: "allow" };

        } catch (error) {
            console.error("Error evaluating security requirements:", error);
            // Conservative fallback - require verification on errors
            return {
                action: "require_verification",
                verificationMethod: "interactive",
                sessionToken: this.generateSecurityToken(),
                expiresAt: Date.now() + 5 * 60 * 1000
            };
        }
    }

    private async autoBlockUser(telegramId: number, reason: string): Promise<void> {
        try {
            const { error } = await supabaseServer.rpc("block_user", {
                user_telegram_id: telegramId,
                reason: "suspicious_activity",
                duration_minutes: 15, // Increased block duration
            });

            if (error) {
                console.error("Error auto-blocking user:", error);
            } else {
                console.log(`User ${telegramId} auto-blocked for: ${reason}`);
            }
        } catch (error) {
            console.error("Error in autoBlockUser:", error);
        }
    }

    private updateRequestCount(sessionId: string): void {
        const now = Date.now();
        const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window

        const current = this.requestCounts.get(sessionId);

        if (!current || current.resetTime !== windowStart) {
            this.requestCounts.set(sessionId, { count: 1, resetTime: windowStart });
        } else {
            current.count++;
        }

        // Cleanup old entries
        setTimeout(() => {
            const entry = this.requestCounts.get(sessionId);
            if (entry && entry.resetTime < windowStart) {
                this.requestCounts.delete(sessionId);
            }
        }, 65000); // Cleanup after window + buffer
    }

    public async processSecurityCheck(
        request: NextRequest,
        sessionId: string,
        telegramId: number
    ): Promise<SecurityDecision> {
        const context: SecurityContext = {
            sessionId,
            telegramId,
            userAgent: request.headers.get("user-agent") || "",
            timestamp: Date.now(),
            requestPath: request.nextUrl.pathname
        };

        // Update request count tracking
        this.updateRequestCount(sessionId);

        // Check rate limits
        const requestData = this.requestCounts.get(sessionId);
        if (requestData && requestData.count > this.RATE_LIMITS.MAX_REQUESTS_PER_MINUTE) {
            console.log(`Rate limit exceeded for session: ${sessionId}`);
            this.reportSuspiciousActivity(sessionId);
            return { action: "block" };
        }

        const cacheKey = `${sessionId}_${context.timestamp}`;

        // Check cache (shorter duration for enhanced security)
        if (this.securityCache.has(cacheKey)) {
            return this.securityCache.get(cacheKey)!;
        }

        const decision = await this.evaluateSecurityRequirements(context);

        // Cache decision with shorter TTL
        this.securityCache.set(cacheKey, decision);
        setTimeout(() => {
            this.securityCache.delete(cacheKey);
        }, 30000); // 30 seconds cache

        return decision;
    }

    public async processVerificationResult(
        sessionId: string,
        verificationToken: string,
        success: boolean,
        telegramId: number
    ): Promise<boolean> {
        try {
            if (success) {
                // Successful verification - increase trust score
                const scoreChange = 20; // Reduced reward to make trust harder to gain

                await supabaseServer.rpc("update_trust_score", {
                    user_telegram_id: telegramId,
                    score_change: scoreChange,
                });

                // Clear suspicious activity
                this.suspiciousActivities.delete(sessionId);
                console.log(`Verification successful for session: ${sessionId}`);
            } else {
                // Failed verification - penalize heavily
                const scoreChange = -25; // Increased penalty

                await supabaseServer.rpc("update_trust_score", {
                    user_telegram_id: telegramId,
                    score_change: scoreChange,
                });

                // Block user for failed verification
                await supabaseServer.rpc("block_user", {
                    user_telegram_id: telegramId,
                    reason: "verification_failed",
                    duration_minutes: 10, // Increased block duration
                });

                console.log(`Verification failed for session: ${sessionId}`);
            }

            return success;
        } catch (error) {
            console.error("Error processing verification result:", error);
            return false;
        }
    }

    public reportSuspiciousActivity(sessionId: string): void {
        const current = this.suspiciousActivities.get(sessionId) || 0;
        this.suspiciousActivities.set(sessionId, current + 1);

        console.log(`Suspicious activity reported for session: ${sessionId}, count: ${current + 1}`);

        // Auto-cleanup with shorter duration
        setTimeout(() => {
            this.suspiciousActivities.delete(sessionId);
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Enhanced monitoring method
    public getSecurityStats(): {
        activeSessions: number;
        suspiciousActivities: number;
        cacheSize: number;
    } {
        return {
            activeSessions: this.requestCounts.size,
            suspiciousActivities: this.suspiciousActivities.size,
            cacheSize: this.securityCache.size,
        };
    }
}

export const securityProcessor = SecurityProcessor.getInstance();