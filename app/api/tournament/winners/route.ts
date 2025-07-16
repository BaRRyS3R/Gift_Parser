// src/app/api/tournament/winners/route.ts - Get tournament winners with current user flag
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
        const limit = parseInt(searchParams.get("limit") || "10");

        if (!tournamentId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Tournament ID is required",
                },
                { status: 400 },
            );
        }

        // Get tournament winners using RPC function
        const { data, error } = await supabaseServer.rpc(
            "get_tournament_leaderboard_accumulative",
            {
                tournament_id_param: tournamentId,
                limit_param: limit,
            },
        );

        if (error) {
            console.error("Error fetching tournament winners:", error);

            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to fetch tournament winners",
                },
                { status: 500 },
            );
        }

        // Filter out sensitive data and add current user flag
        const currentUserTelegramId = parseInt(telegramId);
        const filteredWinners = (data || []).map((entry: any) => ({
            first_name: entry.first_name,
            last_name: entry.last_name,
            username: entry.username,
            survival_time: entry.survival_time,
            survival_score: entry.survival_score,
            max_level_reached: entry.max_level_reached,
            perfect_streak: entry.perfect_streak,
            correct_hits: entry.correct_hits,
            games_played: entry.games_played,
            rank: entry.rank,
            is_current_user: entry.telegram_id === currentUserTelegramId,
        }));

        return NextResponse.json({
            success: true,
            winners: filteredWinners,
        });
    } catch (error) {
        console.error("Tournament winners API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to get tournament winners",
                message:
                    error instanceof Error ? error.message : "Unknown error occurred",
            },
            { status: 500 },
        );
    }
}