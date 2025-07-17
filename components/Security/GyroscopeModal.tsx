// src/components/Security/GyroscopeModal.tsx - Правильная реализация с Gyroscope API

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

interface GyroscopeData {
    x: number; // Rotation rate around X-axis in rad/s
    y: number; // Rotation rate around Y-axis in rad/s  
    z: number; // Rotation rate around Z-axis in rad/s
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
    const [gyroscope, setGyroscope] = useState<any>(null);
    const [motionHistory, setMotionHistory] = useState<GyroscopeData[]>([]);
    const [lastMotionUpdate, setLastMotionUpdate] = useState(0);
    const [gyroscopeStarted, setGyroscopeStarted] = useState(false);

    const verificationTimeout = 15000; // 15 seconds
    const requiredMotionEvents = 20; // Minimum motion events needed
    const motionThreshold = 0.1; // Minimum rotation rate in rad/s to count as motion

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
            if (gyroscopeStarted && gyroscope) {
                cleanupGyroscope();
            }
        };
    }, [gyroscopeStarted, gyroscope]);

    const resetState = () => {
        setCurrentPhase("initializing");
        setVerificationTimeRemaining(15000);
        setVerificationProgress(0);
        setIsVerifying(false);
        setError(null);
        setAttemptMade(false);
        setVerificationTimerActive(false);
        setIsGyroscopeSupported(true);
        setGyroscope(null);
        setMotionHistory([]);
        setLastMotionUpdate(0);
        setGyroscopeStarted(false);

        // Clean up any active gyroscope
        cleanupGyroscope();
    };

    const cleanupGyroscope = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        try {
            // Remove all gyroscope event listeners
            tg.offEvent('gyroscope_started', handleGyroscopeStarted);
            tg.offEvent('gyroscope_failed', handleGyroscopeFailed);
            tg.offEvent('gyroscope_changed', handleGyroscopeChanged);
            tg.offEvent('gyroscope_stopped', handleGyroscopeStopped);

            // Stop gyroscope if it's running
            if (gyroscopeStarted && tg.Gyroscope) {
                tg.Gyroscope.stop();
            }
        } catch (error) {
            console.warn("Error during gyroscope cleanup:", error);
        }
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

        if (!tg?.Gyroscope) {
            console.log("Gyroscope not available - device/platform not supported");
            setError("Gyroscope verification is not supported on this device or platform");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        // Log current settings
        console.log("Gyroscope API available:", {
            version: tg.version,
            platform: tg.platform,
            hasGyroscope: !!tg.Gyroscope
        });

        setGyroscope(tg.Gyroscope);
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

        cleanupGyroscope();

        if (!attemptMade) {
            setError("Verification timeout. Please move your device more actively.");
            setAttemptMade(true);
            setCurrentPhase("error");
            setTimeout(() => {
                handleGyroscopeFailure();
            }, 2000);
        }
    }, [attemptMade]);

    // Gyroscope event handlers
    const handleGyroscopeStarted = useCallback(() => {
        console.log("Gyroscope started successfully");
        setGyroscopeStarted(true);
    }, []);

    const handleGyroscopeFailed = useCallback((params: any) => {
        console.log("Gyroscope failed:", params);
        setError(`Gyroscope failed: ${params.error || 'UNSUPPORTED'}`);
        setCurrentPhase("error");
        setIsGyroscopeSupported(false);
        setTimeout(() => {
            handleGyroscopeFailure();
        }, 2000);
    }, []);

    const handleGyroscopeChanged = useCallback((data: { x: number; y: number; z: number }) => {
        const now = Date.now();

        // Check if this is significant motion
        const rotationMagnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);

        if (rotationMagnitude > motionThreshold) {
            const gyroscopeData: GyroscopeData = {
                x: data.x,
                y: data.y,
                z: data.z,
                timestamp: now,
            };

            setMotionHistory(prev => {
                const newHistory = [...prev, gyroscopeData];

                // Keep only recent motion data (last 8 seconds)
                const recentHistory = newHistory.filter(item => now - item.timestamp < 8000);

                // Calculate progress based on motion diversity
                const progress = calculateMotionProgress(recentHistory);
                setVerificationProgress(progress);

                console.log("Gyroscope motion detected:", {
                    x: data.x.toFixed(3),
                    y: data.y.toFixed(3),
                    z: data.z.toFixed(3),
                    magnitude: rotationMagnitude.toFixed(3),
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
        }
    }, [isVerifying, motionThreshold]);

    const handleGyroscopeStopped = useCallback(() => {
        console.log("Gyroscope stopped");
        setGyroscopeStarted(false);
    }, []);

    const startVerification = useCallback(() => {
        if (!gyroscope || isVerifying || attemptMade || !isGyroscopeSupported) {
            return;
        }

        console.log("Starting gyroscope verification");

        setIsVerifying(true);
        setAttemptMade(true);
        setCurrentPhase("verification");
        setVerificationTimeRemaining(verificationTimeout);
        setVerificationTimerActive(true);
        setMotionHistory([]);
        setVerificationProgress(0);
        setError(null);

        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        // Set up event listeners
        tg.onEvent('gyroscope_started', handleGyroscopeStarted);
        tg.onEvent('gyroscope_failed', handleGyroscopeFailed);
        tg.onEvent('gyroscope_changed', handleGyroscopeChanged);
        tg.onEvent('gyroscope_stopped', handleGyroscopeStopped);

        // Start gyroscope with appropriate refresh rate
        gyroscope.start({ refresh_rate: 100 }); // 100ms refresh rate

    }, [gyroscope, isVerifying, attemptMade, isGyroscopeSupported, verificationTimeout,
        handleGyroscopeStarted, handleGyroscopeFailed, handleGyroscopeChanged, handleGyroscopeStopped]);

    const calculateMotionProgress = (history: GyroscopeData[]): number => {
        if (history.length < 3) return 0;

        // Calculate rotation rate diversity across all axes
        const xValues = history.map(d => Math.abs(d.x));
        const yValues = history.map(d => Math.abs(d.y));
        const zValues = history.map(d => Math.abs(d.z));

        // Calculate maximum rotation rates detected
        const maxX = Math.max(...xValues);
        const maxY = Math.max(...yValues);
        const maxZ = Math.max(...zValues);

        // Score based on rotation rates (typical device rotation is 0-5 rad/s for normal movement)
        const xScore = Math.min((maxX / 2.0) * 100, 100); // 2 rad/s = 100%
        const yScore = Math.min((maxY / 2.0) * 100, 100);
        const zScore = Math.min((maxZ / 2.0) * 100, 100);

        // Calculate overall motion score
        const motionScore = (xScore + yScore + zScore) / 3;

        // Require minimum motion events
        const eventScore = Math.min((history.length / requiredMotionEvents) * 100, 100);

        // Time progression bonus (encourage sustained motion)
        const timeSpan = history.length > 0 ? history[history.length - 1].timestamp - history[0].timestamp : 0;
        const timeScore = Math.min((timeSpan / 3000) * 100, 100); // 3 seconds = 100%

        // Combine scores with weights
        const totalScore = (motionScore * 0.5) + (eventScore * 0.3) + (timeScore * 0.2);

        return Math.min(totalScore, 100);
    };

    const handleVerificationSuccess = useCallback(async () => {
        console.log("Gyroscope verification successful");
        setVerificationTimerActive(false);
        setIsVerifying(false);

        cleanupGyroscope();

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
    }, [isGyroscopeSupported, onSuccess]);

    const handleGyroscopeFailure = useCallback(async () => {
        console.log("Handling gyroscope failure, supported:", isGyroscopeSupported);

        cleanupGyroscope();

        try {
            await validateSecureGyroscope(false, false, isGyroscopeSupported);
        } catch (error) {
            console.error("Error sending gyroscope failure to API:", error);
        }

        onFailure();
    }, [isGyroscopeSupported, onFailure]);

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
                            <h3 className="text-white font-semibold mb-2">Device Rotation Required</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You need to rotate your device in different directions to verify you are human
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <RotateCw className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-blue-300 font-semibold mb-1 text-sm">Gyroscope Verification</h4>
                                    <p className="text-blue-200 text-xs">
                                        This verification uses your device's gyroscope sensor to detect rotation movements.
                                        Different from simple tilt detection, this requires actual rotation motion.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <h4 className="text-purple-300 font-semibold mb-2 text-sm">Instructions:</h4>
                            <div className="text-purple-200 text-sm space-y-1">
                                <p>1. Hold your device firmly in your hands</p>
                                <p>2. Rotate your device slowly around different axes</p>
                                <p>3. Try twisting motions - not just tilting</p>
                                <p>4. Continue until the progress bar fills completely</p>
                            </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <Clock className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-orange-300 font-semibold mb-1 text-sm">Time Limit</h4>
                                    <p className="text-orange-200 text-xs">
                                        You have 15 seconds to complete the verification. Rotate your device actively
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
                                <Compass className="text-purple-400 mx-auto animate-spin" size={32} />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Keep Rotating Your Device</h3>
                            <p className="text-gray-400 text-sm">
                                Twist and rotate your device in different directions
                            </p>
                        </div>

                        {/* Progress Status */}
                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                {verificationProgress < 25 ? "Start rotating your device..." :
                                    verificationProgress < 50 ? "Good! Keep rotating..." :
                                        verificationProgress < 75 ? "Great! Almost there..." :
                                            verificationProgress < 100 ? "Perfect! Just a bit more..." :
                                                "Verification complete!"}
                            </p>
                        </div>

                        {/* Status indicators */}
                        <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Gyroscope Status:</span>
                                <span className={gyroscopeStarted ? "text-green-400" : "text-yellow-400"}>
                                    {gyroscopeStarted ? "Active" : "Starting..."}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Motion Events:</span>
                                <span className="text-blue-400">{motionHistory.length}</span>
                            </div>
                            {motionHistory.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Last Motion:</span>
                                    <span className="text-purple-400">
                                        {Math.abs(motionHistory[motionHistory.length - 1]?.x || 0).toFixed(2)} rad/s
                                    </span>
                                </div>
                            )}
                        </div>
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