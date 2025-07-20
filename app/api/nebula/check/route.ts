// src/app/api/nebula/check/route.ts - Complete version with permission grace period support

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
    permissionGranted?: boolean;
    requiresAppRestart?: boolean;
    gracePeriodRemaining?: number;
  };
  allowed?: {
    proceed: true;
    trustScore: number;
  };
  error?: string;
}

/**
 * Calculate remaining grace period in seconds
 */
function calculateGracePeriodRemaining(permissionGrantedAt: string): number {
  const gracePeriodMinutes = 5;
  const grantTime = new Date(permissionGrantedAt);
  const currentTime = new Date();
  const minutesPassed =
    (currentTime.getTime() - grantTime.getTime()) / (1000 * 60);
  const remainingMinutes = Math.max(0, gracePeriodMinutes - minutesPassed);

  return Math.floor(remainingMinutes * 60); // Convert to seconds
}

/**
 * Check if current time is within grace period after permission grant
 */
function isWithinPermissionGracePeriod(permissionGrantedAt: string): boolean {
  const gracePeriodMinutes = 5;
  const grantTime = new Date(permissionGrantedAt);
  const currentTime = new Date();
  const minutesDiff =
    (currentTime.getTime() - grantTime.getTime()) / (1000 * 60);

  return minutesDiff <= gracePeriodMinutes;
}

/**
 * GET /api/nebula/check
 * Check if user is blocked, has abandoned verification, or requires verification
 * Now includes support for permission grace periods
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

    // Step 1: Check for verification attempts with grace period consideration
    const { attempt, isExpired } =
      await serverBlockService.checkVerificationAttempt(telegramIdNumber);

    if (attempt) {
      // Check if permission was granted and requires app restart
      if (attempt.permissionGrantedAt && attempt.requiresAppRestart) {
        const inGracePeriod = isWithinPermissionGracePeriod(
          attempt.permissionGrantedAt,
        );

        if (inGracePeriod) {
          console.log(
            `User ${telegramIdNumber} in permission grace period, allowing continuation`,
          );

          const gracePeriodRemaining = calculateGracePeriodRemaining(
            attempt.permissionGrantedAt,
          );

          return NextResponse.json({
            success: true,
            verification: {
              required: true,
              type: attempt.verificationType,
              trustScore: 0, // Will be determined on verification page
              threshold: 0,
              attemptId: attempt.id,
              permissionGranted: true,
              requiresAppRestart: true,
              gracePeriodRemaining,
            },
          });
        } else {
          console.log(
            `User ${telegramIdNumber} grace period expired, treating as abandoned`,
          );
          // Grace period expired, treat as abandoned
          const abandonResult =
            await serverBlockService.handleAbandonedVerification(attempt);

          if (abandonResult.success) {
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

          return NextResponse.json(
            {
              success: false,
              error: "Failed to process expired grace period",
            },
            { status: 500 },
          );
        }
      }

      // Handle normal expired verification attempts
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

      // Create new verification attempt
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
