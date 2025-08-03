// src/types/ton-payments.ts - Fixed BigInt serialization issues and updated separator

import { ProductType } from "@/types/purchases";

// ============================================================================
// ОСНОВНЫЕ ТИПЫ TON ПЛАТЕЖЕЙ
// ============================================================================

export interface TONTransaction {
    id: string;
    transaction_hash: string;
    sender_wallet: string;
    telegram_id: number;
    product_type: ProductType;
    unique_id: string;
    amount_nanotons: bigint;
    expected_amount_nanotons: bigint;
    payload: string;
    status: TONTransactionStatus;
    error_message?: string;
    transaction_timestamp: string;
    created_at: string;
    processed_at?: string;
}

export type TONTransactionStatus =
    | "pending"
    | "processed"
    | "failed"
    | "incorrect_payload";

// Статус TON заказа
export interface TONOrder {
    id: string;
    telegram_id: number;
    product_type: ProductType;
    amount_nanotons: bigint;
    unique_id: string;
    payload: string;
    status: "created" | "pending" | "completed" | "expired";
    created_at: string;
    expires_at: string;
}

// ============================================================================
// КОНСТАНТЫ ЦЕНООБРАЗОВАНИЯ (ТЕСТОВЫЕ ЦЕНЫ)
// ============================================================================

export const TON_PRICES: Record<ProductType, bigint> = {
    attempts_1: BigInt(50000000), // 0.05 TON
    attempts_5: BigInt(200000000), // 0.2 TON
    attempts_10: BigInt(450000000), // 0.45 TON
    attempts_100: BigInt(4500000000), // 4.5 TON
} as const;

// Конвертация nanotons в TON для отображения
export const NANOTONS_PER_TON = BigInt(1000000000);

// ============================================================================
// КОНФИГУРАЦИЯ TON СЕТИ
// ============================================================================

export const TON_CONFIG = {
    // Корпоративный кошелек для приема платежей
    CORPORATE_WALLET: "EQDylHxryL2sUApZzEsp9iOGJNpOBZU_88U3ewxZ560hRA8I",

    // GetBlock API конфигурация
    GETBLOCK_API_URL: "https://go.getblock.io/cc8c998b532f4fff9e678d879957ca6c",

    // Лимиты API
    GETBLOCK_RATE_LIMIT: 5, // RPS
    GETBLOCK_DAILY_LIMIT: 50_000, // Compute Units per day

    // Настройки мониторинга
    MONITORING_INTERVAL_MINUTES: 1, // Интервал CRON мониторинга
    TRANSACTION_LOOKBACK_HOURS: 24, // Период поиска транзакций назад
    ORDER_EXPIRY_HOURS: 2, // Время жизни заказа

    // UPDATED: Payload настройки с новым разделителем
    PAYLOAD_SEPARATOR: "|",
    MAX_PAYLOAD_LENGTH: 128,
} as const;

// ============================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С TON
// ============================================================================

/**
 * Генерация уникального идентификатора заказа - UPDATED с новым разделителем
 */
export function generateUniqueOrderId(
    telegramId: number,
    productType: ProductType,
): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    // UPDATED: Используем новый разделитель "|"
    return `${timestamp}${TON_CONFIG.PAYLOAD_SEPARATOR}${telegramId}${TON_CONFIG.PAYLOAD_SEPARATOR}${productType}${TON_CONFIG.PAYLOAD_SEPARATOR}${randomSuffix}`;
}

/**
 * Создание payload для TON транзакции
 */
export function createTONPayload(uniqueId: string): string {
    // Payload содержит только unique_id, все остальные данные извлекаются из него
    return uniqueId;
}

/**
 * Парсинг payload TON транзакции - ИСПРАВЛЕННАЯ ВЕРСИЯ с новым разделителем
 * Обрабатывает формат: timestamp|telegramId|productType|randomSuffix
 */
export function parseTONPayload(payload: string): {
    isValid: boolean;
    uniqueId?: string;
    timestamp?: number;
    telegramId?: number;
    productType?: ProductType;
    error?: string;
} {
    console.log(`[TON_MONITOR] 🔍 Starting payload parsing for: "${payload}"`);
    console.log(`[TON_MONITOR] - Payload length: ${payload.length}`);
    console.log(`[TON_MONITOR] - Max allowed length: ${TON_CONFIG.MAX_PAYLOAD_LENGTH}`);

    try {
        // Проверяем длину payload
        if (payload.length > TON_CONFIG.MAX_PAYLOAD_LENGTH) {
            console.log(`[TON_MONITOR] ❌ Payload too long: ${payload.length} > ${TON_CONFIG.MAX_PAYLOAD_LENGTH}`);
            return {
                isValid: false,
                error: "Payload too long",
            };
        }
        console.log(`[TON_MONITOR] ✅ Payload length check passed`);

        // UPDATED: Payload теперь имеет формат timestamp|telegramId|productType|randomSuffix (4 части)
        console.log(`[TON_MONITOR] - Using separator: "${TON_CONFIG.PAYLOAD_SEPARATOR}"`);
        const parts = payload.split(TON_CONFIG.PAYLOAD_SEPARATOR);
        console.log(`[TON_MONITOR] - Split result:`, parts);
        console.log(`[TON_MONITOR] - Parts count: ${parts.length} (expected: 4 for new format)`);

        // UPDATED: Поддерживаем только новый формат из 4 частей
        if (parts.length !== 4) {
            console.log(`[TON_MONITOR] ❌ Invalid parts count: ${parts.length} (expected: 4)`);
            return {
                isValid: false,
                error: "Invalid payload format - expected 4 parts",
            };
        }

        console.log(`[TON_MONITOR] ✅ Payload format check passed`);

        const [timestampStr, telegramIdStr, productType, randomSuffix] = parts;

        console.log(`[TON_MONITOR] - Extracted parts:`, {
            timestampStr,
            telegramIdStr,
            productType,
            randomSuffix
        });

        // Валидация timestamp
        console.log(`[TON_MONITOR] - Parsing timestamp: "${timestampStr}"`);
        const timestamp = parseInt(timestampStr);
        console.log(`[TON_MONITOR] - Parsed timestamp: ${timestamp}`);

        if (isNaN(timestamp) || timestamp <= 0) {
            console.log(`[TON_MONITOR] ❌ Invalid timestamp: ${timestamp}`);
            return {
                isValid: false,
                error: "Invalid timestamp",
            };
        }
        console.log(`[TON_MONITOR] ✅ Timestamp validation passed`);

        // Валидация telegram_id
        console.log(`[TON_MONITOR] - Parsing telegram_id: "${telegramIdStr}"`);
        const telegramId = parseInt(telegramIdStr);
        console.log(`[TON_MONITOR] - Parsed telegram_id: ${telegramId}`);

        if (isNaN(telegramId) || telegramId <= 0) {
            console.log(`[TON_MONITOR] ❌ Invalid telegram_id: ${telegramId}`);
            return {
                isValid: false,
                error: "Invalid telegram_id",
            };
        }
        console.log(`[TON_MONITOR] ✅ Telegram ID validation passed`);

        // Валидация product_type
        console.log(`[TON_MONITOR] - Validating product_type: "${productType}"`);
        const validProductTypes = ["attempts_1", "attempts_5", "attempts_10", "attempts_100"];
        console.log(`[TON_MONITOR] - Valid product types:`, validProductTypes);
        const isValidProductType = validProductTypes.includes(productType);
        console.log(`[TON_MONITOR] - Product type is valid: ${isValidProductType}`);

        if (!isValidProductType) {
            console.log(`[TON_MONITOR] ❌ Invalid product_type: "${productType}"`);
            return {
                isValid: false,
                error: "Invalid product_type",
            };
        }
        console.log(`[TON_MONITOR] ✅ Product type validation passed`);

        // Валидация randomSuffix
        console.log(`[TON_MONITOR] - Validating random suffix: "${randomSuffix}"`);
        console.log(`[TON_MONITOR] - Random suffix length: ${randomSuffix.length} (min: 3)`);

        if (randomSuffix.length < 3) {
            console.log(`[TON_MONITOR] ❌ Invalid random suffix length: ${randomSuffix.length} < 3`);
            return {
                isValid: false,
                error: "Invalid random suffix",
            };
        }
        console.log(`[TON_MONITOR] ✅ Random suffix validation passed`);

        console.log(`[TON_MONITOR] ✅ All payload validations passed successfully!`);

        const result = {
            isValid: true,
            uniqueId: payload,
            timestamp,
            telegramId,
            productType: productType as ProductType,
        };

        console.log(`[TON_MONITOR] - Final parse result:`, result);
        return result;

    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Exception during payload parsing:`, error);
        return {
            isValid: false,
            error: `Parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

/**
 * Конвертация nanotons в TON для отображения
 */
export function formatTONAmount(nanotons: bigint): string {
    const ton = Number(nanotons) / Number(NANOTONS_PER_TON);

    return ton.toFixed(2);
}

/**
 * Конвертация TON в nanotons
 */
export function tonToNanotons(ton: number): bigint {
    return BigInt(Math.round(ton * Number(NANOTONS_PER_TON)));
}

/**
 * Валидация TON адреса кошелька
 */
export function isValidTONAddress(address: string): boolean {
    // Базовая валидация TON адреса (UQ... или EQ... формат)
    const tonAddressRegex = /^[UE]Q[A-Za-z0-9_-]{46}$/;

    return tonAddressRegex.test(address);
}

/**
 * UPDATED: Получение информации о товаре по типу с сериализуемыми данными
 */
export function getTONProductInfo(productType: ProductType) {
    const baseProducts = {
        attempts_1: { attempts: 1, title: "+1 Attempt" },
        attempts_5: { attempts: 5, title: "+5 Attempts" },
        attempts_10: { attempts: 10, title: "+10 Attempts" },
        attempts_100: { attempts: 100, title: "+100 Attempts" },
    };

    const baseInfo = baseProducts[productType];
    const priceNanotons = TON_PRICES[productType];
    const priceTON = formatTONAmount(priceNanotons);

    return {
        ...baseInfo,
        productType,
        priceNanotons: priceNanotons.toString(), // Convert BigInt to string for JSON serialization
        priceTON,
        description: `Get ${baseInfo.attempts} additional game ${baseInfo.attempts === 1 ? "attempt" : "attempts"}`,
    };
}

// ============================================================================
// ИНТЕРФЕЙСЫ API ОТВЕТОВ
// ============================================================================

export interface CreateTONOrderRequest {
    initData: string;
    productType: ProductType;
}

export interface CreateTONOrderResponse {
    success: boolean;
    order?: {
        id: string;
        product: ReturnType<typeof getTONProductInfo>;
        payment: {
            amount: string; // В TON для отображения
            amountNanotons: string; // В nanotons для транзакции
            destinationWallet: string;
            payload: string;
        };
        expiresAt: string;
    };
    error?: string;
}

export interface TONOrderStatusResponse {
    success: boolean;
    order?: {
        id: string;
        status: TONOrder["status"];
        product: ReturnType<typeof getTONProductInfo>;
    };
    transaction?: {
        hash: string;
        status: TONTransactionStatus;
        processedAt?: string;
    };
    error?: string;
}

export interface TONProductsResponse {
    success: boolean;
    products?: Array<ReturnType<typeof getTONProductInfo>>;
    user?: {
        telegramId: number;
        firstName: string;
        attemptsRemaining: number;
    };
    error?: string;
}