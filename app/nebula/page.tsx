// src/app/nebula/page.tsx - Dedicated security verification page

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, CheckCircle2, Fingerprint } from "lucide-react";

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
    } = useSecurity();
    const t = useT();

    const [isInitializing, setIsInitializing] = useState(true);
    const [verificationStep, setVerificationStep] = useState<'loading' | 'captcha' | 'biometric' | 'completed' | 'blocked'>('loading');
    const [completionProgress, setCompletionProgress] = useState(0);

    // Check authentication and redirect if needed
    useEffect(() => {
        if (!isAuthenticated) {
            console.log("User not authenticated on Nebula page, redirecting to login");
            router.push("/");
            return;
        }
    }, [isAuthenticated, router]);

    // Initialize security check
    useEffect(() => {
        if (!isAuthenticated) return;

        const initializeSecurityCheck = async () => {
            try {
                console.log("Nebula Security: Initializing security verification...");
                setIsInitializing(true);

                // Perform security check
                const result = await checkSecurity();

                if (result.isBlocked) {
                    console.log("Nebula Security: User is blocked, redirecting to blocked page");
                    router.push("/blocked");
                    return;
                }

                // Determine verification step based on security requirements
                if (result.needsBiometric) {
                    console.log("Nebula Security: Biometric verification required");
                    setVerificationStep('biometric');
                } else if (result.needsCaptcha) {
                    console.log("Nebula Security: Captcha verification required");
                    setVerificationStep('captcha');
                } else {
                    console.log("Nebula Security: No verification required, proceeding to main");
                    setVerificationStep('completed');

                    // Simulate completion progress
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 20;
                        setCompletionProgress(progress);
                        if (progress >= 100) {
                            clearInterval(interval);
                            setTimeout(() => {
                                router.push("/main");
                            }, 500);
                        }
                    }, 100);
                }

                setIsInitializing(false);
            } catch (error) {
                console.error("Nebula Security: Error during initialization:", error);
                setIsInitializing(false);
                // On error, redirect to main page
                setTimeout(() => {
                    router.push("/main");
                }, 2000);
            }
        };

        initializeSecurityCheck();
    }, [isAuthenticated, checkSecurity, router]);

    // Handle successful verifications
    const handleSuccessfulVerification = useCallback(() => {
        console.log("Nebula Security: Verification successful, completing process");
        setVerificationStep('completed');

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
        console.log("Nebula Security: Verification failed, redirecting to blocked page");
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

    // Get verification type display information
    const getVerificationInfo = () => {
        switch (verificationStep) {
            case 'captcha':
                return {
                    title: "Security Verification Required",
                    description: "Your account requires additional verification to ensure security.",
                    icon: <Shield className="text-yellow-400" size={48} />,
                    color: "border-yellow-400/40 bg-yellow-500/10"
                };
            case 'biometric':
                return {
                    title: "Biometric Authentication Required",
                    description: "Your trust score requires biometric verification for secure access.",
                    icon: <Fingerprint className="text-blue-400" size={48} />,
                    color: "border-blue-400/40 bg-blue-500/10"
                };
            case 'completed':
                return {
                    title: "Verification Complete",
                    description: "Security verification successful. Redirecting to application...",
                    icon: <CheckCircle2 className="text-green-400" size={48} />,
                    color: "border-green-400/40 bg-green-500/10"
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
    const trustScoreInfo = formatTrustScore(securityState.trustScore);

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

                    {/* Trust Score Display */}
                    {!isInitializing && (
                        <div className="bg-black/20 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Trust Score</span>
                                <span className={`font-bold ${trustScoreInfo.color}`}>
                                    {securityState.trustScore}/100
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000"
                                    style={{ width: `${securityState.trustScore}%` }}
                                />
                            </div>
                            <p className="text-gray-500 text-xs text-center">
                                {trustScoreInfo.label} Security Level
                            </p>
                        </div>
                    )}

                    {/* Completion Progress */}
                    {verificationStep === 'completed' && (
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
                {user && (
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">
                            Verifying access for{" "}
                            <span className="text-white font-medium">
                                {user.first_name}
                                {user.last_name && ` ${user.last_name}`}
                            </span>
                        </p>
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
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Verification Modals */}
            <CaptchaModal
                isOpen={showCaptcha && verificationStep === 'captcha'}
                onSuccess={handleCaptchaSuccessWrapper}
                onFailure={handleCaptchaFailureWrapper}
            />

            <BiometricModal
                isOpen={showBiometric && verificationStep === 'biometric'}
                onSuccess={handleBiometricSuccessWrapper}
                onFailure={handleBiometricFailureWrapper}
            />
        </div>
    );
}