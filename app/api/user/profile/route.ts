import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        const userData = await userService.findByTelegramId(user.telegramId);
        if (!userData) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userData.id,
                telegram_id: userData.telegram_id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username,
                current_level: userData.current_level,
                attempts_remaining: userData.attempts_remaining,
                total_games: userData.total_games,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user profile' },
            { status: 500 }
        );
    }
});