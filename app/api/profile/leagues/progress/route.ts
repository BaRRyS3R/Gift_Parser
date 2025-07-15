// src/app/api/leagues/progress/route.ts - League progress API endpoint

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

    // Get user data to determine total games
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, total_games, current_level, current_league_id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Get current league information
    let currentLeague = null;

    if (user.current_league_id) {
      const { data: leagueData } = await supabaseServer
        .from("leagues")
        .select("*")
        .eq("id", user.current_league_id)
        .single();

      currentLeague = leagueData;
    }

    // If no current league, get default bronze league
    if (!currentLeague) {
      const { data: bronzeLeague } = await supabaseServer
        .from("leagues")
        .select("*")
        .eq("name", "bronze")
        .single();

      currentLeague = bronzeLeague;
    }

    // Calculate league progress
    const GAMES_PER_LEVEL = 10;
    const MAX_LEVEL = 100;

    const currentLevel = Math.min(
      Math.floor(user.total_games / GAMES_PER_LEVEL) + 1,
      MAX_LEVEL,
    );
    const totalGames = user.total_games;

    // Get next league based on games played
    const getLeagueByGames = (games: number) => {
      if (games < 50) return "bronze";
      if (games < 150) return "silver";
      if (games < 300) return "gold";
      if (games < 500) return "platinum";

      return "diamond";
    };

    const currentLeagueName = getLeagueByGames(totalGames);

    // Get all leagues for next league calculation
    const { data: allLeagues } = await supabaseServer
      .from("leagues")
      .select("*")
      .order("min_games", { ascending: true });

    // Find next league
    let nextLeague = null;
    let gamesToNextLeague = 0;
    let progressPercent = 0;

    if (allLeagues) {
      const nextLeagueData = allLeagues.find(
        (league) => league.min_games > totalGames,
      );

      if (nextLeagueData) {
        nextLeague = nextLeagueData;
        gamesToNextLeague = nextLeagueData.min_games - totalGames;

        // Calculate progress toward next league
        const currentLeagueData = allLeagues.find(
          (league) => league.min_games <= totalGames,
        );

        if (currentLeagueData) {
          const gamesInCurrentLeague = totalGames - currentLeagueData.min_games;
          const gamesNeededForNextLeague =
            nextLeagueData.min_games - currentLeagueData.min_games;

          progressPercent =
            (gamesInCurrentLeague / gamesNeededForNextLeague) * 100;
        }
      } else {
        // User is in highest league
        progressPercent = 100;
      }
    }

    const progressInfo = {
      currentLevel,
      totalGames,
      currentLeague: currentLeague || {
        id: 1,
        name: "bronze",
        display_name_en: "Bronze",
        min_games: 0,
        max_games: 49,
        color: "#CD7F32",
        icon: "trophy",
      },
      nextLeague,
      gamesToNextLeague,
      progressPercent: Math.min(100, progressPercent),
      isMaxLeague: !nextLeague,
    };

    return NextResponse.json({
      success: true,
      progressInfo,
    });
  } catch (error) {
    console.error("League progress API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get league progress",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
