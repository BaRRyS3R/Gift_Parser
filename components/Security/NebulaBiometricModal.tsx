// src/components/Security/NebulaBiometricModal.tsx - Улучшенная версия с управлением разрешениями

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
    RefreshCw,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { usePermissionStatus } from "@/hooks/modules/usePermissionStatus";

interface NebulaBiometricModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
    onPhaseChange?: (phase: AuthPhase, canAbandon: boolean) => void;
}

type BiometricType = "finger" | "face" | "unknown";
type AuthPhase =
    | "initializing"
    | "permission_required"
    | "auth"
    | "success"
    | "error"
    | "unsupported";

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
    isCheckingPermissions: boolean;
}

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
    const {
        status: permissionStatus,
        checkBiometricPermission,
        requestBiometricPermission,
        recheckAllPermissions
    } = usePermissionStatus();

    const authTimeout = 15000; // 15 seconds for authentication
    const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        isCheckingPermissions: false,
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

    /**
     * Повторная проверка разрешений
     */
    const recheckPermissions = useCallback(async () => {
        console.log("Rechecking biometric permissions...");

        setState(prev => ({ ...prev, isCheckingPermissions: true, error: null }));

        try {
            const permissionInfo = await checkBiometricPermission();

            console.log("Permission recheck result:", permissionInfo);

            if (!permissionInfo.isSupported) {
                await handleUnsupportedDevice(
                    t("nebula.biometric.errors.deviceNotSupported")
                );
                return;
            }

            if (permissionInfo.isGranted) {
                console.log("Permission now granted, proceeding to auth");
                updatePhase("auth", true);
                setState((prev) => ({
                    ...prev,
                    authTimeRemaining: authTimeout,
                    authTimerActive: true,
                    isCheckingPermissions: false,
                }));
            } else {
                console.log("Permission still not granted");
                updatePhase("permission_required", false);
                setState(prev => ({ ...prev, isCheckingPermissions: false }));
            }
        } catch (error) {
            console.error("Error during permission recheck:", error);
            setState(prev => ({
                ...prev,
                isCheckingPermissions: false,
                error: t("nebula.biometric.errors.permissionCheckFailed")
            }));
        }
    }, [checkBiometricPermission, t, updatePhase, authTimeout]);

    /**
     * Обработка возврата пользователя из настроек
     */
    const handleVisibilityChange = useCallback(() => {
        if (document.hidden) {
            // Пользователь покинул страницу
            if (visibilityTimeoutRef.current) {
                clearTimeout(visibilityTimeoutRef.current);
            }
            console.log("Page hidden during biometric verification");
        } else {
            // Пользователь вернулся на страницу
            console.log("Page visible again, checking if permissions changed");

            // Проверяем разрешения через небольшую задержку
            if (visibilityTimeoutRef.current) {
                clearTimeout(visibilityTimeoutRef.current);
            }

            visibilityTimeoutRef.current = setTimeout(() => {
                if (state.currentPhase === "permission_required" && !state.isCheckingPermissions) {
                    console.log("Auto-rechecking permissions after visibility change");
                    recheckPermissions();
                }
            }, 1000); // 1 секунда задержки для стабилизации
        }
    }, [state.currentPhase, state.isCheckingPermissions, recheckPermissions]);

    // Set up visibility change listener
    useEffect(() => {
        if (isOpen && state.currentPhase === "permission_required") {
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                if (visibilityTimeoutRef.current) {
                    clearTimeout(visibilityTimeoutRef.current);
                }
            };
        }
    }, [isOpen, state.currentPhase, handleVisibilityChange]);

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
                isCheckingPermissions: false,
            });

            if (visibilityTimeoutRef.current) {
                clearTimeout(visibilityTimeoutRef.current);
                visibilityTimeoutRef.current = null;
            }
            return;
        }

        if (attemptId) {
            updatePhase("initializing", false);
            initBiometric();
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
                canAbandon: true,
            }));
        }
    }, [isOpen, attemptId, updatePhase, t]);

    // Authentication phase timer
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
     * Initialize biometric manager
     */
    const initBiometric = async () => {
        console.log("Initializing biometric authentication");

        if (typeof window === "undefined") {
            console.log("Window not available");
            await handleUnsupportedDevice(
                t("nebula.biometric.errors.deviceNotSupported"),
            );
            return;
        }

        const tg = window.Telegram?.WebApp;

        if (!tg?.BiometricManager) {
            console.log(
                "BiometricManager not available - device/platform not supported",
            );
            await handleUnsupportedDevice(
                t("nebula.biometric.errors.deviceNotSupported"),
            );
            return;
        }

        const manager = tg.BiometricManager;

        // Initialize biometric manager
        manager.init(() => {
            console.log("BiometricManager initialized");
            setState((prev) => ({
                ...prev,
                biometricManager: manager,
                biometricType: manager.biometricType || "unknown",
            }));

            if (!manager.isBiometricAvailable) {
                console.log("Biometric not available on device");
                handleUnsupportedDevice(
                    t("nebula.biometric.errors.deviceNotSupported"),
                );
                return;
            }

            // Check if permission is already granted
            if (manager.isAccessGranted) {
                console.log("Permission already granted, proceeding to authentication");
                updatePhase("auth", true);
                setState((prev) => ({
                    ...prev,
                    authTimeRemaining: authTimeout,
                    authTimerActive: true,
                }));
            } else {
                console.log("Permission not granted, showing permission required screen");
                updatePhase("permission_required", false);
            }
        });
    };

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
                    const completedInTime = authEndTime - authStartTime < authTimeout;

                    console.log("Biometric authentication result:", {
                        success,
                        completedInTime,
                        hasToken: !!token,
                    });

                    try {
                        // Send result to Nebula API
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
                            throw new Error(
                                `HTTP ${response.status}: ${response.statusText}`,
                            );
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
        console.log(
            "Handling biometric failure, supported:",
            state.isBiometricSupported,
        );

        updatePhase("error", true);
        setState((prev) => ({
            ...prev,
            isAuthenticating: false,
            authTimerActive: false,
        }));

        if (attemptId) {
            try {
                // Send failure notification to API
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

        // Always call onFailure to trigger blocking
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

            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: reason,
                isBiometricSupported: false,
            }));

            if (attemptId) {
                try {
                    // Immediately block user for unsupported device
                    const response = await makeAuthenticatedRequest(
                        "/api/nebula/biometric",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success: false,
                                completedInTime: false,
                                deviceSupported: false,
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
        if (state.biometricManager?.openSettings) {
            state.biometricManager.openSettings();
        }
    }, [state.biometricManager]);

    /**
     * Handle request permission
     */
    const handleRequestPermission = useCallback(async () => {
        if (!state.biometricManager || !attemptId) return;

        setState(prev => ({ ...prev, isCheckingPermissions: true }));

        try {
            const granted = await requestBiometricPermission();

            if (granted) {
                console.log("Permission granted via request, proceeding to authentication");
                updatePhase("auth", true);
                setState((prev) => ({
                    ...prev,
                    authTimeRemaining: authTimeout,
                    authTimerActive: true,
                    isCheckingPermissions: false,
                }));
            } else {
                updatePhase("error", true);
                setState((prev) => ({
                    ...prev,
                    error: t("nebula.biometric.errors.permissionDenied"),
                    isCheckingPermissions: false,
                }));
            }
        } catch (error) {
            console.error("Error requesting biometric permission:", error);
            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: t("nebula.biometric.errors.permissionDenied"),
                isCheckingPermissions: false,
            }));
        }
    }, [state.biometricManager, attemptId, authTimeout, updatePhase, t, requestBiometricPermission]);

    /**
     * Get biometric icon
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
     * Get biometric type name
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
     * Format time in seconds
     */
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
                                state.currentPhase === "error" ? (
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
                        <p className="text-gray-400">
                            {t("nebula.biometric.initializing")}
                        </p>
                    </div>
                ) : state.currentPhase === "unsupported" ||
                    state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {state.currentPhase === "unsupported"
                                        ? t("nebula.biometric.errors.deviceNotSupported")
                                        : t("nebula.biometric.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        {state.currentPhase === "unsupported" && (
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
                                            {t("nebula.biometric.securityPolicyText")}
                                        </p>
                                    </div>
                                </div>
                            </div>
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

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {t("nebula.biometric.blockWarning")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "permission_required" ? (
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

                        <div className="space-y-3">
                            <button
                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleRequestPermission}
                                disabled={state.isCheckingPermissions}
                            >
                                {state.isCheckingPermissions ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={20} />
                                        <span>Проверка...</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield size={20} />
                                        <span>{t("nebula.biometric.grantPermission")}</span>
                                    </>
                                )}
                            </button>

                            <button
                                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={recheckPermissions}
                                disabled={state.isCheckingPermissions}
                            >
                                {state.isCheckingPermissions ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={16} />
                                        <span>Проверка разрешений...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        <span>Проверить разрешения</span>
                                    </>
                                )}
                            </button>

                            {state.biometricManager?.openSettings && (
                                <button
                                    className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleOpenSettings}
                                >
                                    <Settings size={16} />
                                    <span>{t("nebula.biometric.openSettings")}</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : state.currentPhase === "auth" ? (
                    <div className="space-y-6">
                        {/* Authentication Timer */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span
                                className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
                            >
                                {formatTime(state.authTimeRemaining)}
                            </span>
                            <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                        </div>

                        {/* Biometric Authentication Info */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="mb-3">{getBiometricIcon()}</div>
                            <h3 className="text-white font-semibold mb-1">
                                {t("nebula.biometric.authentication.title", { type: getBiometricTypeName() })}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {t("nebula.biometric.authentication.touchSensor")}
                            </p>
                        </div>

                        {/* Single Attempt Warning */}
                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                {t("nebula.biometric.authentication.singleAttempt")}
                            </p>
                        </div>

                        {/* Authentication Button */}
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

                        {/* Authentication Progress */}
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

                {/* Warning Message */}
                {state.currentPhase !== "success" &&
                    state.currentPhase !== "permission_required" &&
                    attemptId && (
                        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-300 text-xs text-center">
                                {state.currentPhase === "unsupported"
                                    ? t("nebula.biometric.blockWarning")
                                    : t("nebula.biometric.blockWarningFailed")}
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default NebulaBiometricModal;