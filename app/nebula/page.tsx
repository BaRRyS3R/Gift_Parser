// src/app/nebula/page.tsx - Fixed with proper device checking and permission logic

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, Zap, Smartphone, Settings, Eye, Fingerprint } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import NebulaCaptchaModal from "@/components/Security/NebulaCaptchaModal";
import NebulaBiometricModal from "@/components/Security/NebulaBiometricModal";
import NebulaGyroscopeModal from "@/components/Security/NebulaGyroscopeModal";

// Interface definitions
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
type PageFlow =
    | "loading"
    | "checking_device"
    | "device_unsupported"
    | "permission_instructions"
    | "permission_expired"
    | "ready_for_verification"
    | "verification_modal"
    | "success"
    | "error";

interface PageState {
    flow: PageFlow;
    verificationType: VerificationType | null;
    trustScore: number;
    threshold: number;
    attemptId: string | null;
    error: string | null;

    // Device support state
    deviceSupported: boolean | null;
    permissionGranted: boolean | null;

    // Permission flow state
    permissionExpiryTime: number | null;
    timeRemaining: number;
    canSafelyLeave: boolean;

    // Modal state
    isModalOpen: boolean;
    verificationResult: "success" | "failure" | null;
}

// Permission flow timing configuration (5 minutes total)
const PERMISSION_CONFIG = {
    TOTAL_TIME: 300000, // 5 minutes total
    WARNING_TIME: 180000, // 3 minutes - start warning
    CHECK_INTERVAL: 1000, // Check every second
    PERMISSION_CHECK_DELAY: 2000, // 2 seconds delay between permission checks
} as const;

export default function NebulaPage(): JSX.Element {
    const router = useRouter();
    const { makeAuthenticatedRequest, authState } = useUser();
    const t = useT();

    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const permissionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [pageState, setPageState] = useState<PageState>({
        flow: "loading",
        verificationType: null,
        trustScore: 50,
        threshold: 40,
        attemptId: null,
        error: null,
        deviceSupported: null,
        permissionGranted: null,
        permissionExpiryTime: null,
        timeRemaining: 0,
        canSafelyLeave: false,
        isModalOpen: false,
        verificationResult: null,
    });

    /**
     * Initial check of Nebula status
     */
    const checkNebulaStatus = useCallback(async () => {
        setPageState(prev => ({ ...prev, flow: "loading", error: null }));

        try {
            const response = await makeAuthenticatedRequest("/api/nebula/check");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result: NebulaCheckResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to check verification status");
            }

            // Handle blocked user
            if (result.blocked) {
                console.log("User is blocked, redirecting to blocked page");
                router.push("/blocked");
                return;
            }

            // Handle allowed user
            if (result.allowed) {
                console.log("User passed Nebula checks, redirecting to main");
                router.push("/main");
                return;
            }

            // Handle verification required
            if (result.verification) {
                const verification = result.verification;

                setPageState(prev => ({
                    ...prev,
                    verificationType: verification.type,
                    trustScore: verification.trustScore,
                    threshold: verification.threshold,
                    attemptId: verification.attemptId,
                }));

                // Handle different verification types
                if (verification.type === "captcha") {
                    // For captcha, immediately open modal
                    console.log("Captcha verification required - opening modal");
                    setPageState(prev => ({
                        ...prev,
                        flow: "verification_modal",
                        isModalOpen: true,
                        canSafelyLeave: false,
                    }));
                } else {
                    // For biometric/gyroscope, check device support first
                    console.log(`${verification.type} verification - checking device support`);
                    setPageState(prev => ({ ...prev, flow: "checking_device" }));
                    await checkDeviceSupport(verification.type, verification.attemptId);
                }
            }

        } catch (error) {
            console.error("Error checking Nebula status:", error);
            setPageState(prev => ({
                ...prev,
                flow: "error",
                error: error instanceof Error ? error.message : "Failed to check verification status",
            }));
        }
    }, [makeAuthenticatedRequest, router]);

    /**
     * Check device support for biometric/gyroscope - 1:1 from original modals
     */
    const checkDeviceSupport = useCallback(async (
        verificationType: "biometric" | "gyroscope",
        attemptId: string
    ) => {
        try {
            let deviceSupported = false;

            if (verificationType === "biometric") {
                // Exact logic from NebulaBiometricModal.tsx
                console.log("Checking biometric device support");

                if (typeof window === "undefined") {
                    console.log("Window not available");
                    await handleDeviceUnavailable("Device environment not supported", attemptId);
                    return;
                }

                const tg = window.Telegram?.WebApp;

                if (!tg?.BiometricManager) {
                    console.log("BiometricManager not available - device/platform not supported");
                    await handleDeviceUnavailable("Biometric authentication unavailable on this device", attemptId);
                    return;
                }

                const manager = tg.BiometricManager;

                // Initialize and check availability
                await new Promise<void>((resolve) => {
                    manager.init(() => {
                        console.log("BiometricManager initialized");

                        if (!manager.isBiometricAvailable) {
                            console.log("Biometric not available on device");
                            deviceSupported = false;
                        } else {
                            console.log("Biometric available on device");
                            deviceSupported = true;
                        }
                        resolve();
                    });
                });

                if (!deviceSupported) {
                    await handleDeviceUnavailable("Biometric authentication unavailable on this device", attemptId);
                    return;
                }

                // Device supported, now check permissions
                const permissionGranted = manager.isAccessGranted;
                console.log("Biometric permission status:", permissionGranted);

                setPageState(prev => ({
                    ...prev,
                    deviceSupported: true,
                    permissionGranted,
                }));

                if (permissionGranted) {
                    // Permission already granted - open modal directly
                    console.log("Biometric permission already granted, opening modal");
                    setPageState(prev => ({
                        ...prev,
                        flow: "verification_modal",
                        isModalOpen: true,
                        canSafelyLeave: false,
                    }));
                } else {
                    // Permission needed - show instructions
                    console.log("Biometric permission required, showing instructions");
                    const expiryTime = Date.now() + PERMISSION_CONFIG.TOTAL_TIME;

                    setPageState(prev => ({
                        ...prev,
                        flow: "permission_instructions",
                        permissionExpiryTime: expiryTime,
                        canSafelyLeave: true,
                    }));

                    startPermissionTimer(expiryTime, attemptId);
                }

            } else if (verificationType === "gyroscope") {
                // Exact logic from NebulaGyroscopeModal.tsx
                console.log("Checking gyroscope device support");

                if (typeof window === "undefined") {
                    console.log("Window not available");
                    await handleDeviceUnavailable("Device environment not supported", attemptId);
                    return;
                }

                // Check DeviceOrientationEvent support
                if (!window.DeviceOrientationEvent) {
                    console.log("DeviceOrientationEvent not supported");
                    await handleDeviceUnavailable("Gyroscope verification unavailable on this device", attemptId);
                    return;
                }

                // Test actual data availability
                console.log("Testing gyroscope data availability");
                await new Promise<void>((resolve) => {
                    let dataReceived = false;

                    const testListener = (event: DeviceOrientationEvent) => {
                        if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                            dataReceived = true;
                            window.removeEventListener("deviceorientation", testListener);
                            console.log("Gyroscope data available");
                            resolve();
                        }
                    };

                    window.addEventListener("deviceorientation", testListener);

                    setTimeout(() => {
                        window.removeEventListener("deviceorientation", testListener);
                        deviceSupported = dataReceived;
                        if (!dataReceived) {
                            console.log("No gyroscope data received - device likely doesn't support it");
                        }
                        resolve();
                    }, 4000); // 4 second timeout like in original
                });

                if (!deviceSupported) {
                    await handleDeviceUnavailable("Gyroscope verification unavailable on this device", attemptId);
                    return;
                }

                // Device supported, now check permissions
                const DeviceOrientationEvent = window.DeviceOrientationEvent as any;
                let permissionGranted = true; // Default for most devices

                if (typeof DeviceOrientationEvent.requestPermission === "function") {
                    // iOS 13+ requires permission
                    console.log("iOS permission model detected");
                    permissionGranted = false; // Will be checked below
                } else {
                    console.log("No permission required for gyroscope");
                }

                setPageState(prev => ({
                    ...prev,
                    deviceSupported: true,
                    permissionGranted,
                }));

                if (permissionGranted) {
                    // Permission already granted or not required - open modal directly
                    console.log("Gyroscope permission already granted/not required, opening modal");
                    setPageState(prev => ({
                        ...prev,
                        flow: "verification_modal",
                        isModalOpen: true,
                        canSafelyLeave: false,
                    }));
                } else {
                    // Permission needed (iOS) - show instructions
                    console.log("Gyroscope permission required (iOS), showing instructions");
                    const expiryTime = Date.now() + PERMISSION_CONFIG.TOTAL_TIME;

                    setPageState(prev => ({
                        ...prev,
                        flow: "permission_instructions",
                        permissionExpiryTime: expiryTime,
                        canSafelyLeave: true,
                    }));

                    startPermissionTimer(expiryTime, attemptId);
                }
            }

        } catch (error) {
            console.error("Error checking device support:", error);
            setPageState(prev => ({
                ...prev,
                flow: "error",
                error: error instanceof Error ? error.message : "Failed to check device support",
            }));
        }
    }, []);

    /**
     * Handle device unavailability with blocking
     */
    const handleDeviceUnavailable = useCallback(async (reason: string, attemptId: string) => {
        console.log("Device unavailable:", reason);

        setPageState(prev => ({
            ...prev,
            flow: "device_unsupported",
            deviceSupported: false,
            error: reason,
            canSafelyLeave: true,
        }));

        // Block user through API
        try {
            const blockReason = pageState.verificationType === "biometric"
                ? "biometric_unavailable"
                : "gyroscope_unavailable";

            const response = await makeAuthenticatedRequest(`/api/nebula/${pageState.verificationType}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    completedInTime: false,
                    deviceSupported: false,
                    unavailable: true,
                    attemptId,
                }),
            });

            if (response.ok) {
                setTimeout(() => {
                    router.push("/blocked");
                }, 3000);
            } else {
                setTimeout(() => {
                    router.push("/blocked");
                }, 1000);
            }
        } catch (error) {
            console.error("Error blocking for device unavailability:", error);
            setTimeout(() => {
                router.push("/blocked");
            }, 1000);
        }
    }, [pageState.verificationType, makeAuthenticatedRequest, router]);

    /**
     * Start permission timer countdown with automatic checking
     */
    const startPermissionTimer = useCallback((expiryTime: number, attemptId: string) => {
        console.log("Starting permission timer");

        // Clear existing timers
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
        }
        if (permissionCheckTimeoutRef.current) {
            clearTimeout(permissionCheckTimeoutRef.current);
        }

        // Start automatic permission checking
        startAutomaticPermissionCheck(attemptId);

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, expiryTime - now);

            setPageState(prev => ({
                ...prev,
                timeRemaining: remaining,
            }));

            if (remaining <= 0) {
                // Timer expired - block user
                console.log("Permission timer expired");

                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                    checkIntervalRef.current = null;
                }
                if (permissionCheckTimeoutRef.current) {
                    clearTimeout(permissionCheckTimeoutRef.current);
                    permissionCheckTimeoutRef.current = null;
                }

                handlePermissionExpired(attemptId);
            }
        };

        // Initial update
        updateTimer();

        // Start interval
        checkIntervalRef.current = setInterval(updateTimer, PERMISSION_CONFIG.CHECK_INTERVAL);
    }, []);

    /**
     * Automatic permission checking (runs every 2 seconds)
     */
    const startAutomaticPermissionCheck = useCallback((attemptId: string) => {
        const checkPermissions = async () => {
            if (!pageState.verificationType || pageState.permissionGranted) {
                return; // Stop checking if already granted
            }

            try {
                let permissionGranted = false;

                if (pageState.verificationType === "biometric") {
                    const tg = window.Telegram?.WebApp;
                    const manager = tg?.BiometricManager;
                    if (manager) {
                        permissionGranted = manager.isAccessGranted;
                    }
                } else if (pageState.verificationType === "gyroscope") {
                    // For gyroscope, test data availability (indicates permission granted)
                    await new Promise<void>((resolve) => {
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
                            window.removeEventListener("deviceorientation", testListener);
                            permissionGranted = dataReceived;
                            resolve();
                        }, 1000);
                    });
                }

                if (permissionGranted && !pageState.permissionGranted) {
                    console.log(`${pageState.verificationType} permission detected automatically`);
                    handlePermissionGranted();
                } else {
                    // Schedule next check
                    permissionCheckTimeoutRef.current = setTimeout(() => {
                        startAutomaticPermissionCheck(attemptId);
                    }, PERMISSION_CONFIG.PERMISSION_CHECK_DELAY);
                }
            } catch (error) {
                console.error("Error in automatic permission check:", error);
                // Continue checking despite errors
                permissionCheckTimeoutRef.current = setTimeout(() => {
                    startAutomaticPermissionCheck(attemptId);
                }, PERMISSION_CONFIG.PERMISSION_CHECK_DELAY);
            }
        };

        // Start first check with small delay
        permissionCheckTimeoutRef.current = setTimeout(checkPermissions, 500);
    }, [pageState.verificationType, pageState.permissionGranted]);

    /**
     * Handle permission request button click
     */
    const handleRequestPermission = useCallback(async () => {
        if (!pageState.verificationType || !pageState.attemptId) return;

        try {
            if (pageState.verificationType === "biometric") {
                const tg = window.Telegram?.WebApp;
                const manager = tg?.BiometricManager;

                if (manager) {
                    manager.requestAccess(
                        { reason: "Security verification required for continued access" },
                        (granted: boolean) => {
                            console.log("Biometric permission request result:", granted);
                            if (granted) {
                                handlePermissionGranted();
                            }
                        }
                    );

                    // Also try to open settings
                    if (manager.openSettings) {
                        setTimeout(() => {
                            manager.openSettings();
                        }, 1000);
                    }
                }
            } else if (pageState.verificationType === "gyroscope") {
                const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

                if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    const granted = permission === "granted";

                    console.log("Gyroscope permission request result:", granted);
                    if (granted) {
                        handlePermissionGranted();
                    }
                }
            }
        } catch (error) {
            console.error("Error requesting permission:", error);
        }
    }, [pageState.verificationType, pageState.attemptId]);

    /**
     * Handle permission granted
     */
    const handlePermissionGranted = useCallback(() => {
        console.log("Permission granted, opening verification modal");

        // Clear timers
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (permissionCheckTimeoutRef.current) {
            clearTimeout(permissionCheckTimeoutRef.current);
            permissionCheckTimeoutRef.current = null;
        }

        setPageState(prev => ({
            ...prev,
            flow: "verification_modal",
            isModalOpen: true,
            permissionGranted: true,
            canSafelyLeave: false, // No longer safe to leave during actual verification
        }));
    }, []);

    /**
     * Handle permission timer expired
     */
    const handlePermissionExpired = useCallback(async (attemptId: string) => {
        console.log("Permission timer expired, blocking user");

        setPageState(prev => ({
            ...prev,
            flow: "permission_expired",
            canSafelyLeave: false,
        }));

        // Block user through API
        try {
            const response = await makeAuthenticatedRequest(`/api/nebula/${pageState.verificationType}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    completedInTime: false,
                    deviceSupported: true,
                    permissionDenied: true,
                    attemptId,
                }),
            });

            setTimeout(() => {
                router.push("/blocked");
            }, 2000);
        } catch (error) {
            console.error("Error blocking for permission timeout:", error);
            setTimeout(() => {
                router.push("/blocked");
            }, 1000);
        }
    }, [pageState.verificationType, makeAuthenticatedRequest, router]);

    /**
     * Handle verification success
     */
    const handleVerificationSuccess = useCallback(() => {
        console.log("Verification completed successfully");

        // Clear any timers
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (permissionCheckTimeoutRef.current) {
            clearTimeout(permissionCheckTimeoutRef.current);
            permissionCheckTimeoutRef.current = null;
        }

        setPageState(prev => ({
            ...prev,
            flow: "success",
            isModalOpen: false,
            verificationResult: "success",
            canSafelyLeave: true,
        }));

        setTimeout(() => {
            router.push("/main");
        }, 2000);
    }, [router]);

    /**
     * Handle verification failure
     */
    const handleVerificationFailure = useCallback(() => {
        console.log("Verification failed");

        // Clear any timers
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (permissionCheckTimeoutRef.current) {
            clearTimeout(permissionCheckTimeoutRef.current);
            permissionCheckTimeoutRef.current = null;
        }

        setPageState(prev => ({
            ...prev,
            flow: "error",
            isModalOpen: false,
            verificationResult: "failure",
            canSafelyLeave: true,
        }));

        setTimeout(() => {
            router.push("/blocked");
        }, 2000);
    }, [router]);

    // Initialize page
    useEffect(() => {
        if (!authState.isAuthenticated) {
            router.push("/");
            return;
        }

        checkNebulaStatus();

        // Cleanup on unmount
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            if (permissionCheckTimeoutRef.current) {
                clearTimeout(permissionCheckTimeoutRef.current);
                permissionCheckTimeoutRef.current = null;
            }
        };
    }, [authState.isAuthenticated, checkNebulaStatus, router]);

    /**
     * Format time remaining
     */
    const formatTimeRemaining = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    /**
     * Get verification type icon
     */
    const getVerificationIcon = (type: VerificationType) => {
        switch (type) {
            case "captcha":
                return <Shield className="text-yellow-400" size={64} />;
            case "biometric":
                return <Fingerprint className="text-blue-400" size={64} />;
            case "gyroscope":
                return <Smartphone className="text-purple-400" size={64} />;
            default:
                return <Shield className="text-gray-400" size={64} />;
        }
    };

    /**
     * Get trust score color
     */
    const getTrustScoreColor = (score: number): string => {
        if (score >= 40) return "text-green-400";
        if (score >= 20) return "text-yellow-400";
        if (score >= 10) return "text-orange-400";
        return "text-red-400";
    };

    // Loading state
    if (pageState.flow === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">{t("nebula.verification.loading")}</p>
                </div>
            </div>
        );
    }

    // Device checking state
    if (pageState.flow === "checking_device") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="text-blue-400 animate-pulse" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Checking Device Compatibility
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Verifying {pageState.verificationType} support on your device...
                    </p>
                </div>
            </div>
        );
    }

    // Device unsupported state
    if (pageState.flow === "device_unsupported") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-400" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Device Not Supported
                    </h2>
                    <p className="text-red-300 text-sm mb-4">
                        Your device does not support {pageState.verificationType} verification.
                    </p>
                    <p className="text-red-200 text-xs">
                        {pageState.error}
                    </p>
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-xs">
                            Your account will be temporarily blocked. Redirecting...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Permission instructions state
    if (pageState.flow === "permission_instructions") {
        const timeWarning = pageState.timeRemaining < PERMISSION_CONFIG.WARNING_TIME;

        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            {pageState.verificationType === "biometric" ? (
                                <Fingerprint className="text-blue-400" size={32} />
                            ) : (
                                <Smartphone className="text-purple-400" size={32} />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            {pageState.verificationType === "biometric" ? "Biometric" : "Gyroscope"} Permission Required
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Grant access to continue with verification
                        </p>
                    </div>

                    {/* Timer */}
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300 text-sm">Time Remaining</span>
                            <div className="flex items-center space-x-2">
                                <Clock className={timeWarning ? "text-red-400" : "text-orange-400"} size={16} />
                                <span className={`font-bold ${timeWarning ? "text-red-400" : "text-orange-400"}`}>
                                    {formatTimeRemaining(pageState.timeRemaining)}
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-1000 ${timeWarning ? "bg-red-500" : "bg-orange-500"
                                    }`}
                                style={{
                                    width: `${Math.max(0, (pageState.timeRemaining / PERMISSION_CONFIG.TOTAL_TIME) * 100)}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-300 font-semibold mb-2 text-sm">
                            Quick Setup Instructions:
                        </h3>
                        <div className="text-blue-200 text-sm space-y-1">
                            <p>1. Tap "Grant Permission" below</p>
                            <p>2. Allow access when prompted</p>
                            <p>3. Return here (verification will start automatically)</p>
                        </div>
                    </div>

                    {/* Safe leave notice */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <Shield className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <h4 className="text-green-300 font-semibold mb-1 text-sm">
                                    Safe to Leave App
                                </h4>
                                <p className="text-green-200 text-xs">
                                    You may safely switch to settings and return within the time limit. Verification will start automatically when permission is granted.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Warning if time running low */}
                    {timeWarning && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-red-300 font-semibold mb-1 text-sm">
                                        Time Running Out!
                                    </h4>
                                    <p className="text-red-200 text-xs">
                                        Grant permission quickly or your account will be blocked automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Permission button */}
                    <button
                        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                        onClick={handleRequestPermission}
                    >
                        <Settings size={20} />
                        <span>Grant Permission</span>
                    </button>
                </div>
            </div>
        );
    }

    // Permission expired state
    if (pageState.flow === "permission_expired") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="text-red-400" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Permission Time Expired
                    </h2>
                    <p className="text-red-300 text-sm mb-4">
                        You did not grant {pageState.verificationType} permission within the allowed time.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-300 text-xs">
                            Your account will be temporarily blocked. Redirecting...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (pageState.flow === "success") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-green-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="text-green-400" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Verification Successful
                    </h2>
                    <p className="text-green-300 text-sm mb-4">
                        Your identity has been verified. Redirecting to main application...
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (pageState.flow === "error") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
                    <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">
                        Verification Failed
                    </h2>
                    <p className="text-red-300 text-sm mb-6">{pageState.error}</p>
                    <button
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                        onClick={checkNebulaStatus}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Verification modal state - show original verification page with modal
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {pageState.verificationType && getVerificationIcon(pageState.verificationType)}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Security Verification
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Complete {pageState.verificationType} verification to continue
                    </p>
                </div>

                {/* Trust score display */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 text-sm">Current Trust Level</span>
                        <span className={`font-bold text-lg ${getTrustScoreColor(pageState.trustScore)}`}>
                            {pageState.trustScore}
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                            style={{
                                width: `${Math.min(100, (pageState.trustScore / 100) * 100)}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Modals - simplified versions without permission logic */}
            {pageState.verificationType === "captcha" && (
                <NebulaCaptchaModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={() => { }}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                />
            )}

            {pageState.verificationType === "biometric" && (
                <NebulaBiometricModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={() => { }}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    onPhaseChange={() => { }} // No phase change handling needed
                />
            )}

            {pageState.verificationType === "gyroscope" && (
                <NebulaGyroscopeModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={() => { }}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    onPhaseChange={() => { }} // No phase change handling needed
                />
            )}
        </div>
    );
}