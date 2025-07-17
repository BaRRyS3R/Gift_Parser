// src/components/Security/CaptchaModal.tsx - Updated with single attempt and 15-second timer

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, RefreshCw, Clock, AlertTriangle } from "lucide-react";

import {
  generateSecureCaptcha,
  validateSecureCaptcha,
} from "@/lib/authService";

interface CaptchaModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

const CaptchaModal: React.FC<CaptchaModalProps> = ({
  isOpen,
  onSuccess,
  onFailure,
  onClose,
  title = "Security Verification",
  description = "Please complete the captcha to continue",
}) => {
  const [captchaData, setCaptchaData] = useState<{
    challenge: string;
    correctAnswer: string;
    expiresAt: number;
  } | null>(null);

  const [userInput, setUserInput] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptMade, setAttemptMade] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const maxAttempts = 1; // Updated: only 1 attempt
  const captchaTimeout = 15000; // Updated: 15 seconds

  // Generate captcha when modal opens
  useEffect(() => {
    if (isOpen && !captchaData) {
      generateCaptcha();
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!captchaData) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, captchaData.expiresAt - Date.now());

      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleTimeout();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [captchaData]);

  // Focus input when captcha is generated
  useEffect(() => {
    if (captchaData && inputRef.current) {
      inputRef.current.focus();
    }
  }, [captchaData]);

  const generateCaptcha = async () => {
    setIsLoading(true);
    setError(null);
    setUserInput("");
    setAttemptMade(false);

    try {
      const data = await generateSecureCaptcha();

      setCaptchaData(data);
      setTimeRemaining(captchaTimeout);
    } catch (error) {
      console.error("Error generating captcha:", error);
      setError("Failed to generate captcha. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!captchaData || !userInput.trim() || isValidating || attemptMade) return;

    setIsValidating(true);
    setError(null);
    setAttemptMade(true);

    const completedInTime = Date.now() < captchaData.expiresAt;

    try {
      const result = await validateSecureCaptcha(
        userInput.trim(),
        captchaData.correctAnswer,
        completedInTime,
      );

      if (result.success) {
        onSuccess();
      } else {
        // Since we only have 1 attempt, go directly to failure
        onFailure();
      }
    } catch (error) {
      console.error("Error validating captcha:", error);
      onFailure();
    } finally {
      setIsValidating(false);
    }
  };

  const handleTimeout = () => {
    if (!attemptMade) {
      setError("Time expired.");
      setAttemptMade(true);
      onFailure();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating && !attemptMade) {
      handleSubmit();
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Shield className="text-yellow-400" size={32} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {/* Captcha Display */}
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw
              className="text-blue-400 mx-auto animate-spin"
              size={32}
            />
            <p className="text-gray-400 mt-2">Generating captcha...</p>
          </div>
        ) : captchaData ? (
          <div className="space-y-4">
            {/* Captcha Code Display */}
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-white tracking-widest mb-2">
                {captchaData.challenge}
              </div>
              <p className="text-gray-400 text-xs">Enter the code above</p>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span
                className={`font-bold ${timeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
              >
                {formatTime(timeRemaining)}
              </span>
              <span className="text-gray-500">remaining</span>
            </div>

            {/* Input */}
            <div>
              <input
                ref={inputRef}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isValidating || timeRemaining === 0 || attemptMade}
                maxLength={10}
                placeholder="Enter answer"
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                <AlertTriangle
                  className="text-red-400 flex-shrink-0"
                  size={16}
                />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Single Attempt Warning */}
            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Single attempt only - be careful!
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                disabled={isLoading || isValidating || attemptMade}
                onClick={generateCaptcha}
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>

              <button
                className="flex-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                disabled={
                  !userInput.trim() || isValidating || timeRemaining === 0 || attemptMade
                }
                onClick={handleSubmit}
              >
                {isValidating ? (
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
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-400">Failed to load captcha</p>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              onClick={generateCaptcha}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Warning Message */}
        <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-xs text-center">
            Security verification required. Your account will be temporarily
            blocked if verification fails.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CaptchaModal;