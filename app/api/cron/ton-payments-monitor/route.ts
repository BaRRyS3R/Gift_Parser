// src/app/api/cron/ton-payments-monitor/route.ts
// TON Payments Monitoring CRON job для проверки платежей и начисления попыток

import { NextRequest, NextResponse } from "next/server";
import {
  supabaseServer,
  type ServerUser,
} from "@/lib/supabase_server";
import {
  TON_CONFIG,
  parseTONPayload,
  getTONProductInfo,
  type TONTransaction,
  type TONOrder,
} from "@/types/ton-payments";
import { ProductType } from "@/types/purchases";

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

const REQUIRED_ENV_VARS = [
  "TONAPI_KEY",
  "TELEGRAM_BOT_API",
  "TON_TRANSACTION_LOOKBACK",
  "TON_ORDER_EXPIRY",
  "CRON_API_KEY",
] as const;

const TONAPI_BASE_URL = "https://tonapi.io/v2";
const TONAPI_ENDPOINTS = {
  ACCOUNT_EVENTS: (accountId: string) => `/accounts/${accountId}/events`,
  ACCOUNT_TRANSACTIONS: (accountId: string) => `/accounts/${accountId}/transactions`,
} as const;

// Типы ответов TONAPI
interface TONAPIEvent {
  event_id: string;
  timestamp: number;
  account: {
    address: string;
    name?: string;
    is_scam?: boolean;
  };
  actions: Array<{
    type: string;
    status: "ok" | "failed";
    simple_preview?: {
      name: string;
      description: string;
      value?: string;
      value_image?: string;
    };
    TonTransfer?: {
      sender: { address: string; name?: string };
      recipient: { address: string; name?: string };
      amount: number; // в наноTON
      comment?: string;
    };
  }>;
  in_progress: boolean;
  extra: number;
  lt: number;
}

interface TONAPIResponse {
  events: TONAPIEvent[];
  next_from?: number;
}

interface ProcessingStats {
  totalChecked: number;
  newTransactions: number;
  processedTransactions: number;
  failedTransactions: number;
  notificationsSet: number;
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Проверка наличия всех необходимых переменных окружения
 */
function validateEnvironmentVariables(): { isValid: boolean; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter(
    (envVar) => !process.env[envVar]
  );
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Получение транзакций для корпоративного кошелька из TONAPI
 */
async function fetchAccountEvents(
  accountId: string,
  hoursBack: number = 2
): Promise<TONAPIEvent[]> {
  const apiKey = process.env.TONAPI_KEY!;
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (hoursBack * 3600);
  
  console.log(`[TON_MONITOR] 🔍 Fetching events for account: ${accountId}`);
  console.log(`[TON_MONITOR] ⏰ Cutoff timestamp: ${cutoffTimestamp} (${new Date(cutoffTimestamp * 1000).toISOString()})`);
  
  const url = `${TONAPI_BASE_URL}${TONAPI_ENDPOINTS.ACCOUNT_EVENTS(accountId)}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TONAPI request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data: TONAPIResponse = await response.json();
    
    // Фильтруем события по времени
    const recentEvents = data.events.filter(
      event => event.timestamp >= cutoffTimestamp
    );
    
    console.log(`[TON_MONITOR] 📊 Total events: ${data.events.length}, Recent events: ${recentEvents.length}`);
    
    return recentEvents;
    
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Error fetching account events:`, error);
    throw new Error(`Failed to fetch account events: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Обработка событий TONAPI и извлечение входящих платежей
 */
function parseIncomingPayments(events: TONAPIEvent[]): Array<{
  eventId: string;
  transactionHash: string;
  senderWallet: string;
  amountNanotons: bigint;
  comment: string;
  timestamp: number;
  lt: number;
}> {
  const payments: Array<{
    eventId: string;
    transactionHash: string;
    senderWallet: string;
    amountNanotons: bigint;
    comment: string;
    timestamp: number;
    lt: number;
  }> = [];
  
  for (const event of events) {
    try {
      // Ищем TonTransfer действия в событии
      for (const action of event.actions) {
        if (action.type === "TonTransfer" && action.TonTransfer && action.status === "ok") {
          const transfer = action.TonTransfer;
          
          // Проверяем, что это входящий платеж на наш корпоративный кошелек
          if (transfer.recipient.address === TON_CONFIG.CORPORATE_WALLET && transfer.comment) {
            payments.push({
              eventId: event.event_id,
              transactionHash: event.event_id, // В TONAPI event_id часто является хешем транзакции
              senderWallet: transfer.sender.address,
              amountNanotons: BigInt(transfer.amount),
              comment: transfer.comment,
              timestamp: event.timestamp,
              lt: event.lt,
            });
            
            console.log(`[TON_MONITOR] 💰 Found payment: ${transfer.amount} nanoTON from ${transfer.sender.address}`);
          }
        }
      }
    } catch (error) {
      console.error(`[TON_MONITOR] ⚠️ Error parsing event ${event.event_id}:`, error);
    }
  }
  
  return payments;
}

/**
 * Проверка существования транзакции в базе данных
 */
async function transactionExists(transactionHash: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from("ton_transactions")
      .select("id")
      .eq("transaction_hash", transactionHash)
      .maybeSingle();
    
    if (error) {
      console.error(`[TON_MONITOR] ❌ Error checking transaction existence:`, error);
      return false; // В случае ошибки считаем, что транзакции нет, чтобы не потерять платеж
    }
    
    return !!data;
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Exception checking transaction existence:`, error);
    return false;
  }
}

/**
 * Создание записи о TON транзакции в базе данных
 */
async function createTONTransaction(
  transactionHash: string,
  senderWallet: string,
  telegramId: number,
  productType: ProductType,
  uniqueId: string,
  amountNanotons: bigint,
  expectedAmountNanotons: bigint,
  payload: string,
  timestamp: number
): Promise<string | null> {
  try {
    const transactionData = {
      transaction_hash: transactionHash,
      sender_wallet: senderWallet,
      telegram_id: telegramId,
      product_type: productType,
      unique_id: uniqueId,
      amount_nanotons: amountNanotons.toString(), // Convert BigInt to string for DB
      expected_amount_nanotons: expectedAmountNanotons.toString(),
      payload: payload,
      status: "processed" as const,
      transaction_timestamp: new Date(timestamp * 1000).toISOString(),
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabaseServer
      .from("ton_transactions")
      .insert(transactionData)
      .select("id")
      .single();
    
    if (error) {
      console.error(`[TON_MONITOR] ❌ Error creating transaction record:`, error);
      return null;
    }
    
    console.log(`[TON_MONITOR] ✅ Created transaction record: ${data.id}`);
    return data.id;
    
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Exception creating transaction record:`, error);
    return null;
  }
}

/**
 * Начисление попыток пользователю
 */
async function creditAttemptsToUser(
  telegramId: number,
  attemptsToAdd: number
): Promise<boolean> {
  try {
    console.log(`[TON_MONITOR] 💎 Crediting ${attemptsToAdd} attempts to user ${telegramId}`);
    
    // Получаем текущую информацию о пользователе
    const { data: userData, error: fetchError } = await supabaseServer
      .from("users")
      .select("id, attempts_remaining, first_name, last_name")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    
    if (fetchError) {
      console.error(`[TON_MONITOR] ❌ Error fetching user data:`, fetchError);
      return false;
    }
    
    if (!userData) {
      console.error(`[TON_MONITOR] ❌ User not found: ${telegramId}`);
      return false;
    }
    
    // Обновляем количество попыток
    const newAttemptsCount = userData.attempts_remaining + attemptsToAdd;
    
    const { error: updateError } = await supabaseServer
      .from("users")
      .update({
        attempts_remaining: newAttemptsCount,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegramId);
    
    if (updateError) {
      console.error(`[TON_MONITOR] ❌ Error updating user attempts:`, updateError);
      return false;
    }
    
    console.log(
      `[TON_MONITOR] ✅ Successfully credited attempts. User ${telegramId}: ${userData.attempts_remaining} → ${newAttemptsCount}`
    );
    
    return true;
    
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Exception crediting attempts:`, error);
    return false;
  }
}

/**
 * Обновление статуса TON заказа
 */
async function updateTONOrderStatus(
  uniqueId: string,
  status: "completed"
): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from("ton_orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("unique_id", uniqueId);
    
    if (error) {
      console.error(`[TON_MONITOR] ⚠️ Error updating order status:`, error);
    } else {
      console.log(`[TON_MONITOR] ✅ Updated order status to ${status}: ${uniqueId}`);
    }
    
  } catch (error) {
    console.error(`[TON_MONITOR] ⚠️ Exception updating order status:`, error);
  }
}

/**
 * Отправка уведомления пользователю через Telegram Bot
 */
async function sendTelegramNotification(
  telegramId: number,
  productInfo: ReturnType<typeof getTONProductInfo>,
  transactionHash: string
): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_API!;
    const message = `🎉 *Платеж успешно обработан!*

💰 Получено: *${productInfo.priceTON} TON*
🎯 Товар: *${productInfo.title}*
🎮 Получено попыток: *+${productInfo.attempts}*

🔗 Транзакция: \`${transactionHash}\`

Ваши попытки уже доступны в игре! 🚀`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }
    
    console.log(`[TON_MONITOR] 📱 Notification sent to user ${telegramId}`);
    return true;
    
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Error sending Telegram notification:`, error);
    return false;
  }
}

/**
 * Обработка одного платежа
 */
async function processPayment(payment: {
  eventId: string;
  transactionHash: string;
  senderWallet: string;
  amountNanotons: bigint;
  comment: string;
  timestamp: number;
  lt: number;
}): Promise<{ success: boolean; error?: string }> {
  const { transactionHash, senderWallet, amountNanotons, comment, timestamp } = payment;
  
  try {
    console.log(`[TON_MONITOR] 🔄 Processing payment: ${transactionHash}`);
    
    // Проверяем, не обработан ли уже этот платеж
    const alreadyExists = await transactionExists(transactionHash);
    if (alreadyExists) {
      console.log(`[TON_MONITOR] ⏭️ Transaction already processed: ${transactionHash}`);
      return { success: true };
    }
    
    // Парсим payload
    const parsedPayload = parseTONPayload(comment);
    if (!parsedPayload.isValid) {
      console.log(`[TON_MONITOR] ⚠️ Invalid payload: ${comment} - ${parsedPayload.error}`);
      return { success: false, error: `Invalid payload: ${parsedPayload.error}` };
    }
    
    const { telegramId, productType, uniqueId } = parsedPayload;
    
    // Получаем информацию о продукте и проверяем сумму
    const productInfo = getTONProductInfo(productType!);
    const expectedAmountNanotons = BigInt(productInfo.priceNanotons);
    
    // Проверяем, что сумма достаточна (допускаем небольшое отклонение)
    const minimumAmount = (expectedAmountNanotons * BigInt(95)) / BigInt(100); // 95% от ожидаемой суммы
    if (amountNanotons < minimumAmount) {
      console.log(
        `[TON_MONITOR] ⚠️ Insufficient amount: ${amountNanotons} < ${minimumAmount} (expected: ${expectedAmountNanotons})`
      );
      return { 
        success: false, 
        error: `Insufficient amount: ${amountNanotons} < ${expectedAmountNanotons}` 
      };
    }
    
    // Создаем запись о транзакции
    const transactionId = await createTONTransaction(
      transactionHash,
      senderWallet,
      telegramId!,
      productType!,
      uniqueId!,
      amountNanotons,
      expectedAmountNanotons,
      comment,
      timestamp
    );
    
    if (!transactionId) {
      return { success: false, error: "Failed to create transaction record" };
    }
    
    // Начисляем попытки пользователю
    const attemptsResult = await creditAttemptsToUser(telegramId!, productInfo.attempts);
    if (!attemptsResult) {
      console.error(`[TON_MONITOR] ❌ Failed to credit attempts, but transaction is recorded`);
    }
    
    // Обновляем статус заказа
    await updateTONOrderStatus(uniqueId!, "completed");
    
    // Отправляем уведомление
    await sendTelegramNotification(telegramId!, productInfo, transactionHash);
    
    console.log(`[TON_MONITOR] ✅ Payment processed successfully: ${transactionHash}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[TON_MONITOR] ❌ Error processing payment ${transactionHash}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[TON_MONITOR] 🚀 Starting TON payments monitoring at ${new Date().toISOString()}`);
  
  try {
    // Проверяем API ключ для CRON доступа (поддерживаем query param и Authorization header)
    const cronApiKeyFromQuery = request.nextUrl.searchParams.get("key");
    const authHeader = request.headers.get("authorization");
    const cronApiKeyFromHeader = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : null;
    
    const cronApiKey = cronApiKeyFromQuery || cronApiKeyFromHeader;
    const expectedCronKey = process.env.CRON_API_KEY;
    
    if (!cronApiKey || cronApiKey !== expectedCronKey) {
      console.log(`[TON_MONITOR] ❌ Unauthorized access attempt`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Проверяем переменные окружения
    const envValidation = validateEnvironmentVariables();
    if (!envValidation.isValid) {
      console.error(`[TON_MONITOR] ❌ Missing environment variables: ${envValidation.missing.join(", ")}`);
      return NextResponse.json(
        { error: "Server configuration error", missing: envValidation.missing },
        { status: 500 }
      );
    }
    
    // Инициализируем статистику
    const stats: ProcessingStats = {
      totalChecked: 0,
      newTransactions: 0,
      processedTransactions: 0,
      failedTransactions: 0,
      notificationsSet: 0,
      errors: [],
    };
    
    // Получаем количество часов для проверки (по умолчанию 2 часа)
    const lookbackHours = parseInt(process.env.TON_TRANSACTION_LOOKBACK || "2", 10);
    
    // Получаем события для корпоративного кошелька
    const events = await fetchAccountEvents(TON_CONFIG.CORPORATE_WALLET, lookbackHours);
    stats.totalChecked = events.length;
    
    // Извлекаем входящие платежи
    const payments = parseIncomingPayments(events);
    stats.newTransactions = payments.length;
    
    console.log(`[TON_MONITOR] 📊 Found ${payments.length} potential payments in ${events.length} events`);
    
    // Обрабатываем каждый платеж
    for (const payment of payments) {
      const result = await processPayment(payment);
      
      if (result.success) {
        stats.processedTransactions++;
      } else {
        stats.failedTransactions++;
        if (result.error) {
          stats.errors.push(`${payment.transactionHash}: ${result.error}`);
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[TON_MONITOR] ✅ Monitoring completed in ${executionTime}ms`);
    console.log(`[TON_MONITOR] 📊 Stats:`, {
      totalChecked: stats.totalChecked,
      newTransactions: stats.newTransactions,
      processed: stats.processedTransactions,
      failed: stats.failedTransactions,
      errors: stats.errors.length,
    });
    
    // Возвращаем результат
    return NextResponse.json({
      success: true,
      executionTime,
      stats: {
        totalChecked: stats.totalChecked,
        newTransactions: stats.newTransactions,
        processedTransactions: stats.processedTransactions,
        failedTransactions: stats.failedTransactions,
        errorsCount: stats.errors.length,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[TON_MONITOR] ❌ Fatal error during monitoring:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
