// src/app/api/security/validate-captcha/route.ts - ИСПРАВЛЕНО: использует стандартное обновление

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware-added header
    const userId = request.headers.get("x-user-id");
    const telegramId = request.headers.get("x-telegram-id");

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
    const { userInput, correctAnswer, completedInTime } = await request.json();

    if (!userInput || !correctAnswer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    const isCorrect = userInput.toLowerCase() === correctAnswer.toLowerCase();

    console.log("Captcha validation:", {
      userInput,
      correctAnswer,
      isCorrect,
      completedInTime,
      telegramId
    });

    if (isCorrect && completedInTime) {
      // ИСПРАВЛЕНО: используем прямое обновление вместо RPC
      const { error: trustError } = await supabaseServer
        .from("users")
        .update({
          trust_score: 40,
          updated_at: new Date().toISOString()
        })
        .eq("telegram_id", parseInt(telegramId));

      if (trustError) {
        console.error("Error updating trust score:", trustError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update trust score",
          },
          { status: 500 },
        );
      }

      console.log(`Captcha passed for user ${telegramId} - trust score set to 40`);

      return NextResponse.json({
        success: true,
        newTrustScore: 40,
      });
    } else {
      // ИСПРАВЛЕНО: используем прямое обновление и блокировку
      const blockUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

      const { error: trustError } = await supabaseServer
        .from("users")
        .update({
          trust_score: 19,
          blocked_until: blockUntil.toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("telegram_id", parseInt(telegramId));

      if (trustError) {
        console.error("Error updating user after captcha failure:", trustError);
      }

      // Также создадим запись в user_blocks
      const { error: blockError } = await supabaseServer
        .from("user_blocks")
        .insert({
          user_id: userId,
          telegram_id: parseInt(telegramId),
          block_reason: "captcha_failed",
          blocked_at: new Date().toISOString(),
          block_duration_minutes: 2,
          is_active: true,
        });

      if (blockError) {
        console.error("Error creating block record:", blockError);
      }

      console.log(
        `Captcha failed for user ${telegramId}: ${!isCorrect ? "incorrect answer" : "timeout"} - trust score set to 19, blocked for 2 minutes`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 19,
        blocked: true,
        message: "Account temporarily blocked due to failed captcha verification",
      });
    }
  } catch (error) {
    console.error("Validate captcha API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}