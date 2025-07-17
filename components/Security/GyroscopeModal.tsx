// src/components/Security/GyroscopeModal.tsx - Упрощенная реализация только с браузерным API

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

const GyroscopeModal: React.FC<GyroscopeModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const [timeRemaining, setTimeRemaining] = useState(15000);
    const [progress, setProgress] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Refs для хранения данных между рендерами
    const lastOrientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
    const motionDataRef = useRef<number[]>([]);
    const startTimeRef = useRef<number>(0);
    const isFirstReadingRef = useRef(true);

    const VERIFICATION_TIMEOUT = 15000;
    const MOTION_THRESHOLD = 5;
    const REQUIRED_MOTION_TOTAL = 200;
    const MIN_SAMPLES = 10;

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
        lastOrientationRef.current = { alpha: 0, beta: 0, gamma: 0 };
        motionDataRef.current = [];
        startTimeRef.current = 0;
        isFirstReadingRef.current = true;
    };

    const cleanup = () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
    };

    const checkSupport = async () => {
        if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
            setError("Device orientation is not supported on this device");
            return;
        }

        // Проверяем, нужно ли разрешение (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission !== 'granted') {
                    setError("Permission to access device orientation was denied");
                    return;
                }
            } catch (err) {
                setError("Failed to request device orientation permission");
                return;
            }
        }

        setIsSupported(true);
    };

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        if (!isVerifying || isCompleted || isProcessing) return;

        const alpha = event.alpha || 0;
        const beta = event.beta || 0;
        const gamma = event.gamma || 0;

        // Пропускаем первое чтение для установки базовых значений
        if (isFirstReadingRef.current) {
            lastOrientationRef.current = { alpha, beta, gamma };
            isFirstReadingRef.current = false;
            return;
        }

        // Вычисляем изменения в ориентации
        const lastOrientation = lastOrientationRef.current;
        const deltaAlpha = Math.abs(alpha - lastOrientation.alpha);
        const deltaBeta = Math.abs(beta - lastOrientation.beta);
        const deltaGamma = Math.abs(gamma - lastOrientation.gamma);

        // Общее движение
        const totalMotion = deltaAlpha + deltaBeta + deltaGamma;

        // Фиксируем значимое движение
        if (totalMotion > MOTION_THRESHOLD) {
            motionDataRef.current.push(totalMotion);

            // Ограничиваем массив последними 50 значениями
            if (motionDataRef.current.length > 50) {
                motionDataRef.current = motionDataRef.current.slice(-50);
            }

            // Обновляем интенсивность (среднее значение последних 10 измерений)
            const recentMotions = motionDataRef.current.slice(-10);
            const avgIntensity = recentMotions.reduce((sum, val) => sum + val, 0) / recentMotions.length;
            setMotionIntensity(avgIntensity);

            console.log(`Motion detected: ${totalMotion.toFixed(1)}°, samples: ${motionDataRef.current.length}`);
        }

        // Обновляем последние значения
        lastOrientationRef.current = { alpha, beta, gamma };

        // Вычисляем прогресс
        const totalAccumulatedMotion = motionDataRef.current.reduce((sum, val) => sum + val, 0);
        const sampleProgress = Math.min((motionDataRef.current.length / MIN_SAMPLES) * 100, 100);
        const motionProgress = Math.min((totalAccumulatedMotion / REQUIRED_MOTION_TOTAL) * 100, 100);

        // Общий прогресс как среднее арифметическое
        const currentProgress = (sampleProgress + motionProgress) / 2;
        setProgress(currentProgress);

        // Проверяем завершение
        if (currentProgress >= 100 && motionDataRef.current.length >= MIN_SAMPLES) {
            completeVerification(true);
        }
    }, [isVerifying, isCompleted, isProcessing]);

    const startVerification = () => {
        if (!isSupported || isVerifying) return;

        console.log("Starting gyroscope verification");
        setIsVerifying(true);
        setIsStarted(true);
        setError(null);
        startTimeRef.current = Date.now();

        // Добавляем слушатель событий
        window.addEventListener('deviceorientation', handleOrientation);
    };

    const completeVerification = async (success: boolean) => {
        if (isProcessing || isCompleted) return;

        console.log(`Completing verification with result: ${success}`);
        setIsCompleted(true);
        setIsProcessing(true);

        // Останавливаем слушатель
        cleanup();

        try {
            const completedInTime = (Date.now() - startTimeRef.current) < VERIFICATION_TIMEOUT;
            const result = await validateSecureGyroscope(success, completedInTime, true);

            if (result.success && success) {
                onSuccess();
            } else {
                onFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            onFailure();
        }
    };

    // Таймер обратного отсчета
    useEffect(() => {
        if (!isVerifying || isCompleted) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 100;
                if (newTime <= 0) {
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
                                <span className={`font-bold ${timeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}>
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
                                            transform: `rotate(${motionIntensity * 10}deg)`
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
                                    <span className="text-purple-400">{motionDataRef.current.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Intensity:</span>
                                    <span className="text-orange-400">{motionIntensity.toFixed(1)}°</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Motion:</span>
                                    <span className="text-green-400">
                                        {motionDataRef.current.reduce((sum, val) => sum + val, 0).toFixed(1)}°
                                    </span>
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