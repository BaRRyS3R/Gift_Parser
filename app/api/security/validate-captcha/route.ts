// src/app/api/security/validate-captcha/route.ts - Updated with new trust score values

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

    if (isCorrect && completedInTime) {
      // Captcha passed - increase trust score by 40 points
      const { data: newTrustScore, error: trustError } =
        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: 40,
        });

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      console.log(`Captcha passed for user ${telegramId}, trust score increased by 40`);

      return NextResponse.json({
        success: true,
        newTrustScore: newTrustScore || 0,
      });
    } else {
      // Captcha failed - decrease trust score by 20 points and block user
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score",
        {
          user_telegram_id: parseInt(telegramId),
          score_change: -20,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: "captcha_failed",
        duration_minutes: 2,
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
      }

      console.log(
        `Captcha failed for user ${telegramId}: ${!isCorrect ? "incorrect answer" : "timeout"}, trust score decreased by 20`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
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