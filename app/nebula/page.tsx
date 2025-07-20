// src/app/nebula/page.tsx - Обновленная система отслеживания с улучшенной логикой фаз

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, Zap } from "lucide-react";

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
type AuthPhase =
    | "initializing"
    | "checking_availability"
    | "unavailable"
    | "permission_required"
    | "permission_requested"
    | "permission_checking"
    | "instructions"
    | "auth"
    | "verification"
    | "success"
    | "error";

interface PageState {
    isLoading: boolean;
    error: string | null;
    verificationType: VerificationType | null;
    trustScore: number;
    threshold: number;
    isModalOpen: boolean;
    verificationInProgress: boolean;
    verificationResult: "success" | "failure" | null;
    attemptId: string | null;
    currentPhase: AuthPhase;
    canAbandon: boolean;
}

// Улучшенная конфигурация отслеживания покидания
interface AbandonmentState {
    lastVisibleTime: number;
    unsafePhaseAbandonmentTimeout: number; // 45 секунд вместо 30
    safePhaseGraceTime: number; // 300 секунд (5 минут) для безопасных фаз
    abandonmentTimeoutId: NodeJS.Timeout | null;
    permissionPhaseStartTime: number | null;
    totalPermissionTime: number;
    phaseTransitionBuffer: number; // 5 секунд буфера при смене фаз
    lastPhaseChange: number;
}

// Определение безопасных фаз для покидания страницы
const SAFE_ABANDONMENT_PHASES: AuthPhase[] = [
    "initializing",
    "checking_availability",
    "permission_required",
    "permission_requested",
    "permission_checking",
    "instructions",
    "error",
    "success"
];

// Небезопасные фазы (пользователь не должен покидать страницу)
const UNSAFE_ABANDONMENT_PHASES: AuthPhase[] = [
    "auth",
    "verification"
];

export default function NebulaPage(): JSX.Element {
    const router = useRouter();
    const { makeAuthenticatedRequest, authState } = useUser();
    const t = useT();

    // Улучшенные ссылки для состояния покидания
    const abandonmentStateRef = useRef<AbandonmentState>({
        lastVisibleTime: Date.now(),
        unsafePhaseAbandonmentTimeout: 45000, // Увеличено с 30 до 45 секунд
        safePhaseGraceTime: 300000, // 5 минут для безопасных фаз
        abandonmentTimeoutId: null,
        permissionPhaseStartTime: null,
        totalPermissionTime: 0,
        phaseTransitionBuffer: 5000, // 5 секунд буфера при смене фаз
        lastPhaseChange: Date.now(),
    });

    const [pageState, setPageState] = useState<PageState>({
        isLoading: true,
        error: null,
        verificationType: null,
        trustScore: 50,
        threshold: 40,
        isModalOpen: false,
        verificationInProgress: false,
        verificationResult: null,
        attemptId: null,
        currentPhase: "initializing",
        canAbandon: false,
    });

    /**
     * Определение безопасности фазы для покидания
     */
    const isPhaseAbandonmentSafe = useCallback((phase: AuthPhase): boolean => {
        return SAFE_ABANDONMENT_PHASES.includes(phase);
    }, []);

    /**
     * Получение подходящего тайм-аута для текущей фазы
     */
    const getPhaseAbandonmentTimeout = useCallback((phase: AuthPhase, canAbandon: boolean): number => {
        const abandonmentState = abandonmentStateRef.current;

        // Если фаза считается безопасной или явно разрешено покидание
        if (isPhaseAbandonmentSafe(phase) || canAbandon) {
            return abandonmentState.safePhaseGraceTime;
        }

        // Для небезопасных фаз используем короткий тайм-аут
        return abandonmentState.unsafePhaseAbandonmentTimeout;
    }, [isPhaseAbandonmentSafe]);

    /**
     * Улучшенный обработчик изменения фазы с умной логикой покидания
     */
    const handlePhaseChange = useCallback((phase: AuthPhase, canAbandon: boolean) => {
        const now = Date.now();
        const abandonmentState = abandonmentStateRef.current;

        console.log(`Phase changed: ${pageState.currentPhase} → ${phase}, can abandon: ${canAbandon}`);

        // Отслеживание времени в фазах разрешений
        const isPermissionPhase = phase === "permission_required" ||
            phase === "permission_requested" ||
            phase === "permission_checking";

        if (isPermissionPhase && !abandonmentState.permissionPhaseStartTime) {
            abandonmentState.permissionPhaseStartTime = now;
            console.log("Permission phase started - enabling safe abandonment tracking");
        } else if (!isPermissionPhase && abandonmentState.permissionPhaseStartTime) {
            const permissionDuration = now - abandonmentState.permissionPhaseStartTime;
            abandonmentState.totalPermissionTime += permissionDuration;
            abandonmentState.permissionPhaseStartTime = null;
            console.log(`Permission phase ended after ${permissionDuration}ms`);
        }

        // Обновление состояния страницы
        setPageState(prev => ({
            ...prev,
            currentPhase: phase,
            canAbandon,
        }));

        // Отслеживание времени изменения фазы
        abandonmentState.lastPhaseChange = now;

        // Очистка существующего тайм-аута покидания
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
            console.log("Cleared existing abandonment timeout due to phase change");
        }

        // Установка нового тайм-аута если страница скрыта
        if (document.hidden && pageState.verificationInProgress && pageState.attemptId) {
            const phaseTimeout = getPhaseAbandonmentTimeout(phase, canAbandon);
            const timeSinceHidden = now - abandonmentState.lastVisibleTime;
            const remainingTimeout = Math.max(1000, phaseTimeout - timeSinceHidden);

            console.log(`Setting new abandonment timeout: ${remainingTimeout}ms for phase: ${phase}`);

            abandonmentState.abandonmentTimeoutId = setTimeout(() => {
                if (document.hidden) {
                    const finalPhaseCheck = isPhaseAbandonmentSafe(phase) || canAbandon;
                    if (!finalPhaseCheck) {
                        console.log("User away too long in unsafe phase after phase change, reporting abandonment");
                        reportAbandonment("phase_change_timeout");
                    }
                }
            }, remainingTimeout);
        }
    }, [pageState.currentPhase, pageState.verificationInProgress, pageState.attemptId, getPhaseAbandonmentTimeout, isPhaseAbandonmentSafe]);

    /**
     * Сообщение о покидании верификации на сервер
     */
    const reportAbandonment = useCallback(async (reason: string) => {
        if (!pageState.attemptId) {
            console.log("No attempt ID available for abandonment reporting");
            return;
        }

        console.log(`Reporting abandonment: ${reason}`);

        try {
            const abandonmentContext = {
                currentPhase: pageState.currentPhase,
                canAbandon: pageState.canAbandon,
                totalPermissionTime: abandonmentStateRef.current.totalPermissionTime,
                phaseAtAbandonment: pageState.currentPhase,
                timeInCurrentPhase: Date.now() - abandonmentStateRef.current.lastPhaseChange,
            };

            await makeAuthenticatedRequest("/api/nebula/abandon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attemptId: pageState.attemptId,
                    reason,
                    abandonmentContext,
                }),
            });
            console.log("Abandonment reported successfully");
        } catch (error) {
            console.error("Error reporting abandonment:", error);
        }
    }, [pageState.attemptId, pageState.currentPhase, pageState.canAbandon, makeAuthenticatedRequest]);

    /**
     * Улучшенный обработчик изменения видимости с буферизацией фаз
     */
    const handleVisibilityChange = useCallback(async () => {
        const now = Date.now();
        const abandonmentState = abandonmentStateRef.current;

        if (document.hidden) {
            // Пользователь покинул страницу
            abandonmentState.lastVisibleTime = now;
            const timeSincePhaseChange = now - abandonmentState.lastPhaseChange;

            console.log(`Page hidden. Phase: ${pageState.currentPhase}, can abandon: ${pageState.canAbandon}, time since phase change: ${timeSincePhaseChange}ms`);

            // Очистка существующего тайм-аута
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
                abandonmentState.abandonmentTimeoutId = null;
            }

            // Проверка необходимости отслеживания покидания
            if (pageState.verificationInProgress && pageState.attemptId) {
                const isSafePhase = isPhaseAbandonmentSafe(pageState.currentPhase) || pageState.canAbandon;
                const phaseTimeout = getPhaseAbandonmentTimeout(pageState.currentPhase, pageState.canAbandon);

                // Добавляем буфер если смена фазы была недавно
                const bufferTime = timeSincePhaseChange < abandonmentState.phaseTransitionBuffer ?
                    abandonmentState.phaseTransitionBuffer : 0;

                const finalTimeout = phaseTimeout + bufferTime;

                console.log(`Setting abandonment timeout: ${finalTimeout}ms (base: ${phaseTimeout}ms, buffer: ${bufferTime}ms) for ${isSafePhase ? 'safe' : 'unsafe'} phase`);

                abandonmentState.abandonmentTimeoutId = setTimeout(() => {
                    if (document.hidden) {
                        const currentlySafe = isPhaseAbandonmentSafe(pageState.currentPhase) || pageState.canAbandon;
                        if (!currentlySafe) {
                            console.log("User away too long in unsafe phase, reporting abandonment");
                            reportAbandonment("page_hidden_timeout");
                        } else {
                            console.log("User away in safe phase - no abandonment reported");
                        }
                    }
                }, finalTimeout);
            } else {
                console.log("Verification not in progress - no abandonment tracking needed");
            }
        } else {
            // Пользователь вернулся на страницу
            const awayTime = now - abandonmentState.lastVisibleTime;
            console.log(`Page visible again. Away time: ${awayTime}ms, phase: ${pageState.currentPhase}`);

            // Очистка тайм-аута покидания
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
                abandonmentState.abandonmentTimeoutId = null;
                console.log("Cleared abandonment timeout - user returned");
            }

            // Логирование длительного отсутствия в безопасных фазах
            const isSafePhase = isPhaseAbandonmentSafe(pageState.currentPhase) || pageState.canAbandon;
            if (isSafePhase && awayTime > 60000) {
                console.log(`Long absence (${awayTime}ms) during safe phase - this is acceptable`);
            }
        }
    }, [
        pageState.currentPhase,
        pageState.canAbandon,
        pageState.verificationInProgress,
        pageState.attemptId,
        reportAbandonment,
        isPhaseAbandonmentSafe,
        getPhaseAbandonmentTimeout
    ]);

    /**
     * Улучшенный обработчик закрытия страницы
     */
    const handleBeforeUnload = useCallback(() => {
        const abandonmentState = abandonmentStateRef.current;

        if (pageState.verificationInProgress && pageState.attemptId) {
            const isSafePhase = isPhaseAbandonmentSafe(pageState.currentPhase) || pageState.canAbandon;

            if (isSafePhase) {
                console.log("Page unloading during safe phase - no abandonment reported");
                return;
            }

            console.log("Page unloading during unsafe phase - reporting immediate abandonment");

            // Использование sendBeacon для надежной доставки при закрытии страницы
            const payload = JSON.stringify({
                attemptId: pageState.attemptId,
                reason: "page_unload",
                abandonmentContext: {
                    currentPhase: pageState.currentPhase,
                    canAbandon: pageState.canAbandon,
                    totalPermissionTime: abandonmentState.totalPermissionTime,
                    timeInCurrentPhase: Date.now() - abandonmentState.lastPhaseChange,
                },
            });

            try {
                navigator.sendBeacon("/api/nebula/abandon", payload);
            } catch (error) {
                console.error("Failed to send abandonment beacon:", error);
            }
        }
    }, [
        pageState.verificationInProgress,
        pageState.attemptId,
        pageState.currentPhase,
        pageState.canAbandon,
        isPhaseAbandonmentSafe
    ]);

    /**
     * Настройка улучшенных обработчиков событий отслеживания покидания
     */
    useEffect(() => {
        console.log("Setting up enhanced abandonment tracking listeners");

        // Добавление обработчиков событий
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Функция очистки
        return () => {
            console.log("Cleaning up abandonment tracking listeners");
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // Очистка pending тайм-аутов
            const abandonmentState = abandonmentStateRef.current;
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
                abandonmentState.abandonmentTimeoutId = null;
            }
        };
    }, [handleVisibilityChange, handleBeforeUnload]);

    /**
     * Проверка статуса Nebula верификации
     */
    const checkNebulaStatus = useCallback(async () => {
        setPageState((prev) => ({ ...prev, isLoading: true, error: null }));

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
                    isLoading: false,
                    verificationType: result.verification!.type,
                    trustScore: result.verification!.trustScore,
                    threshold: result.verification!.threshold,
                    attemptId: result.verification!.attemptId,
                }));
            } else {
                throw new Error("Unknown verification status");
            }
        } catch (error) {
            console.error("Error checking Nebula status:", error);
            setPageState((prev) => ({
                ...prev,
                isLoading: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to check verification status",
            }));
        }
    }, [makeAuthenticatedRequest, router]);

    // Инициализация страницы
    useEffect(() => {
        if (!authState.isAuthenticated) {
            router.push("/");
            return;
        }

        checkNebulaStatus();
    }, [authState.isAuthenticated, checkNebulaStatus, router]);

    /**
     * Начало процесса верификации
     */
    const handleStartVerification = useCallback(() => {
        if (
            pageState.verificationInProgress ||
            !pageState.verificationType ||
            !pageState.attemptId
        ) {
            return;
        }

        console.log("Starting verification process");
        setPageState((prev) => ({
            ...prev,
            isModalOpen: true,
            verificationInProgress: true,
            verificationResult: null,
        }));

        // Сброс отслеживания покидания для новой верификации
        const abandonmentState = abandonmentStateRef.current;
        abandonmentState.permissionPhaseStartTime = null;
        abandonmentState.totalPermissionTime = 0;
        abandonmentState.lastPhaseChange = Date.now();
    }, [
        pageState.verificationInProgress,
        pageState.verificationType,
        pageState.attemptId,
    ]);

    /**
     * Обработка успешной верификации
     */
    const handleVerificationSuccess = useCallback(() => {
        console.log("Verification completed successfully");
        setPageState((prev) => ({
            ...prev,
            isModalOpen: false,
            verificationInProgress: false,
            verificationResult: "success",
            attemptId: null,
            canAbandon: true, // Безопасное состояние
            currentPhase: "success",
        }));

        // Очистка pending тайм-аутов покидания
        const abandonmentState = abandonmentStateRef.current;
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
        }

        // Перенаправление на главную страницу после короткой задержки
        setTimeout(() => {
            router.push("/main");
        }, 2000);
    }, [router]);

    /**
     * Обработка неудачной верификации
     */
    const handleVerificationFailure = useCallback(() => {
        console.log("Verification failed");
        setPageState((prev) => ({
            ...prev,
            isModalOpen: false,
            verificationInProgress: false,
            verificationResult: "failure",
            attemptId: null,
            canAbandon: true, // Безопасное состояние
            currentPhase: "error",
        }));

        // Очистка pending тайм-аутов покидания
        const abandonmentState = abandonmentStateRef.current;
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
        }

        // Перенаправление на страницу блокировки после короткой задержки
        setTimeout(() => {
            router.push("/blocked");
        }, 2000);
    }, [router]);

    /**
     * Закрытие модального окна верификации (только если не в процессе)
     */
    const handleCloseModal = useCallback(() => {
        if (!pageState.verificationInProgress) {
            setPageState((prev) => ({
                ...prev,
                isModalOpen: false,
            }));
        }
    }, [pageState.verificationInProgress]);

    /**
     * Получение иконки верификации
     */
    const getVerificationIcon = (type: VerificationType) => {
        switch (type) {
            case "captcha":
                return <Shield className="text-yellow-400" size={64} />;
            case "biometric":
                return <Zap className="text-blue-400" size={64} />;
            case "gyroscope":
                return <Clock className="text-purple-400" size={64} />;
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

    // Состояние загрузки
    if (pageState.isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">{t("nebula.verification.loading")}</p>
                </div>
            </div>
        );
    }

    // Состояние ошибки
    if (pageState.error) {
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

    // Отображение результата успеха
    if (pageState.verificationResult === "success") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-green-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="text-green-400" size={32} />
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

    // Отображение результата неудачи
    if (pageState.verificationResult === "failure") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-400" size={32} />
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

    // Главная страница верификации
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
                {/* Заголовок */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {pageState.verificationType &&
                                getVerificationIcon(pageState.verificationType)}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {t("nebula.verification.title")}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {t("nebula.verification.subtitle")}
                    </p>
                </div>

                {/* Отображение рейтинга доверия */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 text-sm">{t("nebula.verification.trustScore")}</span>
                        <span
                            className={`font-bold text-lg ${getTrustScoreColor(pageState.trustScore)}`}
                        >
                            {pageState.trustScore}
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                            className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                            style={{
                                width: `${Math.min(100, (pageState.trustScore / 100) * 100)}%`,
                            }}
                        />
                    </div>
                    <p className="text-gray-400 text-xs">
                        {t("nebula.verification.requiredThreshold", { threshold: pageState.threshold })}
                    </p>
                </div>

                {/* Информация о верификации */}
                {pageState.verificationType && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-300 font-semibold mb-2 capitalize">
                            {t(`nebula.verification.types.${pageState.verificationType}.name` as any)}
                        </h3>
                        <p className="text-blue-200 text-sm">
                            {t(`nebula.verification.types.${pageState.verificationType}.description` as any)}
                        </p>
                    </div>
                )}

                {/* Улучшенное предупреждение для биометрии/гироскопа */}
                {pageState.verificationType === "biometric" || pageState.verificationType === "gyroscope" ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <Shield
                                className="text-green-400 flex-shrink-0 mt-0.5"
                                size={16}
                            />
                            <div>
                                <h4 className="text-green-300 font-semibold mb-1 text-sm">
                                    {t("nebula.verification.warningBiometricSafe")}
                                </h4>
                                <p className="text-green-200 text-xs">
                                    {t("nebula.verification.warningBiometricText")}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle
                                className="text-red-400 flex-shrink-0 mt-0.5"
                                size={16}
                            />
                            <div>
                                <h4 className="text-red-300 font-semibold mb-1 text-sm">
                                    {t("nebula.verification.warningCritical")}
                                </h4>
                                <p className="text-red-200 text-xs font-bold mb-2">
                                    {t("nebula.verification.warningLeaving")}
                                </p>
                                <p className="text-red-200 text-xs">
                                    {t("nebula.verification.warningBan")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Информация о контакте для апелляций */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <h4 className="text-yellow-300 font-semibold mb-2 text-sm">
                        {t("nebula.blocked.appeal.title")}
                    </h4>
                    <p className="text-yellow-200 text-xs mb-2">
                        {t("nebula.blocked.appeal.subtitle")}
                    </p>
                    <div className="flex items-center space-x-2">
                        <span className="text-yellow-200 text-xs">{t("nebula.blocked.appeal.contact")}</span>
                        <a
                            href={t("nebula.blocked.appeal.contactLink")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-300 text-xs font-bold hover:text-yellow-100 transition-colors"
                        >
                            {t("nebula.blocked.appeal.contactText")}
                        </a>
                    </div>
                    <p className="text-yellow-200 text-xs mt-2 opacity-80">
                        {t("nebula.blocked.appeal.note")}
                    </p>
                </div>

                {/* Кнопка начала верификации */}
                <button
                    className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                    disabled={
                        pageState.verificationInProgress ||
                        !pageState.verificationType ||
                        !pageState.attemptId
                    }
                    onClick={handleStartVerification}
                >
                    {pageState.verificationInProgress ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{t("nebula.verification.verificationInProgress")}</span>
                        </>
                    ) : (
                        <>
                            <Shield size={20} />
                            <span>{t("nebula.verification.startVerification")}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Модальные окна верификации с улучшенным отслеживанием фаз */}
            {pageState.verificationType === "captcha" && (
                <NebulaCaptchaModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                />
            )}

            {pageState.verificationType === "biometric" && (
                <NebulaBiometricModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    onPhaseChange={handlePhaseChange}
                />
            )}

            {pageState.verificationType === "gyroscope" && (
                <NebulaGyroscopeModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    onPhaseChange={handlePhaseChange}
                />
            )}
        </div>
    );
}