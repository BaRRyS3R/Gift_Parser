import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import leagueService from '@/lib/league_service';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const rewards = await leagueService.getUserRewards(userData.id);
        return NextResponse.json({ rewards });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch rewards' }, { status: 500 });
    }
}); 