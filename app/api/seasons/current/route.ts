// src/app/api/seasons/current/route.ts - Current season data endpoint

import type { CompleteSeasonData } from "@/lib/server/seasonService";

import { NextRequest, NextResponse } from "next/server";

import { serverSeasonService } from "@/lib/server/seasonService";

// Response interface
interface SeasonResponse {
  success: boolean;
  data?: CompleteSeasonData;
  error?: string;
}

/**
 * GET /api/seasons/current
 * Retrieves current active season with leaderboard and user statistics
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<SeasonResponse>> {
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

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    console.log(`Fetching current season data for user ${telegramIdNumber}`);

    // Fetch complete season data
    const seasonData = await serverSeasonService.getCompleteSeasonData(
      userId,
      telegramIdNumber,
    );

    if (!seasonData) {
      return NextResponse.json(
        {
          success: false,
          error: "No active season found",
        },
        { status: 404 },
      );
    }

    console.log(
      `Successfully fetched season data for user ${telegramIdNumber}:`,
      {
        seasonName: seasonData.season.name,
        isActive: seasonData.isActive,
        hasStarted: seasonData.hasStarted,
        leaderboardEntries: seasonData.leaderboard.length,
        userPosition: seasonData.userStats.position,
      },
    );

    return NextResponse.json({
      success: true,
      data: seasonData,
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

      if (error.message.includes("User not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
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
 * OPTIONS /api/seasons/current
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
