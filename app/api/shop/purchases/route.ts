import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';

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
        const { data: purchases, error: purchasesError } = await supabaseServer
            .from('purchases')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });
        if (purchasesError) {
            return NextResponse.json({ success: false, error: purchasesError.message }, { status: 500 });
        }
        return NextResponse.json({ purchases });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch purchases' }, { status: 500 });
    }
}); 