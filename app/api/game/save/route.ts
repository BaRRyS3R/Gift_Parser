// src/app/api/game/save/route.ts - Save regular game results

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

// Game result union type
type GameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

// Request interface
interface SaveGameRequest {
  gameResult: GameResult;
}

// Response interface
interface SaveGameResponse {
  success: boolean;
  data?: GameSaveResult;
  error?: string;
}

/**
 * POST /api/game/save
 * Save regular game result (non-tournament modes)
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

    const { gameResult } = body;

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

    // Save game result using server service
    const saveResult = await serverGameService.saveGameResult(
      telegramIdNumber,
      gameResult,
    );

    return NextResponse.json({
      success: true,
      data: saveResult,
    });
  } catch (error) {
    console.error("Error saving game result:", error);

    // Handle specific error types
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

