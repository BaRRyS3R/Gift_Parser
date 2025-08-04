// src/app/api/user/attempts/consume/route.ts - Consume user attempt

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";

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
 * Consume one attempt for the authenticated user
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

    // Consume attempt with server-side validation
    const attemptsStatus =
      await serverUserService.consumeAttemptWithServerValidation(
        telegramIdNumber,
      );

    return NextResponse.json({
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
    });
  } catch (error) {
    console.error("Error consuming attempt:", error);

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

      if (error.message.includes("No attempts remaining")) {
        return NextResponse.json(
          {
            success: false,
            canPlay: false,
            attemptsRemaining: 0,
            error: "No attempts remaining",
          },
          { status: 400 },
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
 * OPTIONS /api/user/attempts/consume
 * Handle CORS preflight requests
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
