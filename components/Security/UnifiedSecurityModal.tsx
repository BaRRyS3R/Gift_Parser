// src/components/Security/UnifiedSecurityModal.tsx - Единый компонент для всех типов верификации
"use client";

import React, { useState, useEffect } from "react";
import { Shield, Fingerprint, AlertTriangle } from "lucide-react";

interface UnifiedSecurityModalProps {
    isOpen: boolean;
    method: "interactive" | "biometric";
    challenge?: {
        question: string;
        expectedAnswer: string;
    };
    onSubmit: (input: any) => void;
    onClose?: () => void;
}

const UnifiedSecurityModal: React.FC<UnifiedSecurityModalProps> = ({
    isOpen,
    method,
    challenge,
    onSubmit,
    onClose
}) => {
    const [userInput, setUserInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async () => {
        if (isProcessing) return;

        setIsProcessing(true);

        if (method === "interactive") {
            onSubmit(userInput);
        } else {
            // Симуляция биометрической аутентификации
            setTimeout(() => {
                onSubmit(Math.random() > 0.5); // Случайный результат для демонстрации
            }, 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                            {method === "interactive" ? (
                                <Shield className="text-blue-400" size={32} />
                            ) : (
                                <Fingerprint className="text-blue-400" size={32} />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Security Verification
                    </h2>
                </div>

                {method === "interactive" && challenge ? (
                    <div className="space-y-4">
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                            <div className="text-2xl font-mono font-bold text-white mb-2">
                                {challenge.question}
                            </div>
                        </div>

                        <input
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center"
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Enter answer"
                        />

                        <button
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                            disabled={!userInput.trim() || isProcessing}
                            onClick={handleSubmit}
                        >
                            {isProcessing ? "Verifying..." : "Verify"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-400 mb-4">
                                Please complete biometric authentication
                            </p>
                            <button
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                                disabled={isProcessing}
                                onClick={handleSubmit}
                            >
                                {isProcessing ? "Authenticating..." : "Authenticate"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedSecurityModal;