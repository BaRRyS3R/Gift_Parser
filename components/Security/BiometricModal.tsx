// src/components/Security/BiometricModal.tsx - Biometric authentication modal

"use client";

import React, { useState, useEffect } from "react";
import {
  Fingerprint,
  Eye,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { validateSecureBiometric } from "@/lib/authService";

interface BiometricModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onSuccess,
  onFailure,
  onClose,
  title = "Biometric Verification",
  description = "Please authenticate using your device biometrics",
}) => {
  const [biometricManager, setBiometricManager] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [biometricType, setBiometricType] = useState<
    "finger" | "face" | "unknown"
  >("unknown");

  const maxAttempts = 3;
  const authTimeout = 30000; // 30 seconds
  const startTime = Date.now();

  // Initialize biometric manager
  useEffect(() => {
    if (!isOpen) return;

    const initBiometric = async () => {
      if (typeof window === "undefined") return;

      const tg = window.Telegram?.WebApp;
      if (!tg?.BiometricManager) {
        setError("Biometric authentication is not available on this device");
        return;
      }

      const manager = tg.BiometricManager;
      setBiometricManager(manager);

      // Initialize biometric manager
      manager.init(() => {
        setIsInitialized(true);
        setIsSupported(manager.isBiometricAvailable);
        setBiometricType(manager.biometricType || "unknown");

        if (!manager.isBiometricAvailable) {
          setError("Biometric authentication is not available on this device");
        } else if (!manager.isAccessGranted) {
          // Request access if not granted
          manager.requestAccess(
            { reason: "Security verification required for continued access" },
            (granted: boolean) => {
              if (!granted) {
                setError(
                  "Biometric access denied. Please enable biometric authentication in settings.",
                );
              }
            },
          );
        }
      });
    };

    initBiometric();
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, authTimeout - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleTimeout();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, isInitialized]);

  const handleAuthenticate = async () => {
    if (!biometricManager || !isSupported || isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    const authStartTime = Date.now();

    try {
      biometricManager.authenticate(
        { reason: "Verify your identity to continue using the application" },
        async (success: boolean, token?: string) => {
          const authEndTime = Date.now();
          const completedInTime = authEndTime - startTime < authTimeout;

          try {
            const result = await validateSecureBiometric(
              success,
              completedInTime,
            );

            if (result.success) {
              onSuccess();
            } else {
              const newAttempts = attempts + 1;
              setAttempts(newAttempts);

              if (newAttempts >= maxAttempts) {
                onFailure();
              } else {
                setError(
                  `Authentication failed. ${maxAttempts - newAttempts} attempts remaining.`,
                );
                setIsAuthenticating(false);
              }
            }
          } catch (error) {
            console.error("Error validating biometric:", error);
            setError("Validation failed. Please try again.");
            setIsAuthenticating(false);
          }
        },
      );
    } catch (error) {
      console.error("Error during biometric authentication:", error);
      setError("Authentication failed. Please try again.");
      setIsAuthenticating(false);
    }
  };

  const handleTimeout = () => {
    setError("Authentication timeout. Please try again.");
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= maxAttempts) {
      onFailure();
    } else {
      setIsAuthenticating(false);
    }
  };

  const handleOpenSettings = () => {
    if (biometricManager?.openSettings) {
      biometricManager.openSettings();
    }
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case "finger":
        return <Fingerprint className="text-blue-400" size={48} />;
      case "face":
        return <Eye className="text-blue-400" size={48} />;
      default:
        return <Fingerprint className="text-blue-400" size={48} />;
    }
  };

  const getBiometricTypeName = () => {
    switch (biometricType) {
      case "finger":
        return "Fingerprint";
      case "face":
        return "Face ID";
      default:
        return "Biometric";
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
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
              {getBiometricIcon()}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {/* Content */}
        {!isInitialized ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
            </div>
            <p className="text-gray-400">
              Initializing biometric authentication...
            </p>
          </div>
        ) : !isSupported || error ? (
          <div className="text-center space-y-4">
            {/* Error Display */}
            <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-300 text-sm">
                {error || "Biometric authentication not available"}
              </p>
            </div>

            {/* Settings Button */}
            {biometricManager?.openSettings && (
              <button
                onClick={handleOpenSettings}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Settings size={16} />
                <span>Open Biometric Settings</span>
              </button>
            )}

            {/* Fallback Message */}
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-xs text-center">
                If biometric authentication is not available, your account will
                be temporarily blocked for security reasons.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span
                className={`font-bold ${timeRemaining < 10000 ? "text-red-400" : "text-orange-400"}`}
              >
                {formatTime(timeRemaining)}
              </span>
              <span className="text-gray-500">remaining</span>
            </div>

            {/* Biometric Info */}
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="mb-3">{getBiometricIcon()}</div>
              <h3 className="text-white font-semibold mb-1">
                {getBiometricTypeName()} Authentication
              </h3>
              <p className="text-gray-400 text-sm">
                Touch the sensor or look at the camera to authenticate
              </p>
            </div>

            {/* Attempts Counter */}
            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Attempt {attempts + 1} of {maxAttempts}
              </p>
            </div>

            {/* Authentication Button */}
            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating || timeRemaining === 0}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
            >
              {isAuthenticating ? (
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

            {/* Success/Error States */}
            {isAuthenticating && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  Please complete biometric authentication on your device
                </p>
              </div>
            )}
          </div>
        )}

        {/* Warning Message */}
        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-xs text-center">
            Biometric verification required due to low trust score. Your account
            will be blocked if verification fails.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BiometricModal;
