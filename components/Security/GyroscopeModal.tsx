// src/components/Security/GyroscopeModal.tsx - Исправленная реализация с рабочим гироскопом

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

interface MotionSample {
    timestamp: number;
    motion: number;
    alpha: number;
    beta: number;
    gamma: number;
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
    const [motionHistory, setMotionHistory] = useState<MotionSample[]>([]);
    const [lastMotionUpdate, setLastMotionUpdate] = useState(0);
    const [motionDetected, setMotionDetected] = useState(false);
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [verificationCompleted, setVerificationCompleted] = useState(false);

    const verificationTimeout = 15000;
    const requiredMotionEvents = 15;
    const motionThreshold = 8; // Порог для значимого движения

    useEffect(() => {
        if (!isOpen) {
            resetState();
            return;
        }

        initializeMotionDetection();
    }, [isOpen]);

    useEffect(() => {
        return () => {
            cleanupMotionDetection();
        };
    }, []);

    const resetState = () => {
        setCurrentPhase("initializing");
        setVerificationTimeRemaining(15000);
        setVerificationProgress(0);
        setIsVerifying(false);
        setError(null);
        setAttemptMade(false);
        setVerificationTimerActive(false);
        setIsGyroscopeSupported(true);
        setMotionHistory([]);
        setLastMotionUpdate(0);
        setMotionDetected(false);
        setMotionIntensity(0);
        setVerificationCompleted(false);
        cleanupMotionDetection();
    };

    const cleanupMotionDetection = () => {
        try {
            if (typeof window !== 'undefined') {
                window.removeEventListener('deviceorientation', handleBrowserMotion);
            }
        } catch (error) {
            console.warn("Error during cleanup:", error);
        }
    };

    const initializeMotionDetection = async () => {
        console.log("Initializing motion detection");

        if (typeof window === "undefined") {
            setError("Motion detection is not available in this environment");
            setCurrentPhase("unsupported");
            setIsGyroscopeSupported(false);
            return;
        }

        // Проверяем поддержку DeviceOrientationEvent
        if (typeof DeviceOrientationEvent !== 'undefined') {
            console.log("Browser DeviceOrientationEvent available");

            // Проверяем, нужно ли разрешение (iOS 13+)
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                console.log("Permission required for device orientation");
                setCurrentPhase("instructions");
                return;
            } else {
                // Разрешение не требуется, переходим к инструкциям
                setCurrentPhase("instructions");
                return;
            }
        }

        // Нет поддержки детекции движения
        console.log("No motion detection API available");
        setError("Motion detection is not supported on this device or platform");
        setCurrentPhase("unsupported");
        setIsGyroscopeSupported(false);
    };

    // Таймер верификации
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
        console.log("Motion verification timeout");
        setVerificationTimerActive(false);
        setIsVerifying(false);
        cleanupMotionDetection();

        if (!attemptMade) {
            setError("Verification timeout. Please move your device more actively.");
            setAttemptMade(true);
            setCurrentPhase("error");
            setTimeout(() => {
                handleGyroscopeFailure();
            }, 2000);
        }
    }, [attemptMade]);

    // Обработчик движения устройства (основная логика из рабочего файла)
    const handleBrowserMotion = useCallback((event: DeviceOrientationEvent) => {
        if (!isVerifying || verificationCompleted) return;

        const now = Date.now();
        const timeDiff = now - lastMotionUpdate;

        if (timeDiff < 100) return; // Ограничиваем частоту обработки

        const alpha = event.alpha || 0;
        const beta = event.beta || 0;
        const gamma = event.gamma || 0;

        // Если это первое чтение, просто сохраняем значения
        if (motionHistory.length === 0) {
            const initialSample: MotionSample = {
                timestamp: now,
                motion: 0,
                alpha,
                beta,
                gamma
            };
            setMotionHistory([initialSample]);
            setLastMotionUpdate(now);
            return;
        }

        // Получаем последний образец для сравнения
        const lastSample = motionHistory[motionHistory.length - 1];

        // Вычисляем разность углов
        const deltaAlpha = Math.abs(alpha - lastSample.alpha);
        const deltaBeta = Math.abs(beta - lastSample.beta);
        const deltaGamma = Math.abs(gamma - lastSample.gamma);

        // Общее движение
        const motion = deltaAlpha + deltaBeta + deltaGamma;

        if (motion > motionThreshold) {
            const motionData: MotionSample = {
                timestamp: now,
                motion,
                alpha,
                beta,
                gamma,
            };

            setMotionHistory(prev => {
                const newHistory = [...prev, motionData];
                // Оставляем только последние 30 образцов
                return newHistory.slice(-30);
            });

            setLastMotionUpdate(now);

            // Обновляем интенсивность движения
            const recentSamples = motionHistory.slice(-10);
            const totalIntensity = recentSamples.reduce((sum, sample) => sum + sample.motion, 0);
            setMotionIntensity(totalIntensity);

            console.log("Motion detected:", {
                motion: motion.toFixed(2),
                alpha: alpha.toFixed(1),
                beta: beta.toFixed(1),
                gamma: gamma.toFixed(1),
                totalSamples: motionHistory.length,
                intensity: totalIntensity.toFixed(1)
            });
        }

        setLastMotionUpdate(now);
    }, [isVerifying, motionHistory, lastMotionUpdate, verificationCompleted]);

    const requestBrowserPermission = async (): Promise<boolean> => {
        if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
            return true; // Разрешение не нужно
        }

        try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error("Error requesting device orientation permission:", error);
            return false;
        }
    };

    const startVerification = useCallback(async () => {
        if (isVerifying || attemptMade || !isGyroscopeSupported) {
            return;
        }

        console.log("Starting motion verification with browser API");

        setIsVerifying(true);
        setAttemptMade(true);
        setCurrentPhase("verification");
        setVerificationTimeRemaining(verificationTimeout);
        setVerificationTimerActive(true);
        setMotionHistory([]);
        setVerificationProgress(0);
        setMotionDetected(false);
        setMotionIntensity(0);
        setError(null);

        // Запрашиваем разрешение, если нужно
        const granted = await requestBrowserPermission();
        if (!granted) {
            setError("Device orientation permission denied");
            setCurrentPhase("error");
            setTimeout(() => {
                handleGyroscopeFailure();
            }, 2000);
            return;
        }

        // Добавляем слушатель событий ориентации устройства
        window.addEventListener('deviceorientation', handleBrowserMotion);
        console.log("Device orientation listener added");
    }, [isVerifying, attemptMade, isGyroscopeSupported, handleBrowserMotion]);

    // Отслеживание прогресса верификации
    useEffect(() => {
        if (!isVerifying || verificationCompleted) return;

        const progress = calculateMotionProgress();
        setVerificationProgress(progress);

        if (progress >= 100 && !motionDetected) {
            console.log("Motion verification complete!");
            setMotionDetected(true);
            setVerificationCompleted(true);
            handleVerificationSuccess();
        }
    }, [motionHistory, isVerifying, motionDetected, verificationCompleted]);

    const calculateMotionProgress = (): number => {
        if (motionHistory.length < 3) return 0;

        // Берем только значимые движения
        const significantMotions = motionHistory.filter(sample => sample.motion > motionThreshold);

        if (significantMotions.length === 0) return 0;

        // Вычисляем различные метрики
        const motionValues = significantMotions.map(d => d.motion);
        const maxMotion = Math.max(...motionValues);
        const avgMotion = motionValues.reduce((sum, val) => sum + val, 0) / motionValues.length;

        // Оценка интенсивности движения (0-100)
        const motionScore = Math.min((maxMotion / 50) * 100, 100);

        // Оценка количества событий (0-100)  
        const eventScore = Math.min((significantMotions.length / requiredMotionEvents) * 100, 100);

        // Оценка разнообразия движений
        const alphaRange = Math.max(...significantMotions.map(s => s.alpha)) - Math.min(...significantMotions.map(s => s.alpha));
        const betaRange = Math.max(...significantMotions.map(s => s.beta)) - Math.min(...significantMotions.map(s => s.beta));
        const gammaRange = Math.max(...significantMotions.map(s => s.gamma)) - Math.min(...significantMotions.map(s => s.gamma));
        const diversityScore = Math.min(((alphaRange + betaRange + gammaRange) / 180) * 100, 100);

        // Оценка продолжительности
        const timeSpan = significantMotions.length > 0 ?
            significantMotions[significantMotions.length - 1].timestamp - significantMotions[0].timestamp : 0;
        const timeScore = Math.min((timeSpan / 3000) * 100, 100);

        // Общий балл
        const totalScore = (motionScore * 0.4) + (eventScore * 0.3) + (diversityScore * 0.2) + (timeScore * 0.1);

        return Math.min(totalScore, 100);
    };

    const handleVerificationSuccess = useCallback(async () => {
        console.log("Motion verification successful");
        setVerificationTimerActive(false);
        setIsVerifying(false);
        cleanupMotionDetection();

        try {
            const result = await validateSecureGyroscope(true, true, isGyroscopeSupported);
            if (result.success) {
                onSuccess();
            } else {
                handleGyroscopeFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            handleGyroscopeFailure();
        }
    }, [isGyroscopeSupported, onSuccess]);

    const handleGyroscopeFailure = useCallback(async () => {
        console.log("Handling motion verification failure");
        cleanupMotionDetection();

        try {
            await validateSecureGyroscope(false, false, isGyroscopeSupported);
        } catch (error) {
            console.error("Error sending gyroscope failure to API:", error);
        }

        onFailure();
    }, [isGyroscopeSupported, onFailure]);

    const handleUnsupportedDevice = useCallback(() => {
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
                        <p className="text-gray-400">Initializing motion detection...</p>
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
                            <h3 className="text-white font-semibold mb-2">Device Motion Required</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You need to rotate your device to verify you are human
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <RotateCw className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-blue-300 font-semibold mb-1 text-sm">Detection Method</h4>
                                    <p className="text-blue-200 text-xs">
                                        Using Browser DeviceOrientation for motion detection
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <h4 className="text-purple-300 font-semibold mb-2 text-sm">Instructions:</h4>
                            <div className="text-purple-200 text-sm space-y-1">
                                <p>1. Hold your device firmly</p>
                                <p>2. Rotate and twist your device</p>
                                <p>3. Try different directions</p>
                                <p>4. Continue until progress reaches 100%</p>
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
                                <Compass
                                    className={`text-purple-400 mx-auto transition-transform duration-300 ${motionIntensity > 50 ? 'animate-spin' : ''
                                        }`}
                                    size={32}
                                    style={{
                                        transform: `rotate(${motionIntensity * 2}deg)`
                                    }}
                                />
                            </div>
                            <h3 className="text-white font-semibold mb-1">
                                {motionDetected ? "Motion Verified!" : "Keep Moving Your Device"}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {motionDetected
                                    ? "Verification completed successfully"
                                    : "Rotate and twist your device in different directions"
                                }
                            </p>
                        </div>

                        {/* Status indicators */}
                        <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">API Type:</span>
                                <span className="text-blue-400">Browser DeviceOrientation</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Motion Events:</span>
                                <span className="text-purple-400">{motionHistory.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Intensity:</span>
                                <span className="text-orange-400">{motionIntensity.toFixed(1)}</span>
                            </div>
                            {motionHistory.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Last Motion:</span>
                                    <span className="text-green-400">
                                        {motionHistory[motionHistory.length - 1]?.motion.toFixed(1)}°
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
                    </div>
                ) : null}

                {/* Warning Message */}
                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-xs text-center">
                        Motion verification required due to extremely low trust score. Your account will be blocked for 2 hours if verification fails.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GyroscopeModal;