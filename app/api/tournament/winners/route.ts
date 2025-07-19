// src/app/api/tournament/winners/route.ts - Get tournament winners

import { NextRequest, NextResponse } from 'next/server';
import { serverTournamentService, type TournamentLeaderboardEntry } from '@/lib/server/tournamentService';

// Request interface
interface WinnersRequest {
    tournamentId: string;
    prizeCount: number;
}

// Response interface
interface WinnersResponse {
    success: boolean;
    data?: TournamentLeaderboardEntry[];
    error?: string;
}

/**
 * POST /api/tournament/winners
 * Get tournament winners based on prize count
 */
export async function POST(request: NextRequest): Promise<NextResponse<WinnersResponse>> {
    try {
        // Extract user info from middleware headers (for authentication)
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required'
                },
                { status: 401 }
            );
        }

        // Parse request body
        let body: WinnersRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request body'
                },
                { status: 400 }
            );
        }

        const { tournamentId, prizeCount } = body;

        // Validate tournament ID
        if (!tournamentId || typeof tournamentId !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Tournament ID is required'
                },
                { status: 400 }
            );
        }

        // Validate prize count
        if (typeof prizeCount !== 'number' || prizeCount < 1 || prizeCount > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Prize count must be between 1 and 100'
                },
                { status: 400 }
            );
        }

        console.log(`Fetching winners for tournament ${tournamentId} (prizes: ${prizeCount}) by user: ${telegramId}`);

        // Get tournament winners
        const winners = await serverTournamentService.getTournamentWinners(tournamentId, prizeCount);

        console.log(`Winners retrieved for tournament ${tournamentId}:`, {
            winners: winners.length,
            expectedPrizes: prizeCount
        });

        return NextResponse.json({
            success: true,
            data: winners,
        });

    } catch (error) {
        console.error('Error fetching tournament winners:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Tournament not found'
                    },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch tournament winners'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/winners
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}