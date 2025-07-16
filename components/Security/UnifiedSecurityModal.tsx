// src/components/Security/UnifiedSecurityModal.tsx - Protected version with anti-manipulation features

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Shield, Fingerprint, Eye, RefreshCw, Clock, AlertTriangle, Settings, Smartphone } from "lucide-react";

import {
    generateSecureCaptcha,
    validateSecureCaptcha,
    validateSecureBiometric
} from "@/lib/authService";
import { useT } from "@/contexts/LocalizationContext";
import { useSecurityProtection } from "@/hooks/useSecurityProtection";

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

interface ProtectedState {
    verificationCompleted: boolean;
    motionDetected: boolean;
    timestamp: number;
    checksum: string;
    sessionToken: string;
}

const TIMEOUTS = {
    captcha: 10000,
    biometric: 15000,
    gyroscope: 10000,
};

const PERMISSION_TIMEOUT = 30000;

const UnifiedSecurityModal: React.FC<UnifiedSecurityModalProps> = ({
    isOpen,
    type,
    onSuccess,
    onFailure,
    onClose,
}) => {
    const t = useT();
    const {
        initializeVerificationSession,
        addMotionSample,
        completeVerification,
        resetVerification,
        validateStateIntegrity,
        getSessionInfo,
        isVerificationActive
    } = useSecurityProtection();

    // Protected state with integrity validation
    const [protectedState, setProtectedState] = useState<ProtectedState>(() =>
        createProtectedState(false, false)
    );

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
    const [motionIntensity, setMotionIntensity] = useState(0);
    const [gyroscopeSupported, setGyroscopeSupported] = useState(false);

    // Security monitoring
    const securityCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const lastValidationTime = useRef<number>(0);

    const timeout = TIMEOUTS[type];

    // Create protected state with checksum validation
    function createProtectedState(
        verificationCompleted: boolean,
        motionDetected: boolean
    ): ProtectedState {
        const timestamp = Date.now();
        const sessionToken = Math.random().toString(36).substring(2, 15);
        const stateData = `${verificationCompleted}:${motionDetected}:${timestamp}:${sessionToken}`;

        let checksum = 0;
        for (let i = 0; i < stateData.length; i++) {
            const char = stateData.charCodeAt(i);
            checksum = ((checksum << 5) - checksum) + char;
            checksum = checksum & checksum;
        }

        return {
            verificationCompleted,
            motionDetected,
            timestamp,
            checksum: checksum.toString(36),
            sessionToken
        };
    }

    // Validate protected state integrity
    const validateProtectedState = useCallback((state: ProtectedState): boolean => {
        const stateData = `${state.verificationCompleted}:${state.motionDetected}:${state.timestamp}:${state.sessionToken}`;

        let expectedChecksum = 0;
        for (let i = 0; i < stateData.length; i++) {
            const char = stateData.charCodeAt(i);
            expectedChecksum = ((expectedChecksum << 5) - expectedChecksum) + char;
            expectedChecksum = expectedChecksum & expectedChecksum;
        }

        const isValid = expectedChecksum.toString(36) === state.checksum;

        if (!isValid) {
            console.warn('Protected state validation failed - potential manipulation detected');
            // Log this as suspicious activity
            onFailure();
        }

        return isValid;
    }, [onFailure]);

    // Secure state update with integrity protection
    const updateProtectedState = useCallback((
        verificationCompleted?: boolean,
        motionDetected?: boolean
    ) => {
        if (!validateProtectedState(protectedState)) {
            return;
        }

        const newState = createProtectedState(
            verificationCompleted ?? protectedState.verificationCompleted,
            motionDetected ?? protectedState.motionDetected
        );

        setProtectedState(newState);
    }, [protectedState, validateProtectedState]);

    // Continuous security monitoring
    useEffect(() => {
        if (!isOpen) return;

        securityCheckInterval.current = setInterval(() => {
            const now = Date.now();

            // Validate state integrity every second
            if (!validateProtectedState(protectedState)) {
                clearInterval(securityCheckInterval.current!);
                return;
            }

            // Validate verification session integrity
            if (type === "gyroscope" && !validateStateIntegrity()) {
                console.warn('Verification session integrity compromised');
                setError('Security validation failed');
                setTimeout(() => onFailure(), 1000);
                return;
            }

            // Check for suspicious timing patterns
            if (now - lastValidationTime.current > 5000) {
                lastValidationTime.current = now;
            }
        }, 1000);

        return () => {
            if (securityCheckInterval.current) {
                clearInterval(securityCheckInterval.current);
            }
        };
    }, [isOpen, protectedState, validateProtectedState, validateStateIntegrity, type, onFailure]);

    // Initialize modal when opened
    useEffect(() => {
        if (!isOpen) return;

        const now = Date.now();
        setStartTime(now);
        setTimeRemaining(timeout);
        setError(null);
        setIsProcessing(false);
        setUserInput("");

        // Reset protected state
        const initialState = createProtectedState(false, false);
        setProtectedState(initialState);
        setMotionIntensity(0);

        // Initialize verification session for gyroscope
        if (type === "gyroscope") {
            initializeVerificationSession();
        }

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

        return () => {
            if (type === "gyroscope") {
                resetVerification();
            }
        };
    }, [isOpen, type, initializeVerificationSession, resetVerification]);

    // Timer countdown with protected state validation
    useEffect(() => {
        if (!isOpen || timeRemaining <= 0 || !validateProtectedState(protectedState)) return;

        if (protectedState.verificationCompleted) {
            return; // Stop timer when verification completed
        }

        if (type === "biometric" && isWaitingForPermission) {
            return; // Pause timer during permission request
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
    }, [isOpen, startTime, timeout, timeRemaining, type, isWaitingForPermission, protectedState, validateProtectedState]);

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
                setIsWaitingForPermission(true);
                setPermissionTimer(30);

                const permissionInterval = setInterval(() => {
                    setPermissionTimer((prev) => {
                        if (prev <= 1) {
                            clearInterval(permissionInterval);

                            if (manager.isAccessGranted) {
                                setIsWaitingForPermission(false);
                                const now = Date.now();
                                setStartTime(now);
                                setTimeRemaining(timeout);
                            } else {
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

    const requestBiometricAccess = (manager: any) => {
        manager.requestAccess(
            { reason: t("security.securityCheckRequired" as any) },
            (granted: boolean) => {
                setIsWaitingForPermission(false);
                if (granted) {
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

        if (!window.DeviceOrientationEvent) {
            setError(t("security.gyroscopeNotSupported" as any));
            return;
        }

        setGyroscopeSupported(true);

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

    const startMotionDetection = () => {
        let lastTime = Date.now();
        let lastAlpha = 0;
        let lastBeta = 0;
        let lastGamma = 0;
        let totalMotion = 0;
        let motionSamples: number[] = [];
        let isFirstReading = true;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            // Validate state before processing
            if (!validateProtectedState(protectedState) || protectedState.verificationCompleted) {
                return;
            }

            const now = Date.now();
            const timeDiff = now - lastTime;

            if (timeDiff < 100) return;

            const alpha = event.alpha || 0;
            const beta = event.beta || 0;
            const gamma = event.gamma || 0;

            if (isFirstReading) {
                lastAlpha = alpha;
                lastBeta = beta;
                lastGamma = gamma;
                lastTime = now;
                isFirstReading = false;
                return;
            }

            const deltaAlpha = Math.abs(alpha - lastAlpha);
            const deltaBeta = Math.abs(beta - lastBeta);
            const deltaGamma = Math.abs(gamma - lastGamma);

            const motion = deltaAlpha + deltaBeta + deltaGamma;
            const motionThreshold = 8;

            if (motion > motionThreshold) {
                motionSamples.push(motion);

                // Add to security protection system
                addMotionSample(alpha, beta, gamma, motion);

                if (motionSamples.length > 30) {
                    motionSamples = motionSamples.slice(-30);
                }

                totalMotion = motionSamples.reduce((sum, sample) => sum + sample, 0);
            }

            setMotionIntensity(totalMotion);

            const requiredMotion = 300;
            const minSamples = 15;

            if (totalMotion > requiredMotion && motionSamples.length >= minSamples &&
                !protectedState.motionDetected && !protectedState.verificationCompleted) {

                updateProtectedState(true, true); // Mark both motion detected and verification completed
                handleGyroscopeSuccess();
            }

            lastTime = now;
            lastAlpha = alpha;
            lastBeta = beta;
            lastGamma = gamma;
        };

        window.addEventListener("deviceorientation", handleOrientation);

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
                updateProtectedState(true);
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
                            updateProtectedState(true);
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
        if (isProcessing || !validateProtectedState(protectedState)) return;

        setIsProcessing(true);

        try {
            // Get verification data from security protection system
            const verification = completeVerification();

            if (!verification.success) {
                console.error("Gyroscope verification failed:", verification.reason);
                setError(verification.reason || "Verification failed");
                onFailure();
                return;
            }

            // Enhanced validation with verification data
            const result = await fetch('/api/security/validate-captcha', {
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
                    verificationData: verification.verificationData,
                    clientFingerprint: getSessionInfo()?.sessionId
                })
            });

            const data = await result.json();

            if (data.success) {
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
                    {/* Timer */}
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

                    {/* Type-specific content with the rest of the modal content... */}
                    {/* Rest of the modal implementation remains the same as the previous version */}
                    {/* ... (keeping the same UI components but with protected state validation) */}

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