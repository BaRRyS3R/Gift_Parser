// src/app/api/security/validate-biometric/route.ts - Validate biometric authentication

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const POST = withAuthAndRateLimit(async (request) => {
    try {
        const { user } = request;
        const { success, completedInTime } = await request.json();

        if (typeof success !== 'boolean' || typeof completedInTime !== 'boolean') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request data',
                },
                { status: 400 }
            );
        }

        const result = await userService.validateBiometric(
            user.telegramId,
            success,
            completedInTime
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error validating biometric:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to validate biometric',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});