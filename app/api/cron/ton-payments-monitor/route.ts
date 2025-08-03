// src/app/api/cron/ton-payments-monitor/route.ts - Финальная версия с GetBlock Access Token API

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
    GETBLOCK_ACCESS_TOKEN: process.env.GBAPI,
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
    debug_info?: {
        api_response_format?: string;
        transactions_fetched?: number;
        filtered_transactions?: number;
        api_url?: string;
    };
}

// Интерфейс транзакции GetBlock API (исправленный для фактической структуры)
interface GetBlockTransaction {
    "@type": string;
    address: {
        "@type": string;
        account_address: string;
    };
    utime: number;
    data: string;
    transaction_id: {
        "@type": string;
        lt: string;
        hash: string;
    };
    fee: string;
    storage_fee: string;
    other_fee: string;
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

// Интерфейс для HTTP API v4 ответа
interface HttpApiResponse {
    ok: boolean;
    result: GetBlockTransaction[];
    error?: string;
}

// Интерфейс для JSON-RPC ответа (на случай если API вернет в этом формате)
interface JsonRpcResponse {
    jsonrpc: string;
    id: string | number;
    result?: GetBlockTransaction[];
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

// Объединенный тип ответа
type GetBlockResponse = HttpApiResponse | JsonRpcResponse;

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

    console.log("[TON_MONITOR] ==========================================");
    console.log("[TON_MONITOR] Starting new monitoring session at", new Date().toISOString());
    console.log("[TON_MONITOR] Environment check:");
    console.log("[TON_MONITOR] - CRON_API_KEY exists:", !!CRON_CONFIG.CRON_API_KEY);
    console.log("[TON_MONITOR] - GETBLOCK_ACCESS_TOKEN exists:", !!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN);
    console.log("[TON_MONITOR] - TELEGRAM_BOT_TOKEN exists:", !!CRON_CONFIG.TELEGRAM_BOT_TOKEN);
    console.log("[TON_MONITOR] - Access token length:", CRON_CONFIG.GETBLOCK_ACCESS_TOKEN?.length || 0);

    try {
        // Проверка авторизации
        const authHeader = request.headers.get("Authorization");
        const apiKey = authHeader?.replace("Bearer ", "");

        console.log("[TON_MONITOR] Authorization check:");
        console.log("[TON_MONITOR] - Auth header exists:", !!authHeader);
        console.log("[TON_MONITOR] - Extracted API key length:", apiKey?.length || 0);
        console.log("[TON_MONITOR] - Expected API key length:", CRON_CONFIG.CRON_API_KEY?.length || 0);

        if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
            console.warn("[TON_MONITOR] AUTHORIZATION FAILED: Unauthorized attempt to access endpoint");
            console.warn("[TON_MONITOR] - Provided key matches:", apiKey === CRON_CONFIG.CRON_API_KEY);

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

        console.log("[TON_MONITOR] ✅ Authorization successful");
        console.log("[TON_MONITOR] Starting TON payments monitoring process");

        // Проверяем наличие необходимых конфигураций
        if (!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN) {
            console.error("[TON_MONITOR] ❌ CRITICAL: GetBlock access token not configured");
            throw new Error("GetBlock access token not configured");
        }

        if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
            console.error("[TON_MONITOR] ❌ CRITICAL: Telegram Bot Token not configured");
            throw new Error("Telegram Bot Token not configured");
        }

        if (!TON_CONFIG.CORPORATE_WALLET) {
            console.error("[TON_MONITOR] ❌ CRITICAL: Corporate wallet not configured");
            throw new Error("Corporate wallet not configured");
        }

        console.log("[TON_MONITOR] ✅ All configurations validated");
        console.log("[TON_MONITOR] Corporate wallet:", TON_CONFIG.CORPORATE_WALLET);

        // Получаем новые транзакции с GetBlock API
        console.log("[TON_MONITOR] 📡 Starting transaction fetch process...");
        const transactions = await fetchRecentTransactions();

        console.log("[TON_MONITOR] 📊 Transaction fetch results:");
        console.log("[TON_MONITOR] - Total transactions retrieved:", transactions.length);

        if (transactions.length === 0) {
            console.log("[TON_MONITOR] ℹ️  No new transactions found - completing successfully");

            return NextResponse.json({
                success: true,
                processed_transactions: 0,
                new_transactions: 0,
                credited_attempts: 0,
                notifications_sent: 0,
                failed_notifications: 0,
                incorrect_payloads: 0,
                execution_time_ms: Date.now() - startTime,
                debug_info: {
                    api_response_format: "success_no_transactions",
                    transactions_fetched: 0,
                    filtered_transactions: 0,
                }
            });
        }

        console.log("[TON_MONITOR] 🔄 Processing transactions...");
        console.log(`[TON_MONITOR] Found ${transactions.length} potential transactions to process`);

        // Обрабатываем транзакции
        const processResults = await processTransactions(transactions);

        console.log("[TON_MONITOR] 📈 Transaction processing results:");
        console.log("[TON_MONITOR] - Total processed:", processResults.length);
        console.log("[TON_MONITOR] - Successful:", processResults.filter(r => r.status === "processed").length);
        console.log("[TON_MONITOR] - Incorrect payloads:", processResults.filter(r => r.status === "incorrect_payload").length);

        // Отправляем уведомления об успешных зачислениях
        console.log("[TON_MONITOR] 📨 Starting notification process...");
        const notificationResults = await sendSuccessNotifications(processResults);

        console.log("[TON_MONITOR] 📧 Notification results:");
        console.log("[TON_MONITOR] - Notifications attempted:", notificationResults.length);
        console.log("[TON_MONITOR] - Successful notifications:", notificationResults.filter(r => r.success).length);
        console.log("[TON_MONITOR] - Failed notifications:", notificationResults.filter(r => !r.success).length);

        // Подсчитываем статистику
        const stats = calculateStats(processResults, notificationResults);
        const executionTime = Date.now() - startTime;

        console.log("[TON_MONITOR] 📋 Final statistics:");
        console.log("[TON_MONITOR] - Processed transactions:", stats.processed_transactions);
        console.log("[TON_MONITOR] - New transactions:", stats.new_transactions);
        console.log("[TON_MONITOR] - Credited attempts:", stats.credited_attempts);
        console.log("[TON_MONITOR] - Notifications sent:", stats.notifications_sent);
        console.log("[TON_MONITOR] - Failed notifications:", stats.failed_notifications);
        console.log("[TON_MONITOR] - Incorrect payloads:", stats.incorrect_payloads);
        console.log("[TON_MONITOR] - Execution time:", executionTime, "ms");
        console.log("[TON_MONITOR] ✅ Monitoring completed successfully");
        console.log("[TON_MONITOR] ==========================================");

        return NextResponse.json({
            success: true,
            processed_transactions: stats.processed_transactions,
            new_transactions: stats.new_transactions,
            credited_attempts: stats.credited_attempts,
            notifications_sent: stats.notifications_sent,
            failed_notifications: stats.failed_notifications,
            incorrect_payloads: stats.incorrect_payloads,
            execution_time_ms: executionTime,
            debug_info: {
                api_response_format: "http_api_v4",
                transactions_fetched: transactions.length,
                filtered_transactions: processResults.length,
            }
        });
    } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        console.error("[TON_MONITOR] ❌ CRITICAL ERROR in monitoring process:");
        console.error("[TON_MONITOR] - Error type:", typeof error);
        console.error("[TON_MONITOR] - Error message:", errorMessage);
        console.error("[TON_MONITOR] - Error stack:", error instanceof Error ? error.stack : "No stack trace");
        console.error("[TON_MONITOR] - Execution time before error:", executionTime, "ms");
        console.error("[TON_MONITOR] ==========================================");

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
 * Получение транзакций через GetBlock Access Token API
 */
async function fetchRecentTransactions(): Promise<GetBlockTransaction[]> {
    const lookbackTimestamp = Math.floor(
        (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
    );

    console.log("[TON_MONITOR] 🕐 Transaction time filter:");
    console.log("[TON_MONITOR] - Current timestamp:", Math.floor(Date.now() / 1000));
    console.log("[TON_MONITOR] - Lookback hours:", CRON_CONFIG.LOOKBACK_HOURS);
    console.log("[TON_MONITOR] - Minimum timestamp:", lookbackTimestamp);
    console.log("[TON_MONITOR] - Lookback date:", new Date(lookbackTimestamp * 1000).toISOString());

    try {
        console.log("[TON_MONITOR] 🔗 Building GetBlock API request...");

        // Используем новый формат с access token в URL
        const baseUrl = `https://go.getblock.io/${CRON_CONFIG.GETBLOCK_ACCESS_TOKEN}`;
        const apiUrl = new URL(`${baseUrl}/getTransactions`);

        apiUrl.searchParams.append('address', TON_CONFIG.CORPORATE_WALLET);
        apiUrl.searchParams.append('limit', CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN.toString());
        apiUrl.searchParams.append('archival', 'true');

        console.log("[TON_MONITOR] 📡 API Request details:");
        console.log("[TON_MONITOR] - Base URL:", baseUrl);
        console.log("[TON_MONITOR] - Full URL:", apiUrl.toString());
        console.log("[TON_MONITOR] - Target wallet:", TON_CONFIG.CORPORATE_WALLET);
        console.log("[TON_MONITOR] - Transaction limit:", CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN);
        console.log("[TON_MONITOR] - Archival mode:", true);

        console.log("[TON_MONITOR] 🚀 Sending request to GetBlock...");
        const requestStart = Date.now();

        const response = await fetch(apiUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const requestDuration = Date.now() - requestStart;
        console.log("[TON_MONITOR] ⏱️  Request completed in", requestDuration, "ms");

        console.log("[TON_MONITOR] 📥 Response details:");
        console.log("[TON_MONITOR] - Status:", response.status);
        console.log("[TON_MONITOR] - Status text:", response.statusText);
        console.log("[TON_MONITOR] - Headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            console.error("[TON_MONITOR] ❌ API request failed:");
            const errorText = await response.text();
            console.error("[TON_MONITOR] - Status:", response.status);
            console.error("[TON_MONITOR] - Status text:", response.statusText);
            console.error("[TON_MONITOR] - Error body:", errorText);

            throw new Error(`GetBlock API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log("[TON_MONITOR] ✅ API request successful, parsing response...");
        const rawData = await response.text();
        console.log("[TON_MONITOR] 📄 Raw response length:", rawData.length, "characters");
        console.log("[TON_MONITOR] 📄 Raw response preview:", rawData.substring(0, 500) + (rawData.length > 500 ? "..." : ""));

        let parsedData: GetBlockResponse;
        try {
            parsedData = JSON.parse(rawData);
            console.log("[TON_MONITOR] ✅ JSON parsing successful");
        } catch (parseError) {
            console.error("[TON_MONITOR] ❌ JSON parsing failed:");
            console.error("[TON_MONITOR] - Parse error:", parseError);
            console.error("[TON_MONITOR] - Raw data:", rawData);
            throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`);
        }

        console.log("[TON_MONITOR] 🔍 Analyzing response structure...");
        console.log("[TON_MONITOR] - Response type:", typeof parsedData);
        console.log("[TON_MONITOR] - Response keys:", Object.keys(parsedData));

        // Определяем формат ответа и извлекаем транзакции
        let transactions: GetBlockTransaction[] = [];

        if ('ok' in parsedData && 'result' in parsedData) {
            // HTTP API v4 формат
            console.log("[TON_MONITOR] 📋 Detected HTTP API v4 response format");
            console.log("[TON_MONITOR] - OK status:", parsedData.ok);
            console.log("[TON_MONITOR] - Has result:", !!parsedData.result);
            console.log("[TON_MONITOR] - Result type:", typeof parsedData.result);

            if (!parsedData.ok) {
                console.error("[TON_MONITOR] ❌ API returned error status:");
                console.error("[TON_MONITOR] - Error:", parsedData.error || "Unknown error");
                throw new Error(`GetBlock API error: ${parsedData.error || 'Unknown error'}`);
            }

            transactions = parsedData.result || [];
            console.log("[TON_MONITOR] ✅ Extracted transactions from HTTP API format");

        } else if ('jsonrpc' in parsedData && 'result' in parsedData) {
            // JSON-RPC формат
            console.log("[TON_MONITOR] 📋 Detected JSON-RPC response format");
            console.log("[TON_MONITOR] - JSON-RPC version:", parsedData.jsonrpc);
            console.log("[TON_MONITOR] - Request ID:", parsedData.id);
            console.log("[TON_MONITOR] - Has result:", !!parsedData.result);
            console.log("[TON_MONITOR] - Has error:", !!parsedData.error);

            if (parsedData.error) {
                console.error("[TON_MONITOR] ❌ JSON-RPC error:");
                console.error("[TON_MONITOR] - Code:", parsedData.error.code);
                console.error("[TON_MONITOR] - Message:", parsedData.error.message);
                console.error("[TON_MONITOR] - Data:", parsedData.error.data);
                throw new Error(`JSON-RPC error: ${parsedData.error.message} (code: ${parsedData.error.code})`);
            }

            transactions = parsedData.result || [];
            console.log("[TON_MONITOR] ✅ Extracted transactions from JSON-RPC format");

        } else {
            console.error("[TON_MONITOR] ❌ Unknown response format:");
            console.error("[TON_MONITOR] - Response structure:", JSON.stringify(parsedData, null, 2));
            throw new Error("Unexpected API response format");
        }

        console.log("[TON_MONITOR] 📊 Transaction extraction results:");
        console.log("[TON_MONITOR] - Total transactions received:", transactions.length);

        if (transactions.length > 0) {
            console.log("[TON_MONITOR] 📋 Sample transaction structure:");
            const sampleTx = transactions[0];
            console.log("[TON_MONITOR] - Transaction keys:", Object.keys(sampleTx));
            console.log("[TON_MONITOR] - Has transaction_id:", !!sampleTx.transaction_id);
            console.log("[TON_MONITOR] - Has hash:", !!sampleTx.transaction_id?.hash);
            console.log("[TON_MONITOR] - Has utime:", !!sampleTx.utime);
            console.log("[TON_MONITOR] - Has in_msg:", !!sampleTx.in_msg);
            console.log("[TON_MONITOR] - Sample timestamp:", sampleTx.utime);
            console.log("[TON_MONITOR] - Sample date:", new Date(sampleTx.utime * 1000).toISOString());
            console.log("[TON_MONITOR] - Sample hash:", sampleTx.transaction_id?.hash);
        }

        // Фильтруем транзакции по времени
        console.log("[TON_MONITOR] 🔍 Filtering transactions by time...");
        const recentTransactions = transactions.filter((tx) => {
            const isRecent = tx.utime >= lookbackTimestamp;
            if (!isRecent) {
                const txHash = tx.transaction_id?.hash || 'unknown';
                console.log(`[TON_MONITOR] - Filtered out old transaction: ${txHash} (${new Date(tx.utime * 1000).toISOString()})`);
            }
            return isRecent;
        });

        console.log("[TON_MONITOR] ✅ Time filtering completed:");
        console.log(`[TON_MONITOR] - Original count: ${transactions.length}`);
        console.log(`[TON_MONITOR] - Filtered count: ${recentTransactions.length}`);
        console.log(`[TON_MONITOR] - Time window: last ${CRON_CONFIG.LOOKBACK_HOURS} hours`);

        if (recentTransactions.length > 0) {
            console.log("[TON_MONITOR] 📋 Recent transactions summary:");
            recentTransactions.forEach((tx, index) => {
                const txHash = tx.transaction_id?.hash || 'unknown';
                console.log(`[TON_MONITOR] - #${index + 1}: ${txHash} at ${new Date(tx.utime * 1000).toISOString()}`);
            });
        }

        return recentTransactions;

    } catch (error) {
        console.error("[TON_MONITOR] ❌ CRITICAL ERROR in fetchRecentTransactions:");
        console.error("[TON_MONITOR] - Error type:", typeof error);
        console.error("[TON_MONITOR] - Error message:", error instanceof Error ? error.message : String(error));
        console.error("[TON_MONITOR] - Error stack:", error instanceof Error ? error.stack : "No stack trace");

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
    console.log("[TON_MONITOR] 🔄 Starting transaction processing...");
    console.log("[TON_MONITOR] - Input transactions:", transactions.length);

    const results: ProcessedTransaction[] = [];

    for (let index = 0; index < transactions.length; index++) {
        const transaction = transactions[index];
        console.log(`[TON_MONITOR] 📝 Processing transaction ${index + 1}/${transactions.length}...`);

        try {
            const txHash = transaction.transaction_id?.hash;

            if (!txHash) {
                console.warn(`[TON_MONITOR] ⚠️  Transaction ${index + 1} missing hash, skipping`);
                continue;
            }

            console.log(`[TON_MONITOR] - Transaction hash: ${txHash}`);
            console.log(`[TON_MONITOR] - Transaction timestamp: ${transaction.utime} (${new Date(transaction.utime * 1000).toISOString()})`);

            // Проверяем, не обработана ли уже эта транзакция
            console.log(`[TON_MONITOR] 🔍 Checking if transaction exists in database...`);
            const existingTransaction = await checkTransactionExists(txHash);

            if (existingTransaction) {
                console.log(`[TON_MONITOR] ⏭️  Transaction ${txHash} already processed, skipping`);
                continue;
            }

            console.log(`[TON_MONITOR] ✅ Transaction ${txHash} is new, processing...`);

            // Обрабатываем новую транзакция
            const result = await processTransaction(transaction);

            if (result) {
                console.log(`[TON_MONITOR] ✅ Transaction ${txHash} processed successfully:`, {
                    status: result.status,
                    attempts_credited: result.attempts_credited,
                    telegram_id: result.telegram_id,
                });
                results.push(result);
            } else {
                console.log(`[TON_MONITOR] ⏭️  Transaction ${txHash} skipped (not relevant)`);
            }

        } catch (error) {
            console.error(`[TON_MONITOR] ❌ Error processing transaction ${index + 1}:`, error);
            // Продолжаем обработку других транзакций
        }
    }

    console.log("[TON_MONITOR] ✅ Transaction processing completed:");
    console.log("[TON_MONITOR] - Total processed:", results.length);
    console.log("[TON_MONITOR] - Successful:", results.filter(r => r.status === "processed").length);
    console.log("[TON_MONITOR] - Incorrect:", results.filter(r => r.status === "incorrect_payload").length);

    return results;
}

/**
 * Проверка существования транзакции в базе данных
 */
async function checkTransactionExists(
    transactionHash: string,
): Promise<boolean> {
    console.log(`[TON_MONITOR] 🔍 Checking database for transaction: ${transactionHash}`);

    try {
        const { data, error } = await supabaseServer
            .from("ton_transactions")
            .select("id")
            .eq("transaction_hash", transactionHash)
            .maybeSingle();

        if (error) {
            console.error(`[TON_MONITOR] ❌ Database error checking transaction existence:`, error);
            return false;
        }

        const exists = !!data;
        console.log(`[TON_MONITOR] - Transaction exists in database: ${exists}`);

        return exists;
    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Exception checking transaction existence:`, error);
        return false;
    }
}

/**
 * Декодирование base64 payload и извлечение текста
 */
function decodePayload(base64Body: string): string {
    console.log(`[TON_MONITOR] 🔓 Decoding payload (length: ${base64Body.length})`);

    try {
        const buffer = Buffer.from(base64Body, 'base64');
        console.log(`[TON_MONITOR] - Buffer length: ${buffer.length} bytes`);

        if (buffer.length < 4) {
            console.log(`[TON_MONITOR] - Buffer too short, returning empty string`);
            return '';
        }

        const opcode = buffer.readUInt32BE(0);
        console.log(`[TON_MONITOR] - Opcode: ${opcode} (0x${opcode.toString(16)})`);

        if (opcode === 0) {
            const textBuffer = buffer.slice(4);
            const text = textBuffer.toString('utf-8').replace(/\0/g, '').trim();
            console.log(`[TON_MONITOR] - Decoded text: "${text}"`);
            return text;
        }

        console.log(`[TON_MONITOR] - Not a text comment (opcode != 0)`);
        return '';
    } catch (error) {
        console.warn("[TON_MONITOR] ⚠️  Failed to decode payload:", error);
        return '';
    }
}

/**
 * Обработка одной транзакции
 */
async function processTransaction(
    transaction: GetBlockTransaction,
): Promise<ProcessedTransaction | null> {
    const txHash = transaction.transaction_id?.hash;

    if (!txHash) {
        console.log(`[TON_MONITOR] - Transaction missing hash, skipping`);
        return null;
    }

    console.log(`[TON_MONITOR] 🔍 Analyzing transaction ${txHash}...`);

    const inMsg = transaction.in_msg;

    if (!inMsg) {
        console.log(`[TON_MONITOR] - No incoming message, skipping`);
        return null;
    }

    if (!inMsg.source || !inMsg.value) {
        console.log(`[TON_MONITOR] - Missing source or value in incoming message:`, {
            hasSource: !!inMsg.source,
            hasValue: !!inMsg.value,
        });
        return null;
    }

    console.log(`[TON_MONITOR] - Incoming message details:`, {
        source: inMsg.source,
        destination: inMsg.destination,
        value: inMsg.value,
        hasBody: !!inMsg.msg_data?.body,
        hasText: !!inMsg.msg_data?.text,
    });

    if (inMsg.destination !== TON_CONFIG.CORPORATE_WALLET) {
        console.log(`[TON_MONITOR] - Transaction not for our wallet (${inMsg.destination} != ${TON_CONFIG.CORPORATE_WALLET}), skipping`);
        return null;
    }

    const senderWallet = inMsg.source;
    const amountNanotons = BigInt(inMsg.value);

    console.log(`[TON_MONITOR] ✅ Transaction is for our wallet:`, {
        sender: senderWallet,
        amount_nanotons: amountNanotons.toString(),
        amount_ton: formatTONAmount(amountNanotons),
    });

    // Извлекаем payload из тела сообщения
    let payload = "";

    if (inMsg.msg_data) {
        if (inMsg.msg_data.text) {
            payload = inMsg.msg_data.text;
            console.log(`[TON_MONITOR] - Found direct text payload: "${payload}"`);
        } else if (inMsg.msg_data.body) {
            console.log(`[TON_MONITOR] - Attempting to decode body payload...`);
            payload = decodePayload(inMsg.msg_data.body);
            console.log(`[TON_MONITOR] - Decoded payload: "${payload}"`);
        }
    }

    console.log(`[TON_MONITOR] 📝 Final payload: "${payload || "(empty)"}"`);

    if (!payload) {
        console.log(`[TON_MONITOR] ⏭️  Transaction ${txHash} has no payload, skipping`);
        return null;
    }

    // Парсим payload для извлечения информации о заказе
    console.log(`[TON_MONITOR] 🔍 Parsing payload for order information...`);
    const parseResult = parseTONPayload(payload);

    console.log(`[TON_MONITOR] - Parse result:`, {
        isValid: parseResult.isValid,
        telegramId: parseResult.telegramId,
        productType: parseResult.productType,
        uniqueId: parseResult.uniqueId,
        error: parseResult.error,
    });

    if (!parseResult.isValid) {
        console.warn(`[TON_MONITOR] ⚠️  Incorrect payload in transaction ${txHash}: ${parseResult.error}`);

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
        console.warn(`[TON_MONITOR] ⚠️  Incomplete parsed data for transaction ${txHash}:`, {
            telegramId,
            productType,
            uniqueId,
        });

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

    // Валидируем сумму платежа
    const expectedAmount = TON_PRICES[productType];
    const minAcceptableAmount = expectedAmount - BigInt(10000000); // 0.01 TON tolerance

    console.log(`[TON_MONITOR] 💰 Payment validation:`, {
        received: formatTONAmount(amountNanotons),
        expected: formatTONAmount(expectedAmount),
        minimum: formatTONAmount(minAcceptableAmount),
        isValid: amountNanotons >= minAcceptableAmount,
    });

    if (amountNanotons < minAcceptableAmount) {
        console.warn(`[TON_MONITOR] ⚠️  Amount too low for transaction ${txHash}`);

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
    console.log(`[TON_MONITOR] 👤 Looking up user with telegram_id: ${telegramId}`);
    const user = await serverUserService.findByTelegramId(telegramId);

    if (!user) {
        console.warn(`[TON_MONITOR] ⚠️  User not found for transaction ${txHash}: telegram_id ${telegramId}`);

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

    console.log(`[TON_MONITOR] ✅ User found: ${user.first_name} (current attempts: ${user.attempts_remaining})`);

    // Сохраняем успешную транзакцию и зачисляем попытки
    const productInfo = getTONProductInfo(productType);
    const attemptsToCredit = productInfo.attempts;

    console.log(`[TON_MONITOR] 💎 Product info:`, {
        productType,
        attemptsToCredit,
        productInfo,
    });

    try {
        console.log(`[TON_MONITOR] 💾 Saving successful transaction to database...`);
        await saveSuccessfulTransaction(
            transaction,
            senderWallet,
            amountNanotons,
            payload,
            telegramId,
            productType,
            uniqueId,
        );

        console.log(`[TON_MONITOR] ⚡ Crediting ${attemptsToCredit} attempts to user ${telegramId}...`);
        await creditAttemptsToUser(telegramId, attemptsToCredit);

        console.log(`[TON_MONITOR] ✅ Successfully processed transaction ${txHash}:`, {
            telegramId,
            productType,
            attemptsCredited: attemptsToCredit,
            userFirstName: user.first_name,
        });

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
        console.error(`[TON_MONITOR] ❌ Error saving transaction ${txHash}:`, error);
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
    const txHash = transaction.transaction_id?.hash;

    if (!txHash) {
        console.error(`[TON_MONITOR] ❌ Cannot save transaction without hash`);
        return;
    }

    console.log(`[TON_MONITOR] 💾 Saving incorrect transaction ${txHash} to database...`);

    try {
        const { error } = await supabaseServer.from("ton_transactions").insert({
            transaction_hash: txHash,
            sender_wallet: senderWallet,
            telegram_id: 0,
            product_type: "attempts_1",
            unique_id: `incorrect_${txHash}`,
            amount_nanotons: amountNanotons.toString(),
            expected_amount_nanotons: "0",
            payload,
            status: "incorrect_payload",
            error_message: errorMessage,
            transaction_timestamp: new Date(transaction.utime * 1000).toISOString(),
        });

        if (error) {
            console.error(`[TON_MONITOR] ❌ Database error saving incorrect transaction ${txHash}:`, error);
            throw error;
        }

        console.log(`[TON_MONITOR] ✅ Incorrect transaction ${txHash} saved to database`);
    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Exception saving incorrect transaction ${txHash}:`, error);
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
    const txHash = transaction.transaction_id?.hash;

    if (!txHash) {
        console.error(`[TON_MONITOR] ❌ Cannot save transaction without hash`);
        return;
    }

    console.log(`[TON_MONITOR] 💾 Saving successful transaction ${txHash} to database...`);

    try {
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
            console.error(`[TON_MONITOR] ❌ Database error saving successful transaction ${txHash}:`, error);
            throw error;
        }

        console.log(`[TON_MONITOR] ✅ Successful transaction ${txHash} saved to database`);
    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Exception saving successful transaction ${txHash}:`, error);
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
    console.log(`[TON_MONITOR] ⚡ Crediting attempts to user ${telegramId}...`);

    try {
        const user = await serverUserService.findByTelegramId(telegramId);

        if (!user) {
            throw new Error(`User not found: ${telegramId}`);
        }

        const currentAttempts = user.attempts_remaining;
        const newAttemptsCount = currentAttempts + attempts;

        console.log(`[TON_MONITOR] - Current attempts: ${currentAttempts}`);
        console.log(`[TON_MONITOR] - Adding attempts: ${attempts}`);
        console.log(`[TON_MONITOR] - New total: ${newAttemptsCount}`);

        await serverUserService.updateUser(telegramId, {
            attempts_remaining: newAttemptsCount,
            updated_at: new Date().toISOString(),
        });

        console.log(`[TON_MONITOR] ✅ Successfully credited ${attempts} attempts to user ${telegramId}. New total: ${newAttemptsCount}`);
    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Error crediting attempts to user ${telegramId}:`, error);
        throw error;
    }
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

    console.log(`[TON_MONITOR] 📨 Preparing notifications...`);
    console.log(`[TON_MONITOR] - Total processed transactions: ${processResults.length}`);
    console.log(`[TON_MONITOR] - Successful transactions requiring notifications: ${successfulTransactions.length}`);

    if (successfulTransactions.length === 0) {
        console.log(`[TON_MONITOR] ℹ️  No notifications to send`);
        return [];
    }

    const notificationPromises = successfulTransactions.map(
        async (transaction, index) => {
            console.log(`[TON_MONITOR] 📧 Sending notification ${index + 1}/${successfulTransactions.length}...`);

            if (!transaction.telegram_id) {
                console.warn(`[TON_MONITOR] ⚠️  Transaction ${transaction.hash} missing telegram_id`);
                return { success: false, error: "No telegram_id" };
            }

            try {
                const user = await serverUserService.findByTelegramId(transaction.telegram_id);

                if (!user) {
                    console.warn(`[TON_MONITOR] ⚠️  User not found for notification: ${transaction.telegram_id}`);
                    return {
                        success: false,
                        telegram_id: transaction.telegram_id,
                        error: "User not found",
                    };
                }

                console.log(`[TON_MONITOR] - Sending to: ${user.first_name} (${transaction.telegram_id})`);
                console.log(`[TON_MONITOR] - Language: ${user.language_code || 'default'}`);
                console.log(`[TON_MONITOR] - Attempts credited: ${transaction.attempts_credited}`);

                const success = await sendTONSuccessNotification(
                    transaction.telegram_id,
                    user.first_name,
                    user.language_code || null,
                    transaction.attempts_credited,
                );

                if (success) {
                    console.log(`[TON_MONITOR] ✅ Notification sent successfully to ${transaction.telegram_id}`);
                } else {
                    console.error(`[TON_MONITOR] ❌ Notification failed for ${transaction.telegram_id}`);
                }

                return {
                    success,
                    telegram_id: transaction.telegram_id,
                    error: success ? undefined : "Notification failed",
                };
            } catch (error) {
                console.error(`[TON_MONITOR] ❌ Exception sending notification to ${transaction.telegram_id}:`, error);
                return {
                    success: false,
                    telegram_id: transaction.telegram_id,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        },
    );

    console.log(`[TON_MONITOR] ⏳ Waiting for all notifications to complete...`);
    const results = await Promise.all(notificationPromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[TON_MONITOR] 📊 Notification results: ${successful} successful, ${failed} failed`);

    return results;
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
    console.log(`[TON_MONITOR] 📤 Preparing Telegram notification for user ${telegramId}...`);

    const useRussian = languageCode?.toLowerCase().trim() === "ru";
    console.log(`[TON_MONITOR] - Using Russian language: ${useRussian}`);

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

    const telegramApiUrl = `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
    };

    console.log(`[TON_MONITOR] - Message: ${message.substring(0, 100)}...`);
    console.log(`[TON_MONITOR] - Button text: ${buttonText}`);

    try {
        console.log(`[TON_MONITOR] 🚀 Sending HTTP request to Telegram API...`);
        const response = await fetch(telegramApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        console.log(`[TON_MONITOR] 📥 Telegram API response:`, {
            status: response.status,
            ok: result.ok,
            error_code: result.error_code,
            description: result.description,
        });

        if (result.ok) {
            console.log(`[TON_MONITOR] ✅ Success notification sent to user ${telegramId}`);
            return true;
        } else {
            console.error(`[TON_MONITOR] ❌ Telegram API error for user ${telegramId}:`, result);
            return false;
        }
    } catch (error) {
        console.error(`[TON_MONITOR] ❌ Network error sending notification to user ${telegramId}:`, error);
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

    console.log("[TON_MONITOR] 🔍 GET request received for configuration info");
    console.log("[TON_MONITOR] - Auth provided:", !!authHeader);

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
        console.warn("[TON_MONITOR] ❌ Unauthorized GET request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configInfo = {
        config: {
            corporate_wallet: TON_CONFIG.CORPORATE_WALLET,
            lookback_hours: CRON_CONFIG.LOOKBACK_HOURS,
            max_transactions_per_run: CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN,
            execution_timeout: CRON_CONFIG.EXECUTION_TIMEOUT,
            has_getblock_token: !!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN,
            has_telegram_token: !!CRON_CONFIG.TELEGRAM_BOT_TOKEN,
        },
        status: "TON payments monitor is active",
        next_execution_url: `${request.nextUrl.origin}/api/cron/ton-payments-monitor`,
        timestamp: new Date().toISOString(),
    };

    console.log("[TON_MONITOR] ✅ Configuration info returned:", configInfo);
    return NextResponse.json(configInfo);
}