import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { tournamentService } from "@/lib/supabase_tournament_extension";

export const GET = withAuth(async (request) => {
  try {
    const tournaments = await tournamentService.getAllTournamentsRaw();
    const now = new Date();
    const active = tournaments.filter(
      (t) => new Date(t.start_date) <= now && new Date(t.end_date) >= now,
    );
    const upcoming = tournaments.filter((t) => new Date(t.start_date) > now);
    const completed = tournaments.filter((t) => new Date(t.end_date) < now);
    return NextResponse.json({ active, upcoming, completed });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tournaments" },
      { status: 500 },
    );
  }
});
