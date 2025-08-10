// src/hooks/useGyroscopePermission.ts - Хук для проверки доступности и разрешений гироскопа

import { useState, useEffect, useCallback } from "react";

interface GyroscopePermissionState {
    isSupported: boolean;
    isAvailable: boolean;
    permissionGranted: boolean;
    permissionRequested: boolean;
    isLoading: boolean;
    error: string | null;
    showModal: boolean;
}

interface GyroscopePermissionActions {
    requestPermission: () => Promise<void>;
    hideModal: () => void;
    checkPermission: () => Promise<void>;
}

export function useGyroscopePermission(): GyroscopePermissionState & GyroscopePermissionActions {
    const [state, setState] = useState<GyroscopePermissionState>({
        isSupported: false,
        isAvailable: false,
        permissionGranted: false,
        permissionRequested: false,
        isLoading: true,
        error: null,
        showModal: false,
    });

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
            }, 2000);
        });
    }, []);

    /**
     * Проверка статуса разрешений
     */
    const checkPermissionStatus = useCallback(async (): Promise<boolean> => {
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

        // Если не требуется разрешение (Android/старые iOS)
        if (typeof DeviceOrientationEvent.requestPermission !== "function") {
            // Проверяем доступность данных напрямую
            return await checkDataAvailability();
        }

        // Для iOS 13+ - сначала проверяем данные, затем при необходимости запрашиваем разрешение
        const dataAvailable = await checkDataAvailability();
        return dataAvailable;
    }, [checkDataAvailability]);

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
                const permission = await DeviceOrientationEvent.requestPermission();

                if (permission === "granted") {
                    setState(prev => ({
                        ...prev,
                        permissionGranted: true,
                        showModal: false,
                        error: null,
                    }));
                } else {
                    // Если разрешение не получено, сбрасываем флаг запроса для повторной попытки
                    setState(prev => ({
                        ...prev,
                        permissionRequested: false,
                        error: "Permission denied. Please try again.",
                    }));
                }
            } else {
                // Для устройств без требования разрешения
                const dataAvailable = await checkDataAvailability();
                setState(prev => ({
                    ...prev,
                    permissionGranted: dataAvailable,
                    showModal: !dataAvailable,
                    error: dataAvailable ? null : "Gyroscope data not available",
                }));
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            setState(prev => ({
                ...prev,
                permissionRequested: false,
                error: error instanceof Error ? error.message : "Failed to request permission",
            }));
        }
    }, [state.permissionRequested, checkDataAvailability]);

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

            // 2. Проверяем статус разрешений
            const permissionGranted = await checkPermissionStatus();

            setState(prev => ({
                ...prev,
                isSupported: true,
                isAvailable: true,
                permissionGranted,
                showModal: !permissionGranted, // Показываем модал только если нет разрешения
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
    }, [checkDeviceSupport, checkPermissionStatus]);

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
            if (state.isSupported && !state.permissionGranted) {
                checkPermission();
            }
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [state.isSupported, state.permissionGranted, checkPermission]);

    return {
        ...state,
        requestPermission,
        hideModal,
        checkPermission,
    };
}