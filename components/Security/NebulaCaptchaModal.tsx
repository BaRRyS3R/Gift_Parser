// src/components/Security/NebulaCaptchaModal.tsx - Updated with attempt tracking

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Shield,
    RefreshCw,
    Clock,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";

interface NebulaCaptchaModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onFailure: () => void;
    onClose?: () => void;
    attemptId: string | null;
}

interface CaptchaChallenge {
    challenge: string;
    expiresAt: number;
}

interface CaptchaState {
    challenge: CaptchaChallenge | null;
    userInput: string;
    timeRemaining: number;
    isLoading: boolean;
    isValidating: boolean;
    error: string | null;
    attemptMade: boolean;
    isSuccess: boolean;
}

const NebulaCaptchaModal: React.FC<NebulaCaptchaModalProps> = ({
    isOpen,
    onSuccess,
    onFailure,
    onClose,
    attemptId,
}) => {
    const { makeAuthenticatedRequest } = useUser();
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<CaptchaState>({
        challenge: null,
        userInput: "",
        timeRemaining: 0,
        isLoading: false,
        isValidating: false,
        error: null,
        attemptMade: false,
        isSuccess: false,
    });

    // Generate captcha when modal opens
    useEffect(() => {
        if (isOpen && !state.challenge && !state.attemptMade && attemptId) {
            generateCaptcha();
        }

        // Cleanup timer on unmount or close
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isOpen, attemptId]);

    // Timer countdown
    useEffect(() => {
        if (state.challenge && state.timeRemaining > 0 && !state.attemptMade) {
            timerRef.current = setInterval(() => {
                setState((prev) => {
                    const newTimeRemaining = prev.timeRemaining - 100;

                    if (newTimeRemaining <= 0) {
                        handleTimeout();
                        return { ...prev, timeRemaining: 0 };
                    }

                    return { ...prev, timeRemaining: newTimeRemaining };
                });
            }, 100);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
    }, [state.challenge, state.timeRemaining, state.attemptMade]);

    // Focus input when captcha is generated
    useEffect(() => {
        if (state.challenge && inputRef.current && !state.attemptMade) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [state.challenge, state.attemptMade]);

    /**
     * Generate captcha challenge
     */
    const generateCaptcha = async () => {
        if (!attemptId) {
            setState((prev) => ({
                ...prev,
                error: "No verification attempt ID provided",
            }));
            return;
        }

        setState((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            userInput: "",
        }));

        try {
            const response = await makeAuthenticatedRequest("/api/nebula/captcha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "generate" }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to generate captcha");
            }

            const timeRemaining = result.expiresAt - Date.now();

            setState((prev) => ({
                ...prev,
                challenge: {
                    challenge: result.challenge,
                    expiresAt: result.expiresAt,
                },
                timeRemaining: Math.max(0, timeRemaining),
                isLoading: false,
            }));
        } catch (error) {
            console.error("Error generating captcha:", error);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error:
                    error instanceof Error ? error.message : "Failed to generate captcha",
            }));
        }
    };

    /**
     * Submit captcha answer
     */
    const handleSubmit = async () => {
        if (
            !state.challenge ||
            !state.userInput.trim() ||
            state.isValidating ||
            state.attemptMade ||
            !attemptId
        ) {
            return;
        }

        setState((prev) => ({
            ...prev,
            isValidating: true,
            error: null,
            attemptMade: true,
        }));

        const completedInTime = Date.now() < state.challenge.expiresAt;

        try {
            const response = await makeAuthenticatedRequest("/api/nebula/captcha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "validate",
                    userAnswer: state.userInput.trim(),
                    challenge: state.challenge.challenge,
                    completedInTime,
                    attemptId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Verification failed");
            }

            if (result.verified && result.trustRestored) {
                console.log("Captcha verification successful");
                setState((prev) => ({
                    ...prev,
                    isValidating: false,
                    isSuccess: true,
                }));

                // Show success state briefly before calling onSuccess
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            } else if (result.blocked) {
                console.log("Captcha verification failed, user blocked");
                setState((prev) => ({
                    ...prev,
                    isValidating: false,
                    error: result.blockReason || "Verification failed",
                }));

                // Call onFailure after showing error
                setTimeout(() => {
                    onFailure();
                }, 2000);
            } else {
                throw new Error("Unexpected verification result");
            }
        } catch (error) {
            console.error("Error validating captcha:", error);
            setState((prev) => ({
                ...prev,
                isValidating: false,
                error: error instanceof Error ? error.message : "Verification failed",
            }));

            setTimeout(() => {
                onFailure();
            }, 2000);
        }
    };

    /**
     * Handle timeout
     */
    const handleTimeout = () => {
        if (!state.attemptMade) {
            setState((prev) => ({
                ...prev,
                error: "Time expired",
                attemptMade: true,
            }));

            setTimeout(() => {
                onFailure();
            }, 1000);
        }
    };

    /**
     * Handle key press
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !state.isValidating && !state.attemptMade) {
            handleSubmit();
        }
    };

    /**
     * Format time remaining
     */
    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    /**
     * Reset state when modal closes
     */
    useEffect(() => {
        if (!isOpen) {
            setState({
                challenge: null,
                userInput: "",
                timeRemaining: 0,
                isLoading: false,
                isValidating: false,
                error: null,
                attemptMade: false,
                isSuccess: false,
            });

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                            {state.isSuccess ? (
                                <CheckCircle2 className="text-green-400" size={32} />
                            ) : (
                                <Shield className="text-yellow-400" size={32} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {state.isSuccess ? "Verification Successful" : "Security Challenge"}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {state.isSuccess
                            ? "Your identity has been verified successfully"
                            : "Complete the challenge to verify your identity"}
                    </p>
                </div>

                {/* Success State */}
                {state.isSuccess ? (
                    <div className="text-center py-4">
                        <p className="text-green-300 text-sm mb-4">
                            Your trust score has been restored. Redirecting to the application...
                        </p>
                        <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    <>
                        {/* No Attempt ID Warning */}
                        {!attemptId && (
                            <div className="text-center py-4">
                                <p className="text-red-400">No verification attempt found</p>
                                <button
                                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                                    onClick={onFailure}
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        {/* Captcha Display */}
                        {attemptId && (
                            <>
                                {state.isLoading ? (
                                    <div className="text-center py-8">
                                        <RefreshCw className="text-blue-400 mx-auto animate-spin" size={32} />
                                        <p className="text-gray-400 mt-2">Generating challenge...</p>
                                    </div>
                                ) : state.challenge ? (
                                    <div className="space-y-4">
                                        {/* Challenge Code Display */}
                                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-mono font-bold text-white tracking-widest mb-2">
                                                {state.challenge.challenge}
                                            </div>
                                            <p className="text-gray-400 text-xs">
                                                Enter the result of this calculation
                                            </p>
                                        </div>

                                        {/* Timer */}
                                        <div className="flex items-center justify-center space-x-2 text-sm">
                                            <Clock className="text-orange-400" size={16} />
                                            <span
                                                className={`font-bold ${state.timeRemaining < 5000
                                                        ? "text-red-400"
                                                        : "text-orange-400"
                                                    }`}
                                            >
                                                {formatTime(state.timeRemaining)}
                                            </span>
                                            <span className="text-gray-500">remaining</span>
                                        </div>

                                        {/* Input */}
                                        <div>
                                            <input
                                                ref={inputRef}
                                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={
                                                    state.isValidating ||
                                                    state.timeRemaining === 0 ||
                                                    state.attemptMade
                                                }
                                                maxLength={10}
                                                placeholder="Enter answer"
                                                type="text"
                                                value={state.userInput}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9-]/g, "");
                                                    setState((prev) => ({ ...prev, userInput: value }));
                                                }}
                                                onKeyPress={handleKeyPress}
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {state.error && (
                                            <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                                                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                                                <p className="text-red-300 text-sm">{state.error}</p>
                                            </div>
                                        )}

                                        {/* Single Attempt Warning */}
                                        <div className="text-center">
                                            <p className="text-gray-500 text-xs">
                                                Single attempt only - calculate carefully!
                                            </p>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="pt-2">
                                            <button
                                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                                disabled={
                                                    !state.userInput.trim() ||
                                                    state.isValidating ||
                                                    state.timeRemaining === 0 ||
                                                    state.attemptMade
                                                }
                                                onClick={handleSubmit}
                                            >
                                                {state.isValidating ? (
                                                    <>
                                                        <RefreshCw className="animate-spin" size={16} />
                                                        <span>Verifying...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield size={16} />
                                                        <span>Verify Answer</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-red-400">Failed to load challenge</p>
                                        <button
                                            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                                            onClick={generateCaptcha}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Warning Message */}
                {!state.isSuccess && attemptId && (
                    <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-xs text-center">
                            Security verification required due to low trust score. Your account will be temporarily blocked if verification fails.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NebulaCaptchaModal;