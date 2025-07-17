// src/app/api/security/check-status/route.ts - Complete fix for trust score handling and caching issues

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    // Extract authentication information from middleware
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

    console.log(`Security check-status: Processing request for user ${telegramId}`);

    // Perform unblock check first using internal API call
    try {
      const unblockResponse = await fetch(`${request.nextUrl.origin}/api/security/unblock-check`, {
        method: "POST",
        headers: {
          "Authorization": request.headers.get("authorization") || "",
          "x-user-id": userId,
          "x-telegram-id": telegramId,
          "Content-Type": "application/json",
        },
      });

      if (!unblockResponse.ok) {
        console.error("Unblock check failed:", unblockResponse.status);
      } else {
        console.log(`Security check-status: Unblock check completed for user ${telegramId}`);
      }
    } catch (error) {
      console.error("Error performing unblock check:", error);
    }

    // Retrieve current user security data with explicit trust_score selection
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("trust_score, blocked_until, is_active")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Database error fetching user security data:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "User security data not found",
          message: userError.message,
        },
        { status: 404 },
      );
    }

    if (!user) {
      console.error("User not found in database:", userId);
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Ensure trust_score is always a valid number - no defaults
    let trustScore = 0;
    if (typeof user.trust_score === 'number' && !isNaN(user.trust_score)) {
      trustScore = user.trust_score;
    } else {
      console.warn(`Invalid trust_score for user ${telegramId}: ${user.trust_score}, using 0`);
    }

    // Obtain accurate server time
    let serverTime = new Date();
    try {
      const timeResponse = await fetch(`${request.nextUrl.origin}/api/security/server-time`, {
        method: "GET",
        headers: {
          "Authorization": request.headers.get("authorization") || "",
          "x-user-id": userId,
          "x-telegram-id": telegramId,
        },
      });

      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        if (timeData.success && timeData.timestamp) {
          serverTime = new Date(timeData.timestamp);
        }
      }
    } catch (error) {
      console.error("Error fetching server time:", error);
    }

    // Determine block status based on server time
    const isBlocked = user.blocked_until
      ? new Date(user.blocked_until) > serverTime
      : false;

    let timeUntilUnblock: number | undefined;
    let blockReason: string | undefined;

    // Calculate time until unblock and fetch block reason if blocked
    if (isBlocked && user.blocked_until) {
      timeUntilUnblock = new Date(user.blocked_until).getTime() - serverTime.getTime();

      // Retrieve active block reason
      try {
        const blocksResponse = await fetch(`${request.nextUrl.origin}/api/security/user-blocks?active=true&limit=1`, {
          method: "GET",
          headers: {
            "Authorization": request.headers.get("authorization") || "",
            "x-user-id": userId,
            "x-telegram-id": telegramId,
          },
        });

        if (blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          if (blocksData.success && blocksData.activeBlockReason) {
            blockReason = blocksData.activeBlockReason;
          }
        }
      } catch (error) {
        console.error("Error fetching block reason:", error);
      }
    }

    // Calculate verification requirements based on trust score with gyroscope support
    const needsGyroscope = !isBlocked && trustScore < 10;  // NEW: Most restrictive verification
    const needsBiometric = !isBlocked && trustScore < 20 && !needsGyroscope; // Only if not gyroscope
    const needsCaptcha = !isBlocked && trustScore < 40 && !needsBiometric && !needsGyroscope; // Only if not biometric or gyroscope

    // Construct comprehensive security result
    const securityResult = {
      isBlocked,
      needsCaptcha,
      needsBiometric,
      needsGyroscope,
      trustScore,
      timeUntilUnblock: timeUntilUnblock && timeUntilUnblock > 0 ? timeUntilUnblock : undefined,
      blockReason,
    };

    console.log(`Security check-status: Complete result for user ${telegramId}:`, {
      trustScore: securityResult.trustScore,
      needsCaptcha: securityResult.needsCaptcha,
      needsBiometric: securityResult.needsBiometric,
      needsGyroscope: securityResult.needsGyroscope, // NEW: Add gyroscope logging
      isBlocked: securityResult.isBlocked,
      hasBlockReason: !!securityResult.blockReason
    });

    return NextResponse.json({
      success: true,
      securityResult,
    });
  } catch (error) {
    console.error("Security check-status API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}