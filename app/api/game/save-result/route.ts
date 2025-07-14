// src/app/api/game/save-result/route.ts - Protected game result saving with bot detection

import { NextRequest, NextResponse } from 'next/server';
import { withGameProtection } from '@/lib/authMiddleware';
import { userService } from '@/lib/supabase';
import { GameMode } from '@/types/game-modes/common';

export const POST = withGameProtection(async (request) => {
    try {
        const { user } = request;
        const gameResult = await request.json();

        // Validate game result structure
        if (!gameResult || !gameResult.mode || !gameResult.score || !gameResult.duration) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid game result data',
                },
                { status: 400 }
            );
        }

        // Validate game mode
        const validModes = Object.values(GameMode);
        if (!validModes.includes(gameResult.mode)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid game mode',
                },
                { status: 400 }
            );
        }

        // Additional validation for different game modes
        const isValidResult = validateGameResult(gameResult);
        if (!isValidResult.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid game result',
                    message: isValidResult.error,
                },
                { status: 400 }
            );
        }

        // Save game result
        const saveResult = await userService.saveGameResult(user.telegramId, gameResult);

        return NextResponse.json({
            success: true,
            saveResult,
        });
    } catch (error) {
        console.error('Error saving game result:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save game result',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
});

function validateGameResult(gameResult: any): { valid: boolean; error?: string } {
    // Basic validation
    if (typeof gameResult.score !== 'number' || gameResult.score < 0) {
        return { valid: false, error: 'Invalid score value' };
    }

    if (typeof gameResult.duration !== 'number' || gameResult.duration < 0) {
        return { valid: false, error: 'Invalid duration value' };
    }

    // Mode-specific validation
    switch (gameResult.mode) {
        case GameMode.REACTION:
            if (typeof gameResult.reactionTime !== 'number' || gameResult.reactionTime < 0) {
                return { valid: false, error: 'Invalid reaction time' };
            }
            break;

        case GameMode.SURVIVAL:
        case GameMode.ROTATION:
            if (typeof gameResult.survivalTime !== 'number' || gameResult.survivalTime < 0) {
                return { valid: false, error: 'Invalid survival time' };
            }
            if (typeof gameResult.maxLevelReached !== 'number' || gameResult.maxLevelReached < 1) {
                return { valid: false, error: 'Invalid max level reached' };
            }
            break;

        case GameMode.PHYSICS:
            if (typeof gameResult.gameTime !== 'number' || gameResult.gameTime < 0) {
                return { valid: false, error: 'Invalid game time' };
            }
            if (typeof gameResult.totalHits !== 'number' || gameResult.totalHits < 0) {
                return { valid: false, error: 'Invalid total hits' };
            }
            break;
    }

    return { valid: true };
}