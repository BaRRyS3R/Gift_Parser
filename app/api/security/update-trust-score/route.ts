// src/app/api/security/update-trust-score/route.ts - Update user trust score

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';

export const POST = withAuthAndRateLimit(async (request) => {
    try {
        const { user } = request;
        const { scoreChange } = await request.json();

        if (typeof scoreChange !== 'number') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid score change value',
                },
                { status: 400 }
            );
        }

        // Limit score changes to reasonable ranges
        const limitedScoreChange = Math.max(-50, Math.min(50, scoreChange));

        const newTrustScore = await userService.updateTrustScore(
            user.telegramId,
            limitedScoreChange
        );

        return NextResponse.json({
            success: true,
            newTrustScore,
        });
    } catch (error) {
        console.error('Error updating trust score:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update trust score',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});