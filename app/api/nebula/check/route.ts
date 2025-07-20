// src/app/api/nebula/check/route.ts - Fixed to work with existing database schema

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService, type UserBlock } from "@/lib/server/blockService";

// Response interface
interface NebulaCheckResponse {
    success: boolean;
    blocked?: {
        isBlocked: true;
        blockInfo: UserBlock;
    };
    verification?: {
        required: true;
        type: "captcha" | "biometric" | "gyroscope";
        trustScore: number;
        threshold: number;
        attemptId: string;
    };
    allowed?: {
        proceed: true;
        trustScore: number;
    };
    error?: string;
}

/**
 * GET /api/nebula/check
 * Check if user is blocked, has abandoned verification, or requires verification
 * Fixed to work with existing database schema
 */
export async function GET(
    request: NextRequest,
): Promise<NextResponse<NebulaCheckResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get("X-Telegram-ID");
        const userId = request.headers.get("X-User-ID");

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 },
            );
        }

        const telegramIdNumber = parseInt(telegramId);

        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user ID",
                },
                { status: 400 },
            );
        }

        console.log(`Nebula check for user: ${telegramIdNumber}`);

        // Step 1: Check for verification attempts
        const { attempt, isExpired } =
            await serverBlockService.checkVerificationAttempt(telegramIdNumber);

        if (attempt) {
            // Handle expired verification attempts (abandoned)
            if (isExpired) {
                console.log(
                    `User ${telegramIdNumber} has abandoned verification attempt, blocking`,
                );

                // Block user for abandoning verification
                const abandonResult =
                    await serverBlockService.handleAbandonedVerification(attempt);

                if (abandonResult.success) {
                    // Get updated block info
                    const blockInfo =
                        await serverBlockService.checkUserBlock(telegramIdNumber);

                    if (blockInfo) {
                        return NextResponse.json({
                            success: true,
                            blocked: {
                                isBlocked: true,
                                blockInfo,
                            },
                        });
                    }
                }

                // Fallback if blocking failed
                return NextResponse.json(
                    {
                        success: false,
                        error: "Failed to process abandoned verification",
                    },
                    { status: 500 },
                );
            }

            // If there's an active (non-expired) verification attempt, user should continue it
            if (!isExpired) {
                console.log(
                    `User ${telegramIdNumber} has active verification attempt, redirecting to continue`,
                );

                return NextResponse.json({
                    success: true,
                    verification: {
                        required: true,
                        type: attempt.verificationType,
                        trustScore: 0, // Will be determined on verification page
                        threshold: 0,
                        attemptId: attempt.id,
                    },
                });
            }
        }

        // Step 2: Check if user is currently blocked
        const blockInfo = await serverBlockService.checkUserBlock(telegramIdNumber);

        if (blockInfo && blockInfo.isActive && blockInfo.timeRemainingSeconds > 0) {
            console.log(`User ${telegramIdNumber} is currently blocked:`, blockInfo);

            return NextResponse.json({
                success: true,
                blocked: {
                    isBlocked: true,
                    blockInfo,
                },
            });
        }

        // Step 3: Check if user requires verification
        const verificationReq =
            await serverBlockService.checkVerificationRequirement(telegramIdNumber);

        if (verificationReq.required && verificationReq.type) {
            console.log(
                `User ${telegramIdNumber} requires ${verificationReq.type} verification. Trust score: ${verificationReq.trustScore}`,
            );

            // Create new verification attempt with basic parameters
            const attemptId = await serverBlockService.createVerificationAttempt(
                userId,
                telegramIdNumber,
                verificationReq.type,
                true, // Assume device supported initially
            );

            return NextResponse.json({
                success: true,
                verification: {
                    required: true,
                    type: verificationReq.type,
                    trustScore: verificationReq.trustScore,
                    threshold: verificationReq.threshold,
                    attemptId,
                },
            });
        }

        // Step 4: User is allowed to proceed
        console.log(
            `User ${telegramIdNumber} passed Nebula checks. Trust score: ${verificationReq.trustScore}`,
        );

        return NextResponse.json({
            success: true,
            allowed: {
                proceed: true,
                trustScore: verificationReq.trustScore,
            },
        });
    } catch (error) {
        console.error("Error in Nebula check:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error during security check",
            },
            { status: 500 },
        );
    }
}

/**
 * OPTIONS /api/nebula/check
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}