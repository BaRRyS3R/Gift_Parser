// src/app/api/game/save/route.ts - Updated with session validation and attempts status response

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { NextRequest, NextResponse } from "next/server";

import { GameMode } from "@/types/game-modes/common";
import {
  serverGameService,
  type GameSaveResult,
} from "@/lib/server/gameService";
import { serverGameSessionService } from "@/lib/server/gameSessionService";

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Enhanced request interface with session ID
interface SaveGameRequest {
  gameResult: GameResult;
  sessionId: string; // Required session ID
}

// Enhanced response interface with attempts status
interface SaveGameResponse {
  success: boolean;
  data?: GameSaveResult;
  error?: string;
  sessionError?: string; // Specific session validation errors
}

/**
 * POST /api/game/save
 * Enhanced version with session validation and attempts status response
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveGameResponse>> {
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
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
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // Parse request body
    let body: SaveGameRequest;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    const { gameResult, sessionId } = body;

    // Validate session ID is provided
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
          sessionError: "Missing or invalid session ID",
        },
        { status: 400 },
      );
    }

    // Validate game result
    if (!gameResult || typeof gameResult !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Game result is required",
        },
        { status: 400 },
      );
    }

    // Validate required fields
    if (
      !gameResult.mode ||
      !Object.values(GameMode).includes(gameResult.mode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game mode",
        },
        { status: 400 },
      );
    }

    if (typeof gameResult.score !== "number" || gameResult.score < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid score",
        },
        { status: 400 },
      );
    }

    if (typeof gameResult.duration !== "number" || gameResult.duration < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid duration",
        },
        { status: 400 },
      );
    }

    // CRITICAL: Validate and finish the game session
    console.log(
      `[GameSave] Validating session ${sessionId} for user ${telegramIdNumber}`,
    );

    const sessionValidation =
      await serverGameSessionService.validateAndFinishSession(
        sessionId,
        telegramIdNumber,
      );

    if (!sessionValidation.success) {
      console.warn(`[GameSave] Session validation failed:`, {
        sessionId,
        telegramId: telegramIdNumber,
        error: sessionValidation.error,
        wasValid: sessionValidation.was_valid,
      });

      // Return specific session error
      const statusCode = sessionValidation.was_valid ? 410 : 400; // 410 = Gone (expired), 400 = Bad Request (invalid)

      return NextResponse.json(
        {
          success: false,
          error: "Session validation failed",
          sessionError: sessionValidation.error || "Invalid session",
        },
        { status: statusCode },
      );
    }

    console.log(`[GameSave] Session ${sessionId} validated successfully`);

    // Session is valid, proceed with saving game result
    const saveResult = await serverGameService.saveGameResult(
      telegramIdNumber,
      gameResult,
    );

    console.log(
      `[GameSave] Game result saved successfully for session ${sessionId}`,
    );

    return NextResponse.json({
      success: true,
      data: saveResult, // This now includes attemptsStatus from gameService
    });
  } catch (error) {
    console.error("Error saving game result:", error);

    // Enhanced error handling with session context
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("session")) {
        return NextResponse.json(
          {
            success: false,
            error: "Session validation error",
            sessionError: error.message,
          },
          { status: 400 },
        );
      }

      if (error.message.includes("statistics")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update user statistics",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save game result",
      },
      { status: 500 },
    );
  }
}