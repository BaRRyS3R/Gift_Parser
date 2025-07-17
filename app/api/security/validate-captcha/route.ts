// src/app/api/security/validate-captcha/route.ts - Captcha validation endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");
    const { userInput, correctAnswer, completedInTime } = await request.json();

    if (!telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    const isCorrect = userInput.toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect && completedInTime) {
      // Captcha passed - increase trust score
      const { data, error } = await supabaseServer.rpc("update_trust_score", {
        user_telegram_id: parseInt(telegramId),
        score_change: 15,
      });

      if (error) {
        console.error("Error updating trust score:", error.message);
      }

      return NextResponse.json({
        success: true,
        newTrustScore: data || 0,
      });
    } else {
      // Captcha failed - block user and decrease trust score
      await supabaseServer.rpc("update_trust_score", {
        user_telegram_id: parseInt(telegramId),
        score_change: -10,
      });

      await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: "captcha_failed",
        duration_minutes: 2,
      });

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
      });
    }
  } catch (error) {
    console.error("Captcha validation API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate captcha",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
