// src/components/Security/NebulaBiometricModal.tsx - Исправленная версия с корректной типизацией TypeScript

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Fingerprint,
    Eye,
    Settings,
    Clock,
    AlertTriangle,
    Shield,
    XCircle,
    CheckCircle2,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface NebulaBiometricModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
    onPhaseChange?: (phase: AuthPhase, canAbandon: boolean) => void;
}

type BiometricType = "finger" | "face" | "unknown";

// ИСПРАВЛЕНО: Корректное определение типа AuthPhase
type AuthPhase =
    | "initializing"
    | "checking_availability"
    | "unavailable"
    | "permission_required"
    | "permission_requested"
    | "permission_checking"
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
    isBiometricSupported: boolean;
    isBiometricAvailable: boolean;
    permissionRequested: boolean;
    permissionGranted: boolean;
    canAbandon: boolean;
    permissionCheckAttempts: number;
    lastPermissionCheck: number;
}

// Увеличенные временные интервалы для предотвращения ложных срабатываний
const TIMING_CONFIG = {
    AUTH_TIMEOUT: 20000, // Увеличено с 15 до 20 секунд
    PERMISSION_CHECK_DELAY: 3000, // 3 секунды ожидания после возврата из настроек
    MAX_PERMISSION_ATTEMPTS: 3, // Максимум 3 попытки проверки разрешений
    PERMISSION_RETRY_INTERVAL: 2000, // 2 секунды между попытками проверки
} as const;

const NebulaBiometricModal: React.FC<NebulaBiometricModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
    onPhaseChange,
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
        isBiometricSupported: false,
        isBiometricAvailable: false,
        permissionRequested: false,
        permissionGranted: false,
        canAbandon: false,
        permissionCheckAttempts: 0,
        lastPermissionCheck: 0,
    });

    // Уведомление родительского компонента о изменениях фазы
    useEffect(() => {
        if (onPhaseChange) {
            onPhaseChange(state.currentPhase, state.canAbandon);
        }
    }, [state.currentPhase, state.canAbandon, onPhaseChange]);

    // Вспомогательная функция для обновления фазы
    const updatePhase = useCallback((
        newPhase: AuthPhase,
        canAbandon: boolean = false
    ) => {
        setState((prev) => ({
            ...prev,
            currentPhase: newPhase,
            canAbandon,
        }));
    }, []);

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
                isBiometricSupported: false,
                isBiometricAvailable: false,
                permissionRequested: false,
                permissionGranted: false,
                canAbandon: false,
                permissionCheckAttempts: 0,
                lastPermissionCheck: 0,
            });
            return;
        }

        if (attemptId) {
            initializeBiometric();
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
                canAbandon: true,
            }));
        }
    }, [isOpen, attemptId, t]);

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
     * Инициализация проверки доступности биометрии
     */
    const initializeBiometric = async () => {
        console.log("Initializing biometric authentication");
        updatePhase("checking_availability", false);

        if (typeof window === "undefined") {
            console.log("Window not available");
            await handleDeviceUnavailable("Device environment not supported");
            return;
        }

        const tg = window.Telegram?.WebApp;

        if (!tg?.BiometricManager) {
            console.log("BiometricManager not available - device/platform not supported");
            await handleDeviceUnavailable(t("nebula.biometric.errors.unavailable"));
            return;
        }

        const manager = tg.BiometricManager;

        manager.init(() => {
            console.log("BiometricManager initialized");
            setState((prev) => ({
                ...prev,
                biometricManager: manager,
                biometricType: manager.biometricType || "unknown",
                isBiometricSupported: true,
            }));

            if (!manager.isBiometricAvailable) {
                console.log("Biometric not available on device");
                handleDeviceUnavailable(t("nebula.biometric.errors.unavailable"));
                return;
            }

            setState((prev) => ({ ...prev, isBiometricAvailable: true }));

            if (manager.isAccessGranted) {
                console.log("Permission already granted, proceeding to authentication");
                setState((prev) => ({ ...prev, permissionGranted: true }));
                startAuthentication();
            } else {
                console.log("Permission not granted, showing permission request");
                updatePhase("permission_required", true);
            }
        });
    };

    /**
     * Обработка недоступности устройства - немедленная блокировка
     */
    const handleDeviceUnavailable = useCallback(
        async (reason: string) => {
            console.log("Biometric unavailable on device:", reason);

            updatePhase("unavailable", true);
            setState((prev) => ({
                ...prev,
                error: reason,
                isBiometricAvailable: false,
            }));

            if (attemptId) {
                try {
                    const response = await makeAuthenticatedRequest(
                        "/api/nebula/biometric",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success: false,
                                completedInTime: false,
                                deviceSupported: false,
                                unavailable: true,
                                attemptId,
                            }),
                        },
                    );

                    if (response.ok) {
                        setTimeout(() => onFailure(), 3000);
                    } else {
                        setTimeout(() => onFailure(), 1000);
                    }
                } catch (error) {
                    console.error("Error auto-blocking for unavailable biometric:", error);
                    setTimeout(() => onFailure(), 1000);
                }
            } else {
                setTimeout(() => onFailure(), 1000);
            }
        },
        [makeAuthenticatedRequest, onFailure, attemptId, updatePhase, t],
    );

    /**
     * ИСПРАВЛЕННАЯ функция запроса разрешения биометрии
     * Теперь НЕ блокирует пользователя автоматически
     */
    const handleRequestPermission = useCallback(async () => {
        if (!state.biometricManager || !attemptId) return;

        console.log("Requesting biometric permission...");
        setState((prev) => ({
            ...prev,
            permissionRequested: true,
            lastPermissionCheck: Date.now(),
        }));
        updatePhase("permission_requested", true); // Пользователь может безопасно покинуть страницу

        try {
            state.biometricManager.requestAccess(
                { reason: "Security verification required for continued access" },
                (granted: boolean) => {
                    console.log("Permission request callback result:", granted);

                    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: НЕ блокируем пользователя автоматически
                    // Просто сохраняем результат для последующей проверки
                    setState((prev) => ({
                        ...prev,
                        permissionGranted: granted
                    }));

                    // Если разрешение получено сразу, можно начинать аутентификацию
                    if (granted) {
                        console.log("Permission granted immediately, starting authentication");
                        startAuthentication();
                    } else {
                        console.log("Permission not granted in callback, user should manually check status");
                        // НЕ блокируем пользователя! Ожидаем мануальной проверки
                    }
                },
            );
        } catch (error) {
            console.error("Error requesting biometric permission:", error);
            setState((prev) => ({
                ...prev,
                error: t("nebula.biometric.errors.permissionDenied"),
            }));
        }
    }, [state.biometricManager, attemptId, updatePhase, t]);

    /**
     * ИСПРАВЛЕННАЯ функция проверки статуса разрешения
     * Включает множественные попытки и умную логику ожидания
     */
    const handleCheckPermission = useCallback(async () => {
        if (!state.biometricManager || !attemptId) return;

        console.log(`Checking permission status (attempt ${state.permissionCheckAttempts + 1}/${TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS})`);
        updatePhase("permission_checking", false);

        // Увеличиваем счетчик попыток
        setState((prev) => ({
            ...prev,
            permissionCheckAttempts: prev.permissionCheckAttempts + 1
        }));

        // Ожидание для стабилизации состояния системы
        await new Promise(resolve => setTimeout(resolve, TIMING_CONFIG.PERMISSION_CHECK_DELAY));

        try {
            // Проверяем статус разрешения
            const isGranted = state.biometricManager.isAccessGranted;
            console.log("Permission check result:", isGranted);

            setState((prev) => ({ ...prev, permissionGranted: isGranted }));

            if (isGranted) {
                console.log("Permission granted, starting authentication");
                startAuthentication();
            } else {
                // Если разрешение не получено, проверяем можем ли повторить попытку
                if (state.permissionCheckAttempts < TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS) {
                    console.log(`Permission not granted, allowing retry (${state.permissionCheckAttempts}/${TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS})`);
                    updatePhase("permission_required", true);
                } else {
                    console.log("Maximum permission check attempts reached, blocking user");
                    handlePermissionDenied();
                }
            }
        } catch (error) {
            console.error("Error checking permission status:", error);

            if (state.permissionCheckAttempts < TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS) {
                setState((prev) => ({
                    ...prev,
                    error: t("nebula.biometric.errors.permissionCheckFailed"),
                }));
                updatePhase("permission_required", true);
            } else {
                handlePermissionDenied();
            }
        }
    }, [state.biometricManager, state.permissionCheckAttempts, attemptId, updatePhase, t]);

    /**
     * Обработка отказа в разрешениях - блокировка пользователя
     */
    const handlePermissionDenied = useCallback(async () => {
        console.log("Biometric permission denied after maximum attempts");

        updatePhase("error", true);
        setState((prev) => ({
            ...prev,
            error: t("nebula.biometric.errors.permissionDenied"),
        }));

        if (attemptId) {
            try {
                const response = await makeAuthenticatedRequest(
                    "/api/nebula/biometric",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            success: false,
                            completedInTime: false,
                            deviceSupported: true,
                            permissionDenied: true,
                            attemptId,
                        }),
                    },
                );

                if (response.ok) {
                    setTimeout(() => onFailure(), 2000);
                } else {
                    setTimeout(() => onFailure(), 1000);
                }
            } catch (error) {
                console.error("Error blocking for permission denial:", error);
                setTimeout(() => onFailure(), 1000);
            }
        } else {
            setTimeout(() => onFailure(), 1000);
        }
    }, [makeAuthenticatedRequest, onFailure, attemptId, updatePhase, t]);

    /**
     * Начало процесса аутентификации
     */
    const startAuthentication = useCallback(() => {
        console.log("Starting biometric authentication");
        updatePhase("auth", false); // Небезопасно покидать во время аутентификации
        setState((prev) => ({
            ...prev,
            authTimeRemaining: TIMING_CONFIG.AUTH_TIMEOUT,
            authTimerActive: true,
        }));
    }, [updatePhase]);

    /**
     * Обработка тайм-аута аутентификации
     */
    const handleAuthTimeout = useCallback(() => {
        console.log("Authentication timeout");
        setState((prev) => ({ ...prev, authTimerActive: false }));

        if (!state.attemptMade) {
            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: t("nebula.biometric.errors.timeout"),
                attemptMade: true,
            }));

            setTimeout(() => {
                handleBiometricFailure();
            }, 1000);
        }
    }, [state.attemptMade, updatePhase, t]);

    /**
     * Обработка биометрической аутентификации
     */
    const handleAuthenticate = useCallback(async () => {
        if (
            !state.biometricManager ||
            !state.biometricManager.isAccessGranted ||
            state.isAuthenticating ||
            state.attemptMade ||
            !attemptId
        ) {
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
                                    deviceSupported: state.isBiometricSupported,
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
                            updatePhase("success", false);
                            setState((prev) => ({
                                ...prev,
                                isAuthenticating: false,
                                authTimerActive: false,
                            }));

                            setTimeout(() => {
                                onSuccess();
                            }, 1500);
                        } else if (result.blocked) {
                            console.log("Biometric authentication failed, user blocked");
                            updatePhase("error", true);
                            setState((prev) => ({
                                ...prev,
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
        state.isBiometricSupported,
        makeAuthenticatedRequest,
        onSuccess,
        onFailure,
        attemptId,
        updatePhase,
        t,
    ]);

    /**
     * Обработка неудачной биометрической аутентификации
     */
    const handleBiometricFailure = useCallback(async () => {
        console.log("Handling biometric failure");

        updatePhase("error", true);
        setState((prev) => ({
            ...prev,
            isAuthenticating: false,
            authTimerActive: false,
        }));

        if (attemptId) {
            try {
                await makeAuthenticatedRequest("/api/nebula/biometric", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        completedInTime: false,
                        deviceSupported: state.isBiometricSupported,
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
    }, [state.isBiometricSupported, makeAuthenticatedRequest, onFailure, attemptId, updatePhase]);

    /**
     * Открытие настроек биометрии
     */
    const handleOpenSettings = useCallback(() => {
        if (state.biometricManager?.openSettings) {
            state.biometricManager.openSettings();
        }
    }, [state.biometricManager]);

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
     * Форматирование времени в секундах
     */
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    // ИСПРАВЛЕНО: Вспомогательная функция для проверки фазы разрешений
    const isPermissionPhase = (phase: AuthPhase): boolean => {
        return phase === "permission_required" ||
            phase === "permission_requested";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Заголовок */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {state.currentPhase === "unavailable" || state.currentPhase === "error" ? (
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
                            : isPermissionPhase(state.currentPhase)
                                ? t("nebula.biometric.permissionInstructions")
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
                ) : state.currentPhase === "initializing" || state.currentPhase === "checking_availability" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {state.currentPhase === "checking_availability"
                                ? t("nebula.biometric.checkingAvailability")
                                : t("nebula.biometric.initializing")}
                        </p>
                    </div>
                ) : state.currentPhase === "unavailable" || state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {state.currentPhase === "unavailable"
                                        ? t("nebula.biometric.errors.unavailable")
                                        : t("nebula.biometric.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        {state.currentPhase === "unavailable" && (
                            <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <AlertTriangle
                                        className="text-orange-400 flex-shrink-0 mt-0.5"
                                        size={16}
                                    />
                                    <div>
                                        <h4 className="text-orange-300 font-semibold mb-1 text-sm">
                                            {t("nebula.biometric.securityPolicy")}
                                        </h4>
                                        <p className="text-orange-200 text-xs">
                                            {t("nebula.biometric.unavailableWarning")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {state.currentPhase === "unavailable"
                                    ? t("nebula.biometric.blockWarningUnavailable")
                                    : state.error?.includes("permission")
                                        ? t("nebula.biometric.blockWarningPermissionDenied")
                                        : t("nebula.biometric.blockWarning")}
                            </p>
                        </div>
                    </div>
                ) : isPermissionPhase(state.currentPhase) ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Shield className="text-yellow-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">
                                {t("nebula.biometric.permissionRequired")}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {t("nebula.biometric.permissionInstructions")}
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                {t("nebula.biometric.instructions.title")}
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>{t("nebula.biometric.instructions.step1")}</p>
                                <p>{t("nebula.biometric.instructions.step2")}</p>
                                <p>{t("nebula.biometric.instructions.step3")}</p>
                                <p>{t("nebula.biometric.instructions.step4")}</p>
                            </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <CheckCircle2
                                    className="text-green-400 flex-shrink-0 mt-0.5"
                                    size={16}
                                />
                                <div>
                                    <h4 className="text-green-300 font-semibold mb-1 text-sm">
                                        {t("nebula.biometric.leaveAppSafe")}
                                    </h4>
                                    <p className="text-green-200 text-xs">
                                        {t("nebula.biometric.leaveAppSafeText")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Показываем предупреждение только если превышено максимальное количество попыток */}
                        {state.permissionCheckAttempts >= TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS - 1 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <p className="text-yellow-300 text-xs text-center">
                                    {t("nebula.biometric.permissionWarning")}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            {!state.permissionRequested ? (
                                <button
                                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleRequestPermission}
                                >
                                    <Shield size={20} />
                                    <span>{t("nebula.biometric.grantPermission")}</span>
                                </button>
                            ) : (
                                <button
                                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleCheckPermission}
                                    disabled={state.currentPhase === "permission_checking"}
                                >
                                    <Shield size={20} />
                                    <span>
                                        {state.currentPhase === "permission_checking"
                                            ? t("nebula.biometric.checkingPermission")
                                            : t("nebula.biometric.checkPermission")}
                                    </span>
                                </button>
                            )}

                            {state.biometricManager?.openSettings && (
                                <button
                                    className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleOpenSettings}
                                >
                                    <Settings size={16} />
                                    <span>{t("nebula.biometric.openSettings")}</span>
                                </button>
                            )}

                            {/* Показываем счетчик попыток */}
                            {state.permissionCheckAttempts > 0 && (
                                <div className="text-center">
                                    <p className="text-gray-500 text-xs">
                                        {t("nebula.biometric.authentication.try")} {state.permissionCheckAttempts} / {TIMING_CONFIG.MAX_PERMISSION_ATTEMPTS}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : state.currentPhase === "permission_checking" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Shield className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {t("nebula.biometric.authentication.checkPermission")}
                        </p>
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