// src/app/api/purchase/status/route.ts - Проверка статуса покупок пользователя

import { NextRequest, NextResponse } from "next/server";

import { serverUserService } from "@/lib/supabase_server";

// Response interface
interface PurchaseStatusResponse {
  success: boolean;
  data?: {
    user_id: string;
    attempts_remaining: number;
    last_updated: string;
    status: "synced";
  };
  error?: string;
}

/**
 * GET /api/purchase/status
 * Checks purchase status and synchronizes user attempts with backend
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<PurchaseStatusResponse>> {
  try {
    // Extract user info from middleware headers
    const userId = request.headers.get("X-User-ID");
    const telegramId = request.headers.get("X-Telegram-ID");

    if (!userId || !telegramId) {
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
          error: "Invalid telegram ID",
        },
        { status: 400 },
      );
    }

    // Get current user data to check for updates
    const user = await serverUserService.findByTelegramId(telegramIdNumber);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // For purchase status check, we primarily ensure the user data is current
    // The PHP backend handles the actual purchase processing and attempt updates
    // This endpoint serves as a way to refresh user state after potential purchases

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        attempts_remaining: user.attempts_remaining,
        last_updated: user.updated_at,
        status: "synced",
      },
    });
  } catch (error) {
    console.error("Error checking purchase status:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("database")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database synchronization error",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check purchase status",
      },
      { status: 500 },
    );
  }
}
