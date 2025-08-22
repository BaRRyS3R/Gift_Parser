// src/app/api/nebula/manual-block/route.ts - Manual blocking API for PC detection

import { NextRequest, NextResponse } from "next/server";
import { serverBlockService, type BlockReason } from "@/lib/server/blockService";

interface ManualBlockRequest {
  blockReason: BlockReason;
  durationHours?: number;
  additionalData?: Record<string, any>;
  verificationType?: string;
}

interface ManualBlockResponse {
  success: boolean;
  blocked?: boolean;
  blockId?: string;
  blockReason?: string;
  blockDuration?: string;
  error?: string;
}

/**
 * POST /api/nebula/manual-block
 * Create a manual block for the authenticated user
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ManualBlockResponse>> {
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
    let body: ManualBlockRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Failed to parse manual block request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body format",
        },
        { status: 400 },
      );
    }

    const { blockReason, durationHours, additionalData, verificationType } = body;

    // Validate block reason
    if (!blockReason || typeof blockReason !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid block reason is required",
        },
        { status: 400 },
      );
    }

    // Check if user is already blocked
    const existingBlock = await serverBlockService.checkUserBlock(telegramIdNumber);
    if (existingBlock && existingBlock.isActive) {
      return NextResponse.json({
        success: true,
        blocked: true,
        blockReason: `Already blocked: ${existingBlock.blockReason}`,
        blockDuration: `${Math.ceil(existingBlock.timeRemainingSeconds / 3600)} hours remaining`,
      });
    }

    // Create enhanced additional data with metadata
    const enhancedAdditionalData = {
      ...additionalData,
      manualBlockCreatedAt: new Date().toISOString(),
      requestSource: "manual_block_api",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    console.log(`Creating manual block for user ${telegramIdNumber}:`, {
      blockReason,
      durationHours,
      verificationType,
      additionalDataKeys: Object.keys(enhancedAdditionalData),
    });

    // For PC detection, use the specialized method
    let blockResult;
    if (blockReason === "pc_detected" && additionalData?.detectionData) {
      blockResult = await serverBlockService.blockUserForPCDetection(
        userId,
        telegramIdNumber,
        additionalData.detectionData
      );
    } else {
      // Use regular blocking method
      blockResult = await serverBlockService.blockUser(
        userId,
        telegramIdNumber,
        blockReason,
        verificationType as any,
        enhancedAdditionalData
      );
    }

    if (blockResult.success) {
      const blockData = blockResult.data;
      
      console.log(`✅ Manual block created successfully:`, {
        blockId: blockData?.blockId,
        blockReason,
        durationHours: blockData?.durationHours,
        telegramId: telegramIdNumber,
      });

      return NextResponse.json({
        success: true,
        blocked: true,
        blockId: blockData?.blockId,
        blockReason: blockReason,
        blockDuration: durationHours ? `${durationHours} hours` : `${blockData?.durationHours} hours`,
      });
    } else {
      console.error("Failed to create manual block:", blockResult.error);
      return NextResponse.json(
        {
          success: false,
          error: blockResult.error || "Failed to create manual block",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error in manual block API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during manual blocking",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/nebula/manual-block
 * Get current block status for debugging
 */
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");
    
    if (!telegramId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const telegramIdNumber = parseInt(telegramId);
    const blockInfo = await serverBlockService.checkUserBlock(telegramIdNumber);
    
    return NextResponse.json({
      success: true,
      isBlocked: !!blockInfo?.isActive,
      blockInfo: blockInfo || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking manual block status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}