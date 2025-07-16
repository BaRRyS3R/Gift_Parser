// src/app/api/security/update-trust-score/route.ts - Update trust score API endpoint

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
    const { scoreChange } = await request.json();

    if (scoreChange === undefined || typeof scoreChange !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid score change value",
        },
        { status: 400 },
      );
    }

    // Use RPC function to update trust score
    const { data: newTrustScore, error } = await supabaseServer.rpc(
      "update_trust_score",
      {
        user_telegram_id: parseInt(telegramId),
        score_change: scoreChange,
      },
    );

    if (error) {
      console.error("Error updating trust score:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update trust score",
          message: error.message,
        },
        { status: 500 },
      );
    }

    console.log(
      `Trust score updated for user ${telegramId}: ${scoreChange > 0 ? "+" : ""}${scoreChange}`,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update trust score API error:", error);

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
