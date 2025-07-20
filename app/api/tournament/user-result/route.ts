// src/app/api/tournament/user-result/route.ts - Get user tournament result

import { NextRequest, NextResponse } from "next/server";

import {
  serverTournamentService,
  type TournamentResult,
} from "@/lib/server/tournamentService";

// Request interface
interface UserResultRequest {
  tournamentId: string;
}

// Response interface
interface UserResultResponse {
  success: boolean;
  data?: TournamentResult | null;
  error?: string;
}

/**
 * POST /api/tournament/user-result
 * Get user's result and rank in a specific tournament
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UserResultResponse>> {
  try {
    // Extract user info from middleware headers (for authentication)
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

    // Parse request body
    let body: UserResultRequest;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    const { tournamentId } = body;

    // Validate tournament ID
    if (!tournamentId || typeof tournamentId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament ID is required",
        },
        { status: 400 },
      );
    }

    console.log(
      `Fetching user result for tournament ${tournamentId} by user: ${userId}`,
    );

    // Get user tournament result
    const userResult = await serverTournamentService.getUserTournamentResult(
      tournamentId,
      userId,
    );

    console.log(`User result retrieved for tournament ${tournamentId}:`, {
      hasResult: !!userResult,
      score: userResult?.survival_score,
      rank: userResult?.rank,
    });

    return NextResponse.json({
      success: true,
      data: userResult,
    });
  } catch (error) {
    console.error("Error fetching user tournament result:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Tournament or user not found",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user tournament result",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/tournament/user-result
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
