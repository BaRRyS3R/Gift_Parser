// src/app/api/nebula/unblock/route.ts - Nebula Automatic Unblock API

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService, type UserBlock } from "@/lib/server/blockService";

// Response interface
interface UnblockResponse {
  success: boolean;
  unblocked?: boolean;
  blockInfo?: UserBlock | null;
  timeRemaining?: number;
  error?: string;
}

/**
 * POST /api/nebula/unblock
 * Check and automatically unblock user if block time has expired
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UnblockResponse>> {
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

    // Auto-unblock expired blocks system-wide
    await serverBlockService.autoUnblockExpiredBlocks();

    // Check current block status after auto-unblock
    const blockInfo = await serverBlockService.checkUserBlock(telegramIdNumber);

    if (
      !blockInfo ||
      !blockInfo.isActive ||
      blockInfo.timeRemainingSeconds <= 0
    ) {
      // User is not blocked or block has expired
      return NextResponse.json({
        success: true,
        unblocked: true,
        blockInfo: null,
        timeRemaining: 0,
      });
    } else {
      // User is still blocked

      return NextResponse.json({
        success: true,
        unblocked: false,
        blockInfo,
        timeRemaining: blockInfo.timeRemainingSeconds,
      });
    }
  } catch (error) {
    console.error("Error checking unblock status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during unblock check",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/nebula/unblock
 * Get current block status without auto-unblocking
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<UnblockResponse>> {
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

    // Get current block status
    const blockInfo = await serverBlockService.checkUserBlock(telegramIdNumber);

    if (
      !blockInfo ||
      !blockInfo.isActive ||
      blockInfo.timeRemainingSeconds <= 0
    ) {
      return NextResponse.json({
        success: true,
        unblocked: true,
        blockInfo: null,
        timeRemaining: 0,
      });
    } else {
      return NextResponse.json({
        success: true,
        unblocked: false,
        blockInfo,
        timeRemaining: blockInfo.timeRemainingSeconds,
      });
    }
  } catch (error) {
    console.error("Error getting block status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during block status check",
      },
      { status: 500 },
    );
  }
}
