// src/lib/securityMiddleware.ts - Централизованный security middleware
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { verifyToken } from "@/lib/jwt";

interface SecurityContext {
    userId: string;
    telegramId: number;
    userAgent: string;
    timestamp: number;
    sessionId: string;
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

    public static getInstance(): SecurityProcessor {
        if (!SecurityProcessor.instance) {
            SecurityProcessor.instance = new SecurityProcessor();
        }
        return SecurityProcessor.instance;
    }

    private generateSecurityToken(): string {
        return Buffer.from(
            `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        ).toString('base64');
    }

    private async calculateSecurityScore(context: SecurityContext): Promise<number> {
        const { data: user } = await supabaseServer
            .from("users")
            .select("trust_score, blocked_until, last_played_at")
            .eq("id", context.userId)
            .single();

        if (!user) return 0;

        let score = user.trust_score || 50;

        // Временные факторы
        const now = Date.now();
        const lastActivity = user.last_played_at ? new Date(user.last_played_at).getTime() : 0;
        const timeSinceLastActivity = now - lastActivity;

        // Подозрительная активность
        const suspiciousCount = this.suspiciousActivities.get(context.userId) || 0;
        score -= suspiciousCount * 5;

        // Временные паттерны
        if (timeSinceLastActivity < 1000) { // Слишком быстрые действия
            score -= 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private async evaluateSecurityRequirements(
        context: SecurityContext
    ): Promise<SecurityDecision> {
        const securityScore = await this.calculateSecurityScore(context);

        // Проверка блокировки
        const { data: user } = await supabaseServer
            .from("users")
            .select("blocked_until")
            .eq("id", context.userId)
            .single();

        if (user?.blocked_until && new Date(user.blocked_until) > new Date()) {
            return { action: "block" };
        }

        // Определение необходимости дополнительной проверки
        const sessionToken = this.generateSecurityToken();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 минут

        if (securityScore < 20) {
            return {
                action: "require_verification",
                verificationMethod: "biometric",
                sessionToken,
                expiresAt
            };
        }

        if (securityScore < 40) {
            return {
                action: "require_verification",
                verificationMethod: "interactive",
                sessionToken,
                expiresAt
            };
        }

        return { action: "allow" };
    }

    public async processSecurityCheck(
        request: NextRequest,
        userId: string,
        telegramId: number
    ): Promise<SecurityDecision> {
        const context: SecurityContext = {
            userId,
            telegramId,
            userAgent: request.headers.get("user-agent") || "",
            timestamp: Date.now(),
            sessionId: request.headers.get("x-session-id") || ""
        };

        const cacheKey = `${userId}_${context.timestamp}`;

        // Проверка кеша
        if (this.securityCache.has(cacheKey)) {
            return this.securityCache.get(cacheKey)!;
        }

        const decision = await this.evaluateSecurityRequirements(context);

        // Кеширование решения
        this.securityCache.set(cacheKey, decision);

        // Очистка старых записей
        setTimeout(() => {
            this.securityCache.delete(cacheKey);
        }, 60000); // 1 минута

        return decision;
    }

    public async processVerificationResult(
        userId: string,
        verificationToken: string,
        success: boolean
    ): Promise<boolean> {
        const scoreChange = success ? 25 : -20;

        await supabaseServer.rpc("update_trust_score", {
            user_telegram_id: parseInt(userId),
            score_change: scoreChange,
        });

        if (!success) {
            await supabaseServer.rpc("block_user", {
                user_telegram_id: parseInt(userId),
                reason: "verification_failed",
                duration_minutes: 5,
            });
        }

        return success;
    }

    public reportSuspiciousActivity(userId: string): void {
        const current = this.suspiciousActivities.get(userId) || 0;
        this.suspiciousActivities.set(userId, current + 1);

        // Автоматическая очистка через 10 минут
        setTimeout(() => {
            this.suspiciousActivities.delete(userId);
        }, 10 * 60 * 1000);
    }
}

export const securityProcessor = SecurityProcessor.getInstance();