// src/types/security.ts - Types for the enhanced security system

export type SecurityType = "captcha" | "biometric" | "gyroscope";

export interface SecurityCheckResult {
    isBlocked: boolean;
    needsCaptcha: boolean;
    needsBiometric: boolean;
    needsGyroscope?: boolean; // NEW: Added gyroscope requirement
    trustScore: number;
    timeUntilUnblock?: number;
    blockReason?: string;
}

export interface CaptchaData {
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
}

export interface SecurityValidationResult {
    success: boolean;
    newTrustScore: number;
}

export interface GyroscopeData {
    isSupported: boolean;
    motionDetected: boolean;
    motionIntensity: number;
    threshold: number;
}

export interface BiometricData {
    isSupported: boolean;
    isInitialized: boolean;
    biometricType: "finger" | "face" | "unknown";
    isAccessGranted: boolean;
}

export interface SecurityState {
    isLoading: boolean;
    isBlocked: boolean;
    needsCaptcha: boolean;
    needsBiometric: boolean;
    needsGyroscope: boolean;
    trustScore: number;
    timeUntilUnblock?: number;
    blockReason?: string;
    lastChecked?: number;
}

export interface SecurityModalProps {
    isOpen: boolean;
    type: SecurityType;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
}

// Trust score thresholds
export const TRUST_SCORE_THRESHOLDS = {
    GYROSCOPE: 10,   // Below this requires gyroscope
    BIOMETRIC: 20,   // Below this requires biometric  
    CAPTCHA: 40,     // Below this requires captcha
    GOOD: 60,        // Above this is considered good
} as const;

// Block reasons
export type BlockReason = "captcha_failed" | "biometric_failed" | "suspicious_activity";

// Block durations in minutes
export const BLOCK_DURATIONS = {
    CAPTCHA_FAILED: 2,
    BIOMETRIC_FAILED: 5,
    SUSPICIOUS_ACTIVITY: 10,
} as const;

// Security timeouts in milliseconds
export const SECURITY_TIMEOUTS = {
    CAPTCHA: 10000,      // 10 seconds
    BIOMETRIC: 15000,    // 15 seconds
    GYROSCOPE: 10000,    // 10 seconds
} as const;

// Trust score changes
export const TRUST_SCORE_CHANGES = {
    CAPTCHA_SUCCESS: 40,
    CAPTCHA_FAILURE: -20,
    BIOMETRIC_SUCCESS: 20,
    BIOMETRIC_FAILURE: -20,
    GYROSCOPE_SUCCESS: 40,
    GYROSCOPE_FAILURE: -20,
} as const;