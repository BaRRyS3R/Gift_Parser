// src/app/api/purchases/process/route.ts - Production purchase processing

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { PRODUCTS, type ProductType } from "@/types/purchases";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;
    const { productType, paymentResult } = await request.json();

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

    // If payment was cancelled or failed, return early
    if (!paymentResult) {
      return NextResponse.json(
        { success: false, error: "Payment was cancelled or failed" },
        { status: 400 },
      );
    }

    // Get user data to check if attempts were updated by PHP backend
    const userData = await userService.findByTelegramId(user.telegramId);

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const product = PRODUCTS[productType as ProductType];

    // Note: Actual purchase processing and attempt crediting happens on PHP backend
    // via webhook_handler.php when Telegram sends successful_payment notification.
    // This endpoint is primarily for UI feedback and cache invalidation.

    // Wait a moment for webhook processing to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Refresh user data to get updated attempts
    const updatedUserData = await userService.findByTelegramId(user.telegramId);

    if (!updatedUserData) {
      return NextResponse.json(
        { success: false, error: "Failed to refresh user data" },
        { status: 500 },
      );
    }

    // Log successful purchase processing
    console.log(
      `Purchase processed for user ${user.telegramId}: ${productType}, attempts: ${updatedUserData.attempts_remaining}`,
    );

    return NextResponse.json({
      success: true,
      product: {
        type: productType,
        title: product.title,
        attempts_bonus: product.attempts_bonus,
        is_instant_reset: product.is_instant_reset,
      },
      message: product.is_instant_reset
        ? "Attempts restored and cooldown reset!"
        : `Added ${product.attempts_bonus} attempt${(product.attempts_bonus || 0) > 1 ? "s" : ""}!`,
      updatedAttempts: updatedUserData.attempts_remaining,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process purchase",
      },
      { status: 500 },
    );
  }
});
