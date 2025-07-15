import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import leagueService from '@/lib/league_service';

export const GET = withAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const leagueId = searchParams.get('leagueId');
        if (!leagueId) {
            return NextResponse.json({ success: false, error: 'Missing leagueId' }, { status: 400 });
        }
        const leaderboard = await leagueService.getLeagueLeaderboard(Number(leagueId));
        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching league leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch league leaderboard' }, { status: 500 });
    }
}); 