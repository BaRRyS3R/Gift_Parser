// src/app/api/security/check-status/route.ts - Check user security status

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const GET = withAuthAndRateLimit(async (request) => {
    try {
        const { user } = request;

        const securityResult = await userService.checkUserBlockStatus(user.telegramId);

        return NextResponse.json({
            success: true,
            securityResult,
        });
    } catch (error) {
        console.error('Error checking security status:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check security status',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});