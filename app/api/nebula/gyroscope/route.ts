// src/app/api/nebula/gyroscope/route.ts - Updated with new permission-related block reasons

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface with enhanced permission tracking
interface GyroscopeRequest {
  success: boolean;
  completedInTime: boolean;
  deviceSupported: boolean;
  unavailable?: boolean; // New: gyroscope unavailable on device
  permissionDenied?: boolean; // New: permission was denied
  attemptId?: string;
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
 * Enhanced gyroscope verification with new permission-related blocking
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<GyroscopeResponse>> {
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
    const body: GyroscopeRequest = await request.json();
    const {
      success: gyroscopeSuccess,
      completedInTime,
      deviceSupported,
      unavailable,
      permissionDenied,
      attemptId,
      movementData,
    } = body;

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

    // Handle gyroscope unavailable on device
    if (unavailable || !deviceSupported) {
      const blockReason = unavailable
        ? "gyroscope_unavailable"
        : "device_unsupported_gyroscope";
      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        "gyroscope",
        blockReason,
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
          blockReason: unavailable
            ? "Gyroscope verification unavailable on device"
            : "Device does not support gyroscope verification",
          blockDuration: "1 month",
        });
      } else {
        console.error(
          "Failed to block user for gyroscope unavailability:",
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

    // Handle permission denied
    if (permissionDenied) {
      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        "gyroscope",
        "gyroscope_permission_denied",
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
          blockReason: "Gyroscope access permission denied",
          blockDuration: "1 month",
        });
      } else {
        console.error(
          "Failed to block user for permission denial:",
          blockResult.error,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to process permission denial",
          },
          { status: 500 },
        );
      }
    }

    // Validate movement data for successful verification
    let isValidMovement = true;

    if (gyroscopeSuccess && movementData) {
      const { totalMovements, requiredMovements, significantMovements } =
        movementData;

      isValidMovement =
        totalMovements >= requiredMovements && significantMovements;
    }

    // Handle successful gyroscope verification
    if (gyroscopeSuccess && completedInTime && isValidMovement) {
      // Restore trust score
      const restoreResult = await serverBlockService.handleVerificationSuccess(
        telegramIdNumber,
        "gyroscope",
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
      // Handle failed gyroscope verification
      let failureReason = "Unknown failure";

      if (!gyroscopeSuccess && !completedInTime) {
        failureReason = "Gyroscope verification failed and timed out";
      } else if (!gyroscopeSuccess) {
        failureReason = "Gyroscope verification failed";
      } else if (!completedInTime) {
        failureReason = "Gyroscope verification timed out";
      } else if (!isValidMovement) {
        failureReason = "Insufficient device movement detected";
      }

      // Block user for failed gyroscope verification
      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        "gyroscope",
        "failed_gyroscope",
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
          blockDuration: "1 month",
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
    console.error("Error in Nebula gyroscope API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

