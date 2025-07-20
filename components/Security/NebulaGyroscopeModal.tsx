// src/components/Security/NebulaGyroscopeModal.tsx - Adapted for Nebula Security System

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Compass,
    RotateCcw,
    Settings,
    Clock,
    AlertTriangle,
    Shield,
    CheckCircle2,
    XCircle,
    Smartphone,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";

interface NebulaGyroscopeModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
}

type GyroscopePhase = "initializing" | "permission_required" | "instructions" | "verification" | "success" | "error" | "unsupported";

interface GyroscopeData {
    alpha: number | null; // Z-axis rotation
    beta: number | null;  // X-axis rotation
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
    detectedMovements: number;
    requiredMovements: number;
}

const NebulaGyroscopeModal: React.FC<NebulaGyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const verificationTimeout = 15000; // 15 seconds for verification
    const movementThreshold = 15; // Degrees of rotation to count as movement
    const movementCooldown = 1000; // 1 second between movements
    const requiredMovements = 3; // Require 3 distinct movements

    // Refs for gyroscope data and movement detection
    const gyroscopeDataRef = useRef<GyroscopeData>({ alpha: null, beta: null, gamma: null });
    const lastMovementTimeRef = useRef<number>(0);
    const initialDataRef = useRef<GyroscopeData>({ alpha: null, beta: null, gamma: null });
    const eventListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

    const [state, setState] = useState<GyroscopeState>({
        currentPhase: "initializing",
        verificationTimeRemaining: 15000,
        isVerifying: false,
        error: null,
        attemptMade: false,
        verificationTimerActive: false,
        isGyroscopeSupported: true,
        detectedMovements: 0,
        requiredMovements: requiredMovements,
    });

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
                isGyroscopeSupported: true,
                detectedMovements: 0,
                requiredMovements: requiredMovements,
            });

            gyroscopeDataRef.current = { alpha: null, beta: null, gamma: null };
            lastMovementTimeRef.current = 0;
            initialDataRef.current = { alpha: null, beta: null, gamma: null };

            // Clean up event listeners
            if (eventListenerRef.current) {
                window.removeEventListener('deviceorientation', eventListenerRef.current);
                eventListenerRef.current = null;
            }
            return;
        }

        initializeGyroscope();
    }, [isOpen]);

    // Verification phase timer
    useEffect(() => {
        if (!state.verificationTimerActive || state.currentPhase !== "verification") return;

        const timer = setInterval(() => {
            setState(prev => {
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
     * Initialize gyroscope functionality
     */
    const initializeGyroscope = async () => {
        console.log("Initializing gyroscope verification");
        setState(prev => ({ ...prev, currentPhase: "initializing" }));

        if (typeof window === "undefined") {
            console.log("Window not available");
            setState(prev => ({
                ...prev,
                error: "Gyroscope verification is not available in this environment",
                currentPhase: "unsupported",
                isGyroscopeSupported: false,
            }));
            return;
        }

        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            console.log("DeviceOrientationEvent not supported");
            setState(prev => ({
                ...prev,
                error: "Your device does not support gyroscope verification",
                currentPhase: "unsupported",
                isGyroscopeSupported: false,
            }));
            return;
        }

        // Check if permission is required (iOS 13+)
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log("Permission required for gyroscope access");
            setState(prev => ({ ...prev, currentPhase: "permission_required" }));
        } else {
            console.log("No permission required, proceeding to instructions");
            setState(prev => ({ ...prev, currentPhase: "instructions" }));
        }
    };

    /**
     * Request permission for gyroscope access (iOS)
     */
    const handleRequestPermission = async () => {
        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();

                if (permission === 'granted') {
                    console.log("Gyroscope permission granted");
                    setState(prev => ({ ...prev, currentPhase: "instructions" }));
                } else {
                    console.log("Gyroscope permission denied");
                    setState(prev => ({
                        ...prev,
                        error: "Gyroscope permission was denied. Please enable it in your device settings.",
                        currentPhase: "error",
                    }));
                }
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            setState(prev => ({
                ...prev,
                error: "Failed to request gyroscope permission",
                currentPhase: "error",
            }));
        }
    };

    /**
     * Start verification process
     */
    const handleStartVerification = () => {
        if (state.isVerifying || state.attemptMade) return;

        console.log("Starting gyroscope verification");
        setState(prev => ({
            ...prev,
            isVerifying: true,
            attemptMade: true,
            currentPhase: "verification",
            verificationTimeRemaining: verificationTimeout,
            verificationTimerActive: true,
            detectedMovements: 0,
            error: null,
        }));

        // Set up event listener for device orientation
        const handleOrientationChange = (event: DeviceOrientationEvent) => {
            const currentData: GyroscopeData = {
                alpha: event.alpha, // Z-axis (compass heading)
                beta: event.beta,   // X-axis (front-to-back tilt)
                gamma: event.gamma  // Y-axis (left-to-right tilt)
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
        window.addEventListener('deviceorientation', handleOrientationChange);

        // Auto-fail if no gyroscope data is received within 3 seconds
        setTimeout(() => {
            if (gyroscopeDataRef.current.alpha === null &&
                gyroscopeDataRef.current.beta === null &&
                gyroscopeDataRef.current.gamma === null) {
                console.log("No gyroscope data received - device likely doesn't support it");
                handleVerificationFailure("No gyroscope data detected");
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

        if (initial.alpha === null || initial.beta === null || initial.gamma === null ||
            currentData.alpha === null || currentData.beta === null || currentData.gamma === null) {
            return;
        }

        // Calculate differences from initial position
        const alphaDiff = Math.abs((currentData.alpha || 0) - (initial.alpha || 0));
        const betaDiff = Math.abs((currentData.beta || 0) - (initial.beta || 0));
        const gammaDiff = Math.abs((currentData.gamma || 0) - (initial.gamma || 0));

        // Normalize alpha difference to handle 0-360 wraparound
        const normalizedAlphaDiff = Math.min(alphaDiff, 360 - alphaDiff);

        // Check if any axis has moved significantly
        const significantMovement = normalizedAlphaDiff > movementThreshold ||
            betaDiff > movementThreshold ||
            gammaDiff > movementThreshold;

        if (significantMovement) {
            console.log("Movement detected:", {
                alpha: normalizedAlphaDiff.toFixed(1),
                beta: betaDiff.toFixed(1),
                gamma: gammaDiff.toFixed(1)
            });

            lastMovementTimeRef.current = now;
            setState(prev => {
                const newCount = prev.detectedMovements + 1;

                // Check if verification is complete
                if (newCount >= requiredMovements) {
                    handleVerificationSuccess();
                }

                return {
                    ...prev,
                    detectedMovements: newCount,
                };
            });
        }
    };

    /**
     * Handle successful verification
     */
    const handleVerificationSuccess = useCallback(async () => {
        console.log("Gyroscope verification successful");
        setState(prev => ({
            ...prev,
            verificationTimerActive: false,
            currentPhase: "success",
        }));

        // Clean up event listener
        if (eventListenerRef.current) {
            window.removeEventListener('deviceorientation', eventListenerRef.current);
            eventListenerRef.current = null;
        }

        try {
            const response = await makeAuthenticatedRequest('/api/nebula/gyroscope', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: true,
                    completedInTime: true,
                    deviceSupported: state.isGyroscopeSupported,
                    movementData: {
                        totalMovements: state.detectedMovements,
                        requiredMovements: requiredMovements,
                        timeSpent: verificationTimeout - state.verificationTimeRemaining,
                        significantMovements: true,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Verification failed');
            }

            if (result.verified && result.trustRestored) {
                console.log("Gyroscope verification validated successfully");
                setTimeout(() => onSuccess(), 1500);
            } else if (result.blocked) {
                console.log("Gyroscope verification validation failed");
                handleVerificationFailure(result.blockReason || "Verification validation failed");
            } else {
                throw new Error('Unexpected verification result');
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            handleVerificationFailure("Verification validation error");
        }
    }, [state.isGyroscopeSupported, state.detectedMovements, state.verificationTimeRemaining, makeAuthenticatedRequest, onSuccess]);

    /**
     * Handle verification timeout
     */
    const handleVerificationTimeout = useCallback(() => {
        console.log("Gyroscope verification timeout");
        setState(prev => ({ ...prev, verificationTimerActive: false }));
        handleVerificationFailure("Verification timeout");
    }, []);

    /**
     * Handle verification failure
     */
    const handleVerificationFailure = useCallback(async (reason: string) => {
        console.log("Gyroscope verification failed:", reason);
        setState(prev => ({
            ...prev,
            error: reason,
            currentPhase: "error",
            verificationTimerActive: false,
        }));

        // Clean up event listener
        if (eventListenerRef.current) {
            window.removeEventListener('deviceorientation', eventListenerRef.current);
            eventListenerRef.current = null;
        }

        try {
            // Send failure to server
            await makeAuthenticatedRequest('/api/nebula/gyroscope', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: false,
                    completedInTime: false,
                    deviceSupported: state.isGyroscopeSupported,
                }),
            });
        } catch (error) {
            console.error("Error sending gyroscope failure to API:", error);
        }

        setTimeout(() => onFailure(), 1000);
    }, [state.isGyroscopeSupported, makeAuthenticatedRequest, onFailure]);

    /**
     * Handle unsupported device
     */
    const handleUnsupportedDevice = useCallback(() => {
        console.log("Handling unsupported device - triggering extended block");
        handleVerificationFailure("Device does not support gyroscope verification");
    }, [handleVerificationFailure]);

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
                            {state.currentPhase === "unsupported" || state.currentPhase === "error" ? (
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
                            ? "Verification Successful"
                            : "Gyroscope Authentication Required"
                        }
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.currentPhase === "success"
                            ? "Your identity has been verified successfully"
                            : "Your trust score is extremely low. Please complete gyroscope verification to continue."
                        }
                    </p>
                </div>

                {/* Content */}
                {state.currentPhase === "initializing" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Compass className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            Initializing gyroscope verification...
                        </p>
                    </div>
                ) : state.currentPhase === "unsupported" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">Device Not Supported</p>
                                <p className="text-red-200 text-xs">{state.error}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-orange-300 font-semibold mb-1 text-sm">
                                        Security Policy
                                    </h4>
                                    <p className="text-orange-200 text-xs">
                                        Accounts with extremely low trust scores require gyroscope verification.
                                        Since your device does not support this feature, your account will be temporarily blocked.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                            onClick={handleUnsupportedDevice}
                        >
                            <Shield size={16} />
                            <span>I Understand</span>
                        </button>
                    </div>
                ) : state.currentPhase === "permission_required" ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Shield className="text-yellow-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">
                                Gyroscope Permission Required
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You need to grant gyroscope access permission to continue
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                Instructions:
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>1. Tap Grant Permission below</p>
                                <p>2. Allow motion and orientation access when prompted</p>
                                <p>3. Follow the movement instructions to complete verification</p>
                            </div>
                        </div>

                        <button
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                            onClick={handleRequestPermission}
                        >
                            <Shield size={20} />
                            <span>Grant Permission</span>
                        </button>
                    </div>
                ) : state.currentPhase === "instructions" ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Smartphone className="text-blue-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">
                                Movement Instructions
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You will need to move your device to complete verification
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                                Required Movements:
                            </h4>
                            <div className="text-blue-200 text-sm space-y-1">
                                <p>• Tilt your device left and right</p>
                                <p>• Tilt your device forward and backward</p>
                                <p>• Rotate your device clockwise or counterclockwise</p>
                                <p className="text-blue-300 font-medium mt-2">
                                    Complete {requiredMovements} distinct movements within 15 seconds
                                </p>
                            </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-yellow-300 font-semibold mb-1 text-sm">
                                        Important
                                    </h4>
                                    <p className="text-yellow-200 text-xs">
                                        You have only one attempt to complete this verification.
                                        Make sure your device can move freely before starting.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                            onClick={handleStartVerification}
                        >
                            <Compass size={20} />
                            <span>Start Verification</span>
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
                            <span className="text-gray-500">remaining</span>
                        </div>

                        {/* Movement Progress */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">Movements Detected</span>
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
                                Move your device in different directions
                            </p>
                        </div>

                        {/* Current Instruction */}
                        <div className="text-center">
                            <div className="mb-3">
                                <RotateCcw
                                    className="text-blue-400 mx-auto animate-spin"
                                    size={32}
                                    style={{ animationDuration: '2s' }}
                                />
                            </div>
                            <p className="text-white font-medium">
                                {state.detectedMovements === 0 ? "Start moving your device..." :
                                    state.detectedMovements < requiredMovements ? "Keep moving..." :
                                        "Verification complete!"}
                            </p>
                        </div>
                    </div>
                ) : state.currentPhase === "success" ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            Your trust score has been restored. Redirecting to the application...
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : state.currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                            <p className="text-red-300 text-sm">{state.error}</p>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Your account will be temporarily blocked due to verification failure.
                        </p>
                    </div>
                ) : null}

                {/* Warning Message */}
                {state.currentPhase !== "success" && (
                    <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-300 text-xs text-center">
                            {state.currentPhase === "unsupported"
                                ? "Your account will be blocked for 1 month due to device incompatibility."
                                : "Gyroscope verification required due to extremely low trust score. Your account will be blocked for 1 month if verification fails."
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NebulaGyroscopeModal;