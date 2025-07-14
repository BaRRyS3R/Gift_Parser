// src/lib/authMiddleware.ts - Enhanced authentication middleware with bot detection

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, type CustomJWTPayload } from './jwt';
import { shouldBlockRequest } from './botDetectionServerService';

export interface AuthenticatedRequest extends NextRequest {
    user: CustomJWTPayload;
}

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('x-remote-address');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return realIP || remoteAddress || 'unknown';
}

function getSessionId(request: NextRequest): string | undefined {
    return request.headers.get('x-session-id') || undefined;
}

/**
 * Higher-order function that wraps API handlers with authentication and bot detection
 */
export function withAuth<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        try {
            // Verify JWT token and extract user payload
            const userPayload = await requireAuth(request);

            // Add user data to request object
            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = userPayload;

            // Call the original handler with authenticated request
            return await handler(authenticatedRequest, ...args);
        } catch (error) {
            console.error('Authentication middleware error:', error);

            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required',
                    message: error instanceof Error ? error.message : 'Invalid or missing authentication token',
                },
                { status: 401 }
            );
        }
    };
}

/**
 * Rate limiting helper with enhanced tracking
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number; blocked: boolean }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Increased for legitimate use
const RATE_LIMIT_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes block

export function rateLimit(identifier: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const userLimit = rateLimitMap.get(identifier);

    if (!userLimit || now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(identifier, { count: 1, lastReset: now, blocked: false });
        return { allowed: true };
    }

    // Check if user is currently blocked
    if (userLimit.blocked && now - userLimit.lastReset < RATE_LIMIT_BLOCK_DURATION) {
        return { allowed: false, reason: 'Temporarily blocked due to rate limit violation' };
    }

    // Reset block status if block duration has passed
    if (userLimit.blocked && now - userLimit.lastReset >= RATE_LIMIT_BLOCK_DURATION) {
        rateLimitMap.set(identifier, { count: 1, lastReset: now, blocked: false });
        return { allowed: true };
    }

    if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        // Block the user
        userLimit.blocked = true;
        userLimit.lastReset = now;
        return { allowed: false, reason: 'Rate limit exceeded - temporarily blocked' };
    }

    userLimit.count++;
    return { allowed: true };
}

/**
 * Enhanced authentication wrapper with rate limiting and bot detection
 */
export function withAuthAndRateLimit<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
    options: {
        enableBotDetection?: boolean;
        skipRateLimit?: boolean;
        criticalEndpoint?: boolean;
    } = {}
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        try {
            // Verify JWT token first
            const userPayload = await requireAuth(request);

            const ipAddress = getClientIP(request);
            const sessionId = getSessionId(request);

            // Bot detection check for critical endpoints
            if (options.enableBotDetection && options.criticalEndpoint) {
                const shouldBlock = await shouldBlockRequest(
                    userPayload.userId,
                    userPayload.telegramId,
                    ipAddress,
                    sessionId
                );

                if (shouldBlock) {
                    console.warn(`Bot detection blocked request from user ${userPayload.telegramId}`);
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Request blocked',
                            message: 'Your request has been blocked due to suspicious activity. Please try again later.',
                        },
                        { status: 403 }
                    );
                }
            }

            // Apply rate limiting per user
            if (!options.skipRateLimit) {
                const rateLimitKey = `user_${userPayload.userId}`;
                const rateCheck = rateLimit(rateLimitKey);

                if (!rateCheck.allowed) {
                    console.warn(`Rate limit exceeded for user ${userPayload.telegramId}: ${rateCheck.reason}`);
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Rate limit exceeded',
                            message: rateCheck.reason || 'Too many requests. Please try again later.',
                        },
                        { status: 429 }
                    );
                }
            }

            // Add user data to request
            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = userPayload;

            // Call the original handler
            return await handler(authenticatedRequest, ...args);
        } catch (error) {
            console.error('Enhanced authentication middleware error:', error);

            // Determine appropriate error response
            if (error instanceof Error) {
                if (error.message.includes('Authentication')) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Authentication required',
                            message: error.message,
                        },
                        { status: 401 }
                    );
                }

                if (error.message.includes('blocked') || error.message.includes('suspicious')) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Request blocked',
                            message: error.message,
                        },
                        { status: 403 }
                    );
                }
            }

            return NextResponse.json(
                {
                    success: false,
                    error: 'Request processing failed',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                },
                { status: 500 }
            );
        }
    };
}

/**
 * CORS helper for API routes
 */
export function setCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
}

/**
 * Enhanced wrapper with CORS support and comprehensive protection
 */
export function withAuthCorsAndRateLimit<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
    options: {
        enableBotDetection?: boolean;
        skipRateLimit?: boolean;
        criticalEndpoint?: boolean;
    } = {}
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        // Handle preflight OPTIONS request
        if (request.method === 'OPTIONS') {
            const response = new NextResponse(null, { status: 200 });
            return setCorsHeaders(response);
        }

        try {
            // Apply enhanced authentication with bot detection
            const authenticatedHandler = withAuthAndRateLimit(handler, options);
            const response = await authenticatedHandler(request, ...args);

            // Add CORS headers to response
            return setCorsHeaders(response);
        } catch (error) {
            console.error('Enhanced auth CORS middleware error:', error);

            const errorResponse = NextResponse.json(
                {
                    success: false,
                    error: 'Request processing failed',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                },
                { status: 500 }
            );

            return setCorsHeaders(errorResponse);
        }
    };
}

/**
 * Specialized wrapper for critical game endpoints with maximum protection
 */
export function withGameProtection<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
    return withAuthCorsAndRateLimit(handler, {
        enableBotDetection: true,
        criticalEndpoint: true,
        skipRateLimit: false,
    });
}

/**
 * Wrapper for tournament endpoints with enhanced protection
 */
export function withTournamentProtection<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
    return withAuthCorsAndRateLimit(handler, {
        enableBotDetection: true,
        criticalEndpoint: true,
        skipRateLimit: false,
    });
}

/**
 * Wrapper for user profile endpoints with standard protection
 */
export function withProfileProtection<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
    return withAuthCorsAndRateLimit(handler, {
        enableBotDetection: false,
        criticalEndpoint: false,
        skipRateLimit: false,
    });
}