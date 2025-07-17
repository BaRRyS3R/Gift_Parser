// src/components/Security/BiometricModal.tsx - Fixed phase transition logic

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Fingerprint, Eye, Settings, Clock, AlertTriangle, Shield } from "lucide-react";

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
type AuthPhase = "initializing" | "permission" | "auth" | "error";

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

  // Phase management
  const [currentPhase, setCurrentPhase] = useState<AuthPhase>("initializing");
  const [permissionTimeRemaining, setPermissionTimeRemaining] = useState(30000);
  const [authTimeRemaining, setAuthTimeRemaining] = useState(15000);

  // State flags
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptMade, setAttemptMade] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionTimerActive, setPermissionTimerActive] = useState(false);
  const [authTimerActive, setAuthTimerActive] = useState(false);

  const permissionTimeout = 30000; // 30 seconds for permission
  const authTimeout = 15000; // 15 seconds for authentication

  // Stable callback for permission timeout
  const handlePermissionTimeout = useCallback(() => {
    console.log("Permission timeout triggered");
    setPermissionTimerActive(false);

    // Check final permission status after timer expires
    if (biometricManager?.isAccessGranted) {
      console.log("Permission granted, transitioning to auth phase");
      setCurrentPhase("auth");
      setAuthTimeRemaining(authTimeout);
      setAuthTimerActive(true);
    } else {
      console.log("Permission not granted, showing error");
      setError("Biometric access not granted within time limit.");
      setCurrentPhase("error");
      setTimeout(() => {
        onFailure();
      }, 2000);
    }
  }, [biometricManager, authTimeout, onFailure]);

  // Stable callback for auth timeout
  const handleAuthTimeout = useCallback(() => {
    console.log("Auth timeout triggered");
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

  // Initialize biometric manager
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentPhase("initializing");
      setPermissionTimeRemaining(30000);
      setAuthTimeRemaining(15000);
      setError(null);
      setAttemptMade(false);
      setPermissionRequested(false);
      setPermissionTimerActive(false);
      setAuthTimerActive(false);
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
          console.log("Permission already granted, going to auth phase");
          setCurrentPhase("auth");
          setAuthTimeRemaining(authTimeout);
          setAuthTimerActive(true);
        } else {
          console.log("Permission not granted, starting permission phase");
          setCurrentPhase("permission");
          setPermissionTimeRemaining(permissionTimeout);
          setPermissionTimerActive(true);
          // Automatically request permission
          requestBiometricPermission();
        }
      });
    };

    initBiometric();
  }, [isOpen, onFailure, permissionTimeout, authTimeout]);

  // Permission phase timer
  useEffect(() => {
    if (!permissionTimerActive || currentPhase !== "permission") return;

    const timer = setInterval(() => {
      setPermissionTimeRemaining(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          handlePermissionTimeout();
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [permissionTimerActive, currentPhase, handlePermissionTimeout]);

  // Authentication phase timer
  useEffect(() => {
    if (!authTimerActive || currentPhase !== "auth") return;

    const timer = setInterval(() => {
      setAuthTimeRemaining(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          handleAuthTimeout();
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [authTimerActive, currentPhase, handleAuthTimeout]);

  const requestBiometricPermission = useCallback(async () => {
    if (!biometricManager) {
      console.log("BiometricManager not available for permission request");
      return;
    }

    if (permissionRequested) {
      console.log("Permission already requested, skipping");
      return;
    }

    console.log("Requesting biometric permission");
    setPermissionRequested(true);
    setError(null);

    try {
      biometricManager.requestAccess(
        { reason: "Security verification required for continued access" },
        (granted: boolean) => {
          console.log("Permission callback received:", granted);
          if (granted) {
            console.log("Permission granted immediately, transitioning to auth");
            setPermissionTimerActive(false);
            setCurrentPhase("auth");
            setAuthTimeRemaining(authTimeout);
            setAuthTimerActive(true);
          }
          // If not granted, continue waiting for timer
        },
      );
    } catch (error) {
      console.error("Error requesting biometric permission:", error);
      // Continue waiting for timer, don't fail immediately
    }
  }, [biometricManager, permissionRequested, authTimeout]);

  const handleAuthenticate = useCallback(async () => {
    if (!biometricManager || !biometricManager.isAccessGranted || isAuthenticating || attemptMade) {
      console.log("Cannot authenticate:", {
        hasManager: !!biometricManager,
        hasAccess: biometricManager?.isAccessGranted,
        isAuthenticating,
        attemptMade
      });
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

          console.log("Authentication callback received:", {
            success,
            completedInTime,
            duration: authEndTime - authStartTime
          });

          try {
            const result = await validateSecureBiometric(success, completedInTime);
            console.log("Validation result:", result);

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
  }, [biometricManager, isAuthenticating, attemptMade, authTimeout, onSuccess, onFailure]);

  const handleOpenSettings = useCallback(() => {
    if (biometricManager?.openSettings) {
      console.log("Opening biometric settings");
      biometricManager.openSettings();
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
                Your account will be temporarily blocked due to biometric authentication failure.
              </p>
            </div>
          </div>
        ) : currentPhase === "permission" ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4">
                <Shield className="text-yellow-400 mx-auto" size={48} />
              </div>
              <h3 className="text-white font-semibold mb-2">
                Permission Required
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Please grant access to biometric authentication to continue
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="text-blue-400" size={16} />
                <span className="text-gray-300 text-sm">Time to grant permission</span>
              </div>
              <div className="text-2xl font-bold text-blue-400 font-mono">
                {formatTime(permissionTimeRemaining)}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm text-center">
                {permissionRequested
                  ? "Please check your device for biometric permission request"
                  : "Requesting biometric permission..."
                }
              </p>
            </div>

            <div className="space-y-3">
              {biometricManager?.openSettings && (
                <button
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  onClick={handleOpenSettings}
                >
                  <Settings size={16} />
                  <span>Open Biometric Settings</span>
                </button>
              )}

              {permissionRequested && (
                <button
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  onClick={() => {
                    setPermissionRequested(false);
                    requestBiometricPermission();
                  }}
                >
                  <Shield size={20} />
                  <span>Request Permission Again</span>
                </button>
              )}
            </div>
          </div>
        ) : currentPhase === "auth" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span
                className={`font-bold ${authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
              >
                {formatTime(authTimeRemaining)}
              </span>
              <span className="text-gray-500">remaining</span>
            </div>

            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="mb-3">{getBiometricIcon()}</div>
              <h3 className="text-white font-semibold mb-1">
                {getBiometricTypeName()} Authentication
              </h3>
              <p className="text-gray-400 text-sm">
                Touch the sensor or look at the camera to authenticate
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Single attempt only - be careful!
              </p>
            </div>

            <button
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
              disabled={isAuthenticating || authTimeRemaining === 0 || attemptMade}
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