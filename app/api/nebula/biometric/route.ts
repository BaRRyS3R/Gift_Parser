// src/app/api/nebula/biometric/route.ts - Nebula Biometric Verification API with attempt tracking

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface
interface BiometricRequest {
  success: boolean;
  completedInTime: boolean;
  deviceSupported: boolean;
  token?: string;
  attemptId?: string;
}

// Response interface
interface BiometricResponse {
  success: boolean;
  verified?: boolean;
  trustRestored?: boolean;
  blocked?: boolean;
  blockReason?: string;
  blockDuration?: string;
  error?: string;
}

/**
 * POST /api/nebula/biometric
 * Validate biometric verification for Nebula security system
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<BiometricResponse>> {
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

    // Parse request body
    const body: BiometricRequest = await request.json();
    const {
      success: biometricSuccess,
      completedInTime,
      deviceSupported,
      token,
      attemptId,
    } = body;

    console.log(
      `Biometric verification attempt for user ${telegramIdNumber}:`,
      {
        success: biometricSuccess,
        completedInTime,
        deviceSupported,
        hasToken: !!token,
        attemptId,
      },
    );

    // Verify attempt belongs to user (if attemptId provided)
    if (attemptId) {
      const { attempt } =
        await serverBlockService.checkVerificationAttempt(telegramIdNumber);

      if (!attempt || attempt.id !== attemptId) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid verification attempt",
          },
          { status: 400 },
        );
      }
    }

    // Handle device not supported case
    if (!deviceSupported) {
      console.log(
        `Biometric not supported for user ${telegramIdNumber} - blocking for 2 days`,
      );

      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        "biometric",
        false, // Device not supported
      );

      // Remove verification attempt record if provided
      if (attemptId) {
        await serverBlockService.removeVerificationAttempt(attemptId);
      }

      if (blockResult.success) {
        return NextResponse.json({
          success: true,
          verified: false,
          blocked: true,
          blockReason: "Device does not support biometric authentication",
          blockDuration: "2 days",
        });
      } else {
        console.error(
          "Failed to block user for unsupported device:",
          blockResult.error,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to process device compatibility check",
          },
          { status: 500 },
        );
      }
    }

    // Handle successful biometric verification
    if (biometricSuccess && completedInTime) {
      console.log(
        `Biometric verification successful for user ${telegramIdNumber}`,
      );

      // Restore trust score
      const restoreResult = await serverBlockService.handleVerificationSuccess(
        telegramIdNumber,
        "biometric",
      );

      // Remove verification attempt record if provided
      if (attemptId) {
        await serverBlockService.removeVerificationAttempt(attemptId);
      }

      if (restoreResult.success) {
        return NextResponse.json({
          success: true,
          verified: true,
          trustRestored: true,
        });
      } else {
        console.error("Failed to restore trust score:", restoreResult.error);

        return NextResponse.json(
          {
            success: false,
            error: "Verification successful but failed to update trust score",
          },
          { status: 500 },
        );
      }
    } else {
      // Handle failed biometric verification
      let failureReason = "Unknown failure";

      if (!biometricSuccess && !completedInTime) {
        failureReason = "Biometric authentication failed and timed out";
      } else if (!biometricSuccess) {
        failureReason = "Biometric authentication failed";
      } else if (!completedInTime) {
        failureReason = "Biometric authentication timed out";
      }

      console.log(
        `Biometric verification failed for user ${telegramIdNumber}: ${failureReason}`,
      );

      // Block user for failed biometric
      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        "biometric",
        true, // Device supports biometric
      );

      // Remove verification attempt record if provided
      if (attemptId) {
        await serverBlockService.removeVerificationAttempt(attemptId);
      }

      if (blockResult.success) {
        return NextResponse.json({
          success: true,
          verified: false,
          blocked: true,
          blockReason: failureReason,
          blockDuration: "2 days",
        });
      } else {
        console.error("Failed to block user:", blockResult.error);

        return NextResponse.json(
          {
            success: false,
            error: "Verification failed and blocking unsuccessful",
          },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    console.error("Error in Nebula biometric API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/nebula/biometric
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
