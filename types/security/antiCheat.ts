// src/types/security/antiCheat.ts - Типы для системы защиты от автоматизации

export interface ClickReactionTime {
    circleId: number;
    activationTime: number;
    clickTime: number;
    reactionTime: number;
    isSuspicious: boolean;
}

export interface SuspiciousActivityData {
    userId: string;
    telegramId: number;
    gameMode: 'survival' | 'rotation' | 'physics';

    // Статистика кликов
    suspiciousClicksCount: number;
    totalSuccessfulClicks: number;
    suspiciousClicksPercentage: number;

    // Времена реакции
    minReactionTime: number;
    maxReactionTime: number;
    avgReactionTime: number;

    // Информация об игре
    maxLevelReached: number;
    survivalTime: number;
    finalScore: number;
    gameSessionId?: string;

    // Детали подозрительных кликов
    suspiciousClicks: ClickReactionTime[];

    // Метаданные
    gameStartTime: number;
    gameEndTime: number;
    userAgent?: string;
    ipAddress?: string;
}

export interface AntiCheatConfig {
    // Пороговые значения
    suspiciousReactionTimeMs: number; // 600ms для начала
    minSuspiciousClicksToReport: number; // минимум кликов для записи
    minGameDurationMs: number; // минимальная длительность игры для анализа

    // Настройки анализа
    enableRealtimeDetection: boolean;
    enableEndGameAnalysis: boolean;
    logSuspiciousActivity: boolean;
}

export interface AntiCheatSession {
    sessionId: string;
    startTime: number;
    gameMode: 'survival' | 'rotation' | 'physics';

    // Накопленные данные
    clickReactions: ClickReactionTime[];
    circleActivationTimes: Map<number, number>;

    // Статистика в реальном времени
    totalClicks: number;
    suspiciousClicks: number;

    // Конфигурация
    config: AntiCheatConfig;
}

// Результат анализа подозрительной активности
export interface SuspiciousActivityAnalysis {
    isSuspicious: boolean;
    suspiciousScore: number; // 0-100
    suspiciousClicksCount: number;
    totalClicksAnalyzed: number;
    averageReactionTime: number;
    flaggedPatterns: string[];
    recommendations: string[];
}

// Интерфейс для API
export interface ReportSuspiciousActivityRequest {
    gameSessionData: SuspiciousActivityData;
}

export interface ReportSuspiciousActivityResponse {
    success: boolean;
    recorded: boolean;
    analysis?: SuspiciousActivityAnalysis;
    error?: string;
}

// Конфигурация по умолчанию
export const DEFAULT_ANTICHEAT_CONFIG: AntiCheatConfig = {
    suspiciousReactionTimeMs: 600, // тестовое значение
    minSuspiciousClicksToReport: 0, // записываем все для анализа
    minGameDurationMs: 5000, // минимум 5 секунд игры
    enableRealtimeDetection: false, // пока выключено
    enableEndGameAnalysis: true,
    logSuspiciousActivity: true,
};

// Утилиты для работы с данными
export const AntiCheatUtils = {
    calculateReactionTime: (activationTime: number, clickTime: number): number => {
        return clickTime - activationTime;
    },

    isSuspiciousReactionTime: (reactionTime: number, threshold: number): boolean => {
        return reactionTime < threshold && reactionTime > 0;
    },

    calculateSuspiciousPercentage: (suspicious: number, total: number): number => {
        return total > 0 ? Math.round((suspicious / total) * 100) : 0;
    },

    generateSessionId: (): string => {
        return `ac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    createClickReaction: (
        circleId: number,
        activationTime: number,
        clickTime: number,
        config: AntiCheatConfig
    ): ClickReactionTime => {
        const reactionTime = AntiCheatUtils.calculateReactionTime(activationTime, clickTime);
        const isSuspicious = AntiCheatUtils.isSuspiciousReactionTime(
            reactionTime,
            config.suspiciousReactionTimeMs
        );

        return {
            circleId,
            activationTime,
            clickTime,
            reactionTime,
            isSuspicious,
        };
    },
};