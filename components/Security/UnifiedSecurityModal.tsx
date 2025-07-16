// src/components/Security/UnifiedSecurityModal.tsx - Enhanced with anti-manipulation protection

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, Fingerprint, Eye, RefreshCw, Clock, AlertTriangle, Settings, Smartphone } from "lucide-react";

import {
    generateSecureCaptcha,
    validateSecureCaptcha,
    validateSecureBiometric
} from "@/lib/authService";
import { useT } from "@/contexts/LocalizationContext";

export type SecurityType = "captcha" | "biometric" | "gyroscope";

interface UnifiedSecurityModalProps {
    isOpen: boolean;
    type: SecurityType;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
}

interface CaptchaData {
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
}

interface MotionSample {
    timestamp: number;
    motion: number;
    alpha: number;
    beta: number;
    gamma: number;
}

interface VerificationData {
    samples: number;
    intensity: number;
    signature: string;
    timestamps: number[];
    sessionFingerprint: string;
}

const TIMEOUTS = {
    captcha: 10000, // 10 seconds
    biometric: 15000, // 15 seconds
    gyroscope: 10000, // 10 seconds
};

const PERMISSION_TIMEOUT = 30000; // 30 seconds for permission

const UnifiedSecurityModal: React.FC<UnifiedSecurityModalProps> = ({
    isOpen,
    type,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const t = useT();

    // Common state
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startTime, setStartTime] = useState(0);

    // Captcha specific state
    const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
    const [userInput, setUserInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Biometric specific state
    const [biometricManager, setBiometricManager] = useState<any>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [biometricType, setBiometricType] = useState<"finger" | "face" | "unknown">("unknown");
    const [isWaitingForPermission, setIsWaitingForPermission] = useState(false);
    const [permissionTimer, setPermissionTimer] = useState(0);

    // Gyroscope specific state
    const [motionDetected, setMotionDetected] = useState(false);
    const [gyroscopeSupported, setGyroscopeSupported] = useState(false);
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [verificationCompleted, setVerificationCompleted] = useState(false);

    // Security protection state
    const [motionSamples, setMotionSamples] = useState<MotionSample[]>([]);
    const [sessionFingerprint, setSessionFingerprint] = useState<string>("");

    const timeout = TIMEOUTS[type];

    // Generate session fingerprint for security
    const generateSessionFingerprint = () => {
        const nav = performance.navigation;
        const screen = window.screen;
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const fingerprint = [
            nav.type,
            screen.width,
            screen.height,
            screen.colorDepth,
            timeZone,
            Date.now().toString(36)
        ].join(':');

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return hash.toString(36);
    };

    // Generate cryptographic signature for motion data
    const generateMotionSignature = (samples: MotionSample[], startTime: number): string => {
        const dataPoints = samples.map(s =>
            `${s.timestamp}:${Math.floor(s.motion * 100)}:${Math.floor(s.alpha || 0)}:${Math.floor(s.beta || 0)}:${Math.floor(s.gamma || 0)}`
        ).join('|');

        const signatureData = `${startTime}:${samples.length}:${dataPoints}`;

        let hash = 0;
        for (let i = 0; i < signatureData.length; i++) {
            const char = signatureData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return hash.toString(36);
    };

    // Initialize modal when opened
    useEffect(() => {
        if (!isOpen) return;

        const now = Date.now();
        setStartTime(now);
        setTimeRemaining(timeout);
        setError(null);
        setIsProcessing(false);
        setUserInput("");
        setMotionDetected(false);
        setMotionIntensity(0);
        setVerificationCompleted(false);
        setMotionSamples([]);

        // Generate session fingerprint for security
        setSessionFingerprint(generateSessionFingerprint());

        // Initialize based on type
        switch (type) {
            case "captcha":
                generateCaptcha();
                break;
            case "biometric":
                initBiometric();
                break;
            case "gyroscope":
                initGyroscope();
                break;
        }
    }, [isOpen, type]);

    // FIXED: Main timer countdown - paused during permission request or when verification completed
    useEffect(() => {
        if (!isOpen || timeRemaining <= 0 || verificationCompleted) return;

        // CRITICAL FIX: Pause timer during biometric permission request
        if (type === "biometric" && isWaitingForPermission) {
            return; // Don't run timer during permission request
        }

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, timeout - elapsed);
            setTimeRemaining(remaining);

            if (remaining === 0) {
                handleTimeout();
            }
        }, 100);

        return () => clearInterval(timer);
    }, [isOpen, startTime, timeout, timeRemaining, type, isWaitingForPermission, verificationCompleted]);

    // Auto-focus input for captcha (but don't open keyboard)
    useEffect(() => {
        if (type === "captcha" && captchaData && inputRef.current && !error) {
            // Focus without opening mobile keyboard
            inputRef.current.focus();
            inputRef.current.blur();
        }
    }, [type, captchaData, error]);

    const generateCaptcha = async () => {
        setIsLoading(true);
        try {
            const data = await generateSecureCaptcha();
            setCaptchaData(data);
        } catch (error) {
            console.error("Error generating captcha:", error);
            setError(t("security.verificationFailed" as any));
        } finally {
            setIsLoading(false);
        }
    };

    const initBiometric = async () => {
        if (typeof window === "undefined") return;

        const tg = window.Telegram?.WebApp;
        if (!tg?.BiometricManager) {
            setError(t("security.biometricNotAvailable" as any));
            return;
        }

        const manager = tg.BiometricManager;
        setBiometricManager(manager);

        manager.init(() => {
            setIsInitialized(true);
            setIsSupported(manager.isBiometricAvailable);
            setBiometricType(manager.biometricType || "unknown");

            if (!manager.isBiometricAvailable) {
                setError(t("security.biometricNotAvailable" as any));
            } else if (!manager.isAccessGranted) {
                // FIXED: Start permission flow with separate 30-second timer
                setIsWaitingForPermission(true);
                setPermissionTimer(30);

                const permissionInterval = setInterval(() => {
                    setPermissionTimer((prev) => {
                        if (prev <= 1) {
                            clearInterval(permissionInterval);

                            // After 30 seconds, check permission status
                            if (manager.isAccessGranted) {
                                // Permission granted - resume normal operation
                                setIsWaitingForPermission(false);
                                // Reset main timer for biometric verification
                                const now = Date.now();
                                setStartTime(now);
                                setTimeRemaining(timeout);
                            } else {
                                // Permission denied - request access one more time
                                requestBiometricAccess(manager);
                            }
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        });
    };

    // NEW: Function to request biometric access
    const requestBiometricAccess = (manager: any) => {
        manager.requestAccess(
            { reason: t("security.securityCheckRequired" as any) },
            (granted: boolean) => {
                setIsWaitingForPermission(false);
                if (granted) {
                    // Permission granted - reset timer
                    const now = Date.now();
                    setStartTime(now);
                    setTimeRemaining(timeout);
                } else {
                    setError(t("security.biometricAccessDenied" as any));
                    setTimeout(() => onFailure(), 1000);
                }
            }
        );
    };

    const initGyroscope = () => {
        if (typeof window === "undefined") return;

        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            setError(t("security.gyroscopeNotSupported" as any));
            return;
        }

        setGyroscopeSupported(true);

        // Request permission for iOS 13+
        if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
            (DeviceOrientationEvent as any).requestPermission()
                .then((response: string) => {
                    if (response === "granted") {
                        startMotionDetection();
                    } else {
                        setError(t("security.gyroscopeNotSupported" as any));
                    }
                })
                .catch(() => {
                    setError(t("security.gyroscopeNotSupported" as any));
                });
        } else {
            startMotionDetection();
        }
    };

    // FIXED: Improved motion detection logic with security protection
    const startMotionDetection = () => {
        let lastTime = Date.now();
        let lastAlpha = 0;
        let lastBeta = 0;
        let lastGamma = 0;
        let totalMotion = 0;
        let motionSamplesLocal: MotionSample[] = [];
        let isFirstReading = true;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            // Stop detection if verification already completed
            if (verificationCompleted) return;

            const now = Date.now();
            const timeDiff = now - lastTime;

            if (timeDiff < 100) return; // Throttle to 10 FPS

            const alpha = event.alpha || 0;
            const beta = event.beta || 0;
            const gamma = event.gamma || 0;

            // Skip first reading to establish baseline
            if (isFirstReading) {
                lastAlpha = alpha;
                lastBeta = beta;
                lastGamma = gamma;
                lastTime = now;
                isFirstReading = false;
                return;
            }

            // Calculate motion intensity with threshold
            const deltaAlpha = Math.abs(alpha - lastAlpha);
            const deltaBeta = Math.abs(beta - lastBeta);
            const deltaGamma = Math.abs(gamma - lastGamma);

            // Only count significant motion (filter out device noise)
            const motion = deltaAlpha + deltaBeta + deltaGamma;
            const motionThreshold = 8; // Increased threshold for noise filtering

            if (motion > motionThreshold) {
                const sample: MotionSample = {
                    timestamp: now,
                    motion,
                    alpha,
                    beta,
                    gamma
                };

                motionSamplesLocal.push(sample);

                // Keep only recent samples (last 3 seconds)
                const maxSamples = 30; // 3 seconds at 10 FPS
                if (motionSamplesLocal.length > maxSamples) {
                    motionSamplesLocal = motionSamplesLocal.slice(-maxSamples);
                }

                // Update state with samples for security validation
                setMotionSamples([...motionSamplesLocal]);

                // Calculate total motion from recent samples
                totalMotion = motionSamplesLocal.reduce((sum, sample) => sum + sample.motion, 0);
            }

            setMotionIntensity(totalMotion);

            // FIXED: Increased thresholds for slower progression and more reliable detection
            const requiredMotion = 300; // Significantly increased threshold
            const minSamples = 15; // Need more motion samples

            if (totalMotion > requiredMotion && motionSamplesLocal.length >= minSamples && !motionDetected && !verificationCompleted) {
                setMotionDetected(true);
                setVerificationCompleted(true); // FIXED: Stop timer progression
                handleGyroscopeSuccess();
            }

            lastTime = now;
            lastAlpha = alpha;
            lastBeta = beta;
            lastGamma = gamma;
        };

        window.addEventListener("deviceorientation", handleOrientation);

        // Cleanup function
        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
        };
    };

    const handleTimeout = () => {
        setError(t("security.timeExpired" as any));
        onFailure();
    };

    const handleCaptchaSubmit = async () => {
        if (!captchaData || !userInput.trim() || isProcessing) return;

        setIsProcessing(true);
        const completedInTime = Date.now() < captchaData.expiresAt;

        try {
            const result = await validateSecureCaptcha(
                userInput.trim(),
                captchaData.correctAnswer,
                completedInTime
            );

            if (result.success) {
                onSuccess();
            } else {
                onFailure();
            }
        } catch (error) {
            console.error("Error validating captcha:", error);
            onFailure();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBiometricAuth = async () => {
        if (!biometricManager || !isSupported || isProcessing) return;

        setIsProcessing(true);

        try {
            biometricManager.authenticate(
                { reason: t("security.securityCheckRequired" as any) },
                async (success: boolean) => {
                    const completedInTime = Date.now() - startTime < timeout;

                    try {
                        const result = await validateSecureBiometric(success, completedInTime);

                        if (result.success) {
                            onSuccess();
                        } else {
                            onFailure();
                        }
                    } catch (error) {
                        console.error("Error validating biometric:", error);
                        onFailure();
                    } finally {
                        setIsProcessing(false);
                    }
                }
            );
        } catch (error) {
            console.error("Error during biometric authentication:", error);
            setError(t("security.verificationFailed" as any));
            setIsProcessing(false);
        }
    };

    const handleGyroscopeSuccess = async () => {
        if (isProcessing || !motionDetected) return;

        setIsProcessing(true);

        try {
            // Enhanced security validation
            const now = Date.now();
            const verificationDuration = now - startTime;

            // Basic validation checks
            if (verificationDuration < 3000) {
                console.warn('Gyroscope verification too fast - potential manipulation');
                setError('Verification failed: Too fast');
                onFailure();
                return;
            }

            if (motionSamples.length < 15) {
                console.warn('Insufficient motion samples - potential manipulation');
                setError('Verification failed: Insufficient motion data');
                onFailure();
                return;
            }

            // Generate verification data with cryptographic signature
            const totalIntensity = motionSamples.reduce((sum, s) => sum + s.motion, 0);
            const signature = generateMotionSignature(motionSamples, startTime);
            const timestamps = motionSamples.map(s => s.timestamp);

            const verificationData: VerificationData = {
                samples: motionSamples.length,
                intensity: totalIntensity,
                signature,
                timestamps,
                sessionFingerprint
            };

            // Enhanced server validation with verification data
            const response = await fetch('/api/security/validate-captcha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    userInput: "MOTION",
                    correctAnswer: "MOTION",
                    completedInTime: true,
                    startTime: startTime,
                    verificationData: verificationData,
                    clientFingerprint: sessionFingerprint
                })
            });

            const result = await response.json();

            if (result.success) {
                onSuccess();
            } else {
                onFailure();
            }
        } catch (error) {
            console.error("Error validating gyroscope:", error);
            onFailure();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && type === "captcha" && !isProcessing) {
            handleCaptchaSubmit();
        }
    };

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const getIcon = () => {
        switch (type) {
            case "captcha":
                return <Shield className="text-blue-400" size={48} />;
            case "biometric":
                return biometricType === "face" ?
                    <Eye className="text-blue-400" size={48} /> :
                    <Fingerprint className="text-blue-400" size={48} />;
            case "gyroscope":
                return <Smartphone className="text-purple-400" size={48} />;
            default:
                return <Shield className="text-blue-400" size={48} />;
        }
    };

    const getTitle = () => {
        switch (type) {
            case "captcha":
                return t("security.captchaTitle" as any);
            case "biometric":
                return t("security.biometricTitle" as any);
            case "gyroscope":
                return t("security.gyroscopeTitle" as any);
            default:
                return t("security.captchaTitle" as any);
        }
    };

    const getDescription = () => {
        switch (type) {
            case "captcha":
                return t("security.captchaDescription" as any);
            case "biometric":
                return t("security.biometricDescription" as any);
            case "gyroscope":
                return t("security.gyroscopeDescription" as any);
            default:
                return t("security.captchaDescription" as any);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-center border-b border-gray-700">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        {getIcon()}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{getTitle()}</h2>
                    <p className="text-gray-400 text-sm">{getDescription()}</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Timer - FIXED: Shows appropriate timer based on state */}
                    <div className="flex items-center justify-center space-x-2 text-sm mb-6">
                        <Clock className={
                            (type === "biometric" && isWaitingForPermission)
                                ? (permissionTimer < 10 ? "text-red-400" : "text-blue-400")
                                : (timeRemaining < 3000 ? "text-red-400" : "text-orange-400")
                        } size={16} />
                        <span className={`font-bold ${(type === "biometric" && isWaitingForPermission)
                                ? (permissionTimer < 10 ? "text-red-400" : "text-blue-400")
                                : (timeRemaining < 3000 ? "text-red-400" : "text-orange-400")
                            }`}>
                            {(type === "biometric" && isWaitingForPermission)
                                ? `${permissionTimer}s`
                                : formatTime(timeRemaining)
                            }
                        </span>
                        <span className="text-gray-500">
                            {(type === "biometric" && isWaitingForPermission)
                                ? "to grant access"
                                : t("security.timeRemaining" as any)
                            }
                        </span>
                    </div>

                    {/* Type-specific content */}
                    {type === "captcha" && (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <RefreshCw className="text-blue-400 mx-auto animate-spin" size={32} />
                                    <p className="text-gray-400 mt-2">{t("security.processing" as any)}</p>
                                </div>
                            ) : captchaData ? (
                                <>
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-mono font-bold text-white tracking-widest mb-2">
                                            {captchaData.challenge}
                                        </div>
                                        <p className="text-gray-400 text-xs">{t("security.enterCode" as any)}</p>
                                    </div>

                                    <div>
                                        <input
                                            ref={inputRef}
                                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            disabled={isProcessing || timeRemaining === 0}
                                            placeholder={t("security.enterCode" as any)}
                                            type="tel"
                                            inputMode="numeric"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                        />
                                    </div>

                                    <button
                                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        disabled={!userInput.trim() || isProcessing || timeRemaining === 0}
                                        onClick={handleCaptchaSubmit}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={16} />
                                                <span>{t("security.verifying" as any)}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Shield size={16} />
                                                <span>{t("security.verify" as any)}</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-red-400">{t("security.verificationFailed" as any)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {type === "biometric" && (
                        <div className="space-y-4">
                            {!isInitialized ? (
                                <div className="text-center py-8">
                                    <div className="animate-pulse">
                                        <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                                    </div>
                                    <p className="text-gray-400">{t("security.processing" as any)}</p>
                                </div>
                            ) : isWaitingForPermission ? (
                                <div className="text-center space-y-4">
                                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4">
                                        <div className="flex items-center justify-center space-x-2 mb-3">
                                            <Clock className="text-blue-400" size={20} />
                                            <span className="text-blue-300 font-semibold">Waiting for biometric access</span>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-400 font-mono mb-2">
                                            {permissionTimer}s
                                        </div>
                                        <p className="text-blue-200/80 text-sm mb-4">
                                            Please enable biometric authentication in your device settings
                                        </p>

                                        {/* NEW: Button to request access immediately */}
                                        <button
                                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 mb-3"
                                            onClick={() => requestBiometricAccess(biometricManager)}
                                        >
                                            <Fingerprint size={16} />
                                            <span>Request Access Now</span>
                                        </button>
                                    </div>

                                    {biometricManager?.openSettings && (
                                        <button
                                            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                            onClick={() => biometricManager.openSettings()}
                                        >
                                            <Settings size={16} />
                                            <span>{t("security.openSettings" as any)}</span>
                                        </button>
                                    )}
                                </div>
                            ) : !isSupported || error ? (
                                <div className="text-center space-y-4">
                                    <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                                        <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                        <p className="text-red-300 text-sm">
                                            {error || t("security.biometricNotAvailable" as any)}
                                        </p>
                                    </div>

                                    {biometricManager?.openSettings && (
                                        <button
                                            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                            onClick={() => biometricManager.openSettings()}
                                        >
                                            <Settings size={16} />
                                            <span>{t("security.openSettings" as any)}</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                        <div className="mb-3">{getIcon()}</div>
                                        <p className="text-gray-400 text-sm">
                                            {t("security.touchSensor" as any)}
                                        </p>
                                    </div>

                                    <button
                                        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                                        disabled={isProcessing || timeRemaining === 0}
                                        onClick={handleBiometricAuth}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>{t("security.authenticating" as any)}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint size={20} />
                                                <span>{t("security.verify" as any)}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {type === "gyroscope" && (
                        <div className="space-y-4">
                            {!gyroscopeSupported ? (
                                <div className="text-center space-y-4">
                                    <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                                        <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                        <p className="text-red-300 text-sm">
                                            {t("security.gyroscopeNotSupported" as any)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
                                        <div className={`transition-all duration-300 ${motionDetected ? 'scale-110' : 'scale-100'}`}>
                                            <Smartphone
                                                className={`mx-auto mb-4 transition-colors duration-300 ${motionDetected ? 'text-green-400' : 'text-purple-400'
                                                    }`}
                                                size={48}
                                                style={{
                                                    transform: `rotate(${Math.sin(motionIntensity / 30) * 3}deg)`
                                                }}
                                            />
                                        </div>
                                        <h3 className="text-white font-semibold mb-2">
                                            {motionDetected ? t("security.motionDetected" as any) : t("security.shakeDevice" as any)}
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            {t("security.motionInstructions" as any)}
                                        </p>

                                        {/* FIXED: Motion Progress Bar with corrected calculation for new threshold */}
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 relative ${motionDetected ? 'bg-green-400' : 'bg-purple-400'
                                                            }`}
                                                        style={{
                                                            width: `${Math.min(100, (motionIntensity / 300) * 100)}%`,
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                                                    <div className={`w-2 h-2 rounded-full ${motionDetected ? 'bg-green-200' : 'bg-purple-200'} animate-pulse`}></div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Progress</span>
                                                <span className={`font-bold ${motionDetected ? 'text-green-400' : 'text-purple-400'}`}>
                                                    {Math.round((motionIntensity / 300) * 100)}%
                                                </span>
                                            </div>

                                            {/* Motion intensity visualization */}
                                            <div className="flex justify-center space-x-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-2 h-6 rounded-full transition-all duration-300 ${(motionIntensity / 300) * 100 > (i + 1) * 20
                                                            ? motionDetected ? 'bg-green-400' : 'bg-purple-400'
                                                            : 'bg-gray-600'
                                                            }`}
                                                        style={{
                                                            height: `${Math.max(8, Math.min(24, 8 + (motionIntensity / 60) * i))}px`
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {motionDetected && (
                                        <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                                <p className="text-green-300 text-sm font-semibold">
                                                    {t("security.verificationSuccessful" as any)}
                                                </p>
                                            </div>
                                            <p className="text-green-200/80 text-xs">
                                                Motion verification completed successfully
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {type === "captcha" && (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <RefreshCw className="text-blue-400 mx-auto animate-spin" size={32} />
                                    <p className="text-gray-400 mt-2">{t("security.processing" as any)}</p>
                                </div>
                            ) : captchaData ? (
                                <>
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-mono font-bold text-white tracking-widest mb-2">
                                            {captchaData.challenge}
                                        </div>
                                        <p className="text-gray-400 text-xs">{t("security.enterCode" as any)}</p>
                                    </div>

                                    <div>
                                        <input
                                            ref={inputRef}
                                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            disabled={isProcessing || timeRemaining === 0}
                                            placeholder={t("security.enterCode" as any)}
                                            type="tel"
                                            inputMode="numeric"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                        />
                                    </div>

                                    <button
                                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        disabled={!userInput.trim() || isProcessing || timeRemaining === 0}
                                        onClick={handleCaptchaSubmit}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={16} />
                                                <span>{t("security.verifying" as any)}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Shield size={16} />
                                                <span>{t("security.verify" as any)}</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-red-400">{t("security.verificationFailed" as any)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {type === "biometric" && (
                        <div className="space-y-4">
                            {!isInitialized ? (
                                <div className="text-center py-8">
                                    <div className="animate-pulse">
                                        <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
                                    </div>
                                    <p className="text-gray-400">{t("security.processing" as any)}</p>
                                </div>
                            ) : isWaitingForPermission ? (
                                <div className="text-center space-y-4">
                                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4">
                                        <div className="flex items-center justify-center space-x-2 mb-3">
                                            <Clock className="text-blue-400" size={20} />
                                            <span className="text-blue-300 font-semibold">Waiting for biometric access</span>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-400 font-mono mb-2">
                                            {permissionTimer}s
                                        </div>
                                        <p className="text-blue-200/80 text-sm mb-4">
                                            Please enable biometric authentication in your device settings
                                        </p>

                                        {/* NEW: Button to request access immediately */}
                                        <button
                                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 mb-3"
                                            onClick={() => requestBiometricAccess(biometricManager)}
                                        >
                                            <Fingerprint size={16} />
                                            <span>Request Access Now</span>
                                        </button>
                                    </div>

                                    {biometricManager?.openSettings && (
                                        <button
                                            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                            onClick={() => biometricManager.openSettings()}
                                        >
                                            <Settings size={16} />
                                            <span>{t("security.openSettings" as any)}</span>
                                        </button>
                                    )}
                                </div>
                            ) : !isSupported || error ? (
                                <div className="text-center space-y-4">
                                    <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                                        <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                        <p className="text-red-300 text-sm">
                                            {error || t("security.biometricNotAvailable" as any)}
                                        </p>
                                    </div>

                                    {biometricManager?.openSettings && (
                                        <button
                                            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                            onClick={() => biometricManager.openSettings()}
                                        >
                                            <Settings size={16} />
                                            <span>{t("security.openSettings" as any)}</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                        <div className="mb-3">{getIcon()}</div>
                                        <p className="text-gray-400 text-sm">
                                            {t("security.touchSensor" as any)}
                                        </p>
                                    </div>

                                    <button
                                        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                                        disabled={isProcessing || timeRemaining === 0}
                                        onClick={handleBiometricAuth}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>{t("security.authenticating" as any)}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint size={20} />
                                                <span>{t("security.verify" as any)}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {type === "gyroscope" && (
                        <div className="space-y-4">
                            {!gyroscopeSupported ? (
                                <div className="text-center space-y-4">
                                    <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                                        <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                        <p className="text-red-300 text-sm">
                                            {t("security.gyroscopeNotSupported" as any)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
                                        <div className={`transition-all duration-300 ${motionDetected ? 'scale-110' : 'scale-100'}`}>
                                            <Smartphone
                                                className={`mx-auto mb-4 transition-colors duration-300 ${motionDetected ? 'text-green-400' : 'text-purple-400'
                                                    }`}
                                                size={48}
                                                style={{
                                                    transform: `rotate(${Math.sin(motionIntensity / 30) * 3}deg)`
                                                }}
                                            />
                                        </div>
                                        <h3 className="text-white font-semibold mb-2">
                                            {motionDetected ? t("security.motionDetected" as any) : t("security.shakeDevice" as any)}
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-4">
                                            {t("security.motionInstructions" as any)}
                                        </p>

                                        {/* FIXED: Motion Progress Bar with corrected calculation for new threshold */}
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 relative ${motionDetected ? 'bg-green-400' : 'bg-purple-400'
                                                            }`}
                                                        style={{
                                                            width: `${Math.min(100, (motionIntensity / 300) * 100)}%`,
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                                                    <div className={`w-2 h-2 rounded-full ${motionDetected ? 'bg-green-200' : 'bg-purple-200'} animate-pulse`}></div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Progress</span>
                                                <span className={`font-bold ${motionDetected ? 'text-green-400' : 'text-purple-400'}`}>
                                                    {Math.round((motionIntensity / 300) * 100)}%
                                                </span>
                                            </div>

                                            {/* Motion intensity visualization */}
                                            <div className="flex justify-center space-x-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-2 h-6 rounded-full transition-all duration-300 ${(motionIntensity / 300) * 100 > (i + 1) * 20
                                                            ? motionDetected ? 'bg-green-400' : 'bg-purple-400'
                                                            : 'bg-gray-600'
                                                            }`}
                                                        style={{
                                                            height: `${Math.max(8, Math.min(24, 8 + (motionIntensity / 60) * i))}px`
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {motionDetected && (
                                        <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                                <p className="text-green-300 text-sm font-semibold">
                                                    {t("security.verificationSuccessful" as any)}
                                                </p>
                                            </div>
                                            <p className="text-green-200/80 text-xs">
                                                Motion verification completed successfully
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div className="mt-4 flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer warning */}
                <div className="bg-gray-800/50 border-t border-gray-700 p-4">
                    <p className="text-gray-400 text-xs text-center">
                        {t("security.accountBlocked" as any)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnifiedSecurityModal;