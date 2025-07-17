// src/components/Security/GyroscopeModal.tsx - Исправленная версия с управлением ориентацией

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Compass,
    RotateCcw,
    Clock,
    AlertTriangle,
    Shield,
    CheckCircle2,
    XCircle,
    Smartphone,
    RotateCw,
} from "lucide-react";

import { validateSecureGyroscope } from "@/lib/authService";

interface GyroscopeModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
}

type GyroscopePhase = "initializing" | "instructions" | "verification" | "error" | "unsupported";

interface MotionData {
    alpha: number;
    beta: number;
    gamma: number;
    timestamp: number;
}

const GyroscopeModal: React.FC<GyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const title = "Gyroscope Verification Required";
    const description = "Your trust score is extremely low. Please move your device to verify you are human.";

    const [currentPhase, setCurrentPhase] = useState<GyroscopePhase>("initializing");
    const [verificationTimeRemaining, setVerificationTimeRemaining] = useState(15000);
    const [verificationProgress, setVerificationProgress] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attemptMade, setAttemptMade] = useState(false);
    const [verificationTimerActive, setVerificationTimerActive] = useState(false);
    const [isGyroscopeSupported, setIsGyroscopeSupported] = useState(true);
    const [deviceOrientation, setDeviceOrientation] = useState<any>(null);
    const [motionHistory, setMotionHistory] = useState<MotionData[]>([]);
    const [lastMotionUpdate, setLastMotionUpdate] = useState(0);
    const [initialValues, setInitialValues] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
    const [orientationWasLocked, setOrientationWasLocked] = useState(false);
    const [swipesWereDisabled, setSwipesWereDisabled] = useState(false);

    const verificationTimeout = 15000; // 15 seconds
    const requiredMotionEvents = 20; // Reduced for better UX
    const motionUpdateInterval = 200; // Update every 200ms
    const motionThreshold = 3; // Reduced threshold for better sensitivity

    // Initialize gyroscope verification
    useEffect(() => {
        if (!isOpen) {
            resetState();
            return;
        }

        initializeGyroscope();
    }, [isOpen]);

    // Cleanup on unmount or close
    useEffect(() => {
        return () => {
            if (orientationWasLocked || swipesWereDisabled) {
                restoreOrientationSettings();
            }
        };
    }, [orientationWasLocked, swipesWereDisabled]);

    const resetState = () => {
        setCurrentPhase("initializing");
        setVerificationTimeRemaining(15000);
        setVerificationProgress(0);
        setIsVerifying(false);
        setError(null);
        setAttemptMade(false);
        setVerificationTimerActive(false);
        setIsGyroscopeSupported(true);
        setDeviceOrientation(null);
        setMotionHistory([]);
        setLastMotionUpdate(0);
        setInitialValues(null);

        // Restore orientation settings if modal is closing
        if (orientationWasLocked || swipesWereDisabled) {
            restoreOrientationSettings();
        }
    };

    const unlockOrientationForVerification = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        console.log("Unlocking orientation for gyroscope verification...");

        // Check if orientation is currently locked
        if (tg.isOrientationLocked) {
            setOrientationWasLocked(true);
            if (tg.unlockOrientation) {
                try {
                    tg.unlockOrientation();
                    console.log("✅ Orientation unlocked successfully");
                } catch (error) {
                    console.warn("Failed to unlock orientation:", error);
                }
            }
        }

        // Check if vertical swipes are disabled
        if (!tg.isVerticalSwipesEnabled) {
            setSwipesWereDisabled(true);
            if (tg.enableVerticalSwipes) {
                try {
                    tg.enableVerticalSwipes();
                    console.log("✅ Vertical swipes enabled successfully");
                } catch (error) {
                    console.warn("Failed to enable vertical swipes:", error);
                }
            }
        }
    };

    const restoreOrientationSettings = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        console.log("Restoring orientation settings...");

        // Restore orientation lock if it was previously locked
        if (orientationWasLocked && tg.lockOrientation) {
            try {
                tg.lockOrientation();
                console.log("✅ Orientation locked restored");
            } catch (error) {
                console.warn("Failed to restore orientation lock:", error);
            }
        }

        // Restore vertical swipes setting if they were previously disabled
        if (swipesWereDisabled && tg.disableVerticalSwipes) {
            try {
                tg.disableVerticalSwipes();
                console.log("✅ Vertical swipes disabled restored");
            } catch (error) {
                console.warn("Failed to restore vertical swipes setting:", error);
            }
        }

        setOrientationWasLocked(false);
        setSwipesWereDisabled(false);
    };

    const initializeGyroscope = async () => {
        console.log("Initializing gyroscope verification");

        if (typeof window === "undefined") {
            console.log("Window not available");
            setError("Gyroscope verification is not available in this environment");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        const tg = window.Telegram?.WebApp;

        if (!tg?.DeviceOrientation) {
            console.log("DeviceOrientation not available - device/platform not supported");
            setError("Gyroscope verification is not supported on this device or platform");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        // Log current orientation settings
        console.log("Current orientation settings:", {
            isOrientationLocked: tg.isOrientationLocked,
            isVerticalSwipesEnabled: tg.isVerticalSwipesEnabled,
            version: tg.version,
            platform: tg.platform
        });

        setDeviceOrientation(tg.DeviceOrientation);
        setCurrentPhase("instructions");
        console.log("Gyroscope initialization successful");
    };

    // Verification timer
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

    const handleVerificationTimeout = useCallback(() => {
        console.log("Gyroscope verification timeout");
        setVerificationTimerActive(false);
        setIsVerifying(false);

        if (deviceOrientation?.isStarted) {
            deviceOrientation.stop(() => {
                console.log("DeviceOrientation stopped after timeout");
            });
        }

        // Restore orientation settings
        restoreOrientationSettings();

        if (!attemptMade) {
            setError("Verification timeout. Please move your device more actively.");
            setAttemptMade(true);
            setCurrentPhase("error");
            setTimeout(() => {
                handleGyroscopeFailure();
            }, 2000);
        }
    }, [attemptMade, deviceOrientation]);

    const startVerification = useCallback(() => {
        if (!deviceOrientation || isVerifying || attemptMade || !isGyroscopeSupported) {
            return;
        }

        console.log("Starting gyroscope verification");

        // CRITICAL: Unlock orientation before starting verification
        unlockOrientationForVerification();

        setIsVerifying(true);
        setAttemptMade(true);
        setCurrentPhase("verification");
        setVerificationTimeRemaining(verificationTimeout);
        setVerificationTimerActive(true);
        setMotionHistory([]);
        setVerificationProgress(0);
        setError(null);
        setInitialValues(null);

        // Wait a bit for orientation unlock to take effect
        setTimeout(() => {
            // Start listening to device orientation with proper error handling
            deviceOrientation.start(
                { refresh_rate: motionUpdateInterval, need_absolute: false },
                () => {
                    console.log("DeviceOrientation started successfully");

                    // Wait for initial values to stabilize
                    setTimeout(() => {
                        if (deviceOrientation.isStarted) {
                            // Store initial values for comparison
                            const initial = {
                                alpha: deviceOrientation.alpha || 0,
                                beta: deviceOrientation.beta || 0,
                                gamma: deviceOrientation.gamma || 0,
                            };
                            setInitialValues(initial);
                            console.log("Initial orientation values:", initial);
                            startMotionTracking();
                        } else {
                            console.error("DeviceOrientation failed to start");
                            setError("Failed to start gyroscope sensor. Please try again.");
                            setCurrentPhase("error");
                            restoreOrientationSettings();
                            setTimeout(() => {
                                handleGyroscopeFailure();
                            }, 2000);
                        }
                    }, 800); // Increased delay for better stability
                }
            );
        }, 300); // Wait for orientation unlock
    }, [deviceOrientation, isVerifying, attemptMade, isGyroscopeSupported, verificationTimeout]);

    const startMotionTracking = useCallback(() => {
        let trackingInterval: NodeJS.Timeout;

        const trackMotion = () => {
            if (!deviceOrientation || !isVerifying || !deviceOrientation.isStarted) {
                if (trackingInterval) {
                    clearInterval(trackingInterval);
                }
                return;
            }

            const now = Date.now();
            const currentValues = {
                alpha: deviceOrientation.alpha || 0,
                beta: deviceOrientation.beta || 0,
                gamma: deviceOrientation.gamma || 0,
            };

            // Check if values are actually changing
            if (initialValues) {
                const alphaChange = Math.abs(currentValues.alpha - initialValues.alpha);
                const betaChange = Math.abs(currentValues.beta - initialValues.beta);
                const gammaChange = Math.abs(currentValues.gamma - initialValues.gamma);

                // Record any significant motion
                if (alphaChange > motionThreshold || betaChange > motionThreshold || gammaChange > motionThreshold) {
                    const motionData: MotionData = {
                        alpha: currentValues.alpha,
                        beta: currentValues.beta,
                        gamma: currentValues.gamma,
                        timestamp: now,
                    };

                    setMotionHistory(prev => {
                        const newHistory = [...prev, motionData];

                        // Keep only recent motion data (last 8 seconds for longer history)
                        const recentHistory = newHistory.filter(data => now - data.timestamp < 8000);

                        // Calculate progress based on motion diversity
                        const progress = calculateMotionProgress(recentHistory);
                        setVerificationProgress(progress);

                        console.log("Motion detected:", {
                            alpha: currentValues.alpha.toFixed(2),
                            beta: currentValues.beta.toFixed(2),
                            gamma: currentValues.gamma.toFixed(2),
                            changes: {
                                alphaChange: alphaChange.toFixed(2),
                                betaChange: betaChange.toFixed(2),
                                gammaChange: gammaChange.toFixed(2)
                            },
                            progress: progress.toFixed(1),
                            historyLength: recentHistory.length
                        });

                        // Check if verification is complete
                        if (progress >= 100 && isVerifying) {
                            console.log("Gyroscope verification complete!");
                            handleVerificationSuccess();
                        }

                        return recentHistory;
                    });

                    setLastMotionUpdate(now);
                } else {
                    // Log current values even without significant motion for debugging
                    if (process.env.NODE_ENV === "development") {
                        console.log("Current values (no motion):", {
                            alpha: currentValues.alpha.toFixed(2),
                            beta: currentValues.beta.toFixed(2),
                            gamma: currentValues.gamma.toFixed(2),
                            changes: {
                                alphaChange: alphaChange.toFixed(2),
                                betaChange: betaChange.toFixed(2),
                                gammaChange: gammaChange.toFixed(2)
                            }
                        });
                    }
                }
            }
        };

        trackingInterval = setInterval(trackMotion, motionUpdateInterval);

        // Stop tracking after timeout
        setTimeout(() => {
            if (trackingInterval) {
                clearInterval(trackingInterval);
            }
        }, verificationTimeout);
    }, [deviceOrientation, isVerifying, verificationTimeout, initialValues, motionThreshold]);

    const calculateMotionProgress = (history: MotionData[]): number => {
        if (history.length < 3) return 0;

        // Calculate motion diversity across different axes
        const alphaValues = history.map(d => d.alpha);
        const betaValues = history.map(d => d.beta);
        const gammaValues = history.map(d => d.gamma);

        const alphaRange = Math.max(...alphaValues) - Math.min(...alphaValues);
        const betaRange = Math.max(...betaValues) - Math.min(...betaValues);
        const gammaRange = Math.max(...gammaValues) - Math.min(...gammaValues);

        // More generous scoring for better UX
        const alphaScore = Math.min((alphaRange / 20) * 100, 100); // 20 degrees = 100%
        const betaScore = Math.min((betaRange / 20) * 100, 100);
        const gammaScore = Math.min((gammaRange / 20) * 100, 100);

        // Calculate overall motion score
        const motionScore = (alphaScore + betaScore + gammaScore) / 3;

        // Require minimum motion events
        const eventScore = Math.min((history.length / requiredMotionEvents) * 100, 100);

        // Time progression bonus (encourage sustained motion)
        const timeSpan = history.length > 0 ? history[history.length - 1].timestamp - history[0].timestamp : 0;
        const timeScore = Math.min((timeSpan / 2000) * 100, 100); // 2 seconds = 100%

        // Combine scores with weights
        const totalScore = (motionScore * 0.4) + (eventScore * 0.4) + (timeScore * 0.2);

        return Math.min(totalScore, 100);
    };

    const handleVerificationSuccess = useCallback(async () => {
        console.log("Gyroscope verification successful");
        setVerificationTimerActive(false);
        setIsVerifying(false);

        // Stop device orientation tracking
        if (deviceOrientation?.isStarted) {
            deviceOrientation.stop(() => {
                console.log("DeviceOrientation stopped after successful verification");
            });
        }

        // Restore orientation settings
        restoreOrientationSettings();

        try {
            const result = await validateSecureGyroscope(true, true, isGyroscopeSupported);

            if (result.success) {
                console.log("Gyroscope verification validated successfully");
                onSuccess();
            } else {
                console.log("Gyroscope verification failed validation");
                handleGyroscopeFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            handleGyroscopeFailure();
        }
    }, [isGyroscopeSupported, onSuccess, deviceOrientation]);

    const handleGyroscopeFailure = useCallback(async () => {
        console.log("Handling gyroscope failure, supported:", isGyroscopeSupported);

        // Stop device orientation tracking
        if (deviceOrientation?.isStarted) {
            deviceOrientation.stop(() => {
                console.log("DeviceOrientation stopped after failure");
            });
        }

        // Restore orientation settings
        restoreOrientationSettings();

        try {
            await validateSecureGyroscope(false, false, isGyroscopeSupported);
        } catch (error) {
            console.error("Error sending gyroscope failure to API:", error);
        }

        onFailure();
    }, [isGyroscopeSupported, onFailure, deviceOrientation]);

    const handleUnsupportedDevice = useCallback(() => {
        console.log("Handling unsupported device for gyroscope");
        handleGyroscopeFailure();
    }, [handleGyroscopeFailure]);

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center">
                            {currentPhase === "unsupported" ? (
                                <XCircle className="text-red-400" size={48} />
                            ) : currentPhase === "verification" && verificationProgress >= 100 ? (
                                <CheckCircle2 className="text-green-400" size={48} />
                            ) : (
                                <Compass className="text-purple-400" size={48} />
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
                            <Compass className="text-purple-400 mx-auto mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">Initializing gyroscope verification...</p>
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
                                    <h4 className="text-orange-300 font-semibold mb-1 text-sm">Security Policy</h4>
                                    <p className="text-orange-200 text-xs">
                                        Your trust score requires gyroscope verification. Since your device does not support this feature,
                                        your account will be blocked for security reasons.
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
                ) : currentPhase === "instructions" ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Smartphone className="text-purple-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">Device Movement Required</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You need to move your device in different directions to verify you are human
                            </p>
                        </div>

                        {/* Orientation unlock notice */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <RotateCw className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-blue-300 font-semibold mb-1 text-sm">Orientation Settings</h4>
                                    <p className="text-blue-200 text-xs">
                                        Screen orientation will be temporarily unlocked during verification to ensure proper sensor functionality.
                                        Settings will be restored after completion.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <h4 className="text-purple-300 font-semibold mb-2 text-sm">Instructions:</h4>
                            <div className="text-purple-200 text-sm space-y-1">
                                <p>1. Hold your device firmly in your hands</p>
                                <p>2. Slowly tilt and rotate your device in different directions</p>
                                <p>3. Keep movements smooth and controlled</p>
                                <p>4. Continue until the progress bar fills completely</p>
                            </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <Clock className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-orange-300 font-semibold mb-1 text-sm">Time Limit</h4>
                                    <p className="text-orange-200 text-xs">
                                        You have 15 seconds to complete the verification. Move your device actively
                                        but carefully to avoid dropping it.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                            onClick={startVerification}
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
                            <span className={`font-bold ${verificationTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}>
                                {formatTime(verificationTimeRemaining)}
                            </span>
                            <span className="text-gray-500">remaining</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Verification Progress</span>
                                <span className="text-purple-400 font-bold">{Math.round(verificationProgress)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                                <div
                                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${verificationProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Movement Instructions */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
                            <div className="mb-3">
                                <Compass className="text-purple-400 mx-auto animate-pulse" size={32} />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Keep Moving Your Device</h3>
                            <p className="text-gray-400 text-sm">
                                Tilt and rotate your device in different directions
                            </p>
                        </div>

                        {/* Progress Status */}
                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                {verificationProgress < 25 ? "Start moving your device..." :
                                    verificationProgress < 50 ? "Good! Keep moving..." :
                                        verificationProgress < 75 ? "Great! Almost there..." :
                                            verificationProgress < 100 ? "Perfect! Just a bit more..." :
                                                "Verification complete!"}
                            </p>
                        </div>

                        {/* Debug Info - only in development */}
                        {process.env.NODE_ENV === "development" && deviceOrientation && (
                            <div className="bg-gray-800 rounded-lg p-3 text-xs">
                                <p className="text-gray-400">Debug Info:</p>
                                <p className="text-green-400">Started: {deviceOrientation.isStarted ? "Yes" : "No"}</p>
                                <p className="text-blue-400">Alpha: {deviceOrientation.alpha?.toFixed(2) || "0"}</p>
                                <p className="text-blue-400">Beta: {deviceOrientation.beta?.toFixed(2) || "0"}</p>
                                <p className="text-blue-400">Gamma: {deviceOrientation.gamma?.toFixed(2) || "0"}</p>
                                <p className="text-yellow-400">Motion Events: {motionHistory.length}</p>
                                <p className="text-purple-400">Orientation Unlocked: {orientationWasLocked ? "Yes" : "No"}</p>
                            </div>
                        )}
                    </div>
                ) : currentPhase === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-xs text-center">
                                Your account will be blocked for 2 hours due to failed gyroscope verification.
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Warning Message */}
                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-xs text-center">
                        {currentPhase === "unsupported"
                            ? "Your account will be blocked for 2 hours due to device incompatibility."
                            : "Gyroscope verification required due to extremely low trust score. Your account will be blocked for 2 hours if verification fails."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GyroscopeModal;