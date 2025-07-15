import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import { taskService } from '@/lib/supabase_tasks';

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { taskId, telegramUserId } = await request.json();
        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const isCompleted = await taskService.checkTaskCompletion(userData.id, taskId, telegramUserId);
        return NextResponse.json({ isCompleted });
    } catch (error) {
        console.error('Error checking task completion:', error);
        return NextResponse.json({ success: false, error: 'Failed to check task completion' }, { status: 500 });
    }
}); 