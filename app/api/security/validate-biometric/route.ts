// src/app/api/security/validate-biometric/route.ts - Updated with new blocking reasons

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
    const { success, completedInTime, biometricSupported = true } = await request.json();

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
      // Biometric passed - increase trust score significantly
      const { data: newTrustScore, error: trustError } =
        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: 30,
        });

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      console.log(`Biometric authentication passed for user ${telegramId}`);

      return NextResponse.json({
        success: true,
        newTrustScore,
      });
    } else {
      // Biometric failed - decrease trust score and block user
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score",
        {
          user_telegram_id: parseInt(telegramId),
          score_change: -15,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      // Determine block reason and duration
      const blockReason = !biometricSupported
        ? "biometric_not_supported"
        : "biometric_failed";

      const blockDuration = !biometricSupported ? 10 : 5; // 10 minutes for unsupported, 5 for failed

      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: blockReason,
        duration_minutes: blockDuration,
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
      }

      console.log(
        `Biometric authentication failed for user ${telegramId}: ${!biometricSupported ? "unsupported device" : !success ? "failed authentication" : "timeout"}`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
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