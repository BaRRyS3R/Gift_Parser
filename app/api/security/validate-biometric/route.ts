// src/app/api/security/validate-biometric/route.ts - Updated with 1-year block for unsupported biometrics

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
    const {
      success,
      completedInTime,
      biometricSupported = true,
    } = await request.json();

    if (success === undefined || completedInTime === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    console.log(`Biometric validation request for user ${telegramId}:`, {
      success,
      completedInTime,
      biometricSupported,
    });

    if (success && completedInTime && biometricSupported) {
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
      // Biometric failed or not supported - decrease trust score and block user
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score",
        {
          user_telegram_id: parseInt(telegramId),
          score_change: -20, // Increased penalty for biometric issues
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      // Determine block reason and duration
      const blockReason = !biometricSupported
        ? "biometric_not_supported"
        : "biometric_failed";

      // UPDATED: 1 year block for unsupported biometrics, 5 minutes for failed authentication
      const blockDuration = !biometricSupported ? 525600 : 5; // 525600 minutes = 1 year

      console.log(`Applying block for user ${telegramId}:`, {
        blockReason,
        blockDuration: blockDuration,
        blockDurationDescription: !biometricSupported ? "1 year" : "5 minutes",
      });

      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: blockReason,
        duration_minutes: blockDuration,
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to apply security block",
            message: blockError.message,
          },
          { status: 500 },
        );
      }

      const logMessage = !biometricSupported
        ? `User ${telegramId} blocked for 1 year due to unsupported biometric authentication`
        : `User ${telegramId} blocked for 5 minutes due to failed biometric authentication`;

      console.log(logMessage);

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
        blockDuration: blockDuration,
        blockReason: blockReason,
        message: !biometricSupported
          ? "Device does not support biometric authentication. Account blocked for security reasons."
          : "Biometric authentication failed. Account temporarily blocked.",
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