// src/app/api/cron/ton-payments-monitor/route.ts - Fixed with working TON API providers

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
  TONCENTER_API_KEY: process.env.TONCENTER_API_KEY,
  TONAPI_KEY: process.env.TONAPI_KEY, // TONAPI.io API key
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_API,

  // Лимиты выполнения
  MAX_TRANSACTIONS_PER_RUN: 100,
  EXECUTION_TIMEOUT: 50000, // 50 секунд

  // Настройки мониторинга
  LOOKBACK_HOURS: 1, // Уменьшил до 1 часа для стабильности

  // Telegram уведомления
  GAME_START_URL: "https://t.me/circusle_bot?startapp",
} as const;

// ============================================================================
// TON API ПРОВАЙДЕРЫ
// ============================================================================

interface APIProvider {
  name: string;
  priority: number;
  fetchTransactions: () => Promise<UnifiedTransaction[]>;
}

// Унифицированный интерфейс для транзакций из разных API
interface UnifiedTransaction {
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
    msg_data?: any;
    message?: string;
  };
  out_msgs?: any[];
}

// ============================================================================
// API ПРОВАЙДЕРЫ РЕАЛИЗАЦИИ
// ============================================================================

/**
 * TON Center API провайдер (основной, проверенный)
 */
async function fetchFromToncenter(): Promise<UnifiedTransaction[]> {
  const lookbackTimestamp = Math.floor(
    (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
  );

  console.log("[TON_MONITOR] [Toncenter] 🔗 Fetching transactions...");
  
  const apiUrl = new URL("https://toncenter.com/api/v2/getTransactions");
  apiUrl.searchParams.append("address", TON_CONFIG.CORPORATE_WALLET);
  apiUrl.searchParams.append("limit", CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN.toString());
  apiUrl.searchParams.append("archival", "false");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (CRON_CONFIG.TONCENTER_API_KEY) {
    headers["X-API-Key"] = CRON_CONFIG.TONCENTER_API_KEY;
  }

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Toncenter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Toncenter API error: ${data.error || "Unknown error"}`);
  }

  const transactions = data.result || [];
  
  // Фильтруем по времени
  const recentTransactions = transactions.filter((tx: any) => tx.utime >= lookbackTimestamp);
  
  console.log(`[TON_MONITOR] [Toncenter] ✅ Fetched ${recentTransactions.length} recent transactions`);
  
  return recentTransactions;
}

/**
 * TONAPI.io провайдер (резервный) - ИСПРАВЛЕННЫЙ
 */
async function fetchFromTonAPI(): Promise<UnifiedTransaction[]> {
  const lookbackTimestamp = Math.floor(
    (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
  );

  console.log("[TON_MONITOR] [TONAPI] 🔗 Fetching transactions...");
  
  // ИСПРАВЛЕННЫЙ URL для TONAPI.io
  const apiUrl = `https://tonapi.io/v2/accounts/${TON_CONFIG.CORPORATE_WALLET}/transactions`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Правильная авторизация для TONAPI
  if (CRON_CONFIG.TONAPI_KEY) {
    headers["Authorization"] = `Bearer ${CRON_CONFIG.TONAPI_KEY}`;
  }

  console.log(`[TON_MONITOR] [TONAPI] 📡 Request URL: ${apiUrl}`);
  console.log(`[TON_MONITOR] [TONAPI] 🔐 Using API key: ${!!CRON_CONFIG.TONAPI_KEY}`);

  const response = await fetch(`${apiUrl}?limit=${CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN}`, {
    method: "GET",
    headers,
  });

  console.log(`[TON_MONITOR] [TONAPI] 📥 Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[TON_MONITOR] [TONAPI] ❌ Error response: ${errorText}`);
    throw new Error(`TONAPI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[TON_MONITOR] [TONAPI] 📊 Response structure:`, {
    hasTransactions: !!data.transactions,
    transactionCount: data.transactions?.length || 0,
    hasError: !!data.error
  });
  
  if (data.error) {
    throw new Error(`TONAPI error: ${data.error}`);
  }

  // TONAPI имеет другой формат ответа
  const transactions = data.transactions || [];
  
  // Конвертируем TONAPI формат в унифицированный
  const convertedTransactions: UnifiedTransaction[] = transactions.map((tx: any) => {
    console.log(`[TON_MONITOR] [TONAPI] 🔄 Converting transaction:`, {
      hash: tx.hash,
      utime: tx.utime,
      hasInMsg: !!tx.in_msg,
      inMsgValue: tx.in_msg?.value || "0"
    });

    return {
      "@type": "raw.transaction",
      utime: tx.utime || 0,
      data: tx.data || "",
      transaction_id: {
        "@type": "internal.transactionId",
        lt: tx.lt?.toString() || "0",
        hash: tx.hash || "",
      },
      fee: tx.total_fees?.toString() || "0",
      storage_fee: tx.storage_fee?.toString() || "0",
      other_fee: tx.other_fee?.toString() || "0",
      in_msg: tx.in_msg ? {
        "@type": "raw.message",
        source: tx.in_msg.source?.address,
        destination: tx.in_msg.destination?.address,
        value: tx.in_msg.value?.toString() || "0",
        fwd_fee: tx.in_msg.fwd_fee?.toString() || "0",
        ihr_fee: tx.in_msg.ihr_fee?.toString() || "0",
        created_lt: tx.in_msg.created_lt?.toString() || "0",
        body_hash: tx.in_msg.body_hash || "",
        msg_data: tx.in_msg.raw_body ? {
          "@type": "msg.dataRaw",
          body: tx.in_msg.raw_body,
        } : tx.in_msg.decoded_body?.text ? {
          "@type": "msg.dataText",
          text: tx.in_msg.decoded_body.text
        } : undefined,
        message: tx.in_msg.decoded_body?.text || "",
      } : undefined,
      out_msgs: tx.out_msgs || [],
    };
  });

  // Фильтруем по времени
  const recentTransactions = convertedTransactions.filter(tx => tx.utime >= lookbackTimestamp);
  
  console.log(`[TON_MONITOR] [TONAPI] ✅ Fetched and converted ${recentTransactions.length} recent transactions`);
  
  return recentTransactions;
}

/**
 * Публичный TonCenter провайдер (без ключа API, как резервный)
 */
async function fetchFromPublicToncenter(): Promise<UnifiedTransaction[]> {
  const lookbackTimestamp = Math.floor(
    (Date.now() - CRON_CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000) / 1000,
  );

  console.log("[TON_MONITOR] [PublicToncenter] 🔗 Fetching transactions (public API)...");
  
  const apiUrl = new URL("https://toncenter.com/api/v2/getTransactions");
  apiUrl.searchParams.append("address", TON_CONFIG.CORPORATE_WALLET);
  apiUrl.searchParams.append("limit", Math.min(CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN, 10).toString()); // Лимит для публичного API
  apiUrl.searchParams.append("archival", "false");

  console.log(`[TON_MONITOR] [PublicToncenter] ⚠️  Using public API (1 RPS limit)`);

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Public Toncenter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Public Toncenter API error: ${data.error || "Unknown error"}`);
  }

  const transactions = data.result || [];
  
  // Фильтруем по времени
  const recentTransactions = transactions.filter((tx: any) => tx.utime >= lookbackTimestamp);
  
  console.log(`[TON_MONITOR] [PublicToncenter] ✅ Fetched ${recentTransactions.length} recent transactions`);
  
  return recentTransactions;
}

// ============================================================================
// ОСНОВНОЙ ПРОВАЙДЕР МЕНЕДЖЕР
// ============================================================================

/**
 * Получение транзакций с множественными провайдерами и fallback логикой
 */
async function fetchTransactionsWithMultipleProviders(): Promise<{
  transactions: UnifiedTransaction[];
  provider: string;
}> {
  // Определяем провайдеров в порядке приоритета
  const providers: APIProvider[] = [];

  // Добавляем TON Center с API ключом если доступен
  if (CRON_CONFIG.TONCENTER_API_KEY) {
    providers.push({
      name: "toncenter",
      priority: 1,
      fetchTransactions: fetchFromToncenter,
    });
  }

  // Добавляем TONAPI если доступен ключ
  if (CRON_CONFIG.TONAPI_KEY) {
    providers.push({
      name: "tonapi",
      priority: 2,
      fetchTransactions: fetchFromTonAPI,
    });
  }

  // Добавляем публичный TON Center как последний резерв
  providers.push({
    name: "public_toncenter",
    priority: 3,
    fetchTransactions: fetchFromPublicToncenter,
  });

  if (providers.length === 0) {
    throw new Error("No API providers configured");
  }

  console.log(`[TON_MONITOR] 📋 Available providers: ${providers.map(p => p.name).join(", ")}`);

  // Пытаемся получить данные от каждого провайдера по порядку
  for (const provider of providers) {
    try {
      console.log(`[TON_MONITOR] 🔄 Trying provider: ${provider.name}`);
      const transactions = await provider.fetchTransactions();
      
      console.log(`[TON_MONITOR] ✅ Successfully fetched from ${provider.name}: ${transactions.length} transactions`);
      
      return {
        transactions,
        provider: provider.name,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[TON_MONITOR] ⚠️  Provider ${provider.name} failed: ${errorMessage}`);
      
      // Специальная обработка для известных временных ошибок
      if (errorMessage.includes("LITE_SERVER_UNKNOWN") || 
          errorMessage.includes("cannot find block") ||
          errorMessage.includes("500")) {
        console.warn(`[TON_MONITOR] 🔍 Temporary blockchain data issue detected, trying next provider...`);
        continue;
      }
      
      // Для других ошибок тоже пробуем следующего провайдера
      continue;
    }
  }

  // Если все провайдеры не сработали
  throw new Error(`All API providers failed. Tried providers: ${providers.map(p => p.name).join(", ")}`);
}

// ============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ ОТВЕТА
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
    api_provider?: string;
  };
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
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();

  console.log("[TON_MONITOR] ==========================================");
  console.log("[TON_MONITOR] Starting new monitoring session at", new Date().toISOString());
  console.log("[TON_MONITOR] Environment check:");
  console.log("[TON_MONITOR] - CRON_API_KEY exists:", !!CRON_CONFIG.CRON_API_KEY);
  console.log("[TON_MONITOR] - TONCENTER_API_KEY exists:", !!CRON_CONFIG.TONCENTER_API_KEY);
  console.log("[TON_MONITOR] - TONAPI_KEY exists:", !!CRON_CONFIG.TONAPI_KEY);
  console.log("[TON_MONITOR] - TELEGRAM_BOT_TOKEN exists:", !!CRON_CONFIG.TELEGRAM_BOT_TOKEN);
  console.log("[TON_MONITOR] - Lookback hours:", CRON_CONFIG.LOOKBACK_HOURS);

  try {
    // Проверка авторизации
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
      console.warn("[TON_MONITOR] ❌ AUTHORIZATION FAILED");
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
        { status: 401 }
      );
    }

    console.log("[TON_MONITOR] ✅ Authorization successful");

    // Проверяем необходимые конфигурации
    if (!CRON_CONFIG.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram Bot Token not configured");
    }

    if (!TON_CONFIG.CORPORATE_WALLET) {
      throw new Error("Corporate wallet not configured");
    }

    console.log("[TON_MONITOR] Corporate wallet:", TON_CONFIG.CORPORATE_WALLET);

    // Получаем новые транзакции с множественными провайдерами
    console.log("[TON_MONITOR] 📡 Starting transaction fetch process...");
    const { transactions, provider } = await fetchTransactionsWithMultipleProviders();

    console.log("[TON_MONITOR] 📊 Transaction fetch results:");
    console.log("[TON_MONITOR] - API provider used:", provider);
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
          api_provider: provider,
        },
      });
    }

    // Обрабатываем транзакции
    console.log("[TON_MONITOR] 🔄 Processing transactions...");
    const processResults = await processTransactions(transactions);

    // Отправляем уведомления об успешных зачислениях
    console.log("[TON_MONITOR] 📨 Starting notification process...");
    const notificationResults = await sendSuccessNotifications(processResults);

    // Подсчитываем статистику
    const stats = calculateStats(processResults, notificationResults);
    const executionTime = Date.now() - startTime;

    console.log("[TON_MONITOR] 📋 Final statistics:");
    console.log("[TON_MONITOR] - API provider:", provider);
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
        api_response_format: "multi_provider_api_fixed",
        transactions_fetched: transactions.length,
        filtered_transactions: processResults.length,
        api_provider: provider,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("[TON_MONITOR] ❌ CRITICAL ERROR in monitoring process:");
    console.error("[TON_MONITOR] - Error message:", errorMessage);
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
      { status: 500 }
    );
  }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Helper функция для получения хеша транзакции
 */
function getTransactionHash(transaction: UnifiedTransaction): string | null {
  return transaction.transaction_id?.hash || null;
}

/**
 * Обработка списка транзакций
 */
async function processTransactions(
  transactions: UnifiedTransaction[]
): Promise<ProcessedTransaction[]> {
  console.log("[TON_MONITOR] 🔄 Starting transaction processing...");
  const results: ProcessedTransaction[] = [];

  for (let index = 0; index < transactions.length; index++) {
    const transaction = transactions[index];
    
    try {
      const result = await processTransaction(transaction);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`[TON_MONITOR] ❌ Error processing transaction ${index + 1}:`, error);
    }
  }

  return results;
}

/**
 * Обработка одной транзакции
 */
async function processTransaction(
  transaction: UnifiedTransaction
): Promise<ProcessedTransaction | null> {
  const txHash = getTransactionHash(transaction);
  if (!txHash) return null;

  // Проверяем, не обработана ли уже эта транзакция
  const exists = await checkTransactionExists(txHash);
  if (exists) return null;

  const inMsg = transaction.in_msg;
  if (!inMsg || !inMsg.source || !inMsg.value) return null;

  if (inMsg.destination !== TON_CONFIG.CORPORATE_WALLET) return null;

  const senderWallet = inMsg.source;
  const amountNanotons = BigInt(inMsg.value);

  // Извлекаем payload
  let payload = "";
  if (inMsg.msg_data) {
    if (inMsg.msg_data.text) {
      payload = inMsg.msg_data.text;
    } else if (inMsg.msg_data.body) {
      payload = decodePayload(inMsg.msg_data.body);
    }
  }
  
  // Также проверяем message поле
  if (!payload && inMsg.message) {
    payload = inMsg.message;
  }

  if (!payload) return null;

  // Парсим payload
  const parseResult = parseTONPayload(payload);
  if (!parseResult.isValid) {
    await saveIncorrectTransaction(transaction, senderWallet, amountNanotons, payload, parseResult.error || "Invalid payload");
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
    await saveIncorrectTransaction(transaction, senderWallet, amountNanotons, payload, "Incomplete parsed data");
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

  if (amountNanotons < minAcceptableAmount) {
    await saveIncorrectTransaction(transaction, senderWallet, amountNanotons, payload, "Amount too low");
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
    await saveIncorrectTransaction(transaction, senderWallet, amountNanotons, payload, `User not found: telegram_id ${telegramId}`);
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

  await saveSuccessfulTransaction(transaction, senderWallet, amountNanotons, payload, telegramId, productType, uniqueId);
  await creditAttemptsToUser(telegramId, attemptsToCredit);

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
}

/**
 * Декодирование base64 payload и извлечение текста
 */
function decodePayload(base64Body: string): string {
  try {
    const buffer = Buffer.from(base64Body, "base64");
    if (buffer.length < 4) return "";
    
    const opcode = buffer.readUInt32BE(0);
    if (opcode === 0) {
      const textBuffer = buffer.slice(4);
      return textBuffer.toString("utf-8").replace(/\0/g, "").trim();
    }
    return "";
  } catch (error) {
    console.warn("[TON_MONITOR] ⚠️ Failed to decode payload:", error);
    return "";
  }
}

/**
 * Проверка существования транзакции в базе данных
 */
async function checkTransactionExists(transactionHash: string): Promise<boolean> {
  try {
    const { data } = await supabaseServer
      .from("ton_transactions")
      .select("id")
      .eq("transaction_hash", transactionHash)
      .maybeSingle();
    return !!data;
  } catch (error) {
    console.error("[TON_MONITOR] ❌ Database error:", error);
    return false;
  }
}

/**
 * Сохранение некорректной транзакции
 */
async function saveIncorrectTransaction(
  transaction: UnifiedTransaction,
  senderWallet: string,
  amountNanotons: bigint,
  payload: string,
  errorMessage: string
): Promise<void> {
  const txHash = getTransactionHash(transaction);
  if (!txHash) throw new Error("Transaction hash not found");

  await supabaseServer.from("ton_transactions").insert({
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
}

/**
 * Сохранение успешной транзакции
 */
async function saveSuccessfulTransaction(
  transaction: UnifiedTransaction,
  senderWallet: string,
  amountNanotons: bigint,
  payload: string,
  telegramId: number,
  productType: ProductType,
  uniqueId: string
): Promise<void> {
  const expectedAmount = TON_PRICES[productType];
  const txHash = getTransactionHash(transaction);
  if (!txHash) throw new Error("Transaction hash not found");

  await supabaseServer.from("ton_transactions").insert({
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
}

/**
 * Зачисление попыток пользователю
 */
async function creditAttemptsToUser(telegramId: number, attempts: number): Promise<void> {
  const user = await serverUserService.findByTelegramId(telegramId);
  if (!user) throw new Error(`User not found: ${telegramId}`);

  const newAttemptsCount = user.attempts_remaining + attempts;

  await supabaseServer
    .from("users")
    .update({
      attempts_remaining: newAttemptsCount,
      attempts_reset_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_id", telegramId);
}

/**
 * Отправка уведомлений об успешных зачислениях
 */
async function sendSuccessNotifications(
  processResults: ProcessedTransaction[]
): Promise<Array<{ success: boolean; telegram_id?: number; error?: string }>> {
  const successfulTransactions = processResults.filter(
    (result) => result.status === "processed" && result.telegram_id
  );

  if (successfulTransactions.length === 0) return [];

  const results = await Promise.all(
    successfulTransactions.map(async (transaction) => {
      try {
        const user = await serverUserService.findByTelegramId(transaction.telegram_id!);
        if (!user) {
          return { success: false, telegram_id: transaction.telegram_id, error: "User not found" };
        }

        const success = await sendTONSuccessNotification(
          transaction.telegram_id!,
          user.first_name,
          user.language_code || null,
          transaction.attempts_credited
        );

        return { success, telegram_id: transaction.telegram_id };
      } catch (error) {
        return {
          success: false,
          telegram_id: transaction.telegram_id,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
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
  attemptsCredited: number
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

  const telegramApiUrl = `https://api.telegram.org/bot${CRON_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: telegramId,
    text: message,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, url: CRON_CONFIG.GAME_START_URL }]],
    },
  };

  try {
    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("[TON_MONITOR] ❌ Telegram notification error:", error);
    return false;
  }
}

/**
 * Подсчет статистики обработки
 */
function calculateStats(
  processResults: ProcessedTransaction[],
  notificationResults: Array<{ success: boolean; telegram_id?: number; error?: string }>
) {
  const newTransactions = processResults.length;
  const processedTransactions = processResults.filter((r) => r.status === "processed").length;
  const incorrectPayloads = processResults.filter((r) => r.status === "incorrect_payload").length;
  const creditedAttempts = processResults.reduce((sum, r) => sum + r.attempts_credited, 0);
  const notificationsSent = notificationResults.filter((r) => r.success).length;
  const failedNotifications = notificationResults.filter((r) => !r.success).length;

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
 * Информация о конфигурации CRON задачи
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey || apiKey !== CRON_CONFIG.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configInfo = {
    config: {
      corporate_wallet: TON_CONFIG.CORPORATE_WALLET,
      lookback_hours: CRON_CONFIG.LOOKBACK_HOURS,
      max_transactions_per_run: CRON_CONFIG.MAX_TRANSACTIONS_PER_RUN,
      execution_timeout: CRON_CONFIG.EXECUTION_TIMEOUT,
      has_toncenter_token: !!CRON_CONFIG.TONCENTER_API_KEY,
      has_tonapi_token: !!CRON_CONFIG.TONAPI_KEY,
      has_telegram_token: !!CRON_CONFIG.TELEGRAM_BOT_TOKEN,
      available_providers: [
        CRON_CONFIG.TONCENTER_API_KEY ? "toncenter" : null,
        CRON_CONFIG.TONAPI_KEY ? "tonapi" : null,
        "public_toncenter"
      ].filter(Boolean),
    },
    status: "TON payments monitor active with fixed API providers",
    next_execution_url: `${request.nextUrl.origin}/api/cron/ton-payments-monitor`,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(configInfo);
}