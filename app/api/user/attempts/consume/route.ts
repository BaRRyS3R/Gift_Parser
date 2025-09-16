// src/app/api/user/attempts/consume/route.ts - Enhanced with detailed logging for debugging

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
  // Session data
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
 * Enhanced with detailed logging for debugging attempts issues
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ConsumeAttemptResponse>> {
  const requestId = crypto.randomUUID().slice(0, 8); // For request tracking
  console.log(`[CONSUME_${requestId}] Starting attempt consumption`);
  
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    console.log(`[CONSUME_${requestId}] Headers - TelegramID: ${telegramId}, UserID: ${userId}`);

    if (!telegramId || !userId) {
      console.log(`[CONSUME_${requestId}] FAILED - Missing authentication headers`);
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
      console.log(`[CONSUME_${requestId}] FAILED - Invalid telegram ID: ${telegramId}`);
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
      console.log(`[CONSUME_${requestId}] Request body:`, body);
    } catch (error) {
      console.log(`[CONSUME_${requestId}] FAILED - Invalid request body:`, error);
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
      console.log(`[CONSUME_${requestId}] FAILED - Invalid game mode: ${body.gameMode}`);
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
    console.log(`[CONSUME_${requestId}] Fetching user data for telegram ID: ${telegramIdNumber}`);
    const user = await serverUserService.findByTelegramId(telegramIdNumber);

    if (!user) {
      console.log(`[CONSUME_${requestId}] FAILED - User not found: ${telegramIdNumber}`);
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

    console.log(`[CONSUME_${requestId}] User found - Current attempts: ${user.attempts_remaining}`);

    // ENHANCED: Pre-validate attempts before attempting to consume
    if (user.attempts_remaining <= 0) {
      console.log(`[CONSUME_${requestId}] PRE-VALIDATION FAILED - No attempts remaining: ${user.attempts_remaining}`);
      
      // Check if user needs automatic reset
      try {
        const preCheckStatus = await serverAttemptsService.checkAndUpdateAttempts(telegramIdNumber);
        console.log(`[CONSUME_${requestId}] Pre-check status after update:`, preCheckStatus);
        
        if (!preCheckStatus.canPlay) {
          console.log(`[CONSUME_${requestId}] FAILED - Still cannot play after pre-check`);
          return NextResponse.json(
            {
              success: false,
              canPlay: false,
              attemptsRemaining: preCheckStatus.attemptsRemaining,
              resetTime: preCheckStatus.resetTime?.toISOString(),
              timeUntilReset: preCheckStatus.timeUntilReset,
              error: "No attempts remaining",
            },
            { status: 423 }, // 423 = Locked
          );
        }
      } catch (preCheckError) {
        console.error(`[CONSUME_${requestId}] Pre-check failed:`, preCheckError);
        // Continue with original logic if pre-check fails
      }
    }

    // ATOMIC OPERATION: Consume attempt with session creation
    console.log(`[CONSUME_${requestId}] Starting atomic consume operation`);
    
    // First, consume the attempt
    const attemptsStatus = await serverAttemptsService.consumeAttempt(telegramIdNumber);
    
    console.log(`[CONSUME_${requestId}] Consume attempt result:`, {
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
    });

    if (!attemptsStatus.canPlay) {
      console.log(`[CONSUME_${requestId}] FAILED - Consume attempt returned canPlay=false`);
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
    console.log(`[CONSUME_${requestId}] Creating game session for game mode: ${body.gameMode}`);
    
    const sessionResult = await serverGameSessionService.createSession(
      user.id,
      telegramIdNumber,
      body.gameMode,
    );

    console.log(`[CONSUME_${requestId}] Session creation result:`, {
      success: sessionResult.success,
      sessionId: sessionResult.session_id,
      error: sessionResult.error,
    });

    if (!sessionResult.success) {
      // If session creation fails, we should ideally rollback the attempt consumption
      console.error(`[CONSUME_${requestId}] FAILED - Session creation failed after consuming attempt:`, {
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
    const response = {
      success: true,
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
      sessionId: sessionResult.session_id,
      sessionExpiresAt: sessionResult.expires_at?.toISOString(),
    };

    console.log(`[CONSUME_${requestId}] SUCCESS - Response:`, response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[CONSUME_${requestId}] UNEXPECTED ERROR:`, error);

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
        console.log(`[CONSUME_${requestId}] Error indicates no attempts: ${error.message}`);
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
