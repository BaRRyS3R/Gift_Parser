// src/app/api/security/suspicious-activity/route.ts - Fixed API endpoint for submitting suspicious activity

import { NextRequest, NextResponse } from "next/server";

import { GameMode } from "@/types/game-modes/common";
import {
  SubmitSuspiciousActivityRequest,
  SubmitSuspiciousActivityResponse,
  SuspiciousActivityData,
} from "@/types/security/shadowSecurity";
import { shadowSecurityService } from "@/lib/server/shadowSecurityService";

/**
 * POST /api/security/suspicious-activity
 * Submit suspicious activity data for security analysis
 * This endpoint receives aggregated data about suspicious clicking patterns and gyroscope monitoring
 * and stores it in the database for administrative review
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<SubmitSuspiciousActivityResponse>> {
  try {
    // Extract authentication headers set by middleware
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    // Verify user authentication
    if (!telegramId || !userId) {
      console.warn(
        "Shadow Security: Unauthenticated suspicious activity submission attempt",
      );

      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to submit suspicious activity data",
        },
        { status: 401 },
      );
    }

    // Parse and validate Telegram ID
    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber) || telegramIdNumber <= 0) {
      console.warn(
        `Shadow Security: Invalid telegram ID format: ${telegramId}`,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid user identification format",
        },
        { status: 400 },
      );
    }

    // Parse request body
    let body: SubmitSuspiciousActivityRequest;

    try {
      body = await request.json();
    } catch (parseError) {
      console.warn(
        "Shadow Security: Failed to parse request body:",
        parseError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format - unable to parse JSON body",
        },
        { status: 400 },
      );
    }

    const { suspiciousActivity } = body;

    // Validate that suspicious activity data exists
    if (!suspiciousActivity || typeof suspiciousActivity !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Suspicious activity data is required in request body",
        },
        { status: 400 },
      );
    }

    // Security check: verify that the telegram ID in the data matches the authenticated user
    if (suspiciousActivity.telegramId !== telegramIdNumber) {
      console.warn(
        `Shadow Security: User ID mismatch - authenticated: ${telegramIdNumber}, ` +
          `data: ${suspiciousActivity.telegramId}`,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "User identification mismatch - data must be for authenticated user",
        },
        { status: 403 },
      );
    }

    // Comprehensive validation of suspicious activity data
    const validationResult = validateSuspiciousActivityData(suspiciousActivity);

    if (!validationResult.isValid) {
      console.warn(
        `Shadow Security: Data validation failed for user ${telegramIdNumber}: ${validationResult.error}`,
      );

      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
        },
        { status: 400 },
      );
    }

    // Submit suspicious activity data to the database
    const result =
      await shadowSecurityService.submitSuspiciousActivity(suspiciousActivity);

    if (!result.success) {
      console.error(
        `Shadow Security: Database submission failed for user ${telegramIdNumber}: ${result.error}`,
      );

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to process suspicious activity data",
        },
        { status: 500 },
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Shadow Security: Unexpected error processing suspicious activity submission:",
      error,
    );

    // Return generic error to avoid leaking internal details
    return NextResponse.json(
      {
        success: false,
        error:
          "Internal server error while processing suspicious activity data",
      },
      { status: 500 },
    );
  }
}

/**
 * Fixed validation of suspicious activity data
 * Now properly handles both click-based and gyroscope-based suspicious activity
 * @param data - The suspicious activity data to validate
 * @returns Validation result with success status and error message if applicable
 */
function validateSuspiciousActivityData(data: SuspiciousActivityData): {
  isValid: boolean;
  error?: string;
} {
  // Validate telegram ID
  if (typeof data.telegramId !== "number" || data.telegramId <= 0) {
    return {
      isValid: false,
      error: "Invalid telegram ID - must be a positive number",
    };
  }

  // Validate game mode
  if (!data.gameMode || !Object.values(GameMode).includes(data.gameMode)) {
    return {
      isValid: false,
      error: `Invalid game mode - must be one of: ${Object.values(GameMode).join(", ")}`,
    };
  }

  // Validate click counts
  if (typeof data.totalClicks !== "number" || data.totalClicks < 0) {
    return {
      isValid: false,
      error: "Invalid total clicks count - must be a non-negative number",
    };
  }

  if (
    typeof data.suspiciousClicksCount !== "number" ||
    data.suspiciousClicksCount < 0
  ) {
    return {
      isValid: false,
      error: "Invalid suspicious clicks count - must be a non-negative number",
    };
  }

  // Logical consistency check: suspicious clicks cannot exceed total clicks
  if (data.suspiciousClicksCount > data.totalClicks) {
    return {
      isValid: false,
      error: "Suspicious clicks count cannot exceed total clicks",
    };
  }

  // Validate reaction time metrics
  if (typeof data.minReactionTime !== "number" || data.minReactionTime < 0) {
    return {
      isValid: false,
      error: "Invalid minimum reaction time - must be a non-negative number",
    };
  }

  if (typeof data.maxReactionTime !== "number" || data.maxReactionTime < 0) {
    return {
      isValid: false,
      error: "Invalid maximum reaction time - must be a non-negative number",
    };
  }

  if (typeof data.avgReactionTime !== "number" || data.avgReactionTime < 0) {
    return {
      isValid: false,
      error: "Invalid average reaction time - must be a non-negative number",
    };
  }

  // Logical consistency check: min cannot exceed max reaction time
  if (data.minReactionTime > data.maxReactionTime) {
    return {
      isValid: false,
      error: "Minimum reaction time cannot exceed maximum reaction time",
    };
  }

  // Validate that average is within reasonable bounds
  if (
    data.avgReactionTime < data.minReactionTime ||
    data.avgReactionTime > data.maxReactionTime
  ) {
    return {
      isValid: false,
      error:
        "Average reaction time must be between minimum and maximum reaction times",
    };
  }

  // Validate gyroscope monitoring fields
  if (typeof data.gyroscopeEnabled !== "boolean") {
    return {
      isValid: false,
      error: "Invalid gyroscope enabled flag - must be a boolean",
    };
  }

  if (typeof data.gyroscopePermissionGranted !== "boolean") {
    return {
      isValid: false,
      error: "Invalid gyroscope permission granted flag - must be a boolean",
    };
  }

  if (typeof data.gyroscopeDataAvailable !== "boolean") {
    return {
      isValid: false,
      error: "Invalid gyroscope data available flag - must be a boolean",
    };
  }

  if (
    typeof data.totalGyroscopeChecks !== "number" ||
    data.totalGyroscopeChecks < 0
  ) {
    return {
      isValid: false,
      error: "Invalid total gyroscope checks - must be a non-negative number",
    };
  }

  if (
    typeof data.gyroscopeMovementsDetected !== "number" ||
    data.gyroscopeMovementsDetected < 0
  ) {
    return {
      isValid: false,
      error:
        "Invalid gyroscope movements detected - must be a non-negative number",
    };
  }

  if (
    typeof data.gyroscopeMovementPercentage !== "number" ||
    data.gyroscopeMovementPercentage < 0 ||
    data.gyroscopeMovementPercentage > 100
  ) {
    return {
      isValid: false,
      error:
        "Invalid gyroscope movement percentage - must be between 0 and 100",
    };
  }

  if (typeof data.gyroscopeSuspicious !== "boolean") {
    return {
      isValid: false,
      error: "Invalid gyroscope suspicious flag - must be a boolean",
    };
  }

  // Validate gyroscope data consistency
  if (data.gyroscopeMovementsDetected > data.totalGyroscopeChecks) {
    return {
      isValid: false,
      error: "Gyroscope movements detected cannot exceed total checks",
    };
  }

  // Validate gyroscope movement percentage calculation
  if (data.totalGyroscopeChecks > 0) {
    const calculatedPercentage =
      (data.gyroscopeMovementsDetected / data.totalGyroscopeChecks) * 100;
    const providedPercentage = data.gyroscopeMovementPercentage;

    // Allow small rounding differences (0.1%)
    if (Math.abs(calculatedPercentage - providedPercentage) > 0.1) {
      return {
        isValid: false,
        error: "Gyroscope movement percentage calculation mismatch",
      };
    }
  }

  // Validate timestamps
  if (typeof data.gameStartTime !== "number" || data.gameStartTime <= 0) {
    return {
      isValid: false,
      error: "Invalid game start time - must be a positive timestamp",
    };
  }

  if (typeof data.gameEndTime !== "number" || data.gameEndTime <= 0) {
    return {
      isValid: false,
      error: "Invalid game end time - must be a positive timestamp",
    };
  }

  // Logical consistency check: game end time must be after start time
  if (data.gameEndTime <= data.gameStartTime) {
    return {
      isValid: false,
      error: "Game end time must be after start time",
    };
  }

  // Validate reasonable game duration (between 1 second and 24 hours)
  const gameDuration = data.gameEndTime - data.gameStartTime;

  if (gameDuration < 1000) {
    // Less than 1 second
    return {
      isValid: false,
      error: "Game duration too short - must be at least 1 second",
    };
  }

  if (gameDuration > 24 * 60 * 60 * 1000) {
    // More than 24 hours
    return {
      isValid: false,
      error: "Game duration too long - cannot exceed 24 hours",
    };
  }

  // Validate that timestamps are not from the future (with 1 minute tolerance for clock skew)
  const now = Date.now();
  const tolerance = 60 * 1000; // 1 minute

  if (data.gameStartTime > now + tolerance) {
    return {
      isValid: false,
      error: "Game start time cannot be in the future",
    };
  }

  if (data.gameEndTime > now + tolerance) {
    return {
      isValid: false,
      error: "Game end time cannot be in the future",
    };
  }

  // FIXED: Enhanced business logic validation to accept suspicious clicks, suspicious gyroscope activity, OR gyroscope unavailability
  // Excludes iOS devices with intentionally disabled gyroscope from being considered suspicious
  const hasSuspiciousClicks = data.suspiciousClicksCount > 0;
  const hasSuspiciousGyroscope =
    data.gyroscopeEnabled && data.gyroscopeSuspicious;
  const hasGyroscopeUnavailability =
    !data.gyroscopeEnabled &&
    data.gyroscopeErrorReason !== null &&
    data.gyroscopeErrorReason !== "ios_optimization_disabled"; // Exclude iOS optimization

  if (
    !hasSuspiciousClicks &&
    !hasSuspiciousGyroscope &&
    !hasGyroscopeUnavailability
  ) {
    const skipReason =
      !data.gyroscopeEnabled &&
      data.gyroscopeErrorReason === "ios_optimization_disabled"
        ? "iOS device with intentionally disabled gyroscope - not considered suspicious"
        : "No suspicious activity detected - neither suspicious clicks, suspicious gyroscope activity, nor gyroscope unavailability found";

    return {
      isValid: false,
      error: skipReason,
    };
  }

  // Validate click consistency only if there are clicks to validate
  if (data.totalClicks > 0) {
    // Validate that minimum reaction time is reasonable for suspicious activity
    // Since we're flagging <250ms as suspicious, min should typically be quite low if there are suspicious clicks
    const suspiciousThreshold = 250;

    if (
      data.suspiciousClicksCount > 0 &&
      data.minReactionTime >= suspiciousThreshold
    ) {
      return {
        isValid: false,
        error:
          "Minimum reaction time inconsistent with suspicious activity detection threshold",
      };
    }

    // Validate reasonable reaction time bounds (0-10 seconds)
    const maxReasonableReactionTime = 10000; // 10 seconds

    if (data.maxReactionTime > maxReasonableReactionTime) {
      return {
        isValid: false,
        error: `Maximum reaction time too high - cannot exceed ${maxReasonableReactionTime}ms`,
      };
    }
  } else if (data.suspiciousClicksCount > 0) {
    // Cannot have suspicious clicks without total clicks
    return {
      isValid: false,
      error: "Cannot have suspicious clicks without total clicks",
    };
  }

  // Validate gyroscope consistency only if gyroscope is enabled
  if (data.gyroscopeEnabled) {
    if (data.totalGyroscopeChecks === 0 && data.gyroscopeSuspicious) {
      return {
        isValid: false,
        error:
          "Cannot have suspicious gyroscope activity without any gyroscope checks",
      };
    }

    // Validate gyroscope sensitivity threshold
    if (
      typeof data.gyroscopeMinSensitivity !== "number" ||
      data.gyroscopeMinSensitivity <= 0
    ) {
      return {
        isValid: false,
        error:
          "Invalid gyroscope minimum sensitivity - must be a positive number",
      };
    }

    // Validate gyroscope check intervals array
    if (!Array.isArray(data.gyroscopeCheckIntervals)) {
      return {
        isValid: false,
        error: "Invalid gyroscope check intervals - must be an array",
      };
    }

    // Check that intervals make sense for the number of checks
    const expectedIntervals = Math.max(0, data.totalGyroscopeChecks - 1);

    if (data.gyroscopeCheckIntervals.length !== expectedIntervals) {
      return {
        isValid: false,
        error: `Invalid gyroscope check intervals count - expected ${expectedIntervals}, got ${data.gyroscopeCheckIntervals.length}`,
      };
    }
  }

  // All validations passed
  return {
    isValid: true,
  };
}

/**
 * Helper function to sanitize error messages for logging
 * Removes potentially sensitive information from error messages
 * @param error - The error to sanitize
 * @returns Sanitized error message
 */
function sanitizeErrorForLogging(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error occurred";
}

/**
 * Helper function to extract IP address from request for logging
 * @param request - The NextRequest object
 * @returns IP address string or 'unknown'
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for IP address
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");

  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}
