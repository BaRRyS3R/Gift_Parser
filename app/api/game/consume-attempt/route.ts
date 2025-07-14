// src/app/api/game/consume-attempt/route.ts - Protected attempt consumption with bot detection

import { NextRequest, NextResponse } from 'next/server';
import { withGameProtection } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const POST = withGameProtection(async (request) => {
    try {
        const { user } = request;

        // Consume attempt with server validation
        const attemptsStatus = await userService.consumeAttemptWithServerValidation(
            user.telegramId
        );

        return NextResponse.json({
            success: true,
            attemptsStatus,
        });
    } catch (error) {
        console.error('Error consuming attempt:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to consume attempt',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});