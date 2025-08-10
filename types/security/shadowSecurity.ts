// src/types/security/shadowSecurity.ts - Complete types for shadow security system

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
 * Interface for aggregated suspicious activity data that gets sent to server
 */
export interface SuspiciousActivityData {
    telegramId: number;
    gameMode: GameMode;
    totalClicks: number;
    suspiciousClicksCount: number;
    minReactionTime: number;
    maxReactionTime: number;
    avgReactionTime: number;
    gameStartTime: number;
    gameEndTime: number;
}

/**
 * Interface for database record structure
 */
export interface SuspiciousActivityRecord {
    id?: string;
    telegram_id: number;
    game_mode: string;
    total_clicks: number;
    suspicious_clicks_count: number;
    min_reaction_time: number;
    max_reaction_time: number;
    avg_reaction_time: number;
    game_start_time: string;
    game_end_time: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Interface for shadow security manager internal state
 */
export interface ShadowSecurityState {
    isEnabled: boolean;
    clickRecords: ClickRecord[];
    circleActivationTimes: Map<number, number>;
    gameMode: GameMode;
    gameStartTime: number;
    suspiciousThreshold: number;
}

/**
 * Interface for API request to submit suspicious activity
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
 * Interface for admin statistics retrieval
 */
export interface SuspiciousActivityStats {
    totalRecords: number;
    averageSuspiciousPercentage: number;
    mostSuspiciousUsers: Array<{
        telegram_id: number;
        suspicious_percentage: number;
        total_games: number;
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