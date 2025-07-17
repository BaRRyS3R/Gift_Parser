// src/app/nebula/page.tsx - Fixed duplicate calls and trust score display

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, CheckCircle2, Fingerprint, Brain, Lock } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSecurity } from "@/hooks/useSecurity";
import { useT } from "@/contexts/LocalizationContext";
import CaptchaModal from "@/components/Security/CaptchaModal";
import BiometricModal from "@/components/Security/BiometricModal";

export default function NebulaSecurityPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useUser();
    const {
        securityState,
        showCaptcha,
        showBiometric,
        captchaData,
        handleCaptchaSuccess,
        handleCaptchaFailure,
        handleBiometricSuccess,
        handleBiometricFailure,
        checkSecurity,
        formatTrustScore,
        startCaptchaVerification,
        startBiometricVerification,
    } = useSecurity();
    const t = useT();

    const [isInitializing, setIsInitializing] = useState(true);
    const [verificationType, setVerificationType] = useState<'captcha' | 'biometric' | null>(null);
    const [verificationStarted, setVerificationStarted] = useState(false);
    const [completionProgress, setCompletionProgress] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);

    // FIXED: Single initialization flag to prevent duplicate calls
    const initializationDoneRef = React.useRef(false);
    const verificationInProgressRef = React.useRef(false);

    // Check authentication and redirect if needed
    useEffect(() => {
        if (!isAuthenticated) {
            console.log("User not authenticated on Nebula page, redirecting to login");
            router.push("/");
            return;
        }
    }, [isAuthenticated, router]);

    // FIXED: Single initialization with security state dependency
    useEffect(() => {
        if (!isAuthenticated || initializationDoneRef.current) return;

        const initializeSecurityCheck = async () => {
            try {
                console.log("Nebula Security: Initializing security verification...");
                setIsInitializing(true);

                // FIXED: Single security check call
                let result;
                try {
                    result = await checkSecurity();
                } catch (error) {
                    console.error("Nebula Security: Security check failed:", error);

                    // If authentication error, redirect to login
                    if (error instanceof Error && error.message.includes("not authenticated")) {
                        console.log("Nebula Security: Authentication error, redirecting to login");
                        router.push("/");
                        return;
                    }

                    // For other errors, use current security state as fallback
                    console.log("Nebula Security: Using current security state as fallback");
                    result = {
                        isBlocked: securityState.isBlocked,
                        needsCaptcha: securityState.needsCaptcha,
                        needsBiometric: securityState.needsBiometric,
                        trustScore: securityState.trustScore,
                        timeUntilUnblock: securityState.timeUntilUnblock,
                        blockReason: securityState.blockReason,
                    };
                }

                // Handle results
                if (result.isBlocked) {
                    console.log("Nebula Security: User is blocked, redirecting to blocked page");
                    router.push("/blocked");
                    return;
                }

                // Only redirect to main if NO verification is needed
                if (!result.needsCaptcha && !result.needsBiometric) {
                    console.log("Nebula Security: No verification required, redirecting to main");
                    router.push("/main");
                    return;
                }

                // Determine verification type based on trust score and requirements
                if (result.needsBiometric) {
                    console.log("Nebula Security: Biometric verification required (trust score:", result.trustScore, ")");
                    setVerificationType('biometric');
                } else if (result.needsCaptcha) {
                    console.log("Nebula Security: Captcha verification required (trust score:", result.trustScore, ")");
                    setVerificationType('captcha');
                }

                setIsInitializing(false);
                initializationDoneRef.current = true;

            } catch (error) {
                console.error("Nebula Security: Error during initialization:", error);
                setIsInitializing(false);
                initializationDoneRef.current = true;

                // Use security state to determine verification type as fallback
                const trustScore = securityState.trustScore || 50;

                if (trustScore < 20) {
                    setVerificationType('biometric');
                } else if (trustScore < 40) {
                    setVerificationType('captcha');
                } else {
                    // High trust score but somehow ended up here, redirect to main
                    router.push("/main");
                    return;
                }
            }
        };

        // FIXED: Single initialization call with small delay
        const timeoutId = setTimeout(initializeSecurityCheck, 100);

        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, checkSecurity, router, securityState]);

    // Handle successful verifications
    const handleSuccessfulVerification = useCallback(() => {
        if (verificationInProgressRef.current) return;

        verificationInProgressRef.current = true;
        console.log("Nebula Security: Verification successful, completing process");
        setIsCompleting(true);
        setVerificationStarted(false);

        // Animate completion progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 25;
            setCompletionProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    console.log("Nebula Security: Redirecting to main page");
                    router.push("/main");
                }, 1000);
            }
        }, 150);
    }, [router]);

    // Handle failed verifications
    const handleFailedVerification = useCallback(() => {
        if (verificationInProgressRef.current) return;

        verificationInProgressRef.current = true;
        console.log("Nebula Security: Verification failed, redirecting to blocked page");
        setVerificationStarted(false);
        router.push("/blocked");
    }, [router]);

    // Enhanced success handlers
    const handleCaptchaSuccessWrapper = useCallback(() => {
        handleCaptchaSuccess();
        handleSuccessfulVerification();
    }, [handleCaptchaSuccess, handleSuccessfulVerification]);

    const handleBiometricSuccessWrapper = useCallback(() => {
        handleBiometricSuccess();
        handleSuccessfulVerification();
    }, [handleBiometricSuccess, handleSuccessfulVerification]);

    // Enhanced failure handlers
    const handleCaptchaFailureWrapper = useCallback(() => {
        handleCaptchaFailure();
        handleFailedVerification();
    }, [handleCaptchaFailure, handleFailedVerification]);

    const handleBiometricFailureWrapper = useCallback(() => {
        handleBiometricFailure();
        handleFailedVerification();
    }, [handleBiometricFailure, handleFailedVerification]);

    // FIXED: Single captcha generation with proper state management
    const handleStartCaptcha = useCallback(async () => {
        if (verificationStarted || verificationInProgressRef.current) {
            console.log("Nebula Security: Verification already in progress, skipping");
            return;
        }

        console.log("Nebula Security: Starting captcha verification");
        setVerificationStarted(true);

        try {
            await startCaptchaVerification();
        } catch (error) {
            console.error("Nebula Security: Failed to start captcha verification:", error);
            setVerificationStarted(false);
        }
    }, [startCaptchaVerification, verificationStarted]);

    const handleStartBiometric = useCallback(() => {
        if (verificationStarted || verificationInProgressRef.current) {
            console.log("Nebula Security: Verification already in progress, skipping");
            return;
        }

        console.log("Nebula Security: Starting biometric verification");
        setVerificationStarted(true);

        try {
            startBiometricVerification();
        } catch (error) {
            console.error("Nebula Security: Failed to start biometric verification:", error);
            setVerificationStarted(false);
        }
    }, [startBiometricVerification, verificationStarted]);

    // Get verification type display information
    const getVerificationInfo = () => {
        if (isCompleting) {
            return {
                title: "Verification Complete",
                description: "Security verification successful. Redirecting to application...",
                icon: <CheckCircle2 className="text-green-400" size={48} />,
                color: "border-green-400/40 bg-green-500/10"
            };
        }

        switch (verificationType) {
            case 'captcha':
                return {
                    title: "Captcha Verification Required",
                    description: "Your trust score requires captcha verification to ensure you are human.",
                    icon: <Brain className="text-yellow-400" size={48} />,
                    color: "border-yellow-400/40 bg-yellow-500/10",
                    buttonText: "Start Captcha",
                    buttonAction: handleStartCaptcha,
                    buttonDisabled: verificationStarted || verificationInProgressRef.current
                };
            case 'biometric':
                return {
                    title: "Biometric Authentication Required",
                    description: "Your trust score is very low and requires biometric verification for secure access.",
                    icon: <Fingerprint className="text-blue-400" size={48} />,
                    color: "border-blue-400/40 bg-blue-500/10",
                    buttonText: "Start Biometric",
                    buttonAction: handleStartBiometric,
                    buttonDisabled: verificationStarted || verificationInProgressRef.current
                };
            default:
                return {
                    title: "Initializing Security Check",
                    description: "Please wait while we verify your security status...",
                    icon: <Shield className="text-blue-400" size={48} />,
                    color: "border-blue-400/40 bg-blue-500/10"
                };
        }
    };

    const verificationInfo = getVerificationInfo();

    // FIXED: Get trust score from security state with fallback
    const currentTrustScore = securityState.trustScore || 50;
    const trustScoreInfo = formatTrustScore(currentTrustScore);

    // Early return if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="relative">
                        <h1 className="text-3xl font-bold text-white tracking-wider">
                            Nebula Security
                        </h1>
                        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
                    </div>
                    <p className="text-gray-400 text-sm">
                        Advanced Security Verification System
                    </p>
                </div>

                {/* Main Verification Card */}
                <div className={`border rounded-2xl p-6 space-y-6 ${verificationInfo.color}`}>
                    {/* Status Icon */}
                    <div className="flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            {isInitializing ? (
                                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            ) : (
                                verificationInfo.icon
                            )}
                        </div>
                    </div>

                    {/* Status Information */}
                    <div className="text-center space-y-3">
                        <h2 className="text-xl font-semibold text-white">
                            {verificationInfo.title}
                        </h2>
                        <p className="text-gray-300 text-sm">
                            {verificationInfo.description}
                        </p>
                    </div>

                    {/* FIXED: Trust Score Display with proper value handling */}
                    {!isInitializing && (
                        <div className="bg-black/20 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Current Trust Score</span>
                                <span className={`font-bold ${trustScoreInfo.color}`}>
                                    {currentTrustScore}/100
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000"
                                    style={{ width: `${Math.max(1, currentTrustScore)}%` }}
                                />
                            </div>
                            <p className="text-gray-500 text-xs text-center">
                                {trustScoreInfo.label} Security Level - Verification Required
                            </p>
                        </div>
                    )}

                    {/* Why am I here? */}
                    {!isInitializing && !isCompleting && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <Lock className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <h4 className="text-red-400 font-semibold text-sm">
                                        Why am I here?
                                    </h4>
                                    <p className="text-red-200/80 text-xs">
                                        Your trust score ({currentTrustScore}/100) is below the security threshold.
                                        {verificationType === 'biometric'
                                            ? " Biometric verification is required for accounts with very low trust scores."
                                            : " Captcha verification is required to ensure account security."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Verification Button */}
                    {!isInitializing && !isCompleting && verificationInfo.buttonAction && (
                        <button
                            className={`w-full px-6 py-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 text-lg ${verificationType === 'biometric'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:hover:bg-blue-600'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:hover:bg-yellow-600'
                                }`}
                            disabled={verificationInfo.buttonDisabled}
                            onClick={verificationInfo.buttonAction}
                        >
                            {verificationType === 'biometric' ? (
                                <Fingerprint size={24} />
                            ) : (
                                <Brain size={24} />
                            )}
                            <span>
                                {verificationStarted ? 'Starting...' : verificationInfo.buttonText}
                            </span>
                        </button>
                    )}

                    {/* Completion Progress */}
                    {isCompleting && (
                        <div className="space-y-3">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${completionProgress}%` }}
                                />
                            </div>
                            <p className="text-green-400 text-sm text-center">
                                {completionProgress}% Complete
                            </p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isInitializing && (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                    )}
                </div>

                {/* User Information */}
                {user && !isInitializing && (
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">
                            Verifying access for{" "}
                            <span className="text-white font-medium">
                                {user.first_name}
                                {user.last_name && ` ${user.last_name}`}
                            </span>
                        </p>
                        {/* FIXED: Display trust score in user info for debugging */}
                        {process.env.NODE_ENV === "development" && (
                            <p className="text-gray-600 text-xs mt-1">
                                Debug: Trust Score = {currentTrustScore}
                            </p>
                        )}
                    </div>
                )}

                {/* Security Notice */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="space-y-1">
                            <h4 className="text-yellow-400 font-semibold text-sm">
                                Security Notice
                            </h4>
                            <p className="text-gray-400 text-xs">
                                This verification process helps protect your account and ensures secure access to the application.
                                Verification requirements are based on your current trust score and recent activity patterns.
                                {verificationType === 'captcha' && " You have one attempt to complete the captcha within 15 seconds."}
                                {verificationType === 'biometric' && " You have one attempt to complete biometric authentication within 15 seconds."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Verification Modals */}
            <CaptchaModal
                isOpen={showCaptcha && verificationStarted && verificationType === 'captcha'}
                onSuccess={handleCaptchaSuccessWrapper}
                onFailure={handleCaptchaFailureWrapper}
            />

            <BiometricModal
                isOpen={showBiometric && verificationStarted && verificationType === 'biometric'}
                onSuccess={handleBiometricSuccessWrapper}
                onFailure={handleBiometricFailureWrapper}
            />
        </div>
    );
}