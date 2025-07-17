// src/components/Security/GyroscopeModal.tsx - Реализация на основе рабочего кода

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Compass,
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
    const [timeRemaining, setTimeRemaining] = useState(10000);
    const [progress, setProgress] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [motionSamples, setMotionSamples] = useState<MotionSample[]>([]);

    // Refs для данных движения (как в рабочем файле)
    const lastTimeRef = useRef<number>(Date.now());
    const lastAlphaRef = useRef<number>(0);
    const lastBetaRef = useRef<number>(0);
    const lastGammaRef = useRef<number>(0);
    const totalMotionRef = useRef<number>(0);
    const motionSamplesLocalRef = useRef<MotionSample[]>([]);
    const isFirstReadingRef = useRef<boolean>(true);
    const startTimeRef = useRef<number>(0);

    const VERIFICATION_TIMEOUT = 10000; // 10 секунд как в рабочем файле
    const MOTION_THRESHOLD = 1; // ПОНИЖЕН для отладки (было 8)
    const REQUIRED_MOTION = 50; // ПОНИЖЕН для отладки (было 300) 
    const MIN_SAMPLES = 5; // ПОНИЖЕН для отладки (было 15)

    // Сброс состояния при открытии/закрытии модала
    useEffect(() => {
        if (isOpen) {
            resetState();
            checkSupport();
        } else {
            cleanup();
        }
    }, [isOpen]);

    const resetState = () => {
        setTimeRemaining(VERIFICATION_TIMEOUT);
        setProgress(0);
        setIsVerifying(false);
        setError(null);
        setIsSupported(false);
        setIsStarted(false);
        setMotionIntensity(0);
        setIsCompleted(false);
        setIsProcessing(false);
        setMotionSamples([]);

        // Сброс refs
        lastTimeRef.current = Date.now();
        lastAlphaRef.current = 0;
        lastBetaRef.current = 0;
        lastGammaRef.current = 0;
        totalMotionRef.current = 0;
        motionSamplesLocalRef.current = [];
        isFirstReadingRef.current = true;
        startTimeRef.current = 0;
    };

    const cleanup = () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
    };

    const checkSupport = async () => {
        console.log("Checking gyroscope support...");

        if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
            console.log("DeviceOrientationEvent not available");
            setError("Device orientation is not supported on this device");
            return;
        }

        // Проверяем, нужно ли разрешение (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            console.log("Requesting device orientation permission...");
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                console.log("Permission result:", permission);
                if (permission !== 'granted') {
                    setError("Permission to access device orientation was denied");
                    return;
                }
            } catch (err) {
                console.error("Permission request failed:", err);
                setError("Failed to request device orientation permission");
                return;
            }
        }

        console.log("Gyroscope support confirmed");
        setIsSupported(true);
    };

    // Обработчик ориентации устройства с расширенным логированием
    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        console.log("🔄 DeviceOrientation event received", {
            isVerifying,
            isCompleted,
            isProcessing,
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
        });

        if (!isVerifying || isCompleted || isProcessing) {
            console.log("❌ Event ignored due to state");
            return;
        }

        const now = Date.now();
        const timeDiff = now - lastTimeRef.current;

        console.log("⏰ Time check:", { timeDiff, threshold: 100 });

        // Убираем ограничение частоты для отладки
        // if (timeDiff < 100) return;

        const alpha = event.alpha || 0;
        const beta = event.beta || 0;
        const gamma = event.gamma || 0;

        console.log("📐 Current orientation:", { alpha, beta, gamma });

        // Первое чтение - устанавливаем базовые значения
        if (isFirstReadingRef.current) {
            lastAlphaRef.current = alpha;
            lastBetaRef.current = beta;
            lastGammaRef.current = gamma;
            lastTimeRef.current = now;
            isFirstReadingRef.current = false;
            console.log("✅ First reading set:", { alpha, beta, gamma });
            return;
        }

        // Вычисляем изменения
        const deltaAlpha = Math.abs(alpha - lastAlphaRef.current);
        const deltaBeta = Math.abs(beta - lastBetaRef.current);
        const deltaGamma = Math.abs(gamma - lastGammaRef.current);
        const motion = deltaAlpha + deltaBeta + deltaGamma;

        console.log("📊 Motion calculation:", {
            deltaAlpha: deltaAlpha.toFixed(2),
            deltaBeta: deltaBeta.toFixed(2),
            deltaGamma: deltaGamma.toFixed(2),
            totalMotion: motion.toFixed(2),
            threshold: MOTION_THRESHOLD
        });

        // Фиксируем любое движение больше 0 для отладки
        if (motion > MOTION_THRESHOLD) {
            const sample: MotionSample = {
                timestamp: now,
                motion,
                alpha,
                beta,
                gamma
            };

            motionSamplesLocalRef.current.push(sample);

            // Ограничиваем количество образцов
            if (motionSamplesLocalRef.current.length > 30) {
                motionSamplesLocalRef.current = motionSamplesLocalRef.current.slice(-30);
            }

            // Обновляем состояние для UI
            setMotionSamples([...motionSamplesLocalRef.current]);

            // Пересчитываем общее движение
            totalMotionRef.current = motionSamplesLocalRef.current.reduce((sum, sample) => sum + sample.motion, 0);

            console.log("🎯 Motion detected and recorded:", {
                motion: motion.toFixed(2),
                samples: motionSamplesLocalRef.current.length,
                totalMotion: totalMotionRef.current.toFixed(1),
                requiredMotion: REQUIRED_MOTION,
                minSamples: MIN_SAMPLES
            });
        } else {
            console.log("📉 Motion below threshold:", motion.toFixed(2));
        }

        // Обновляем интенсивность для UI
        setMotionIntensity(totalMotionRef.current);

        // Проверяем условия завершения
        if (totalMotionRef.current > REQUIRED_MOTION && motionSamplesLocalRef.current.length >= MIN_SAMPLES && !isCompleted) {
            console.log("🏆 Motion verification requirements met!");
            completeVerification(true);
        }

        // Обновляем последние значения
        lastTimeRef.current = now;
        lastAlphaRef.current = alpha;
        lastBetaRef.current = beta;
        lastGammaRef.current = gamma;
    }, [isVerifying, isCompleted, isProcessing]);

    const startVerification = () => {
        if (!isSupported || isVerifying) return;

        console.log("Starting gyroscope verification");
        setIsVerifying(true);
        setIsStarted(true);
        setError(null);
        startTimeRef.current = Date.now();

        // Сброс данных для новой попытки
        isFirstReadingRef.current = true;
        totalMotionRef.current = 0;
        motionSamplesLocalRef.current = [];

        // Добавляем слушатель событий
        window.addEventListener('deviceorientation', handleOrientation);
        console.log("Device orientation listener added");
    };

    const completeVerification = async (success: boolean) => {
        if (isProcessing || isCompleted) return;

        console.log(`Completing verification with result: ${success}`);
        setIsCompleted(true);
        setIsProcessing(true);

        // Останавливаем слушатель
        cleanup();

        try {
            const verificationDuration = Date.now() - startTimeRef.current;
            const completedInTime = verificationDuration < VERIFICATION_TIMEOUT;

            // Дополнительные проверки безопасности (как в рабочем файле)
            if (success && verificationDuration < 3000) {
                console.warn('Gyroscope verification too fast - potential manipulation');
                success = false;
            }

            if (success && motionSamplesLocalRef.current.length < MIN_SAMPLES) {
                console.warn('Insufficient motion samples - potential manipulation');
                success = false;
            }

            const result = await validateSecureGyroscope(success, completedInTime, true);

            if (result.success && success) {
                console.log('Gyroscope verification successful');
                onSuccess();
            } else {
                console.log('Gyroscope verification failed');
                onFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            onFailure();
        }
    };

    // Вычисление прогресса
    const calculateProgress = () => {
        const motionProgress = Math.min((totalMotionRef.current / REQUIRED_MOTION) * 100, 100);
        const samplesProgress = Math.min((motionSamplesLocalRef.current.length / MIN_SAMPLES) * 100, 100);
        return (motionProgress + samplesProgress) / 2;
    };

    // Обновление прогресса
    useEffect(() => {
        if (isVerifying && !isCompleted) {
            const currentProgress = calculateProgress();
            setProgress(currentProgress);
        }
    }, [motionSamples, isVerifying, isCompleted]);

    // Таймер обратного отсчета
    useEffect(() => {
        if (!isVerifying || isCompleted) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 100;
                if (newTime <= 0) {
                    console.log("Verification timeout");
                    completeVerification(false);
                    return 0;
                }
                return newTime;
            });
        }, 100);

        return () => clearInterval(timer);
    }, [isVerifying, isCompleted]);

    // Cleanup при размонтировании
    useEffect(() => {
        return cleanup;
    }, []);

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
                            {error ? (
                                <XCircle className="text-red-400" size={48} />
                            ) : isCompleted ? (
                                <CheckCircle2 className="text-green-400" size={48} />
                            ) : (
                                <Compass className="text-purple-400" size={48} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Gyroscope Verification Required</h2>
                    <p className="text-gray-400 text-sm">
                        Your trust score is extremely low. Please move your device to verify you are human.
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {error ? (
                        // Error state
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
                                onClick={() => onFailure()}
                            >
                                <Shield size={16} />
                                <span>I Understand</span>
                            </button>
                        </div>
                    ) : !isStarted ? (
                        // Initial state
                        <div className="text-center space-y-6">
                            <div className="mb-4">
                                <Smartphone className="text-purple-400 mx-auto" size={48} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">Device Motion Required</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                You need to rotate and move your device to verify you are human
                            </p>

                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <h4 className="text-purple-300 font-semibold mb-2 text-sm">Instructions:</h4>
                                <div className="text-purple-200 text-sm space-y-1">
                                    <p>1. Hold your device firmly</p>
                                    <p>2. Rotate and twist your device slowly</p>
                                    <p>3. Try different directions (up, down, left, right)</p>
                                    <p>4. Continue until progress reaches 100%</p>
                                </div>
                            </div>

                            {isSupported ? (
                                <button
                                    className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
                                    onClick={startVerification}
                                >
                                    <Compass size={20} />
                                    <span>Start Verification</span>
                                </button>
                            ) : (
                                <div className="text-center">
                                    <div className="animate-pulse">
                                        <Compass className="text-purple-400 mx-auto mb-2" size={32} />
                                    </div>
                                    <p className="text-gray-400 text-sm">Checking device support...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Verification state
                        <div className="space-y-6">
                            {/* Timer */}
                            <div className="flex items-center justify-center space-x-2 text-sm">
                                <Clock className="text-orange-400" size={16} />
                                <span className={`font-bold ${timeRemaining < 3000 ? "text-red-400" : "text-orange-400"}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                                <span className="text-gray-500">remaining</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Verification Progress</span>
                                    <span className="text-purple-400 font-bold">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Motion Visualization */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
                                <div className="mb-3">
                                    <Compass
                                        className="text-purple-400 mx-auto transition-transform duration-300"
                                        size={48}
                                        style={{
                                            transform: `rotate(${(motionIntensity / 10)}deg)`
                                        }}
                                    />
                                </div>
                                <h3 className="text-white font-semibold mb-1">
                                    {isCompleted ? "Motion Verified!" : "Keep Moving Your Device"}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    {isCompleted
                                        ? "Verification completed successfully"
                                        : "Rotate and twist your device in different directions"
                                    }
                                </p>
                            </div>

                            {/* Status indicators */}
                            <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Motion Samples:</span>
                                    <span className="text-purple-400">{motionSamples.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Intensity:</span>
                                    <span className="text-orange-400">{(motionIntensity / 10).toFixed(1)}°</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Motion:</span>
                                    <span className="text-green-400">{motionIntensity.toFixed(1)}°</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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