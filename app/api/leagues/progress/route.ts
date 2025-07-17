// src/app/api/leagues/progress/route.ts - League progress API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

interface LeagueData {
  id: number;
  name: string;
  display_name_en: string;
  display_name_ru: string;
  min_games: number;
  max_games: number | null;
  color: string;
  icon: string;
  rewards_count: number;
  created_at: string;
}

interface LeagueProgressInfo {
  currentLevel: number;
  totalGames: number;
  currentLeague: {
    id: number;
    name: string;
    display_name_en: string;
    color: string;
    icon: string;
  };
  nextLeague?: {
    id: number;
    name: string;
    display_name_en: string;
    color: string;
    icon: string;
  };
  gamesToNextLeague: number;
  progressPercent: number;
  isMaxLeague: boolean;
}

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

    // Get user data to determine total games and current league
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, total_games, current_level, current_league_id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Error fetching user data:", userError);

      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Get all leagues for calculations
    const { data: allLeagues, error: leaguesError } = await supabaseServer
      .from("leagues")
      .select("*")
      .order("min_games", { ascending: true });

    if (leaguesError || !allLeagues) {
      console.error("Error fetching leagues:", leaguesError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch league data",
        },
        { status: 500 },
      );
    }

    // Calculate current league based on total games
    const determineCurrentLeague = (totalGames: number): LeagueData | null => {
      for (let i = allLeagues.length - 1; i >= 0; i--) {
        const league = allLeagues[i];

        if (totalGames >= league.min_games) {
          if (league.max_games === null || totalGames <= league.max_games) {
            return league;
          }
        }
      }

      // Default to bronze if no league found
      return (
        allLeagues.find((l) => l.name === "bronze") || allLeagues[0] || null
      );
    };

    // Calculate level (10 games per level, max level 100)
    const GAMES_PER_LEVEL = 10;
    const MAX_LEVEL = 100;
    const currentLevel = Math.min(
      Math.floor(user.total_games / GAMES_PER_LEVEL) + 1,
      MAX_LEVEL,
    );

    // Determine current and next leagues
    const currentLeague = determineCurrentLeague(user.total_games);

    if (!currentLeague) {
      return NextResponse.json(
        {
          success: false,
          error: "No league data found",
        },
        { status: 500 },
      );
    }

    // Find next league
    const nextLeague = allLeagues.find(
      (league) => league.min_games > user.total_games,
    );

    // Calculate games to next league and progress percentage
    let gamesToNextLeague = 0;
    let progressPercent = 0;

    if (nextLeague) {
      gamesToNextLeague = nextLeague.min_games - user.total_games;

      // Calculate progress within current league
      const currentLeagueRange = nextLeague.min_games - currentLeague.min_games;
      const gamesInCurrentLeague = user.total_games - currentLeague.min_games;

      if (currentLeagueRange > 0) {
        progressPercent = Math.min(
          100,
          (gamesInCurrentLeague / currentLeagueRange) * 100,
        );
      }
    } else {
      // User is in the highest league
      progressPercent = 100;
    }

    // Format league data for response
    const formatLeagueForResponse = (league: LeagueData) => ({
      id: league.id,
      name: league.name,
      display_name_en: league.display_name_en,
      color: league.color,
      icon: league.icon,
    });

    const progressInfo: LeagueProgressInfo = {
      currentLevel,
      totalGames: user.total_games,
      currentLeague: formatLeagueForResponse(currentLeague),
      nextLeague: nextLeague ? formatLeagueForResponse(nextLeague) : undefined,
      gamesToNextLeague,
      progressPercent: Math.round(progressPercent * 100) / 100, // Round to 2 decimal places
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
