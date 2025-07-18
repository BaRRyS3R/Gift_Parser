// src/lib/telegram-auth.ts - Telegram WebApp data validation

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

const TELEGRAM_BOT_API = process.env.TELEGRAM_BOT_API;

if (!TELEGRAM_BOT_API) {
  throw new Error('TELEGRAM_BOT_API environment variable is required');
}

// Ensure we have a valid token for crypto operations
const BOT_TOKEN: string = TELEGRAM_BOT_API;

/**
 * Validates Telegram WebApp initData using official algorithm
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramWebAppData(initData: string): ValidationResult {
  try {
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
      .update(BOT_TOKEN)
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
 * Validates Telegram WebApp data with additional security checks
 */
export function validateTelegramWebAppDataStrict(initData: string): ValidationResult {
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
 * Extract referral code from Telegram start parameter
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
 * Creates a hash of initData for additional security tracking
 */
export function createInitDataHash(initData: string): string {
  return crypto
    .createHash('sha256')
    .update(initData)
    .digest('hex');
}

/**
 * Validates initData for development environment
 * WARNING: Only use in development, not production!
 */
export function validateTelegramWebAppDataDev(initData: string): ValidationResult {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development validation can only be used in development environment');
  }

  // For development, accept mock data
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

  // Try normal validation first
  return validateTelegramWebAppDataStrict(initData);
}

/**
 * Main validation function that chooses appropriate method based on environment
 */
export function validateTelegramData(initData: string): ValidationResult {
  if (process.env.NODE_ENV === 'development') {
    return validateTelegramWebAppDataDev(initData);
  }
  
  return validateTelegramWebAppDataStrict(initData);
}