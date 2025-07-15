// src/app/api/user/attempts-status/route.ts - Attempts status API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, type ServerUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const telegramId = request.headers.get('x-telegram-id');

        if (!telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required',
                },
                { status: 401 }
            );
        }

        // Get server time and user data
        const { data: serverTimeData } = await supabaseServer.rpc("get_current_timestamp");
        const serverTime = serverTimeData ? new Date(serverTimeData) : new Date();

        const { data: user, error } = await supabaseServer
            .from('users')
            .select('attempts_remaining, attempts_reset_at, last_attempt_at')
            .eq('telegram_id', parseInt(telegramId))
            .single();

        if (error || !user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            );
        }

        const resetTime = user.attempts_reset_at ? new Date(user.attempts_reset_at) : null;

        // Check if attempts need to be reset
        if (resetTime && serverTime >= resetTime) {
            const { error: updateError } = await supabaseServer
                .from('users')
                .update({
                    attempts_remaining: 10, // Reset to base attempts
                    attempts_reset_at: null,
                })
                .eq('telegram_id', parseInt(telegramId));

            if (updateError) {
                console.error('Error resetting attempts:', updateError);
            }

            return NextResponse.json({
                success: true,
                attemptsStatus: {
                    canPlay: true,
                    attemptsRemaining: 10,
                    resetTime: undefined,
                    timeUntilReset: undefined,
                },
            });
        }

        let timeUntilReset: number | undefined;
        if (resetTime && user.attempts_remaining === 0) {
            timeUntilReset = Math.max(0, resetTime.getTime() - serverTime.getTime());
        }

        return NextResponse.json({
            success: true,
            attemptsStatus: {
                canPlay: user.attempts_remaining > 0,
                attemptsRemaining: user.attempts_remaining,
                resetTime: resetTime || undefined,
                timeUntilReset,
            },
        });
    } catch (error) {
        console.error('Attempts status API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get attempts status',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}