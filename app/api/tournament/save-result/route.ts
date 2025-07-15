// src/app/api/tournament/save-result/route.ts - Save tournament result
import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
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

    const { tournamentId, gameResult } = await request.json();

    if (!tournamentId || !gameResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID and game result are required",
        },
        { status: 400 },
      );
    }

    // Validate game result structure
    const {
      survivalTime,
      score,
      maxLevelReached,
      perfectStreak,
      correctHits,
      deathCause,
    } = gameResult;

    if (
      typeof survivalTime !== "number" ||
      typeof score !== "number" ||
      typeof maxLevelReached !== "number" ||
      typeof perfectStreak !== "number" ||
      typeof correctHits !== "number" ||
      !deathCause
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game result data",
        },
        { status: 400 },
      );
    }

    // Save tournament result using RPC function
    const { data, error } = await supabaseServer.rpc(
      "save_tournament_result_accumulative",
      {
        tournament_id_param: tournamentId,
        user_id_param: userId,
        telegram_id_param: parseInt(telegramId),
        survival_time_param: survivalTime,
        survival_score_param: score,
        max_level_reached_param: maxLevelReached,
        perfect_streak_param: perfectStreak,
        correct_hits_param: correctHits,
        death_cause_param: deathCause,
      },
    );

    if (error) {
      console.error("Error saving tournament result:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to save tournament result",
        },
        { status: 500 },
      );
    }

    // Parse response data (might be JSON string)
    const saveResponse = typeof data === "string" ? JSON.parse(data) : data;

    return NextResponse.json({
      success: true,
      tournamentResult: saveResponse,
    });
  } catch (error) {
    console.error("Save tournament result API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save tournament result",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
