// src/app/api/security/validate-biometric/route.ts - Updated biometric validation with new trust score logic

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
    const { success, completedInTime } = await request.json();

    if (success === undefined || completedInTime === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    if (success && completedInTime) {
      // Biometric passed - set trust score to 39
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score_absolute",
        {
          user_telegram_id: parseInt(telegramId),
          new_score: 39,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      console.log(`Biometric authentication passed for user ${telegramId} - trust score set to 39`);

      return NextResponse.json({
        success: true,
        newTrustScore: 39,
      });
    } else {
      // Biometric failed - set trust score to 9 and block for 24 hours
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score_absolute",
        {
          user_telegram_id: parseInt(telegramId),
          new_score: 9,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: "biometric_failed",
        duration_minutes: 24 * 60, // 24 hours in minutes
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
      }

      console.log(
        `Biometric authentication failed for user ${telegramId}: ${!success ? "failed authentication" : "timeout"} - trust score set to 9, blocked for 24 hours`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 9,
        blocked: true,
        message: "Account blocked for 24 hours due to failed biometric verification",
      });
    }
  } catch (error) {
    console.error("Validate biometric API error:", error);

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