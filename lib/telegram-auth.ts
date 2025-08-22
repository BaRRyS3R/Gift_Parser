// src/lib/telegram-auth.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ с защитой от будущих дат

import type { TelegramUser } from "./supabase";

import crypto from "crypto";

// Telegram WebApp initData structure
export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    photo_url?: string;
  };
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  user?: TelegramUser;
  initData?: TelegramInitData;
  error?: string;
}

// Parse result for client-side use
export interface ParseResult {
  success: boolean;
  user?: TelegramUser;
  initData?: TelegramInitData;
  error?: string;
}

// 🚨 НОВАЯ ФУНКЦИЯ: Универсальная проверка auth_date
function validateAuthDate(authDate: number, maxAgeSeconds: number = 3600): {
  isValid: boolean;
  error?: string;
} {
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Проверка на валидность timestamp
  if (!authDate || authDate <= 0) {
    return {
      isValid: false,
      error: "Missing or invalid auth_date"
    };
  }
  
  // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверка будущих дат
  if (authDate > currentTime + 60) { // Максимум 1 минута на расхождение часов
    console.error(`[SECURITY] Future auth_date detected: ${authDate} vs ${currentTime} (diff: ${authDate - currentTime}s)`);
    return {
      isValid: false,
      error: "Auth date is in the future - possible security attack"
    };
  }
  
  // Проверка старых данных
  if (currentTime - authDate > maxAgeSeconds) {
    console.warn(`[SECURITY] Old auth_date detected: ${authDate}, age: ${currentTime - authDate} seconds`);
    return {
      isValid: false,
      error: `Auth data is too old (max age: ${maxAgeSeconds} seconds)`
    };
  }
  
  return { isValid: true };
}

// Server-side only: Get bot token
const getTelegramBotToken = (): string => {
  if (typeof window !== "undefined") {
    throw new Error("Bot token access is only allowed on server side");
  }

  const botToken = process.env.TELEGRAM_BOT_API;

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_API environment variable is required for server-side validation",
    );
  }

  return botToken;
};

/**
 * SERVER-SIDE ONLY: Validates Telegram WebApp initData using official algorithm
 * 🚨 УСИЛЕННАЯ ВЕРСИЯ с дополнительными проверками безопасности
 */
export function validateTelegramWebAppData(initData: string): ValidationResult {
  // Ensure this function is only called on server side
  if (typeof window !== "undefined") {
    throw new Error("Telegram validation must be performed on server side");
  }

  try {
    console.log(`[AUTH] Starting server-side validation of initData`);
    
    const botToken = getTelegramBotToken();

    // Parse the initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      console.error("[AUTH] Missing hash parameter");
      return {
        isValid: false,
        error: "Missing hash parameter",
      };
    }

    // 🚨 РАННЕЕ ИЗВЛЕЧЕНИЕ И ПРОВЕРКА AUTH_DATE
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    const authValidation = validateAuthDate(authDate, 3600); // 1 час для сервера
    
    if (!authValidation.isValid) {
      console.error(`[AUTH] Auth date validation failed: ${authValidation.error}`);
      return {
        isValid: false,
        error: authValidation.error,
      };
    }

    // Remove hash from params for validation
    urlParams.delete("hash");

    // Create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    console.log(`[AUTH] Data check string created: ${dataCheckString.substring(0, 100)}...`);

    // Create secret key using bot token
    const secretKeyBuffer = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Convert Buffer to Uint8Array for compatibility
    const secretKey = new Uint8Array(secretKeyBuffer);

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Verify hash
    if (hash !== expectedHash) {
      console.error(`[AUTH] Hash verification failed. Expected: ${expectedHash}, Received: ${hash}`);
      return {
        isValid: false,
        error: "Invalid hash signature",
      };
    }

    console.log(`[AUTH] Hash verification successful`);

    // Parse user data
    const userParam = urlParams.get("user");

    if (!userParam) {
      console.error("[AUTH] Missing user data");
      return {
        isValid: false,
        error: "Missing user data",
      };
    }

    let user: TelegramUser;

    try {
      user = JSON.parse(userParam);
    } catch (error) {
      console.error("[AUTH] Invalid user data format:", error);
      return {
        isValid: false,
        error: "Invalid user data format",
      };
    }

    // Validate required user fields
    if (!user.id || !user.first_name) {
      console.error("[AUTH] Missing required user fields");
      return {
        isValid: false,
        error: "Missing required user fields",
      };
    }

    // 🚨 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ БЕЗОПАСНОСТИ
    
    // Проверка на разумные значения user ID
    if (user.id <= 0 || user.id > 9999999999) { // Telegram user IDs are typically 9-10 digits
      console.error(`[AUTH] Suspicious user ID: ${user.id}`);
      return {
        isValid: false,
        error: "Invalid user ID",
      };
    }

    // Проверка длины имени
    if (user.first_name.length > 64 || (user.last_name && user.last_name.length > 64)) {
      console.error("[AUTH] Suspicious name length");
      return {
        isValid: false,
        error: "Invalid user data",
      };
    }

    // Construct parsed initData
    const parsedInitData: TelegramInitData = {
      auth_date: authDate,
      hash,
      user,
    };

    // Add optional fields
    if (urlParams.get("query_id")) {
      parsedInitData.query_id = urlParams.get("query_id")!;
    }
    if (urlParams.get("start_param")) {
      parsedInitData.start_param = urlParams.get("start_param")!;
    }
    if (urlParams.get("can_send_after")) {
      parsedInitData.can_send_after = parseInt(
        urlParams.get("can_send_after")!,
      );
    }

    console.log(`[AUTH] Server validation successful for user ${user.id} (${user.first_name})`);

    return {
      isValid: true,
      user,
      initData: parsedInitData,
    };
  } catch (error) {
    console.error("Error validating Telegram data:", error);

    return {
      isValid: false,
      error: "Validation failed",
    };
  }
}

/**
 * CLIENT-SIDE: Parse Telegram WebApp initData without cryptographic validation
 * 🚨 ИСПРАВЛЕННАЯ ВЕРСИЯ с правильной проверкой auth_date
 */
export function parseTelegramInitData(initData: string): ParseResult {
  try {
    console.log(`[CLIENT] Starting client-side parsing of initData`);

    // Handle development mock data
    if (
      process.env.NODE_ENV === "development" &&
      initData === "mock_init_data_for_development"
    ) {
      console.warn("[CLIENT] Using mock data for development");
      return {
        success: true,
        user: {
          id: 430743609,
          first_name: "Test User",
          last_name: "Developer",
          username: "testuser",
          language_code: "en",
          is_premium: false,
        },
        initData: {
          auth_date: Math.floor(Date.now() / 1000),
          hash: "mock_hash",
        },
      };
    }

    // Parse the initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      console.error("[CLIENT] Missing hash parameter");
      return {
        success: false,
        error: "Missing hash parameter",
      };
    }

    // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная проверка auth_date
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    
    // Используем универсальную функцию проверки (более мягкие ограничения для клиента)
    const authValidation = validateAuthDate(authDate, 24 * 60 * 60); // 24 часа для клиента
    
    if (!authValidation.isValid) {
      console.error(`[CLIENT] Auth date validation failed: ${authValidation.error}`);
      return {
        success: false,
        error: authValidation.error,
      };
    }

    // Parse user data
    const userParam = urlParams.get("user");

    if (!userParam) {
      console.error("[CLIENT] Missing user data");
      return {
        success: false,
        error: "Missing user data",
      };
    }

    let user: TelegramUser;

    try {
      user = JSON.parse(userParam);
    } catch (error) {
      console.error("[CLIENT] Invalid user data format:", error);
      return {
        success: false,
        error: "Invalid user data format",
      };
    }

    // Validate required user fields
    if (!user.id || !user.first_name) {
      console.error("[CLIENT] Missing required user fields");
      return {
        success: false,
        error: "Missing required user fields",
      };
    }

    // 🚨 БАЗОВЫЕ ПРОВЕРКИ БЕЗОПАСНОСТИ НА КЛИЕНТЕ
    if (user.id <= 0) {
      console.error(`[CLIENT] Invalid user ID: ${user.id}`);
      return {
        success: false,
        error: "Invalid user data",
      };
    }

    // Construct parsed initData
    const parsedInitData: TelegramInitData = {
      auth_date: authDate,
      hash,
      user,
    };

    // Add optional fields
    if (urlParams.get("query_id")) {
      parsedInitData.query_id = urlParams.get("query_id")!;
    }
    if (urlParams.get("start_param")) {
      parsedInitData.start_param = urlParams.get("start_param")!;
    }
    if (urlParams.get("can_send_after")) {
      parsedInitData.can_send_after = parseInt(
        urlParams.get("can_send_after")!,
      );
    }

    console.log(`[CLIENT] Client parsing successful for user ${user.id} (${user.first_name})`);

    return {
      success: true,
      user,
      initData: parsedInitData,
    };
  } catch (error) {
    console.error("Error parsing Telegram data:", error);

    return {
      success: false,
      error: "Failed to parse Telegram data",
    };
  }
}

/**
 * Validates Telegram WebApp data with additional security checks (SERVER-SIDE ONLY)
 * 🚨 УЛУЧШЕННАЯ ВЕРСИЯ с дополнительными проверками
 */
export function validateTelegramWebAppDataStrict(
  initData: string,
): ValidationResult {
  if (typeof window !== "undefined") {
    throw new Error("Strict validation must be performed on server side");
  }

  console.log("[AUTH] Starting strict validation");

  const basicValidation = validateTelegramWebAppData(initData);

  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const { user, initData: parsedData } = basicValidation;

  // Additional validation checks
  if (!user || !parsedData) {
    console.error("[AUTH] Missing validated data after basic validation");
    return {
      isValid: false,
      error: "Missing validated data",
    };
  }

  // 🚨 ДОПОЛНИТЕЛЬНЫЕ СТРОГИЕ ПРОВЕРКИ
  
  // Проверка разумности временной метки (не слишком старая даже для валидного диапазона)
  const currentTime = Math.floor(Date.now() / 1000);
  const authAge = currentTime - parsedData.auth_date;
  
  if (authAge > 1800) { // Более 30 минут - подозрительно для строгой проверки
    console.warn(`[AUTH] Auth data is quite old: ${authAge} seconds`);
    // Не блокируем, но логируем для мониторинга
  }

  console.log(`[AUTH] Strict validation passed for user ${user.id}`);

  return basicValidation;
}

/**
 * Extract referral code from Telegram start parameter (SAFE FOR CLIENT-SIDE)
 */
export function extractReferralCode(initData: string): string | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const startParam = urlParams.get("start_param");

    // Validate referral code format (8 uppercase alphanumeric characters)
    if (startParam && /^[A-Z0-9]{8}$/.test(startParam)) {
      return startParam;
    }

    return null;
  } catch (error) {
    console.error("Error extracting referral code:", error);

    return null;
  }
}

/**
 * Creates a hash of initData for additional security tracking (SERVER-SIDE ONLY)
 */
export function createInitDataHash(initData: string): string {
  if (typeof window !== "undefined") {
    throw new Error("Hash creation must be performed on server side");
  }

  return crypto.createHash("sha256").update(initData).digest("hex");
}

/**
 * Main validation function that chooses appropriate method based on environment
 * 🚨 УЛУЧШЕННАЯ ВЕРСИЯ с принудительными проверками
 */
export function validateTelegramData(initData: string): ValidationResult {
  // This function should only be called on server side
  if (typeof window !== "undefined") {
    throw new Error(
      "validateTelegramData must be called on server side. Use parseTelegramInitData for client side.",
    );
  }

  console.log("[AUTH] Main validation entry point");

  // 🚨 ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА В DEVELOPMENT
  if (process.env.NODE_ENV === "development") {
    console.warn("[AUTH] Development mode detected");
    
    // Разрешить только специальный mock
    if (initData === "mock_init_data_for_development") {
      console.log("[AUTH] Using development mock data");
      return {
        isValid: true,
        user: {
          id: 430743609,
          first_name: "Test User",
          last_name: "Developer",
          username: "testuser",
          language_code: "en",
          is_premium: false,
        },
        initData: {
          auth_date: Math.floor(Date.now() / 1000),
          hash: "mock_hash",
        },
      };
    }
    
    // 🚨 ВАЖНО: Даже в development выполняем ПОЛНУЮ валидацию настоящих данных
    console.log("[AUTH] Real data in development - performing full validation");
  }

  return validateTelegramWebAppDataStrict(initData);
}

/**
 * CLIENT-SIDE: Get initData from Telegram WebApp (SAFE FOR BROWSER)
 * 🚨 УЛУЧШЕННАЯ ВЕРСИЯ с дополнительными проверками
 */
export function getTelegramInitData(): string {
  if (typeof window === "undefined") {
    return "";
  }

  // Production: use real Telegram data
  if (window.Telegram?.WebApp?.initData) {
    console.log("[CLIENT] Retrieved initData from Telegram WebApp");
    return window.Telegram.WebApp.initData;
  }

  // Development fallback
  if (process.env.NODE_ENV === "development") {
    console.warn("Using mock initData for development");
    return "mock_init_data_for_development";
  }

  console.error("[CLIENT] No Telegram initData available");
  return "";
}

// 🚨 НОВАЯ ФУНКЦИЯ: Быстрая проверка auth_date без полной валидации
export function quickAuthDateCheck(initData: string): {
  isValid: boolean;
  error?: string;
  authDate?: number;
} {
  try {
    const urlParams = new URLSearchParams(initData);
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    
    const validation = validateAuthDate(authDate, 3600); // 1 час
    
    return {
      isValid: validation.isValid,
      error: validation.error,
      authDate: authDate
    };
  } catch (error) {
    return {
      isValid: false,
      error: "Failed to parse initData"
    };
  }
}