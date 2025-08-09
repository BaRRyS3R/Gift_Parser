// src/lib/server/antiCheatService.ts - Серверный сервис для обработки подозрительной активности

import { supabaseServer } from "@/lib/supabase_server";
import {
    SuspiciousActivityData,
    SuspiciousActivityAnalysis,
    ClickReactionTime,
    AntiCheatConfig,
    DEFAULT_ANTICHEAT_CONFIG,
} from "@/types/security/antiCheat";

interface SuspiciousActivityRecord {
    id: string;
    user_id: string;
    telegram_id: number;
    game_mode: string;
    game_session_id?: string;
    suspicious_clicks_count: number;
    total_successful_clicks: number;
    suspicious_clicks_percentage: number;
    min_reaction_time: number;
    max_reaction_time: number;
    avg_reaction_time: number;
    max_level_reached: number;
    survival_time: number;
    final_score: number;
    suspicious_clicks_details: any;
    all_click_reactions: any;
    user_agent?: string;
    ip_address?: string;
    game_start_time: string;
    game_end_time: string;
    created_at: string;
    suspicious_score: number;
    flagged_patterns?: string[];
    analysis_notes?: string;
}

export const serverAntiCheatService = {
    /**
     * Записывает данные о подозрительной активности в базу данных
     */
    async recordSuspiciousActivity(
        activityData: SuspiciousActivityData,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ success: boolean; recorded: boolean; analysis: SuspiciousActivityAnalysis }> {
        try {
            // Проводим анализ данных перед записью
            const analysis = this.analyzeSuspiciousActivity(activityData);

            // Определяем, стоит ли записывать данные
            const shouldRecord = this.shouldRecordActivity(activityData, analysis);

            if (!shouldRecord) {
                return {
                    success: true,
                    recorded: false,
                    analysis,
                };
            }

            // Подготавливаем данные для записи
            const recordData = {
                user_id: activityData.userId,
                telegram_id: activityData.telegramId,
                game_mode: activityData.gameMode,
                game_session_id: activityData.gameSessionId,
                suspicious_clicks_count: activityData.suspiciousClicksCount,
                total_successful_clicks: activityData.totalSuccessfulClicks,
                suspicious_clicks_percentage: activityData.suspiciousClicksPercentage,
                min_reaction_time: activityData.minReactionTime,
                max_reaction_time: activityData.maxReactionTime,
                avg_reaction_time: activityData.avgReactionTime,
                max_level_reached: activityData.maxLevelReached,
                survival_time: activityData.survivalTime,
                final_score: activityData.finalScore,
                suspicious_clicks_details: JSON.stringify(activityData.suspiciousClicks),
                all_click_reactions: JSON.stringify(activityData.suspiciousClicks), // Сохраняем все для анализа
                user_agent: userAgent,
                ip_address: ipAddress,
                game_start_time: new Date(activityData.gameStartTime).toISOString(),
                game_end_time: new Date(activityData.gameEndTime).toISOString(),
                flagged_patterns: analysis.flaggedPatterns,
                analysis_notes: analysis.recommendations.join(' '),
            };

            // Записываем в базу данных
            const { data, error } = await supabaseServer
                .from("suspicious_activity")
                .insert(recordData)
                .select()
                .single();

            if (error) {
                console.error("Error recording suspicious activity:", error);
                throw error;
            }

            console.log(`Suspicious activity recorded for user ${activityData.telegramId}:`, {
                sessionId: activityData.gameSessionId,
                suspiciousClicks: activityData.suspiciousClicksCount,
                totalClicks: activityData.totalSuccessfulClicks,
                score: analysis.suspiciousScore,
            });

            return {
                success: true,
                recorded: true,
                analysis,
            };
        } catch (error) {
            console.error("Error in recordSuspiciousActivity:", error);
            throw new Error("Failed to record suspicious activity");
        }
    },

    /**
     * Анализирует подозрительную активность и возвращает оценку
     */
    analyzeSuspiciousActivity(activityData: SuspiciousActivityData): SuspiciousActivityAnalysis {
        const flaggedPatterns: string[] = [];
        const recommendations: string[] = [];

        // Анализ процента подозрительных кликов
        const suspiciousPercentage = activityData.suspiciousClicksPercentage;
        if (suspiciousPercentage > 70) {
            flaggedPatterns.push("HIGH_SUSPICIOUS_PERCENTAGE");
            recommendations.push("Extremely high percentage of suspicious clicks detected.");
        } else if (suspiciousPercentage > 40) {
            flaggedPatterns.push("MODERATE_SUSPICIOUS_PERCENTAGE");
            recommendations.push("Moderate percentage of suspicious clicks detected.");
        }

        // Анализ среднего времени реакции
        const avgReaction = activityData.avgReactionTime;
        if (avgReaction < 200) {
            flaggedPatterns.push("EXTREMELY_FAST_REACTIONS");
            recommendations.push("Average reaction time below human threshold.");
        } else if (avgReaction < 300) {
            flaggedPatterns.push("VERY_FAST_REACTIONS");
            recommendations.push("Consistently fast reaction times detected.");
        }

        // Анализ минимального времени реакции
        if (activityData.minReactionTime < 100) {
            flaggedPatterns.push("INSTANT_REACTIONS");
            recommendations.push("Near-instant reaction times detected.");
        }

        // Анализ количества подозрительных кликов
        if (activityData.suspiciousClicksCount > 10 && activityData.totalSuccessfulClicks > 0) {
            flaggedPatterns.push("MULTIPLE_SUSPICIOUS_CLICKS");
            recommendations.push("Multiple suspicious clicks in single session.");
        }

        // Анализ паттернов в подозрительных кликах
        if (activityData.suspiciousClicks.length >= 3) {
            const reactionTimes = activityData.suspiciousClicks.map(click => click.reactionTime);
            const variance = this.calculateVariance(reactionTimes);

            if (variance < 100) { // Очень низкая вариативность
                flaggedPatterns.push("CONSISTENT_TIMING");
                recommendations.push("Suspiciously consistent reaction timing pattern.");
            }
        }

        // Вычисляем общий показатель подозрительности (0-100)
        let suspiciousScore = 0;

        // Весовые коэффициенты для различных факторов
        suspiciousScore += Math.min(40, suspiciousPercentage * 0.4); // До 40 баллов за процент
        suspiciousScore += avgReaction < 200 ? 30 : avgReaction < 300 ? 15 : 0; // До 30 баллов за скорость
        suspiciousScore += activityData.minReactionTime < 100 ? 20 : 0; // 20 баллов за мгновенные реакции
        suspiciousScore += flaggedPatterns.includes("CONSISTENT_TIMING") ? 10 : 0; // 10 баллов за консистентность

        // Определяем общую подозрительность
        const isSuspicious = suspiciousScore >= 30 || flaggedPatterns.length >= 2;

        return {
            isSuspicious,
            suspiciousScore: Math.round(suspiciousScore),
            suspiciousClicksCount: activityData.suspiciousClicksCount,
            totalClicksAnalyzed: activityData.totalSuccessfulClicks,
            averageReactionTime: activityData.avgReactionTime,
            flaggedPatterns,
            recommendations,
        };
    },

    /**
     * Определяет, следует ли записывать активность в базу данных
     */
    shouldRecordActivity(
        activityData: SuspiciousActivityData,
        analysis: SuspiciousActivityAnalysis
    ): boolean {
        const config = DEFAULT_ANTICHEAT_CONFIG;

        // Проверяем минимальную длительность игры
        const gameDuration = activityData.gameEndTime - activityData.gameStartTime;
        if (gameDuration < config.minGameDurationMs) {
            return false;
        }

        // Записываем если есть подозрительные клики или высокий показатель подозрительности
        return (
            activityData.suspiciousClicksCount > 0 ||
            analysis.suspiciousScore >= 20 ||
            analysis.flaggedPatterns.length > 0
        );
    },

    /**
     * Получает статистику подозрительной активности для пользователя
     */
    async getUserSuspiciousStats(telegramId: number): Promise<{
        totalReports: number;
        avgSuspiciousScore: number;
        maxSuspiciousPercentage: number;
        fastestAvgReactionTime: number;
        mostRecentReport?: Date;
    }> {
        try {
            const { data, error } = await supabaseServer
                .rpc("get_user_suspicious_stats", { p_telegram_id: telegramId });

            if (error) {
                console.error("Error getting user suspicious stats:", error);
                throw error;
            }

            const stats = data?.[0];
            return {
                totalReports: stats?.total_reports || 0,
                avgSuspiciousScore: parseFloat(stats?.avg_suspicious_score || "0"),
                maxSuspiciousPercentage: parseFloat(stats?.max_suspicious_percentage || "0"),
                fastestAvgReactionTime: parseFloat(stats?.fastest_avg_reaction_time || "0"),
                mostRecentReport: stats?.most_recent_report ? new Date(stats.most_recent_report) : undefined,
            };
        } catch (error) {
            console.error("Error in getUserSuspiciousStats:", error);
            throw new Error("Failed to get user suspicious stats");
        }
    },

    /**
     * Получает последние записи подозрительной активности
     */
    async getRecentSuspiciousActivity(limit: number = 50): Promise<SuspiciousActivityRecord[]> {
        try {
            const { data, error } = await supabaseServer
                .from("suspicious_activity_summary")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error getting recent suspicious activity:", error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error("Error in getRecentSuspiciousActivity:", error);
            throw new Error("Failed to get recent suspicious activity");
        }
    },

    /**
     * Вспомогательная функция для вычисления дисперсии
     */
    calculateVariance(numbers: number[]): number {
        if (numbers.length === 0) return 0;

        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
        const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;

        return variance;
    },
};