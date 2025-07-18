// src/app/api/game/save/route.ts - Game result saving API endpoint

import { NextRequest, NextResponse } from "next/server";

import {
  serverGameService,
  type GameSaveResponse,
  type GameResult,
} from "@/lib/server/gameService";

// Response interface for API
interface GameSaveAPIResponse {
  success: boolean;
  data?: GameSaveResponse;
  error?: string;
}

/**
 * POST /api/game/save
 * Save game result and update user statistics
 * Includes league progression and reward handling
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<GameSaveAPIResponse>> {
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
          error: "Invalid user ID format",
        },
        { status: 400 },
      );
    }

    // Parse request body
    let requestBody;

    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    const { gameResult } = requestBody;

    if (!gameResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Game result is required",
        },
        { status: 400 },
      );
    }

    // Validate game result structure
    if (!serverGameService.validateGameResult(gameResult)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game result format",
        },
        { status: 400 },
      );
    }

    console.log(`Processing game save request for user ${telegramIdNumber}:`, {
      mode: gameResult.mode,
      score: gameResult.score,
      duration: gameResult.duration,
    });

    // Save game result using server service
    const saveResult = await serverGameService.saveGameResult(
      telegramIdNumber,
      gameResult as GameResult,
    );

    if (!saveResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: saveResult.error || "Failed to save game result",
        },
        { status: 500 },
      );
    }

    console.log(
      `Successfully processed game save for user ${telegramIdNumber}:`,
      {
        leagueChanged: saveResult.leagueChanged,
        levelChanged: saveResult.levelChanged,
        hasReward: !!saveResult.reward,
        hasMissedRewards: !!(
          saveResult.missedRewards && saveResult.missedRewards.length > 0
        ),
      },
    );

    return NextResponse.json({
      success: true,
      data: saveResult,
    });
  } catch (error) {
    console.error("Error in game save API:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User account not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("validation")) {
        return NextResponse.json(
          {
            success: false,
            error: "Game result validation failed",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during game save",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/game/save
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
