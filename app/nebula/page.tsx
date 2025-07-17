// src/app/nebula/page.tsx - Complete fix for duplicate security checks and trust score display

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, CheckCircle2, Fingerprint, Brain, Lock } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSecurity } from "@/hooks/useSecurity";
import { useT } from "@/contexts/LocalizationContext";
import CaptchaModal from "@/components/Security/CaptchaModal";
import BiometricModal from "@/components/Security/BiometricModal";
import GyroscopeModal from "@/components/Security/GyroscopeModal";

export default function NebulaSecurityPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useUser();
    const {
        securityState,
        showCaptcha,
        showBiometric,
        showGyroscope,
        captchaData,
        handleCaptchaSuccess,
        handleCaptchaFailure,
        handleBiometricSuccess,
        handleBiometricFailure,
        handleGyroscopeFailure,
        handleGyroscopeSuccess,
        checkSecurity,
        formatTrustScore,
        startCaptchaVerification,
        startBiometricVerification,
        startGyroscopeVerification,
    } = useSecurity();
    const t = useT();

    const [isInitializing, setIsInitializing] = useState(true);
    const [verificationType, setVerificationType] = useState<'captcha' | 'biometric' | 'gyroscope' | null>(null);
    const [verificationStarted, setVerificationStarted] = useState(false);
    const [completionProgress, setCompletionProgress] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);

    // Single initialization flag to prevent multiple calls
    const initializationCompletedRef = React.useRef(false);
    const verificationStateRef = React.useRef<'captcha' | 'biometric' | 'gyroscope' | null>(null);

    // Check authentication and redirect if needed
    useEffect(() => {
        if (!isAuthenticated) {
            console.log("User not authenticated on Nebula page, redirecting to login");
            router.push("/");
            return;
        }
    }, [isAuthenticated, router]);

    // Single initialization effect - completely isolated from useSecurity
    useEffect(() => {
        if (!isAuthenticated || initializationCompletedRef.current) {
            return;
        }

        const performSingleSecurityCheck = async () => {
            try {
                console.log("Nebula Security: Starting single security verification check...");
                setIsInitializing(true);
                initializationCompletedRef.current = true;

                // Perform single security check with force flag to bypass cache
                const result = await checkSecurity(true);

                console.log("Nebula Security: Received security result:", {
                    trustScore: result.trustScore,
                    needsCaptcha: result.needsCaptcha,
                    needsBiometric: result.needsBiometric,
                    needsGyroscope: result.needsGyroscope,
                    isBlocked: result.isBlocked
                });

                // Handle blocked users immediately
                if (result.isBlocked) {
                    console.log("Nebula Security: User is blocked, redirecting to blocked page");
                    router.push("/blocked");
                    return;
                }

                // Determine verification requirements based on actual trust score
                const actualTrustScore = result.trustScore;
                const requiresGyroscope = actualTrustScore < 10;
                const requiresBiometric = actualTrustScore < 20 && !requiresGyroscope;
                const requiresCaptcha = actualTrustScore < 40 && !requiresBiometric && !requiresGyroscope;
                const requiresAnyVerification = requiresBiometric || requiresCaptcha || requiresGyroscope;

                console.log("Nebula Security: Verification requirements determined:", {
                    actualTrustScore,
                    requiresGyroscope,
                    requiresBiometric,
                    requiresCaptcha,
                    requiresAnyVerification
                });

                // If no verification is needed, redirect to main
                if (!requiresAnyVerification) {
                    console.log("Nebula Security: No verification required (trust score: " + actualTrustScore + "), redirecting to main");
                    router.push("/main");
                    return;
                }

                // Set verification type based on requirements
                if (requiresBiometric) {
                    console.log("Nebula Security: Biometric verification required (trust score: " + actualTrustScore + ")");
                    setVerificationType('biometric');
                    verificationStateRef.current = 'biometric';
                } else if (requiresCaptcha) {
                    console.log("Nebula Security: Captcha verification required (trust score: " + actualTrustScore + ")");
                    setVerificationType('captcha');
                    verificationStateRef.current = 'captcha';
                } else if (requiresGyroscope) {
                    console.log("Nebula Security: Gyroscope verification required (trust score: " + actualTrustScore + ")");
                    setVerificationType('gyroscope');
                    verificationStateRef.current = 'gyroscope';
                }

                setIsInitializing(false);

            } catch (error) {
                console.error("Nebula Security: Error during single security check:", error);
                setIsInitializing(false);

                // Handle authentication errors
                if (error instanceof Error && error.message.includes("not authenticated")) {
                    console.log("Nebula Security: Authentication error, redirecting to login");
                    router.push("/");
                    return;
                }

                // For other errors, use fallback logic based on current security state
                const fallbackTrustScore = securityState.trustScore;
                console.log("Nebula Security: Using fallback verification logic with trust score:", fallbackTrustScore);

                if (fallbackTrustScore > 0) {
                    if (fallbackTrustScore < 10) {
                        setVerificationType('gyroscope');
                        verificationStateRef.current = 'gyroscope';
                    } else if (fallbackTrustScore < 20) {
                        setVerificationType('biometric');
                        verificationStateRef.current = 'biometric';
                    } else if (fallbackTrustScore < 40) {
                        setVerificationType('captcha');
                        verificationStateRef.current = 'captcha';
                    } else {
                        console.log("Nebula Security: High trust score in fallback, redirecting to main");
                        router.push("/");
                        return;
                    }
                } else {
                    // If no trust score available, default to captcha
                    console.log("Nebula Security: No trust score available, defaulting to captcha");
                    setVerificationType('captcha');
                    verificationStateRef.current = 'captcha';
                }
            }
        };

        // Execute single check with minimal delay
        const timeoutId = setTimeout(performSingleSecurityCheck, 100);

        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, router, checkSecurity, securityState.trustScore]);

    // Handle successful verification completion
    const handleVerificationSuccess = useCallback(() => {
        console.log("Nebula Security: Verification successful, initiating completion sequence");
        setIsCompleting(true);
        setVerificationStarted(false);

        // Animate completion progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 25;
            setCompletionProgress(progress);

            if (progress >= 100) {
                clearInterval(progressInterval);
                setTimeout(() => {
                    console.log("Nebula Security: Completion sequence finished, redirecting to main");
                    router.push("/");
                }, 1000);
            }
        }, 150);
    }, [router]);

    // Handle verification failure
    const handleVerificationFailure = useCallback(() => {
        console.log("Nebula Security: Verification failed, redirecting to blocked page");
        setVerificationStarted(false);
        router.push("/blocked");
    }, [router]);

    // Enhanced success handlers with completion flow
    const handleGyroscopeSuccessWrapper = useCallback(() => {
        console.log("Nebyla Security: Gyroscope verification successful");
        handleGyroscopeSuccess();
        handleVerificationSuccess();
    }, [handleGyroscopeSuccess, handleVerificationSuccess]);

    const handleCaptchaSuccessWrapper = useCallback(() => {
        console.log("Nebula Security: Captcha verification successful");
        handleCaptchaSuccess();
        handleVerificationSuccess();
    }, [handleCaptchaSuccess, handleVerificationSuccess]);

    const handleBiometricSuccessWrapper = useCallback(() => {
        console.log("Nebula Security: Biometric verification successful");
        handleBiometricSuccess();
        handleVerificationSuccess();
    }, [handleBiometricSuccess, handleVerificationSuccess]);

    // Enhanced failure handlers
    const handleCaptchaFailureWrapper = useCallback(() => {
        console.log("Nebula Security: Captcha verification failed");
        handleCaptchaFailure();
        handleVerificationFailure();
    }, [handleCaptchaFailure, handleVerificationFailure]);

    const handleBiometricFailureWrapper = useCallback(() => {
        console.log("Nebula Security: Biometric verification failed");
        handleBiometricFailure();
        handleVerificationFailure();
    }, [handleBiometricFailure, handleVerificationFailure]);

    const handleGyroscopeFailureWrapper = useCallback(() => {
        console.log("Nebula Security: Gyroscope verification failed");
        handleGyroscopeFailure();
        handleVerificationFailure();
    }, [handleGyroscopeFailure, handleVerificationFailure]);

    // Captcha initiation with single-call protection
    const handleStartCaptcha = useCallback(async () => {
        if (verificationStarted) {
            console.log("Nebula Security: Captcha verification already in progress, ignoring request");
            return;
        }

        console.log("Nebula Security: Initiating captcha verification process");
        setVerificationStarted(true);

        try {
            await startCaptchaVerification();
            console.log("Nebula Security: Captcha verification started successfully");
        } catch (error) {
            console.error("Nebula Security: Failed to start captcha verification:", error);
            setVerificationStarted(false);
        }
    }, [startCaptchaVerification, verificationStarted]);

    // Biometric initiation with single-call protection
    const handleStartBiometric = useCallback(() => {
        if (verificationStarted) {
            console.log("Nebula Security: Biometric verification already in progress, ignoring request");
            return;
        }

        console.log("Nebula Security: Initiating biometric verification process");
        setVerificationStarted(true);

        try {
            startBiometricVerification();
            console.log("Nebula Security: Biometric verification started successfully");
        } catch (error) {
            console.error("Nebula Security: Failed to start biometric verification:", error);
            setVerificationStarted(false);
        }
    }, [startBiometricVerification, verificationStarted]);

    const handleStartGyroscope = useCallback(() => {
        if (verificationStarted) {
            console.log("Nebula Security: Gyroscope verification already in progress, ignoring request");
            return;
        }

        console.log("Nebula Security: Initiating gyroscope verification process");
        setVerificationStarted(true);

        try {
            startGyroscopeVerification();
            console.log("Nebula Security: Gyroscope verification started successfully");
        } catch (error) {
            console.error("Nebula Security: Failed to start gyroscope verification:", error);
            setVerificationStarted(false);
        }
    }, [startGyroscopeVerification, verificationStarted]);

    // Get verification display information
    const getVerificationDisplayInfo = () => {
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
                    buttonDisabled: verificationStarted
                };
            case 'biometric':
                return {
                    title: "Biometric Authentication Required",
                    description: "Your trust score is very low and requires biometric verification for secure access.",
                    icon: <Fingerprint className="text-blue-400" size={48} />,
                    color: "border-blue-400/40 bg-blue-500/10",
                    buttonText: "Start Biometric",
                    buttonAction: handleStartBiometric,
                    buttonDisabled: verificationStarted
                };
            case 'gyroscope':
                return {
                    title: "Gyroscope Authentication Required",
                    description: "Your trust score is very low and requires gyroscope verification for secure access.",
                    icon: <Fingerprint className="text-blue-400" size={48} />,
                    color: "border-blue-400/40 bg-blue-500/10",
                    buttonText: "Start Gyroscope",
                    buttonAction: handleStartGyroscope,
                    buttonDisabled: verificationStarted
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

    const verificationDisplayInfo = getVerificationDisplayInfo();

    // Use current trust score from security state - no defaults
    const currentTrustScore = securityState.trustScore;
    const trustScoreDisplay = formatTrustScore(currentTrustScore);

    // Early return for non-authenticated users
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                {/* Header Section */}
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
                <div className={`border rounded-2xl p-6 space-y-6 ${verificationDisplayInfo.color}`}>
                    {/* Status Icon */}
                    <div className="flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            {isInitializing ? (
                                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            ) : (
                                verificationDisplayInfo.icon
                            )}
                        </div>
                    </div>

                    {/* Status Information */}
                    <div className="text-center space-y-3">
                        <h2 className="text-xl font-semibold text-white">
                            {verificationDisplayInfo.title}
                        </h2>
                        <p className="text-gray-300 text-sm">
                            {verificationDisplayInfo.description}
                        </p>
                    </div>

                    {/* Trust Score Display - only show if we have a valid score */}
                    {!isInitializing && currentTrustScore > 0 && (
                        <div className="bg-black/20 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Current Trust Score</span>
                                <span className={`font-bold ${trustScoreDisplay.color}`}>
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
                                {trustScoreDisplay.label} Security Level - Verification Required
                            </p>
                        </div>
                    )}

                    {/* Verification Reason Explanation */}
                    {!isInitializing && !isCompleting && currentTrustScore > 0 && (
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

                    {/* Verification Action Button */}
                    {!isInitializing && !isCompleting && verificationDisplayInfo.buttonAction && (
                        <button
                            className={`w-full px-6 py-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-3 text-lg ${verificationType === 'biometric'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:hover:bg-blue-600'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:hover:bg-yellow-600'
                                }`}
                            disabled={verificationDisplayInfo.buttonDisabled}
                            onClick={verificationDisplayInfo.buttonAction}
                        >
                            {verificationType === 'biometric' ? (
                                <Fingerprint size={24} />
                            ) : (
                                <Brain size={24} />
                            )}
                            <span>
                                {verificationStarted ? 'Starting...' : verificationDisplayInfo.buttonText}
                            </span>
                        </button>
                    )}

                    {/* Completion Progress Display */}
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

                    {/* Initialization Loading State */}
                    {isInitializing && (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                    )}
                </div>

                {/* User Information Display */}
                {user && !isInitializing && (
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">
                            Verifying access for{" "}
                            <span className="text-white font-medium">
                                {user.first_name}
                                {user.last_name && ` ${user.last_name}`}
                            </span>
                        </p>
                        {/* Development debug information */}
                        {process.env.NODE_ENV === "development" && (
                            <p className="text-gray-600 text-xs mt-1">
                                Debug: Trust Score = {currentTrustScore}, Verification Type = {verificationType}
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
                                {verificationType === 'gyroscope' && " You have one attempt to complete gyroscope authentication within 15 seconds."}
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

            <GyroscopeModal
                isOpen={showGyroscope && verificationStarted && verificationType === 'gyroscope'}
                onSuccess={handleGyroscopeSuccessWrapper}
                onFailure={handleGyroscopeFailureWrapper}
            />
        </div>
    );
}