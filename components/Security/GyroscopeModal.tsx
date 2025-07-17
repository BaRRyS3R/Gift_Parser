// src/components/Security/GyroscopeModal.tsx - Gyroscope verification using browser Web API

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

import { validateSecureGyroscope } from "@/lib/authService";

interface GyroscopeModalProps {
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

const GyroscopeModal: React.FC<GyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const title = "Gyroscope Authentication Required";
    const description = "Your trust score is extremely low. Please complete gyroscope verification to continue.";

    const [currentPhase, setCurrentPhase] = useState<GyroscopePhase>("initializing");
    const [verificationTimeRemaining, setVerificationTimeRemaining] = useState(15000);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attemptMade, setAttemptMade] = useState(false);
    const [verificationTimerActive, setVerificationTimerActive] = useState(false);
    const [isGyroscopeSupported, setIsGyroscopeSupported] = useState(true);
    const [detectedMovements, setDetectedMovements] = useState(0);
    const [requiredMovements] = useState(3); // Require 3 distinct movements

    const verificationTimeout = 15000; // 15 seconds for verification
    const movementThreshold = 15; // Degrees of rotation to count as movement
    const movementCooldown = 1000; // 1 second between movements

    // Refs for gyroscope data and movement detection
    const gyroscopeDataRef = useRef<GyroscopeData>({ alpha: null, beta: null, gamma: null });
    const lastMovementTimeRef = useRef<number>(0);
    const initialDataRef = useRef<GyroscopeData>({ alpha: null, beta: null, gamma: null });
    const eventListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setCurrentPhase("initializing");
            setVerificationTimeRemaining(15000);
            setError(null);
            setAttemptMade(false);
            setVerificationTimerActive(false);
            setIsVerifying(false);
            setIsGyroscopeSupported(true);
            setDetectedMovements(0);
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
        if (!verificationTimerActive || currentPhase !== "verification") return;

        const timer = setInterval(() => {
            setVerificationTimeRemaining((prev) => {
                const newTime = prev - 100;

                if (newTime <= 0) {
                    handleVerificationTimeout();
                    return 0;
                }

                return newTime;
            });
        }, 100);

        return () => clearInterval(timer);
    }, [verificationTimerActive, currentPhase]);

    // Initialize gyroscope functionality
    const initializeGyroscope = async () => {
        console.log("Initializing gyroscope verification");
        setCurrentPhase("initializing");

        if (typeof window === "undefined") {
            console.log("Window not available");
            setError("Gyroscope verification is not available in this environment");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            console.log("DeviceOrientationEvent not supported");
            setError("Your device does not support gyroscope verification");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        // Check if permission is required (iOS 13+)
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log("Permission required for gyroscope access");
            setCurrentPhase("permission_required");
        } else {
            console.log("No permission required, proceeding to instructions");
            setCurrentPhase("instructions");
        }
    };

    // Request permission for gyroscope access (iOS)
    const handleRequestPermission = async () => {
        try {
            const DeviceOrientationEvent = window.DeviceOrientationEvent as any;

            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();

                if (permission === 'granted') {
                    console.log("Gyroscope permission granted");
                    setCurrentPhase("instructions");
                } else {
                    console.log("Gyroscope permission denied");
                    setError("Gyroscope permission was denied. Please enable it in your device settings.");
                    setCurrentPhase("error");
                }
            }
        } catch (error) {
            console.error("Error requesting gyroscope permission:", error);
            setError("Failed to request gyroscope permission");
            setCurrentPhase("error");
        }
    };

    // Start verification process
    const handleStartVerification = () => {
        if (isVerifying || attemptMade) return;

        console.log("Starting gyroscope verification");
        setIsVerifying(true);
        setAttemptMade(true);
        setCurrentPhase("verification");
        setVerificationTimeRemaining(verificationTimeout);
        setVerificationTimerActive(true);
        setDetectedMovements(0);
        setError(null);

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

    // Detect significant movements in gyroscope data
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
            setDetectedMovements(prev => {
                const newCount = prev + 1;

                // Check if verification is complete
                if (newCount >= requiredMovements) {
                    handleVerificationSuccess();
                }

                return newCount;
            });
        }
    };

    // Handle successful verification
    const handleVerificationSuccess = useCallback(async () => {
        console.log("Gyroscope verification successful");
        setVerificationTimerActive(false);
        setCurrentPhase("success");

        // Clean up event listener
        if (eventListenerRef.current) {
            window.removeEventListener('deviceorientation', eventListenerRef.current);
            eventListenerRef.current = null;
        }

        try {
            const result = await validateSecureGyroscope(
                true, // success
                true, // completedInTime
                isGyroscopeSupported
            );

            if (result.success) {
                console.log("Gyroscope verification validated successfully");
                setTimeout(() => onSuccess(), 1000);
            } else {
                console.log("Gyroscope verification validation failed");
                handleVerificationFailure("Verification validation failed");
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            handleVerificationFailure("Verification validation error");
        }
    }, [isGyroscopeSupported, onSuccess]);

    // Handle verification timeout
    const handleVerificationTimeout = useCallback(() => {
        console.log("Gyroscope verification timeout");
        setVerificationTimerActive(false);
        handleVerificationFailure("Verification timeout");
    }, []);

    // Handle verification failure
    const handleVerificationFailure = useCallback(async (reason: string) => {
        console.log("Gyroscope verification failed:", reason);
        setError(reason);
        setCurrentPhase("error");
        setVerificationTimerActive(false);

        // Clean up event listener
        if (eventListenerRef.current) {
            window.removeEventListener('deviceorientation', eventListenerRef.current);
            eventListenerRef.current = null;
        }

        try {
            // Send failure to server
            await validateSecureGyroscope(false, false, isGyroscopeSupported);
        } catch (error) {
            console.error("Error sending gyroscope failure to API:", error);
        }

        setTimeout(() => onFailure(), 1000);
    }, [isGyroscopeSupported, onFailure]);

    // Handle unsupported device
    const handleUnsupportedDevice = useCallback(() => {
        console.log("Handling unsupported device - triggering extended block");
        handleVerificationFailure("Device does not support gyroscope verification");
    }, [handleVerificationFailure]);

    // Format time remaining
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    // Get progress percentage
    const getProgressPercentage = (): number => {
        return Math.min(100, (detectedMovements / requiredMovements) * 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {currentPhase === "unsupported" || currentPhase === "error" ? (
                                <XCircle className="text-red-400" size={48} />
                            ) : currentPhase === "success" ? (
                                <CheckCircle2 className="text-green-400" size={48} />
                            ) : (
                                <Compass className="text-blue-400" size={48} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>

                {/* Content */}
                {currentPhase === "initializing" ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <Compass className="text-blue-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">
                            Initializing gyroscope verification...
                        </p>
                    </div>
                ) : currentPhase === "unsupported" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <XCircle className="text-red-400 flex-shrink-0" size={20} />
                            <div className="text-left">
                                <p className="text-red-300 text-sm font-semibold">Device Not Supported</p>
                                <p className="text-red-200 text-xs">{error}</p>
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
                ) : currentPhase === "permission_required" ? (
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
                ) : currentPhase === "instructions" ? (
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
                ) : currentPhase === "verification" ? (
                    <div className="space-y-6">
                        {/* Timer */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span
                                className={`font-bold ${verificationTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
                            >
                                {formatTime(verificationTimeRemaining)}
                            </span>
                            <span className="text-gray-500">remaining</span>
                        </div>

                        {/* Movement Progress */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">Movements Detected</span>
                                <span className="text-blue-400 font-bold">
                                    {detectedMovements}/{requiredMovements}
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
                                {detectedMovements === 0 ? "Start moving your device..." :
                                    detectedMovements < requiredMovements ? "Keep moving..." :
                                        "Verification complete!"}
                            </p>
                        </div>
                    </div>
                ) : currentPhase === "success" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
                            <CheckCircle2 className="text-green-400 flex-shrink-0" size={20} />
                            <p className="text-green-300 text-sm font-semibold">
                                Gyroscope verification successful!
                            </p>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Your trust score has been updated. Redirecting...
                        </p>
                    </div>
                ) : currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Your account will be temporarily blocked due to verification failure.
                        </p>
                    </div>
                ) : null}

                {/* Warning Message */}
                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-xs text-center">
                        {currentPhase === "unsupported"
                            ? "Your account will be temporarily blocked due to device incompatibility."
                            : "Gyroscope verification required due to extremely low trust score. Your account will be blocked if verification fails."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GyroscopeModal;