import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { purchaseService } from "@/lib/purchaseService";

export const POST = withAuth(async (request) => {
  try {
    const { productType } = await request.json();
    const invoice = await purchaseService.createInvoice(productType);
    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invoice" },
      { status: 500 },
    );
  }
});
