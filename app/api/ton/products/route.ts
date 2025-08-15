// src/app/api/ton/products/route.ts - API для получения каталога TON товаров

import { NextRequest, NextResponse } from "next/server";

import { validateTelegramData } from "@/lib/telegram-auth";
import { serverUserService } from "@/lib/supabase_server";
import { getTONProductInfo, TONProductsResponse } from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";

/**
 * GET /api/ton/products
 * Получение каталога товаров для TON Shop с информацией о пользователе
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<TONProductsResponse>> {
  try {
    // Получаем initData из query параметров (поддерживаем оба варианта написания)
    const { searchParams } = new URL(request.url);
    const initData =
      searchParams.get("initData") || searchParams.get("initdata");

    if (!initData) {
      console.error("[TON_PRODUCTS] Missing initData parameter");

      return NextResponse.json(
        {
          success: false,
          error: "Missing initData parameter",
        },
        { status: 400 },
      );
    }

    // Валидация Telegram данных
    const validation = validateTelegramData(decodeURIComponent(initData));

    if (!validation.isValid || !validation.user) {
      console.error("[TON_PRODUCTS] Invalid Telegram data:", validation.error);

      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Invalid Telegram data",
        },
        { status: 400 },
      );
    }

    const telegramUser = validation.user;

    // Получаем информацию о пользователе из базы данных
    const user = await serverUserService.findByTelegramId(telegramUser.id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found. Please register first.",
        },
        { status: 404 },
      );
    }

    // Формируем каталог TON товаров
    const productTypes: ProductType[] = [
      "attempts_1",
      "attempts_5",
      "attempts_10",
      "attempts_100",
    ];
    const products = productTypes.map((productType) =>
      getTONProductInfo(productType),
    );

    return NextResponse.json({
      success: true,
      products,
      user: {
        telegramId: user.telegram_id,
        firstName: user.first_name,
        attemptsRemaining: user.attempts_remaining,
      },
    });
  } catch (error) {
    console.error("[TON_PRODUCTS] Error fetching TON products:", error);

    // Обработка специфических типов ошибок
    if (error instanceof Error) {
      // Проверяем на отсутствие TELEGRAM_BOT_API
      if (error.message.includes("TELEGRAM_BOT_API")) {
        console.error(
          "[TON_PRODUCTS] Missing TELEGRAM_BOT_API environment variable",
        );

        return NextResponse.json(
          {
            success: false,
            error: "Server configuration error. Please contact support.",
          },
          { status: 500 },
        );
      }

      if (error.message.includes("validation")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid authentication data",
          },
          { status: 400 },
        );
      }

      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch TON products catalog",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/ton/products
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
