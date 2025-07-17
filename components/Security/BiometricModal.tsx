// src/components/Security/BiometricModal.tsx - Simplified version with restart instructions

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Fingerprint,
  Eye,
  Settings,
  Clock,
  AlertTriangle,
  Shield,
  RotateCcw,
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

type BiometricType = "finger" | "face" | "unknown";
type AuthPhase = "initializing" | "permission_required" | "auth" | "error";

const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onSuccess,
  onFailure,
  onClose,
  title = "Biometric Authentication Required",
  description = "Your trust score is very low. Please authenticate using biometrics to continue.",
}) => {
  const [biometricManager, setBiometricManager] = useState<any>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>("unknown");
  const [currentPhase, setCurrentPhase] = useState<AuthPhase>("initializing");
  const [authTimeRemaining, setAuthTimeRemaining] = useState(15000);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptMade, setAttemptMade] = useState(false);
  const [authTimerActive, setAuthTimerActive] = useState(false);

  const authTimeout = 15000; // 15 seconds for authentication

  // Initialize biometric manager
  useEffect(() => {
    if (!isOpen) {
      setCurrentPhase("initializing");
      setAuthTimeRemaining(15000);
      setError(null);
      setAttemptMade(false);
      setAuthTimerActive(false);
      setBiometricManager(null);
      setBiometricType("unknown");
      setIsAuthenticating(false);

      return;
    }

    const initBiometric = async () => {
      console.log("Initializing biometric authentication");

      if (typeof window === "undefined") return;

      const tg = window.Telegram?.WebApp;

      if (!tg?.BiometricManager) {
        console.log("BiometricManager not available");
        setError("Biometric authentication is not supported on this device");
        setCurrentPhase("error");
        setTimeout(() => {
          onFailure();
        }, 2000);

        return;
      }

      const manager = tg.BiometricManager;

      setBiometricManager(manager);

      // Initialize biometric manager
      manager.init(() => {
        console.log("BiometricManager initialized");
        setBiometricType(manager.biometricType || "unknown");

        if (!manager.isBiometricAvailable) {
          console.log("Biometric not available");
          setError("Biometric authentication is not available on this device");
          setCurrentPhase("error");
          setTimeout(() => {
            onFailure();
          }, 2000);

          return;
        }

        // Check if permission is already granted
        if (manager.isAccessGranted) {
          console.log(
            "Permission already granted, proceeding to authentication",
          );
          setCurrentPhase("auth");
          setAuthTimeRemaining(authTimeout);
          setAuthTimerActive(true);
        } else {
          console.log(
            "Permission not granted, showing permission required screen",
          );
          setCurrentPhase("permission_required");
        }
      });
    };

    initBiometric();
  }, [isOpen, onFailure, authTimeout]);

  // Authentication phase timer
  useEffect(() => {
    if (!authTimerActive || currentPhase !== "auth") return;

    const timer = setInterval(() => {
      setAuthTimeRemaining((prev) => {
        const newTime = prev - 100;

        if (newTime <= 0) {
          handleAuthTimeout();

          return 0;
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [authTimerActive, currentPhase]);

  const handleAuthTimeout = useCallback(() => {
    console.log("Authentication timeout");
    setAuthTimerActive(false);

    if (!attemptMade) {
      setError("Authentication timeout.");
      setAttemptMade(true);
      setCurrentPhase("error");
      setTimeout(() => {
        onFailure();
      }, 1000);
    }
  }, [attemptMade, onFailure]);

  const handleAuthenticate = useCallback(async () => {
    if (
      !biometricManager ||
      !biometricManager.isAccessGranted ||
      isAuthenticating ||
      attemptMade
    ) {
      return;
    }

    console.log("Starting biometric authentication");
    setIsAuthenticating(true);
    setAttemptMade(true);
    setError(null);

    const authStartTime = Date.now();

    try {
      biometricManager.authenticate(
        { reason: "Verify your identity to continue using the application" },
        async (success: boolean, token?: string) => {
          const authEndTime = Date.now();
          const completedInTime = authEndTime - authStartTime < authTimeout;

          try {
            const result = await validateSecureBiometric(
              success,
              completedInTime,
            );

            if (result.success) {
              onSuccess();
            } else {
              onFailure();
            }
          } catch (error) {
            console.error("Error validating biometric:", error);
            onFailure();
          }
        },
      );
    } catch (error) {
      console.error("Error during biometric authentication:", error);
      onFailure();
    }
  }, [
    biometricManager,
    isAuthenticating,
    attemptMade,
    authTimeout,
    onSuccess,
    onFailure,
  ]);

  const handleOpenSettings = useCallback(() => {
    if (biometricManager?.openSettings) {
      biometricManager.openSettings();
    }
  }, [biometricManager]);

  const handleRequestPermission = useCallback(() => {
    if (!biometricManager) return;

    try {
      biometricManager.requestAccess(
        { reason: "Security verification required for continued access" },
        (granted: boolean) => {
          console.log("Permission request result:", granted);
          if (granted) {
            // Permission granted, but user still needs to restart app
            // Show success message but keep on permission screen
          }
        },
      );
    } catch (error) {
      console.error("Error requesting biometric permission:", error);
    }
  }, [biometricManager]);

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
        {currentPhase === "initializing" ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
            </div>
            <p className="text-gray-400">
              Initializing biometric authentication...
            </p>
          </div>
        ) : currentPhase === "error" ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-300 text-sm">{error}</p>
            </div>

            {biometricManager?.openSettings && (
              <button
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                onClick={handleOpenSettings}
              >
                <Settings size={16} />
                <span>Open Biometric Settings</span>
              </button>
            )}

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-xs text-center">
                Your account will be temporarily blocked due to biometric
                authentication failure.
              </p>
            </div>
          </div>
        ) : currentPhase === "permission_required" ? (
          <div className="space-y-6">
            {/* Permission Required Section */}
            <div className="text-center">
              <div className="mb-4">
                <Shield className="text-yellow-400 mx-auto" size={48} />
              </div>
              <h3 className="text-white font-semibold mb-2">
                Biometric Permission Required
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                You need to grant biometric authentication permission to
                continue
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                Instructions:
              </h4>
              <div className="text-blue-200 text-sm space-y-1">
                <p>1. Tap &quot;Grant Permission&quot; or &quot;Open Settings&quot; below</p>
                <p>
                  2. Enable biometric authentication in your device settings
                </p>
                <p>
                  3. <strong>Restart the application</strong> to apply changes
                </p>
              </div>
            </div>

            {/* Restart Requirement Highlight */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <RotateCcw
                  className="text-orange-400 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <div>
                  <h4 className="text-orange-300 font-semibold mb-1 text-sm">
                    Application Restart Required
                  </h4>
                  <p className="text-orange-200 text-xs">
                    After granting biometric permission, you must close and
                    reopen the application for the changes to take effect. The
                    permission will not work until you restart.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Request Permission Button */}
              <button
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                onClick={handleRequestPermission}
              >
                <Shield size={20} />
                <span>Grant Permission</span>
              </button>

              {/* Settings Button */}
              {biometricManager?.openSettings && (
                <button
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  onClick={handleOpenSettings}
                >
                  <Settings size={16} />
                  <span>Open Biometric Settings</span>
                </button>
              )}
            </div>
          </div>
        ) : currentPhase === "auth" ? (
          <div className="space-y-6">
            {/* Authentication Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span
                className={`font-bold ${authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
              >
                {formatTime(authTimeRemaining)}
              </span>
              <span className="text-gray-500">remaining</span>
            </div>

            {/* Biometric Authentication Info */}
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="mb-3">{getBiometricIcon()}</div>
              <h3 className="text-white font-semibold mb-1">
                {getBiometricTypeName()} Authentication
              </h3>
              <p className="text-gray-400 text-sm">
                Touch the sensor or look at the camera to authenticate
              </p>
            </div>

            {/* Single Attempt Warning */}
            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Single attempt only - be careful!
              </p>
            </div>

            {/* Authentication Button */}
            <button
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
              disabled={
                isAuthenticating || authTimeRemaining === 0 || attemptMade
              }
              onClick={handleAuthenticate}
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

            {/* Authentication Progress */}
            {isAuthenticating && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  Please complete biometric authentication on your device
                </p>
              </div>
            )}
          </div>
        ) : null}

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
