// src/app/api/user/attempts/status/route.ts - Updated with level information

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";

// Enhanced response interface with level information
interface AttemptsStatusResponse {
  success: boolean;
  canPlay: boolean;
  attemptsRemaining: number;
  resetTime?: string;
  timeUntilReset?: number;
  // NEW: Level information
  userLevel?: {
    currentLevel: number;
    totalGames: number;
  };
  error?: string;
}

/**
 * GET /api/user/attempts/status
 * Get current user attempts status with level information
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

    // Get attempts status from server
    const attemptsStatus =
      await serverUserService.checkAndUpdateAttemptsWithServerValidation(
        telegramIdNumber,
      );

    // Get user data for level information
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

    console.log(`Attempts and level status for user ${telegramIdNumber}:`, {
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      currentLevel: user.current_level,
      totalGames: user.total_games,
      hasResetTime: !!attemptsStatus.resetTime,
    });

    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
      userLevel: {
        currentLevel: user.current_level,
        totalGames: user.total_games,
      },
    });
  } catch (error) {
    console.error("Error getting attempts and level status:", error);

    // Handle specific error types
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
    }

    return NextResponse.json(
      {
        success: false,
        canPlay: false,
        attemptsRemaining: 0,
        error: "Failed to get attempts and level status",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/user/attempts/status
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
