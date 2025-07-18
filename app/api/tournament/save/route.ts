// src/app/api/tournament/save/route.ts - Tournament result saving API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { serverTournamentService, type TournamentSaveResponse } from '@/lib/server/tournamentService';
import { SurvivalGameResult } from '@/types/game-modes/survival';

// Response interface for API
interface TournamentSaveAPIResponse {
    success: boolean;
    data?: TournamentSaveResponse;
    error?: string;
}

/**
 * POST /api/tournament/save
 * Save tournament game result and update participant statistics
 */
export async function POST(request: NextRequest): Promise<NextResponse<TournamentSaveAPIResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
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
                    error: 'Invalid user ID format'
                },
                { status: 400 }
            );
        }

        // Parse request body
        let requestBody;
        try {
            requestBody = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON in request body'
                },
                { status: 400 }
            );
        }

        const { tournamentId, gameResult } = requestBody;

        if (!tournamentId || !gameResult) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Tournament ID and game result are required'
                },
                { status: 400 }
            );
        }

        // Validate tournament ID format
        if (typeof tournamentId !== 'string' || tournamentId.trim() === '') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid tournament ID format'
                },
                { status: 400 }
            );
        }

        // Validate tournament game result structure
        if (!serverTournamentService.validateTournamentResult(gameResult)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid tournament game result format'
                },
                { status: 400 }
            );
        }

        console.log(`Processing tournament save request for user ${telegramIdNumber}:`, {
            tournamentId,
            score: gameResult.score,
            survivalTime: gameResult.survivalTime,
            maxLevelReached: gameResult.maxLevelReached
        });

        // Save tournament result using server service
        const saveResult = await serverTournamentService.saveTournamentResult(
            telegramIdNumber,
            tournamentId,
            gameResult as SurvivalGameResult
        );

        if (!saveResult.success) {
            // Handle specific tournament-related errors
            if (saveResult.error?.includes('not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: saveResult.error
                    },
                    { status: 404 }
                );
            }

            if (saveResult.error?.includes('not active') || saveResult.error?.includes('not currently running')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: saveResult.error
                    },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: saveResult.error || 'Failed to save tournament result'
                },
                { status: 500 }
            );
        }

        console.log(`Successfully processed tournament save for user ${telegramIdNumber}:`, {
            tournamentId,
            resultId: saveResult.result_id,
            totalScore: saveResult.total_score,
            gamesPlayed: saveResult.games_played
        });

        return NextResponse.json({
            success: true,
            data: saveResult,
        });

    } catch (error) {
        console.error('Error in tournament save API:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('User not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'User account not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('Tournament not found')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Tournament not found'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('not active')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Tournament is not currently active'
                    },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error during tournament save'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/tournament/save
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