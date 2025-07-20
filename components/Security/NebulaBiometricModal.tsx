// src/components/Security/NebulaBiometricModal.tsx - Исправленная версия с улучшенной инициализацией

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
    skipDeviceCheck?: boolean;
    onPhaseChange?: (phase: AuthPhase, canAbandon: boolean) => void;
}

type BiometricType = "finger" | "face" | "unknown";
type AuthPhase =
    | "initializing"
    | "permission_required"
    | "auth"
    | "success"
    | "error"
    | "unsupported"
    | "timeout";

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
    canAbandon: boolean;
    initializationStartTime: number | null;
}

const NebulaBiometricModal: React.FC<NebulaBiometricModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
    skipDeviceCheck = false,
    onPhaseChange,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();
    const authTimeout = 15000; // 15 seconds for authentication
    const initTimeout = 10000; // 10 seconds for initialization

    // Ref для таймера инициализации
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<BiometricState>({
        currentPhase: "initializing",
        biometricManager: null,
        biometricType: "unknown",
        authTimeRemaining: 15000,
        isAuthenticating: false,
        error: null,
        attemptMade: false,
        authTimerActive: false,
        isBiometricSupported: true,
        canAbandon: false,
        initializationStartTime: null,
    });

    // Notify parent component about phase changes and abandonment safety
    useEffect(() => {
        if (onPhaseChange) {
            onPhaseChange(state.currentPhase, state.canAbandon);
        }
    }, [state.currentPhase, state.canAbandon, onPhaseChange]);

    // Helper function to update phase and abandonment status
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

    // Очистка таймеров
    const clearTimers = useCallback(() => {
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
        }
        if (authTimeoutRef.current) {
            clearInterval(authTimeoutRef.current);
            authTimeoutRef.current = null;
        }
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setState({
                currentPhase: "initializing",
                biometricManager: null,
                biometricType: "unknown",
                authTimeRemaining: 15000,
                isAuthenticating: false,
                error: null,
                attemptMade: false,
                authTimerActive: false,
                isBiometricSupported: true,
                canAbandon: false,
                initializationStartTime: null,
            });
            clearTimers();
            return;
        }

        if (attemptId) {
            updatePhase("initializing", false);
            setState(prev => ({
                ...prev,
                initializationStartTime: Date.now()
            }));
            initBiometric();
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
                canAbandon: true,
            }));
        }

        return clearTimers;
    }, [isOpen, attemptId, updatePhase, t, clearTimers]);

    // Authentication phase timer
    useEffect(() => {
        if (!state.authTimerActive || state.currentPhase !== "auth") return;

        authTimeoutRef.current = setInterval(() => {
            setState((prev) => {
                const newTime = prev.authTimeRemaining - 100;

                if (newTime <= 0) {
                    handleAuthTimeout();
                    return { ...prev, authTimeRemaining: 0 };
                }

                return { ...prev, authTimeRemaining: newTime };
            });
        }, 100);

        return () => {
            if (authTimeoutRef.current) {
                clearInterval(authTimeoutRef.current);
                authTimeoutRef.current = null;
            }
        };
    }, [state.authTimerActive, state.currentPhase]);

    /**
     * Проверка версии Telegram WebApp API
     */
    const checkAPIVersion = (): boolean => {
        try {
            const tg = window.Telegram?.WebApp;
            if (!tg) return false;

            // Проверяем наличие BiometricManager
            const hasBiometricManager = !!tg.BiometricManager;

            // Логируем версию для отладки
            console.log("Telegram WebApp version:", tg.version);
            console.log("BiometricManager available:", hasBiometricManager);

            return hasBiometricManager;
        } catch (error) {
            console.error("Error checking API version:", error);
            return false;
        }
    };

    /**
     * ИСПРАВЛЕННАЯ инициализация биометрии с таймаутом и улучшенной обработкой ошибок
     */
    const initBiometric = async () => {
        console.log("🔐 Starting biometric initialization");

        // Проверка базовых требований
        if (typeof window === "undefined") {
            console.log("❌ Window not available");
            await handleUnsupportedDevice("Biometric authentication is not available in this environment");
            return;
        }

        // Проверка версии API
        if (!checkAPIVersion()) {
            console.log("❌ BiometricManager API not available - outdated client or unsupported platform");
            await handleUnsupportedDevice("Biometric authentication requires a newer version of Telegram");
            return;
        }

        const tg = window.Telegram?.WebApp;
        if (!tg || !tg.BiometricManager) {
            console.log("❌ BiometricManager not found");
            await handleUnsupportedDevice("Biometric authentication is not supported on this device or platform");
            return;
        }

        const manager = tg.BiometricManager;

        // Устанавливаем таймаут для инициализации
        initTimeoutRef.current = setTimeout(() => {
            console.log("⏰ Biometric initialization timeout");
            handleInitializationTimeout();
        }, initTimeout);

        try {
            // ИСПРАВЛЕННАЯ инициализация с обработкой ошибок
            console.log("🚀 Calling BiometricManager.init()");

            manager.init(() => {
                // Очищаем таймаут при успешной инициализации
                if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                }

                console.log("✅ BiometricManager initialized successfully");
                console.log("📱 Biometric type:", manager.biometricType);
                console.log("🔍 Is available:", manager.isBiometricAvailable);
                console.log("✋ Access granted:", manager.isAccessGranted);

                setState((prev) => ({
                    ...prev,
                    biometricManager: manager,
                    biometricType: manager.biometricType || "unknown",
                }));

                // Проверяем доступность биометрии на устройстве
                if (!manager.isBiometricAvailable) {
                    console.log("❌ Biometric not available on device");
                    handleUnsupportedDevice("Biometric authentication is not available on this device");
                    return;
                }

                // Проверяем разрешения
                if (manager.isAccessGranted) {
                    console.log("✅ Permission already granted, proceeding to authentication");
                    updatePhase("auth", true);
                    setState((prev) => ({
                        ...prev,
                        authTimeRemaining: authTimeout,
                        authTimerActive: true,
                    }));
                } else {
                    console.log("⚠️ Permission not granted, showing permission required screen");
                    updatePhase("permission_required", false);
                }
            });

            // Дополнительная проверка на случай если callback не вызывается
            setTimeout(() => {
                if (state.currentPhase === "initializing" && initTimeoutRef.current) {
                    console.log("🔄 Initialization taking longer than expected...");
                }
            }, 3000);

        } catch (error) {
            console.error("💥 Error during BiometricManager initialization:", error);
            clearTimers();
            await handleUnsupportedDevice(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    /**
     * НОВАЯ функция обработки таймаута инициализации
     */
    const handleInitializationTimeout = useCallback(() => {
        console.log("⏰ Biometric initialization timed out");
        clearTimers();

        updatePhase("timeout", true);
        setState((prev) => ({
            ...prev,
            error: "Biometric initialization timed out. This may be due to an outdated Telegram version or device incompatibility.",
            authTimerActive: false,
        }));

        // Блокируем пользователя за таймаут инициализации
        setTimeout(() => {
            handleUnsupportedDevice("Biometric initialization timeout - device may not support this feature");
        }, 2000);
    }, [updatePhase, clearTimers]);

    /**
     * Handle authentication timeout
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
     * Handle biometric authentication
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

        console.log("🔐 Starting biometric authentication");
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
                    const completedInTime = authEndTime - authStartTime < authTimeout;

                    console.log("Biometric authentication result:", {
                        success,
                        completedInTime,
                        hasToken: !!token,
                        duration: authEndTime - authStartTime
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
                            console.log("✅ Biometric authentication successful");
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
                            console.log("❌ Biometric authentication failed, user blocked");
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
        authTimeout,
        makeAuthenticatedRequest,
        onSuccess,
        onFailure,
        attemptId,
        updatePhase,
        t,
    ]);

    /**
     * Handle biometric failure
     */
    const handleBiometricFailure = useCallback(async () => {
        console.log("Handling biometric failure, supported:", state.isBiometricSupported);

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
     * Handle unsupported device with automatic blocking
     */
    const handleUnsupportedDevice = useCallback(
        async (reason: string) => {
            console.log("Auto-blocking for unsupported device:", reason);

            updatePhase("unsupported", true);
            setState((prev) => ({
                ...prev,
                error: reason,
                isBiometricSupported: false,
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
                        setTimeout(() => onFailure(), 2000);
                    } else {
                        setTimeout(() => onFailure(), 1000);
                    }
                } catch (error) {
                    console.error("Error auto-blocking unsupported device:", error);
                    setTimeout(() => onFailure(), 1000);
                }
            } else {
                setTimeout(() => onFailure(), 1000);
            }
        },
        [makeAuthenticatedRequest, onFailure, attemptId, updatePhase],
    );

    /**
     * Handle open settings
     */
    const handleOpenSettings = useCallback(() => {
        if (state.biometricManager && state.biometricManager.openSettings) {
            state.biometricManager.openSettings();
        }
    }, [state.biometricManager]);

    /**
     * Handle request permission
     */
    const handleRequestPermission = useCallback(async () => {
        if (!state.biometricManager || !attemptId) return;

        try {
            state.biometricManager.requestAccess(
                { reason: "Security verification required for continued access" },
                (granted: boolean) => {
                    console.log("Permission request result:", granted);

                    if (granted) {
                        console.log("Permission granted, proceeding to authentication");
                        updatePhase("auth", true);
                        setState((prev) => ({
                            ...prev,
                            authTimeRemaining: authTimeout,
                            authTimerActive: true,
                        }));
                    } else {
                        updatePhase("error", true);
                        setState((prev) => ({
                            ...prev,
                            error: t("nebula.biometric.errors.permissionDenied"),
                        }));
                    }
                },
            );
        } catch (error) {
            console.error("Error requesting biometric permission:", error);
            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: t("nebula.biometric.errors.permissionDenied"),
            }));
        }
    }, [state.biometricManager, attemptId, authTimeout, updatePhase, t]);

    // Остальные функции остаются без изменений...
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

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {state.currentPhase === "unsupported" ||
                                state.currentPhase === "error" ||
                                state.currentPhase === "timeout" ? (
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
                            : state.currentPhase === "timeout"
                                ? "Initialization Timeout"
                                : t("nebula.biometric.title")}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? t("nebula.biometric.success.message")
                            : state.currentPhase === "timeout"
                                ? "Biometric system initialization timed out"
                                : state.currentPhase === "permission_required"
                                    ? t("nebula.biometric.permissionInstructions")
                                    : t("nebula.biometric.subtitle")}
                    </p>
                </div>

                {/* Content */}
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
                        <p className="text-gray-400 mb-2">
                            {t("nebula.biometric.initializing")}
                        </p>
                        {state.initializationStartTime && (
                            <p className="text-gray-500 text-xs">
                                Initializing for {Math.floor((Date.now() - state.initializationStartTime) / 1000)}s...
                            </p>
                        )}
                    </div>
                ) : state.currentPhase === "timeout" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                            <Clock className="text-orange-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-orange-300 text-sm font-semibold">
                                    Initialization Timeout
                                </p>
                                <p className="text-orange-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle
                                    className="text-blue-400 flex-shrink-0 mt-0.5"
                                    size={16}
                                />
                                <div>
                                    <h4 className="text-blue-300 font-semibold mb-1 text-sm">
                                        Possible Solutions:
                                    </h4>
                                    <ul className="text-blue-200 text-xs space-y-1">
                                        <li>• Update Telegram to the latest version</li>
                                        <li>• Restart the app and try again</li>
                                        <li>• Check if biometrics are enabled in device settings</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Остальные состояния остаются без изменений...
                    <>
                        {/* Existing content for other phases */}
                        {(state.currentPhase === "unsupported" || state.currentPhase === "error") && (
                            <div className="text-center space-y-4">
                                <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                                    <XCircle className="text-red-400 flex-shrink-0" size={20} />
                                    <div className="text-left">
                                        <p className="text-red-300 text-sm font-semibold">
                                            {state.currentPhase === "unsupported"
                                                ? t("nebula.biometric.errors.unavailable")
                                                : t("nebula.biometric.errors.verificationFailed")}
                                        </p>
                                        <p className="text-red-200 text-xs">{state.error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Permission Required Content */}
                        {state.currentPhase === "permission_required" && (
                            <div className="space-y-6">
                                <button
                                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleRequestPermission}
                                >
                                    <Shield size={20} />
                                    <span>{t("nebula.biometric.grantPermission")}</span>
                                </button>
                            </div>
                        )}

                        {/* Auth Content */}
                        {state.currentPhase === "auth" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-center space-x-2 text-sm">
                                    <Clock className="text-orange-400" size={16} />
                                    <span className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}>
                                        {formatTime(state.authTimeRemaining)}
                                    </span>
                                    <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                                </div>

                                <button
                                    className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                                    disabled={state.isAuthenticating || state.authTimeRemaining === 0 || state.attemptMade}
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
                            </div>
                        )}

                        {/* Success Content */}
                        {state.currentPhase === "success" && (
                            <div className="text-center py-4">
                                <p className="text-green-300 text-sm mb-4">
                                    {t("nebula.biometric.success.restoring")}
                                </p>
                                <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NebulaBiometricModal;