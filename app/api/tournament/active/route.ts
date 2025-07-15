// src/app/api/tournament/active/route.ts - Get active tournament
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

    // Get active tournament using RPC function
    const { data, error } = await supabaseServer.rpc("get_active_tournament");

    if (error) {
      console.error("Error fetching active tournament:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch active tournament",
        },
        { status: 500 },
      );
    }

    const activeTournament = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      success: true,
      tournament: activeTournament,
    });
  } catch (error) {
    console.error("Active tournament API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get active tournament",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
