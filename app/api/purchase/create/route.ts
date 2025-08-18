// src/app/api/purchase/create/route.ts - Создание инвойса для покупки

import type { ProductType } from "@/types/purchases";

import { NextRequest, NextResponse } from "next/server";

import { validateTelegramData } from "@/lib/telegram-auth";

// Request body interface
interface CreatePurchaseRequest {
  initData: string;
  productType: ProductType;
}

// Response interface
interface CreatePurchaseResponse {
  success: boolean;
  invoice_url?: string;
  product?: {
    type: ProductType;
    title: string;
    description: string;
    price: number;
    attempts_bonus?: number;
    is_instant_reset?: boolean;
  };
  payload?: string;
  error?: string;
}

/**
 * POST /api/purchase/create
 * Creates invoice for purchase through PHP backend
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreatePurchaseResponse>> {
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

    // Parse request body
    const body: CreatePurchaseRequest = await request.json();
    const { initData, productType } = body;

    if (!initData || !productType) {
      return NextResponse.json(
        {
          success: false,
          error: "InitData and productType are required",
        },
        { status: 400 },
      );
    }

    // Validate initData (additional security check)
    const validation = validateTelegramData(initData);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Telegram data",
        },
        { status: 400 },
      );
    }

    // Get PHP backend URL from environment
    const phpBackendUrl = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;

    if (!phpBackendUrl) {
      console.error("PHP backend URL not configured");

      return NextResponse.json(
        {
          success: false,
          error: "Purchase service not available",
        },
        { status: 503 },
      );
    }

    // Forward request to PHP backend
    const phpResponse = await fetch(`${phpBackendUrl}/create_invoice.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        productType,
      }),
    });

    if (!phpResponse.ok) {
      const errorText = await phpResponse.text();

      console.error("PHP backend error:", phpResponse.status, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `Purchase service error: ${phpResponse.status}`,
        },
        { status: 502 },
      );
    }

    const phpResult: CreatePurchaseResponse = await phpResponse.json();

    if (!phpResult.success) {
      console.error("PHP backend returned error:", phpResult.error);

      return NextResponse.json(
        {
          success: false,
          error: phpResult.error || "Failed to create invoice",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      invoice_url: phpResult.invoice_url,
      product: phpResult.product,
      payload: phpResult.payload,
    });
  } catch (error) {
    console.error("Error creating purchase invoice:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        return NextResponse.json(
          {
            success: false,
            error: "Purchase service temporarily unavailable",
          },
          { status: 503 },
        );
      }

      if (error.message.includes("validation")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid purchase data",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create purchase invoice",
      },
      { status: 500 },
    );
  }
}
