// src/components/Security/NebulaGyroscopeModal.tsx - Обновленная версия без проверки поддержки устройства

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Compass,
    RotateCcw,
    Clock,
    CheckCircle2,
    XCircle,
    Smartphone,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface NebulaGyroscopeModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
    skipDeviceCheck?: boolean; // Новый пропс для пропуска проверки устройства
}

type GyroscopePhase =
    | "initializing"
    | "instructions"
    | "verification"
    | "success"
    | "error";

interface GyroscopeData {
    alpha: number | null; // Z-axis rotation
    beta: number | null; // X-axis rotation
    gamma: number | null; // Y-axis rotation
}

interface GyroscopeState {
    currentPhase: GyroscopePhase;
    verificationTimeRemaining: number;
    isVerifying: boolean;
    error: string | null;
    attemptMade: boolean;
    verificationTimerActive: boolean;
    detectedMovements: number;
    requiredMovements: number;
}

// Конфигурация временных интервалов
const TIMING_CONFIG = {
    VERIFICATION_TIMEOUT: 20000, // 20 секунд
    MOVEMENT_THRESHOLD: 12, // 12 градусов для движения
    MOVEMENT_COOLDOWN: 800, // 800мс между движениями
    REQUIRED_MOVEMENTS: 3, // 3 движения
    DATA_AVAILABILITY_TIMEOUT: 4000, // 4 секунды для проверки данных
} as const;

const NebulaGyroscopeModal: React.FC<NebulaGyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
    skipDeviceCheck = false,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();

    // Рефы для данных гироскопа и детекции движений
    const gyroscopeDataRef = useRef<GyroscopeData>({
        alpha: null,
        beta: null,
        gamma: null,
    });
    const lastMovementTimeRef = useRef<number>(0);
    const initialDataRef = useRef<GyroscopeData>({
        alpha: null,
        beta: null,
        gamma: null,
    });
    const eventListenerRef = useRef<
        ((event: DeviceOrientationEvent) => void) | null
    >(null);

    const [state, setState] = useState<GyroscopeState>({
        currentPhase: "initializing",
        verificationTimeRemaining: TIMING_CONFIG.VERIFICATION_TIMEOUT,
        isVerifying: false,
        error: null,
        attemptMade: false,
        verificationTimerActive: false,
        detectedMovements: 0,
        requiredMovements: TIMING_CONFIG.REQUIRED_MOVEMENTS,
    });

    // Сброс состояния при открытии/закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            setState({
                currentPhase: "initializing",
                verificationTimeRemaining: TIMING_CONFIG.VERIFICATION_TIMEOUT,
                isVerifying: false,
                error: null,
                attemptMade: false,
                verificationTimerActive: false,
                detectedMovements: 0,
                requiredMovements: TIMING_CONFIG.REQUIRED_MOVEMENTS,
            });

            gyroscopeDataRef.current = { alpha: null, beta: null, gamma: null };
            lastMovementTimeRef.current = 0;
            initialDataRef.current = { alpha: null, beta: null, gamma: null };

            // Очистка обработчиков событий
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            return;
        }

        if (attemptId) {
            if (skipDeviceCheck) {
                // Пропускаем проверку устройства и сразу показываем инструкции
                setState((prev) => ({
                    ...prev,
                    currentPhase: "instructions",
                }));
            } else {
                // Оставляем старую логику для совместимости
                setState((prev) => ({
                    ...prev,
                    currentPhase: "instructions",
                }));
            }
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
            }));
        }
    }, [isOpen, attemptId, skipDeviceCheck, t]);

    // Таймер для фазы верификации
    useEffect(() => {
        if (!state.verificationTimerActive || state.currentPhase !== "verification")
            return;

        const timer = setInterval(() => {
            setState((prev) => {
                const newTime = prev.verificationTimeRemaining - 100;

                if (newTime <= 0) {
                    handleVerificationTimeout();
                    return { ...prev, verificationTimeRemaining: 0 };
                }

                return { ...prev, verificationTimeRemaining: newTime };
            });
        }, 100);

        return () => clearInterval(timer);
    }, [state.verificationTimerActive, state.currentPhase]);

    /**
     * Обработка тайм-аута верификации
     */
    const handleVerificationTimeout = useCallback(() => {
        console.log("Gyroscope verification timeout");
        setState((prev) => ({ ...prev, verificationTimerActive: false }));
        handleVerificationFailure(t("nebula.gyroscope.errors.timeout"));
    }, [t]);

    /**
     * Обработка неудачи верификации
     */
    const handleVerificationFailure = useCallback(
        async (reason: string) => {
            console.log("Gyroscope verification failed:", reason);
            setState((prev) => ({
                ...prev,
                error: reason,
                currentPhase: "error",
                verificationTimerActive: false,
            }));

            // Очистка обработчика событий
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            if (attemptId) {
                try {
                    await makeAuthenticatedRequest("/api/nebula/gyroscope", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            success: false,
                            completedInTime: false,
                            deviceSupported: true, // Устройство уже проверено на странице
                            attemptId,
                        }),
                    });
                } catch (error) {
                    console.error("Error sending gyroscope failure to API:", error);
                }
            }

            setTimeout(() => onFailure(), 1000);
        },
        [makeAuthenticatedRequest, onFailure, attemptId],
    );

    /**
     * Обработка успешной верификации с фактическим количеством движений
     */
    const handleVerificationSuccess = useCallback(
        async (actualMovements?: number) => {
            console.log("Gyroscope verification successful");
            setState((prev) => ({
                ...prev,
                verificationTimerActive: false,
                currentPhase: "success",
            }));

            // Очистка обработчика событий
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            if (attemptId) {
                try {
                    const response = await makeAuthenticatedRequest(
                        "/api/nebula/gyroscope",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success: true,
                                completedInTime: true,
                                deviceSupported: true, // Устройство уже проверено на странице
                                attemptId,
                                movementData: {
                                    totalMovements: actualMovements ?? state.detectedMovements,
                                    requiredMovements: TIMING_CONFIG.REQUIRED_MOVEMENTS,
                                    timeSpent: TIMING_CONFIG.VERIFICATION_TIMEOUT - state.verificationTimeRemaining,
                                    significantMovements: true,
                                },
                            }),
                        },
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || "Verification failed");
                    }

                    if (result.verified && result.trustRestored) {
                        console.log("Gyroscope verification validated successfully");
                        setTimeout(() => onSuccess(), 1500);
                    } else if (result.blocked) {
                        console.log("Gyroscope verification validation failed");
                        handleVerificationFailure(
                            result.blockReason || t("nebula.gyroscope.errors.verificationFailed"),
                        );
                    } else {
                        throw new Error("Unexpected verification result");
                    }
                } catch (error) {
                    console.error("Error validating gyroscope:", error);
                    handleVerificationFailure(t("nebula.gyroscope.errors.verificationFailed"));
                }
            } else {
                setTimeout(() => onSuccess(), 1500);
            }
        },
        [
            state.verificationTimeRemaining,
            state.detectedMovements,
            makeAuthenticatedRequest,
            onSuccess,
            attemptId,
            t,
        ],
    );

    /**
     * Начало процесса верификации
     */
    const handleStartVerification = () => {
        if (state.isVerifying || state.attemptMade) return;

        console.log("Starting gyroscope verification");
        setState((prev) => ({
            ...prev,
            isVerifying: true,
            attemptMade: true,
            currentPhase: "verification",
            verificationTimeRemaining: TIMING_CONFIG.VERIFICATION_TIMEOUT,
            verificationTimerActive: true,
            detectedMovements: 0,
            error: null,
        }));

        // Настройка обработчика событий ориентации устройства
        const handleOrientationChange = (event: DeviceOrientationEvent) => {
            const currentData: GyroscopeData = {
                alpha: event.alpha, // Z-axis (compass heading)
                beta: event.beta, // X-axis (front-to-back tilt)
                gamma: event.gamma, // Y-axis (left-to-right tilt)
            };

            // Сохранение начальных значений для сравнения
            if (initialDataRef.current.alpha === null && currentData.alpha !== null) {
                initialDataRef.current = { ...currentData };
                console.log("Initial gyroscope data captured:", initialDataRef.current);
                return;
            }

            // Детекция значимых движений
            detectMovement(currentData);

            // Обновление текущих данных
            gyroscopeDataRef.current = currentData;
        };

        eventListenerRef.current = handleOrientationChange;
        window.addEventListener("deviceorientation", handleOrientationChange);

        // Автоматическая неудача если данные гироскопа не получены в течение времени
        setTimeout(() => {
            if (
                gyroscopeDataRef.current.alpha === null &&
                gyroscopeDataRef.current.beta === null &&
                gyroscopeDataRef.current.gamma === null
            ) {
                console.log("No gyroscope data received - device likely doesn't support it");
                handleVerificationFailure(t("nebula.gyroscope.errors.noData"));
            }
        }, TIMING_CONFIG.DATA_AVAILABILITY_TIMEOUT);
    };

    /**
     * Детекция значимых движений в данных гироскопа
     */
    const detectMovement = (currentData: GyroscopeData) => {
        const now = Date.now();

        // Предотвращение быстрых повторных детекций движения
        if (now - lastMovementTimeRef.current < TIMING_CONFIG.MOVEMENT_COOLDOWN) {
            return;
        }

        const initial = initialDataRef.current;

        if (
            initial.alpha === null ||
            initial.beta === null ||
            initial.gamma === null ||
            currentData.alpha === null ||
            currentData.beta === null ||
            currentData.gamma === null
        ) {
            return;
        }

        // Вычисление различий от начального положения
        const alphaDiff = Math.abs((currentData.alpha || 0) - (initial.alpha || 0));
        const betaDiff = Math.abs((currentData.beta || 0) - (initial.beta || 0));
        const gammaDiff = Math.abs((currentData.gamma || 0) - (initial.gamma || 0));

        // Нормализация различия alpha для обработки перехода 0-360
        const normalizedAlphaDiff = Math.min(alphaDiff, 360 - alphaDiff);

        // Проверка значимого движения по любой оси
        const significantMovement =
            normalizedAlphaDiff > TIMING_CONFIG.MOVEMENT_THRESHOLD ||
            betaDiff > TIMING_CONFIG.MOVEMENT_THRESHOLD ||
            gammaDiff > TIMING_CONFIG.MOVEMENT_THRESHOLD;

        if (significantMovement) {
            console.log("Movement detected:", {
                alpha: normalizedAlphaDiff.toFixed(1),
                beta: betaDiff.toFixed(1),
                gamma: gammaDiff.toFixed(1),
            });

            lastMovementTimeRef.current = now;
            setState((prev) => {
                const newCount = prev.detectedMovements + 1;

                // Проверка завершения верификации
                if (newCount >= TIMING_CONFIG.REQUIRED_MOVEMENTS) {
                    handleVerificationSuccess(newCount);
                }

                return {
                    ...prev,
                    detectedMovements: newCount,
                };
            });
        }
    };

    /**
     * Форматирование оставшегося времени
     */
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    /**
     * Получение процента прогресса
     */
    const getProgressPercentage = (): number => {
        return Math.min(100, (state.detectedMovements / TIMING_CONFIG.REQUIRED_MOVEMENTS) * 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Заголовок */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {state.currentPhase === "error" ? (
                                <XCircle className="text-red-400" size={48} />
                            ) : state.currentPhase === "success" ? (
                                <CheckCircle2 className="text-green-400" size={48} />
                            ) : (
                                <Compass className="text-blue-400" size={48} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {state.currentPhase === "success"
                            ? t("nebula.gyroscope.success.title")
                            : t("nebula.gyroscope.title")}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? t("nebula.gyroscope.success.message")
                            : t("nebula.gyroscope.subtitle")}
                    </p>
                </div>

                {/* Основной контент */}
                {!attemptId ? (
                    <div className="text-center py-4">
                        <p className="text-red-400">{t("nebula.captcha.noAttemptId")}</p>
                        <button
                            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                            onClick={onFailure}
                        >
                            {t("nebula.common.close")}
                        </button>
                    </div>
                ) : state.currentPhase === "initializing" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Compass className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {t("nebula.gyroscope.initializing")}
                        </p>
                    </div>
                ) : state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {t("nebula.gyroscope.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {t("nebula.gyroscope.blockWarningFailed")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "instructions" ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Smartphone className="text-blue-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">
                                {t("nebula.gyroscope.movementInstructions")}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {t("nebula.gyroscope.deviceInstructions")}
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                {t("nebula.gyroscope.requiredMovements")}
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>{t("nebula.gyroscope.movement1")}</p>
                                <p>{t("nebula.gyroscope.movement2")}</p>
                                <p>{t("nebula.gyroscope.movement3")}</p>
                                <p className="text-blue-300 font-medium mt-2">
                                    {t("nebula.gyroscope.movementCount", { count: TIMING_CONFIG.REQUIRED_MOVEMENTS })}
                                </p>
                            </div>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                            onClick={handleStartVerification}
                        >
                            <Compass size={20} />
                            <span>{t("nebula.gyroscope.startVerification")}</span>
                        </button>
                    </div>
                ) : state.currentPhase === "verification" ? (
                    <div className="space-y-6">
                        {/* Таймер */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span
                                className={`font-bold ${state.verificationTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
                            >
                                {formatTime(state.verificationTimeRemaining)}
                            </span>
                            <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                        </div>

                        {/* Прогресс движений */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">
                                    {t("nebula.gyroscope.movementsDetected")}
                                </span>
                                <span className="text-blue-400 font-bold">
                                    {state.detectedMovements}/{TIMING_CONFIG.REQUIRED_MOVEMENTS}
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                                <div
                                    className="h-3 rounded-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${getProgressPercentage()}%` }}
                                />
                            </div>
                            <p className="text-gray-400 text-xs text-center">
                                {t("nebula.gyroscope.moveDevice")}
                            </p>
                        </div>

                        {/* Текущая инструкция */}
                        <div className="text-center">
                            <div className="mb-3">
                                <RotateCcw
                                    className="text-blue-400 mx-auto animate-spin"
                                    size={32}
                                    style={{ animationDuration: "2s" }}
                                />
                            </div>
                            <p className="text-white font-medium">
                                {state.detectedMovements === 0
                                    ? t("nebula.gyroscope.startMoving")
                                    : state.detectedMovements < TIMING_CONFIG.REQUIRED_MOVEMENTS
                                        ? t("nebula.gyroscope.keepMoving")
                                        : t("nebula.gyroscope.verificationComplete")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            {t("nebula.gyroscope.success.restoring")}
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NebulaGyroscopeModal;