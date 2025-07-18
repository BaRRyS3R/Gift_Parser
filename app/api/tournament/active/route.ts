// src/app/api/tournament/active/route.ts - API endpoint for active tournament

import type { Tournament } from "@/types/tournaments";

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";
import { formatTimeRemaining } from "@/types/tournaments";

interface ActiveTournamentResponse {
  success: boolean;
  data?: {
    tournament: Tournament | null;
    timeRemaining?: string;
    timeUntilEnd?: number;
  };
  error?: string;
}

/**
 * GET /api/tournament/active
 * Get currently active tournament with time remaining
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ActiveTournamentResponse>> {
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    console.log(`Fetching active tournament for user ${telegramId}`);

    // Get currently active tournament
    const { data: tournaments, error: tournamentsError } = await supabaseServer
      .from("tournaments")
      .select("*")
      .eq("status", "active")
      .order("start_date", { ascending: true });

    if (tournamentsError) {
      console.error("Error fetching tournaments:", tournamentsError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch tournaments",
        },
        { status: 500 },
      );
    }

    // Check if any tournaments are actually active based on time
    const now = new Date();
    let activeTournament: Tournament | null = null;

    for (const tournament of tournaments || []) {
      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date);

      if (now >= startDate && now < endDate) {
        activeTournament = tournament;
        break;
      }
    }

    if (!activeTournament) {
      console.log("No active tournament found");

      return NextResponse.json({
        success: true,
        data: {
          tournament: null,
        },
      });
    }

    // Calculate time remaining
    const endDate = new Date(activeTournament.end_date);
    const timeUntilEnd = Math.max(0, endDate.getTime() - now.getTime());
    const timeRemaining = formatTimeRemaining(timeUntilEnd);

    console.log(
      `Active tournament found: ${activeTournament.name}, time remaining: ${timeRemaining}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        tournament: activeTournament,
        timeRemaining,
        timeUntilEnd,
      },
    });
  } catch (error) {
    console.error("Error in active tournament API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/tournament/active
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
