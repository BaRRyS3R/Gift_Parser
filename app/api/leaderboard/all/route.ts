// src/app/api/leaderboard/all/route.ts - Get all leaderboards endpoint (without caching)

import type { AllLeaderboardsResponse } from "@/lib/server/leaderboardService";

import { NextRequest, NextResponse } from "next/server";

import { serverLeaderboardService } from "@/lib/server/leaderboardService";

// Response interface
interface LeaderboardResponse {
  success: boolean;
  data?: AllLeaderboardsResponse;
  error?: string;
}

/**
 * GET /api/leaderboard/all
 * Retrieves all leaderboards (reaction, survival, physics, rotation) with user rankings
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse>> {
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

    // Get limit parameter from query string (default: 100, max: 100)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 100)
      : 100;

    // Fetch all leaderboards (fresh data every time)
    const leaderboardData = await serverLeaderboardService.getAllLeaderboards(
      userId,
      telegramIdNumber,
      limit,
    );

    return NextResponse.json({
      success: true,
      data: leaderboardData,
    });
  } catch (error) {
    console.error("Error fetching leaderboards:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("leaderboard")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch leaderboard data",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve leaderboards",
      },
      { status: 500 },
    );
  }
}
