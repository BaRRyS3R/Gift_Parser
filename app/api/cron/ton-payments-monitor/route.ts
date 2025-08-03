// src/app/api/cron/ton-payments-monitor/route.ts - Финальная версия с правильным GetBlock REST API

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase_server";
import { serverUserService } from "@/lib/supabase_server";
import {
    TON_CONFIG,
    TON_PRICES,
    parseTONPayload,
    getTONProductInfo,
    formatTONAmount,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";

// ============================================================================
// КОНФИГУРАЦИЯ CRON ЗАДАЧИ
// ============================================================================

const CRON_CONFIG = {
    // API ключи и настройки
    CRON_API_KEY: process.env.CRON_API_KEY,
    GETBLOCK_API_KEY: process.env.GBAPI,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,

    // Лимиты выполнения
    MAX_TRANSACTIONS_PER_RUN: 100,
    EXECUTION_TIMEOUT: 50000, // 50 секунд

    // Настройки мониторинга
    LOOKBACK_HOURS: 24, // Период поиска транзакций назад

    // Telegram уведомления
    GAME_START_URL: "https://t.me/marketaggregator_bot?startapp",
} as const;

// ============================================================================
// ИНТЕРФЕЙСЫ
// ============================================================================

interface CronResponse {
    success: boolean;
    processed_transactions: number;
    new_transactions: number;
    credited_attempts: number;
    notifications_sent: number;
    failed_notifications: number;
    incorrect_payloads: number;
    execution_time_ms: number;
    error?: string;
}

// Интерфейс транзакции GetBlock REST API
interface GetBlockTransaction {
    "@type": string;
    account: string;
    hash: string;
    lt: string;
    data: string;
    utime: number;
    fee: string;
    storage_fee: string;
    other_fee: string;
    transaction_id: {
        "@type": string;
        lt: string;
        hash: string;
    };
    in_msg?: {
        "@type": string;
        source: string;
        destination: string;
        value: string;
        fwd_fee: string;
        ihr_fee: string;
        created_lt: string;
        body_hash: string;
        msg_data: {
            "@type": string;
            body?: string;
            text?: string;
            init_state?: string;
        };
        message: string;
    };
    out_msgs?: any[];
}

// Интерфейс ответа GetBlock API
interface GetBlockResponse {
    ok: boolean;
    result: GetBlockTransaction[];
    error?: string;
    code?: number;
}

interface ProcessedTransaction {
    hash: string;
    sender_wallet: string;
    amount_nanotons: bigint;
    payload: string;
    telegram_id?: number;
    product_type?: ProductType;
    unique_id?: string;
    status: "processed" | "incorrect_payload";
    error_message?: string;
    attempts_credited: number;
}

// ============================================================================
// ОСНОВНАЯ ФУНКЦИЯ CRON
// ============================================================================

/**
 * POST /api/cron/ton-payments-monitor
 * Мониторинг TON транзакций и автоматическое зачисление попыток
 */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<CronResponse>> {
    const startTime = Date.now();

    try {
        // Проверка авторизации
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
            console.warn(
                "[TON_MONITOR] Unauthorized attempt to access ton-payments-monitor endpoint",
            );

            return NextResponse.json(
                {
                    success: false,
                    processed_transactions: 0,
                    new_transactions: 0,
                    credited_attempts: 0,
                    notifications_sent: 0,
                    failed_notifications: 0,
                    incorrect_payloads: 0,
                    execution_time_ms: Date.now() - startTime,
                    error: "Unauthorized access",
                },
                { status: 401 },
            );
        }

        console.log("[TON_MONITOR] Starting TON payments monitoring process");

        // Проверяем наличие необходимых API ключей
        if (!CRON_CONFIG.GETBLOCK_API_KEY) {
            throw new Error("GetBlock API key not configured");
        }

        if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
            throw new Error("Telegram Bot Token not configured");
        }

        // Получаем новые транзакции с GetBlock API
        const transactions = await fetchRecentTransactions();

        if (transactions.length === 0) {
            console.log("[TON_MONITOR] No new transactions found");

            return NextResponse.json({
                success: true,
                processed_transactions: 0,
                new_transactions: 0,
                credited_attempts: 0,
                notifications_sent: 0,
                failed_notifications: 0,
                incorrect_payloads: 0,
                execution_time_ms: Date.now() - startTime,
            });
        }

        console.log(
            `[TON_MONITOR] Found ${transactions.length} potential transactions to process`,
        );

        // Обрабатываем транзакции
        const processResults = await processTransactions(transactions);

        // Отправляем уведомления об успешных зачислениях
        const notificationResults = await sendSuccessNotifications(processResults);

        // Подсчитываем статистику
        const stats = calculateStats(processResults, notificationResults);
        const executionTime = Date.now() - startTime;

        console.log(`[TON_MONITOR] Monitoring completed:`, {
            processedTransactions: stats.processed_transactions,
            newTransactions: stats.new_transactions,
            creditedAttempts: stats.credited_attempts,
            incorrectPayloads: stats.incorrect_payloads,
            executionTimeMs: executionTime,
        });

        return NextResponse.json({
            success: true,
            processed_transactions: stats.processed_transactions,
            new_transactions: stats.new_transactions,
            credited_attempts: stats.credited_attempts,
            notifications_sent: stats.notifications_sent,
            failed_notifications: stats.failed_notifications,
            incorrect_payloads: stats.incorrect_payloads,
            execution_time_ms: executionTime,
        });
    } catch (error) {
        console.error("[TON_MONITOR] Error in TON payments monitoring:", error);

        const executionTime = Date.now() - startTime;
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            {
                success: false,
                processed_transactions: 0,
                new_transactions: 0,
                credited_attempts: 0,
                notifications_sent: 0,
                failed_notifications: 0,
                incorrect_payloads: 0,
                execution_time_ms: executionTime,
                error: errorMessage,
            },
            { status: 500 },
        );
    }
}

// ============================================================================
// ФУНКЦИИ ПОЛУЧЕНИЯ ТРАНЗАКЦИЙ
// ============================================================================

/**
 * CORRECTED function to fetch transactions using proper GetBlock TON API format
 */
async function fetchRecentTransactions(): Promise<GetBlockTransaction[]> {
    const lookbackTimestamp = Math.floor(
        (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
    );

    try {
        console.log("[TON_MONITOR] Fetching transactions from GetBlock TON API");
        console.log("[TON_MONITOR] Corporate wallet:", TON_CONFIG.CORPORATE_WALLET);

        // CORRECTED: Use ton.getblock.io domain for TON-specific endpoints
        const getBlockUrl = new URL(`https://ton.getblock.io/mainnet/getTransactions`);
        getBlockUrl.searchParams.append('address', TON_CONFIG.CORPORATE_WALLET);
        getBlockUrl.searchParams.append('limit', '100');

        // Optional: Add archival parameter for better historical data access
        getBlockUrl.searchParams.append('archival', 'true');

        console.log("[TON_MONITOR] Request URL:", getBlockUrl.toString());

        const response = await fetch(getBlockUrl.toString(), {
            method: "GET",
            headers: {
                // CORRECTED: Use x-api-key header instead of URL-embedded token
                "x-api-key": CRON_CONFIG.GETBLOCK_API_KEY!,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[TON_MONITOR] GetBlock API error response:", {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(
                `GetBlock API error: ${response.status} ${response.statusText}`,
            );
        }

        const data: GetBlockResponse = await response.json();

        if (!data.ok) {
            console.error("[TON_MONITOR] GetBlock API returned error:", data);
            throw new Error(`GetBlock API error: ${data.error || 'Unknown error'}`);
        }

        const transactions = data.result || [];

        console.log(
            `[TON_MONITOR] GetBlock API returned ${transactions.length} transactions`,
        );

        // Filter transactions by time
        const recentTransactions = transactions.filter(
            (tx) => tx.utime >= lookbackTimestamp
        );

        console.log(
            `[TON_MONITOR] Filtered to ${recentTransactions.length} recent transactions (last ${CRON_CONFIG.LOOKBACK_HOURS} hours)`,
        );

        return recentTransactions;
    } catch (error) {
        console.error(
            "[TON_MONITOR] Error fetching transactions from GetBlock:",
            error,
        );
        throw new Error(
            `Failed to fetch transactions: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

// ============================================================================
// ФУНКЦИИ ОБРАБОТКИ ТРАНЗАКЦИЙ
// ============================================================================

/**
 * Обработка списка транзакций
 */
async function processTransactions(
    transactions: GetBlockTransaction[],
): Promise<ProcessedTransaction[]> {
    const results: ProcessedTransaction[] = [];

    for (const transaction of transactions) {
        try {
            const txHash = transaction.hash;

            if (!txHash) {
                console.warn("[TON_MONITOR] Transaction without hash, skipping");
                continue;
            }

            // Проверяем, не обработана ли уже эта транзакция
            const existingTransaction = await checkTransactionExists(txHash);

            if (existingTransaction) {
                console.log(
                    `[TON_MONITOR] Transaction ${txHash} already processed, skipping`,
                );
                continue;
            }

            // Обрабатываем новую транзакция
            const result = await processTransaction(transaction);

            if (result) {
                results.push(result);
            }
        } catch (error) {
            console.error(
                `[TON_MONITOR] Error processing transaction:`,
                error,
            );
        }
    }

    return results;
}

/**
 * Проверка существования транзакции в базе данных
 */
async function checkTransactionExists(
    transactionHash: string,
): Promise<boolean> {
    const { data, error } = await supabaseServer
        .from("ton_transactions")
        .select("id")
        .eq("transaction_hash", transactionHash)
        .maybeSingle();

    if (error) {
        console.error(`[TON_MONITOR] Error checking transaction existence:`, error);

        return false;
    }

    return !!data;
}

/**
 * Декодирование base64 payload и извлечение текста
 */
function decodePayload(base64Body: string): string {
    try {
        const buffer = Buffer.from(base64Body, 'base64');

        // Если буфер слишком короткий, возвращаем пустую строку
        if (buffer.length < 4) {
            return '';
        }

        // Читаем первые 4 байта как uint32 (big endian)
        const opcode = buffer.readUInt32BE(0);

        // Если opcode = 0, это текстовый комментарий
        if (opcode === 0) {
            // Извлекаем текст после опкода
            const textBuffer = buffer.slice(4);
            // Удаляем null-байты и декодируем
            const text = textBuffer.toString('utf-8').replace(/\0/g, '').trim();
            return text;
        }

        // Если это не текстовый комментарий, возвращаем пустую строку
        return '';
    } catch (error) {
        console.warn("[TON_MONITOR] Failed to decode payload:", error);
        return '';
    }
}

/**
 * Обработка одной транзакции с учётом формата GetBlock REST API
 */
async function processTransaction(
    transaction: GetBlockTransaction,
): Promise<ProcessedTransaction | null> {
    // Извлекаем данные входящего сообщения
    const inMsg = transaction.in_msg;

    if (!inMsg || !inMsg.source || !inMsg.value) {
        return null;
    }

    // Проверяем, что транзакция адресована нашему кошельку
    if (inMsg.destination !== TON_CONFIG.CORPORATE_WALLET) {
        return null;
    }

    const senderWallet = inMsg.source;
    const amountNanotons = BigInt(inMsg.value);
    const txHash = transaction.hash;

    // Извлекаем payload из тела сообщения
    let payload = "";

    if (inMsg.msg_data) {
        // Сначала пробуем получить текст напрямую
        if (inMsg.msg_data.text) {
            payload = inMsg.msg_data.text;
        }
        // Если текста нет, пробуем декодировать body
        else if (inMsg.msg_data.body) {
            payload = decodePayload(inMsg.msg_data.body);
        }
    }

    console.log(`[TON_MONITOR] Processing transaction ${txHash}:`, {
        sender: senderWallet,
        amount: formatTONAmount(amountNanotons),
        payload: payload || "(empty)",
        hasBody: !!inMsg.msg_data?.body,
        hasText: !!inMsg.msg_data?.text,
    });

    // Если payload пустой, пропускаем транзакцию
    if (!payload) {
        console.log(`[TON_MONITOR] Transaction ${txHash} has no payload, skipping`);
        return null;
    }

    // Парсим payload для извлечения информации о заказе
    const parseResult = parseTONPayload(payload);

    if (!parseResult.isValid) {
        // Некорректный payload - сохраняем для ручной обработки
        console.warn(
            `[TON_MONITOR] Incorrect payload in transaction ${txHash}: ${parseResult.error}`,
        );

        await saveIncorrectTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            parseResult.error || "Unknown parsing error",
        );

        return {
            hash: txHash,
            sender_wallet: senderWallet,
            amount_nanotons: amountNanotons,
            payload,
            status: "incorrect_payload",
            error_message: parseResult.error,
            attempts_credited: 0,
        };
    }

    const { telegramId, productType, uniqueId } = parseResult;

    if (!telegramId || !productType || !uniqueId) {
        console.warn(
            `[TON_MONITOR] Incomplete parsed data for transaction ${txHash}`,
        );

        await saveIncorrectTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            "Incomplete parsed data",
        );

        return {
            hash: txHash,
            sender_wallet: senderWallet,
            amount_nanotons: amountNanotons,
            payload,
            status: "incorrect_payload",
            error_message: "Incomplete parsed data",
            attempts_credited: 0,
        };
    }

    // Валидируем сумму платежа (с учётом комиссий)
    const expectedAmount = TON_PRICES[productType];
    const minAcceptableAmount = expectedAmount - BigInt(10000000); // Допускаем разницу в 0.01 TON для комиссий

    if (amountNanotons < minAcceptableAmount) {
        console.warn(
            `[TON_MONITOR] Amount too low for transaction ${txHash}:`,
            {
                received: formatTONAmount(amountNanotons),
                expected: formatTONAmount(expectedAmount),
                minimum: formatTONAmount(minAcceptableAmount),
            },
        );

        await saveIncorrectTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            `Amount too low: received ${formatTONAmount(amountNanotons)} TON, expected at least ${formatTONAmount(minAcceptableAmount)} TON`,
        );

        return {
            hash: txHash,
            sender_wallet: senderWallet,
            amount_nanotons: amountNanotons,
            payload,
            telegram_id: telegramId,
            product_type: productType,
            unique_id: uniqueId,
            status: "incorrect_payload",
            error_message: "Amount too low",
            attempts_credited: 0,
        };
    }

    // Проверяем существование пользователя
    const user = await serverUserService.findByTelegramId(telegramId);

    if (!user) {
        console.warn(
            `[TON_MONITOR] User not found for transaction ${txHash}: telegram_id ${telegramId}`,
        );

        await saveIncorrectTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            `User not found: telegram_id ${telegramId}`,
        );

        return {
            hash: txHash,
            sender_wallet: senderWallet,
            amount_nanotons: amountNanotons,
            payload,
            telegram_id: telegramId,
            product_type: productType,
            unique_id: uniqueId,
            status: "incorrect_payload",
            error_message: "User not found",
            attempts_credited: 0,
        };
    }

    // Сохраняем успешную транзакцию и зачисляем попытки
    const productInfo = getTONProductInfo(productType);
    const attemptsToCredit = productInfo.attempts;

    try {
        // Сохраняем транзакцию в базу данных
        await saveSuccessfulTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            telegramId,
            productType,
            uniqueId,
        );

        // Зачисляем попытки пользователю
        await creditAttemptsToUser(telegramId, attemptsToCredit);

        console.log(
            `[TON_MONITOR] Successfully processed transaction ${txHash}:`,
            {
                telegramId,
                productType,
                attemptsCredited: attemptsToCredit,
            },
        );

        return {
            hash: txHash,
            sender_wallet: senderWallet,
            amount_nanotons: amountNanotons,
            payload,
            telegram_id: telegramId,
            product_type: productType,
            unique_id: uniqueId,
            status: "processed",
            attempts_credited: attemptsToCredit,
        };
    } catch (error) {
        console.error(
            `[TON_MONITOR] Error saving transaction ${txHash}:`,
            error,
        );
        throw error;
    }
}

// ============================================================================
// ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ
// ============================================================================

/**
 * Сохранение некорректной транзакции
 */
async function saveIncorrectTransaction(
    transaction: GetBlockTransaction,
    senderWallet: string,
    amountNanotons: bigint,
    payload: string,
    errorMessage: string,
): Promise<void> {
    const txHash = transaction.hash;

    const { error } = await supabaseServer.from("ton_transactions").insert({
        transaction_hash: txHash,
        sender_wallet: senderWallet,
        telegram_id: 0, // Placeholder для некорректных транзакций
        product_type: "attempts_1", // Placeholder
        unique_id: `incorrect_${txHash}`,
        amount_nanotons: amountNanotons.toString(),
        expected_amount_nanotons: "0",
        payload,
        status: "incorrect_payload",
        error_message: errorMessage,
        transaction_timestamp: new Date(transaction.utime * 1000).toISOString(),
    });

    if (error) {
        console.error(
            `[TON_MONITOR] Error saving incorrect transaction ${txHash}:`,
            error,
        );
        throw error;
    }
}

/**
 * Сохранение успешной транзакции
 */
async function saveSuccessfulTransaction(
    transaction: GetBlockTransaction,
    senderWallet: string,
    amountNanotons: bigint,
    payload: string,
    telegramId: number,
    productType: ProductType,
    uniqueId: string,
): Promise<void> {
    const expectedAmount = TON_PRICES[productType];
    const txHash = transaction.hash;

    const { error } = await supabaseServer.from("ton_transactions").insert({
        transaction_hash: txHash,
        sender_wallet: senderWallet,
        telegram_id: telegramId,
        product_type: productType,
        unique_id: uniqueId,
        amount_nanotons: amountNanotons.toString(),
        expected_amount_nanotons: expectedAmount.toString(),
        payload,
        status: "processed",
        transaction_timestamp: new Date(transaction.utime * 1000).toISOString(),
        processed_at: new Date().toISOString(),
    });

    if (error) {
        console.error(
            `[TON_MONITOR] Error saving successful transaction ${txHash}:`,
            error,
        );
        throw error;
    }
}

/**
 * Зачисление попыток пользователю
 */
async function creditAttemptsToUser(
    telegramId: number,
    attempts: number,
): Promise<void> {
    const user = await serverUserService.findByTelegramId(telegramId);

    if (!user) {
        throw new Error(`User not found: ${telegramId}`);
    }

    const newAttemptsCount = user.attempts_remaining + attempts;

    await serverUserService.updateUser(telegramId, {
        attempts_remaining: newAttemptsCount,
        updated_at: new Date().toISOString(),
    });

    console.log(
        `[TON_MONITOR] Credited ${attempts} attempts to user ${telegramId}. New total: ${newAttemptsCount}`,
    );
}

// ============================================================================
// ФУНКЦИИ УВЕДОМЛЕНИЙ
// ============================================================================

/**
 * Отправка уведомлений об успешных зачислениях
 */
async function sendSuccessNotifications(
    processResults: ProcessedTransaction[],
): Promise<Array<{ success: boolean; telegram_id?: number; error?: string }>> {
    const successfulTransactions = processResults.filter(
        (result) => result.status === "processed" && result.telegram_id,
    );

    if (successfulTransactions.length === 0) {
        return [];
    }

    console.log(
        `[TON_MONITOR] Sending success notifications to ${successfulTransactions.length} users`,
    );

    const notificationPromises = successfulTransactions.map(
        async (transaction) => {
            if (!transaction.telegram_id)
                return { success: false, error: "No telegram_id" };

            try {
                const user = await serverUserService.findByTelegramId(
                    transaction.telegram_id,
                );

                if (!user) {
                    return {
                        success: false,
                        telegram_id: transaction.telegram_id,
                        error: "User not found",
                    };
                }

                const success = await sendTONSuccessNotification(
                    transaction.telegram_id,
                    user.first_name,
                    user.language_code || null,
                    transaction.attempts_credited,
                );

                return {
                    success,
                    telegram_id: transaction.telegram_id,
                    error: success ? undefined : "Notification failed",
                };
            } catch (error) {
                return {
                    success: false,
                    telegram_id: transaction.telegram_id,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        },
    );

    return Promise.all(notificationPromises);
}

/**
 * Отправка уведомления об успешном зачислении TON покупки
 */
async function sendTONSuccessNotification(
    telegramId: number,
    firstName: string,
    languageCode: string | null,
    attemptsCredited: number,
): Promise<boolean> {
    const useRussian = languageCode?.toLowerCase().trim() === "ru";

    const messages = {
        en: `🎮 <b>TON Payment Successful!</b>\n\nHey ${firstName}! Your TON payment has been processed.\n\n⚡ <b>+${attemptsCredited} attempts</b> have been added to your account!\n\nReady to play?`,
        ru: `🎮 <b>TON платеж успешен!</b>\n\nПривет, ${firstName}! Твой TON платеж обработан.\n\n⚡ <b>+${attemptsCredited} попыток</b> добавлено на твой аккаунт!\n\nГотов играть?`,
    };

    const buttonTexts = {
        en: "🎮 Play Now",
        ru: "🎮 Играть сейчас",
    };

    const message = useRussian ? messages.ru : messages.en;
    const buttonText = useRussian ? buttonTexts.ru : buttonTexts.en;

    const replyMarkup = {
        inline_keyboard: [
            [
                {
                    text: buttonText,
                    url: CRON_CONFIG.GAME_START_URL,
                },
            ],
        ],
    };

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chat_id: telegramId,
                    text: message,
                    parse_mode: "HTML",
                    reply_markup: replyMarkup,
                }),
            },
        );

        const result = await response.json();

        if (result.ok) {
            console.log(
                `[TON_MONITOR] Success notification sent to user ${telegramId}`,
            );

            return true;
        } else {
            console.error(
                `[TON_MONITOR] Failed to send notification to user ${telegramId}:`,
                result,
            );

            return false;
        }
    } catch (error) {
        console.error(
            `[TON_MONITOR] Network error sending notification to user ${telegramId}:`,
            error,
        );

        return false;
    }
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Подсчет статистики обработки
 */
function calculateStats(
    processResults: ProcessedTransaction[],
    notificationResults: Array<{
        success: boolean;
        telegram_id?: number;
        error?: string;
    }>,
) {
    const newTransactions = processResults.length;
    const processedTransactions = processResults.filter(
        (r) => r.status === "processed",
    ).length;
    const incorrectPayloads = processResults.filter(
        (r) => r.status === "incorrect_payload",
    ).length;
    const creditedAttempts = processResults.reduce(
        (sum, r) => sum + r.attempts_credited,
        0,
    );
    const notificationsSent = notificationResults.filter((r) => r.success).length;
    const failedNotifications = notificationResults.filter(
        (r) => !r.success,
    ).length;

    return {
        processed_transactions: processedTransactions,
        new_transactions: newTransactions,
        credited_attempts: creditedAttempts,
        notifications_sent: notificationsSent,
        failed_notifications: failedNotifications,
        incorrect_payloads: incorrectPayloads,
    };
}

/**
 * GET /api/cron/ton-payments-monitor
 * Информация о конфигурации CRON задачи (для отладки)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
        config: {
            corporate_wallet: TON_CONFIG.CORPORATE_WALLET,
            lookback_hours: CRON_CONFIG.LOOKBACK_HOURS,
            max_transactions_per_run: CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN,
            execution_timeout: CRON_CONFIG.EXECUTION_TIMEOUT,
        },
        status: "TON payments monitor is active",
        next_execution_url: `${request.nextUrl.origin}/api/cron/ton-payments-monitor`,
    });
}