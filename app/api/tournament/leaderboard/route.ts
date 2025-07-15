// src/app/api/tournament/leaderboard/route.ts - Get tournament leaderboard
import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!tournamentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID is required",
        },
        { status: 400 },
      );
    }

    // Get tournament leaderboard using RPC function
    const { data, error } = await supabaseServer.rpc(
      "get_tournament_leaderboard_accumulative",
      {
        tournament_id_param: tournamentId,
        limit_param: limit,
      },
    );

    if (error) {
      console.error("Error fetching tournament leaderboard:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch tournament leaderboard",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      leaderboard: data || [],
    });
  } catch (error) {
    console.error("Tournament leaderboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get tournament leaderboard",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
