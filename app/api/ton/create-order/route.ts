// src/app/api/ton/create-order/route.ts - Enhanced with detailed error logging

import { NextRequest, NextResponse } from "next/server";

import { validateTelegramData } from "@/lib/telegram-auth";
import { serverUserService } from "@/lib/supabase_server";
import {
  CreateTONOrderRequest,
  CreateTONOrderResponse,
  generateUniqueOrderId,
  createTONPayload,
  getTONProductInfo,
  TON_PRICES,
  TON_CONFIG,
  formatTONAmount,
} from "@/types/ton-payments";

/**
 * POST /api/ton/create-order
 * Создание нового TON заказа с генерацией уникального payload
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateTONOrderResponse>> {
  try {
    // Проверка наличия критически важных переменных окружения
    const botToken = process.env.TELEGRAM_BOT_API;

    if (!botToken) {
      console.error(
        "[TON_CREATE_ORDER] TELEGRAM_BOT_API environment variable is missing",
      );

      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error. Bot token not configured.",
        },
        { status: 500 },
      );
    }

    // Парсинг тела запроса
    let body: CreateTONOrderRequest;

    try {
      body = await request.json();
    } catch (parseError) {
      console.error(
        "[TON_CREATE_ORDER] Failed to parse request body:",
        parseError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body format",
        },
        { status: 400 },
      );
    }

    const { initData, productType } = body;

    // Валидация входных параметров
    if (!initData || !productType) {
      console.error("[TON_CREATE_ORDER] Missing required parameters:", {
        hasInitData: !!initData,
        hasProductType: !!productType,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Missing initData or productType parameter",
        },
        { status: 400 },
      );
    }

    // Валидация типа продукта
    const validProductTypes = [
      "attempts_1",
      "attempts_5",
      "attempts_10",
      "attempts_20",
      "attempts_50",
      "attempts_100",
    ];

    if (!validProductTypes.includes(productType)) {
      console.error("[TON_CREATE_ORDER] Invalid product type:", productType);

      return NextResponse.json(
        {
          success: false,
          error: `Invalid product type: ${productType}`,
        },
        { status: 400 },
      );
    }

    // Валидация Telegram данных
    let validation;

    try {
      // Декодируем initData если он закодирован
      const decodedInitData = decodeURIComponent(initData);

      validation = validateTelegramData(decodedInitData);

      if (!validation.isValid) {
        console.error(
          "[TON_CREATE_ORDER] Telegram validation failed:",
          validation.error,
        );
      }
    } catch (validationError) {
      console.error(
        "[TON_CREATE_ORDER] Exception during Telegram validation:",
        validationError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to validate Telegram authentication data",
        },
        { status: 400 },
      );
    }

    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Invalid Telegram data",
        },
        { status: 400 },
      );
    }

    const telegramUser = validation.user;

    // Проверяем существование пользователя в базе данных
    let user;

    try {
      user = await serverUserService.findByTelegramId(telegramUser.id);

      if (!user) {
        console.error(
          `[TON_CREATE_ORDER] User ${telegramUser.id} not found in database`,
        );
      }
    } catch (dbError) {
      console.error(
        "[TON_CREATE_ORDER] Database error while finding user:",
        dbError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Database error. Please try again later.",
        },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found. Please register in the main app first.",
        },
        { status: 404 },
      );
    }

    // Генерируем уникальный идентификатор заказа
    const uniqueOrderId = generateUniqueOrderId(user.telegram_id, productType);

    // Создаем payload для TON транзакции
    const payload = createTONPayload(uniqueOrderId);

    // Получаем информацию о товаре и цене
    const productInfo = getTONProductInfo(productType);
    const priceNanotons = TON_PRICES[productType];

    // Создаем заказ
    const orderExpiresAt = new Date(
      Date.now() + TON_CONFIG.ORDER_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // Формируем ответ с данными для TON транзакции
    const orderResponse = {
      id: uniqueOrderId,
      product: productInfo,
      payment: {
        amount: formatTONAmount(priceNanotons), // Отображение в TON
        amountNanotons: priceNanotons.toString(), // Для транзакции
        destinationWallet: TON_CONFIG.CORPORATE_WALLET,
        payload: payload,
      },
      expiresAt: orderExpiresAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      order: orderResponse,
    });
  } catch (error) {
    // Детальное логирование ошибок
    console.error("[TON_CREATE_ORDER] Unexpected error:", error);
    console.error(
      "[TON_CREATE_ORDER] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    // Формирование детального ответа об ошибке для отладки
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.constructor.name : typeof error,
      // В production окружении не раскрываем детали ошибок
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    };

    console.error("[TON_CREATE_ORDER] Error details:", errorDetails);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create TON order. Please check server logs for details.",
      },
      { status: 500 },
    );
  }
}
