// src/app/api/user/attempts-status/route.ts - Protected attempts status check

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('attempts_remaining, attempts_reset_at')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, attempts_remaining: userData.attempts_remaining, attempts_reset_at: userData.attempts_reset_at });
    } catch (error) {
        console.error('Error fetching attempts status:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch attempts status' }, { status: 500 });
    }
});