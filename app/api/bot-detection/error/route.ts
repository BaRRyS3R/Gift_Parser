// src/app/api/bot-detection/error/route.ts - API endpoint for logging bot detection errors and monitoring issues

import { NextRequest, NextResponse } from 'next/server';

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
        const { error, options, userAgent, url, sessionId, timestamp } = await request.json();

        // Validate required fields
        if (!error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing error data',
                    message: 'Error information is required for logging',
                },
                { status: 400 }
            );
        }

        const clientIP = getClientIP(request);
        const requestTime = new Date().toISOString();

        // Comprehensive error logging data
        const errorLogData = {
            error: typeof error === 'string' ? error : error?.message || 'Unknown error',
            errorType: error?.name || 'BotDetectionError',
            options: options || {},
            userAgent: userAgent || request.headers.get('user-agent') || 'Unknown',
            url: url || 'Unknown',
            sessionId: sessionId || 'Unknown',
            timestamp: timestamp || Date.now(),
            requestTime,
            clientIP,
            headers: {
                'user-agent': request.headers.get('user-agent'),
                'x-forwarded-for': request.headers.get('x-forwarded-for'),
                'referer': request.headers.get('referer'),
                'accept-language': request.headers.get('accept-language'),
                'sec-ch-ua': request.headers.get('sec-ch-ua'),
                'sec-ch-ua-mobile': request.headers.get('sec-ch-ua-mobile'),
                'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform'),
            },
            stack: error?.stack || 'No stack trace available',
        };

        // Log error for monitoring and debugging
        console.error('Bot Detection Error:', errorLogData);

        // In production environment, you should integrate with your monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Example integrations:
            // 1. Send to error monitoring service (Sentry, LogRocket, etc.)
            // 2. Store in database for analysis and trending
            // 3. Alert administrators for critical errors
            // 4. Update system health metrics

            // Example: Send to external monitoring service
            try {
                // await sendToMonitoringService(errorLogData);
            } catch (monitoringError) {
                console.error('Failed to send error to monitoring service:', monitoringError);
            }
        }

        // Log additional context for development environment
        if (process.env.NODE_ENV === 'development') {
            console.warn('Bot Detection Debug Info:', {
                userAgentDetails: {
                    browser: getBrowserInfo(userAgent),
                    isMobile: /Mobile|Android|iPhone|iPad/i.test(userAgent || ''),
                    platform: getPlatformInfo(userAgent),
                },
                networkInfo: {
                    clientIP,
                    hasProxy: !!request.headers.get('x-forwarded-for'),
                    realIP: request.headers.get('x-real-ip'),
                },
                requestDetails: {
                    method: request.method,
                    contentType: request.headers.get('content-type'),
                    contentLength: request.headers.get('content-length'),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Error logged successfully',
            errorId: generateErrorId(),
            timestamp: requestTime,
        });
    } catch (processingError) {
        console.error('Error processing bot detection error log:', processingError);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to log bot detection error',
                message: processingError instanceof Error ? processingError.message : 'Unknown error occurred while processing error log',
            },
            { status: 500 }
        );
    }
}

// Helper function to generate unique error ID for tracking
function generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
}

// Helper function to extract browser information
function getBrowserInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';

    return 'Other';
}

// Helper function to extract platform information
function getPlatformInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';

    return 'Other';
}