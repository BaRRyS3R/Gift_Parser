// src/app/api/nebula/abandon/route.ts - Enhanced with abandonment reason tracking

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface with optional reason tracking
interface AbandonRequest {
  attemptId: string;
  reason?: string; // Optional reason for abandonment tracking
}

// Response interface
interface AbandonResponse {
  success: boolean;
  blocked?: boolean;
  reason?: string;
  error?: string;
}

// Valid abandonment reasons for analytics and debugging
const VALID_ABANDONMENT_REASONS = [
  "page_hidden_timeout", // User left page for extended period during unsafe phase
  "page_unload", // Page was closed/refreshed during verification
  "manual_close", // User manually closed modal/page
  "navigation_away", // User navigated to different page
  "unknown", // Default fallback reason
] as const;

type AbandonmentReason = (typeof VALID_ABANDONMENT_REASONS)[number];

/**
 * Validate and normalize abandonment reason
 */
function validateAbandonmentReason(reason?: string): AbandonmentReason {
  if (!reason) return "unknown";

  const normalizedReason = reason.toLowerCase().trim();

  // Check if reason matches valid options
  for (const validReason of VALID_ABANDONMENT_REASONS) {
    if (normalizedReason === validReason) {
      return validReason;
    }
  }

  return "unknown";
}

/**
 * POST /api/nebula/abandon
 * Handle abandoned verification attempt with enhanced reason tracking
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<AbandonResponse>> {
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

    // Parse request body with enhanced error handling
    let body: AbandonRequest;

    try {
      const requestText = await request.text();

      // Handle empty body gracefully
      if (!requestText.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Empty request body",
          },
          { status: 400 },
        );
      }

      body = JSON.parse(requestText);
    } catch (parseError) {
      console.error("Failed to parse abandon request body:", parseError);

      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body format",
        },
        { status: 400 },
      );
    }

    const { attemptId, reason } = body;

    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid attempt ID is required",
        },
        { status: 400 },
      );
    }

    // Validate and normalize the abandonment reason
    const validatedReason = validateAbandonmentReason(reason);

    // Check if the verification attempt exists and belongs to the user
    const { attempt, isExpired } =
      await serverBlockService.checkVerificationAttempt(telegramIdNumber);

    if (!attempt) {
      return NextResponse.json({
        success: true,
        blocked: false,
        reason: "no_active_attempt",
      });
    }

    if (attempt.id !== attemptId) {
      return NextResponse.json({
        success: true,
        blocked: false,
        reason: "attempt_id_mismatch",
      });
    }

    // Check if attempt is already expired (natural expiration vs abandonment)
    if (isExpired) {
      // Remove expired attempt without additional blocking
      await serverBlockService.removeVerificationAttempt(attemptId);

      return NextResponse.json({
        success: true,
        blocked: false,
        reason: "already_expired",
      });
    }

    // Handle the abandonment with enhanced metadata
    const enhancedAttempt = {
      ...attempt,
      abandonmentReason: validatedReason,
      abandonedAt: new Date().toISOString(),
    };

    const abandonResult =
      await serverBlockService.handleAbandonedVerification(enhancedAttempt);

    if (abandonResult.success) {
      return NextResponse.json({
        success: true,
        blocked: true,
        reason: validatedReason,
      });
    } else {
      console.error(
        `Failed to process abandonment for user ${telegramIdNumber}:`,
        abandonResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process verification abandonment",
          reason: validatedReason,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error handling abandoned verification:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during abandonment processing",
      },
      { status: 500 },
    );
  }
}

