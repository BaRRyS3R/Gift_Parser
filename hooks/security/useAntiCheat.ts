// src/hooks/security/useAntiCheat.ts - Упрощенный хук без блокирующей валидации

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

    // Проверка готовности для отправки данных (не блокирующая)
    const canSubmitData = useCallback(() => {
        return Boolean(
            userId &&
            userId !== 'pending' &&
            userId !== 'temp_user' &&
            telegramId > 0 &&
            makeAuthenticatedRequest
        );
    }, [userId, telegramId, makeAuthenticatedRequest]);

    /**
     * Инициализирует новую анти-чит сессию (всегда успешно)
     */
    const startSession = useCallback(() => {
        try {
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
        } catch (error) {
            console.warn('[AntiCheat] Failed to start session:', error);
            // Не выбрасываем ошибку - продолжаем без античит системы
            setIsSessionActive(false);
            sessionRef.current = null;
        }
    }, [gameMode]);

    /**
     * Регистрирует активацию круга (не блокирующая операция)
     */
    const recordCircleActivation = useCallback((circleId: number, activationTime?: number) => {
        const session = sessionRef.current;
        if (!session || !isSessionActive) {
            return; // Тихо игнорируем если сессия не активна
        }

        try {
            const timestamp = activationTime || Date.now();
            session.circleActivationTimes.set(circleId, timestamp);
        } catch (error) {
            // Тихо игнорируем ошибки - не должны влиять на игру
        }
    }, [isSessionActive]);

    /**
     * Регистрирует успешный клик (не блокирующая операция)
     */
    const recordSuccessfulClick = useCallback((circleId: number, clickTime?: number) => {
        const session = sessionRef.current;
        if (!session || !isSessionActive) {
            return; // Тихо игнорируем если сессия не активна
        }

        try {
            const timestamp = clickTime || Date.now();
            const activationTime = session.circleActivationTimes.get(circleId);

            if (!activationTime) {
                return; // Нет времени активации - игнорируем
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
        } catch (error) {
            // Тихо игнорируем ошибки - не должны влиять на игру
        }
    }, [isSessionActive]);

    /**
     * Обновляет текущую статистику сессии
     */
    const updateCurrentStats = useCallback(() => {
        const session = sessionRef.current;
        if (!session) return;

        try {
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
        } catch (error) {
            // Тихо игнорируем ошибки статистики
        }
    }, []);

    /**
     * Завершает сессию и отправляет данные (не блокирующая операция)
     */
    const endSession = useCallback(async (gameResults: {
        maxLevelReached: number;
        survivalTime: number;
        finalScore: number;
    }): Promise<boolean> => {
        const session = sessionRef.current;

        // Очищаем сессию в любом случае
        const cleanup = () => {
            setIsSessionActive(false);
            sessionRef.current = null;
            setCurrentStats({
                totalClicks: 0,
                suspiciousClicks: 0,
                averageReactionTime: 0,
                fastestReactionTime: 0,
                slowestReactionTime: 0,
            });
        };

        if (!session || !isSessionActive) {
            cleanup();
            return false;
        }

        // Если не можем отправить данные - просто очищаем
        if (!canSubmitData()) {
            console.log('[AntiCheat] Cannot submit data - user not ready, cleaning up session');
            cleanup();
            return false;
        }

        try {
            const endTime = Date.now();

            // Подготавливаем данные для анализа
            const suspiciousClicks = session.clickReactions.filter(click => click.isSuspicious);
            const allReactionTimes = session.clickReactions.map(click => click.reactionTime);

            if (allReactionTimes.length === 0) {
                console.log('[AntiCheat] No clicks recorded, skipping report');
                cleanup();
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
                console.warn('[AntiCheat] Failed to submit activity data:', response.status);
                cleanup();
                return false;
            }

            const result: ReportSuspiciousActivityResponse = await response.json();

            // Логируем результат только для подозрительной активности
            if (result.analysis?.isSuspicious) {
                console.log('[AntiCheat] Suspicious activity detected:', {
                    sessionId: session.sessionId,
                    recorded: result.recorded,
                    suspiciousScore: result.analysis.suspiciousScore,
                });
            }

            cleanup();
            return true;
        } catch (error) {
            console.warn('[AntiCheat] Error ending session:', error);
            cleanup();
            return false;
        }
    }, [isSessionActive, userId, telegramId, makeAuthenticatedRequest, canSubmitData]);

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
            canSubmitData: canSubmitData(),
        };
    }, [isSessionActive, currentStats, canSubmitData]);

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