// src/app/api/security/validate-gyroscope/route.ts - Validate gyroscope API endpoint

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
    const { success, completedInTime, verificationData } = await request.json();

    if (success === undefined || completedInTime === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // Validate verification data if provided
    let isValidMotion = false;
    if (verificationData && success) {
      isValidMotion = validateMotionData(verificationData);
    }

    if (success && completedInTime && isValidMotion) {
      // Gyroscope passed - set trust score to 19 (still low but allows basic access)
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score_absolute",
        {
          user_telegram_id: parseInt(telegramId),
          new_score: 19,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      console.log(`Gyroscope verification passed for user ${telegramId}`);

      return NextResponse.json({
        success: true,
        newTrustScore: 19,
      });
    } else {
      // Gyroscope failed - block user for 1 year and keep low trust score
      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: "gyroscope_failed",
        duration_minutes: 365 * 24 * 60, // 1 year in minutes
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
      }

      console.log(
        `Gyroscope verification failed for user ${telegramId}: ${
          !success 
            ? "verification failed" 
            : !completedInTime 
              ? "timeout" 
              : "invalid motion data"
        }`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
        blocked: true,
        message: "Account has been permanently blocked due to failed security verification",
      });
    }
  } catch (error) {
    console.error("Validate gyroscope API error:", error);

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

/**
 * Validate motion data to ensure it's not spoofed
 */
function validateMotionData(data: any): boolean {
  if (!data || !data.gyroscopeData || !data.orientationData || !data.stepCompletions) {
    return false;
  }

  const { gyroscopeData, orientationData, stepCompletions, totalTime } = data;

  // Check if we have enough data points
  if (gyroscopeData.length < 20 || orientationData.length < 20) {
    return false;
  }

  // Check time validity (should be between 15-60 seconds)
  if (totalTime < 15000 || totalTime > 60000) {
    return false;
  }

  // Check if all steps were completed
  if (!stepCompletions.every((step: boolean) => step === true)) {
    return false;
  }

  // Validate gyroscope data variance (should show real movement)
  const gyroVariance = calculateVariance(gyroscopeData.map((d: any) => d.x));
  if (gyroVariance < 0.1) {
    return false; // Too little movement, possibly spoofed
  }

  // Validate orientation data shows actual rotation
  const alphaRange = getRange(orientationData.map((d: any) => d.alpha));
  const betaRange = getRange(orientationData.map((d: any) => d.beta));
  const gammaRange = getRange(orientationData.map((d: any) => d.gamma));

  // Should have significant movement in at least 2 axes
  const significantMovement = [alphaRange, betaRange, gammaRange].filter(range => range > 15).length >= 2;
  
  if (!significantMovement) {
    return false;
  }

  // Check data consistency (timestamps should be sequential)
  for (let i = 1; i < gyroscopeData.length; i++) {
    if (gyroscopeData[i].timestamp <= gyroscopeData[i - 1].timestamp) {
      return false; // Invalid timestamp sequence
    }
  }

  return true;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

function getRange(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}