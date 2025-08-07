// src/app/api/tournaments/[id]/route.ts - Детали конкретного турнира

import type { TournamentDetailsResponse } from "@/types/tournaments";

import { NextRequest, NextResponse } from "next/server";

import { serverTournamentService } from "@/lib/server/tournamentService";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/tournaments/[id]
 * Получение детальной информации о турнире
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<TournamentDetailsResponse>> {
  try {
    const { id } = params;

    // Извлекаем информацию о пользователе из заголовков middleware
    const userId = request.headers.get("X-User-ID");

    const tournamentDetails =
      await serverTournamentService.getTournamentDetails(
        id,
        userId || undefined,
      );

    return NextResponse.json({
      success: true,
      data: tournamentDetails,
    });
  } catch (error) {
    console.error("Error fetching tournament details:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Tournament not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch tournament details",
      },
      { status: 500 },
    );
  }
}

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
