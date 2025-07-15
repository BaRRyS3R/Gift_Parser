import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { purchaseService } from "@/lib/purchaseService";

export const POST = withAuth(async (request) => {
  try {
    await purchaseService.checkPurchaseStatus();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error checking purchase status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check purchase status" },
      { status: 500 },
    );
  }
});
