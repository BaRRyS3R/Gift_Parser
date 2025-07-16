// src/types/security.ts - Updated security system types

export interface SecurityCheckResult {
    isBlocked: boolean;
    needsCaptcha: boolean;
    needsBiometric: boolean;
    needsGyroscope: boolean;
    trustScore: number;
    timeUntilUnblock?: number;
    blockReason?: string;
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

export interface CaptchaData {
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
}

export interface BiometricData {
    isSupported: boolean;
    isInitialized: boolean;
    biometricType: "finger" | "face" | "unknown";
    isAccessGranted: boolean;
}

export interface GyroscopeData {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

export interface DeviceOrientationData {
    alpha: number;
    beta: number;
    gamma: number;
    timestamp: number;
}

export interface GyroscopeVerificationData {
    gyroscopeData: GyroscopeData[];
    orientationData: DeviceOrientationData[];
    stepCompletions: boolean[];
    totalTime: number;
}

export interface SecurityValidationResult {
    success: boolean;
    newTrustScore: number;
    blocked?: boolean;
    message?: string;
}

export interface TrustScoreThresholds {
    CAPTCHA_THRESHOLD: 50;
    BIOMETRIC_THRESHOLD: 20;
    GYROSCOPE_THRESHOLD: 10;
}

export interface BlockDurations {
    CAPTCHA_FAILED: 2; // minutes
    BIOMETRIC_FAILED: 1440; // 24 hours in minutes
    GYROSCOPE_FAILED: 525600; // 1 year in minutes
    SUSPICIOUS_ACTIVITY: 10; // minutes
}

export interface TrustScoreUpdates {
    CAPTCHA_SUCCESS: 40;
    CAPTCHA_FAILED: 19;
    BIOMETRIC_SUCCESS: 39;
    BIOMETRIC_FAILED: 9;
    GYROSCOPE_SUCCESS: 19;
    // GYROSCOPE_FAILED: no change (keeps existing low score)
}

export type BlockReason =
    | "captcha_failed"
    | "biometric_failed"
    | "gyroscope_failed"
    | "suspicious_activity";

export type SecurityVerificationType =
    | "captcha"
    | "biometric"
    | "gyroscope";

export type TrustScoreLevel =
    | "critical"   // 0-9
    | "low"        // 10-19  
    | "fair"       // 20-49
    | "good";      // 50-100

export interface SecurityModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    title?: string;
    description?: string;
}

export interface SecurityHookReturn {
    // State
    securityState: SecurityState;
    showCaptcha: boolean;
    showBiometric: boolean;
    showGyroscope: boolean;
    captchaData: CaptchaData | null;
    isSilentCheck: boolean;

    // Actions
    checkSecurity: () => Promise<SecurityCheckResult>;
    performSilentCheck: () => Promise<void>;
    handleCaptchaSuccess: () => void;
    handleCaptchaFailure: () => void;
    handleBiometricSuccess: () => void;
    handleBiometricFailure: () => void;
    handleGyroscopeSuccess: () => void;
    handleGyroscopeFailure: () => void;
    dismissSecurityCheck: () => void;
    refreshSecurityStatus: () => Promise<void>;

    // Utils
    isSecurityCheckNeeded: () => boolean;
    formatTrustScore: (score: number) => { color: string; label: string };
}

export interface BlockInfo {
    isBlocked: boolean;
    timeUntilUnblock?: number;
    blockReason?: string;
    trustScore: number;
    unblockDate?: Date;
}

// Constants
export const SECURITY_THRESHOLDS: TrustScoreThresholds = {
    CAPTCHA_THRESHOLD: 50,
    BIOMETRIC_THRESHOLD: 20,
    GYROSCOPE_THRESHOLD: 10,
} as const;

export const BLOCK_DURATIONS: BlockDurations = {
    CAPTCHA_FAILED: 2,
    BIOMETRIC_FAILED: 1440,
    GYROSCOPE_FAILED: 525600,
    SUSPICIOUS_ACTIVITY: 10,
} as const;

export const TRUST_SCORE_UPDATES: TrustScoreUpdates = {
    CAPTCHA_SUCCESS: 40,
    CAPTCHA_FAILED: 19,
    BIOMETRIC_SUCCESS: 39,
    BIOMETRIC_FAILED: 9,
    GYROSCOPE_SUCCESS: 19,
} as const;

// Utility functions
export function getTrustScoreLevel(score: number): TrustScoreLevel {
    if (score < 10) return "critical";
    if (score < 20) return "low";
    if (score < 50) return "fair";
    return "good";
}

export function getRequiredVerification(score: number): SecurityVerificationType | null {
    if (score < SECURITY_THRESHOLDS.GYROSCOPE_THRESHOLD) return "gyroscope";
    if (score < SECURITY_THRESHOLDS.BIOMETRIC_THRESHOLD) return "biometric";
    if (score < SECURITY_THRESHOLDS.CAPTCHA_THRESHOLD) return "captcha";
    return null;
}

export function formatBlockDuration(reason: BlockReason): string {
    switch (reason) {
        case "captcha_failed":
            return "2 minutes";
        case "biometric_failed":
            return "24 hours";
        case "gyroscope_failed":
            return "1 year";
        case "suspicious_activity":
            return "10 minutes";
        default:
            return "Unknown";
    }
}

export function isTemporaryBlock(reason?: BlockReason): boolean {
    return reason !== "gyroscope_failed";
}