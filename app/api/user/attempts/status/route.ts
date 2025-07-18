// src/app/api/user/attempts/status/route.ts - Get user attempts status

import { NextRequest, NextResponse } from 'next/server';
import { serverUserService } from '@/lib/supabase_server';

// Response interface
interface AttemptsStatusResponse {
    success: boolean;
    canPlay: boolean;
    attemptsRemaining: number;
    resetTime?: string;
    timeUntilReset?: number;
    error?: string;
}

/**
 * GET /api/user/attempts/status
 * Get current user attempts status with server-side validation
 */
export async function GET(request: NextRequest): Promise<NextResponse<AttemptsStatusResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    canPlay: false,
                    attemptsRemaining: 0,
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    canPlay: false,
                    attemptsRemaining: 0,
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        // Get attempts status from server
        const attemptsStatus = await serverUserService.checkAndUpdateAttemptsWithServerValidation(
            telegramIdNumber
        );

        console.log(`Attempts status for user ${telegramIdNumber}:`, {
            canPlay: attemptsStatus.canPlay,
            attemptsRemaining: attemptsStatus.attemptsRemaining,
            hasResetTime: !!attemptsStatus.resetTime
        });

        return NextResponse.json({
            success: true,
            canPlay: attemptsStatus.canPlay,
            attemptsRemaining: attemptsStatus.attemptsRemaining,
            resetTime: attemptsStatus.resetTime?.toISOString(),
            timeUntilReset: attemptsStatus.timeUntilReset,
        });

    } catch (error) {
        console.error('Error getting attempts status:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        canPlay: false,
                        attemptsRemaining: 0,
                        error: 'User not found'
                    },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                canPlay: false,
                attemptsRemaining: 0,
                error: 'Failed to get attempts status'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/user/attempts/status
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}