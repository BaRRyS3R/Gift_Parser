// src/hooks/useGyroscopePermission.ts - Исправленный хук с обработкой отклоненных разрешений

import { useState, useEffect, useCallback } from "react";

interface GyroscopePermissionState {
    isSupported: boolean;
    isAvailable: boolean;
    permissionGranted: boolean;
    permissionRequested: boolean;
    permissionDenied: boolean;
    needsManualEnable: boolean;
    isLoading: boolean;
    error: string | null;
    showModal: boolean;
}

interface GyroscopePermissionActions {
    requestPermission: () => Promise<void>;
    skipPermission: () => void;
    recheckPermission: () => Promise<void>;
    hideModal: () => void;
    checkPermission: () => Promise<void>;
}

const PERMISSION_STORAGE_KEY = "gyroscope_permission_status";

type PermissionStatus = "granted" | "denied" | "prompt" | "unknown";

export function useGyroscopePermission(): GyroscopePermissionState & GyroscopePermissionActions {
    const [state, setState] = useState<GyroscopePermissionState>({
        isSupported: false,
        isAvailable: false,
        permissionGranted: false,
        permissionRequested: false,
        permissionDenied: false,
        needsManualEnable: false,
        isLoading: true,
        error: null,
        showModal: false,
    });

    /**
     * Сохранение статуса разрешения в localStorage
     */
    const savePermissionStatus = useCallback((status: PermissionStatus): void => {
        try {
            localStorage.setItem(PERMISSION_STORAGE_KEY, status);
        } catch (error) {
            console.warn("Failed to save permission status:", error);
        }
    }, []);

    /**
     * Получение сохраненного статуса разрешения
     */
    const getSavedPermissionStatus = useCallback((): PermissionStatus => {
        try {
            const saved = localStorage.getItem(PERMISSION_STORAGE_KEY);
            return (saved as PermissionStatus) || "unknown";
        } catch (error) {
            return "unknown";
        }
    }, []);

    /**
     * Проверка поддержки гироскопа устройством
     */
    const checkDeviceSupport = useCallback(async (): Promise<boolean> => {
        if (typeof window === "undefined") {
            return false;
        }

        // Проверяем наличие DeviceOrientationEvent
        if (!window.DeviceOrientationEvent) {
            return false;
        }

        return true;
    }, []);

    /**
     * Проверка доступности данных гироскопа
     */
    const checkDataAvailability = useCallback(async (): Promise<boolean> => {
        return new Promise((resolve) => {
            let dataReceived = false;
            let timeoutId: NodeJS.Timeout;

            const testListener = (event: DeviceOrientationEvent) => {
                if (
                    event.alpha !== null ||
                    event.beta !== null ||
                    event.gamma !== null
                ) {
                    dataReceived = true;
                    window.removeEventListener("deviceorientation", testListener);
                    clearTimeout(timeoutId);
                    resolve(true);
                }
            };

            window.addEventListener("deviceorientation", testListener);

            // Тайм-аут для проверки
            timeoutId = setTimeout(() => {
                if (!dataReceived) {
                    window.removeEventListener("deviceorientation", testListener);
                    resolve(false);
                }
            }, 3000);
        });
    }, []);

    /**
     * Проверка актуального статуса разрешений
     */
    const checkCurrentPermissionStatus = useCallback(async (): Promise<{
        hasPermission: boolean;
        isDenied: boolean;
        needsManualEnable: boolean;
    }> => {
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

        // Если не требуется разрешение (Android/старые iOS)
        if (typeof DeviceOrientationEvent.requestPermission !== "function") {
            const dataAvailable = await checkDataAvailability();
            return {
                hasPermission: dataAvailable,
                isDenied: false,
                needsManualEnable: false,
            };
        }

        // Для iOS 13+ - сначала проверяем данные
        const dataAvailable = await checkDataAvailability();

        if (dataAvailable) {
            return {
                hasPermission: true,
                isDenied: false,
                needsManualEnable: false,
            };
        }

        // Если данных нет, проверяем сохраненный статус
        const savedStatus = getSavedPermissionStatus();

        if (savedStatus === "denied") {
            return {
                hasPermission: false,
                isDenied: true,
                needsManualEnable: true,
            };
        }

        return {
            hasPermission: false,
            isDenied: false,
            needsManualEnable: false,
        };
    }, [checkDataAvailability, getSavedPermissionStatus]);

    /**
     * Запрос разрешения на использование гироскопа
     */
    const requestPermission = useCallback(async (): Promise<void> => {
        if (state.permissionRequested) {
            return;
        }

        setState(prev => ({
            ...prev,
            permissionRequested: true,
            error: null
        }));

        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            // Если функция requestPermission доступна (iOS 13+)
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();

                    if (permission === "granted") {
                        savePermissionStatus("granted");
                        setState(prev => ({
                            ...prev,
                            permissionGranted: true,
                            permissionDenied: false,
                            needsManualEnable: false,
                            showModal: false,
                            error: null,
                            permissionRequested: false,
                        }));
                    } else {
                        // Пользователь отклонил разрешение
                        savePermissionStatus("denied");
                        setState(prev => ({
                            ...prev,
                            permissionGranted: false,
                            permissionDenied: true,
                            needsManualEnable: true,
                            permissionRequested: false,
                            error: null,
                        }));
                    }
                } catch (error) {
                    // Ошибка означает что разрешение было отклонено ранее
                    console.warn("Permission request failed (likely denied before):", error);
                    savePermissionStatus("denied");
                    setState(prev => ({
                        ...prev,
                        permissionGranted: false,
                        permissionDenied: true,
                        needsManualEnable: true,
                        permissionRequested: false,
                        error: null,
                    }));
                }
            } else {
                // Для устройств без требования разрешения
                const dataAvailable = await checkDataAvailability();
                setState(prev => ({
                    ...prev,
                    permissionGranted: dataAvailable,
                    permissionDenied: !dataAvailable,
                    needsManualEnable: false,
                    showModal: !dataAvailable,
                    error: dataAvailable ? null : "Gyroscope data not available",
                    permissionRequested: false,
                }));
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            setState(prev => ({
                ...prev,
                permissionRequested: false,
                permissionDenied: true,
                needsManualEnable: true,
                error: "Failed to request permission",
            }));
        }
    }, [state.permissionRequested, checkDataAvailability, savePermissionStatus]);

    /**
     * Пропуск запроса разрешения (для необязательной функциональности)
     */
    const skipPermission = useCallback((): void => {
        savePermissionStatus("denied");
        setState(prev => ({
            ...prev,
            showModal: false,
            permissionDenied: true,
            needsManualEnable: false,
            error: null,
        }));
    }, [savePermissionStatus]);

    /**
     * Повторная проверка разрешения (после ручного включения в настройках)
     */
    const recheckPermission = useCallback(async (): Promise<void> => {
        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            permissionRequested: false
        }));

        try {
            const status = await checkCurrentPermissionStatus();

            if (status.hasPermission) {
                savePermissionStatus("granted");
                setState(prev => ({
                    ...prev,
                    permissionGranted: true,
                    permissionDenied: false,
                    needsManualEnable: false,
                    showModal: false,
                    isLoading: false,
                    error: null,
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    permissionGranted: false,
                    permissionDenied: status.isDenied,
                    needsManualEnable: status.needsManualEnable,
                    showModal: true,
                    isLoading: false,
                }));
            }
        } catch (error) {
            console.error("Error rechecking permission:", error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to recheck permission",
            }));
        }
    }, [checkCurrentPermissionStatus, savePermissionStatus]);

    /**
     * Скрытие модального окна (только для случаев когда гироскоп недоступен)
     */
    const hideModal = useCallback(() => {
        if (!state.isSupported) {
            setState(prev => ({ ...prev, showModal: false }));
        }
    }, [state.isSupported]);

    /**
     * Полная проверка состояния гироскопа
     */
    const checkPermission = useCallback(async (): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // 1. Проверяем поддержку устройством
            const isSupported = await checkDeviceSupport();

            if (!isSupported) {
                setState(prev => ({
                    ...prev,
                    isSupported: false,
                    isAvailable: false,
                    permissionGranted: false,
                    showModal: false,
                    isLoading: false,
                }));
                return;
            }

            // 2. Проверяем актуальный статус разрешений
            const status = await checkCurrentPermissionStatus();

            setState(prev => ({
                ...prev,
                isSupported: true,
                isAvailable: true,
                permissionGranted: status.hasPermission,
                permissionDenied: status.isDenied,
                needsManualEnable: status.needsManualEnable,
                showModal: !status.hasPermission, // Показываем модал только если нет разрешения
                isLoading: false,
            }));

        } catch (error) {
            console.error("Error checking gyroscope permission:", error);
            setState(prev => ({
                ...prev,
                isSupported: false,
                isAvailable: false,
                permissionGranted: false,
                showModal: false,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to check gyroscope",
            }));
        }
    }, [checkDeviceSupport, checkCurrentPermissionStatus]);

    /**
     * Инициализация при монтировании компонента
     */
    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    /**
     * Автоматическая повторная проверка при изменении фокуса окна
     * Полезно когда пользователь предоставил разрешение в настройках
     */
    useEffect(() => {
        const handleFocus = () => {
            if (state.isSupported && !state.permissionGranted && state.needsManualEnable) {
                recheckPermission();
            }
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [state.isSupported, state.permissionGranted, state.needsManualEnable, recheckPermission]);

    return {
        ...state,
        requestPermission,
        skipPermission,
        recheckPermission,
        hideModal,
        checkPermission,
    };
}