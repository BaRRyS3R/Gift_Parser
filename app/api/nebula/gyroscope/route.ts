// src/app/api/nebula/gyroscope/route.ts - Nebula Gyroscope Verification API

import { NextRequest, NextResponse } from 'next/server';
import { serverBlockService } from '@/lib/server/blockService';

// Request interface
interface GyroscopeRequest {
    success: boolean;
    completedInTime: boolean;
    deviceSupported: boolean;
    movementData?: {
        totalMovements: number;
        requiredMovements: number;
        timeSpent: number;
        significantMovements: boolean;
    };
}

// Response interface
interface GyroscopeResponse {
    success: boolean;
    verified?: boolean;
    trustRestored?: boolean;
    blocked?: boolean;
    blockReason?: string;
    blockDuration?: string;
    error?: string;
}

/**
 * POST /api/nebula/gyroscope
 * Validate gyroscope verification for Nebula security system
 */
export async function POST(request: NextRequest): Promise<NextResponse<GyroscopeResponse>> {
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
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        // Parse request body
        const body: GyroscopeRequest = await request.json();
        const { success: gyroscopeSuccess, completedInTime, deviceSupported, movementData } = body;

        console.log(`Gyroscope verification attempt for user ${telegramIdNumber}:`, {
            success: gyroscopeSuccess,
            completedInTime,
            deviceSupported,
            movementData
        });

        // Handle device not supported case
        if (!deviceSupported) {
            console.log(`Gyroscope not supported for user ${telegramIdNumber} - blocking for 1 month`);

            const blockResult = await serverBlockService.handleVerificationFailure(
                userId,
                telegramIdNumber,
                'gyroscope',
                false // Device not supported
            );

            if (blockResult.success) {
                return NextResponse.json({
                    success: true,
                    verified: false,
                    blocked: true,
                    blockReason: 'Device does not support gyroscope verification',
                    blockDuration: '1 month',
                });
            } else {
                console.error('Failed to block user for unsupported device:', blockResult.error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to process device compatibility check'
                    },
                    { status: 500 }
                );
            }
        }

        // Validate movement data for successful verification
        let isValidMovement = true;
        if (gyroscopeSuccess && movementData) {
            const { totalMovements, requiredMovements, significantMovements } = movementData;
            isValidMovement = totalMovements >= requiredMovements && significantMovements;
        }

        // Handle successful gyroscope verification
        if (gyroscopeSuccess && completedInTime && isValidMovement) {
            console.log(`Gyroscope verification successful for user ${telegramIdNumber}`);

            // Restore trust score
            const restoreResult = await serverBlockService.handleVerificationSuccess(telegramIdNumber, 'gyroscope');

            if (restoreResult.success) {
                return NextResponse.json({
                    success: true,
                    verified: true,
                    trustRestored: true,
                });
            } else {
                console.error('Failed to restore trust score:', restoreResult.error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Verification successful but failed to update trust score'
                    },
                    { status: 500 }
                );
            }
        } else {
            // Handle failed gyroscope verification
            let failureReason = 'Unknown failure';

            if (!gyroscopeSuccess && !completedInTime) {
                failureReason = 'Gyroscope verification failed and timed out';
            } else if (!gyroscopeSuccess) {
                failureReason = 'Gyroscope verification failed';
            } else if (!completedInTime) {
                failureReason = 'Gyroscope verification timed out';
            } else if (!isValidMovement) {
                failureReason = 'Insufficient device movement detected';
            }

            console.log(`Gyroscope verification failed for user ${telegramIdNumber}: ${failureReason}`);

            // Block user for failed gyroscope verification
            const blockResult = await serverBlockService.handleVerificationFailure(
                userId,
                telegramIdNumber,
                'gyroscope',
                true // Device supports gyroscope
            );

            if (blockResult.success) {
                return NextResponse.json({
                    success: true,
                    verified: false,
                    blocked: true,
                    blockReason: failureReason,
                    blockDuration: '1 month',
                });
            } else {
                console.error('Failed to block user:', blockResult.error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Verification failed and blocking unsuccessful'
                    },
                    { status: 500 }
                );
            }
        }

    } catch (error) {
        console.error('Error in Nebula gyroscope API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error'
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/nebula/gyroscope
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