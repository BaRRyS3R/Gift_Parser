// src/hooks/security/useAntiCheat.ts - Хук для управления анти-чит сессией

import { useState, useCallback, useRef } from "react";
import {
    AntiCheatSession,
    SuspiciousActivityData,
    ClickReactionTime,
    DEFAULT_ANTICHEAT_CONFIG,
    AntiCheatUtils,
    ReportSuspiciousActivityRequest,
    ReportSuspiciousActivityResponse,
} from "@/types/security/antiCheat";

interface UseAntiCheatProps {
    gameMode: 'survival' | 'rotation' | 'physics';
    userId: string;
    telegramId: number;
    makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

interface AntiCheatStats {
    totalClicks: number;
    suspiciousClicks: number;
    averageReactionTime: number;
    fastestReactionTime: number;
    slowestReactionTime: number;
}

export function useAntiCheat({
    gameMode,
    userId,
    telegramId,
    makeAuthenticatedRequest,
}: UseAntiCheatProps) {
    const sessionRef = useRef<AntiCheatSession | null>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [currentStats, setCurrentStats] = useState<AntiCheatStats>({
        totalClicks: 0,
        suspiciousClicks: 0,
        averageReactionTime: 0,
        fastestReactionTime: 0,
        slowestReactionTime: 0,
    });

    /**
     * Инициализирует новую анти-чит сессию
     */
    const startSession = useCallback(() => {
        const session: AntiCheatSession = {
            sessionId: AntiCheatUtils.generateSessionId(),
            startTime: Date.now(),
            gameMode,
            clickReactions: [],
            circleActivationTimes: new Map(),
            totalClicks: 0,
            suspiciousClicks: 0,
            config: DEFAULT_ANTICHEAT_CONFIG,
        };

        sessionRef.current = session;
        setIsSessionActive(true);
        setCurrentStats({
            totalClicks: 0,
            suspiciousClicks: 0,
            averageReactionTime: 0,
            fastestReactionTime: 0,
            slowestReactionTime: 0,
        });

        console.log(`[AntiCheat] Session started: ${session.sessionId}`);
    }, [gameMode]);

    /**
     * Регистрирует активацию круга
     */
    const recordCircleActivation = useCallback((circleId: number, activationTime?: number) => {
        const session = sessionRef.current;
        if (!session || !isSessionActive) return;

        const timestamp = activationTime || Date.now();
        session.circleActivationTimes.set(circleId, timestamp);
    }, [isSessionActive]);

    /**
     * Регистрирует успешный клик по кругу и анализирует время реакции
     */
    const recordSuccessfulClick = useCallback((circleId: number, clickTime?: number) => {
        const session = sessionRef.current;
        if (!session || !isSessionActive) return;

        const timestamp = clickTime || Date.now();
        const activationTime = session.circleActivationTimes.get(circleId);

        if (!activationTime) {
            console.warn(`[AntiCheat] No activation time found for circle ${circleId}`);
            return;
        }

        // Создаем запись о клике
        const clickReaction = AntiCheatUtils.createClickReaction(
            circleId,
            activationTime,
            timestamp,
            session.config
        );

        // Добавляем в сессию
        session.clickReactions.push(clickReaction);
        session.totalClicks++;

        if (clickReaction.isSuspicious) {
            session.suspiciousClicks++;
        }

        // Очищаем время активации после обработки
        session.circleActivationTimes.delete(circleId);

        // Обновляем статистику в реальном времени
        updateCurrentStats();

        // Логируем подозрительные клики для отладки (только в dev режиме)
        if (clickReaction.isSuspicious && process.env.NODE_ENV === 'development') {
            console.log(`[AntiCheat] Suspicious click detected:`, {
                circleId,
                reactionTime: clickReaction.reactionTime,
                threshold: session.config.suspiciousReactionTimeMs,
            });
        }
    }, [isSessionActive]);

    /**
     * Обновляет текущую статистику сессии
     */
    const updateCurrentStats = useCallback(() => {
        const session = sessionRef.current;
        if (!session) return;

        const reactionTimes = session.clickReactions.map(click => click.reactionTime);

        if (reactionTimes.length === 0) {
            return;
        }

        const averageReactionTime = reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length;
        const fastestReactionTime = Math.min(...reactionTimes);
        const slowestReactionTime = Math.max(...reactionTimes);

        setCurrentStats({
            totalClicks: session.totalClicks,
            suspiciousClicks: session.suspiciousClicks,
            averageReactionTime: Math.round(averageReactionTime),
            fastestReactionTime,
            slowestReactionTime,
        });
    }, []);

    /**
     * Завершает сессию и отправляет данные на сервер
     */
    const endSession = useCallback(async (gameResults: {
        maxLevelReached: number;
        survivalTime: number;
        finalScore: number;
    }): Promise<boolean> => {
        const session = sessionRef.current;
        if (!session || !isSessionActive) {
            console.warn('[AntiCheat] No active session to end');
            return false;
        }

        try {
            const endTime = Date.now();

            // Подготавливаем данные для анализа
            const suspiciousClicks = session.clickReactions.filter(click => click.isSuspicious);
            const allReactionTimes = session.clickReactions.map(click => click.reactionTime);

            if (allReactionTimes.length === 0) {
                console.log('[AntiCheat] No clicks recorded, skipping report');
                setIsSessionActive(false);
                sessionRef.current = null;
                return true;
            }

            // Вычисляем статистику
            const minReactionTime = Math.min(...allReactionTimes);
            const maxReactionTime = Math.max(...allReactionTimes);
            const avgReactionTime = allReactionTimes.reduce((sum, time) => sum + time, 0) / allReactionTimes.length;
            const suspiciousPercentage = AntiCheatUtils.calculateSuspiciousPercentage(
                suspiciousClicks.length,
                session.totalClicks
            );

            // Формируем данные для отправки
            const activityData: SuspiciousActivityData = {
                userId,
                telegramId,
                gameMode: session.gameMode,
                suspiciousClicksCount: suspiciousClicks.length,
                totalSuccessfulClicks: session.totalClicks,
                suspiciousClicksPercentage: suspiciousPercentage,
                minReactionTime,
                maxReactionTime,
                avgReactionTime: Math.round(avgReactionTime),
                maxLevelReached: gameResults.maxLevelReached,
                survivalTime: gameResults.survivalTime,
                finalScore: gameResults.finalScore,
                gameSessionId: session.sessionId,
                suspiciousClicks,
                gameStartTime: session.startTime,
                gameEndTime: endTime,
            };

            // Отправляем данные на сервер (shadow operation)
            const requestData: ReportSuspiciousActivityRequest = {
                gameSessionData: activityData,
            };

            const response = await makeAuthenticatedRequest('/api/security/suspicious-activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                console.error('[AntiCheat] Failed to submit activity data:', response.status);
                return false;
            }

            const result = await response.json();

            // Логируем результат только для подозрительной активности
            if (result.analysis?.isSuspicious) {
                console.log('[AntiCheat] Suspicious activity analysis completed:', {
                    sessionId: session.sessionId,
                    recorded: result.recorded,
                    suspiciousScore: result.analysis.suspiciousScore,
                });
            }

            return true;
        } catch (error) {
            console.error('[AntiCheat] Error ending session:', error);
            return false;
        } finally {
            // Очищаем сессию
            setIsSessionActive(false);
            sessionRef.current = null;
            setCurrentStats({
                totalClicks: 0,
                suspiciousClicks: 0,
                averageReactionTime: 0,
                fastestReactionTime: 0,
                slowestReactionTime: 0,
            });
        }
    }, [isSessionActive, userId, telegramId, makeAuthenticatedRequest]);

    /**
     * Принудительно завершает сессию без отправки данных
     */
    const forceEndSession = useCallback(() => {
        if (sessionRef.current) {
            console.log(`[AntiCheat] Force ending session: ${sessionRef.current.sessionId}`);
        }

        setIsSessionActive(false);
        sessionRef.current = null;
        setCurrentStats({
            totalClicks: 0,
            suspiciousClicks: 0,
            averageReactionTime: 0,
            fastestReactionTime: 0,
            slowestReactionTime: 0,
        });
    }, []);

    /**
     * Получает текущее состояние сессии
     */
    const getSessionInfo = useCallback(() => {
        return {
            isActive: isSessionActive,
            sessionId: sessionRef.current?.sessionId,
            startTime: sessionRef.current?.startTime,
            stats: currentStats,
        };
    }, [isSessionActive, currentStats]);

    return {
        // Методы управления сессией
        startSession,
        endSession,
        forceEndSession,

        // Методы записи событий
        recordCircleActivation,
        recordSuccessfulClick,

        // Информация о состоянии
        isSessionActive,
        currentStats,
        getSessionInfo,
    };
}