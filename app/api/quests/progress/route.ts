// src/app/api/quests/progress/route.ts - Update quest progress

import type { QuestProgressResponse } from "@/types/daily-quests";

import { NextRequest, NextResponse } from "next/server";

import { serverDailyQuestsService } from "@/lib/server/dailyQuestsService";
import { GameMode } from "@/types/game-modes/common";

// Request body interface
interface UpdateProgressRequest {
  gameMode: GameMode;
  gameResult: any; // Game result object from any game mode
}

/**
 * POST /api/quests/progress
 * Update quest progress after a game
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<QuestProgressResponse>> {
  try {
    // Extract user info from middleware headers
    const userId = request.headers.get("X-User-ID");
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!userId || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    // Parse request body
    let body: UpdateProgressRequest;

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

    const { gameMode, gameResult } = body;

    // Validate game mode
    if (!gameMode || !Object.values(GameMode).includes(gameMode)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game mode",
        },
        { status: 400 },
      );
    }

    // Validate game result
    if (!gameResult || typeof gameResult !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game result",
        },
        { status: 400 },
      );
    }

    // Process quest updates
    const completionResults =
      await serverDailyQuestsService.processGameQuestUpdates(
        userId,
        gameMode,
        gameResult,
      );

    // Return the first completion result (if any)
    const completion = completionResults.find((result) => result.completed);

    return NextResponse.json({
      success: true,
      completion,
    });
  } catch (error) {
    console.error("Error updating quest progress:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update quest progress",
      },
      { status: 500 },
    );
  }
}
