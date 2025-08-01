// src/components/EasterEggs/BinaryEasterEgg.tsx

"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/react";
import { Check, X } from "lucide-react";

interface BinaryEasterEggProps {
    isVisible: boolean;
    onClose: () => void;
    makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function BinaryEasterEgg({ isVisible, onClose, makeAuthenticatedRequest }: BinaryEasterEggProps) {
    const [binaryString, setBinaryString] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [resultMessage, setResultMessage] = useState<string>("");
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    // Haptic feedback helper
    const triggerHaptic = () => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
            } catch (error) {
                // Fallback for non-Telegram environments
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        }
    };

    // Handle binary digit click (0 or 1)
    const handleBinaryClick = (digit: "0" | "1") => {
        triggerHaptic();
        setBinaryString(prev => prev + digit);
        setResultMessage(""); // Clear any previous messages
    };

    // Handle check button click
    const handleCheck = async () => {
        if (binaryString.length === 0) {
            setResultMessage("Enter some binary digits first!");
            return;
        }

        setIsSubmitting(true);
        triggerHaptic();

        try {
            const response = await makeAuthenticatedRequest('/api/easter-egg/binary-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ binaryString }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Binary check failed");
            }

            if (data.success) {
                setIsSuccess(true);
                setResultMessage(data.message);
                // Success haptic feedback
                if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                    try {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
                    } catch (error) {
                        if (navigator.vibrate) {
                            navigator.vibrate([100, 50, 100]);
                        }
                    }
                }
            } else {
                setIsSuccess(false);
                setResultMessage(data.error);
                // Clear the binary string for retry
                setBinaryString("");
                // Error haptic feedback
                if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                    try {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
                    } catch (error) {
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Binary check error:', error);
            setResultMessage("Network error. Try again!");
            setIsSuccess(false);
            setBinaryString("");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle close
    const handleClose = () => {
        triggerHaptic();
        setBinaryString("");
        setResultMessage("");
        setIsSuccess(false);
        onClose();
    };

    // Copy success message to clipboard
    const handleCopyMessage = async () => {
        if (isSuccess && resultMessage) {
            try {
                await navigator.clipboard.writeText(resultMessage);
                triggerHaptic();
                // Could add a temporary "Copied!" indicator here
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="w-full animate-fade-in-up">
            {/* Easter egg container */}
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6 relative">
                {/* Close button */}
                <button
                    onTouchEnd={handleClose}
                    className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors touch-manipulation"
                    aria-label="Close easter egg"
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                >
                    <X size={16} />
                </button>

                {/* Binary input area */}
                <div className="space-y-4">
                    {/* Binary circles */}
                    <div className="flex items-center justify-center space-x-4">
                        <button
                            onTouchEnd={() => handleBinaryClick("0")}
                            disabled={isSubmitting}
                            type="button"
                            aria-label="Add binary 0"
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black font-bold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                            style={{ touchAction: 'manipulation' }}
                        >
                            0
                        </button>
                        <button
                            onTouchEnd={() => handleBinaryClick("1")}
                            disabled={isSubmitting}
                            type="button"
                            aria-label="Add binary 1"
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black font-bold text-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                            style={{ touchAction: 'manipulation' }}
                        >
                            1
                        </button>
                    </div>

                    {/* Check button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={handleCheck}
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                            type="button"
                            aria-label="Check binary sequence"
                            className="bg-white/20 text-white border border-white/40 hover:bg-white/30"
                            style={{ touchAction: 'manipulation' }}
                            startContent={!isSubmitting ? <Check size={16} /> : null}
                        >
                            {isSubmitting ? "Checking..." : "Check"}
                        </Button>
                    </div>

                    {/* Visual feedback for testing - REMOVE LATER */}
                    {binaryString && (
                        <div className="text-center">
                            <div className="text-white/70 text-sm">Current string:</div>
                            <div className="text-white font-mono text-lg break-all">
                                {binaryString}
                            </div>
                            <div className="text-white/50 text-xs">
                                Length: {binaryString.length}
                            </div>
                        </div>
                    )}

                    {/* Result message */}
                    {resultMessage && (
                        <div className="text-center">
                            {isSuccess ? (
                                <button
                                    className="w-full p-3 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                                    onTouchEnd={handleCopyMessage}
                                    type="button"
                                    aria-label="Copy success message"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    {resultMessage}
                                    <div className="text-green-300/80 text-xs mt-1">
                                        Tap to copy
                                    </div>
                                </button>
                            ) : (
                                <div className="p-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40">
                                    {resultMessage}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}