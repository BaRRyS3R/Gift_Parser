// src/app/api/user/attempts/consume/route.ts - Updated with game session creation

import { NextRequest, NextResponse } from "next/server";

import { serverAttemptsService } from "@/lib/server/attemptsService";
import { serverGameSessionService } from "@/lib/server/gameSessionService";
import { serverUserService } from "@/lib/supabase_server";
import { GameMode } from "@/types/game-modes/common";

// Enhanced response interface with session data
interface ConsumeAttemptResponse {
  success: boolean;
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: string;
  timeUntilReset?: number;
  // NEW: Session data
  sessionId?: string;
  sessionExpiresAt?: string;
  error?: string;
}

// Request interface for game mode
interface ConsumeAttemptRequest {
  gameMode: GameMode;
}

/**
 * POST /api/user/attempts/consume
 * Enhanced version with game session creation
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

    // Parse request body to get game mode
    let body: ConsumeAttemptRequest;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    // Validate game mode
    if (!body.gameMode || !Object.values(GameMode).includes(body.gameMode)) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: 0,
          error: "Invalid or missing game mode",
        },
        { status: 400 },
      );
    }

    // Verify user exists and get user data
    const user = await serverUserService.findByTelegramId(telegramIdNumber);

    if (!user) {
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

    // ATOMIC OPERATION: Consume attempt with session creation
    // First, consume the attempt
    const attemptsStatus =
      await serverAttemptsService.consumeAttempt(telegramIdNumber);

    if (!attemptsStatus.canPlay) {
      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: attemptsStatus.attemptsRemaining,
          resetTime: attemptsStatus.resetTime?.toISOString(),
          timeUntilReset: attemptsStatus.timeUntilReset,
          error: "No attempts remaining",
        },
        { status: 423 }, // 423 = Locked
      );
    }

    // If attempt consumption successful, create game session
    const sessionResult = await serverGameSessionService.createSession(
      user.id,
      telegramIdNumber,
      body.gameMode,
    );

    if (!sessionResult.success) {
      // If session creation fails, we should ideally rollback the attempt consumption
      // For now, log the error and return the session creation failure
      console.error("Failed to create game session after consuming attempt:", {
        userId: user.id,
        telegramId: telegramIdNumber,
        gameMode: body.gameMode,
        error: sessionResult.error,
      });

      return NextResponse.json(
        {
          success: false,
          canPlay: false,
          attemptsRemaining: attemptsStatus.attemptsRemaining,
          error: sessionResult.error || "Failed to create game session",
        },
        { status: 500 },
      );
    }

    // Success: return both attempts status and session data
    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
      sessionId: sessionResult.session_id,
      sessionExpiresAt: sessionResult.expires_at?.toISOString(),
    });
  } catch (error) {
    console.error("Error consuming attempt and creating session:", error);

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

      if (error.message.includes("session")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "Failed to create game session",
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
 * OPTIONS for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Telegram-ID, X-User-ID",
    },
  });
}
