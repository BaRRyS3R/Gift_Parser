// src/app/api/purchases/create-invoice/route.ts - Fixed version

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { PRODUCTS, type ProductType } from "@/types/purchases";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;

    // Safely parse request body
    let requestBody;

    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);

      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { productType, initData } = requestBody;

    // Validate input
    if (!productType) {
      return NextResponse.json(
        { success: false, error: "Product type is required" },
        { status: 400 },
      );
    }

    // Validate product type
    if (!PRODUCTS[productType as ProductType]) {
      return NextResponse.json(
        { success: false, error: "Invalid product type" },
        { status: 400 },
      );
    }

    // Get user data
    const userData = await userService.findByTelegramId(user.telegramId);

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Prepare initData for PHP backend
    let finalInitData: string;

    if (initData) {
      // Use provided initData
      finalInitData = initData;
    } else {
      // Fallback: construct from user data
      try {
        const userObject = {
          id: userData.telegram_id,
          first_name: userData.first_name,
          last_name: userData.last_name || undefined,
          username: userData.username || undefined,
          is_premium: userData.is_premium,
        };

        const initDataParams = new URLSearchParams();

        initDataParams.append("user", JSON.stringify(userObject));
        initDataParams.append(
          "auth_date",
          Math.floor(Date.now() / 1000).toString(),
        );

        finalInitData = initDataParams.toString();
      } catch (error) {
        console.error("Error constructing initData:", error);

        return NextResponse.json(
          { success: false, error: "Failed to prepare authentication data" },
          { status: 500 },
        );
      }
    }

    // Get PHP backend URL
    const phpBackendUrl = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;

    if (!phpBackendUrl) {
      console.error("PHP_BACKEND_URL not configured");

      return NextResponse.json(
        { success: false, error: "Payment service not available" },
        { status: 503 },
      );
    }

    // Call PHP backend to create invoice
    try {
      const response = await fetch(`${phpBackendUrl}/create_invoice.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData: finalInitData,
          productType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error("PHP backend error:", response.status, errorText);

        return NextResponse.json(
          { success: false, error: "Failed to create invoice" },
          { status: 500 },
        );
      }

      const result = await response.json();

      if (!result.success) {
        console.error("PHP backend returned error:", result.error);

        return NextResponse.json(
          { success: false, error: result.error || "Failed to create invoice" },
          { status: 400 },
        );
      }

      // Return invoice data
      return NextResponse.json({
        success: true,
        invoice_url: result.invoice_url,
        product: result.product,
        payload: result.payload,
      });
    } catch (fetchError) {
      console.error("Error calling PHP backend:", fetchError);

      return NextResponse.json(
        { success: false, error: "Payment service unavailable" },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("Error creating invoice:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create invoice",
      },
      { status: 500 },
    );
  }
});
