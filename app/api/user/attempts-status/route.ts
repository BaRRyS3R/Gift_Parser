// src/app/api/user/attempts-status/route.ts - Protected attempts status check

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const GET = withAuth(async (request) => {
    try {
        const { user } = request;

        // Get current attempts status
        const attemptsStatus = await userService.checkAndUpdateAttemptsWithServerValidation(
            user.telegramId
        );

        return NextResponse.json({
            success: true,
            attemptsStatus,
        });
    } catch (error) {
        console.error('Error checking attempts status:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check attempts status',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});