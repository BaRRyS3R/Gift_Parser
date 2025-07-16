// src/app/api/game/consume-attempt/route.ts - Game consume attempt API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

const ATTEMPTS_CONFIG = {
  RESET_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours
} as const;

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

    // Get user data
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("attempts_remaining, last_attempt_at, attempts_reset_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Database error fetching user:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch user data",
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

    // Check if user has attempts remaining
    if (user.attempts_remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No attempts remaining",
          attemptsStatus: {
            canPlay: false,
            attemptsRemaining: 0,
            resetTime: user.attempts_reset_at,
            timeUntilReset: user.attempts_reset_at
              ? Math.max(0, new Date(user.attempts_reset_at).getTime() - Date.now())
              : null,
          },
        },
        { status: 400 },
      );
    }

    // Get current server time
    const serverTime = new Date();
    const newAttemptsRemaining = Math.max(0, user.attempts_remaining - 1);

    // Prepare update data
    const updates: any = {
      attempts_remaining: newAttemptsRemaining,
      last_attempt_at: serverTime.toISOString(),
      updated_at: serverTime.toISOString(),
    };

    // Set reset time if no attempts remaining
    if (newAttemptsRemaining === 0) {
      const resetTime = new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS);
      updates.attempts_reset_at = resetTime.toISOString();
    }

    // Update user attempts
    const { error: updateError } = await supabaseServer
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user attempts:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to consume attempt",
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    // Calculate time until reset
    const timeUntilReset = newAttemptsRemaining === 0
      ? ATTEMPTS_CONFIG.RESET_INTERVAL_MS
      : null;

    return NextResponse.json({
      success: true,
      attemptsStatus: {
        canPlay: newAttemptsRemaining > 0,
        attemptsRemaining: newAttemptsRemaining,
        resetTime: newAttemptsRemaining === 0
          ? new Date(serverTime.getTime() + ATTEMPTS_CONFIG.RESET_INTERVAL_MS).toISOString()
          : null,
        timeUntilReset,
      },
    });
  } catch (error) {
    console.error("Consume attempt API error:", error);

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