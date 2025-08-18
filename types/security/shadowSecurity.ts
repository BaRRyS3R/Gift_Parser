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
 * Enhanced type guard to check if activity is suspicious
 * Now includes detection of ultra-short gaming sessions as potentially suspicious
 * UPDATED: Includes ultra-short session detection for bot identification
 */
export function hasAnySuspiciousActivity(
  data: SuspiciousActivityData,
): boolean {
  // Проверка подозрительных кликов
  const hasSuspiciousClicks = data.suspiciousClicksCount > 0;

  // Проверка подозрительной активности гироскопа
  const hasSuspiciousGyroscope =
    data.gyroscopeEnabled && data.gyroscopeSuspicious;

  // Проверка недоступности гироскопа (исключая iOS оптимизацию)
  const hasGyroscopeUnavailability =
    !data.gyroscopeEnabled &&
    data.gyroscopeErrorReason !== null &&
    data.gyroscopeErrorReason !== "ios_optimization_disabled";

  // НОВОЕ: Проверка ультракоротких сессий (менее 3 секунд)
  const gameDuration = data.gameEndTime - data.gameStartTime;
  const isUltraShortSession = gameDuration < 3000;

  // Считаем ультракороткие сессии подозрительными только если есть клики
  // Это помогает выявлять ботов, которые быстро кликают и выходят
  const suspiciousShortSession = isUltraShortSession && data.totalClicks > 0;

  // Логирование для мониторинга ультракоротких сессий
  if (suspiciousShortSession) {
    console.log(
      `Shadow Security: Ultra-short session detected - Duration: ${gameDuration}ms, Clicks: ${data.totalClicks}`,
    );
  }

  return (
    hasSuspiciousClicks ||
    hasSuspiciousGyroscope ||
    hasGyroscopeUnavailability ||
    suspiciousShortSession
  );
}

/**
 * Enhanced helper function to calculate combined risk score
 * Provides a unified metric for ranking suspicious behavior across all factors
 * UPDATED: Now includes ultra-short session detection and extreme reaction time analysis
 */
export function calculateCombinedRiskScore(
  data: SuspiciousActivityData,
): number {
  let riskScore = 0;

  // Factor 1: Suspicious click percentage (weight: 40%)
  if (data.totalClicks > 0) {
    const clickSuspiciousPercentage =
      (data.suspiciousClicksCount / data.totalClicks) * 100;

    riskScore += clickSuspiciousPercentage * 0.4;
  }

  // Factor 2: Lack of gyroscope movement (weight: 25%)
  if (data.gyroscopeEnabled && data.totalGyroscopeChecks > 0) {
    const lackOfMovement = 100 - data.gyroscopeMovementPercentage;

    riskScore += lackOfMovement * 0.25;
  }

  // Factor 3: Ultra-short session (weight: 20%)
  const gameDuration = data.gameEndTime - data.gameStartTime;

  if (gameDuration < 3000 && data.totalClicks > 0) {
    // Максимальный штраф для сессий менее 1 секунды
    const shortSessionPenalty = Math.max(0, 100 - gameDuration / 30);

    riskScore += shortSessionPenalty * 0.2;
  }

  // Factor 4: Extreme reaction times (weight: 10%)
  if (data.minReactionTime < 100) {
    // Сверхчеловеческое время реакции (< 100мс)
    riskScore += 10;
  } else if (data.minReactionTime < 150) {
    // Подозрительно быстрое время реакции (100-150мс)
    riskScore += 5;
  }

  // Factor 5: Gyroscope error presence (weight: 5%)
  if (
    data.gyroscopeEnabled &&
    data.gyroscopeErrorReason &&
    data.gyroscopeErrorReason !== "ios_optimization_disabled"
  ) {
    riskScore += 5;
  }

  // Ограничиваем максимальное значение 100
  return Math.min(100, Math.round(riskScore * 100) / 100);
}

/**
 * Helper function to categorize suspicious activity severity
 * Provides clear categorization for administrative review and automated actions
 */
export function categorizeSuspiciousActivitySeverity(
  data: SuspiciousActivityData,
): "none" | "low" | "medium" | "high" | "critical" {
  const riskScore = calculateCombinedRiskScore(data);

  if (riskScore === 0) return "none";
  if (riskScore < 20) return "low";
  if (riskScore < 40) return "medium";
  if (riskScore < 70) return "high";

  return "critical";
}

/**
 * Helper function to format suspicious activity summary for logging
 * Provides human-readable summary of all suspicious indicators
 */
export function formatSuspiciousActivitySummary(
  data: SuspiciousActivityData,
): string {
  const details: string[] = [];
  const gameDuration = data.gameEndTime - data.gameStartTime;

  // Информация о длительности игры
  if (gameDuration < 3000) {
    details.push(`ultra-short session (${gameDuration}ms)`);
  } else if (gameDuration < 10000) {
    details.push(`short session (${Math.round(gameDuration / 1000)}s)`);
  }

  // Информация о кликах
  if (data.suspiciousClicksCount > 0) {
    const percentage =
      data.totalClicks > 0
        ? Math.round((data.suspiciousClicksCount / data.totalClicks) * 100)
        : 0;

    details.push(
      `${data.suspiciousClicksCount}/${data.totalClicks} suspicious clicks (${percentage}%)`,
    );
  } else if (data.totalClicks > 0) {
    details.push(`${data.totalClicks} normal clicks`);
  }

  // Информация о гироскопе
  if (data.gyroscopeEnabled) {
    if (data.totalGyroscopeChecks === 0) {
      details.push("no gyroscope checks (ended too quickly)");
    } else {
      details.push(
        `gyroscope movement: ${data.gyroscopeMovementPercentage.toFixed(1)}%` +
          (data.gyroscopeSuspicious ? " [SUSPICIOUS]" : ""),
      );
    }
  } else if (data.gyroscopeErrorReason) {
    details.push(`gyroscope: ${data.gyroscopeErrorReason}`);
  }

  // Информация о времени реакции
  if (data.totalClicks > 0) {
    const reactionInfo = `reaction times: ${data.minReactionTime}-${data.maxReactionTime}ms (avg: ${data.avgReactionTime}ms)`;

    if (data.minReactionTime < 100) {
      details.push(reactionInfo + " [SUPERHUMAN]");
    } else if (data.minReactionTime < 150) {
      details.push(reactionInfo + " [VERY FAST]");
    } else {
      details.push(reactionInfo);
    }
  }

  // Добавляем уровень риска
  const severity = categorizeSuspiciousActivitySeverity(data);
  const riskScore = calculateCombinedRiskScore(data);

  if (severity !== "none") {
    details.push(`risk: ${severity.toUpperCase()} (${riskScore.toFixed(1)}%)`);
  }

  return details.join(", ");
}

/**
 * Helper function to determine if a session is ultra-short
 * Used for quick identification of potentially automated behavior
 */
export function isUltraShortSession(data: SuspiciousActivityData): boolean {
  const gameDuration = data.gameEndTime - data.gameStartTime;

  return gameDuration < 3000 && data.totalClicks > 0;
}

/**
 * Helper function to calculate click rate per second
 * Useful for identifying inhuman clicking speeds
 */
export function calculateClickRate(data: SuspiciousActivityData): number {
  const gameDurationSeconds = (data.gameEndTime - data.gameStartTime) / 1000;

  if (gameDurationSeconds === 0) return 0;

  return Math.round((data.totalClicks / gameDurationSeconds) * 100) / 100;
}

/**
 * Helper function to check if reaction times are humanly possible
 * Returns true if reaction times suggest automated behavior
 */
export function hasInhumanReactionTimes(data: SuspiciousActivityData): boolean {
  // Человеческая реакция редко бывает стабильно ниже 150мс
  return (
    data.minReactionTime < 150 &&
    data.avgReactionTime < 200 &&
    data.totalClicks > 5
  ); // Требуем несколько кликов для надежности
}

/**
 * Helper function to generate detailed risk assessment
 * Returns comprehensive analysis for administrative review
 */
export function generateRiskAssessment(data: SuspiciousActivityData): {
  riskScore: number;
  severity: "none" | "low" | "medium" | "high" | "critical";
  factors: string[];
  recommendations: string[];
} {
  const riskScore = calculateCombinedRiskScore(data);
  const severity = categorizeSuspiciousActivitySeverity(data);
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Анализ факторов риска
  if (data.suspiciousClicksCount > 0) {
    const percentage = Math.round(
      (data.suspiciousClicksCount / data.totalClicks) * 100,
    );

    factors.push(`${percentage}% suspicious clicks detected`);
  }

  if (isUltraShortSession(data)) {
    factors.push("Ultra-short gaming session detected");
    recommendations.push("Review for automated script usage");
  }

  if (hasInhumanReactionTimes(data)) {
    factors.push("Inhuman reaction times detected");
    recommendations.push("Investigate for bot/macro usage");
  }

  if (data.gyroscopeEnabled && data.gyroscopeSuspicious) {
    factors.push("Lack of device movement during gameplay");
    recommendations.push("Check for emulator or desktop usage");
  }

  const clickRate = calculateClickRate(data);

  if (clickRate > 10) {
    factors.push(`Extremely high click rate: ${clickRate} clicks/sec`);
    recommendations.push("Review for auto-clicker usage");
  }

  // Генерация рекомендаций на основе уровня риска
  if (severity === "critical") {
    recommendations.push("Consider immediate account review");
    recommendations.push("Flag for manual investigation");
  } else if (severity === "high") {
    recommendations.push("Monitor future gaming sessions");
    recommendations.push("Consider temporary restrictions");
  } else if (severity === "medium") {
    recommendations.push("Add to watchlist for pattern analysis");
  }

  return {
    riskScore,
    severity,
    factors,
    recommendations,
  };
}
