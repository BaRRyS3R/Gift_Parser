// src/app/api/cron/ton-payments-monitor/route.ts - Updated with Toncenter fallback

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
  TONCENTER_API_KEY: process.env.TONCENTER_API_KEY, // NEW: Toncenter API key
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,

  // Лимиты выполнения
  MAX_TRANSACTIONS_PER_RUN: 100,
  EXECUTION_TIMEOUT: 50000, // 50 секунд

  // Настройки мониторинга
  LOOKBACK_HOURS: 1, // CHANGED: Уменьшено с 24 до 1 часа

  // Telegram уведомления
  GAME_START_URL: "https://t.me/circusle_bot?startapp",
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
    api_provider?: "getblock" | "toncenter"; // NEW: Track which API was used
  };
}

// GetBlock интерфейсы (оставляем как есть)
interface GetBlockTransaction {
  "@type": string;
  account?: string;
  transaction_id: {
    "@type": string;
    hash: string;
    lt: string;
  };
  data: string;
  utime: number;
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

// NEW: Toncenter API интерфейсы
interface ToncenterTransaction {
  "@type": string;
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
    source?: string;
    destination?: string;
    value?: string;
    fwd_fee?: string;
    ihr_fee?: string;
    created_lt?: string;
    body_hash?: string;
    msg_data?:
      | {
          "@type": string;
          body?: string;
          text?: string;
          init_state?: string;
        }
      | string;
    message?: string;
  };
  out_msgs?: any[];
}

interface ToncenterResponse {
  ok: boolean;
  result?: ToncenterTransaction[];
  error?: string;
  code?: number;
}

// GetBlock response types
interface HttpApiResponse {
  ok: boolean;
  result: GetBlockTransaction[];
  error?: string;
}

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

type GetBlockResponse = HttpApiResponse | JsonRpcResponse;

// Unified transaction interface
type UnifiedTransaction = GetBlockTransaction | ToncenterTransaction;

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
// УТИЛИТЫ
// ============================================================================

/**
 * Helper функция для получения хеша транзакции (работает с обоими форматами)
 */
function getTransactionHash(transaction: UnifiedTransaction): string | null {
  return transaction.transaction_id?.hash || null;
}

/**
 * Конвертация Toncenter транзакции в формат GetBlock для единообразной обработки
 */
function convertToncenterToGetBlock(
  tx: ToncenterTransaction,
): GetBlockTransaction {
  // Обработка msg_data - может быть строкой или объектом
  let msgData: any = {
    "@type": "msg.dataRaw",
  };

  if (tx.in_msg?.msg_data) {
    if (typeof tx.in_msg.msg_data === "string") {
      msgData.body = tx.in_msg.msg_data;
    } else {
      msgData = tx.in_msg.msg_data;
    }
  }

  return {
    "@type": tx["@type"],
    account: tx.in_msg?.destination,
    transaction_id: tx.transaction_id,
    data: tx.data,
    utime: tx.utime,
    fee: tx.fee,
    storage_fee: tx.storage_fee,
    other_fee: tx.other_fee,
    in_msg: tx.in_msg
      ? {
          "@type": tx.in_msg["@type"] || "raw.internalMessage",
          source: tx.in_msg.source || "",
          destination: tx.in_msg.destination || "",
          value: tx.in_msg.value || "0",
          fwd_fee: tx.in_msg.fwd_fee || "0",
          ihr_fee: tx.in_msg.ihr_fee || "0",
          created_lt: tx.in_msg.created_lt || "0",
          body_hash: tx.in_msg.body_hash || "",
          msg_data: msgData,
          message: tx.in_msg.message || "",
        }
      : undefined,
    out_msgs: tx.out_msgs,
  };
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
  console.log(
    "[TON_MONITOR] Starting new monitoring session at",
    new Date().toISOString(),
  );
  console.log("[TON_MONITOR] Environment check:");
  console.log(
    "[TON_MONITOR] - CRON_API_KEY exists:",
    !!CRON_CONFIG.CRON_API_KEY,
  );
  console.log(
    "[TON_MONITOR] - GETBLOCK_ACCESS_TOKEN exists:",
    !!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN,
  );
  console.log(
    "[TON_MONITOR] - TONCENTER_API_KEY exists:",
    !!CRON_CONFIG.TONCENTER_API_KEY,
  );
  console.log(
    "[TON_MONITOR] - TELEGRAM_BOT_TOKEN exists:",
    !!CRON_CONFIG.TELEGRAM_BOT_TOKEN,
  );
  console.log("[TON_MONITOR] - Lookback hours:", CRON_CONFIG.LOOKBACK_HOURS);
  console.log(
    "[TON_MONITOR] - Payload separator:",
    TON_CONFIG.PAYLOAD_SEPARATOR,
  );

  try {
    // Проверка авторизации
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    console.log("[TON_MONITOR] Authorization check:");
    console.log("[TON_MONITOR] - Auth header exists:", !!authHeader);
    console.log(
      "[TON_MONITOR] - Extracted API key length:",
      apiKey?.length || 0,
    );
    console.log(
      "[TON_MONITOR] - Expected API key length:",
      CRON_CONFIG.CRON_API_KEY?.length || 0,
    );

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn(
        "[TON_MONITOR] AUTHORIZATION FAILED: Unauthorized attempt to access endpoint",
      );
      console.warn(
        "[TON_MONITOR] - Provided key matches:",
        apiKey === CRON_CONFIG.CRON_API_KEY,
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

    console.log("[TON_MONITOR] ✅ Authorization successful");
    console.log("[TON_MONITOR] Starting TON payments monitoring process");

    // Проверяем наличие необходимых конфигураций
    if (!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN && !CRON_CONFIG.TONCENTER_API_KEY) {
      console.error(
        "[TON_MONITOR] ❌ CRITICAL: Neither GetBlock nor Toncenter API keys configured",
      );
      throw new Error("No API keys configured for blockchain access");
    }

    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      console.error(
        "[TON_MONITOR] ❌ CRITICAL: Telegram Bot Token not configured",
      );
      throw new Error("Telegram Bot Token not configured");
    }

    if (!TON_CONFIG.CORPORATE_WALLET) {
      console.error(
        "[TON_MONITOR] ❌ CRITICAL: Corporate wallet not configured",
      );
      throw new Error("Corporate wallet not configured");
    }

    console.log("[TON_MONITOR] ✅ All configurations validated");
    console.log("[TON_MONITOR] Corporate wallet:", TON_CONFIG.CORPORATE_WALLET);

    // Получаем новые транзакции с fallback логикой
    console.log("[TON_MONITOR] 📡 Starting transaction fetch process...");
    const { transactions, provider } =
      await fetchRecentTransactionsWithFallback();

    console.log("[TON_MONITOR] 📊 Transaction fetch results:");
    console.log("[TON_MONITOR] - API provider used:", provider);
    console.log(
      "[TON_MONITOR] - Total transactions retrieved:",
      transactions.length,
    );

    if (transactions.length === 0) {
      console.log(
        "[TON_MONITOR] ℹ️  No new transactions found - completing successfully",
      );

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
          api_provider: provider,
        },
      });
    }

    console.log("[TON_MONITOR] 🔄 Processing transactions...");
    console.log(
      `[TON_MONITOR] Found ${transactions.length} potential transactions to process`,
    );

    // Обрабатываем транзакции
    const processResults = await processTransactions(transactions);

    console.log("[TON_MONITOR] 📈 Transaction processing results:");
    console.log("[TON_MONITOR] - Total processed:", processResults.length);
    console.log(
      "[TON_MONITOR] - Successful:",
      processResults.filter((r) => r.status === "processed").length,
    );
    console.log(
      "[TON_MONITOR] - Incorrect payloads:",
      processResults.filter((r) => r.status === "incorrect_payload").length,
    );

    // Отправляем уведомления об успешных зачислениях
    console.log("[TON_MONITOR] 📨 Starting notification process...");
    const notificationResults = await sendSuccessNotifications(processResults);

    console.log("[TON_MONITOR] 📧 Notification results:");
    console.log(
      "[TON_MONITOR] - Notifications attempted:",
      notificationResults.length,
    );
    console.log(
      "[TON_MONITOR] - Successful notifications:",
      notificationResults.filter((r) => r.success).length,
    );
    console.log(
      "[TON_MONITOR] - Failed notifications:",
      notificationResults.filter((r) => !r.success).length,
    );

    // Подсчитываем статистику
    const stats = calculateStats(processResults, notificationResults);
    const executionTime = Date.now() - startTime;

    console.log("[TON_MONITOR] 📋 Final statistics:");
    console.log("[TON_MONITOR] - API provider:", provider);
    console.log(
      "[TON_MONITOR] - Processed transactions:",
      stats.processed_transactions,
    );
    console.log("[TON_MONITOR] - New transactions:", stats.new_transactions);
    console.log("[TON_MONITOR] - Credited attempts:", stats.credited_attempts);
    console.log(
      "[TON_MONITOR] - Notifications sent:",
      stats.notifications_sent,
    );
    console.log(
      "[TON_MONITOR] - Failed notifications:",
      stats.failed_notifications,
    );
    console.log(
      "[TON_MONITOR] - Incorrect payloads:",
      stats.incorrect_payloads,
    );
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
        api_provider: provider,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[TON_MONITOR] ❌ CRITICAL ERROR in monitoring process:");
    console.error("[TON_MONITOR] - Error type:", typeof error);
    console.error("[TON_MONITOR] - Error message:", errorMessage);
    console.error(
      "[TON_MONITOR] - Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(
      "[TON_MONITOR] - Execution time before error:",
      executionTime,
      "ms",
    );
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
// ФУНКЦИИ ПОЛУЧЕНИЯ ТРАНЗАКЦИЙ С FALLBACK
// ============================================================================

/**
 * NEW: Главная функция получения транзакций с fallback логикой
 */
async function fetchRecentTransactionsWithFallback(): Promise<{
  transactions: GetBlockTransaction[];
  provider: "getblock" | "toncenter";
}> {
  // Сначала пытаемся GetBlock если есть токен
  if (CRON_CONFIG.GETBLOCK_ACCESS_TOKEN) {
    try {
      console.log("[TON_MONITOR] 🔗 Attempting to fetch from GetBlock...");
      const transactions = await fetchFromGetBlock();

      console.log("[TON_MONITOR] ✅ Successfully fetched from GetBlock");

      return { transactions, provider: "getblock" };
    } catch (error) {
      console.warn(
        "[TON_MONITOR] ⚠️  GetBlock failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      console.log("[TON_MONITOR] 🔄 Switching to Toncenter API...");
    }
  }

  // Fallback на Toncenter
  if (CRON_CONFIG.TONCENTER_API_KEY) {
    try {
      console.log("[TON_MONITOR] 🔗 Attempting to fetch from Toncenter...");
      const transactions = await fetchFromToncenter();

      console.log("[TON_MONITOR] ✅ Successfully fetched from Toncenter");

      return { transactions, provider: "toncenter" };
    } catch (error) {
      console.error(
        "[TON_MONITOR] ❌ Toncenter also failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      throw new Error(
        `Both APIs failed. GetBlock: ${CRON_CONFIG.GETBLOCK_ACCESS_TOKEN ? "failed" : "no key"}. ` +
          `Toncenter: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  throw new Error("No API keys available for fetching transactions");
}

/**
 * Получение транзакций через GetBlock API (рефакторинг оригинальной функции)
 */
async function fetchFromGetBlock(): Promise<GetBlockTransaction[]> {
  const lookbackTimestamp = Math.floor(
    (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
  );

  console.log("[TON_MONITOR] [GetBlock] 🕐 Transaction time filter:");
  console.log(
    "[TON_MONITOR] [GetBlock] - Current timestamp:",
    Math.floor(Date.now() / 1000),
  );
  console.log(
    "[TON_MONITOR] [GetBlock] - Lookback hours:",
    CRON_CONFIG.LOOKBACK_HOURS,
  );
  console.log(
    "[TON_MONITOR] [GetBlock] - Minimum timestamp:",
    lookbackTimestamp,
  );
  console.log(
    "[TON_MONITOR] [GetBlock] - Lookback date:",
    new Date(lookbackTimestamp * 1000).toISOString(),
  );

  const baseUrl = `https://go.getblock.io/${CRON_CONFIG.GETBLOCK_ACCESS_TOKEN}`;
  const apiUrl = new URL(`${baseUrl}/getTransactions`);

  apiUrl.searchParams.append("address", TON_CONFIG.CORPORATE_WALLET);
  apiUrl.searchParams.append(
    "limit",
    CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN.toString(),
  );
  apiUrl.searchParams.append("archival", "true");

  console.log("[TON_MONITOR] [GetBlock] 📡 API Request details:");
  console.log("[TON_MONITOR] [GetBlock] - Full URL:", apiUrl.toString());
  console.log(
    "[TON_MONITOR] [GetBlock] - Target wallet:",
    TON_CONFIG.CORPORATE_WALLET,
  );

  console.log("[TON_MONITOR] [GetBlock] 🚀 Sending request...");
  const requestStart = Date.now();

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const requestDuration = Date.now() - requestStart;

  console.log(
    "[TON_MONITOR] [GetBlock] ⏱️  Request completed in",
    requestDuration,
    "ms",
  );

  console.log("[TON_MONITOR] [GetBlock] 📥 Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();

    console.error("[TON_MONITOR] [GetBlock] ❌ API request failed:");
    console.error("[TON_MONITOR] [GetBlock] - Status:", response.status);
    console.error("[TON_MONITOR] [GetBlock] - Error body:", errorText);

    throw new Error(
      `GetBlock API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const rawData = await response.text();

  console.log(
    "[TON_MONITOR] [GetBlock] 📄 Raw response length:",
    rawData.length,
    "characters",
  );

  let parsedData: GetBlockResponse;

  try {
    parsedData = JSON.parse(rawData);
    console.log("[TON_MONITOR] [GetBlock] ✅ JSON parsing successful");
  } catch (parseError) {
    console.error(
      "[TON_MONITOR] [GetBlock] ❌ JSON parsing failed:",
      parseError,
    );
    throw new Error(
      `Failed to parse GetBlock response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
    );
  }

  // Извлекаем транзакции из ответа
  let transactions: GetBlockTransaction[] = [];

  if ("ok" in parsedData && "result" in parsedData) {
    console.log(
      "[TON_MONITOR] [GetBlock] 📋 Detected HTTP API v4 response format",
    );
    if (!parsedData.ok) {
      throw new Error(
        `GetBlock API error: ${parsedData.error || "Unknown error"}`,
      );
    }
    transactions = parsedData.result || [];
  } else if ("jsonrpc" in parsedData && "result" in parsedData) {
    console.log(
      "[TON_MONITOR] [GetBlock] 📋 Detected JSON-RPC response format",
    );
    if (parsedData.error) {
      throw new Error(
        `GetBlock JSON-RPC error: ${parsedData.error.message} (code: ${parsedData.error.code})`,
      );
    }
    transactions = parsedData.result || [];
  } else {
    throw new Error("Unexpected GetBlock API response format");
  }

  console.log(
    "[TON_MONITOR] [GetBlock] - Total transactions received:",
    transactions.length,
  );

  // Фильтруем транзакции по времени
  const recentTransactions = transactions.filter((tx) => {
    return tx.utime >= lookbackTimestamp;
  });

  console.log("[TON_MONITOR] [GetBlock] ✅ Time filtering completed:");
  console.log(
    `[TON_MONITOR] [GetBlock] - Original count: ${transactions.length}`,
  );
  console.log(
    `[TON_MONITOR] [GetBlock] - Filtered count: ${recentTransactions.length}`,
  );

  return recentTransactions;
}

/**
 * NEW: Получение транзакций через Toncenter API
 */
async function fetchFromToncenter(): Promise<GetBlockTransaction[]> {
  const lookbackTimestamp = Math.floor(
    (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
  );

  console.log("[TON_MONITOR] [Toncenter] 🕐 Transaction time filter:");
  console.log(
    "[TON_MONITOR] [Toncenter] - Current timestamp:",
    Math.floor(Date.now() / 1000),
  );
  console.log(
    "[TON_MONITOR] [Toncenter] - Lookback hours:",
    CRON_CONFIG.LOOKBACK_HOURS,
  );
  console.log(
    "[TON_MONITOR] [Toncenter] - Minimum timestamp:",
    lookbackTimestamp,
  );
  console.log(
    "[TON_MONITOR] [Toncenter] - Lookback date:",
    new Date(lookbackTimestamp * 1000).toISOString(),
  );

  const apiUrl = new URL(`https://toncenter.com/api/v2/getTransactions`);

  apiUrl.searchParams.append("address", TON_CONFIG.CORPORATE_WALLET);
  apiUrl.searchParams.append(
    "limit",
    CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN.toString(),
  );
  apiUrl.searchParams.append("archival", "false");

  console.log("[TON_MONITOR] [Toncenter] 📡 API Request details:");
  console.log("[TON_MONITOR] [Toncenter] - Full URL:", apiUrl.toString());
  console.log(
    "[TON_MONITOR] [Toncenter] - Target wallet:",
    TON_CONFIG.CORPORATE_WALLET,
  );

  console.log("[TON_MONITOR] [Toncenter] 🚀 Sending request...");
  const requestStart = Date.now();

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CRON_CONFIG.TONCENTER_API_KEY || "",
    },
  });

  const requestDuration = Date.now() - requestStart;

  console.log(
    "[TON_MONITOR] [Toncenter] ⏱️  Request completed in",
    requestDuration,
    "ms",
  );

  console.log("[TON_MONITOR] [Toncenter] 📥 Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();

    console.error("[TON_MONITOR] [Toncenter] ❌ API request failed:");
    console.error("[TON_MONITOR] [Toncenter] - Status:", response.status);
    console.error("[TON_MONITOR] [Toncenter] - Error body:", errorText);

    throw new Error(
      `Toncenter API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const rawData = await response.text();

  console.log(
    "[TON_MONITOR] [Toncenter] 📄 Raw response length:",
    rawData.length,
    "characters",
  );

  let parsedData: ToncenterResponse;

  try {
    parsedData = JSON.parse(rawData);
    console.log("[TON_MONITOR] [Toncenter] ✅ JSON parsing successful");
  } catch (parseError) {
    console.error(
      "[TON_MONITOR] [Toncenter] ❌ JSON parsing failed:",
      parseError,
    );
    throw new Error(
      `Failed to parse Toncenter response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
    );
  }

  if (!parsedData.ok) {
    throw new Error(
      `Toncenter API error: ${parsedData.error || "Unknown error"} (code: ${parsedData.code})`,
    );
  }

  const toncenterTransactions = parsedData.result || [];

  console.log(
    "[TON_MONITOR] [Toncenter] - Total transactions received:",
    toncenterTransactions.length,
  );

  // Конвертируем транзакции в формат GetBlock для единообразной обработки
  console.log("[TON_MONITOR] [Toncenter] 🔄 Converting to unified format...");
  const transactions = toncenterTransactions.map(convertToncenterToGetBlock);

  // Фильтруем транзакции по времени
  const recentTransactions = transactions.filter((tx) => {
    return tx.utime >= lookbackTimestamp;
  });

  console.log("[TON_MONITOR] [Toncenter] ✅ Time filtering completed:");
  console.log(
    `[TON_MONITOR] [Toncenter] - Original count: ${transactions.length}`,
  );
  console.log(
    `[TON_MONITOR] [Toncenter] - Filtered count: ${recentTransactions.length}`,
  );

  if (recentTransactions.length > 0) {
    console.log("[TON_MONITOR] [Toncenter] 📋 Recent transactions summary:");
    recentTransactions.forEach((tx, index) => {
      const hash = getTransactionHash(tx);

      console.log(
        `[TON_MONITOR] [Toncenter] - #${index + 1}: ${hash} at ${new Date(tx.utime * 1000).toISOString()}`,
      );
    });
  }

  return recentTransactions;
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

    console.log(
      `[TON_MONITOR] 📝 Processing transaction ${index + 1}/${transactions.length}...`,
    );

    try {
      const txHash = getTransactionHash(transaction);

      if (!txHash) {
        console.warn(
          `[TON_MONITOR] ⚠️  Transaction ${index + 1} missing hash in transaction_id, skipping`,
        );
        console.warn(`[TON_MONITOR] - Transaction structure:`, {
          hasTransactionId: !!transaction.transaction_id,
          transactionIdKeys: transaction.transaction_id
            ? Object.keys(transaction.transaction_id)
            : null,
        });
        continue;
      }

      console.log(`[TON_MONITOR] - Transaction hash: ${txHash}`);
      console.log(
        `[TON_MONITOR] - Transaction timestamp: ${transaction.utime} (${new Date(transaction.utime * 1000).toISOString()})`,
      );

      // Проверяем, не обработана ли уже эта транзакция
      console.log(
        `[TON_MONITOR] 🔍 Checking if transaction exists in database...`,
      );
      const existingTransaction = await checkTransactionExists(txHash);

      if (existingTransaction) {
        console.log(
          `[TON_MONITOR] ⏭️  Transaction ${txHash} already processed, skipping`,
        );
        continue;
      }

      console.log(
        `[TON_MONITOR] ✅ Transaction ${txHash} is new, processing...`,
      );

      // Обрабатываем новую транзакцию
      const result = await processTransaction(transaction);

      if (result) {
        console.log(
          `[TON_MONITOR] ✅ Transaction ${txHash} processed successfully:`,
          {
            status: result.status,
            attempts_credited: result.attempts_credited,
            telegram_id: result.telegram_id,
          },
        );
        results.push(result);
      } else {
        console.log(
          `[TON_MONITOR] ⏭️  Transaction ${txHash} skipped (not relevant)`,
        );
      }
    } catch (error) {
      console.error(
        `[TON_MONITOR] ❌ Error processing transaction ${index + 1}:`,
        error,
      );
      // Продолжаем обработку других транзакций
    }
  }

  console.log("[TON_MONITOR] ✅ Transaction processing completed:");
  console.log("[TON_MONITOR] - Total processed:", results.length);
  console.log(
    "[TON_MONITOR] - Successful:",
    results.filter((r) => r.status === "processed").length,
  );
  console.log(
    "[TON_MONITOR] - Incorrect:",
    results.filter((r) => r.status === "incorrect_payload").length,
  );

  return results;
}

/**
 * Проверка существования транзакции в базе данных
 */
async function checkTransactionExists(
  transactionHash: string,
): Promise<boolean> {
  console.log(
    `[TON_MONITOR] 🔍 Checking database for transaction: ${transactionHash}`,
  );

  try {
    const { data, error } = await supabaseServer
      .from("ton_transactions")
      .select("id")
      .eq("transaction_hash", transactionHash)
      .maybeSingle();

    if (error) {
      console.error(
        `[TON_MONITOR] ❌ Database error checking transaction existence:`,
        error,
      );

      return false;
    }

    const exists = !!data;

    console.log(`[TON_MONITOR] - Transaction exists in database: ${exists}`);

    return exists;
  } catch (error) {
    console.error(
      `[TON_MONITOR] ❌ Exception checking transaction existence:`,
      error,
    );

    return false;
  }
}

/**
 * Декодирование base64 payload и извлечение текста
 */
function decodePayload(base64Body: string): string {
  console.log(
    `[TON_MONITOR] 🔓 Decoding payload (length: ${base64Body.length})`,
  );

  try {
    const buffer = Buffer.from(base64Body, "base64");

    console.log(`[TON_MONITOR] - Buffer length: ${buffer.length} bytes`);

    if (buffer.length < 4) {
      console.log(`[TON_MONITOR] - Buffer too short, returning empty string`);

      return "";
    }

    const opcode = buffer.readUInt32BE(0);

    console.log(`[TON_MONITOR] - Opcode: ${opcode} (0x${opcode.toString(16)})`);

    if (opcode === 0) {
      const textBuffer = buffer.slice(4);
      const text = textBuffer.toString("utf-8").replace(/\0/g, "").trim();

      console.log(`[TON_MONITOR] - Decoded text: "${text}"`);

      return text;
    }

    console.log(`[TON_MONITOR] - Not a text comment (opcode != 0)`);

    return "";
  } catch (error) {
    console.warn("[TON_MONITOR] ⚠️  Failed to decode payload:", error);

    return "";
  }
}

/**
 * Декодирование base64 строк (для text payload'ов)
 */
function decodeBase64Text(base64Text: string): string {
  console.log(
    `[TON_MONITOR] 🔓 Decoding base64 text (length: ${base64Text.length})`,
  );

  try {
    const decoded = Buffer.from(base64Text, "base64").toString("utf-8").trim();

    console.log(`[TON_MONITOR] - Decoded base64 text: "${decoded}"`);

    return decoded;
  } catch (error) {
    console.warn("[TON_MONITOR] ⚠️  Failed to decode base64 text:", error);

    return base64Text; // Возвращаем исходную строку если декодирование не удалось
  }
}

/**
 * Проверка является ли строка base64
 */
function isBase64(str: string): boolean {
  try {
    return Buffer.from(str, "base64").toString("base64") === str;
  } catch (error) {
    return false;
  }
}

/**
 * Обработка одной транзакции
 */
async function processTransaction(
  transaction: GetBlockTransaction,
): Promise<ProcessedTransaction | null> {
  const txHash = getTransactionHash(transaction);

  if (!txHash) {
    console.log(
      `[TON_MONITOR] - Transaction missing hash in transaction_id, skipping`,
    );

    return null;
  }

  console.log(`[TON_MONITOR] 🔍 Analyzing transaction ${txHash}...`);

  const inMsg = transaction.in_msg;

  if (!inMsg) {
    console.log(`[TON_MONITOR] - No incoming message, skipping`);

    return null;
  }

  if (!inMsg.source || !inMsg.value) {
    console.log(
      `[TON_MONITOR] - Missing source or value in incoming message:`,
      {
        hasSource: !!inMsg.source,
        hasValue: !!inMsg.value,
      },
    );

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
    console.log(
      `[TON_MONITOR] - Transaction not for our wallet (${inMsg.destination} != ${TON_CONFIG.CORPORATE_WALLET}), skipping`,
    );

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
      const rawText = inMsg.msg_data.text;

      console.log(`[TON_MONITOR] - Found direct text payload: "${rawText}"`);

      // Проверяем, является ли текст base64-encoded
      if (isBase64(rawText)) {
        console.log(
          `[TON_MONITOR] - Text appears to be base64, attempting to decode...`,
        );
        payload = decodeBase64Text(rawText);
        console.log(`[TON_MONITOR] - Decoded text payload: "${payload}"`);
      } else {
        payload = rawText;
        console.log(`[TON_MONITOR] - Using text payload as-is: "${payload}"`);
      }
    } else if (inMsg.msg_data.body) {
      console.log(`[TON_MONITOR] - Attempting to decode body payload...`);
      payload = decodePayload(inMsg.msg_data.body);
      console.log(`[TON_MONITOR] - Decoded body payload: "${payload}"`);
    }
  }

  console.log(`[TON_MONITOR] 📝 Final payload: "${payload || "(empty)"}"`);

  if (!payload) {
    console.log(
      `[TON_MONITOR] ⏭️  Transaction ${txHash} has no payload, skipping`,
    );

    return null;
  }

  // Парсим payload для извлечения информации о заказе
  console.log(`[TON_MONITOR] 🔍 Parsing payload for order information...`);
  console.log(`[TON_MONITOR] - Raw payload: "${payload}"`);
  console.log(`[TON_MONITOR] - Payload length: ${payload.length}`);
  console.log(
    `[TON_MONITOR] - TON_CONFIG.MAX_PAYLOAD_LENGTH: ${TON_CONFIG.MAX_PAYLOAD_LENGTH}`,
  );
  console.log(
    `[TON_MONITOR] - TON_CONFIG.PAYLOAD_SEPARATOR: "${TON_CONFIG.PAYLOAD_SEPARATOR}"`,
  );

  // Используем разделитель для отладочного разбора
  const debugParts = payload.split(TON_CONFIG.PAYLOAD_SEPARATOR);

  console.log(
    `[TON_MONITOR] - Manual split by "${TON_CONFIG.PAYLOAD_SEPARATOR}":`,
    debugParts,
  );
  console.log(`[TON_MONITOR] - Manual split count: ${debugParts.length}`);

  if (debugParts.length === 4) {
    const [timestampStr, telegramIdStr, productType, randomSuffix] = debugParts;

    console.log(`[TON_MONITOR] - Debug parsing:`);
    console.log(
      `[TON_MONITOR]   - timestampStr: "${timestampStr}" -> ${parseInt(timestampStr)}`,
    );
    console.log(
      `[TON_MONITOR]   - telegramIdStr: "${telegramIdStr}" -> ${parseInt(telegramIdStr)}`,
    );
    console.log(`[TON_MONITOR]   - productType: "${productType}"`);
    console.log(
      `[TON_MONITOR]   - randomSuffix: "${randomSuffix}" (length: ${randomSuffix.length})`,
    );

    // Проверяем каждое поле
    const timestampValid =
      !isNaN(parseInt(timestampStr)) && parseInt(timestampStr) > 0;
    const telegramIdValid =
      !isNaN(parseInt(telegramIdStr)) && parseInt(telegramIdStr) > 0;
    const productTypeValid = [
      "attempts_1",
      "attempts_5",
      "attempts_10",
      "attempts_100",
    ].includes(productType);
    const suffixValid = randomSuffix.length >= 3;

    console.log(`[TON_MONITOR] - Field validations:`);
    console.log(`[TON_MONITOR]   - timestamp valid: ${timestampValid}`);
    console.log(`[TON_MONITOR]   - telegram_id valid: ${telegramIdValid}`);
    console.log(`[TON_MONITOR]   - product_type valid: ${productTypeValid}`);
    console.log(`[TON_MONITOR]   - suffix valid: ${suffixValid}`);
  }

  const parseResult = parseTONPayload(payload);

  console.log(`[TON_MONITOR] - Parse result:`, {
    isValid: parseResult.isValid,
    telegramId: parseResult.telegramId,
    productType: parseResult.productType,
    uniqueId: parseResult.uniqueId,
    error: parseResult.error,
  });

  if (!parseResult.isValid) {
    console.warn(
      `[TON_MONITOR] ⚠️  Incorrect payload in transaction ${txHash}: ${parseResult.error}`,
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
      `[TON_MONITOR] ⚠️  Incomplete parsed data for transaction ${txHash}:`,
      {
        telegramId,
        productType,
        uniqueId,
      },
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
  console.log(
    `[TON_MONITOR] 👤 Looking up user with telegram_id: ${telegramId}`,
  );
  const user = await serverUserService.findByTelegramId(telegramId);

  if (!user) {
    console.warn(
      `[TON_MONITOR] ⚠️  User not found for transaction ${txHash}: telegram_id ${telegramId}`,
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

  console.log(
    `[TON_MONITOR] ✅ User found: ${user.first_name} (current attempts: ${user.attempts_remaining})`,
  );

  // Сохраняем успешную транзакцию и зачисляем попытки
  const productInfo = getTONProductInfo(productType);
  const attemptsToCredit = productInfo.attempts;

  console.log(`[TON_MONITOR] 💎 Product info:`, {
    productType,
    attemptsToCredit,
    productInfo,
  });

  try {
    console.log(
      `[TON_MONITOR] 💾 Saving successful transaction to database...`,
    );
    await saveSuccessfulTransaction(
      transaction,
      senderWallet,
      amountNanotons,
      payload,
      telegramId,
      productType,
      uniqueId,
    );

    console.log(
      `[TON_MONITOR] ⚡ Crediting ${attemptsToCredit} attempts to user ${telegramId}...`,
    );
    await creditAttemptsToUser(telegramId, attemptsToCredit);

    console.log(
      `[TON_MONITOR] ✅ Successfully processed transaction ${txHash}:`,
      {
        telegramId,
        productType,
        attemptsCredited: attemptsToCredit,
        userFirstName: user.first_name,
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
      `[TON_MONITOR] ❌ Error saving transaction ${txHash}:`,
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
  const txHash = getTransactionHash(transaction);

  if (!txHash) {
    throw new Error("Transaction hash not found in transaction_id");
  }

  console.log(
    `[TON_MONITOR] 💾 Saving incorrect transaction ${txHash} to database...`,
  );

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
      console.error(
        `[TON_MONITOR] ❌ Database error saving incorrect transaction ${txHash}:`,
        error,
      );
      throw error;
    }

    console.log(
      `[TON_MONITOR] ✅ Incorrect transaction ${txHash} saved to database`,
    );
  } catch (error) {
    console.error(
      `[TON_MONITOR] ❌ Exception saving incorrect transaction ${txHash}:`,
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
  const txHash = getTransactionHash(transaction);

  if (!txHash) {
    throw new Error("Transaction hash not found in transaction_id");
  }

  console.log(
    `[TON_MONITOR] 💾 Saving successful transaction ${txHash} to database...`,
  );

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
      console.error(
        `[TON_MONITOR] ❌ Database error saving successful transaction ${txHash}:`,
        error,
      );
      throw error;
    }

    console.log(
      `[TON_MONITOR] ✅ Successful transaction ${txHash} saved to database`,
    );
  } catch (error) {
    console.error(
      `[TON_MONITOR] ❌ Exception saving successful transaction ${txHash}:`,
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
      attempts_reset_at: null,
      updated_at: new Date().toISOString(),
    });

    console.log(
      `[TON_MONITOR] ✅ Successfully credited ${attempts} attempts to user ${telegramId}. New total: ${newAttemptsCount}`,
    );
  } catch (error) {
    console.error(
      `[TON_MONITOR] ❌ Error crediting attempts to user ${telegramId}:`,
      error,
    );
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
  console.log(
    `[TON_MONITOR] - Total processed transactions: ${processResults.length}`,
  );
  console.log(
    `[TON_MONITOR] - Successful transactions requiring notifications: ${successfulTransactions.length}`,
  );

  if (successfulTransactions.length === 0) {
    console.log(`[TON_MONITOR] ℹ️  No notifications to send`);

    return [];
  }

  const notificationPromises = successfulTransactions.map(
    async (transaction, index) => {
      console.log(
        `[TON_MONITOR] 📧 Sending notification ${index + 1}/${successfulTransactions.length}...`,
      );

      if (!transaction.telegram_id) {
        console.warn(
          `[TON_MONITOR] ⚠️  Transaction ${transaction.hash} missing telegram_id`,
        );

        return { success: false, error: "No telegram_id" };
      }

      try {
        const user = await serverUserService.findByTelegramId(
          transaction.telegram_id,
        );

        if (!user) {
          console.warn(
            `[TON_MONITOR] ⚠️  User not found for notification: ${transaction.telegram_id}`,
          );

          return {
            success: false,
            telegram_id: transaction.telegram_id,
            error: "User not found",
          };
        }

        console.log(
          `[TON_MONITOR] - Sending to: ${user.first_name} (${transaction.telegram_id})`,
        );
        console.log(
          `[TON_MONITOR] - Language: ${user.language_code || "default"}`,
        );
        console.log(
          `[TON_MONITOR] - Attempts credited: ${transaction.attempts_credited}`,
        );

        const success = await sendTONSuccessNotification(
          transaction.telegram_id,
          user.first_name,
          user.language_code || null,
          transaction.attempts_credited,
        );

        if (success) {
          console.log(
            `[TON_MONITOR] ✅ Notification sent successfully to ${transaction.telegram_id}`,
          );
        } else {
          console.error(
            `[TON_MONITOR] ❌ Notification failed for ${transaction.telegram_id}`,
          );
        }

        return {
          success,
          telegram_id: transaction.telegram_id,
          error: success ? undefined : "Notification failed",
        };
      } catch (error) {
        console.error(
          `[TON_MONITOR] ❌ Exception sending notification to ${transaction.telegram_id}:`,
          error,
        );

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

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `[TON_MONITOR] 📊 Notification results: ${successful} successful, ${failed} failed`,
  );

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
  console.log(
    `[TON_MONITOR] 📤 Preparing Telegram notification for user ${telegramId}...`,
  );

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
      console.log(
        `[TON_MONITOR] ✅ Success notification sent to user ${telegramId}`,
      );

      return true;
    } else {
      console.error(
        `[TON_MONITOR] ❌ Telegram API error for user ${telegramId}:`,
        result,
      );

      return false;
    }
  } catch (error) {
    console.error(
      `[TON_MONITOR] ❌ Network error sending notification to user ${telegramId}:`,
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
      payload_separator: TON_CONFIG.PAYLOAD_SEPARATOR,
      has_getblock_token: !!CRON_CONFIG.GETBLOCK_ACCESS_TOKEN,
      has_toncenter_token: !!CRON_CONFIG.TONCENTER_API_KEY,
      has_telegram_token: !!CRON_CONFIG.TELEGRAM_BOT_TOKEN,
    },
    status: "TON payments monitor is active",
    next_execution_url: `${request.nextUrl.origin}/api/cron/ton-payments-monitor`,
    timestamp: new Date().toISOString(),
  };

  console.log("[TON_MONITOR] ✅ Configuration info returned:", configInfo);

  return NextResponse.json(configInfo);
}
