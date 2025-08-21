// src/app/api/game/save/route.ts - ОПТИМИЗИРОВАННАЯ версия

import type { ReactionGameResult } from "@/types/game-modes/reaction";
import type { SurvivalGameResult } from "@/types/game-modes/survival";
import type { PhysicsGameResult } from "@/types/game-modes/physics";
import type { RotationGameResult } from "@/types/game-modes/rotation";

import { NextRequest, NextResponse } from "next/server";
import { GameMode } from "@/types/game-modes/common";
import { serverGameService, type GameSaveResult } from "@/lib/server/gameService";

// Game result union type
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult;

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
 * ОПТИМИЗИРОВАННАЯ версия сохранения игры
 * Время выполнения: 3-5 сек → 0.5-1 сек
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveGameResponse>> {
  const startTime = Date.now(); // Для мониторинга производительности

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
    if (!gameResult.mode || !Object.values(GameMode).includes(gameResult.mode)) {
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

    // ОПТИМИЗИРОВАННОЕ сохранение игры
    // Используем новый метод который делает основное сохранение атомарно
    // и выполняет дополнительные системы параллельно
    const saveResult = await serverGameService.saveGameResult(
      telegramIdNumber,
      gameResult,
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Логирование производительности
    console.log(`[PERF] Game save completed in ${duration}ms for mode ${gameResult.mode}`);

    // Предупреждение если сохранение все еще медленное
    if (duration > 2000) {
      console.warn(`[PERF] Slow game save detected: ${duration}ms (mode: ${gameResult.mode})`);
    }

    return NextResponse.json({
      success: true,
      data: saveResult,
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`[ERROR] Game save failed after ${duration}ms:`, error);

    // Enhanced error handling с specific error types
    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("Failed to save game data")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database error while saving game",
          },
          { status: 500 },
        );
      }

      if (error.message.includes("Game save operation failed")) {
        return NextResponse.json(
          {
            success: false,
            error: "Game save operation failed",
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
