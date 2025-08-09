// src/app/api/security/suspicious-activity/route.ts - Обновленный endpoint с поддержкой fallback значений

import { NextRequest, NextResponse } from "next/server";

import { serverAntiCheatService } from "@/lib/server/antiCheatService";
import {
    ReportSuspiciousActivityRequest,
    ReportSuspiciousActivityResponse,
    SuspiciousActivityData,
} from "@/types/security/antiCheat";

// Список временных значений пользователей, которые следует игнорировать
const TEMPORARY_USER_VALUES = ['temp_user', 'pending', ''];
const INVALID_TELEGRAM_IDS = [0, -1];

/**
 * POST /api/security/suspicious-activity
 * Записывает данные о подозрительной активности пользователя
 * Используется внутренней системой безопасности для shadow monitoring
 */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<ReportSuspiciousActivityResponse>> {
    try {
        // Извлекаем информацию о пользователе из заголовков middleware
        const telegramId = request.headers.get("X-Telegram-ID");
        const userId = request.headers.get("X-User-ID");

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: "User authentication required",
                },
                { status: 401 },
            );
        }

        const telegramIdNumber = parseInt(telegramId);

        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: "Invalid user ID format",
                },
                { status: 400 },
            );
        }

        // Проверяем на временных пользователей и возвращаем успешный пустой ответ
        if (TEMPORARY_USER_VALUES.includes(userId) || INVALID_TELEGRAM_IDS.includes(telegramIdNumber)) {
            console.log('[AntiCheat API] Skipping temporary user data:', { userId, telegramId: telegramIdNumber });
            return NextResponse.json({
                success: true,
                recorded: false,
                analysis: {
                    isSuspicious: false,
                    suspiciousScore: 0,
                    suspiciousClicksCount: 0,
                    totalClicksAnalyzed: 0,
                    averageReactionTime: 0,
                    flaggedPatterns: [],
                    recommendations: ['Data from temporary user session']
                }
            });
        }

        // Парсим тело запроса
        let body: ReportSuspiciousActivityRequest;

        try {
            body = await request.json();
        } catch (error) {
            console.error('[AntiCheat API] Failed to parse request body:', error);
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: "Invalid request body format",
                },
                { status: 400 },
            );
        }

        const { gameSessionData } = body;

        if (!gameSessionData) {
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: "Game session data is required",
                },
                { status: 400 },
            );
        }

        // Дополнительная проверка на временные значения в данных сессии
        if (TEMPORARY_USER_VALUES.includes(gameSessionData.userId) ||
            INVALID_TELEGRAM_IDS.includes(gameSessionData.telegramId)) {
            console.log('[AntiCheat API] Skipping temporary user in session data:', {
                sessionUserId: gameSessionData.userId,
                sessionTelegramId: gameSessionData.telegramId
            });
            return NextResponse.json({
                success: true,
                recorded: false,
                analysis: {
                    isSuspicious: false,
                    suspiciousScore: 0,
                    suspiciousClicksCount: gameSessionData.suspiciousClicksCount || 0,
                    totalClicksAnalyzed: gameSessionData.totalSuccessfulClicks || 0,
                    averageReactionTime: gameSessionData.avgReactionTime || 0,
                    flaggedPatterns: [],
                    recommendations: ['Data from temporary session']
                }
            });
        }

        // Валидируем данные игровой сессии
        const validationResult = validateSuspiciousActivityData(gameSessionData);
        if (!validationResult.isValid) {
            console.warn('[AntiCheat API] Validation failed:', validationResult.error);
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: validationResult.error,
                },
                { status: 400 },
            );
        }

        // Проверяем соответствие пользователя между заголовками и данными
        if (gameSessionData.telegramId !== telegramIdNumber) {
            console.warn('[AntiCheat API] User ID mismatch:', {
                headerTelegramId: telegramIdNumber,
                bodyTelegramId: gameSessionData.telegramId
            });
            return NextResponse.json(
                {
                    success: false,
                    recorded: false,
                    error: "User ID mismatch",
                },
                { status: 403 },
            );
        }

        // Извлекаем дополнительные метаданные для анализа
        const userAgent = request.headers.get("user-agent") || undefined;
        const forwarded = request.headers.get("x-forwarded-for");
        const realIp = request.headers.get("x-real-ip");
        const ipAddress = forwarded?.split(",")[0] || realIp || undefined;

        // Логируем начало обработки валидных данных
        console.log('[AntiCheat API] Processing valid session data:', {
            telegramId: telegramIdNumber,
            sessionId: gameSessionData.gameSessionId,
            gameMode: gameSessionData.gameMode,
            totalClicks: gameSessionData.totalSuccessfulClicks,
            suspiciousClicks: gameSessionData.suspiciousClicksCount
        });

        // Записываем подозрительную активность через сервисный слой
        const result = await serverAntiCheatService.recordSuspiciousActivity(
            gameSessionData,
            userAgent,
            ipAddress,
        );

        // Логируем результаты обработки
        if (result.analysis.isSuspicious && result.recorded) {
            console.log(`[ANTICHEAT] Suspicious activity detected and recorded:`, {
                telegramId: telegramIdNumber,
                gameMode: gameSessionData.gameMode,
                suspiciousScore: result.analysis.suspiciousScore,
                suspiciousClicks: gameSessionData.suspiciousClicksCount,
                patterns: result.analysis.flaggedPatterns,
                sessionId: gameSessionData.gameSessionId
            });
        } else if (result.recorded) {
            console.log('[AntiCheat API] Session data recorded (no suspicious activity detected)');
        } else {
            console.log('[AntiCheat API] Session data analyzed but not recorded (below recording thresholds)');
        }

        return NextResponse.json({
            success: true,
            recorded: result.recorded,
            analysis: result.analysis,
        });

    } catch (error) {
        console.error("Error in suspicious activity endpoint:", error);

        // Обработка специфических типов ошибок
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                return NextResponse.json(
                    {
                        success: false,
                        recorded: false,
                        error: "User not found",
                    },
                    { status: 404 },
                );
            }

            if (error.message.includes("database")) {
                return NextResponse.json(
                    {
                        success: false,
                        recorded: false,
                        error: "Database operation failed",
                    },
                    { status: 500 },
                );
            }

            // Логируем неожиданные ошибки для мониторинга
            console.error('[AntiCheat API] Unexpected error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }

        return NextResponse.json(
            {
                success: false,
                recorded: false,
                error: "Failed to process suspicious activity data",
            },
            { status: 500 },
        );
    }
}

/**
 * GET /api/security/suspicious-activity
 * Получает статистику подозрительной активности для текущего пользователя
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const telegramId = request.headers.get("X-Telegram-ID");
        const userId = request.headers.get("X-User-ID");

        if (!telegramId || !userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 },
            );
        }

        const telegramIdNumber = parseInt(telegramId);

        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                { error: "Invalid user ID format" },
                { status: 400 },
            );
        }

        // Возвращаем пустую статистику для временных пользователей
        if (TEMPORARY_USER_VALUES.includes(userId) || INVALID_TELEGRAM_IDS.includes(telegramIdNumber)) {
            return NextResponse.json({
                success: true,
                stats: {
                    totalReports: 0,
                    avgSuspiciousScore: 0,
                    maxSuspiciousPercentage: 0,
                    fastestAvgReactionTime: 0,
                    mostRecentReport: undefined
                }
            });
        }

        // Получаем статистику для валидных пользователей
        const stats = await serverAntiCheatService.getUserSuspiciousStats(
            telegramIdNumber,
        );

        return NextResponse.json({
            success: true,
            stats,
        });

    } catch (error) {
        console.error("Error getting suspicious activity stats:", error);
        return NextResponse.json(
            { error: "Failed to retrieve statistics" },
            { status: 500 },
        );
    }
}

/**
 * OPTIONS /api/security/suspicious-activity
 * Обработка CORS preflight запросов
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}

/**
 * Валидация данных подозрительной активности
 */
function validateSuspiciousActivityData(
    data: SuspiciousActivityData,
): { isValid: boolean; error?: string } {
    try {
        // Проверяем обязательные поля
        if (!data.userId || typeof data.userId !== "string") {
            return { isValid: false, error: "Invalid user ID" };
        }

        if (typeof data.telegramId !== "number") {
            return { isValid: false, error: "Invalid telegram ID" };
        }

        if (!data.gameMode || !["survival", "rotation", "physics"].includes(data.gameMode)) {
            return { isValid: false, error: "Invalid game mode" };
        }

        // Проверяем числовые значения на корректность
        const numericFields = [
            { field: 'suspiciousClicksCount', value: data.suspiciousClicksCount },
            { field: 'totalSuccessfulClicks', value: data.totalSuccessfulClicks },
            { field: 'minReactionTime', value: data.minReactionTime },
            { field: 'maxReactionTime', value: data.maxReactionTime },
            { field: 'avgReactionTime', value: data.avgReactionTime },
            { field: 'maxLevelReached', value: data.maxLevelReached },
            { field: 'survivalTime', value: data.survivalTime },
            { field: 'finalScore', value: data.finalScore }
        ];

        for (const { field, value } of numericFields) {
            if (typeof value !== "number" || value < 0) {
                return { isValid: false, error: `Invalid ${field}` };
            }
        }

        // Проверяем временные метки
        if (
            typeof data.gameStartTime !== "number" ||
            typeof data.gameEndTime !== "number" ||
            data.gameEndTime <= data.gameStartTime
        ) {
            return { isValid: false, error: "Invalid game timing data" };
        }

        // Проверяем разумные пределы времени игры (максимум 4 часа)
        const gameDuration = data.gameEndTime - data.gameStartTime;
        const maxGameDuration = 4 * 60 * 60 * 1000; // 4 часа в миллисекундах

        if (gameDuration > maxGameDuration) {
            return { isValid: false, error: "Game duration exceeds reasonable limits" };
        }

        // Проверяем массив подозрительных кликов
        if (!Array.isArray(data.suspiciousClicks)) {
            return { isValid: false, error: "Invalid suspicious clicks data structure" };
        }

        // Проверяем логическую консистентность данных
        if (data.suspiciousClicksCount > data.totalSuccessfulClicks) {
            return { isValid: false, error: "Suspicious clicks count cannot exceed total clicks" };
        }

        if (data.suspiciousClicks.length !== data.suspiciousClicksCount) {
            return { isValid: false, error: "Suspicious clicks array length mismatch" };
        }

        // Валидируем структуру отдельных кликов
        for (let i = 0; i < data.suspiciousClicks.length; i++) {
            const click = data.suspiciousClicks[i];

            if (
                typeof click.circleId !== "number" ||
                typeof click.activationTime !== "number" ||
                typeof click.clickTime !== "number" ||
                typeof click.reactionTime !== "number" ||
                typeof click.isSuspicious !== "boolean"
            ) {
                return { isValid: false, error: `Invalid click reaction data at index ${i}` };
            }

            if (click.clickTime <= click.activationTime) {
                return { isValid: false, error: `Invalid timing in click reaction at index ${i}` };
            }

            const expectedReactionTime = click.clickTime - click.activationTime;
            if (Math.abs(click.reactionTime - expectedReactionTime) > 1) { // Допускаем погрешность в 1мс
                return { isValid: false, error: `Reaction time calculation error at index ${i}` };
            }
        }

        return { isValid: true };

    } catch (error) {
        console.error('[AntiCheat API] Validation error:', error);
        return { isValid: false, error: "Validation failed due to data structure issues" };
    }
}