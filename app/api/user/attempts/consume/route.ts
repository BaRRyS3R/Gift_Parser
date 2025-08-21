// src/app/api/user/attempts/consume/route.ts - ОПТИМИЗИРОВАННАЯ версия

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
 * ОПТИМИЗИРОВАННАЯ версия - атомарное потребление в одном RPC call
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ConsumeAttemptResponse>> {
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

    // ОПТИМИЗАЦИЯ: Атомарное потребление в одном RPC call с блокировкой
    // Было: checkAndUpdateAttempts + validation + multiple updates
    // Стало: consumeAttempt (атомарная операция с FOR UPDATE)
    const attemptsStatus = await serverAttemptsService.consumeAttempt(telegramIdNumber);

    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
    });

  } catch (error) {
    console.error("Error consuming attempt:", error);

    // Enhanced error handling with specific error types
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

      if (error.message.includes("No attempts remaining")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "No attempts remaining",
          },
          { status: 423 }, // 423 = Locked
        );
      }

      if (error.message.includes("Failed to consume attempt")) {
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
        error: "Failed to consume attempt",
      },
      { status: 500 },
    );
  }
}

/**
 * НОВЫЙ: OPTIONS для CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-ID, X-User-ID',
    },
  });
}