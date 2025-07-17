// src/components/Security/GyroscopeModal.tsx - Альтернативная реализация с fallback

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
    const [motionHistory, setMotionHistory] = useState<MotionData[]>([]);
    const [lastMotionUpdate, setLastMotionUpdate] = useState(0);
    const [motionApiType, setMotionApiType] = useState<'telegram' | 'browser' | 'none'>('none');
    const [sensorStarted, setSensorStarted] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const verificationTimeout = 15000;
    const requiredMotionEvents = 15;
    const motionThreshold = 0.5; // Threshold for significant motion

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
        setMotionApiType('none');
        setSensorStarted(false);
        setPermissionGranted(false);
        cleanupMotionDetection();
    };

    const cleanupMotionDetection = () => {
        try {
            // Cleanup Telegram API
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.offEvent?.('gyroscope_started', handleTelegramGyroscopeStarted);
                tg.offEvent?.('gyroscope_failed', handleTelegramGyroscopeFailed);
                tg.offEvent?.('gyroscope_changed', handleTelegramGyroscopeChanged);
                tg.offEvent?.('gyroscope_stopped', handleTelegramGyroscopeStopped);
                
                if (tg.Gyroscope?.isStarted) {
                    tg.Gyroscope.stop();
                }
            }

            // Cleanup browser API
            if (typeof window !== 'undefined') {
                window.removeEventListener('devicemotion', handleBrowserMotion);
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

        // Try Telegram Gyroscope API first
        const tg = window.Telegram?.WebApp;
        if (tg?.Gyroscope) {
            console.log("Telegram Gyroscope API available");
            setMotionApiType('telegram');
            setCurrentPhase("instructions");
            return;
        }

        // Fallback to browser DeviceMotionEvent
        if (typeof DeviceMotionEvent !== 'undefined') {
            console.log("Browser DeviceMotionEvent available");
            
            // Check if permission is required (iOS 13+)
            if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                console.log("Permission required for device motion");
                setMotionApiType('browser');
                setCurrentPhase("instructions");
                return;
            } else {
                // No permission required, proceed directly
                setMotionApiType('browser');
                setPermissionGranted(true);
                setCurrentPhase("instructions");
                return;
            }
        }

        // No motion detection available
        console.log("No motion detection API available");
        setError("Motion detection is not supported on this device or platform");
        setCurrentPhase("unsupported");
        setIsGyroscopeSupported(false);
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

    // Telegram API handlers
    const handleTelegramGyroscopeStarted = useCallback(() => {
        console.log("Telegram Gyroscope started");
        setSensorStarted(true);
    }, []);

    const handleTelegramGyroscopeFailed = useCallback((params: any) => {
        console.log("Telegram Gyroscope failed:", params);
        setError(`Gyroscope failed: ${params?.error || 'UNSUPPORTED'}`);
        setCurrentPhase("error");
        setTimeout(() => {
            handleGyroscopeFailure();
        }, 2000);
    }, []);

    const handleTelegramGyroscopeChanged = useCallback((data: { x: number; y: number; z: number }) => {
        const now = Date.now();
        const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        
        if (magnitude > motionThreshold) {
            const motionData: MotionData = {
                x: data.x,
                y: data.y,
                z: data.z,
                timestamp: now,
            };
            processMotionData(motionData);
        }
    }, [motionThreshold]);

    const handleTelegramGyroscopeStopped = useCallback(() => {
        console.log("Telegram Gyroscope stopped");
        setSensorStarted(false);
    }, []);

    // Browser API handler
    const handleBrowserMotion = useCallback((event: DeviceMotionEvent) => {
        if (!isVerifying) return;

        const rotationRate = event.rotationRate;
        if (!rotationRate) return;

        const x = rotationRate.alpha || 0;
        const y = rotationRate.beta || 0;
        const z = rotationRate.gamma || 0;
        
        // Convert from degrees/s to rad/s to match Telegram API
        const xRad = (x * Math.PI) / 180;
        const yRad = (y * Math.PI) / 180;
        const zRad = (z * Math.PI) / 180;
        
        const magnitude = Math.sqrt(xRad * xRad + yRad * yRad + zRad * zRad);
        
        if (magnitude > motionThreshold) {
            const motionData: MotionData = {
                x: xRad,
                y: yRad,
                z: zRad,
                timestamp: Date.now(),
            };
            processMotionData(motionData);
        }
    }, [isVerifying, motionThreshold]);

    const processMotionData = useCallback((motionData: MotionData) => {
        setMotionHistory(prev => {
            const newHistory = [...prev, motionData];
            const recentHistory = newHistory.filter(item => 
                motionData.timestamp - item.timestamp < 8000
            );

            const progress = calculateMotionProgress(recentHistory);
            setVerificationProgress(progress);

            console.log("Motion detected:", {
                x: motionData.x.toFixed(3),
                y: motionData.y.toFixed(3),
                z: motionData.z.toFixed(3),
                progress: progress.toFixed(1),
                historyLength: recentHistory.length
            });

            if (progress >= 100 && isVerifying) {
                console.log("Motion verification complete!");
                handleVerificationSuccess();
            }

            return recentHistory;
        });

        setLastMotionUpdate(motionData.timestamp);
    }, [isVerifying]);

    const requestBrowserPermission = async (): Promise<boolean> => {
        if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
            return true; // No permission needed
        }

        try {
            const permission = await (DeviceMotionEvent as any).requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error("Error requesting device motion permission:", error);
            return false;
        }
    };

    const startVerification = useCallback(async () => {
        if (isVerifying || attemptMade || !isGyroscopeSupported) {
            return;
        }

        console.log("Starting motion verification with API:", motionApiType);
        
        setIsVerifying(true);
        setAttemptMade(true);
        setCurrentPhase("verification");
        setVerificationTimeRemaining(verificationTimeout);
        setVerificationTimerActive(true);
        setMotionHistory([]);
        setVerificationProgress(0);
        setError(null);

        if (motionApiType === 'telegram') {
            // Use Telegram API
            const tg = window.Telegram?.WebApp;
            if (tg?.Gyroscope) {
                tg.onEvent('gyroscope_started', handleTelegramGyroscopeStarted);
                tg.onEvent('gyroscope_failed', handleTelegramGyroscopeFailed);
                tg.onEvent('gyroscope_changed', handleTelegramGyroscopeChanged);
                tg.onEvent('gyroscope_stopped', handleTelegramGyroscopeStopped);

                try {
                    tg.Gyroscope.start({ refresh_rate: 100 });
                    
                    // Set timeout to detect if Telegram API fails to start
                    setTimeout(() => {
                        if (!sensorStarted) {
                            console.log("Telegram API failed to start, falling back to browser API");
                            fallbackToBrowserAPI();
                        }
                    }, 2000);
                } catch (error) {
                    console.error("Error starting Telegram Gyroscope:", error);
                    fallbackToBrowserAPI();
                }
            }
        } else if (motionApiType === 'browser') {
            // Use browser API
            if (!permissionGranted) {
                const granted = await requestBrowserPermission();
                if (!granted) {
                    setError("Device motion permission denied");
                    setCurrentPhase("error");
                    setTimeout(() => {
                        handleGyroscopeFailure();
                    }, 2000);
                    return;
                }
                setPermissionGranted(true);
            }

            window.addEventListener('devicemotion', handleBrowserMotion);
            setSensorStarted(true);
        }
    }, [motionApiType, isVerifying, attemptMade, isGyroscopeSupported, permissionGranted]);

    const fallbackToBrowserAPI = async () => {
        console.log("Falling back to browser DeviceMotionEvent API");
        setMotionApiType('browser');
        
        if (!permissionGranted) {
            const granted = await requestBrowserPermission();
            if (!granted) {
                setError("Device motion permission denied");
                setCurrentPhase("error");
                setTimeout(() => {
                    handleGyroscopeFailure();
                }, 2000);
                return;
            }
            setPermissionGranted(true);
        }

        window.addEventListener('devicemotion', handleBrowserMotion);
        setSensorStarted(true);
    };

    const calculateMotionProgress = (history: MotionData[]): number => {
        if (history.length < 3) return 0;

        const xValues = history.map(d => Math.abs(d.x));
        const yValues = history.map(d => Math.abs(d.y));
        const zValues = history.map(d => Math.abs(d.z));

        const maxX = Math.max(...xValues);
        const maxY = Math.max(...yValues);
        const maxZ = Math.max(...zValues);

        const xScore = Math.min((maxX / 2.0) * 100, 100);
        const yScore = Math.min((maxY / 2.0) * 100, 100);
        const zScore = Math.min((maxZ / 2.0) * 100, 100);

        const motionScore = (xScore + yScore + zScore) / 3;
        const eventScore = Math.min((history.length / requiredMotionEvents) * 100, 100);

        const timeSpan = history.length > 0 ? 
            history[history.length - 1].timestamp - history[0].timestamp : 0;
        const timeScore = Math.min((timeSpan / 3000) * 100, 100);

        const totalScore = (motionScore * 0.5) + (eventScore * 0.3) + (timeScore * 0.2);
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

    const getApiDisplayName = () => {
        switch (motionApiType) {
            case 'telegram': return 'Telegram Gyroscope';
            case 'browser': return 'Browser DeviceMotion';
            default: return 'Unknown';
        }
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
                                        Using {getApiDisplayName()} for motion detection
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
                                <Compass className="text-purple-400 mx-auto animate-spin" size={32} />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Keep Moving Your Device</h3>
                            <p className="text-gray-400 text-sm">
                                Rotate and twist your device in different directions
                            </p>
                        </div>

                        {/* Status indicators */}
                        <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">API Type:</span>
                                <span className="text-blue-400">{getApiDisplayName()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sensor Status:</span>
                                <span className={sensorStarted ? "text-green-400" : "text-yellow-400"}>
                                    {sensorStarted ? "Active" : "Starting..."}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Motion Events:</span>
                                <span className="text-purple-400">{motionHistory.length}</span>
                            </div>
                            {motionHistory.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Last Motion:</span>
                                    <span className="text-orange-400">
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