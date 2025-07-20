// src/app/nebula/page.tsx - Обновленная система с проверкой поддержки устройства на странице

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, Zap, Fingerprint, Compass, Eye, Settings, CheckCircle2, XCircle } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import NebulaCaptchaModal from "@/components/Security/NebulaCaptchaModal";
import NebulaBiometricModal from "@/components/Security/NebulaBiometricModal";
import NebulaGyroscopeModal from "@/components/Security/NebulaGyroscopeModal";

// Интерфейсы типов данных
interface NebulaCheckResponse {
    success: boolean;
    blocked?: {
        isBlocked: true;
        blockInfo: any;
    };
    verification?: {
        required: true;
        type: "captcha" | "biometric" | "gyroscope";
        trustScore: number;
        threshold: number;
        attemptId: string;
    };
    allowed?: {
        proceed: true;
        trustScore: number;
    };
    error?: string;
}

type VerificationType = "captcha" | "biometric" | "gyroscope";

// Расширенные состояния страницы
type PagePhase = 
    | "loading"
    | "error"
    | "device_checking"
    | "device_unsupported"
    | "permission_required"
    | "permission_waiting"
    | "ready_to_verify"
    | "verifying"
    | "success"
    | "failure";

interface DeviceCapability {
    isSupported: boolean;
    isAvailable: boolean;
    permissionGranted: boolean;
    permissionRequested: boolean;
    checkComplete: boolean;
    error?: string;
}

interface PageState {
    phase: PagePhase;
    error: string | null;
    verificationType: VerificationType | null;
    trustScore: number;
    threshold: number;
    attemptId: string | null;
    
    // Новые поля для управления устройством
    deviceCapability: DeviceCapability;
    permissionTimer: number; // оставшееся время в секундах
    permissionStartTime: number | null; // время начала ожидания разрешений
    autoCheckPermissions: boolean; // автоматическая проверка разрешений
}

// Константы времени
const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут
const PERMISSION_CHECK_INTERVAL_MS = 2000; // проверка каждые 2 секунды

export default function NebulaPage(): JSX.Element {
    const router = useRouter();
    const { makeAuthenticatedRequest, authState } = useUser();
    const t = useT();

    // Рефы для таймеров
    const permissionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const permissionCheckRef = useRef<NodeJS.Timeout | null>(null);

    const [pageState, setPageState] = useState<PageState>({
        phase: "loading",
        error: null,
        verificationType: null,
        trustScore: 50,
        threshold: 40,
        attemptId: null,
        deviceCapability: {
            isSupported: false,
            isAvailable: false,
            permissionGranted: false,
            permissionRequested: false,
            checkComplete: false,
        },
        permissionTimer: PERMISSION_TIMEOUT_MS / 1000,
        permissionStartTime: null,
        autoCheckPermissions: false,
    });

    /**
     * Очистка всех таймеров
     */
    const cleanupTimers = useCallback(() => {
        if (permissionTimerRef.current) {
            clearInterval(permissionTimerRef.current);
            permissionTimerRef.current = null;
        }
        if (permissionCheckRef.current) {
            clearInterval(permissionCheckRef.current);
            permissionCheckRef.current = null;
        }
    }, []);

    /**
     * Проверка статуса Nebula верификации
     */
    const checkNebulaStatus = useCallback(async () => {
        setPageState((prev) => ({ ...prev, phase: "loading", error: null }));

        try {
            const response = await makeAuthenticatedRequest("/api/nebula/check");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result: NebulaCheckResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to check verification status");
            }

            // Проверка блокировки пользователя
            if (result.blocked) {
                console.log("User is blocked, redirecting to blocked page");
                router.push("/blocked");
                return;
            }

            // Проверка разрешения на продолжение
            if (result.allowed) {
                console.log("User passed Nebula checks, redirecting to main");
                router.push("/main");
                return;
            }

            // Пользователь требует верификации
            if (result.verification) {
                console.log(`User requires ${result.verification.type} verification`);
                setPageState((prev) => ({
                    ...prev,
                    phase: result.verification!.type === "captcha" ? "ready_to_verify" : "device_checking",
                    verificationType: result.verification!.type,
                    trustScore: result.verification!.trustScore,
                    threshold: result.verification!.threshold,
                    attemptId: result.verification!.attemptId,
                }));

                // Для капчи сразу открываем модальное окно
                if (result.verification.type === "captcha") {
                    setTimeout(() => openVerificationModal(), 500);
                } else {
                    // Для биометрии и гироскопа проверяем поддержку устройства
                    checkDeviceSupport(result.verification.type);
                }
            } else {
                throw new Error("Unknown verification status");
            }
        } catch (error) {
            console.error("Error checking Nebula status:", error);
            setPageState((prev) => ({
                ...prev,
                phase: "error",
                error: error instanceof Error ? error.message : "Failed to check verification status",
            }));
        }
    }, [makeAuthenticatedRequest, router]);

    /**
     * Проверка поддержки устройства для биометрии или гироскопа
     */
    const checkDeviceSupport = useCallback(async (type: VerificationType) => {
        if (type === "captcha") return;

        console.log(`Checking device support for ${type}`);
        setPageState((prev) => ({ ...prev, phase: "device_checking" }));

        try {
            if (type === "biometric") {
                await checkBiometricSupport();
            } else if (type === "gyroscope") {
                await checkGyroscopeSupport();
            }
        } catch (error) {
            console.error(`Error checking ${type} support:`, error);
            setPageState((prev) => ({
                ...prev,
                phase: "device_unsupported",
                error: error instanceof Error ? error.message : `${type} not supported`,
            }));
            
            // Блокируем пользователя за неподдерживаемое устройство
            setTimeout(() => blockForUnsupportedDevice(type), 3000);
        }
    }, []);

    /**
     * Проверка поддержки биометрии
     */
    const checkBiometricSupport = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            if (typeof window === "undefined") {
                reject(new Error("Window environment not available"));
                return;
            }

            const tg = window.Telegram?.WebApp;
            if (!tg) {
                reject(new Error("Telegram WebApp not available"));
                return;
            }

            if (!tg.BiometricManager) {
                reject(new Error("BiometricManager not available - device/platform not supported"));
                return;
            }

            const manager = tg.BiometricManager;
            manager.init(() => {
                console.log("BiometricManager initialized");
                
                if (!manager.isBiometricAvailable) {
                    reject(new Error("Biometric authentication not available on this device"));
                    return;
                }

                // Проверяем разрешения
                const permissionGranted = manager.isAccessGranted;
                console.log("Biometric permission status:", permissionGranted);

                setPageState((prev) => ({
                    ...prev,
                    deviceCapability: {
                        isSupported: true,
                        isAvailable: true,
                        permissionGranted,
                        permissionRequested: false,
                        checkComplete: true,
                    },
                    phase: permissionGranted ? "ready_to_verify" : "permission_required",
                }));

                if (permissionGranted) {
                    // Разрешение уже есть, можем сразу открыть модальное окно
                    setTimeout(() => openVerificationModal(), 500);
                } else {
                    // Нужно запросить разрешение
                    startPermissionTimer();
                }

                resolve();
            });
        });
    }, []);

    /**
     * Проверка поддержки гироскопа
     */
    const checkGyroscopeSupport = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            if (typeof window === "undefined") {
                reject(new Error("Window environment not available"));
                return;
            }

            if (!window.DeviceOrientationEvent) {
                reject(new Error("DeviceOrientationEvent not supported"));
                return;
            }

            // Проверяем требование разрешения (iOS 13+)
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;
            const requiresPermission = typeof DeviceOrientationEvent.requestPermission === "function";

            if (requiresPermission) {
                console.log("Gyroscope requires permission");
                setPageState((prev) => ({
                    ...prev,
                    deviceCapability: {
                        isSupported: true,
                        isAvailable: true,
                        permissionGranted: false,
                        permissionRequested: false,
                        checkComplete: true,
                    },
                    phase: "permission_required",
                }));
                startPermissionTimer();
                resolve();
            } else {
                // Проверяем доступность данных
                checkGyroscopeData()
                    .then(() => {
                        setPageState((prev) => ({
                            ...prev,
                            deviceCapability: {
                                isSupported: true,
                                isAvailable: true,
                                permissionGranted: true,
                                permissionRequested: false,
                                checkComplete: true,
                            },
                            phase: "ready_to_verify",
                        }));
                        setTimeout(() => openVerificationModal(), 500);
                        resolve();
                    })
                    .catch(reject);
            }
        });
    }, []);

    /**
     * Проверка фактической доступности данных гироскопа
     */
    const checkGyroscopeData = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            let dataReceived = false;

            const testListener = (event: DeviceOrientationEvent) => {
                if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                    dataReceived = true;
                    window.removeEventListener("deviceorientation", testListener);
                    resolve();
                }
            };

            window.addEventListener("deviceorientation", testListener);

            setTimeout(() => {
                if (!dataReceived) {
                    window.removeEventListener("deviceorientation", testListener);
                    reject(new Error("No gyroscope data detected"));
                }
            }, 3000);
        });
    }, []);

    /**
     * Запуск таймера ожидания разрешений
     */
    const startPermissionTimer = useCallback(() => {
        const startTime = Date.now();
        setPageState((prev) => ({
            ...prev,
            permissionStartTime: startTime,
            permissionTimer: PERMISSION_TIMEOUT_MS / 1000,
        }));

        // Таймер обратного отсчета
        permissionTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, PERMISSION_TIMEOUT_MS - elapsed);
            const remainingSeconds = Math.ceil(remaining / 1000);

            setPageState((prev) => ({
                ...prev,
                permissionTimer: remainingSeconds,
            }));

            if (remaining <= 0) {
                cleanupTimers();
                console.log("Permission timeout - blocking user");
                blockForPermissionTimeout();
            }
        }, 1000);

        console.log("Permission timer started - 5 minutes countdown");
    }, [cleanupTimers]);

    /**
     * Запрос разрешения для биометрии или гироскопа
     */
    const requestPermission = useCallback(async () => {
        if (!pageState.verificationType || pageState.deviceCapability.permissionRequested) return;

        console.log(`Requesting permission for ${pageState.verificationType}`);
        setPageState((prev) => ({
            ...prev,
            deviceCapability: {
                ...prev.deviceCapability,
                permissionRequested: true,
            },
            autoCheckPermissions: true,
        }));

        try {
            if (pageState.verificationType === "biometric") {
                const tg = window.Telegram?.WebApp;
                if (tg && tg.BiometricManager) {
                    tg.BiometricManager.requestAccess(
                        { reason: "Security verification required for continued access" },
                        (granted: boolean) => {
                            console.log("Biometric permission result:", granted);
                            if (granted) {
                                handlePermissionGranted();
                            }
                        }
                    );

                    // Также пытаемся открыть настройки
                    setTimeout(() => {
                        if (tg.BiometricManager && tg.BiometricManager.openSettings) {
                            tg.BiometricManager.openSettings();
                        }
                    }, 1000);
                }
            } else if (pageState.verificationType === "gyroscope") {
                const DeviceOrientationEvent = window.DeviceOrientationEvent as any;
                if (typeof DeviceOrientationEvent.requestPermission === "function") {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === "granted") {
                        handlePermissionGranted();
                    }
                }
            }

            // Запускаем автоматическую проверку разрешений
            startAutoPermissionCheck();
        } catch (error) {
            console.error("Error requesting permission:", error);
        }
    }, [pageState.verificationType, pageState.deviceCapability.permissionRequested]);

    /**
     * Автоматическая проверка разрешений
     */
    const startAutoPermissionCheck = useCallback(() => {
        if (permissionCheckRef.current) return;

        permissionCheckRef.current = setInterval(async () => {
            if (!pageState.autoCheckPermissions) return;

            try {
                let permissionGranted = false;

                if (pageState.verificationType === "biometric") {
                    const tg = window.Telegram?.WebApp;
                    if (tg && tg.BiometricManager) {
                        permissionGranted = tg.BiometricManager.isAccessGranted;
                    }
                } else if (pageState.verificationType === "gyroscope") {
                    // Проверяем через данные
                    permissionGranted = await new Promise<boolean>((resolve) => {
                        let dataReceived = false;
                        const testListener = (event: DeviceOrientationEvent) => {
                            if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                                dataReceived = true;
                                window.removeEventListener("deviceorientation", testListener);
                                resolve(true);
                            }
                        };

                        window.addEventListener("deviceorientation", testListener);
                        setTimeout(() => {
                            if (!dataReceived) {
                                window.removeEventListener("deviceorientation", testListener);
                                resolve(false);
                            }
                        }, 1000);
                    });
                }

                if (permissionGranted) {
                    console.log("Permission detected during auto-check");
                    handlePermissionGranted();
                }
            } catch (error) {
                console.error("Error during auto permission check:", error);
            }
        }, PERMISSION_CHECK_INTERVAL_MS);
    }, [pageState.autoCheckPermissions, pageState.verificationType]);

    /**
     * Обработка получения разрешения
     */
    const handlePermissionGranted = useCallback(() => {
        console.log("Permission granted - switching to verification");
        cleanupTimers();
        
        setPageState((prev) => ({
            ...prev,
            deviceCapability: {
                ...prev.deviceCapability,
                permissionGranted: true,
            },
            phase: "ready_to_verify",
            autoCheckPermissions: false,
        }));

        // Открываем модальное окно через небольшую задержку
        setTimeout(() => openVerificationModal(), 1000);
    }, [cleanupTimers]);

    /**
     * Блокировка за неподдерживаемое устройство
     */
    const blockForUnsupportedDevice = useCallback(async (type: VerificationType) => {
        if (!pageState.attemptId) return;

        try {
            const endpoint = type === "biometric" ? "/api/nebula/biometric" : "/api/nebula/gyroscope";
            await makeAuthenticatedRequest(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    completedInTime: false,
                    deviceSupported: false,
                    unavailable: true,
                    attemptId: pageState.attemptId,
                }),
            });

            router.push("/blocked");
        } catch (error) {
            console.error("Error blocking for unsupported device:", error);
            router.push("/blocked");
        }
    }, [pageState.attemptId, makeAuthenticatedRequest, router]);

    /**
     * Блокировка за истечение времени на получение разрешения
     */
    const blockForPermissionTimeout = useCallback(async () => {
        if (!pageState.attemptId || !pageState.verificationType) return;

        try {
            const endpoint = pageState.verificationType === "biometric" ? "/api/nebula/biometric" : "/api/nebula/gyroscope";
            await makeAuthenticatedRequest(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    completedInTime: false,
                    deviceSupported: true,
                    permissionDenied: true,
                    attemptId: pageState.attemptId,
                }),
            });

            setPageState((prev) => ({ ...prev, phase: "failure" }));
            setTimeout(() => router.push("/blocked"), 2000);
        } catch (error) {
            console.error("Error blocking for permission timeout:", error);
            router.push("/blocked");
        }
    }, [pageState.attemptId, pageState.verificationType, makeAuthenticatedRequest, router]);

    /**
     * Открытие модального окна верификации
     */
    const openVerificationModal = useCallback(() => {
        if (!pageState.verificationType || !pageState.attemptId) return;

        console.log("Opening verification modal");
        setPageState((prev) => ({ ...prev, phase: "verifying" }));
    }, [pageState.verificationType, pageState.attemptId]);

    /**
     * Обработка успешной верификации
     */
    const handleVerificationSuccess = useCallback(() => {
        cleanupTimers();
        setPageState((prev) => ({ ...prev, phase: "success" }));
        setTimeout(() => router.push("/main"), 2000);
    }, [cleanupTimers, router]);

    /**
     * Обработка неудачной верификации
     */
    const handleVerificationFailure = useCallback(() => {
        cleanupTimers();
        setPageState((prev) => ({ ...prev, phase: "failure" }));
        setTimeout(() => router.push("/blocked"), 2000);
    }, [cleanupTimers, router]);

    /**
     * Закрытие модального окна
     */
    const handleCloseModal = useCallback(() => {
        if (pageState.phase !== "verifying") return;
        
        setPageState((prev) => ({ 
            ...prev, 
            phase: pageState.deviceCapability.permissionGranted ? "ready_to_verify" : "permission_required"
        }));
    }, [pageState.phase, pageState.deviceCapability.permissionGranted]);

    // Инициализация при загрузке страницы
    useEffect(() => {
        if (!authState.isAuthenticated) {
            router.push("/");
            return;
        }

        checkNebulaStatus();

        return cleanupTimers;
    }, [authState.isAuthenticated, checkNebulaStatus, router, cleanupTimers]);

    /**
     * Форматирование времени
     */
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    /**
     * Получение иконки верификации
     */
    const getVerificationIcon = (type: VerificationType) => {
        switch (type) {
            case "captcha":
                return <Shield className="text-yellow-400" size={64} />;
            case "biometric":
                return <Fingerprint className="text-blue-400" size={64} />;
            case "gyroscope":
                return <Compass className="text-purple-400" size={64} />;
            default:
                return <Shield className="text-gray-400" size={64} />;
        }
    };

    /**
     * Получение цвета рейтинга доверия
     */
    const getTrustScoreColor = (score: number): string => {
        if (score >= 40) return "text-green-400";
        if (score >= 20) return "text-yellow-400";
        if (score >= 10) return "text-orange-400";
        return "text-red-400";
    };

    // Рендер различных состояний
    if (pageState.phase === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">{t("nebula.verification.loading")}</p>
                </div>
            </div>
        );
    }

    if (pageState.phase === "error") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">
                        {t("nebula.verification.error")}
                    </h2>
                    <p className="text-red-300 text-sm mb-6">{pageState.error}</p>
                    <button
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                        onClick={checkNebulaStatus}
                    >
                        {t("nebula.verification.tryAgain")}
                    </button>
                </div>
            </div>
        );
    }

    if (pageState.phase === "device_checking") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        {pageState.verificationType && getVerificationIcon(pageState.verificationType)}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Проверка поддержки устройства
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Проверяем, поддерживает ли ваше устройство требуемый тип аутентификации...
                    </p>
                    <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    if (pageState.phase === "device_unsupported") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="text-red-400" size={48} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Устройство не поддерживается
                    </h2>
                    <p className="text-red-300 text-sm mb-4">
                        Ваше устройство не поддерживает требуемый тип аутентификации.
                    </p>
                    <p className="text-red-200 text-xs mb-6">
                        {pageState.error}
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                        <p className="text-yellow-300 text-xs">
                            Ваш аккаунт будет заблокирован из-за несовместимости устройства.
                        </p>
                    </div>
                    <p className="text-gray-400 text-xs">Перенаправление на страницу блокировки...</p>
                </div>
            </div>
        );
    }

    if (pageState.phase === "permission_required") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
                    {/* Заголовок */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Settings className="text-blue-400" size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Требуется разрешение
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Для продолжения необходимо предоставить разрешение на использование {
                                pageState.verificationType === "biometric" ? "биометрической аутентификации" : "гироскопа"
                            }
                        </p>
                    </div>

                    {/* Таймер */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-orange-300 font-semibold">Время на получение разрешения:</span>
                            <span className="text-orange-400 font-bold text-lg">
                                {formatTime(pageState.permissionTimer)}
                            </span>
                        </div>
                        <div className="w-full bg-orange-900/30 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-orange-500 transition-all duration-1000"
                                style={{ 
                                    width: `${(pageState.permissionTimer / (PERMISSION_TIMEOUT_MS / 1000)) * 100}%` 
                                }}
                            />
                        </div>
                        <p className="text-orange-200 text-xs mt-2">
                            Вы можете безопасно покинуть приложение для настройки разрешений
                        </p>
                    </div>

                    {/* Инструкция */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-300 font-semibold mb-2">Инструкция:</h3>
                        <div className="text-blue-200 text-sm space-y-1">
                            <p>1. Нажмите кнопку Предоставить разрешение</p>
                            <p>2. Согласитесь в системном диалоге или настройках</p>
                            <p>3. Перезапустите приложение</p>
                        </div>
                    </div>

                    {/* Предупреждение */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <h4 className="text-red-300 font-semibold mb-1 text-sm">Внимание!</h4>
                                <p className="text-red-200 text-xs">
                                    Если вы не предоставите разрешение в течение {formatTime(pageState.permissionTimer)}, 
                                    ваш аккаунт будет автоматически заблокирован.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Кнопка запроса разрешения */}
                    <button
                        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold disabled:opacity-50"
                        onClick={requestPermission}
                        disabled={pageState.deviceCapability.permissionRequested}
                    >
                        <Shield size={20} />
                        <span>
                            {pageState.deviceCapability.permissionRequested 
                                ? "Разрешение запрошено" 
                                : "Предоставить разрешение"
                            }
                        </span>
                    </button>

                    {pageState.deviceCapability.permissionRequested && (
                        <p className="text-gray-400 text-xs text-center mt-3">
                            Ожидаем предоставления разрешения... Проверка каждые {PERMISSION_CHECK_INTERVAL_MS / 1000} секунд
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (pageState.phase === "ready_to_verify") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="text-green-400" size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Готов к верификации
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Устройство поддерживает требуемый тип аутентификации. Начинаем верификацию...
                        </p>
                    </div>
                    <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    if (pageState.phase === "success") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-green-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-green-400" size={48} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {t("nebula.verification.success.title")}
                    </h2>
                    <p className="text-green-300 text-sm mb-4">
                        {t("nebula.verification.success.message")}
                    </p>
                    <p className="text-gray-400 text-xs">{t("nebula.verification.success.redirecting")}</p>
                </div>
            </div>
        );
    }

    if (pageState.phase === "failure") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="text-red-400" size={48} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {t("nebula.verification.failure.title")}
                    </h2>
                    <p className="text-red-300 text-sm mb-4">
                        {t("nebula.verification.failure.message")}
                    </p>
                    <p className="text-gray-400 text-xs">
                        {t("nebula.verification.failure.redirecting")}
                    </p>
                </div>
            </div>
        );
    }

    // Фаза верификации - отображаем модальные окна
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            {/* Модальные окна верификации */}
            {pageState.verificationType === "captcha" && (
                <NebulaCaptchaModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.phase === "verifying"}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                />
            )}

            {pageState.verificationType === "biometric" && (
                <NebulaBiometricModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.phase === "verifying"}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    skipDeviceCheck={true} // Новый пропс для пропуска проверки устройства
                />
            )}

            {pageState.verificationType === "gyroscope" && (
                <NebulaGyroscopeModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.phase === "verifying"}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    skipDeviceCheck={true} // Новый пропс для пропуска проверки устройства
                />
            )}
        </div>
    );
}