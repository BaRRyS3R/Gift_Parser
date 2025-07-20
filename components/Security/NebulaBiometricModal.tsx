// src/components/Security/NebulaBiometricModal.tsx - Обновленная версия без проверки поддержки устройства

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Fingerprint,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface NebulaBiometricModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
    skipDeviceCheck?: boolean; // Новый пропс для пропуска проверки устройства
}

type BiometricType = "finger" | "face" | "unknown";

type AuthPhase =
    | "initializing"
    | "auth"
    | "success"
    | "error";

interface BiometricState {
    currentPhase: AuthPhase;
    biometricManager: any;
    biometricType: BiometricType;
    authTimeRemaining: number;
    isAuthenticating: boolean;
    error: string | null;
    attemptMade: boolean;
    authTimerActive: boolean;
}

// Конфигурация временных интервалов
const TIMING_CONFIG = {
    AUTH_TIMEOUT: 20000, // 20 секунд на аутентификацию
} as const;

const NebulaBiometricModal: React.FC<NebulaBiometricModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
    skipDeviceCheck = false,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();

    const [state, setState] = useState<BiometricState>({
        currentPhase: "initializing",
        biometricManager: null,
        biometricType: "unknown",
        authTimeRemaining: TIMING_CONFIG.AUTH_TIMEOUT,
        isAuthenticating: false,
        error: null,
        attemptMade: false,
        authTimerActive: false,
    });

    // Сброс состояния при открытии/закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            setState({
                currentPhase: "initializing",
                biometricManager: null,
                biometricType: "unknown",
                authTimeRemaining: TIMING_CONFIG.AUTH_TIMEOUT,
                isAuthenticating: false,
                error: null,
                attemptMade: false,
                authTimerActive: false,
            });
            return;
        }

        if (attemptId) {
            if (skipDeviceCheck) {
                // Пропускаем проверку устройства и сразу инициализируем биометрию
                initializeBiometricManager();
            } else {
                // Оставляем старую логику для совместимости
                initializeBiometric();
            }
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
            }));
        }
    }, [isOpen, attemptId, skipDeviceCheck, t]);

    // Таймер для фазы аутентификации
    useEffect(() => {
        if (!state.authTimerActive || state.currentPhase !== "auth") return;

        const timer = setInterval(() => {
            setState((prev) => {
                const newTime = prev.authTimeRemaining - 100;

                if (newTime <= 0) {
                    handleAuthTimeout();
                    return { ...prev, authTimeRemaining: 0 };
                }

                return { ...prev, authTimeRemaining: newTime };
            });
        }, 100);

        return () => clearInterval(timer);
    }, [state.authTimerActive, state.currentPhase]);

    /**
     * Упрощенная инициализация только BiometricManager (без проверок поддержки)
     */
    const initializeBiometricManager = async () => {
        console.log("Initializing BiometricManager for authentication");

        if (typeof window === "undefined") {
            console.log("Window not available");
            handleBiometricFailure("Window environment not available");
            return;
        }

        const tg = window.Telegram?.WebApp;

        if (!tg?.BiometricManager) {
            console.log("BiometricManager not available");
            handleBiometricFailure(t("nebula.biometric.errors.unavailable"));
            return;
        }

        const manager = tg.BiometricManager;

        manager.init(() => {
            console.log("BiometricManager initialized for authentication");
            setState((prev) => ({
                ...prev,
                biometricManager: manager,
                biometricType: manager.biometricType || "unknown",
            }));

            // Сразу переходим к аутентификации
            startAuthentication();
        });
    };

    /**
     * Старая логика инициализации (для совместимости)
     */
    const initializeBiometric = async () => {
        console.log("Initializing biometric authentication with device checks");
        // Здесь можно оставить старую логику или также упростить
        initializeBiometricManager();
    };

    /**
     * Начало процесса аутентификации
     */
    const startAuthentication = useCallback(() => {
        console.log("Starting biometric authentication");
        setState((prev) => ({
            ...prev,
            currentPhase: "auth",
            authTimeRemaining: TIMING_CONFIG.AUTH_TIMEOUT,
            authTimerActive: true,
        }));
    }, []);

    /**
     * Обработка тайм-аута аутентификации
     */
    const handleAuthTimeout = useCallback(() => {
        console.log("Authentication timeout");
        setState((prev) => ({ ...prev, authTimerActive: false }));

        if (!state.attemptMade) {
            setState((prev) => ({
                ...prev,
                currentPhase: "error",
                error: t("nebula.biometric.errors.timeout"),
                attemptMade: true,
            }));

            setTimeout(() => {
                handleBiometricFailure();
            }, 1000);
        }
    }, [state.attemptMade, t]);

    /**
     * Выполнение биометрической аутентификации
     */
    const handleAuthenticate = useCallback(async () => {
        if (
            !state.biometricManager ||
            state.isAuthenticating ||
            state.attemptMade ||
            !attemptId
        ) {
            console.log("Authentication blocked:", {
                hasManager: !!state.biometricManager,
                isAuthenticating: state.isAuthenticating,
                attemptMade: state.attemptMade,
                hasAttemptId: !!attemptId
            });
            return;
        }

        // Проверяем разрешения перед аутентификацией
        if (!state.biometricManager.isAccessGranted) {
            console.log("Biometric access not granted, cannot authenticate");
            handleBiometricFailure("Biometric access permission not granted");
            return;
        }

        console.log("Starting biometric authentication");
        setState((prev) => ({
            ...prev,
            isAuthenticating: true,
            attemptMade: true,
            error: null,
        }));

        const authStartTime = Date.now();

        try {
            state.biometricManager.authenticate(
                { reason: "Verify your identity to continue using the application" },
                async (success: boolean, token?: string) => {
                    const authEndTime = Date.now();
                    const completedInTime = authEndTime - authStartTime < TIMING_CONFIG.AUTH_TIMEOUT;

                    console.log("Biometric authentication result:", {
                        success,
                        completedInTime,
                        hasToken: !!token,
                    });

                    try {
                        const response = await makeAuthenticatedRequest(
                            "/api/nebula/biometric",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    success,
                                    completedInTime,
                                    deviceSupported: true, // Устройство уже проверено на странице
                                    token,
                                    attemptId,
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
                            console.log("Biometric authentication successful");
                            setState((prev) => ({
                                ...prev,
                                currentPhase: "success",
                                isAuthenticating: false,
                                authTimerActive: false,
                            }));

                            setTimeout(() => {
                                onSuccess();
                            }, 1500);
                        } else if (result.blocked) {
                            console.log("Biometric authentication failed, user blocked");
                            setState((prev) => ({
                                ...prev,
                                currentPhase: "error",
                                error: result.blockReason || t("nebula.biometric.errors.verificationFailed"),
                                isAuthenticating: false,
                                authTimerActive: false,
                            }));

                            setTimeout(() => {
                                onFailure();
                            }, 2000);
                        } else {
                            throw new Error("Unexpected verification result");
                        }
                    } catch (error) {
                        console.error("Error validating biometric:", error);
                        handleBiometricFailure();
                    }
                },
            );
        } catch (error) {
            console.error("Error during biometric authentication:", error);
            handleBiometricFailure();
        }
    }, [
        state.biometricManager,
        state.isAuthenticating,
        state.attemptMade,
        makeAuthenticatedRequest,
        onSuccess,
        onFailure,
        attemptId,
        t,
    ]);

    /**
     * Обработка неудачи биометрической аутентификации
     */
    const handleBiometricFailure = useCallback(async (errorMessage?: string) => {
        console.log("Handling biometric failure");

        setState((prev) => ({
            ...prev,
            currentPhase: "error",
            isAuthenticating: false,
            authTimerActive: false,
            error: errorMessage || prev.error,
        }));

        if (attemptId && !errorMessage) {
            try {
                await makeAuthenticatedRequest("/api/nebula/biometric", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        completedInTime: false,
                        deviceSupported: true,
                        attemptId,
                    }),
                });
            } catch (error) {
                console.error("Error sending biometric failure to API:", error);
            }
        }

        setTimeout(() => {
            onFailure();
        }, 1000);
    }, [makeAuthenticatedRequest, onFailure, attemptId]);

    /**
     * Получение иконки биометрии
     */
    const getBiometricIcon = () => {
        switch (state.biometricType) {
            case "finger":
                return <Fingerprint className="text-blue-400" size={48} />;
            case "face":
                return <Eye className="text-blue-400" size={48} />;
            default:
                return <Fingerprint className="text-blue-400" size={48} />;
        }
    };

    /**
     * Получение названия типа биометрии
     */
    const getBiometricTypeName = () => {
        switch (state.biometricType) {
            case "finger":
                return t("nebula.biometric.types.fingerprint");
            case "face":
                return t("nebula.biometric.types.faceId");
            default:
                return t("nebula.biometric.types.biometric");
        }
    };

    /**
     * Форматирование времени
     */
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
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
                                getBiometricIcon()
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {state.currentPhase === "success"
                            ? t("nebula.biometric.success.title")
                            : t("nebula.biometric.title")}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? t("nebula.biometric.success.message")
                            : t("nebula.biometric.subtitle")}
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
                            <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {t("nebula.biometric.initializing")}
                        </p>
                    </div>
                ) : state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {t("nebula.biometric.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {t("nebula.biometric.blockWarningFailed")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "auth" ? (
                    <div className="space-y-6">
                        {/* Таймер аутентификации */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span
                                className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
                            >
                                {formatTime(state.authTimeRemaining)}
                            </span>
                            <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                        </div>

                        {/* Информация о биометрической аутентификации */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="mb-3">{getBiometricIcon()}</div>
                            <h3 className="text-white font-semibold mb-1">
                                {t("nebula.biometric.authentication.title", { type: getBiometricTypeName() })}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {t("nebula.biometric.authentication.touchSensor")}
                            </p>
                        </div>

                        {/* Предупреждение о единственной попытке */}
                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                {t("nebula.biometric.authentication.singleAttempt")}
                            </p>
                        </div>

                        {/* Кнопка аутентификации */}
                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                            disabled={
                                state.isAuthenticating ||
                                state.authTimeRemaining === 0 ||
                                state.attemptMade
                            }
                            onClick={handleAuthenticate}
                        >
                            {state.isAuthenticating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t("nebula.biometric.authentication.authenticating")}</span>
                                </>
                            ) : (
                                <>
                                    <Fingerprint size={20} />
                                    <span>{t("nebula.biometric.authentication.authenticate")}</span>
                                </>
                            )}
                        </button>

                        {/* Прогресс аутентификации */}
                        {state.isAuthenticating && (
                            <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                                <p className="text-blue-300 text-sm">
                                    {t("nebula.biometric.authentication.pleaseComplete")}
                                </p>
                            </div>
                        )}
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            {t("nebula.biometric.success.restoring")}
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NebulaBiometricModal;