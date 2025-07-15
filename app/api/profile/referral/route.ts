import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;
        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id, referral_code, referral_count, referred_by')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ referralInfo: userData });
    } catch (error) {
        console.error('Error fetching referral info:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch referral info' }, { status: 500 });
    }
}); 