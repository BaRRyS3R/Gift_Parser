// src/app/api/seasons/current/route.ts - SIMPLIFIED: Only static season data

import { NextRequest, NextResponse } from "next/server";

import { serverSeasonService, type Season } from "@/lib/server/seasonService";

// SIMPLIFIED Response interface - only static season data
interface SeasonResponse {
  success: boolean;
  data?: Season; // Only static season data
  error?: string;
}

/**
 * GET /api/seasons/current
 * SIMPLIFIED: Retrieves ONLY current season static data (name, dates, prizes)
 * Leaderboard and user stats are handled by separate /api/leaderboard/all endpoint
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<SeasonResponse>> {
  try {
    // Basic authentication check
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

    console.log(`[SEASON_API] Request for static season data`);

    // Fetch ONLY static season data from database
    const season = await serverSeasonService.getCurrentSeason();

    if (!season) {
      return NextResponse.json(
        {
          success: false,
          error: "No active season found",
        },
        { status: 404 },
      );
    }

    console.log(`[SEASON_API] Returning static data for season: ${season.name}`);

    return NextResponse.json({
      success: true,
      data: season, // Only static season data (name, dates, prizes)
    });
  } catch (error) {
    console.error("Error fetching season data:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Season not found",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve season data",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/seasons/all
 * Get all seasons (for admin purposes)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    // Authentication check
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    
    // Basic validation
    if (!body.name || !body.start_date || !body.end_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, start_date, end_date",
        },
        { status: 400 },
      );
    }

    // TODO: Add admin permission check
    // const isAdmin = await checkAdminPermissions(userId);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { success: false, error: "Admin permissions required" },
    //     { status: 403 }
    //   );
    // }

    const newSeason = await serverSeasonService.createSeason({
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      prizes: body.prizes || [],
    });

    return NextResponse.json({
      success: true,
      data: newSeason,
    });

  } catch (error) {
    console.error("Error creating season:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create season",
      },
      { status: 500 },
    );
  }
}