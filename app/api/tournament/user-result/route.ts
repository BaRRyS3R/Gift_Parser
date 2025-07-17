// src/app/api/tournament/user-result/route.ts - Get user tournament result
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

    if (!tournamentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID is required",
        },
        { status: 400 },
      );
    }

    // Get user tournament result using RPC function
    const { data, error } = await supabaseServer.rpc(
      "get_user_tournament_result",
      {
        tournament_id_param: tournamentId,
        user_id_param: userId,
      },
    );

    if (error) {
      console.error("Error fetching user tournament result:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch user tournament result",
        },
        { status: 500 },
      );
    }

    const userResult = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      success: true,
      result: userResult,
    });
  } catch (error) {
    console.error("User tournament result API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get user tournament result",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
