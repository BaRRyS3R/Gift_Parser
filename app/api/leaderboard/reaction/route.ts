import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import { userService } from '@/lib/supabase';

export const GET = withAuth(async (request) => {
    try {
        const leaderboard = await userService.getReactionLeaderboard(100);
        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching reaction leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}); 