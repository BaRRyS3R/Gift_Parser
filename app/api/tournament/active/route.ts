import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { tournamentService } from "@/lib/supabase_tournament_extension";

export const GET = withAuth(async (request) => {
  try {
    const activeTournament = await tournamentService.getActiveTournament();
    if (!activeTournament) {
      return NextResponse.json({ isActive: false });
    }
    const now = new Date();
    const end = new Date(activeTournament.end_date);
    const timeRemaining = end.getTime() - now.getTime();
    return NextResponse.json({
      isActive: true,
      activeTournament,
      timeRemaining,
    });
  } catch (error) {
    console.error("Error fetching active tournament:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active tournament" },
      { status: 500 },
    );
  }
});
