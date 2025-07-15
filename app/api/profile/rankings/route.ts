import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import { userService } from '@/lib/supabase';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id, telegram_id')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const overall = await userService.getLeaderboard();
        const reaction = await userService.getUserReactionRanking(userData.telegram_id);
        const survival = userService.getUserSurvivalRanking ? await userService.getUserSurvivalRanking(userData.telegram_id) : null;
        const physics = await userService.getUserPhysicsRanking(userData.telegram_id);
        const rotation = userService.getUserRotationRanking ? await userService.getUserRotationRanking(userData.telegram_id) : null;
        return NextResponse.json({ overall, reaction, survival, physics, rotation });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch rankings' }, { status: 500 });
    }
}); 