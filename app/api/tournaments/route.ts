// src/app/api/tournaments/route.ts - Получение списка турниров

import type {
  TournamentListResponse,
  TournamentFilters,
} from "@/types/tournaments";

import { NextRequest, NextResponse } from "next/server";

import { serverTournamentService } from "@/lib/server/tournamentService";

/**
 * GET /api/tournaments
 * Получение списка турниров с фильтрацией
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TournamentListResponse>> {
  try {
    // Извлекаем параметры фильтрации из URL
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as any;
    const gameMode = url.searchParams.get("game_mode") as any;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const filters: TournamentFilters = {};

    if (status) filters.status = status;
    if (gameMode) filters.game_mode = gameMode;
    if (limitParam)
      filters.limit = Math.min(Math.max(parseInt(limitParam), 1), 100);
    if (offsetParam) filters.offset = Math.max(parseInt(offsetParam), 0);

    const tournaments = await serverTournamentService.getTournaments(filters);

    return NextResponse.json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch tournaments",
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
