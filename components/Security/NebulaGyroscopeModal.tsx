// src/components/Security/NebulaGyroscopeModal.tsx - Updated with new permission logic

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Compass,
    RotateCcw,
    Clock,
    AlertTriangle,
    Shield,
    CheckCircle2,
    XCircle,
    Smartphone,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface NebulaGyroscopeModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
    onPhaseChange?: (phase: GyroscopePhase, canAbandon: boolean) => void;
}

type GyroscopePhase =
    | "initializing"
    | "checking_availability"
    | "unavailable"
    | "permission_required"
    | "permission_checking"
    | "instructions"
    | "verification"
    | "success"
    | "error";

interface GyroscopeData {
    alpha: number | null; // Z-axis rotation
    beta: number | null; // X-axis rotation
    gamma: number | null; // Y-axis rotation
}

interface GyroscopeState {
    currentPhase: GyroscopePhase;
    verificationTimeRemaining: number;
    isVerifying: boolean;
    error: string | null;
    attemptMade: boolean;
    verificationTimerActive: boolean;
    isGyroscopeSupported: boolean;
    isGyroscopeAvailable: boolean;
    permissionRequested: boolean;
    permissionGranted: boolean;
    detectedMovements: number;
    requiredMovements: number;
    canAbandon: boolean;
}

const NebulaGyroscopeModal: React.FC<NebulaGyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
    onPhaseChange,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();
    const verificationTimeout = 15000; // 15 seconds for verification
    const movementThreshold = 15; // Degrees of rotation to count as movement
    const movementCooldown = 1000; // 1 second between movements
    const requiredMovements = 3; // Require 3 distinct movements

    // Refs for gyroscope data and movement detection
    const gyroscopeDataRef = useRef<GyroscopeData>({
        alpha: null,
        beta: null,
        gamma: null,
    });
    const lastMovementTimeRef = useRef<number>(0);
    const initialDataRef = useRef<GyroscopeData>({
        alpha: null,
        beta: null,
        gamma: null,
    });
    const eventListenerRef = useRef<
        ((event: DeviceOrientationEvent) => void) | null
    >(null);

    const [state, setState] = useState<GyroscopeState>({
        currentPhase: "initializing",
        verificationTimeRemaining: 15000,
        isVerifying: false,
        error: null,
        attemptMade: false,
        verificationTimerActive: false,
        isGyroscopeSupported: false,
        isGyroscopeAvailable: false,
        permissionRequested: false,
        permissionGranted: false,
        detectedMovements: 0,
        requiredMovements: requiredMovements,
        canAbandon: false,
    });

    // Notify parent component about phase changes and abandonment safety
    useEffect(() => {
        if (onPhaseChange) {
            onPhaseChange(state.currentPhase, state.canAbandon);
        }
    }, [state.currentPhase, state.canAbandon, onPhaseChange]);

    // Helper function to update phase and abandonment status
    const updatePhase = useCallback((
        newPhase: GyroscopePhase,
        canAbandon: boolean = false
    ) => {
        setState((prev) => ({
            ...prev,
            currentPhase: newPhase,
            canAbandon,
        }));
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setState({
                currentPhase: "initializing",
                verificationTimeRemaining: 15000,
                isVerifying: false,
                error: null,
                attemptMade: false,
                verificationTimerActive: false,
                isGyroscopeSupported: false,
                isGyroscopeAvailable: false,
                permissionRequested: false,
                permissionGranted: false,
                detectedMovements: 0,
                requiredMovements: requiredMovements,
                canAbandon: false,
            });

            gyroscopeDataRef.current = { alpha: null, beta: null, gamma: null };
            lastMovementTimeRef.current = 0;
            initialDataRef.current = { alpha: null, beta: null, gamma: null };

            // Clean up event listeners
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            return;
        }

        if (attemptId) {
            initializeGyroscope();
        } else {
            setState((prev) => ({
                ...prev,
                error: t("nebula.captcha.noAttemptId"),
                currentPhase: "error",
                canAbandon: true,
            }));
        }
    }, [isOpen, attemptId, t]);

    // Verification phase timer
    useEffect(() => {
        if (!state.verificationTimerActive || state.currentPhase !== "verification")
            return;

        const timer = setInterval(() => {
            setState((prev) => {
                const newTime = prev.verificationTimeRemaining - 100;

                if (newTime <= 0) {
                    handleVerificationTimeout();

                    return { ...prev, verificationTimeRemaining: 0 };
                }

                return { ...prev, verificationTimeRemaining: newTime };
            });
        }, 100);

        return () => clearInterval(timer);
    }, [state.verificationTimerActive, state.currentPhase]);

    /**
     * Initialize gyroscope availability check
     */
    const initializeGyroscope = async () => {
        console.log("Initializing gyroscope verification");
        updatePhase("checking_availability", false);

        if (typeof window === "undefined") {
            console.log("Window not available");
            await handleDeviceUnavailable("Device environment not supported");
            return;
        }

        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            console.log("DeviceOrientationEvent not supported");
            await handleDeviceUnavailable(t("nebula.gyroscope.errors.unavailable"));
            return;
        }

        setState((prev) => ({ ...prev, isGyroscopeSupported: true }));

        // Check if permission is required (iOS 13+)
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

        if (typeof DeviceOrientationEvent.requestPermission === "function") {
            console.log("Permission required for gyroscope access");
            setState((prev) => ({ ...prev, isGyroscopeAvailable: true }));
            updatePhase("permission_required", true); // Safe to abandon during permission request
        } else {
            console.log("No permission required, checking gyroscope data availability");
            setState((prev) => ({ ...prev, isGyroscopeAvailable: true, permissionGranted: true }));
            await checkGyroscopeData();
        }
    };

    /**
     * Check if gyroscope data is actually available
     */
    const checkGyroscopeData = async () => {
        console.log("Checking gyroscope data availability");

        return new Promise<void>((resolve, reject) => {
            let dataReceived = false;

            const testListener = (event: DeviceOrientationEvent) => {
                if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                    dataReceived = true;
                    window.removeEventListener("deviceorientation", testListener);
                    console.log("Gyroscope data available");
                    updatePhase("instructions", true);
                    resolve();
                }
            };

            window.addEventListener("deviceorientation", testListener);

            // Timeout after 3 seconds if no data received
            setTimeout(() => {
                if (!dataReceived) {
                    window.removeEventListener("deviceorientation", testListener);
                    console.log("No gyroscope data received - device likely doesn't support it");
                    handleDeviceUnavailable(t("nebula.gyroscope.errors.unavailable"));
                    reject();
                }
            }, 3000);
        });
    };

    /**
     * Handle device unavailable - immediately block user
     */
    const handleDeviceUnavailable = useCallback(
        async (reason: string) => {
            console.log("Gyroscope unavailable on device:", reason);

            updatePhase("unavailable", true);
            setState((prev) => ({
                ...prev,
                error: reason,
                isGyroscopeAvailable: false,
            }));

            if (attemptId) {
                try {
                    // Immediately block user for unavailable gyroscope
                    const response = await makeAuthenticatedRequest(
                        "/api/nebula/gyroscope",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success: false,
                                completedInTime: false,
                                deviceSupported: false,
                                unavailable: true,
                                attemptId,
                            }),
                        },
                    );

                    if (response.ok) {
                        setTimeout(() => onFailure(), 3000);
                    } else {
                        setTimeout(() => onFailure(), 1000);
                    }
                } catch (error) {
                    console.error("Error auto-blocking for unavailable gyroscope:", error);
                    setTimeout(() => onFailure(), 1000);
                }
            } else {
                setTimeout(() => onFailure(), 1000);
            }
        },
        [makeAuthenticatedRequest, onFailure, attemptId, updatePhase, t],
    );

    /**
     * Request gyroscope permission (iOS)
     */
    const handleRequestPermission = useCallback(async () => {
        setState((prev) => ({ ...prev, permissionRequested: true }));

        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                const permission = await DeviceOrientationEvent.requestPermission();
                const granted = permission === "granted";

                console.log("Gyroscope permission request result:", granted);
                setState((prev) => ({ ...prev, permissionGranted: granted }));

                if (!granted) {
                    // Give user 2 seconds to see the updated button before blocking
                    setTimeout(() => {
                        handlePermissionDenied();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            handlePermissionDenied();
        }
    }, []);

    /**
     * Check permission status after user potentially went to settings
     */
    const handleCheckPermission = useCallback(async () => {
        updatePhase("permission_checking", false);

        // Small delay to allow system to process permissions
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // Test if gyroscope data is now available
            let dataReceived = false;

            const testListener = (event: DeviceOrientationEvent) => {
                if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                    dataReceived = true;
                    window.removeEventListener("deviceorientation", testListener);
                }
            };

            window.addEventListener("deviceorientation", testListener);

            // Wait for 2 seconds to check for data
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.removeEventListener("deviceorientation", testListener);

            console.log("Permission check result:", dataReceived);
            setState((prev) => ({ ...prev, permissionGranted: dataReceived }));

            if (dataReceived) {
                updatePhase("instructions", true);
            } else {
                handlePermissionDenied();
            }
        } catch (error) {
            console.error("Error checking permission status:", error);
            setState((prev) => ({
                ...prev,
                error: t("nebula.gyroscope.errors.permissionCheckFailed"),
            }));
            setTimeout(() => handlePermissionDenied(), 1000);
        }
    }, [updatePhase, t]);

    /**
     * Handle permission denied - block user
     */
    const handlePermissionDenied = useCallback(async () => {
        console.log("Gyroscope permission denied");

        updatePhase("error", true);
        setState((prev) => ({
            ...prev,
            error: t("nebula.gyroscope.errors.permissionDenied"),
        }));

        if (attemptId) {
            try {
                // Block user for permission denial
                const response = await makeAuthenticatedRequest(
                    "/api/nebula/gyroscope",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            success: false,
                            completedInTime: false,
                            deviceSupported: true,
                            permissionDenied: true,
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
                console.error("Error blocking for permission denial:", error);
                setTimeout(() => onFailure(), 1000);
            }
        } else {
            setTimeout(() => onFailure(), 1000);
        }
    }, [makeAuthenticatedRequest, onFailure, attemptId, updatePhase, t]);

    /**
     * Handle verification timeout
     */
    const handleVerificationTimeout = useCallback(() => {
        console.log("Gyroscope verification timeout");
        setState((prev) => ({ ...prev, verificationTimerActive: false }));
        handleVerificationFailure(t("nebula.gyroscope.errors.timeout"));
    }, [t]);

    /**
     * Handle verification failure
     */
    const handleVerificationFailure = useCallback(
        async (reason: string) => {
            console.log("Gyroscope verification failed:", reason);
            setState((prev) => ({
                ...prev,
                error: reason,
                currentPhase: "error",
                verificationTimerActive: false,
                canAbandon: true,
            }));

            // Clean up event listener
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            if (attemptId) {
                try {
                    // Send failure to server
                    await makeAuthenticatedRequest("/api/nebula/gyroscope", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            success: false,
                            completedInTime: false,
                            deviceSupported: state.isGyroscopeSupported,
                            attemptId,
                        }),
                    });
                } catch (error) {
                    console.error("Error sending gyroscope failure to API:", error);
                }
            }

            setTimeout(() => onFailure(), 1000);
        },
        [
            state.isGyroscopeSupported,
            makeAuthenticatedRequest,
            onFailure,
            attemptId,
        ],
    );

    /**
     * Handle successful verification with actual movement count
     */
    const handleVerificationSuccess = useCallback(
        async (actualMovements?: number) => {
            console.log("Gyroscope verification successful");
            setState((prev) => ({
                ...prev,
                verificationTimerActive: false,
                currentPhase: "success",
                canAbandon: false,
            }));

            // Clean up event listener
            if (eventListenerRef.current) {
                window.removeEventListener(
                    "deviceorientation",
                    eventListenerRef.current,
                );
                eventListenerRef.current = null;
            }

            if (attemptId) {
                try {
                    const response = await makeAuthenticatedRequest(
                        "/api/nebula/gyroscope",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                success: true,
                                completedInTime: true,
                                deviceSupported: state.isGyroscopeSupported,
                                attemptId,
                                movementData: {
                                    totalMovements: actualMovements ?? state.detectedMovements,
                                    requiredMovements: requiredMovements,
                                    timeSpent:
                                        verificationTimeout - state.verificationTimeRemaining,
                                    significantMovements: true,
                                },
                            }),
                        },
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || "Verification failed");
                    }

                    if (result.verified && result.trustRestored) {
                        console.log("Gyroscope verification validated successfully");
                        setTimeout(() => onSuccess(), 1500);
                    } else if (result.blocked) {
                        console.log("Gyroscope verification validation failed");
                        handleVerificationFailure(
                            result.blockReason || t("nebula.gyroscope.errors.verificationFailed"),
                        );
                    } else {
                        throw new Error("Unexpected verification result");
                    }
                } catch (error) {
                    console.error("Error validating gyroscope:", error);
                    handleVerificationFailure(t("nebula.gyroscope.errors.verificationFailed"));
                }
            } else {
                setTimeout(() => onSuccess(), 1500);
            }
        },
        [
            state.isGyroscopeSupported,
            state.verificationTimeRemaining,
            state.detectedMovements,
            makeAuthenticatedRequest,
            onSuccess,
            attemptId,
            t,
        ],
    );

    /**
     * Start verification process
     */
    const handleStartVerification = () => {
        if (state.isVerifying || state.attemptMade) return;

        console.log("Starting gyroscope verification");
        setState((prev) => ({
            ...prev,
            isVerifying: true,
            attemptMade: true,
            currentPhase: "verification",
            verificationTimeRemaining: verificationTimeout,
            verificationTimerActive: true,
            detectedMovements: 0,
            error: null,
            canAbandon: false, // Not safe to abandon during verification
        }));

        // Set up event listener for device orientation
        const handleOrientationChange = (event: DeviceOrientationEvent) => {
            const currentData: GyroscopeData = {
                alpha: event.alpha, // Z-axis (compass heading)
                beta: event.beta, // X-axis (front-to-back tilt)
                gamma: event.gamma, // Y-axis (left-to-right tilt)
            };

            // Store initial values for comparison
            if (initialDataRef.current.alpha === null && currentData.alpha !== null) {
                initialDataRef.current = { ...currentData };
                console.log("Initial gyroscope data captured:", initialDataRef.current);

                return;
            }

            // Detect significant movements
            detectMovement(currentData);

            // Update current data
            gyroscopeDataRef.current = currentData;
        };

        eventListenerRef.current = handleOrientationChange;
        window.addEventListener("deviceorientation", handleOrientationChange);

        // Auto-fail if no gyroscope data is received within 3 seconds
        setTimeout(() => {
            if (
                gyroscopeDataRef.current.alpha === null &&
                gyroscopeDataRef.current.beta === null &&
                gyroscopeDataRef.current.gamma === null
            ) {
                console.log(
                    "No gyroscope data received - device likely doesn't support it",
                );
                handleVerificationFailure(t("nebula.gyroscope.errors.noData"));
            }
        }, 3000);
    };

    /**
     * Detect significant movements in gyroscope data
     */
    const detectMovement = (currentData: GyroscopeData) => {
        const now = Date.now();

        // Prevent rapid-fire movement detection
        if (now - lastMovementTimeRef.current < movementCooldown) {
            return;
        }

        const initial = initialDataRef.current;

        if (
            initial.alpha === null ||
            initial.beta === null ||
            initial.gamma === null ||
            currentData.alpha === null ||
            currentData.beta === null ||
            currentData.gamma === null
        ) {
            return;
        }

        // Calculate differences from initial position
        const alphaDiff = Math.abs((currentData.alpha || 0) - (initial.alpha || 0));
        const betaDiff = Math.abs((currentData.beta || 0) - (initial.beta || 0));
        const gammaDiff = Math.abs((currentData.gamma || 0) - (initial.gamma || 0));

        // Normalize alpha difference to handle 0-360 wraparound
        const normalizedAlphaDiff = Math.min(alphaDiff, 360 - alphaDiff);

        // Check if any axis has moved significantly
        const significantMovement =
            normalizedAlphaDiff > movementThreshold ||
            betaDiff > movementThreshold ||
            gammaDiff > movementThreshold;

        if (significantMovement) {
            console.log("Movement detected:", {
                alpha: normalizedAlphaDiff.toFixed(1),
                beta: betaDiff.toFixed(1),
                gamma: gammaDiff.toFixed(1),
            });

            lastMovementTimeRef.current = now;
            setState((prev) => {
                const newCount = prev.detectedMovements + 1;

                // Check if verification is complete
                if (newCount >= requiredMovements) {
                    handleVerificationSuccess(newCount);
                }

                return {
                    ...prev,
                    detectedMovements: newCount,
                };
            });
        }
    };

    /**
     * Format time remaining
     */
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);

        return `${seconds}s`;
    };

    /**
     * Get progress percentage
     */
    const getProgressPercentage = (): number => {
        return Math.min(100, (state.detectedMovements / requiredMovements) * 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {state.currentPhase === "unavailable" ||
                                state.currentPhase === "error" ? (
                                <XCircle className="text-red-400" size={48} />
                            ) : state.currentPhase === "success" ? (
                                <CheckCircle2 className="text-green-400" size={48} />
                            ) : (
                                <Compass className="text-blue-400" size={48} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {state.currentPhase === "success"
                            ? t("nebula.gyroscope.success.title")
                            : t("nebula.gyroscope.title")}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? t("nebula.gyroscope.success.message")
                            : t("nebula.gyroscope.subtitle")}
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
                ) : state.currentPhase === "initializing" || state.currentPhase === "checking_availability" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Compass className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {state.currentPhase === "checking_availability"
                                ? t("nebula.gyroscope.checkingAvailability")
                                : t("nebula.gyroscope.initializing")}
                        </p>
                    </div>
                ) : state.currentPhase === "unavailable" || state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">
                                    {state.currentPhase === "unavailable"
                                        ? t("nebula.gyroscope.errors.unavailable")
                                        : t("nebula.gyroscope.errors.verificationFailed")}
                                </p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        {state.currentPhase === "unavailable" && (
                            <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <AlertTriangle
                                        className="text-orange-400 flex-shrink-0 mt-0.5"
                                        size={16}
                                    />
                                    <div>
                                        <h4 className="text-orange-300 font-semibold mb-1 text-sm">
                                            {t("nebula.gyroscope.securityPolicy")}
                                        </h4>
                                        <p className="text-orange-200 text-xs">
                                            {t("nebula.gyroscope.unavailableWarning")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                {state.currentPhase === "unavailable"
                                    ? t("nebula.gyroscope.blockWarningUnavailable")
                                    : state.error?.includes("permission")
                                        ? t("nebula.gyroscope.blockWarningPermissionDenied")
                                        : t("nebula.gyroscope.blockWarning")}
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
                                {t("nebula.gyroscope.permissionRequired")}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {t("nebula.gyroscope.permissionInstructions")}
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                {t("nebula.gyroscope.permissionInstructions2.title")}
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>{t("nebula.gyroscope.permissionInstructions2.step1")}</p>
                                <p>{t("nebula.gyroscope.permissionInstructions2.step2")}</p>
                                <p>{t("nebula.gyroscope.permissionInstructions2.step3")}</p>
                                <p>{t("nebula.gyroscope.permissionInstructions2.step4")}</p>
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

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <p className="text-yellow-300 text-xs text-center">
                                {t("nebula.gyroscope.permissionWarning")}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {!state.permissionRequested ? (
                                <button
                                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    onClick={handleRequestPermission}
                                >
                                    <Shield size={20} />
                                    <span>{t("nebula.gyroscope.grantPermission")}</span>
                                </button>
                            ) : (
                                <button
                                    className={`w-full px-6 py-3 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${state.permissionGranted
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-orange-600 hover:bg-orange-700"
                                        }`}
                                    onClick={handleCheckPermission}
                                >
                                    <Shield size={20} />
                                    <span>{t("nebula.gyroscope.checkPermission")}</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : state.currentPhase === "permission_checking" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Shield className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            {t("nebula.gyroscope.errors.permissionCheckFailed")}
                        </p>
                    </div>
                ) : state.currentPhase === "instructions" ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Smartphone className="text-blue-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">
                                {t("nebula.gyroscope.movementInstructions")}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {t("nebula.gyroscope.deviceInstructions")}
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                {t("nebula.gyroscope.requiredMovements")}
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>{t("nebula.gyroscope.movement1")}</p>
                                <p>{t("nebula.gyroscope.movement2")}</p>
                                <p>{t("nebula.gyroscope.movement3")}</p>
                                <p className="text-blue-300 font-medium mt-2">
                                    {t("nebula.gyroscope.movementCount", { count: requiredMovements })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle
                                    className="text-yellow-400 flex-shrink-0 mt-0.5"
                                    size={16}
                                />
                                <div>
                                    <h4 className="text-yellow-300 font-semibold mb-1 text-sm">
                                        {t("nebula.gyroscope.important")}
                                    </h4>
                                    <p className="text-yellow-200 text-xs">
                                        {t("nebula.gyroscope.oneAttempt")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                            onClick={handleStartVerification}
                        >
                            <Compass size={20} />
                            <span>{t("nebula.gyroscope.startVerification")}</span>
                        </button>
                    </div>
                ) : state.currentPhase === "verification" ? (
                    <div className="space-y-6">
                        {/* Timer */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span
                                className={`font-bold ${state.verificationTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
                            >
                                {formatTime(state.verificationTimeRemaining)}
                            </span>
                            <span className="text-gray-500">{t("nebula.common.timeRemaining")}</span>
                        </div>

                        {/* Movement Progress */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">
                                    {t("nebula.gyroscope.movementsDetected")}
                                </span>
                                <span className="text-blue-400 font-bold">
                                    {state.detectedMovements}/{requiredMovements}
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                                <div
                                    className="h-3 rounded-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${getProgressPercentage()}%` }}
                                />
                            </div>
                            <p className="text-gray-400 text-xs text-center">
                                {t("nebula.gyroscope.moveDevice")}
                            </p>
                        </div>

                        {/* Current Instruction */}
                        <div className="text-center">
                            <div className="mb-3">
                                <RotateCcw
                                    className="text-blue-400 mx-auto animate-spin"
                                    size={32}
                                    style={{ animationDuration: "2s" }}
                                />
                            </div>
                            <p className="text-white font-medium">
                                {state.detectedMovements === 0
                                    ? t("nebula.gyroscope.startMoving")
                                    : state.detectedMovements < requiredMovements
                                        ? t("nebula.gyroscope.keepMoving")
                                        : t("nebula.gyroscope.verificationComplete")}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            {t("nebula.gyroscope.success.restoring")}
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NebulaGyroscopeModal;