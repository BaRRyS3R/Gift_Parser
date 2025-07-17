// src/components/Security/GyroscopeModal.tsx - Custom implementation with proper DeviceOrientationEvent handling

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

interface DeviceOrientationData {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
}

// Custom hook for device orientation
const useDeviceOrientation = () => {
    const [orientation, setOrientation] = useState<DeviceOrientationData>({
        alpha: null,
        beta: null,
        gamma: null,
        absolute: false
    });
    const [isSupported, setIsSupported] = useState(false);
    const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

    useEffect(() => {
        // Check if DeviceOrientationEvent is supported
        if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
            setIsSupported(true);
        }
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
            return false;
        }

        // Check if permission is needed (iOS 13+)
        if ('requestPermission' in (DeviceOrientationEvent as any)) {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                setPermissionState(permission === 'granted' ? 'granted' : 'denied');
                return permission === 'granted';
            } catch (error) {
                console.error('Permission request failed:', error);
                setPermissionState('denied');
                return false;
            }
        } else {
            // Permission not required on this device
            setPermissionState('granted');
            return true;
        }
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported || permissionState !== 'granted') {
            return () => {};
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma,
                absolute: event.absolute || false
            });
        };

        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [isSupported, permissionState]);

    return {
        orientation,
        isSupported,
        permissionState,
        requestPermission,
        startListening
    };
};

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
    const [isStarted, setIsStarted] = useState(false);
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [motionSamples, setMotionSamples] = useState<MotionSample[]>([]);

    // Use custom device orientation hook
    const { 
        orientation, 
        isSupported, 
        permissionState, 
        requestPermission, 
        startListening 
    } = useDeviceOrientation();

    // Refs for tracking previous values
    const lastOrientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
    const motionSamplesLocalRef = useRef<MotionSample[]>([]);
    const totalMotionRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const isFirstReadingRef = useRef<boolean>(true);
    const lastUpdateRef = useRef<number>(0);
    const cleanupRef = useRef<(() => void) | null>(null);

    const VERIFICATION_TIMEOUT = 10000;
    const MOTION_THRESHOLD = 3;
    const REQUIRED_MOTION = 150;
    const MIN_SAMPLES = 10;
    const UPDATE_THROTTLE = 100;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            resetState();
        } else {
            cleanup();
        }
    }, [isOpen]);

    const resetState = () => {
        setTimeRemaining(VERIFICATION_TIMEOUT);
        setProgress(0);
        setIsVerifying(false);
        setError(null);
        setIsStarted(false);
        setMotionIntensity(0);
        setIsCompleted(false);
        setIsProcessing(false);
        setMotionSamples([]);
        
        lastOrientationRef.current = { alpha: 0, beta: 0, gamma: 0 };
        motionSamplesLocalRef.current = [];
        totalMotionRef.current = 0;
        startTimeRef.current = 0;
        isFirstReadingRef.current = true;
        lastUpdateRef.current = 0;
    };

    const cleanup = () => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
    };

    // Handle orientation data changes
    useEffect(() => {
        if (!isVerifying || isCompleted || isProcessing) return;
        if (!orientation || orientation.alpha === null || orientation.beta === null || orientation.gamma === null) {
            return;
        }

        const now = Date.now();
        
        // Throttle updates
        if (now - lastUpdateRef.current < UPDATE_THROTTLE) return;
        lastUpdateRef.current = now;

        const { alpha, beta, gamma } = orientation;
        const currentAlpha = alpha || 0;
        const currentBeta = beta || 0;
        const currentGamma = gamma || 0;

        console.log("📐 Device orientation data:", {
            alpha: currentAlpha.toFixed(2),
            beta: currentBeta.toFixed(2),
            gamma: currentGamma.toFixed(2),
            absolute: orientation.absolute
        });

        // First reading - set baseline values
        if (isFirstReadingRef.current) {
            lastOrientationRef.current = {
                alpha: currentAlpha,
                beta: currentBeta,
                gamma: currentGamma
            };
            isFirstReadingRef.current = false;
            console.log("✅ First orientation reading set");
            return;
        }

        // Calculate changes in orientation
        const lastOrientation = lastOrientationRef.current;
        const deltaAlpha = Math.abs(currentAlpha - lastOrientation.alpha);
        const deltaBeta = Math.abs(currentBeta - lastOrientation.beta);
        const deltaGamma = Math.abs(currentGamma - lastOrientation.gamma);
        
        // Handle circular nature of angles (0-360 degrees)
        const normalizedDeltaAlpha = Math.min(deltaAlpha, 360 - deltaAlpha);
        const motion = normalizedDeltaAlpha + deltaBeta + deltaGamma;

        console.log("📊 Motion calculation:", {
            deltaAlpha: deltaAlpha.toFixed(2),
            deltaBeta: deltaBeta.toFixed(2),
            deltaGamma: deltaGamma.toFixed(2),
            normalizedDeltaAlpha: normalizedDeltaAlpha.toFixed(2),
            totalMotion: motion.toFixed(2),
            threshold: MOTION_THRESHOLD
        });

        // Record significant motion
        if (motion > MOTION_THRESHOLD) {
            const sample: MotionSample = {
                timestamp: now,
                motion,
                alpha: currentAlpha,
                beta: currentBeta,
                gamma: currentGamma
            };
            
            motionSamplesLocalRef.current.push(sample);
            
            // Limit number of samples
            if (motionSamplesLocalRef.current.length > 50) {
                motionSamplesLocalRef.current = motionSamplesLocalRef.current.slice(-50);
            }

            // Update UI state
            setMotionSamples([...motionSamplesLocalRef.current]);
            
            // Recalculate total motion
            totalMotionRef.current = motionSamplesLocalRef.current.reduce((sum, sample) => sum + sample.motion, 0);
            setMotionIntensity(totalMotionRef.current);

            console.log("🎯 Motion detected:", {
                motion: motion.toFixed(2),
                samples: motionSamplesLocalRef.current.length,
                totalMotion: totalMotionRef.current.toFixed(1),
                requiredMotion: REQUIRED_MOTION,
                minSamples: MIN_SAMPLES
            });

            // Check completion conditions
            if (totalMotionRef.current > REQUIRED_MOTION && motionSamplesLocalRef.current.length >= MIN_SAMPLES && !isCompleted) {
                console.log("🏆 Motion verification requirements met!");
                completeVerification(true);
            }
        } else {
            console.log("📉 Motion below threshold:", motion.toFixed(2));
        }

        // Update last values
        lastOrientationRef.current = {
            alpha: currentAlpha,
            beta: currentBeta,
            gamma: currentGamma
        };
    }, [orientation, isVerifying, isCompleted, isProcessing]);

    const startVerification = async () => {
        if (isVerifying) return;

        console.log("Starting gyroscope verification with custom hook");

        if (!isSupported) {
            setError("Device orientation is not supported on this device or browser");
            return;
        }
        
        // Request permission if necessary
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
            setError("Permission to access device orientation was denied");
            return;
        }

        setIsVerifying(true);
        setIsStarted(true);
        setError(null);
        startTimeRef.current = Date.now();

        // Reset data for new attempt
        isFirstReadingRef.current = true;
        totalMotionRef.current = 0;
        motionSamplesLocalRef.current = [];
        setMotionSamples([]);
        setMotionIntensity(0);
        lastUpdateRef.current = 0;

        // Start listening to orientation events
        const cleanup = startListening();
        cleanupRef.current = cleanup;

        console.log("Device motion verification started");
    };

    const completeVerification = async (success: boolean) => {
        if (isProcessing || isCompleted) return;

        console.log(`Completing verification with result: ${success}`);
        setIsCompleted(true);
        setIsProcessing(true);
        
        // Stop listening to events
        cleanup();

        try {
            const verificationDuration = Date.now() - startTimeRef.current;
            const completedInTime = verificationDuration < VERIFICATION_TIMEOUT;
            
            // Additional security checks
            if (success && verificationDuration < 3000) {
                console.warn('Verification completed too quickly - potential manipulation');
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

    // Calculate progress
    const calculateProgress = () => {
        const motionProgress = Math.min((totalMotionRef.current / REQUIRED_MOTION) * 100, 100);
        const samplesProgress = Math.min((motionSamplesLocalRef.current.length / MIN_SAMPLES) * 100, 100);
        return (motionProgress + samplesProgress) / 2;
    };

    // Update progress
    useEffect(() => {
        if (isVerifying && !isCompleted) {
            const currentProgress = calculateProgress();
            setProgress(currentProgress);
        }
    }, [motionSamples, isVerifying, isCompleted]);

    // Countdown timer
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

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, []);

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const getOrientationStatus = () => {
        if (!isSupported) return "Not Supported";
        if (permissionState === 'denied') return "Permission Denied";
        if (permissionState === 'granted' && orientation.alpha === null) return "Waiting for Data";
        if (permissionState === 'granted' && orientation.alpha !== null) return "Active";
        return "Unknown";
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

                            {/* Device Support Info */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <div className="flex items-start space-x-2">
                                    <Shield className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <h4 className="text-blue-300 font-semibold mb-1 text-sm">Device Support</h4>
                                        <p className="text-blue-200 text-xs">
                                            Orientation API: {getOrientationStatus()}
                                        </p>
                                        <p className="text-blue-200 text-xs">
                                            Implementation: Custom DeviceOrientationEvent Handler
                                        </p>
                                        <p className="text-blue-200 text-xs">
                                            Permission: {permissionState}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <h4 className="text-purple-300 font-semibold mb-2 text-sm">Instructions:</h4>
                                <div className="text-purple-200 text-sm space-y-1">
                                    <p>1. Hold your device firmly</p>
                                    <p>2. Rotate and twist your device slowly</p>
                                    <p>3. Try different directions (up, down, left, right)</p>
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

                            {/* Current Sensor Data */}
                            {orientation && (
                                <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Alpha (Z):</span>
                                        <span className="text-blue-400">{orientation.alpha?.toFixed(1) || 'N/A'}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Beta (X):</span>
                                        <span className="text-green-400">{orientation.beta?.toFixed(1) || 'N/A'}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Gamma (Y):</span>
                                        <span className="text-yellow-400">{orientation.gamma?.toFixed(1) || 'N/A'}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Absolute:</span>
                                        <span className="text-cyan-400">{orientation.absolute ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Motion Visualization */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
                                <div className="mb-3">
                                    <Compass 
                                        className="text-purple-400 mx-auto transition-transform duration-500" 
                                        size={48}
                                        style={{
                                            transform: `rotate(${(orientation?.alpha || 0) / 4}deg)`
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
                                <div className="flex justify-between">
                                    <span className="text-gray-400">API Source:</span>
                                    <span className="text-blue-400">Custom Hook</span>
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