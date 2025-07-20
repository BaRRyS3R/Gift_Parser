// src/hooks/modules/usePermissionStatus.ts - Обновленная система управления разрешениями

import { useState, useCallback, useEffect } from "react";

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'checking' | 'unavailable' | 'ready';

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
    hasManager: boolean;
}

export interface BiometricManagerInfo {
    isAvailable: boolean;
    isAccessGranted: boolean;
    biometricType: string | null;
    manager: any;
}

export interface UsePermissionStatusReturn {
    status: PermissionStatus;
    checkBiometricPermission: () => Promise<PermissionInfo>;
    checkGyroscopePermission: () => Promise<PermissionInfo>;
    checkCaptchaPermission: () => Promise<PermissionInfo>;
    requestBiometricPermission: () => Promise<boolean>;
    requestGyroscopePermission: () => Promise<boolean>;
    requestCaptchaPermission: () => Promise<boolean>;
    recheckAllPermissions: () => Promise<void>;
    getBiometricManagerInfo: () => Promise<BiometricManagerInfo>;
}

/**
 * Enhanced hook for managing verification permissions with better state tracking
 */
export function usePermissionStatus(): UsePermissionStatusReturn {
    const [status, setStatus] = useState<PermissionStatus>({
        biometric: 'checking',
        gyroscope: 'checking',
        captcha: 'granted' // Captcha doesn't require device permissions
    });

    /**
     * Get detailed biometric manager information
     */
    const getBiometricManagerInfo = useCallback(async (): Promise<BiometricManagerInfo> => {
        try {
            if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
                return {
                    isAvailable: false,
                    isAccessGranted: false,
                    biometricType: null,
                    manager: null
                };
            }

            const manager = window.Telegram.WebApp.BiometricManager;
            if (!manager) {
                return {
                    isAvailable: false,
                    isAccessGranted: false,
                    biometricType: null,
                    manager: null
                };
            }

            // Initialize manager if needed
            if (!manager.isInited) {
                await new Promise<void>((resolve) => {
                    manager.init(() => resolve());
                });
            }

            return {
                isAvailable: manager.isBiometricAvailable,
                isAccessGranted: manager.isAccessGranted,
                biometricType: manager.biometricType || null,
                manager: manager
            };

        } catch (error) {
            console.error('Error getting biometric manager info:', error);
            return {
                isAvailable: false,
                isAccessGranted: false,
                biometricType: null,
                manager: null
            };
        }
    }, []);

    /**
     * Enhanced biometric permission checking
     */
    const checkBiometricPermission = useCallback(async (): Promise<PermissionInfo> => {
        try {
            setStatus(prev => ({ ...prev, biometric: 'checking' }));

            const managerInfo = await getBiometricManagerInfo();

            if (!managerInfo.isAvailable) {
                setStatus(prev => ({ ...prev, biometric: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false,
                    hasManager: false
                };
            }

            const isGranted = managerInfo.isAccessGranted;
            const newStatus: PermissionState = isGranted ? 'granted' : 'prompt';

            setStatus(prev => ({ ...prev, biometric: newStatus }));

            return {
                isSupported: true,
                isGranted,
                needsPermission: !isGranted,
                canRequest: !isGranted,
                hasManager: true
            };

        } catch (error) {
            console.error('Error checking biometric permission:', error);
            setStatus(prev => ({ ...prev, biometric: 'denied' }));
            return {
                isSupported: false,
                isGranted: false,
                needsPermission: false,
                canRequest: false,
                hasManager: false
            };
        }
    }, [getBiometricManagerInfo]);

    /**
     * Enhanced gyroscope permission checking
     */
    const checkGyroscopePermission = useCallback(async (): Promise<PermissionInfo> => {
        try {
            setStatus(prev => ({ ...prev, gyroscope: 'checking' }));

            if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
                setStatus(prev => ({ ...prev, gyroscope: 'unavailable' }));
                return {
                    isSupported: false,
                    isGranted: false,
                    needsPermission: false,
                    canRequest: false,
                    hasManager: false
                };
            }

            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    // Try to check current permission status
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
                        permissionState = 'prompt';
                    }

                    setStatus(prev => ({ ...prev, gyroscope: permissionState }));

                    return {
                        isSupported: true,
                        isGranted,
                        needsPermission: !isGranted,
                        canRequest: permissionState !== 'denied',
                        hasManager: true
                    };

                } catch (error) {
                    console.error('Error checking gyroscope permission:', error);
                    setStatus(prev => ({ ...prev, gyroscope: 'prompt' }));
                    return {
                        isSupported: true,
                        isGranted: false,
                        needsPermission: true,
                        canRequest: true,
                        hasManager: true
                    };
                }
            } else {
                // For older browsers/devices permission is not required
                setStatus(prev => ({ ...prev, gyroscope: 'granted' }));
                return {
                    isSupported: true,
                    isGranted: true,
                    needsPermission: false,
                    canRequest: false,
                    hasManager: false
                };
            }

        } catch (error) {
            console.error('Error checking gyroscope support:', error);
            setStatus(prev => ({ ...prev, gyroscope: 'unavailable' }));
            return {
                isSupported: false,
                isGranted: false,
                needsPermission: false,
                canRequest: false,
                hasManager: false
            };
        }
    }, []);

    /**
     * Enhanced biometric permission request
     */
    const requestBiometricPermission = useCallback(async (): Promise<boolean> => {
        try {
            setStatus(prev => ({ ...prev, biometric: 'checking' }));

            const managerInfo = await getBiometricManagerInfo();
            if (!managerInfo.manager || !managerInfo.isAvailable) {
                setStatus(prev => ({ ...prev, biometric: 'unavailable' }));
                return false;
            }

            return new Promise<boolean>((resolve) => {
                managerInfo.manager.requestAccess(
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
    }, [getBiometricManagerInfo]);

    /**
     * Enhanced gyroscope permission request
     */
    const requestGyroscopePermission = useCallback(async (): Promise<boolean> => {
        try {
            setStatus(prev => ({ ...prev, gyroscope: 'checking' }));

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

            // For devices without permission requirement
            setStatus(prev => ({ ...prev, gyroscope: 'granted' }));
            return true;

        } catch (error) {
            console.error('Error requesting gyroscope permission:', error);
            setStatus(prev => ({ ...prev, gyroscope: 'denied' }));
            return false;
        }
    }, []);

    /**
     * Captcha permission check (always available)
     */
    const checkCaptchaPermission = useCallback(async (): Promise<PermissionInfo> => {
        setStatus(prev => ({ ...prev, captcha: 'granted' }));

        return {
            isSupported: true,
            isGranted: true,
            needsPermission: false,
            canRequest: false,
            hasManager: false
        };
    }, []);

    /**
     * Captcha permission request (no-op)
     */
    const requestCaptchaPermission = useCallback(async (): Promise<boolean> => {
        return true;
    }, []);

    /**
     * Recheck all permissions with enhanced error handling
     */
    const recheckAllPermissions = useCallback(async (): Promise<void> => {
        console.log('Rechecking all permissions...');

        try {
            const results = await Promise.allSettled([
                checkBiometricPermission(),
                checkGyroscopePermission(),
                checkCaptchaPermission()
            ]);

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const permissionType = index === 0 ? 'biometric' : index === 1 ? 'gyroscope' : 'captcha';
                    console.error(`Failed to check ${permissionType} permission:`, result.reason);
                }
            });

            console.log('Permission recheck completed');
        } catch (error) {
            console.error('Error during permission recheck:', error);
        }
    }, [checkBiometricPermission, checkGyroscopePermission, checkCaptchaPermission]);

    // Initialize permissions on mount
    useEffect(() => {
        recheckAllPermissions();
    }, [recheckAllPermissions]);

    return {
        status,
        checkBiometricPermission,
        checkGyroscopePermission,
        checkCaptchaPermission,
        requestBiometricPermission,
        requestGyroscopePermission,
        requestCaptchaPermission,
        recheckAllPermissions,
        getBiometricManagerInfo
    };
}