// src/app/api/user/attempts-status/route.ts - User attempts status API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

const ATTEMPTS_CONFIG = {
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours
} as const;

export async function GET(request: NextRequest) {
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

    // Get user data
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("attempts_remaining, last_attempt_at, attempts_reset_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Database error fetching user attempts:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch user attempts data",
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Get current server time
    const serverTime = new Date();
    const resetTime = user.attempts_reset_at
      ? new Date(user.attempts_reset_at)
      : null;

    // Check if reset time has passed
    if (resetTime && serverTime >= resetTime) {
      // Reset attempts
      const { error: resetError } = await supabaseServer
        .from("users")
        .update({
          attempts_remaining: 10,
          attempts_reset_at: null,
          updated_at: serverTime.toISOString(),
        })
        .eq("id", userId);

      if (resetError) {
        console.error("Error resetting attempts:", resetError);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to reset attempts",
            message: resetError.message,
          },
          { status: 500 },
        );
      }

      // Return updated status
      return NextResponse.json({
        success: true,
        attemptsStatus: {
          canPlay: true,
          attemptsRemaining: 10,
          resetTime: null,
          timeUntilReset: null,
        },
      });
    }

    // Calculate time until reset
    let timeUntilReset: number | null = null;

    if (resetTime && user.attempts_remaining === 0) {
      timeUntilReset = Math.max(0, resetTime.getTime() - serverTime.getTime());
    }

    return NextResponse.json({
      success: true,
      attemptsStatus: {
        canPlay: user.attempts_remaining > 0,
        attemptsRemaining: user.attempts_remaining,
        resetTime: resetTime ? resetTime.toISOString() : null,
        timeUntilReset,
      },
    });
  } catch (error) {
    console.error("User attempts status API error:", error);

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
