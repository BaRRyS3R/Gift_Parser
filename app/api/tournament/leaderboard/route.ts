import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { tournamentService } from '@/lib/supabase_tournament_extension';

export const GET = withAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId');
        if (!tournamentId) {
            return NextResponse.json({ success: false, error: 'Missing tournamentId' }, { status: 400 });
        }
        const leaderboard = await tournamentService.getTournamentLeaderboard(tournamentId, 100);
        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching tournament leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch tournament leaderboard' }, { status: 500 });
    }
}); 