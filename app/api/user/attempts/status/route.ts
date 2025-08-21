// src/app/api/user/attempts/status/route.ts - ОПТИМИЗИРОВАННАЯ версия

import { NextRequest, NextResponse } from "next/server";
import { serverAttemptsService } from "@/lib/server/attemptsService";

// Enhanced response interface
interface AttemptsStatusResponse {
  success: boolean;
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: string;
  timeUntilReset?: number;
  userLevel?: {
    currentLevel: number;
    totalGames: number;
  };
  error?: string;
}

/**
 * GET /api/user/attempts/status
 * ОПТИМИЗИРОВАННАЯ версия - один RPC call вместо множественных запросов
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<AttemptsStatusResponse>> {
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
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
          canPlay: false,
          attemptsRemaining: 0,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // ОПТИМИЗАЦИЯ: Один RPC call получает все данные включая level
    // Было: serverUserService.checkAndUpdateAttempts + serverUserService.findByTelegramId
    // Стало: serverAttemptsService.checkAndUpdateAttempts (с level данными)
    const attemptsStatus = await serverAttemptsService.checkAndUpdateAttempts(telegramIdNumber);

    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
      userLevel: attemptsStatus.userLevel,
    });

  } catch (error) {
    console.error("Error getting attempts and level status:", error);

    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("Failed to check attempts")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "Database error",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        canPlay: false,
        attemptsRemaining: 0,
        error: "Failed to get attempts status",
      },
      { status: 500 },
    );
  }
}

/**
 * НОВЫЙ: HEAD метод для быстрой проверки возможности игры
 * Возвращает только HTTP статус без body для минимального трафика
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!telegramId) {
      return new NextResponse(null, { status: 401 });
    }

    const telegramIdNumber = parseInt(telegramId);
    if (isNaN(telegramIdNumber)) {
      return new NextResponse(null, { status: 400 });
    }

    // Быстрая проверка без обновлений
    const canPlay = await serverAttemptsService.canUserPlay(telegramIdNumber);

    return new NextResponse(null, {
      status: canPlay ? 200 : 423, // 423 = Locked
      headers: {
        'X-Can-Play': canPlay.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error("Error in HEAD attempts check:", error);
    return new NextResponse(null, { status: 500 });
  }
}