// src/app/api/game/save/route.ts - Save regular game results with comprehensive logging

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
 * API Performance logger utility
 */
class ApiPerformanceLogger {
  private startTime: number;
  private lastCheckpoint: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    this.lastCheckpoint = this.startTime;
    console.log(`[API] 🚀 Started: ${operation}`);
  }

  checkpoint(step: string, data?: any) {
    const now = Date.now();
    const stepTime = now - this.lastCheckpoint;
    const totalTime = now - this.startTime;
    
    console.log(`[API] ⏱️  ${this.operation} -> ${step}: ${stepTime}ms (Total: ${totalTime}ms)`, data ? data : '');
    this.lastCheckpoint = now;
  }

  finish(statusCode: number, result?: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[API] ✅ Completed: ${this.operation} in ${totalTime}ms (Status: ${statusCode})`, result ? { success: result.success } : '');
  }

  error(statusCode: number, error: any) {
    const totalTime = Date.now() - this.startTime;
    console.log(`[API] ❌ Failed: ${this.operation} after ${totalTime}ms (Status: ${statusCode})`, error.message || error);
  }
}

/**
 * POST /api/game/save
 * Save regular game result (non-tournament modes)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveGameResponse>> {
  const logger = new ApiPerformanceLogger("POST /api/game/save");

  try {
    // Extract user info from middleware headers
    logger.checkpoint("Extracting user authentication");
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      logger.error(401, new Error("Missing authentication headers"));
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
      logger.error(400, new Error("Invalid telegram ID format"));
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    logger.checkpoint("Authentication validated", { telegramId: telegramIdNumber, userId });

    // Parse request body
    logger.checkpoint("Parsing request body");
    let body: SaveGameRequest;

    try {
      const bodyParseStart = Date.now();
      body = await request.json();
      const bodyParseTime = Date.now() - bodyParseStart;
      logger.checkpoint("Request body parsed", { parseTime: `${bodyParseTime}ms` });
    } catch (error) {
      logger.error(400, new Error("JSON parse failed"));
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
    logger.checkpoint("Validating game result");
    if (!gameResult || typeof gameResult !== "object") {
      logger.error(400, new Error("Missing game result"));
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
      logger.error(400, new Error(`Invalid game mode: ${gameResult.mode}`));
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game mode",
        },
        { status: 400 },
      );
    }

    if (typeof gameResult.score !== "number" || gameResult.score < 0) {
      logger.error(400, new Error(`Invalid score: ${gameResult.score}`));
      return NextResponse.json(
        {
          success: false,
          error: "Invalid score",
        },
        { status: 400 },
      );
    }

    if (typeof gameResult.duration !== "number" || gameResult.duration < 0) {
      logger.error(400, new Error(`Invalid duration: ${gameResult.duration}`));
      return NextResponse.json(
        {
          success: false,
          error: "Invalid duration",
        },
        { status: 400 },
      );
    }

    logger.checkpoint("Validation completed", { 
      mode: gameResult.mode, 
      score: gameResult.score, 
      duration: gameResult.duration 
    });

    // Save game result using server service
    logger.checkpoint("Calling serverGameService.saveGameResult");
    const serviceCallStart = Date.now();
    
    const saveResult = await serverGameService.saveGameResult(
      telegramIdNumber,
      gameResult,
    );

    const serviceCallTime = Date.now() - serviceCallStart;
    logger.checkpoint("Game service completed", { 
      serviceCallTime: `${serviceCallTime}ms`,
      levelChanged: saveResult.levelChanged,
      achievementsUnlocked: saveResult.achievementsUnlocked?.length || 0,
      questCompletions: saveResult.questCompletions?.length || 0,
      tournamentUpdated: !!saveResult.tournamentInfo
    });

    const response = {
      success: true,
      data: saveResult,
    };

    logger.finish(200, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Error saving game result:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        logger.error(404, error);
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("statistics")) {
        logger.error(500, error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update user statistics",
          },
          { status: 500 },
        );
      }

      // Log detailed error information
      console.error(`[API] Detailed error info:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    logger.error(500, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save game result",
      },
      { status: 500 },
    );
  }
}