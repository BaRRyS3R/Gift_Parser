// src/lib/telegram-auth.ts - Telegram WebApp data validation with client/server separation

import crypto from 'crypto';
import type { TelegramUser } from './supabase';

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

// Server-side only: Get bot token
const getTelegramBotToken = (): string => {
  if (typeof window !== 'undefined') {
    throw new Error('Bot token access is only allowed on server side');
  }
  
  const botToken = process.env.TELEGRAM_BOT_API;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_API environment variable is required for server-side validation');
  }
  
  return botToken;
};

/**
 * SERVER-SIDE ONLY: Validates Telegram WebApp initData using official algorithm
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramWebAppData(initData: string): ValidationResult {
  // Ensure this function is only called on server side
  if (typeof window !== 'undefined') {
    throw new Error('Telegram validation must be performed on server side');
  }

  try {
    const botToken = getTelegramBotToken();
    
    // Parse the initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return {
        isValid: false,
        error: 'Missing hash parameter'
      };
    }

    // Remove hash from params for validation
    urlParams.delete('hash');
    
    // Create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key using bot token
    const secretKeyBuffer = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Convert Buffer to Uint8Array for compatibility
    const secretKey = new Uint8Array(secretKeyBuffer);

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (hash !== expectedHash) {
      return {
        isValid: false,
        error: 'Invalid hash signature'
      };
    }

    // Check auth_date (should not be older than 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours

    if (currentTime - authDate > maxAge) {
      return {
        isValid: false,
        error: 'Auth data is too old'
      };
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      return {
        isValid: false,
        error: 'Missing user data'
      };
    }

    let user: TelegramUser;
    try {
      user = JSON.parse(userParam);
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid user data format'
      };
    }

    // Validate required user fields
    if (!user.id || !user.first_name) {
      return {
        isValid: false,
        error: 'Missing required user fields'
      };
    }

    // Construct parsed initData
    const parsedInitData: TelegramInitData = {
      auth_date: authDate,
      hash,
      user
    };

    // Add optional fields
    if (urlParams.get('query_id')) {
      parsedInitData.query_id = urlParams.get('query_id')!;
    }
    if (urlParams.get('start_param')) {
      parsedInitData.start_param = urlParams.get('start_param')!;
    }
    if (urlParams.get('can_send_after')) {
      parsedInitData.can_send_after = parseInt(urlParams.get('can_send_after')!);
    }

    return {
      isValid: true,
      user,
      initData: parsedInitData
    };

  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return {
      isValid: false,
      error: 'Validation failed'
    };
  }
}

/**
 * CLIENT-SIDE: Parse Telegram WebApp initData without cryptographic validation
 * This function safely runs in the browser and only parses the data structure
 */
export function parseTelegramInitData(initData: string): ParseResult {
  try {
    // Handle development mock data
    if (process.env.NODE_ENV === 'development' && initData === 'mock_init_data_for_development') {
      return {
        success: true,
        user: {
          id: 430743609,
          first_name: 'Test User',
          last_name: 'Developer',
          username: 'testuser',
          language_code: 'en',
          is_premium: false,
        },
        initData: {
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'mock_hash'
        }
      };
    }

    // Parse the initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return {
        success: false,
        error: 'Missing hash parameter'
      };
    }

    // Parse auth_date
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    
    if (!authDate) {
      return {
        success: false,
        error: 'Missing or invalid auth_date'
      };
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      return {
        success: false,
        error: 'Missing user data'
      };
    }

    let user: TelegramUser;
    try {
      user = JSON.parse(userParam);
    } catch (error) {
      return {
        success: false,
        error: 'Invalid user data format'
      };
    }

    // Validate required user fields
    if (!user.id || !user.first_name) {
      return {
        success: false,
        error: 'Missing required user fields'
      };
    }

    // Basic time validation (not older than 48 hours for client-side)
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 48 * 60 * 60; // 48 hours (more lenient for client-side)

    if (currentTime - authDate > maxAge) {
      return {
        success: false,
        error: 'Auth data appears to be too old'
      };
    }

    // Construct parsed initData
    const parsedInitData: TelegramInitData = {
      auth_date: authDate,
      hash,
      user
    };

    // Add optional fields
    if (urlParams.get('query_id')) {
      parsedInitData.query_id = urlParams.get('query_id')!;
    }
    if (urlParams.get('start_param')) {
      parsedInitData.start_param = urlParams.get('start_param')!;
    }
    if (urlParams.get('can_send_after')) {
      parsedInitData.can_send_after = parseInt(urlParams.get('can_send_after')!);
    }

    return {
      success: true,
      user,
      initData: parsedInitData
    };

  } catch (error) {
    console.error('Error parsing Telegram data:', error);
    return {
      success: false,
      error: 'Failed to parse Telegram data'
    };
  }
}

/**
 * Validates Telegram WebApp data with additional security checks (SERVER-SIDE ONLY)
 */
export function validateTelegramWebAppDataStrict(initData: string): ValidationResult {
  if (typeof window !== 'undefined') {
    throw new Error('Strict validation must be performed on server side');
  }

  const basicValidation = validateTelegramWebAppData(initData);
  
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const { user, initData: parsedData } = basicValidation;

  // Additional validation checks
  if (!user || !parsedData) {
    return {
      isValid: false,
      error: 'Missing validated data'
    };
  }

  // Check if user ID is valid (positive integer)
  if (user.id <= 0) {
    return {
      isValid: false,
      error: 'Invalid user ID'
    };
  }

  // Check auth_date is not in the future
  const authDate = parsedData.auth_date;
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (authDate > currentTime + 60) { // Allow 1 minute clock skew
    return {
      isValid: false,
      error: 'Auth date is in the future'
    };
  }

  return basicValidation;
}

/**
 * Extract referral code from Telegram start parameter (SAFE FOR CLIENT-SIDE)
 */
export function extractReferralCode(initData: string): string | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const startParam = urlParams.get('start_param');
    
    // Validate referral code format (8 uppercase alphanumeric characters)
    if (startParam && /^[A-Z0-9]{8}$/.test(startParam)) {
      return startParam;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting referral code:', error);
    return null;
  }
}

/**
 * Creates a hash of initData for additional security tracking (SERVER-SIDE ONLY)
 */
export function createInitDataHash(initData: string): string {
  if (typeof window !== 'undefined') {
    throw new Error('Hash creation must be performed on server side');
  }

  return crypto
    .createHash('sha256')
    .update(initData)
    .digest('hex');
}

/**
 * Main validation function that chooses appropriate method based on environment
 */
export function validateTelegramData(initData: string): ValidationResult {
  // This function should only be called on server side
  if (typeof window !== 'undefined') {
    throw new Error('validateTelegramData must be called on server side. Use parseTelegramInitData for client side.');
  }

  if (process.env.NODE_ENV === 'development') {
    // Allow mock data in development
    if (initData === 'mock_init_data_for_development') {
      return {
        isValid: true,
        user: {
          id: 430743609,
          first_name: 'Test User',
          last_name: 'Developer',
          username: 'testuser',
          language_code: 'en',
          is_premium: false,
        },
        initData: {
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'mock_hash'
        }
      };
    }
  }
  
  return validateTelegramWebAppDataStrict(initData);
}

/**
 * CLIENT-SIDE: Get initData from Telegram WebApp (SAFE FOR BROWSER)
 */
export function getTelegramInitData(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // Production: use real Telegram data
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using mock initData for development');
    return 'mock_init_data_for_development';
  }

  return '';
}