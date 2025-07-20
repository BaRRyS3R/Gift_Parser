// src/components/Security/NebulaBiometricModal.tsx - Исправленная логика верификации

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
    | "checking_availability"
    | "permission_required"
    | "ready_to_authenticate"
    | "authenticating"
    | "success"
    | "failed"
    | "device_unsupported"
    | "permission_denied_final";

interface BiometricState {
    currentPhase: AuthPhase;
    biometricManager: any;
    biometricType: BiometricType;
    authTimeRemaining: number;
    isProcessing: boolean;
    error: string | null;
    attemptMade: boolean;
    authTimerActive: boolean;
    isBiometricSupported: boolean;
    canAbandon: boolean;
    permissionCheckAttempts: number;
    maxPermissionAttempts: number;
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
    const authTimeout = 15000; // 15 seconds for authentication
    const maxPermissionCheckAttempts = 3; // Maximum attempts to check permissions

    const [state, setState] = useState<BiometricState>({
        currentPhase: "checking_availability",
        biometricManager: null,
        biometricType: "unknown",
        authTimeRemaining: 15000,
        isProcessing: false,
        error: null,
        attemptMade: false,
        authTimerActive: false,
        isBiometricSupported: true,
        canAbandon: false,
        permissionCheckAttempts: 0,
        maxPermissionAttempts: maxPermissionCheckAttempts,
    });

    // Notify parent component about phase changes
    useEffect(() => {
        if (onPhaseChange) {
            onPhaseChange(state.currentPhase, state.canAbandon);
        }
    }, [state.currentPhase, state.canAbandon, onPhaseChange]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setState({
                currentPhase: "checking_availability",
                biometricManager: null,
                biometricType: "unknown",
                authTimeRemaining: 15000,
                isProcessing: false,
                error: null,
                attemptMade: false,
                authTimerActive: false,
                isBiometricSupported: true,
                canAbandon: false,
                permissionCheckAttempts: 0,
                maxPermissionAttempts: maxPermissionCheckAttempts,
            });
            return;
        }

        if (attemptId) {
            initializeBiometricVerification();
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "failed",
                canAbandon: true,
            }));
        }
    }, [isOpen, attemptId, t]);

    // Authentication timer
    useEffect(() => {
        if (!state.authTimerActive || state.currentPhase !== "authenticating") return;

        const timer = setInterval(() => {
            setState((prev) => {
                const newTime = prev.authTimeRemaining - 100;

                if (newTime <= 0) {
                    handleAuthenticationTimeout();
                    return { ...prev, authTimeRemaining: 0, authTimerActive: false };
                }

                return { ...prev, authTimeRemaining: newTime };
            });
        }, 100);

        return () => clearInterval(timer);
    }, [state.authTimerActive, state.currentPhase]);

    /**
     * Initialize biometric verification process
     */
    const initializeBiometricVerification = async () => {
        console.log("Initializing biometric verification process");

        setState(prev => ({
            ...prev,
            currentPhase: "checking_availability",
            isProcessing: true,
            canAbandon: false
        }));

        try {
            // Check if we're in a browser environment
            if (typeof window === "undefined") {
                await handleDeviceUnsupported("Browser environment not available");
                return;
            }

            // Check if Telegram WebApp is available
            const tg = window.Telegram?.WebApp;
            if (!tg?.BiometricManager) {
                await handleDeviceUnsupported("Telegram WebApp BiometricManager not available");
                return;
            }

            // Initialize biometric manager
            const manager = tg.BiometricManager;

            // Wait for initialization
            const initializationPromise = new Promise<void>((resolve) => {
                manager.init(() => {
                    console.log("BiometricManager initialized successfully");
                    resolve();
                });
            });

            await initializationPromise;

            // Check if biometrics are available on device
            if (!manager.isBiometricAvailable) {
                await handleDeviceUnsupported("Biometric authentication not available on device");
                return;
            }

            // Store manager and determine biometric type
            setState(prev => ({
                ...prev,
                biometricManager: manager,
                biometricType: manager.biometricType || "unknown",
                isProcessing: false,
            }));

            // Check permission status and proceed accordingly
            if (manager.isAccessGranted) {
                console.log("Biometric access already granted, proceeding to authentication");
                setState(prev => ({
                    ...prev,
                    currentPhase: "ready_to_authenticate",
                    canAbandon: true,
                }));
            } else {
                console.log("Biometric access not granted, requiring permission");
                setState(prev => ({
                    ...prev,
                    currentPhase: "permission_required",
                    canAbandon: false, // Cannot abandon during permission phase
                }));
            }

        } catch (error) {
            console.error("Error during biometric initialization:", error);
            await handleDeviceUnsupported("Failed to initialize biometric authentication");
        }
    };

    /**
     * Handle device that doesn't support biometrics
     */
    const handleDeviceUnsupported = async (reason: string) => {
        console.log(`Blocking user for unsupported device: ${reason}`);

        setState(prev => ({
            ...prev,
            currentPhase: "device_unsupported",
            error: reason,
            isBiometricSupported: false,
            isProcessing: false,
            canAbandon: true,
        }));

        if (attemptId) {
            try {
                await makeAuthenticatedRequest("/api/nebula/biometric", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        completedInTime: false,
                        deviceSupported: false,
                        attemptId,
                    }),
                });

                setTimeout(() => onFailure(), 2000);
            } catch (error) {
                console.error("Error reporting device unsupported:", error);
                setTimeout(() => onFailure(), 1000);
            }
        } else {
            setTimeout(() => onFailure(), 1000);
        }
    };

    /**
     * Request biometric permission
     */
    const handleRequestPermission = async () => {
        if (!state.biometricManager || state.isProcessing) return;

        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        try {
            const permissionGranted = await new Promise<boolean>((resolve) => {
                state.biometricManager.requestAccess(
                    { reason: "Security verification required for continued access" },
                    (granted: boolean) => resolve(granted)
                );
            });

            if (permissionGranted) {
                console.log("Biometric permission granted successfully");
                setState(prev => ({
                    ...prev,
                    currentPhase: "ready_to_authenticate",
                    isProcessing: false,
                    canAbandon: true,
                }));
            } else {
                console.log("Biometric permission denied by user");
                setState(prev => ({
                    ...prev,
                    currentPhase: "permission_required",
                    isProcessing: false,
                    permissionCheckAttempts: prev.permissionCheckAttempts + 1,
                    error: t("nebula.biometric.errors.permissionDenied"),
                }));
            }

        } catch (error) {
            console.error("Error requesting biometric permission:", error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                permissionCheckAttempts: prev.permissionCheckAttempts + 1,
                error: t("nebula.biometric.errors.permissionDenied"),
            }));
        }
    };

    /**
     * Check permission status manually
     */
    const handleCheckPermissions = async () => {
        if (!state.biometricManager || state.isProcessing) return;

        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        // Check if we've exceeded maximum attempts
        if (state.permissionCheckAttempts >= state.maxPermissionAttempts) {
            console.log("Maximum permission check attempts exceeded, blocking user");
            await handlePermissionDeceptionAttempt();
            return;
        }

        try {
            // Small delay to allow for system state updates
            await new Promise(resolve => setTimeout(resolve, 500));

            if (state.biometricManager.isAccessGranted) {
                console.log("Permission check successful - access granted");
                setState(prev => ({
                    ...prev,
                    currentPhase: "ready_to_authenticate",
                    isProcessing: false,
                    canAbandon: true,
                }));
            } else {
                console.log("Permission check failed - access still not granted");
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    permissionCheckAttempts: prev.permissionCheckAttempts + 1,
                    error: `${t("nebula.biometric.errors.permissionDenied")} (${prev.permissionCheckAttempts + 1}/${prev.maxPermissionAttempts})`,
                }));

                // Check if this was the last attempt
                if (state.permissionCheckAttempts + 1 >= state.maxPermissionAttempts) {
                    setTimeout(() => handlePermissionDeceptionAttempt(), 1000);
                }
            }

        } catch (error) {
            console.error("Error checking permissions:", error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                permissionCheckAttempts: prev.permissionCheckAttempts + 1,
                error: t("nebula.biometric.errors.permissionCheckFailed"),
            }));
        }
    };

    /**
     * Handle attempted deception of permission system
     */
    const handlePermissionDeceptionAttempt = async () => {
        console.log("User exceeded permission check attempts - blocking for deception");

        setState(prev => ({
            ...prev,
            currentPhase: "permission_denied_final",
            error: "Превышено количество попыток проверки разрешений",
            isProcessing: false,
            canAbandon: true,
        }));

        if (attemptId) {
            try {
                await makeAuthenticatedRequest("/api/nebula/biometric", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        completedInTime: false,
                        deviceSupported: true,
                        attemptId,
                        deceptionAttempt: true,
                        reason: "exceeded_permission_check_attempts",
                    }),
                });

                setTimeout(() => onFailure(), 2000);
            } catch (error) {
                console.error("Error reporting deception attempt:", error);
                setTimeout(() => onFailure(), 1000);
            }
        } else {
            setTimeout(() => onFailure(), 1000);
        }
    };

    /**
     * Start biometric authentication
     */
    const handleStartAuthentication = async () => {
        if (!state.biometricManager || !state.biometricManager.isAccessGranted || state.isProcessing || state.attemptMade) {
            return;
        }

        console.log("Starting biometric authentication");

        setState(prev => ({
            ...prev,
            currentPhase: "authenticating",
            isProcessing: true,
            attemptMade: true,
            authTimeRemaining: authTimeout,
            authTimerActive: true,
            canAbandon: true,
        }));

        const authStartTime = Date.now();

        try {
            state.biometricManager.authenticate(
                { reason: "Verify your identity to continue using the application" },
                async (success: boolean, token?: string) => {
                    const authEndTime = Date.now();
                    const completedInTime = authEndTime - authStartTime < authTimeout;

                    console.log("Biometric authentication result:", { success, completedInTime, hasToken: !!token });

                    setState(prev => ({
                        ...prev,
                        authTimerActive: false,
                        isProcessing: false
                    }));

                    try {
                        const response = await makeAuthenticatedRequest("/api/nebula/biometric", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success,
                                completedInTime,
                                deviceSupported: state.isBiometricSupported,
                                token,
                                attemptId,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const result = await response.json();

                        if (!result.success) {
                            throw new Error(result.error || "Verification failed");
                        }

                        if (result.verified && result.trustRestored) {
                            console.log("Biometric authentication successful");
                            setState(prev => ({ ...prev, currentPhase: "success", canAbandon: false }));
                            setTimeout(() => onSuccess(), 1500);
                        } else if (result.blocked) {
                            console.log("Biometric authentication failed, user blocked");
                            setState(prev => ({
                                ...prev,
                                currentPhase: "failed",
                                error: result.blockReason || t("nebula.biometric.errors.verificationFailed"),
                                canAbandon: true,
                            }));
                            setTimeout(() => onFailure(), 2000);
                        } else {
                            throw new Error("Unexpected verification result");
                        }

                    } catch (error) {
                        console.error("Error validating biometric:", error);
                        handleAuthenticationFailure();
                    }
                }
            );

        } catch (error) {
            console.error("Error during biometric authentication:", error);
            handleAuthenticationFailure();
        }
    };

    /**
     * Handle authentication timeout
     */
    const handleAuthenticationTimeout = () => {
        console.log("Biometric authentication timeout");
        setState(prev => ({
            ...prev,
            currentPhase: "failed",
            error: t("nebula.biometric.errors.timeout"),
            authTimerActive: false,
            isProcessing: false,
            canAbandon: true,
        }));

        setTimeout(() => handleAuthenticationFailure(), 1000);
    };

    /**
     * Handle authentication failure
     */
    const handleAuthenticationFailure = async () => {
        console.log("Handling biometric authentication failure");

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
                console.error("Error reporting authentication failure:", error);
            }
        }

        setTimeout(() => onFailure(), 1000);
    };

    /**
     * Open device settings (Android/fallback)
     */
    const handleOpenSettings = () => {
        if (state.biometricManager?.openSettings) {
            state.biometricManager.openSettings();
        }
    };

    /**
     * Get biometric icon based on type
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
     * Format time remaining
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
                            {state.currentPhase === "device_unsupported" || state.currentPhase === "failed" || state.currentPhase === "permission_denied_final" ? (
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

                {/* Content based on current phase */}
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
                ) : state.currentPhase === "checking_availability" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            Проверка доступности биометрической аутентификации...
                        </p>
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

                        {state.error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-red-300 text-sm">{state.error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            {state.permissionCheckAttempts === 0 ? (
                                <button
                                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                    onClick={handleRequestPermission}
                                    disabled={state.isProcessing}
                                >
                                    {state.isProcessing ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} />
                                            <span>Запрос разрешения...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={20} />
                                            <span>{t("nebula.biometric.grantPermission")}</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                    onClick={handleCheckPermissions}
                                    disabled={state.isProcessing || state.permissionCheckAttempts >= state.maxPermissionAttempts}
                                >
                                    {state.isProcessing ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={16} />
                                            <span>{t("nebula.common.checkingPermissions")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={16} />
                                            <span>
                                                {t("nebula.common.recheckPermissions")}
                                                ({state.permissionCheckAttempts}/{state.maxPermissionAttempts})
                                            </span>
                                        </>
                                    )}
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
                        </div>

                        {state.permissionCheckAttempts > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-300 text-xs text-center">
                                    Внимание: При превышении лимита попыток аккаунт будет заблокирован за попытку обмана системы безопасности.
                                </p>
                            </div>
                        )}
                    </div>
                ) : state.currentPhase === "ready_to_authenticate" ? (
                    <div className="space-y-6">
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="mb-3">{getBiometricIcon()}</div>
                            <h3 className="text-white font-semibold mb-1">
                                Готов к аутентификации {getBiometricTypeName()}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Разрешения предоставлены. Нажмите кнопку ниже для начала верификации.
                            </p>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                            disabled={state.isProcessing || state.attemptMade}
                            onClick={handleStartAuthentication}
                        >
                            {state.isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Подготовка...</span>
                                </>
                            ) : (
                                <>
                                    <Fingerprint size={20} />
                                    <span>Начать верификацию</span>
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                {t("nebula.biometric.authentication.singleAttempt")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "authenticating" ? (
                    <div className="space-y-6">
                        {/* Timer */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}>
                                {formatTime(state.authTimeRemaining)}
                            </span>
                            <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                        </div>

                        {/* Authentication Info */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="mb-3">{getBiometricIcon()}</div>
                            <h3 className="text-white font-semibold mb-1">
                                Аутентификация {getBiometricTypeName()}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {t("nebula.biometric.authentication.touchSensor")}
                            </p>
                        </div>

                        <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            <p className="text-blue-300 text-sm">
                                {t("nebula.biometric.authentication.pleaseComplete")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            {t("nebula.biometric.success.restoring")}
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : state.currentPhase === "device_unsupported" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {t("nebula.biometric.errors.deviceNotSupported")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
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

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {t("nebula.biometric.blockWarning")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "permission_denied_final" || state.currentPhase === "failed" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {state.currentPhase === "permission_denied_final"
                                        ? "Превышен лимит попыток проверки разрешений"
                                        : t("nebula.biometric.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {state.currentPhase === "permission_denied_final"
                                    ? "Ваш аккаунт будет заблокирован за попытку обмана системы безопасности."
                                    : t("nebula.biometric.blockWarningFailed")}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NebulaBiometricModal;