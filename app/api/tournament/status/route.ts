// src/app/api/tournament/status/route.ts - Get tournament status
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

    // Get active tournament
    const { data, error } = await supabaseServer.rpc("get_active_tournament");

    if (error) {
      console.error("Error fetching tournament status:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch tournament status",
        },
        { status: 500 },
      );
    }

    const activeTournament = data && data.length > 0 ? data[0] : null;

    if (!activeTournament) {
      return NextResponse.json({
        success: true,
        status: {
          isActive: false,
          activeTournament: null,
        },
      });
    }

    const now = new Date();
    const startDate = new Date(activeTournament.start_date);
    const endDate = new Date(activeTournament.end_date);

    const isActive = now >= startDate && now < endDate;
    const hasStarted = now >= startDate;
    const timeRemaining = isActive ? endDate.getTime() - now.getTime() : 0;

    return NextResponse.json({
      success: true,
      status: {
        isActive,
        activeTournament,
        timeRemaining,
        hasStarted,
      },
    });
  } catch (error) {
    console.error("Tournament status API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get tournament status",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
