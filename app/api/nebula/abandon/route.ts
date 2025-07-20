// src/app/api/nebula/abandon/route.ts - Handle abandoned verification attempts

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface
interface AbandonRequest {
  attemptId: string;
}

// Response interface
interface AbandonResponse {
  success: boolean;
  blocked?: boolean;
  error?: string;
}

/**
 * POST /api/nebula/abandon
 * Handle abandoned verification attempt (page close/navigation)
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

    // Parse request body
    let body: AbandonRequest;

    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing attempt ID",
        },
        { status: 400 },
      );
    }

    console.log(
      `Processing abandonment for user ${telegramIdNumber}, attempt ${attemptId}`,
    );

    // Check if the verification attempt exists and belongs to the user
    const { attempt, isExpired } =
      await serverBlockService.checkVerificationAttempt(telegramIdNumber);

    if (!attempt || attempt.id !== attemptId) {
      // Attempt doesn't exist or doesn't belong to user
      console.log(
        `Attempt ${attemptId} not found or doesn't belong to user ${telegramIdNumber}`,
      );

      return NextResponse.json({
        success: true,
        blocked: false,
      });
    }

    // Handle the abandoned verification
    const abandonResult =
      await serverBlockService.handleAbandonedVerification(attempt);

    if (abandonResult.success) {
      console.log(
        `Successfully processed abandonment for user ${telegramIdNumber}, blocked: true`,
      );

      return NextResponse.json({
        success: true,
        blocked: true,
      });
    } else {
      console.error(
        `Failed to process abandonment for user ${telegramIdNumber}:`,
        abandonResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process abandonment",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error handling abandoned verification:", error);

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
 * OPTIONS /api/nebula/abandon
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
