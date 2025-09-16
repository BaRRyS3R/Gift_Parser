// src/app/api/user/attempts/consume/route.ts - ИСПРАВЛЕНА критическая ошибка в логике

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
 * ИСПРАВЛЕНА критическая ошибка в логике потребления попыток
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

    // ATOMIC OPERATION: Потребление попытки
    console.log(`[CONSUME_${requestId}] Starting atomic consume operation`);
    
    const attemptsStatus = await serverAttemptsService.consumeAttempt(telegramIdNumber);
    
    console.log(`[CONSUME_${requestId}] Consume attempt result:`, {
      success: "success" in attemptsStatus ? attemptsStatus.success : "field not present",
      canPlay: attemptsStatus.canPlay,
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
    });

    // ИСПРАВЛЕНО: Правильная проверка результата потребления попытки
    // Функция consume_attempt возвращает объект с полем success, но мы его не проверяем
    // Проверяем успешность операции через RPC результат
    
    // Если у функции есть поле success и оно false - попытку потребить не удалось
    if ('success' in attemptsStatus && !attemptsStatus.success) {
      console.log(`[CONSUME_${requestId}] FAILED - Could not consume attempt (no attempts available)`);
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

    // ИСПРАВЛЕНО: Если мы дошли до этого места, значит попытка была успешно потреблена
    // Теперь создаем игровую сессию независимо от того, остались ли еще попытки
    console.log(`[CONSUME_${requestId}] Attempt successfully consumed, creating game session for: ${body.gameMode}`);
    
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
      // КРИТИЧНО: Если создание сессии не удалось, нужно восстановить попытку
      console.error(`[CONSUME_${requestId}] CRITICAL - Session creation failed after consuming attempt:`, {
        userId: user.id,
        telegramId: telegramIdNumber,
        gameMode: body.gameMode,
        error: sessionResult.error,
        note: "Attempt was consumed but session creation failed - this should trigger attempt restoration"
      });

      // TODO: Реализовать механизм восстановления попытки при сбое создания сессии
      // На данный момент логируем критическую ошибку для мониторинга

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

    // SUCCESS: Попытка потреблена, сессия создана - возвращаем результат
    const response = {
      success: true,
      canPlay: true, // ИСПРАВЛЕНО: Пользователь может играть, так как сессия создана
      attemptsRemaining: attemptsStatus.attemptsRemaining,
      resetTime: attemptsStatus.resetTime?.toISOString(),
      timeUntilReset: attemptsStatus.timeUntilReset,
      sessionId: sessionResult.session_id,
      sessionExpiresAt: sessionResult.expires_at?.toISOString(),
    };

    console.log(`[CONSUME_${requestId}] SUCCESS - Attempt consumed and session created:`, {
      sessionId: response.sessionId,
      remainingAttempts: response.attemptsRemaining,
      canPlayMore: response.attemptsRemaining > 0
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[CONSUME_${requestId}] UNEXPECTED ERROR:`, error);

    // Enhanced error handling
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
          { status: 423 },
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