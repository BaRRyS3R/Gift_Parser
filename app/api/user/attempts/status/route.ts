// src/app/api/user/attempts/status/route.ts - Оптимизированное получение статуса попыток

import { NextRequest, NextResponse } from "next/server";

import { serverAttemptsService } from "@/lib/server/attemptsService";

// Response interface
interface AttemptsStatusResponse {
  success: boolean;
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: string;
  timeUntilReset?: number;
  error?: string;
}

/**
 * GET /api/user/attempts/status
 * Оптимизированное получение текущего статуса попыток пользователя
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<AttemptsStatusResponse>> {
  try {
    // Извлекаем информацию о пользователе из заголовков middleware
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");
    const isFastCheck = request.headers.get("X-Fast-Check");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
          error: "Требуется аутентификация пользователя",
        },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
          error: "Неверный ID пользователя",
        },
        { status: 400 },
      );
    }

    console.log(`Получение статуса попыток для пользователя ${telegramIdNumber} (fast: ${!!isFastCheck})`);

    // Используем быструю проверку для оптимизации производительности
    const attemptsStatus = isFastCheck 
      ? await serverAttemptsService.checkAndUpdateAttemptsFast(telegramIdNumber)
      : await serverAttemptsService.checkAndUpdateAttempts(telegramIdNumber);

    console.log(`Статус попыток для пользователя ${telegramIdNumber}:`, {
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      hasResetTime: !!attemptsStatus.resetTime,
    });

    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
    });
  } catch (error) {
    console.error("Ошибка получения статуса попыток:", error);

    // Обработка специфических типов ошибок
    if (error instanceof Error) {
      if (error.message.includes("не найден")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "Пользователь не найден",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("функции БД")) {
        console.warn("Ошибка функции БД, используем фоллбэк метод");
        
        try {
          const telegramIdNumber = parseInt(request.headers.get("X-Telegram-ID")!);
          const fallbackStatus = await serverAttemptsService.checkAndUpdateAttempts(telegramIdNumber);
          
          return NextResponse.json({
            success: true,
            canPlay: fallbackStatus.canPlay,
            attemptsRemaining: fallbackStatus.attemptsRemaining,
            resetTime: fallbackStatus.resetTime?.toISOString(),
            timeUntilReset: fallbackStatus.timeUntilReset,
          });
        } catch (fallbackError) {
          console.error("Фоллбэк метод также не сработал:", fallbackError);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        canPlay: false,
        attemptsRemaining: 0,
        error: "Не удалось получить статус попыток",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/user/attempts/status
 * Обработка CORS preflight запросов
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Fast-Check",
      "Access-Control-Max-Age": "86400",
    },
  });
}