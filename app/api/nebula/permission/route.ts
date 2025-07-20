import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

interface PermissionRequest {
  attemptId: string;
  requiresAppRestart?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        { success: false, error: "User authentication required" },
        { status: 401 },
      );
    }

    const body: PermissionRequest = await request.json();
    const { attemptId, requiresAppRestart = false } = body;

    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: "Missing attempt ID" },
        { status: 400 },
      );
    }

    // Mark permission as granted
    await serverBlockService.markPermissionGranted(
      attemptId,
      requiresAppRestart,
    );

    console.log(
      `Permission granted for attempt ${attemptId}, restart required: ${requiresAppRestart}`,
    );

    return NextResponse.json({
      success: true,
      gracePeriodMinutes: 5,
      message: requiresAppRestart
        ? "Permission granted. Please restart the application to continue verification."
        : "Permission granted. You may continue with verification.",
    });
  } catch (error) {
    console.error("Error marking permission granted:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
