// src/app/api/profile/route.ts - Protected profile endpoints

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { supabaseServer } from '@/lib/supabaseServer';
import leagueService from '@/lib/league_service';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        // Получаем данные пользователя через серверный supabase
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('*')
            .eq('telegram_id', user.telegramId)
            .maybeSingle();
        if (userError || !userData) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Получаем рейтинги и прогресс лиги (можно реализовать через серверные функции или отдельные запросы)
        // Здесь для примера оставим только leagueService, предполагая, что он уже переведён на серверный supabase
        const leagueProgress = await leagueService.getUserLeagueProgress(userData.id, userData.total_games);

        return NextResponse.json({
            success: true,
            profile: {
                user: {
                    telegram_id: userData.telegram_id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    username: userData.username,
                    is_premium: userData.is_premium,
                    current_level: userData.current_level,
                    attempts_remaining: userData.attempts_remaining,
                    total_games: userData.total_games,
                    total_score: userData.total_score,
                    best_score: userData.best_score,
                    reaction_games: userData.reaction_games,
                    reaction_best_score: userData.reaction_best_score,
                    reaction_best_time: userData.reaction_best_time,
                    reaction_average_time: userData.reaction_average_time,
                    survival_games: userData.survival_games,
                    survival_best_score: userData.survival_best_score,
                    survival_best_time: userData.survival_best_time,
                    survival_max_level: userData.survival_max_level,
                    survival_best_streak: userData.survival_best_streak,
                    physics_games: userData.physics_games,
                    physics_best_score: userData.physics_best_score,
                    physics_best_time: userData.physics_best_time,
                    physics_total_hits: userData.physics_total_hits,
                    physics_best_hits: userData.physics_best_hits,
                    physics_least_mistakes: userData.physics_least_mistakes,
                    rotation_games: userData.rotation_games,
                    rotation_best_score: userData.rotation_best_score,
                    rotation_best_time: userData.rotation_best_time,
                    rotation_max_level: userData.rotation_max_level,
                    rotation_best_streak: userData.rotation_best_streak,
                    rotation_total_hits: userData.rotation_total_hits,
                    referral_count: userData.referral_count,
                    last_played_at: userData.last_played_at,
                },
                // rankings и referralInfo можно добавить аналогично через серверные функции
                leagueProgress
            },
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile data' },
            { status: 500 }
        );
    }
});