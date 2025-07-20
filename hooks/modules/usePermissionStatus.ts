// src/hooks/modules/usePermissionStatus.ts - Централизованная система управления разрешениями

import { useState, useCallback, useEffect } from "react";

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'checking' | 'unavailable';

export interface PermissionStatus {
    biometric: PermissionState;
    gyroscope: PermissionState;
    captcha: PermissionState;
}

export interface PermissionInfo {
    isSupported: boolean;
    isGranted: boolean;
    needsPermission: boolean;
    canRequest: boolean;
}

export interface UsePermissionStatusReturn {
    status: PermissionStatus;
    checkBiometricPermission: () => Promise<PermissionInfo>;
    checkGyroscopePermission: () => Promise<PermissionInfo>;
    requestBiometricPermission: () => Promise<boolean>;
    requestGyroscopePermission: () => Promise<boolean>;
    recheckAllPermissions: () => Promise<void>;
}

/**
 * Централизованный хук для управления разрешениями верификации
 */
export function usePermissionStatus(): UsePermissionStatusReturn {
    const [status, setStatus] = useState<PermissionStatus>({
        biometric: 'checking',
        gyroscope: 'checking',
        captcha: 'granted' // Captcha doesn't require device permissions
    });

    /**
     * Проверка статуса биометрических разрешений
     */
    const checkBiometricPermission = useCallback(async (): Promise<PermissionInfo> => {
        try {
            // Проверяем доступность Telegram WebApp
            if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
                setStatus(prev => ({ ...prev, biometric: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false
                };
            }

            // Проверяем доступность BiometricManager
            const manager = window.Telegram.WebApp.BiometricManager;
            if (!manager) {
                setStatus(prev => ({ ...prev, biometric: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false
                };
            }

            // Инициализируем менеджер если не инициализирован
            if (!manager.isInited) {
                await new Promise<void>((resolve) => {
                    manager.init(() => resolve());
                });
            }

            // Проверяем доступность биометрии на устройстве
            if (!manager.isBiometricAvailable) {
                setStatus(prev => ({ ...prev, biometric: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false
                };
            }

            // Проверяем статус разрешений
            const isGranted = manager.isAccessGranted;
            const newStatus: PermissionState = isGranted ? 'granted' : 'prompt';
            
            setStatus(prev => ({ ...prev, biometric: newStatus }));

            return {
                isSupported: true,
                isGranted,
                needsPermission: !isGranted,
                canRequest: !isGranted
            };

        } catch (error) {
            console.error('Error checking biometric permission:', error);
            setStatus(prev => ({ ...prev, biometric: 'denied' }));
            return {
                isSupported: false,
                isGranted: false,
                needsPermission: false,
                canRequest: false
            };
        }
    }, []);

    /**
     * Проверка статуса разрешений гироскопа
     */
    const checkGyroscopePermission = useCallback(async (): Promise<PermissionInfo> => {
        try {
            // Проверяем доступность API
            if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
                setStatus(prev => ({ ...prev, gyroscope: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false
                };
            }

            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            // Проверяем нужно ли разрешение (iOS 13+ и современные браузеры)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    // Проверяем текущий статус без запроса
                    const permission = await navigator.permissions?.query?.({ name: 'accelerometer' as any })
                        .catch(() => null);

                    let permissionState: PermissionState;
                    let isGranted = false;

                    if (permission) {
                        switch (permission.state) {
                            case 'granted':
                                permissionState = 'granted';
                                isGranted = true;
                                break;
                            case 'denied':
                                permissionState = 'denied';
                                break;
                            default:
                                permissionState = 'prompt';
                        }
                    } else {
                        // Если permissions API недоступен, предполагаем что нужно запросить
                        permissionState = 'prompt';
                    }

                    setStatus(prev => ({ ...prev, gyroscope: permissionState }));

                    return {
                        isSupported: true,
                        isGranted,
                        needsPermission: !isGranted,
                        canRequest: permissionState !== 'denied'
                    };

                } catch (error) {
                    console.error('Error checking gyroscope permission:', error);
                    setStatus(prev => ({ ...prev, gyroscope: 'prompt' }));
                    return {
                        isSupported: true,
                        isGranted: false,
                        needsPermission: true,
                        canRequest: true
                    };
                }
            } else {
                // Для старых браузеров/устройств разрешение не требуется
                setStatus(prev => ({ ...prev, gyroscope: 'granted' }));
                return {
                    isSupported: true,
                    isGranted: true,
                    needsPermission: false,
                    canRequest: false
                };
            }

        } catch (error) {
            console.error('Error checking gyroscope support:', error);
            setStatus(prev => ({ ...prev, gyroscope: 'unavailable' }));
            return {
                isSupported: false,
                isGranted: false,
                needsPermission: false,
                canRequest: false
            };
        }
    }, []);

    /**
     * Запрос биометрического разрешения
     */
    const requestBiometricPermission = useCallback(async (): Promise<boolean> => {
        try {
            const manager = window.Telegram?.WebApp?.BiometricManager;
            if (!manager) return false;

            return new Promise<boolean>((resolve) => {
                manager.requestAccess(
                    { reason: "Security verification required for continued access" },
                    (granted: boolean) => {
                        const newStatus: PermissionState = granted ? 'granted' : 'denied';
                        setStatus(prev => ({ ...prev, biometric: newStatus }));
                        resolve(granted);
                    }
                );
            });

        } catch (error) {
            console.error('Error requesting biometric permission:', error);
            setStatus(prev => ({ ...prev, biometric: 'denied' }));
            return false;
        }
    }, []);

    /**
     * Запрос разрешения гироскопа
     */
    const requestGyroscopePermission = useCallback(async (): Promise<boolean> => {
        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                const granted = permission === 'granted';
                
                setStatus(prev => ({ 
                    ...prev, 
                    gyroscope: granted ? 'granted' : 'denied' 
                }));

                return granted;
            }

            // Для устройств без необходимости разрешения
            return true;

        } catch (error) {
            console.error('Error requesting gyroscope permission:', error);
            setStatus(prev => ({ ...prev, gyroscope: 'denied' }));
            return false;
        }
    }, []);

    /**
     * Повторная проверка всех разрешений
     */
    const recheckAllPermissions = useCallback(async (): Promise<void> => {
        console.log('Rechecking all permissions...');
        
        try {
            await Promise.all([
                checkBiometricPermission(),
                checkGyroscopePermission()
            ]);
            
            console.log('Permission recheck completed');
        } catch (error) {
            console.error('Error during permission recheck:', error);
        }
    }, [checkBiometricPermission, checkGyroscopePermission]);

    // Инициализация при монтировании компонента
    useEffect(() => {
        recheckAllPermissions();
    }, [recheckAllPermissions]);

    return {
        status,
        checkBiometricPermission,
        checkGyroscopePermission,
        requestBiometricPermission,
        requestGyroscopePermission,
        recheckAllPermissions
    };
}