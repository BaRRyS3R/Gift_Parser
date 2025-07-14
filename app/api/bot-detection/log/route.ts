// src/app/api/bot-detection/log/route.ts - API endpoint for logging bot detection results and retrieving statistics

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeaders, verifyToken } from '@/lib/jwt';
import { botDetectionServerService } from '@/lib/botDetectionServerService';

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('x-remote-address');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return realIP || remoteAddress || 'unknown';
}

export async function POST(request: NextRequest) {
    try {
        const { detection, options, requestCount, timeSinceLastRequest, userAgent, url } = await request.json();

        // Validate incoming data
        if (!detection) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing detection data',
                    message: 'Bot detection results are required',
                },
                { status: 400 }
            );
        }

        // Get user info from JWT if available (optional for bot detection)
        let userId: string | undefined;
        let telegramId: number | undefined;

        const token = extractTokenFromHeaders(request.headers);
        if (token) {
            const verification = await verifyToken(token);
            if (verification.isValid && verification.payload) {
                userId = verification.payload.userId;
                telegramId = verification.payload.telegramId;
            }
        }

        const ipAddress = getClientIP(request);

        // Analyze the detection result
        const analysis = await botDetectionServerService.analyzeDetection(
            detection,
            userId,
            telegramId,
            {
                endpoint: options?.endpoint || url || 'unknown',
                action: options?.action,
                userAgent,
                ipAddress,
                sessionId: detection?.sessionId,
                requestCount,
                timeSinceLastRequest,
            }
        );

        // Return analysis result
        return NextResponse.json({
            success: true,
            analysis: {
                shouldBlock: analysis.shouldBlock,
                actionTaken: analysis.actionTaken,
                riskScore: analysis.riskScore,
                reasons: analysis.reasons,
            },
        });
    } catch (error) {
        console.error('Error processing bot detection log:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process bot detection',
                message: error instanceof Error ? error.message : 'Unknown error occurred while processing bot detection',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get detection statistics (admin only - add proper auth check here)
        const token = extractTokenFromHeaders(request.headers);
        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required',
                    message: 'Access to detection statistics requires authentication'
                },
                { status: 401 }
            );
        }

        const verification = await verifyToken(token);
        if (!verification.isValid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid token',
                    message: 'The provided authentication token is not valid'
                },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const timeframe = searchParams.get('timeframe') as 'hour' | 'day' | 'week' || 'day';

        // Validate timeframe parameter
        if (!['hour', 'day', 'week'].includes(timeframe)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid timeframe',
                    message: 'Timeframe must be one of: hour, day, week',
                },
                { status: 400 }
            );
        }

        const stats = await botDetectionServerService.getDetectionStats(timeframe);

        return NextResponse.json({
            success: true,
            stats,
            timeframe,
        });
    } catch (error) {
        console.error('Error fetching bot detection stats:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch detection stats',
                message: error instanceof Error ? error.message : 'Unknown error occurred while fetching statistics',
            },
            { status: 500 }
        );
    }
}