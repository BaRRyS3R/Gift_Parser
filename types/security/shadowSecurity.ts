// src/types/security/shadowSecurity.ts - Enhanced types with gyroscope monitoring capabilities

import { GameMode } from "@/types/game-modes/common";

/**
 * Interface for tracking individual click record
 */
export interface ClickRecord {
  circleId: number;
  activationTime: number;
  clickTime: number;
  reactionTime: number;
  isSuspicious: boolean;
}

/**
 * Interface for tracking gyroscope movement data
 */
export interface GyroscopeMovementRecord {
  timestamp: number;
  alpha: number | null; // Z-axis rotation
  beta: number | null; // X-axis rotation
  gamma: number | null; // Y-axis rotation
  movementDetected: boolean;
  sensitivityThreshold: number; // Threshold used for this check
}

/**
 * Interface for gyroscope monitoring state
 */
export interface GyroscopeMonitoringState {
  enabled: boolean;
  permissionGranted: boolean;
  dataAvailable: boolean;
  errorReason: string | null;
  checkIntervals: number[]; // Array of intervals between checks in ms
  movementRecords: GyroscopeMovementRecord[];
  lastCheckTime: number;
  nextCheckTime: number;
  minimumSensitivity: number; // Configurable sensitivity threshold (default: 1.0 degrees)
}

/**
 * Enhanced interface for aggregated suspicious activity data with gyroscope monitoring
 */
export interface SuspiciousActivityData {
  telegramId: number;
  gameMode: GameMode;

  // Click monitoring data
  totalClicks: number;
  suspiciousClicksCount: number;
  minReactionTime: number;
  maxReactionTime: number;
  avgReactionTime: number;

  // Gyroscope monitoring data
  gyroscopeEnabled: boolean;
  gyroscopePermissionGranted: boolean;
  gyroscopeDataAvailable: boolean;
  totalGyroscopeChecks: number;
  gyroscopeMovementsDetected: number;
  gyroscopeMovementPercentage: number;
  gyroscopeSuspicious: boolean;
  gyroscopeErrorReason: string | null;
  gyroscopeMinSensitivity: number;
  gyroscopeCheckIntervals: number[]; // For temporal analysis

  // Timing data
  gameStartTime: number;
  gameEndTime: number;
}

/**
 * Enhanced interface for database record structure
 */
export interface SuspiciousActivityRecord {
  id?: string;
  telegram_id: number;
  game_mode: string;

  // Click monitoring fields
  total_clicks: number;
  suspicious_clicks_count: number;
  min_reaction_time: number;
  max_reaction_time: number;
  avg_reaction_time: number;

  // Gyroscope monitoring fields
  gyroscope_enabled: boolean;
  gyroscope_permission_granted: boolean;
  gyroscope_data_available: boolean;
  total_gyroscope_checks: number;
  gyroscope_movements_detected: number;
  gyroscope_movement_percentage: number;
  gyroscope_suspicious: boolean;
  gyroscope_error_reason: string | null;
  gyroscope_min_sensitivity: number;
  gyroscope_check_intervals_ms: string; // JSON string of number array

  // Timing fields
  game_start_time: string;
  game_end_time: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Enhanced interface for shadow security manager internal state
 */
export interface ShadowSecurityState {
  isEnabled: boolean;
  gameMode: GameMode;
  gameStartTime: number;
  suspiciousThreshold: number;

  // Click tracking state
  clickRecords: ClickRecord[];
  circleActivationTimes: Map<number, number>;

  // Gyroscope tracking state
  gyroscopeMonitoring: GyroscopeMonitoringState;
}

/**
 * Configuration interface for gyroscope monitoring
 */
export interface GyroscopeMonitoringConfig {
  enabled: boolean;
  sensitivityThreshold: number; // Movement detection threshold in degrees (default: 1.0)
  suspiciousMovementThreshold: number; // Percentage threshold for suspicious activity (default: 10.0)
  maxCheckInterval: number; // Maximum interval between checks in ms (default: 5000)
  minCheckInterval: number; // Minimum interval between checks in ms (default: 1000)
  requirePermissionCheck: boolean; // Whether to verify permission before monitoring
}

/**
 * Interface for gyroscope monitoring results
 */
export interface GyroscopeMonitoringResult {
  totalChecks: number;
  movementsDetected: number;
  movementPercentage: number;
  isSuspicious: boolean;
  errorReason: string | null;
  checkIntervals: number[];
  averageCheckInterval: number;
}

/**
 * Interface for API request to submit enhanced suspicious activity
 */
export interface SubmitSuspiciousActivityRequest {
  suspiciousActivity: SuspiciousActivityData;
}

/**
 * Interface for API response from suspicious activity submission
 */
export interface SubmitSuspiciousActivityResponse {
  success: boolean;
  error?: string;
}

/**
 * Enhanced interface for admin statistics retrieval
 */
export interface SuspiciousActivityStats {
  totalRecords: number;
  averageSuspiciousPercentage: number;

  // Click-based statistics
  clickSuspiciousGames: number;
  averageClickSuspiciousPercentage: number;

  // Gyroscope-based statistics
  gyroscopeEnabledGames: number;
  gyroscopeSuspiciousGames: number;
  averageGyroscopeMovementPercentage: number;

  // Combined statistics
  combinedSuspiciousGames: number;

  // User analysis
  mostSuspiciousUsers: Array<{
    telegram_id: number;
    suspicious_percentage: number;
    gyroscope_movement_percentage: number;
    total_games: number;
    risk_score: number;
  }>;

  // Error analysis
  gyroscopeErrors: Array<{
    error_reason: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Interface for getUserSuspiciousActivity response
 */
export interface GetUserSuspiciousActivityResponse {
  success: boolean;
  data?: SuspiciousActivityRecord[];
  error?: string;
}

/**
 * Interface for getSuspiciousActivityStats response
 */
export interface GetSuspiciousActivityStatsResponse {
  success: boolean;
  data?: SuspiciousActivityStats;
  error?: string;
}

/**
 * Enum for common gyroscope error reasons
 */
export enum GyroscopeErrorReason {
  PERMISSION_DENIED = "permission_denied",
  NOT_SUPPORTED = "not_supported",
  DATA_UNAVAILABLE = "data_unavailable",
  DEVICE_ORIENTATION_UNAVAILABLE = "device_orientation_unavailable",
  TEMPORARY_FAILURE = "temporary_failure",
  INITIALIZATION_FAILED = "initialization_failed",
}

/**
 * Interface for gyroscope capability detection result
 */
export interface GyroscopeCapabilityResult {
  isSupported: boolean;
  requiresPermission: boolean;
  permissionGranted: boolean;
  dataAvailable: boolean;
  errorReason: GyroscopeErrorReason | null;
}

/**
 * Type guard to check if activity data contains gyroscope monitoring
 */
export function hasGyroscopeMonitoring(data: SuspiciousActivityData): boolean {
  return data.gyroscopeEnabled && data.totalGyroscopeChecks > 0;
}

/**
 * Type guard to check if activity is suspicious (either clicks or gyroscope)
 */
export function hasAnySuspiciousActivity(
  data: SuspiciousActivityData,
): boolean {
  return data.suspiciousClicksCount > 0 || data.gyroscopeSuspicious;
}

/**
 * Helper function to calculate combined risk score
 */
export function calculateCombinedRiskScore(
  data: SuspiciousActivityData,
): number {
  let riskScore = 0;

  // Click-based risk (40% weight)
  if (data.totalClicks > 0) {
    const clickSuspiciousPercentage =
      (data.suspiciousClicksCount / data.totalClicks) * 100;

    riskScore += clickSuspiciousPercentage * 0.4;
  }

  // Gyroscope-based risk (30% weight)
  if (data.gyroscopeEnabled && data.totalGyroscopeChecks > 0) {
    const gyroscopeRisk = Math.max(0, 100 - data.gyroscopeMovementPercentage);

    riskScore += gyroscopeRisk * 0.3;
  }

  // Game duration factor (20% weight)
  const gameDurationMinutes =
    (data.gameEndTime - data.gameStartTime) / (1000 * 60);
  const durationRisk = Math.min(30, gameDurationMinutes * 2); // Longer games = higher risk

  riskScore += durationRisk * 0.2;

  // Error presence factor (10% weight)
  if (data.gyroscopeEnabled && data.gyroscopeErrorReason) {
    riskScore += 10; // Fixed penalty for gyroscope errors
  }

  return Math.round(riskScore * 100) / 100; // Round to 2 decimal places
}
