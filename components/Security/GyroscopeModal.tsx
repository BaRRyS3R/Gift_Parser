// src/components/Security/GyroscopeModal.tsx - Gyroscope verification modal

"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, Settings, Clock, AlertTriangle, CheckCircle } from "lucide-react";

import { validateSecureGyroscope } from "@/lib/authService";

interface GyroscopeModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    title?: string;
    description?: string;
}

interface GyroscopeData {
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

const GyroscopeModal: React.FC<GyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    title = "Gyroscope Verification",
    description = "Please perform device rotation movements as instructed",
}) => {
    const [gyroscope, setGyroscope] = useState<any>(null);
    const [deviceOrientation, setDeviceOrientation] = useState<any>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepCompleted, setStepCompleted] = useState<boolean[]>([false, false, false]);

    const gyroscopeDataRef = useRef<GyroscopeData[]>([]);
    const orientationDataRef = useRef<any[]>([]);
    const stepRequirementsRef = useRef<any[]>([]);

    const verificationTimeout = 60000; // 60 seconds for full verification
    const stepTimeout = 15000; // 15 seconds per step
    const startTime = useRef(Date.now());

    const verificationSteps = [
        {
            instruction: "Hold your device level and slowly rotate it left, then right",
            icon: "↔️",
            requirement: "horizontal_rotation",
        },
        {
            instruction: "Tilt your device forward, then backward",
            icon: "↕️",
            requirement: "vertical_tilt",
        },
        {
            instruction: "Gently shake your device up and down 3 times",
            icon: "🔄",
            requirement: "shake_motion",
        },
    ];

    // Initialize gyroscope and device orientation
    useEffect(() => {
        if (!isOpen) return;

        const initSensors = async () => {
            if (typeof window === "undefined") return;

            const tg = window.Telegram?.WebApp;

            if (!tg?.Gyroscope || !tg?.DeviceOrientation) {
                setError("Motion sensors are not available on this device");
                return;
            }

            const gyro = tg.Gyroscope;
            const orientation = tg.DeviceOrientation;

            setGyroscope(gyro);
            setDeviceOrientation(orientation);

            try {
                // Initialize gyroscope
                gyro.start({ refresh_rate: 100 }, () => {
                    console.log("Gyroscope started");
                });

                // Initialize device orientation
                orientation.start({ refresh_rate: 100, need_absolute: false }, () => {
                    console.log("Device orientation started");
                });

                setIsInitialized(true);
                setIsSupported(true);
                startTime.current = Date.now();
                setCurrentStep(0);
                setStepCompleted([false, false, false]);

            } catch (error) {
                console.error("Error initializing sensors:", error);
                setError("Failed to initialize motion sensors");
            }
        };

        initSensors();

        return () => {
            // Cleanup sensors
            if (gyroscope?.stop) gyroscope.stop();
            if (deviceOrientation?.stop) deviceOrientation.stop();
        };
    }, [isOpen]);

    // Timer countdown
    useEffect(() => {
        if (!isInitialized || !isOpen) return;

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            const remaining = Math.max(0, verificationTimeout - elapsed);

            setTimeRemaining(remaining);

            if (remaining === 0) {
                handleTimeout();
            }
        }, 100);

        return () => clearInterval(timer);
    }, [isInitialized, isOpen]);

    // Gyroscope data collection
    useEffect(() => {
        if (!gyroscope || !deviceOrientation || !isVerifying) return;

        const collectData = setInterval(() => {
            const gyroData: GyroscopeData = {
                x: gyroscope.x || 0,
                y: gyroscope.y || 0,
                z: gyroscope.z || 0,
                timestamp: Date.now(),
            };

            const orientationData = {
                alpha: deviceOrientation.alpha || 0,
                beta: deviceOrientation.beta || 0,
                gamma: deviceOrientation.gamma || 0,
                timestamp: Date.now(),
            };

            gyroscopeDataRef.current.push(gyroData);
            orientationDataRef.current.push(orientationData);

            // Keep only last 5 seconds of data
            const fiveSecondsAgo = Date.now() - 5000;
            gyroscopeDataRef.current = gyroscopeDataRef.current.filter(
                d => d.timestamp > fiveSecondsAgo
            );
            orientationDataRef.current = orientationDataRef.current.filter(
                d => d.timestamp > fiveSecondsAgo
            );

            // Check current step completion
            checkStepCompletion();
        }, 100);

        return () => clearInterval(collectData);
    }, [gyroscope, deviceOrientation, isVerifying, currentStep]);

    const checkStepCompletion = () => {
        if (currentStep >= verificationSteps.length) return;

        const step = verificationSteps[currentStep];
        let completed = false;

        const recentOrientation = orientationDataRef.current.slice(-20); // Last 2 seconds
        const recentGyroscope = gyroscopeDataRef.current.slice(-20);

        if (recentOrientation.length < 10 || recentGyroscope.length < 10) return;

        switch (step.requirement) {
            case "horizontal_rotation":
                // Check for gamma rotation (left-right tilt)
                const gammaValues = recentOrientation.map(d => d.gamma);
                const gammaRange = Math.max(...gammaValues) - Math.min(...gammaValues);
                completed = gammaRange > 30; // 30 degrees rotation range
                break;

            case "vertical_tilt":
                // Check for beta rotation (forward-backward tilt)
                const betaValues = recentOrientation.map(d => d.beta);
                const betaRange = Math.max(...betaValues) - Math.min(...betaValues);
                completed = betaRange > 25; // 25 degrees tilt range
                break;

            case "shake_motion":
                // Check for rapid acceleration changes
                const accelerations = recentGyroscope.map(d =>
                    Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z)
                );
                let shakeCount = 0;
                for (let i = 1; i < accelerations.length; i++) {
                    if (Math.abs(accelerations[i] - accelerations[i - 1]) > 2) {
                        shakeCount++;
                    }
                }
                completed = shakeCount > 6; // Multiple rapid changes
                break;
        }

        if (completed && !stepCompleted[currentStep]) {
            const newStepCompleted = [...stepCompleted];
            newStepCompleted[currentStep] = true;
            setStepCompleted(newStepCompleted);

            // Move to next step or complete verification
            setTimeout(() => {
                if (currentStep + 1 < verificationSteps.length) {
                    setCurrentStep(currentStep + 1);
                } else {
                    // All steps completed
                    handleVerificationComplete();
                }
            }, 1000);
        }
    };

    const startVerification = () => {
        setIsVerifying(true);
        setError(null);
        setCurrentStep(0);
        setStepCompleted([false, false, false]);
        gyroscopeDataRef.current = [];
        orientationDataRef.current = [];
        startTime.current = Date.now();
    };

    const handleVerificationComplete = async () => {
        setIsVerifying(false);

        const completedInTime = Date.now() - startTime.current < verificationTimeout;
        const allStepsCompleted = stepCompleted.every(step => step);

        try {
            const result = await validateSecureGyroscope(
                allStepsCompleted,
                completedInTime,
                {
                    gyroscopeData: gyroscopeDataRef.current,
                    orientationData: orientationDataRef.current,
                    stepCompletions: stepCompleted,
                    totalTime: Date.now() - startTime.current,
                }
            );

            if (result.success) {
                onSuccess();
            } else {
                onFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            onFailure();
        }
    };

    const handleTimeout = () => {
        setError("Verification timeout. Please try again.");
        onFailure();
    };

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
                            <RotateCcw className="text-purple-400" size={48} />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>

                {/* Content */}
                {!isInitialized ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse">
                            <RotateCcw className="text-purple-400 mx-auto animate-spin mb-4" size={32} />
                        </div>
                        <p className="text-gray-400">Initializing motion sensors...</p>
                    </div>
                ) : !isSupported || error ? (
                    <div className="text-center space-y-4">
                        {/* Error Display */}
                        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                            <p className="text-red-300 text-sm">
                                {error || "Motion sensors not available"}
                            </p>
                        </div>

                        {/* Fallback Message */}
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-300 text-xs text-center">
                                Gyroscope verification is required for continued access. Your account will be blocked if verification cannot be completed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Timer */}
                        <div className="flex items-center justify-center space-x-2 text-sm">
                            <Clock className="text-orange-400" size={16} />
                            <span className={`font-bold ${timeRemaining < 15000 ? "text-red-400" : "text-orange-400"
                                }`}>
                                {formatTime(timeRemaining)}
                            </span>
                            <span className="text-gray-500">remaining</span>
                        </div>

                        {/* Verification Steps */}
                        <div className="space-y-4">
                            {verificationSteps.map((step, index) => (
                                <div
                                    key={index}
                                    className={`border rounded-lg p-4 transition-all duration-300 ${index === currentStep
                                            ? "border-purple-500 bg-purple-500/10"
                                            : stepCompleted[index]
                                                ? "border-green-500 bg-green-500/10"
                                                : "border-gray-600 bg-gray-800"
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${stepCompleted[index]
                                                ? "bg-green-500 text-white"
                                                : index === currentStep
                                                    ? "bg-purple-500 text-white"
                                                    : "bg-gray-600 text-gray-300"
                                            }`}>
                                            {stepCompleted[index] ? (
                                                <CheckCircle size={16} />
                                            ) : (
                                                <span>{step.icon}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm ${index === currentStep ? "text-white font-medium" : "text-gray-400"
                                                }`}>
                                                Step {index + 1}: {step.instruction}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Start/Status */}
                        {!isVerifying ? (
                            <button
                                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                                onClick={startVerification}
                            >
                                <RotateCcw size={20} />
                                <span>Start Verification</span>
                            </button>
                        ) : (
                            <div className="flex items-center justify-center space-x-2 p-3 bg-purple-500/20 border border-purple-500/40 rounded-lg">
                                <RotateCcw className="animate-spin text-purple-400" size={16} />
                                <p className="text-purple-300 text-sm">
                                    Step {currentStep + 1} of {verificationSteps.length} - Follow the instructions above
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Critical Warning Message */}
                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-xs text-center">
                        <strong>Critical Security Check:</strong> Gyroscope verification is required due to very low trust score. Account will be permanently blocked if verification fails.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GyroscopeModal;