// src/app/api/ton/create-order/route.ts - API для создания TON заказов

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
    formatTONAmount
} from "@/types/ton-payments";

/**
 * POST /api/ton/create-order
 * Создание нового TON заказа с генерацией уникального payload
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<CreateTONOrderResponse>> {
    try {
        // Парсинг тела запроса
        const body: CreateTONOrderRequest = await request.json();
        const { initData, productType } = body;

        if (!initData || !productType) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing initData or productType parameter",
                },
                { status: 400 }
            );
        }

        // Валидация типа продукта
        if (!['attempts_1', 'attempts_5', 'attempts_10', 'attempts_100'].includes(productType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid product type",
                },
                { status: 400 }
            );
        }

        // Валидация Telegram данных
        const validation = validateTelegramData(initData);

        if (!validation.isValid || !validation.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error || "Invalid Telegram data",
                },
                { status: 400 }
            );
        }

        const telegramUser = validation.user;

        // Проверяем существование пользователя в базе данных
        const user = await serverUserService.findByTelegramId(telegramUser.id);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User not found. Please register first.",
                },
                { status: 404 }
            );
        }

        // Генерируем уникальный идентификатор заказа
        const uniqueOrderId = generateUniqueOrderId(user.telegram_id, productType);

        // Создаем payload для TON транзакции
        const payload = createTONPayload(uniqueOrderId);

        // Получаем информацию о товаре и цене
        const productInfo = getTONProductInfo(productType);
        const priceNanotons = TON_PRICES[productType];

        // Создаем заказ (в будущем можно сохранить в отдельную таблицу orders)
        const orderExpiresAt = new Date(Date.now() + TON_CONFIG.ORDER_EXPIRY_HOURS * 60 * 60 * 1000);

        console.log(`[TON_ORDER] Creating order for user ${user.telegram_id} (${user.first_name}):`, {
            productType,
            uniqueOrderId,
            priceNanotons: priceNanotons.toString(),
            payload,
            expiresAt: orderExpiresAt.toISOString(),
        });

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

        console.log(`[TON_ORDER] Order created successfully:`, {
            orderId: uniqueOrderId,
            telegramId: user.telegram_id,
            productType,
            amount: formatTONAmount(priceNanotons),
        });

        return NextResponse.json({
            success: true,
            order: orderResponse,
        });

    } catch (error) {
        console.error("Error creating TON order:", error);

        // Обработка специфических типов ошибок
        if (error instanceof Error) {
            if (error.message.includes("validation")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid authentication data",
                    },
                    { status: 400 }
                );
            }

            if (error.message.includes("not found")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "User not found",
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes("JSON")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid request body",
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to create TON order",
            },
            { status: 500 }
        );
    }
}

/**
 * OPTIONS /api/ton/create-order
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}