// src/app/api/tournament/leaderboard/route.ts - Get tournament leaderboard

import { NextRequest, NextResponse } from 'next/server';
import { serverTournamentService, type TournamentLeaderboardEntry } from '@/lib/server/tournamentService';

// Request interface
interface LeaderboardRequest {
    tournamentId: string;
    limit?: number;
}

// Response interface
interface LeaderboardResponse {
    success: boolean;
    data?: TournamentLeaderboardEntry[];
    error?: string;
}

/**
 * POST /api/tournament/leaderboard
 * Get tournament leaderboard with accumulated points
 */
export async function POST(request: NextRequest): Promise<NextResponse<LeaderboardResponse>> {
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
        let body: LeaderboardRequest;
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

        const { tournamentId, limit = 100 } = body;

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

        // Validate limit
        if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Limit must be between 1 and 1000'
                },
                { status: 400 }
            );
        }

        console.log(`Fetching leaderboard for tournament ${tournamentId} (limit: ${limit}) by user: ${telegramId}`);

        // Get tournament leaderboard
        const leaderboard = await serverTournamentService.getTournamentLeaderboard(tournamentId, limit);

        console.log(`Leaderboard retrieved for tournament ${tournamentId}:`, {
            entries: leaderboard.length,
            topScore: leaderboard.length > 0 ? leaderboard[0].survival_score : 0
        });

        return NextResponse.json({
            success: true,
            data: leaderboard,
        });

    } catch (error) {
        console.error('Error fetching tournament leaderboard:', error);

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
                error: 'Failed to fetch tournament leaderboard'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/leaderboard
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