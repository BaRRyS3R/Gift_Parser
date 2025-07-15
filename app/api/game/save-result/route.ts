// src/app/api/game/save-result/route.ts - Protected game result saving

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import leagueService from '@/lib/league_service';

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const body = await request.json();
        const { mode, score, duration, ...rest } = body;

        // Получаем пользователя
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Пример обновления статистики (реализовать для каждого режима)
        let updates: any = {
            total_games: userData.total_games + 1,
            total_score: userData.total_score + score,
            best_score: Math.max(userData.best_score, score),
            last_played_at: new Date().toISOString(),
        };
        // Можно добавить обновление по режимам (reaction, survival и т.д.)
        if (mode === 'reaction') {
            updates.reaction_games = (userData.reaction_games || 0) + 1;
            updates.reaction_best_score = Math.max(userData.reaction_best_score || 0, score);
            updates.reaction_best_time = Math.max(userData.reaction_best_time || 0, duration);
        }
        // ... (аналогично для других режимов)

        const { error: updateError } = await supabaseServer
            .from('users')
            .update(updates)
            .eq('telegram_id', user.telegramId);
        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        // Обновить прогресс лиги (если нужно)
        // await leagueService.getUserLeagueProgress(userData.id, updates.total_games);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving game result:', error);
        return NextResponse.json({ success: false, error: 'Failed to save game result' }, { status: 500 });
    }
});