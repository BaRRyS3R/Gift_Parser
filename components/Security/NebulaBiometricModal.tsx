// src/components/Security/NebulaBiometricModal.tsx - Версия с отладочной информацией на экране

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
    Bug,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";

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
}

interface DebugInfo {
    logs: string[];
    telegramWebAppAvailable: boolean;
    biometricManagerAvailable: boolean;
    biometricManagerInitialized: boolean;
    biometricAvailable: boolean;
    accessGranted: boolean;
    biometricType: string;
    initCallbackCalled: boolean;
    windowObject: any;
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
    const authTimeout = 15000;

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
    });

    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        logs: [],
        telegramWebAppAvailable: false,
        biometricManagerAvailable: false,
        biometricManagerInitialized: false,
        biometricAvailable: false,
        accessGranted: false,
        biometricType: "unknown",
        initCallbackCalled: false,
        windowObject: null,
    });

    const [showDebug, setShowDebug] = useState(true);

    const addDebugLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        setDebugInfo(prev => ({
            ...prev,
            logs: [...prev.logs.slice(-10), logEntry] // Keep last 10 logs
        }));
    }, []);

    const updateDebugInfo = useCallback((updates: Partial<DebugInfo>) => {
        setDebugInfo(prev => ({ ...prev, ...updates }));
    }, []);

    // Notify parent component about phase changes
    useEffect(() => {
        if (onPhaseChange) {
            onPhaseChange(state.currentPhase, state.canAbandon);
        }
    }, [state.currentPhase, state.canAbandon, onPhaseChange]);

    const updatePhase = useCallback((
        newPhase: AuthPhase,
        canAbandon: boolean = false
    ) => {
        addDebugLog(`Phase change: ${state.currentPhase} -> ${newPhase}`);
        setState((prev) => ({
            ...prev,
            currentPhase: newPhase,
            canAbandon,
        }));
    }, [state.currentPhase, addDebugLog]);

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
            });
            setDebugInfo({
                logs: [],
                telegramWebAppAvailable: false,
                biometricManagerAvailable: false,
                biometricManagerInitialized: false,
                biometricAvailable: false,
                accessGranted: false,
                biometricType: "unknown",
                initCallbackCalled: false,
                windowObject: null,
            });
            return;
        }

        addDebugLog("Modal opened, starting initialization");
        
        if (attemptId) {
            addDebugLog(`Attempt ID: ${attemptId}`);
            updatePhase("initializing", false);
            initBiometric();
        } else {
            addDebugLog("ERROR: No attempt ID provided");
            setState((prev) => ({
                ...prev,
                error: "No verification attempt ID provided",
                currentPhase: "error",
                canAbandon: true,
            }));
        }
    }, [isOpen, attemptId, updatePhase, addDebugLog]);

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
     * ОТЛАДОЧНАЯ инициализация биометрии
     */
    const initBiometric = async () => {
        addDebugLog("=== Starting biometric initialization ===");

        // Проверка window
        if (typeof window === "undefined") {
            addDebugLog("ERROR: Window object is undefined");
            await handleUnsupportedDevice("Window not available");
            return;
        }

        addDebugLog("✓ Window object available");

        // Детальная проверка Telegram объекта
        const windowTelegram = (window as any).Telegram;
        addDebugLog(`Telegram object: ${windowTelegram ? 'Available' : 'Not Available'}`);
        
        if (windowTelegram) {
            addDebugLog(`Telegram keys: ${Object.keys(windowTelegram).join(', ')}`);
            
            const webApp = windowTelegram.WebApp;
            addDebugLog(`WebApp object: ${webApp ? 'Available' : 'Not Available'}`);
            
            if (webApp) {
                addDebugLog(`WebApp version: ${webApp.version || 'Unknown'}`);
                addDebugLog(`WebApp platform: ${webApp.platform || 'Unknown'}`);
                addDebugLog(`WebApp keys: ${Object.keys(webApp).join(', ')}`);
                
                updateDebugInfo({
                    telegramWebAppAvailable: true,
                    windowObject: {
                        telegramKeys: Object.keys(windowTelegram),
                        webAppKeys: Object.keys(webApp),
                        version: webApp.version,
                        platform: webApp.platform
                    }
                });

                const biometricManager = webApp.BiometricManager;
                addDebugLog(`BiometricManager: ${biometricManager ? 'Available' : 'Not Available'}`);
                
                if (biometricManager) {
                    addDebugLog(`BiometricManager keys: ${Object.keys(biometricManager).join(', ')}`);
                    updateDebugInfo({ biometricManagerAvailable: true });
                    
                    // Проверка методов BiometricManager
                    addDebugLog(`init method: ${typeof biometricManager.init}`);
                    addDebugLog(`isBiometricAvailable: ${biometricManager.isBiometricAvailable}`);
                    addDebugLog(`isAccessGranted: ${biometricManager.isAccessGranted}`);
                    addDebugLog(`biometricType: ${biometricManager.biometricType || 'Unknown'}`);

                    // Попытка инициализации
                    addDebugLog("Calling BiometricManager.init()...");
                    
                    try {
                        biometricManager.init(() => {
                            addDebugLog("🎉 BiometricManager init callback called!");
                            
                            updateDebugInfo({
                                biometricManagerInitialized: true,
                                initCallbackCalled: true,
                                biometricAvailable: biometricManager.isBiometricAvailable,
                                accessGranted: biometricManager.isAccessGranted,
                                biometricType: biometricManager.biometricType || 'unknown'
                            });

                            setState((prev) => ({
                                ...prev,
                                biometricManager: biometricManager,
                                biometricType: biometricManager.biometricType || "unknown",
                            }));

                            if (!biometricManager.isBiometricAvailable) {
                                addDebugLog("❌ Biometric not available on device");
                                handleUnsupportedDevice("Biometric not available on this device");
                                return;
                            }

                            addDebugLog("✓ Biometric available on device");

                            if (biometricManager.isAccessGranted) {
                                addDebugLog("✓ Permission already granted, proceeding to auth");
                                updatePhase("auth", true);
                                setState((prev) => ({
                                    ...prev,
                                    authTimeRemaining: authTimeout,
                                    authTimerActive: true,
                                }));
                            } else {
                                addDebugLog("⚠️ Permission not granted, showing permission screen");
                                updatePhase("permission_required", false);
                            }
                        });

                        // Таймаут для обнаружения зависших инициализаций
                        setTimeout(() => {
                            if (!debugInfo.initCallbackCalled) {
                                addDebugLog("🚨 TIMEOUT: Init callback never called after 5 seconds");
                                addDebugLog("This suggests BiometricManager.init() is not working properly");
                            }
                        }, 5000);

                    } catch (error) {
                        addDebugLog(`❌ Error calling BiometricManager.init(): ${error}`);
                        await handleUnsupportedDevice(`Init error: ${error}`);
                    }
                } else {
                    addDebugLog("❌ BiometricManager not available in WebApp");
                    updateDebugInfo({ biometricManagerAvailable: false });
                    await handleUnsupportedDevice("BiometricManager not supported");
                }
            } else {
                addDebugLog("❌ WebApp object not available");
                await handleUnsupportedDevice("Telegram WebApp not available");
            }
        } else {
            addDebugLog("❌ Telegram object not available");
            await handleUnsupportedDevice("Telegram object not found");
        }
    };

    const handleAuthTimeout = useCallback(() => {
        addDebugLog("⏰ Authentication timeout");
        setState((prev) => ({ ...prev, authTimerActive: false }));

        if (!state.attemptMade) {
            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: "Authentication timeout",
                attemptMade: true,
            }));

            setTimeout(() => {
                handleBiometricFailure();
            }, 1000);
        }
    }, [state.attemptMade, updatePhase, addDebugLog]);

    const handleAuthenticate = useCallback(async () => {
        if (
            !state.biometricManager ||
            !state.biometricManager.isAccessGranted ||
            state.isAuthenticating ||
            state.attemptMade ||
            !attemptId
        ) {
            addDebugLog("❌ Cannot authenticate - conditions not met");
            addDebugLog(`Manager: ${!!state.biometricManager}`);
            addDebugLog(`Access: ${state.biometricManager?.isAccessGranted}`);
            addDebugLog(`Authenticating: ${state.isAuthenticating}`);
            addDebugLog(`Attempt made: ${state.attemptMade}`);
            addDebugLog(`Attempt ID: ${attemptId}`);
            return;
        }

        addDebugLog("🔐 Starting biometric authentication");
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

                    addDebugLog(`🔍 Auth result: success=${success}, time=${completedInTime}, token=${!!token}`);

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
                        addDebugLog(`📡 API response: ${JSON.stringify(result)}`);

                        if (!result.success) {
                            throw new Error(result.error || "Verification failed");
                        }

                        if (result.verified && result.trustRestored) {
                            addDebugLog("✅ Authentication successful");
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
                            addDebugLog("❌ Authentication failed, user blocked");
                            updatePhase("error", true);
                            setState((prev) => ({
                                ...prev,
                                error: result.blockReason || "Biometric verification failed",
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
                        addDebugLog(`❌ API error: ${error}`);
                        handleBiometricFailure();
                    }
                },
            );
        } catch (error) {
            addDebugLog(`❌ Authentication error: ${error}`);
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
        addDebugLog,
    ]);

    const handleBiometricFailure = useCallback(async () => {
        addDebugLog("💥 Handling biometric failure");

        updatePhase("error", true);
        setState((prev) => ({
            ...prev,
            isAuthenticating: false,
            authTimerActive: false,
        }));

        setTimeout(() => {
            onFailure();
        }, 1000);
    }, [updatePhase, onFailure, addDebugLog]);

    const handleUnsupportedDevice = useCallback(
        async (reason: string) => {
            addDebugLog(`🚫 Unsupported device: ${reason}`);

            updatePhase("unsupported", true);
            setState((prev) => ({
                ...prev,
                error: reason,
                isBiometricSupported: false,
            }));

            setTimeout(() => onFailure(), 2000);
        },
        [updatePhase, onFailure, addDebugLog],
    );

    const handleRequestPermission = useCallback(async () => {
        if (!state.biometricManager || !attemptId) {
            addDebugLog("❌ Cannot request permission - missing manager or attempt ID");
            return;
        }

        addDebugLog("🔑 Requesting biometric permission");

        try {
            state.biometricManager.requestAccess(
                { reason: "Security verification required for continued access" },
                (granted: boolean) => {
                    addDebugLog(`🔑 Permission result: ${granted}`);

                    if (granted) {
                        addDebugLog("✅ Permission granted, proceeding to auth");
                        updatePhase("auth", true);
                        setState((prev) => ({
                            ...prev,
                            authTimeRemaining: authTimeout,
                            authTimerActive: true,
                        }));
                    } else {
                        addDebugLog("❌ Permission denied");
                        updatePhase("error", true);
                        setState((prev) => ({
                            ...prev,
                            error: "Permission was not granted",
                        }));
                    }
                },
            );
        } catch (error) {
            addDebugLog(`❌ Permission request error: ${error}`);
            updatePhase("error", true);
            setState((prev) => ({
                ...prev,
                error: "Failed to request permission",
            }));
        }
    }, [state.biometricManager, attemptId, authTimeout, updatePhase, addDebugLog]);

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

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Debug Toggle */}
                <button
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
                    onClick={() => setShowDebug(!showDebug)}
                >
                    <Bug size={16} />
                </button>

                {/* Debug Panel */}
                {showDebug && (
                    <div className="mb-4 p-3 bg-gray-800 border border-gray-600 rounded-lg text-xs">
                        <h4 className="text-yellow-400 font-semibold mb-2">Debug Info</h4>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3 text-gray-300">
                            <div>Telegram WebApp: {debugInfo.telegramWebAppAvailable ? '✅' : '❌'}</div>
                            <div>BiometricManager: {debugInfo.biometricManagerAvailable ? '✅' : '❌'}</div>
                            <div>Initialized: {debugInfo.biometricManagerInitialized ? '✅' : '❌'}</div>
                            <div>Init Callback: {debugInfo.initCallbackCalled ? '✅' : '❌'}</div>
                            <div>Biometric Available: {debugInfo.biometricAvailable ? '✅' : '❌'}</div>
                            <div>Access Granted: {debugInfo.accessGranted ? '✅' : '❌'}</div>
                        </div>

                        <div className="mb-3">
                            <strong className="text-yellow-400">Type:</strong> {debugInfo.biometricType}
                        </div>

                        <div className="mb-3">
                            <strong className="text-yellow-400">Phase:</strong> {state.currentPhase}
                        </div>

                        {debugInfo.windowObject && (
                            <div className="mb-3">
                                <strong className="text-yellow-400">WebApp Version:</strong> {debugInfo.windowObject.version}
                            </div>
                        )}

                        <div>
                            <strong className="text-yellow-400">Logs:</strong>
                            <div className="mt-1 max-h-32 overflow-y-auto bg-black/50 p-2 rounded text-green-400 font-mono">
                                {debugInfo.logs.map((log, index) => (
                                    <div key={index} className="mb-1">{log}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                            ? "Verification Successful"
                            : "Biometric Authentication Required"}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? "Your identity has been verified successfully"
                            : "Please complete biometric authentication to continue"}
                    </p>
                </div>

                {/* Content based on phase */}
                {state.currentPhase === "initializing" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            Initializing biometric authentication...
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            Check debug panel for detailed progress
                        </p>
                    </div>
                ) : state.currentPhase === "permission_required" ? (
                    <div className="space-y-4">
                        <div className="text-center">
                            <Shield className="text-yellow-400 mx-auto mb-2" size={48} />
                            <h3 className="text-white font-semibold mb-2">Permission Required</h3>
                            <p className="text-gray-400 text-sm">Grant biometric access to continue</p>
                        </div>

                        <button
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                            onClick={handleRequestPermission}
                        >
                            Grant Permission
                        </button>
                    </div>
                ) : state.currentPhase === "auth" ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}>
                                {formatTime(state.authTimeRemaining)}
                            </span>
                            <span className="text-gray-500">remaining</span>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                            disabled={state.isAuthenticating || state.attemptMade}
                            onClick={handleAuthenticate}
                        >
                            {state.isAuthenticating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Fingerprint className="inline-block mr-2" size={20} />
                                    Authenticate
                                </>
                            )}
                        </button>
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            Authentication successful! Redirecting...
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 mx-auto mb-2" size={32} />
                            <p className="text-red-300 text-sm font-semibold">
                                {state.currentPhase === "unsupported" ? "Device Not Supported" : "Authentication Failed"}
                            </p>
                            <p className="text-red-200 text-xs mt-1">{state.error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NebulaBiometricModal;