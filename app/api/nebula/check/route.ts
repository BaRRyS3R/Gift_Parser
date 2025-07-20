// src/app/api/nebula/check/route.ts - Updated with device support checking

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService, type UserBlock } from "@/lib/server/blockService";

// Response interface with device support information
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
        // New fields for device support flow
        needsDeviceCheck?: boolean; // Client should check device support
        needsPermission?: boolean; // Device supports but needs permission
        permissionExpiry?: string; // When permission request expires
    };
    allowed?: {
        proceed: true;
        trustScore: number;
    };
    error?: string;
}

/**
 * GET /api/nebula/check
 * Enhanced to handle device support checking flow
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

            // If there's an active (non-expired) verification attempt, determine the flow
            if (!isExpired) {
                console.log(
                    `User ${telegramIdNumber} has active verification attempt for ${attempt.verificationType}`,
                );

                // For captcha, always proceed directly to modal
                if (attempt.verificationType === "captcha") {
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

                // For biometric/gyroscope, determine if we need device checking or permission flow
                // If device_supported is false, this means device doesn't support it
                if (!attempt.deviceSupported) {
                    // Device already determined to be unsupported, should be blocked
                    console.log(`Device unsupported for ${attempt.verificationType}, should be blocked`);

                    const blockReason = attempt.verificationType === "biometric"
                        ? "device_unsupported_biometric"
                        : "device_unsupported_gyroscope";

                    const blockResult = await serverBlockService.handleVerificationFailure(
                        userId,
                        telegramIdNumber,
                        attempt.verificationType,
                        blockReason,
                    );

                    if (blockResult.success) {
                        const blockInfo = await serverBlockService.checkUserBlock(telegramIdNumber);
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
                }

                // Check if this is a fresh attempt that needs device checking
                const attemptAge = Date.now() - new Date(attempt.startedAt).getTime();
                const isNewAttempt = attemptAge < 10000; // Less than 10 seconds old

                return NextResponse.json({
                    success: true,
                    verification: {
                        required: true,
                        type: attempt.verificationType,
                        trustScore: 0, // Will be determined on verification page
                        threshold: 0,
                        attemptId: attempt.id,
                        needsDeviceCheck: isNewAttempt, // Fresh attempts need device checking
                        needsPermission: !isNewAttempt, // Older attempts are in permission flow
                        permissionExpiry: attempt.expiresAt,
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

            // Create new verification attempt
            // For biometric/gyroscope, we'll determine device support on the client
            // For captcha, device support is always true
            const deviceSupported = verificationReq.type === "captcha";

            const attemptId = await serverBlockService.createVerificationAttempt(
                userId,
                telegramIdNumber,
                verificationReq.type,
                deviceSupported, // Will be updated after device check
            );

            return NextResponse.json({
                success: true,
                verification: {
                    required: true,
                    type: verificationReq.type,
                    trustScore: verificationReq.trustScore,
                    threshold: verificationReq.threshold,
                    attemptId,
                    needsDeviceCheck: verificationReq.type !== "captcha", // Only biometric/gyroscope need device checking
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
 * OPTIONS /api/nebula/gyroscope
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}