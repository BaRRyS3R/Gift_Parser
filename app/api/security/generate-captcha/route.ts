// src/app/api/security/generate-captcha/route.ts - Generate captcha challenge

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/authMiddleware';

function generateCaptchaText(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export const POST = withAuthAndRateLimit(async (request) => {
    try {
        const challenge = generateCaptchaText();
        const expiresAt = Date.now() + 10000; // 10 seconds

        return NextResponse.json({
            success: true,
            challenge,
            correctAnswer: challenge,
            expiresAt,
        });
    } catch (error) {
        console.error('Error generating captcha:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate captcha',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});