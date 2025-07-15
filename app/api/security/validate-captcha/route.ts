// src/app/api/security/validate-captcha/route.ts - Validate captcha response

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const POST = withAuthAndRateLimit(async (request) => {
    try {
        const { user } = request;
        const { userInput, correctAnswer, completedInTime } = await request.json();

        if (!userInput || !correctAnswer) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                },
                { status: 400 }
            );
        }

        const result = await userService.validateCaptcha(
            user.telegramId,
            userInput,
            correctAnswer,
            completedInTime
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error validating captcha:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to validate captcha',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});