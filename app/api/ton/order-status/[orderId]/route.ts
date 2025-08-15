// src/app/api/ton/order-status/[orderId]/route.ts - API для проверки статуса TON заказа

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";
import {
  TONOrderStatusResponse,
  getTONProductInfo,
  parseTONPayload,
} from "@/types/ton-payments";

/**
 * GET /api/ton/order-status/[orderId]
 * Проверка статуса TON заказа по уникальному идентификатору
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse<TONOrderStatusResponse>> {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing order ID parameter",
        },
        { status: 400 },
      );
    }

    // Парсим orderId для извлечения информации о заказе
    const parseResult = parseTONPayload(orderId);

    if (!parseResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order ID format",
        },
        { status: 400 },
      );
    }

    const { telegramId, productType, timestamp } = parseResult;

    if (!telegramId || !productType || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete order information",
        },
        { status: 400 },
      );
    }

    // Проверяем, не истек ли заказ (2 часа с момента создания)
    const orderExpiryTime = timestamp + 2 * 60 * 60 * 1000; // 2 часа в миллисекундах
    const currentTime = Date.now();

    if (currentTime > orderExpiryTime) {
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: "expired" as const,
          product: getTONProductInfo(productType),
        },
      });
    }

    // Ищем транзакцию в базе данных по unique_id
    const { data: transaction, error } = await supabaseServer
      .from("ton_transactions")
      .select("*")
      .eq("unique_id", orderId)
      .maybeSingle();

    if (error) {
      console.error(
        `[TON_ORDER_STATUS] Database error for order ${orderId}:`,
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to check order status",
        },
        { status: 500 },
      );
    }

    if (!transaction) {
      // Транзакция не найдена - заказ еще не оплачен
      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          status: "created" as const,
          product: getTONProductInfo(productType),
        },
      });
    }

    // Транзакция найдена - определяем статус
    let orderStatus: "pending" | "completed";

    switch (transaction.status) {
      case "processed":
        orderStatus = "completed";
        break;
      case "pending":
      case "failed":
      case "incorrect_payload":
      default:
        orderStatus = "pending";
        break;
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        status: orderStatus,
        product: getTONProductInfo(productType),
      },
      transaction: {
        hash: transaction.transaction_hash,
        status: transaction.status,
        processedAt: transaction.processed_at || undefined,
      },
    });
  } catch (error) {
    console.error("Error checking TON order status:", error);

    // Обработка специфических типов ошибок
    if (error instanceof Error) {
      if (error.message.includes("Invalid")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid order ID",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check order status",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/ton/order-status/[orderId]
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
