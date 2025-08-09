// src/app/api/security/suspicious-activity/route.ts - API endpoint для записи подозрительной активности

import { NextRequest, NextResponse } from "next/server";

import { serverAntiCheatService } from "@/lib/server/antiCheatService";
import {
  ReportSuspiciousActivityRequest,
  ReportSuspiciousActivityResponse,
  SuspiciousActivityData,
} from "@/types/security/antiCheat";

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

    // Парсим тело запроса
    let body: ReportSuspiciousActivityRequest;

    try {
      body = await request.json();
    } catch (error) {
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

    // Валидируем данные игровой сессии
    const validationResult = validateSuspiciousActivityData(gameSessionData);
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          recorded: false,
          error: validationResult.error,
        },
        { status: 400 },
      );
    }

    // Проверяем соответствие пользователя
    if (gameSessionData.telegramId !== telegramIdNumber) {
      return NextResponse.json(
        {
          success: false,
          recorded: false,
          error: "User ID mismatch",
        },
        { status: 403 },
      );
    }

    // Извлекаем дополнительные метаданные
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwarded?.split(",")[0] || realIp || undefined;

    // Записываем подозрительную активность
    const result = await serverAntiCheatService.recordSuspiciousActivity(
      gameSessionData,
      userAgent,
      ipAddress,
    );

    // Логируем для мониторинга (только если есть подозрительная активность)
    if (result.analysis.isSuspicious && result.recorded) {
      console.log(`[ANTICHEAT] Suspicious activity detected:`, {
        telegramId: telegramIdNumber,
        gameMode: gameSessionData.gameMode,
        suspiciousScore: result.analysis.suspiciousScore,
        suspiciousClicks: gameSessionData.suspiciousClicksCount,
        patterns: result.analysis.flaggedPatterns,
      });
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
 * (для внутренних целей администрирования)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 },
      );
    }

    // Получаем статистику пользователя
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
  // Проверяем обязательные поля
  if (!data.userId || typeof data.userId !== "string") {
    return { isValid: false, error: "Invalid user ID" };
  }

  if (!data.telegramId || typeof data.telegramId !== "number") {
    return { isValid: false, error: "Invalid telegram ID" };
  }

  if (!data.gameMode || !["survival", "rotation", "physics"].includes(data.gameMode)) {
    return { isValid: false, error: "Invalid game mode" };
  }

  // Проверяем числовые значения
  if (
    typeof data.suspiciousClicksCount !== "number" ||
    data.suspiciousClicksCount < 0
  ) {
    return { isValid: false, error: "Invalid suspicious clicks count" };
  }

  if (
    typeof data.totalSuccessfulClicks !== "number" ||
    data.totalSuccessfulClicks < 0
  ) {
    return { isValid: false, error: "Invalid total clicks count" };
  }

  if (
    typeof data.minReactionTime !== "number" ||
    data.minReactionTime < 0
  ) {
    return { isValid: false, error: "Invalid minimum reaction time" };
  }

  if (
    typeof data.avgReactionTime !== "number" ||
    data.avgReactionTime < 0
  ) {
    return { isValid: false, error: "Invalid average reaction time" };
  }

  // Проверяем временные метки
  if (
    typeof data.gameStartTime !== "number" ||
    typeof data.gameEndTime !== "number" ||
    data.gameEndTime <= data.gameStartTime
  ) {
    return { isValid: false, error: "Invalid game timing data" };
  }

  // Проверяем массив подозрительных кликов
  if (!Array.isArray(data.suspiciousClicks)) {
    return { isValid: false, error: "Invalid suspicious clicks data" };
  }

  // Проверяем логическую консистентность
  if (data.suspiciousClicksCount > data.totalSuccessfulClicks) {
    return { isValid: false, error: "Suspicious clicks cannot exceed total clicks" };
  }

  if (data.suspiciousClicks.length !== data.suspiciousClicksCount) {
    return { isValid: false, error: "Suspicious clicks array length mismatch" };
  }

  return { isValid: true };
}