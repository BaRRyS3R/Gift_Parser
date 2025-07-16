// src/components/Security/UnifiedSecurityModal.tsx - Унифицированный компонент для всех типов верификации

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, Fingerprint, Eye, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface SecurityChallenge {
    question: string;
    expectedAnswer: string;
}

interface UnifiedSecurityModalProps {
    isOpen: boolean;
    method: "interactive" | "biometric";
    challenge?: SecurityChallenge;
    onSubmit: (input: string | boolean) => Promise<void>;
    onSuccess?: () => void;
    onFailure?: () => void;
    onClose?: () => void;
}

const UnifiedSecurityModal: React.FC<UnifiedSecurityModalProps> = ({
    isOpen,
    method,
    challenge,
    onSubmit,
    onSuccess,
    onFailure,
    onClose
}) => {
    const [userInput, setUserInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(30000); // 30 seconds
    const [error, setError] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const maxAttempts = 3;
    const verificationTimeout = 30000; // 30 seconds
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        if (isOpen) {
            startTimeRef.current = Date.now();
            setTimeRemaining(verificationTimeout);
            setAttempts(0);
            setError(null);
            setUserInput("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, verificationTimeout - elapsed);
            setTimeRemaining(remaining);

            if (remaining === 0) {
                handleTimeout();
            }
        }, 100);

        return () => clearInterval(timer);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && method === "interactive" && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, method]);

    const handleTimeout = async () => {
        setError("Verification timeout. Please try again.");
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
            onFailure?.();
        } else {
            setIsProcessing(false);
        }
    };

    const handleInteractiveSubmit = async () => {
        if (!userInput.trim() || isProcessing || !challenge) return;

        setIsProcessing(true);
        setError(null);

        try {
            await onSubmit(userInput.trim());
            onSuccess?.();
        } catch (error) {
            console.error("Interactive verification failed:", error);
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= maxAttempts) {
                onFailure?.();
            } else {
                setError(`Incorrect answer. ${maxAttempts - newAttempts} attempts remaining.`);
                setUserInput("");
                setIsProcessing(false);
            }
        }
    };

    const handleBiometricSubmit = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (typeof window !== "undefined" && window.Telegram?.WebApp?.BiometricManager) {
                const biometricManager = window.Telegram.WebApp.BiometricManager;

                biometricManager.init(() => {
                    if (!biometricManager.isBiometricAvailable) {
                        setError("Biometric authentication is not available on this device");
                        setIsProcessing(false);
                        return;
                    }

                    biometricManager.authenticate(
                        { reason: "Verify your identity to continue using the application" },
                        async (success: boolean, token?: string) => {
                            try {
                                await onSubmit(success);
                                if (success) {
                                    onSuccess?.();
                                } else {
                                    throw new Error("Biometric authentication failed");
                                }
                            } catch (error) {
                                console.error("Biometric verification failed:", error);
                                const newAttempts = attempts + 1;
                                setAttempts(newAttempts);

                                if (newAttempts >= maxAttempts) {
                                    onFailure?.();
                                } else {
                                    setError(`Authentication failed. ${maxAttempts - newAttempts} attempts remaining.`);
                                    setIsProcessing(false);
                                }
                            }
                        },
                    );
                });
            } else {
                setTimeout(async () => {
                    try {
                        const simulatedResult = Math.random() > 0.3;
                        await onSubmit(simulatedResult);
                        if (simulatedResult) {
                            onSuccess?.();
                        } else {
                            throw new Error("Simulated biometric failure");
                        }
                    } catch (error) {
                        console.error("Simulated biometric verification failed:", error);
                        const newAttempts = attempts + 1;
                        setAttempts(newAttempts);

                        if (newAttempts >= maxAttempts) {
                            onFailure?.();
                        } else {
                            setError(`Authentication failed. ${maxAttempts - newAttempts} attempts remaining.`);
                            setIsProcessing(false);
                        }
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Error during biometric authentication:", error);
            setError("Authentication failed. Please try again.");
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && method === "interactive" && !isProcessing) {
            handleInteractiveSubmit();
        }
    };

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const getBiometricIcon = () => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.BiometricManager) {
            const biometricType = window.Telegram.WebApp.BiometricManager.biometricType;
            switch (biometricType) {
                case "finger":
                    return <Fingerprint className="text-blue-400" size={48} />;
                case "face":
                    return <Eye className="text-blue-400" size={48} />;
                default:
                    return <Fingerprint className="text-blue-400" size={48} />;
            }
        }
        return <Fingerprint className="text-blue-400" size={48} />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {method === "interactive" ? (
                                <Shield className="text-blue-400" size={32} />
                            ) : (
                                getBiometricIcon()
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Security Verification
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {method === "interactive"
                            ? "Please solve the mathematical challenge below"
                            : "Please complete biometric authentication"
                        }
                    </p>
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm mb-6">
                    <Clock className="text-orange-400" size={16} />
                    <span
                        className={`font-bold ${timeRemaining < 10000 ? "text-red-400" : "text-orange-400"}`}
                    >
                        {formatTime(timeRemaining)}
                    </span>
                    <span className="text-gray-500">remaining</span>
                </div>

                {method === "interactive" && challenge ? (
                    <div className="space-y-4">
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="text-2xl font-mono font-bold text-white mb-2">
                                {challenge.question}
                            </div>
                            <p className="text-gray-400 text-xs">Enter the answer above</p>
                        </div>

                        <input
                            ref={inputRef}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            disabled={isProcessing || timeRemaining === 0}
                            placeholder="Enter answer"
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />

                        {error && (
                            <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                Attempt {attempts + 1} of {maxAttempts}
                            </p>
                        </div>

                        <button
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            disabled={!userInput.trim() || isProcessing || timeRemaining === 0}
                            onClick={handleInteractiveSubmit}
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <Shield size={16} />
                                    <span>Verify</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="mb-3">{getBiometricIcon()}</div>
                            <h3 className="text-white font-semibold mb-1">
                                Biometric Authentication
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Touch the sensor or look at the camera to authenticate
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="text-center">
                            <p className="text-gray-500 text-xs">
                                Attempt {attempts + 1} of {maxAttempts}
                            </p>
                        </div>

                        <button
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
                            disabled={isProcessing || timeRemaining === 0}
                            onClick={handleBiometricSubmit}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <Fingerprint size={20} />
                                    <span>Authenticate</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-xs text-center">
                        Security verification required due to system policies. Your account
                        will be temporarily blocked if verification fails.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnifiedSecurityModal;