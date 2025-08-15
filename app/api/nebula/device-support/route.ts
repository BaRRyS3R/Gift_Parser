// src/app/api/nebula/device-support/route.ts - New API for updating device support status

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface
interface DeviceSupportRequest {
  attemptId: string;
  verificationType: "biometric" | "gyroscope";
  deviceSupported: boolean;
  permissionGranted?: boolean; // Optional for permission status updates
}

// Response interface
interface DeviceSupportResponse {
  success: boolean;
  blocked?: boolean;
  blockReason?: string;
  permissionRequired?: boolean;
  error?: string;
}

/**
 * POST /api/nebula/device-support
 * Update device support status and handle unsupported devices
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<DeviceSupportResponse>> {
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
    const body: DeviceSupportRequest = await request.json();
    const { attemptId, verificationType, deviceSupported, permissionGranted } =
      body;

    if (!attemptId || !verificationType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // Verify attempt belongs to user
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

    // Handle unsupported device - immediate blocking
    if (!deviceSupported) {
      console.warn(
        `Device does not support ${verificationType} for user ${telegramIdNumber} - blocking`,
      );

      const blockReason =
        verificationType === "biometric"
          ? "device_unsupported_biometric"
          : "device_unsupported_gyroscope";

      const blockResult = await serverBlockService.handleVerificationFailure(
        userId,
        telegramIdNumber,
        verificationType,
        blockReason,
      );

      // Remove verification attempt record
      await serverBlockService.removeVerificationAttempt(attemptId);

      if (blockResult.success) {
        return NextResponse.json({
          success: true,
          blocked: true,
          blockReason: `Device does not support ${verificationType} verification`,
        });
      } else {
        console.error(
          "Failed to block user for unsupported device:",
          blockResult.error,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to process device compatibility",
          },
          { status: 500 },
        );
      }
    }

    // Device is supported - update attempt record with supported status
    // Note: In a full implementation, you would update the verification_attempts table
    // For now, we'll assume the attempt record is updated via the existing database structure
    // Check if permission status is provided
    if (permissionGranted !== undefined) {
      if (permissionGranted) {
        // Permission granted - verification can proceed
        return NextResponse.json({
          success: true,
          blocked: false,
          permissionRequired: false,
        });
      } else {
        // Permission check - still in permission flow

        return NextResponse.json({
          success: true,
          blocked: false,
          permissionRequired: true,
        });
      }
    }

    // Device supported, but we need to check permissions
    return NextResponse.json({
      success: true,
      blocked: false,
      permissionRequired: true,
    });
  } catch (error) {
    console.error("Error in device support API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

