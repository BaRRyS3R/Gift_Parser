// src/app/api/user/attempts/consume/route.ts - Оптимизированное потребление попыток

import { NextRequest, NextResponse } from "next/server";

import { serverAttemptsService } from "@/lib/server/attemptsService";

// Response interface
interface ConsumeAttemptResponse {
  success: boolean;
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: string;
  timeUntilReset?: number;
  error?: string;
}

/**
 * POST /api/user/attempts/consume
 * Оптимизированное потребление одной попытки для аутентифицированного пользователя
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ConsumeAttemptResponse>> {
  try {
    // Извлекаем информацию о пользователе из заголовков middleware
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

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

    console.log(`Потребление попытки для пользователя ${telegramIdNumber}`);

    // Используем быстрое потребление попытки с серверной валидацией
    const attemptsStatus = await serverAttemptsService.consumeAttemptFast(telegramIdNumber);

    console.log(`Попытка потреблена для пользователя ${telegramIdNumber}:`, {
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
    console.error("Ошибка потребления попытки:", error);

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

      if (error.message.includes("Нет") && error.message.includes("попыток")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "Нет оставшихся попыток",
          },
          { status: 400 },
        );
      }

      if (error.message.includes("функции БД")) {
        console.warn("Ошибка функции БД при потреблении, используем фоллбэк метод");

        try {
          const telegramIdNumber = parseInt(request.headers.get("X-Telegram-ID")!);
          const fallbackStatus = await serverAttemptsService.consumeAttempt(telegramIdNumber);

          return NextResponse.json({
            success: true,
            canPlay: fallbackStatus.canPlay,
            attemptsRemaining: fallbackStatus.attemptsRemaining,
            resetTime: fallbackStatus.resetTime?.toISOString(),
            timeUntilReset: fallbackStatus.timeUntilReset,
          });
        } catch (fallbackError) {
          console.error("Фоллбэк метод потребления также не сработал:", fallbackError);

          return NextResponse.json(
            {
              success: false,
              canPlay: false,
              attemptsRemaining: 0,
              error: "Критическая ошибка потребления попытки",
            },
            { status: 500 },
          );
        }
      }

      // Возвращаем конкретную ошибку от сервера
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        canPlay: false,
        attemptsRemaining: 0,
        error: "Не удалось потребить попытку",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/user/attempts/consume
 * Обработка CORS preflight запросов
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}