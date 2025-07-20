// src/components/Security/NebulaBiometricModal.tsx - Adapted for Nebula Security System

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
  XCircle,
  CheckCircle2,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";

interface NebulaBiometricModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onClose?: () => void;
}

type BiometricType = "finger" | "face" | "unknown";
type AuthPhase =
  | "initializing"
  | "permission_required"
  | "auth"
  | "success"
  | "error"
  | "unsupported";

interface BiometricState {
  currentPhase: AuthPhase;
  biometricManager: any;
  biometricType: BiometricType;
  authTimeRemaining: number;
  isAuthenticating: boolean;
  error: string | null;
  attemptMade: boolean;
  authTimerActive: boolean;
  isBiometricSupported: boolean;
}

const NebulaBiometricModal: React.FC<NebulaBiometricModalProps> = ({
  isOpen,
  onSuccess,
  onFailure,
  onClose,
}) => {
  const { makeAuthenticatedRequest } = useUser();
  const authTimeout = 15000; // 15 seconds for authentication

  const [state, setState] = useState<BiometricState>({
    currentPhase: "initializing",
    biometricManager: null,
    biometricType: "unknown",
    authTimeRemaining: 15000,
    isAuthenticating: false,
    error: null,
    attemptMade: false,
    authTimerActive: false,
    isBiometricSupported: true,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        currentPhase: "initializing",
        biometricManager: null,
        biometricType: "unknown",
        authTimeRemaining: 15000,
        isAuthenticating: false,
        error: null,
        attemptMade: false,
        authTimerActive: false,
        isBiometricSupported: true,
      });

      return;
    }

    initBiometric();
  }, [isOpen]);

  // Authentication phase timer
  useEffect(() => {
    if (!state.authTimerActive || state.currentPhase !== "auth") return;

    const timer = setInterval(() => {
      setState((prev) => {
        const newTime = prev.authTimeRemaining - 100;

        if (newTime <= 0) {
          handleAuthTimeout();

          return { ...prev, authTimeRemaining: 0 };
        }

        return { ...prev, authTimeRemaining: newTime };
      });
    }, 100);

    return () => clearInterval(timer);
  }, [state.authTimerActive, state.currentPhase]);

  /**
   * Initialize biometric manager
   */
  const initBiometric = async () => {
    console.log("Initializing biometric authentication");

    if (typeof window === "undefined") {
      console.log("Window not available");
      setState((prev) => ({
        ...prev,
        error: "Biometric authentication is not available in this environment",
        currentPhase: "unsupported",
        isBiometricSupported: false,
      }));

      return;
    }

    const tg = window.Telegram?.WebApp;

    if (!tg?.BiometricManager) {
      console.log(
        "BiometricManager not available - device/platform not supported",
      );
      setState((prev) => ({
        ...prev,
        error:
          "Biometric authentication is not supported on this device or platform",
        currentPhase: "unsupported",
        isBiometricSupported: false,
      }));

      return;
    }

    const manager = tg.BiometricManager;

    // Initialize biometric manager
    manager.init(() => {
      console.log("BiometricManager initialized");
      setState((prev) => ({
        ...prev,
        biometricManager: manager,
        biometricType: manager.biometricType || "unknown",
      }));

      if (!manager.isBiometricAvailable) {
        console.log("Biometric not available on device");
        setState((prev) => ({
          ...prev,
          error: "Biometric authentication is not available on this device",
          currentPhase: "unsupported",
          isBiometricSupported: false,
        }));

        return;
      }

      // Check if permission is already granted
      if (manager.isAccessGranted) {
        console.log("Permission already granted, proceeding to authentication");
        setState((prev) => ({
          ...prev,
          currentPhase: "auth",
          authTimeRemaining: authTimeout,
          authTimerActive: true,
        }));
      } else {
        console.log(
          "Permission not granted, showing permission required screen",
        );
        setState((prev) => ({
          ...prev,
          currentPhase: "permission_required",
        }));
      }
    });
  };

  /**
   * Handle authentication timeout
   */
  const handleAuthTimeout = useCallback(() => {
    console.log("Authentication timeout");
    setState((prev) => ({ ...prev, authTimerActive: false }));

    if (!state.attemptMade) {
      setState((prev) => ({
        ...prev,
        error: "Authentication timeout",
        attemptMade: true,
        currentPhase: "error",
      }));

      setTimeout(() => {
        handleBiometricFailure();
      }, 1000);
    }
  }, [state.attemptMade]);

  /**
   * Handle biometric authentication
   */
  const handleAuthenticate = useCallback(async () => {
    if (
      !state.biometricManager ||
      !state.biometricManager.isAccessGranted ||
      state.isAuthenticating ||
      state.attemptMade
    ) {
      return;
    }

    console.log("Starting biometric authentication");
    setState((prev) => ({
      ...prev,
      isAuthenticating: true,
      attemptMade: true,
      error: null,
    }));

    const authStartTime = Date.now();

    try {
      state.biometricManager.authenticate(
        { reason: "Verify your identity to continue using the application" },
        async (success: boolean, token?: string) => {
          const authEndTime = Date.now();
          const completedInTime = authEndTime - authStartTime < authTimeout;

          console.log("Biometric authentication result:", {
            success,
            completedInTime,
            hasToken: !!token,
          });

          try {
            // Send result to Nebula API
            const response = await makeAuthenticatedRequest(
              "/api/nebula/biometric",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  success,
                  completedInTime,
                  deviceSupported: state.isBiometricSupported,
                  token,
                }),
              },
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || "Verification failed");
            }

            if (result.verified && result.trustRestored) {
              console.log("Biometric authentication successful");
              setState((prev) => ({
                ...prev,
                currentPhase: "success",
                isAuthenticating: false,
                authTimerActive: false,
              }));

              setTimeout(() => {
                onSuccess();
              }, 1500);
            } else if (result.blocked) {
              console.log("Biometric authentication failed, user blocked");
              setState((prev) => ({
                ...prev,
                error: result.blockReason || "Biometric verification failed",
                currentPhase: "error",
                isAuthenticating: false,
                authTimerActive: false,
              }));

              setTimeout(() => {
                onFailure();
              }, 2000);
            } else {
              throw new Error("Unexpected verification result");
            }
          } catch (error) {
            console.error("Error validating biometric:", error);
            handleBiometricFailure();
          }
        },
      );
    } catch (error) {
      console.error("Error during biometric authentication:", error);
      handleBiometricFailure();
    }
  }, [
    state.biometricManager,
    state.isAuthenticating,
    state.attemptMade,
    state.isBiometricSupported,
    authTimeout,
    makeAuthenticatedRequest,
    onSuccess,
    onFailure,
  ]);

  /**
   * Handle biometric failure
   */
  const handleBiometricFailure = useCallback(async () => {
    console.log(
      "Handling biometric failure, supported:",
      state.isBiometricSupported,
    );

    setState((prev) => ({
      ...prev,
      isAuthenticating: false,
      authTimerActive: false,
      currentPhase: "error",
    }));

    try {
      // Send failure notification to API
      await makeAuthenticatedRequest("/api/nebula/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          success: false,
          completedInTime: false,
          deviceSupported: state.isBiometricSupported,
        }),
      });
    } catch (error) {
      console.error("Error sending biometric failure to API:", error);
    }

    // Always call onFailure to trigger blocking
    setTimeout(() => {
      onFailure();
    }, 1000);
  }, [state.isBiometricSupported, makeAuthenticatedRequest, onFailure]);

  /**
   * Handle open settings
   */
  const handleOpenSettings = useCallback(() => {
    if (state.biometricManager?.openSettings) {
      state.biometricManager.openSettings();
    }
  }, [state.biometricManager]);

  /**
   * Handle request permission
   */
  const handleRequestPermission = useCallback(() => {
    if (!state.biometricManager) return;

    try {
      state.biometricManager.requestAccess(
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
  }, [state.biometricManager]);

  /**
   * Handle unsupported device
   */
  const handleUnsupportedDevice = useCallback(() => {
    console.log("Handling unsupported device - triggering block");
    handleBiometricFailure();
  }, [handleBiometricFailure]);

  /**
   * Get biometric icon
   */
  const getBiometricIcon = () => {
    switch (state.biometricType) {
      case "finger":
        return <Fingerprint className="text-blue-400" size={48} />;
      case "face":
        return <Eye className="text-blue-400" size={48} />;
      default:
        return <Fingerprint className="text-blue-400" size={48} />;
    }
  };

  /**
   * Get biometric type name
   */
  const getBiometricTypeName = () => {
    switch (state.biometricType) {
      case "finger":
        return "Fingerprint";
      case "face":
        return "Face ID";
      default:
        return "Biometric";
    }
  };

  /**
   * Format time
   */
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
              {state.currentPhase === "unsupported" ||
              state.currentPhase === "error" ? (
                <XCircle className="text-red-400" size={48} />
              ) : state.currentPhase === "success" ? (
                <CheckCircle2 className="text-green-400" size={48} />
              ) : (
                getBiometricIcon()
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {state.currentPhase === "success"
              ? "Verification Successful"
              : "Biometric Authentication Required"}
          </h2>
          <p className="text-gray-400 text-sm">
            {state.currentPhase === "success"
              ? "Your identity has been verified successfully"
              : "Your trust score is low. Please authenticate using biometrics to continue."}
          </p>
        </div>

        {/* Content */}
        {state.currentPhase === "initializing" ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
            </div>
            <p className="text-gray-400">
              Initializing biometric authentication...
            </p>
          </div>
        ) : state.currentPhase === "unsupported" ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <XCircle className="text-red-400 flex-shrink-0" size={20} />
              <div className="text-left">
                <p className="text-red-300 text-sm font-semibold">
                  Device Not Supported
                </p>
                <p className="text-red-200 text-xs">{state.error}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle
                  className="text-orange-400 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <div>
                  <h4 className="text-orange-300 font-semibold mb-1 text-sm">
                    Security Policy
                  </h4>
                  <p className="text-orange-200 text-xs">
                    Due to security requirements, accounts with very low trust
                    scores require biometric authentication. Since your device
                    does not support this feature, your account will be blocked
                    for security reasons.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              onClick={handleUnsupportedDevice}
            >
              <Shield size={16} />
              <span>I Understand</span>
            </button>
          </div>
        ) : state.currentPhase === "permission_required" ? (
          <div className="space-y-6">
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

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2 text-sm">
                Instructions:
              </h4>
              <div className="text-blue-200 text-sm space-y-1">
                <p>
                  1. Tap &quot;Grant Permission&quot; or &quot;Open
                  Settings&quot; below
                </p>
                <p>
                  2. Enable biometric authentication in your device settings
                </p>
                <p>
                  3. <strong>Restart the application</strong> to apply changes
                </p>
              </div>
            </div>

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
                    reopen the application for the changes to take effect.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                onClick={handleRequestPermission}
              >
                <Shield size={20} />
                <span>Grant Permission</span>
              </button>

              {state.biometricManager?.openSettings && (
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
        ) : state.currentPhase === "auth" ? (
          <div className="space-y-6">
            {/* Authentication Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span
                className={`font-bold ${state.authTimeRemaining < 5000 ? "text-red-400" : "text-orange-400"}`}
              >
                {formatTime(state.authTimeRemaining)}
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
                state.isAuthenticating ||
                state.authTimeRemaining === 0 ||
                state.attemptMade
              }
              onClick={handleAuthenticate}
            >
              {state.isAuthenticating ? (
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
            {state.isAuthenticating && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  Please complete biometric authentication on your device
                </p>
              </div>
            )}
          </div>
        ) : state.currentPhase === "success" ? (
          <div className="text-center py-4">
            <p className="text-green-300 text-sm mb-4">
              Your trust score has been restored. Redirecting to the
              application...
            </p>
            <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : state.currentPhase === "error" ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-300 text-sm">{state.error}</p>
            </div>

            {state.biometricManager?.openSettings && (
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
        ) : null}

        {/* Warning Message */}
        {state.currentPhase !== "success" && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-xs text-center">
              {state.currentPhase === "unsupported"
                ? "Your account will be blocked for 2 days due to device incompatibility."
                : "Biometric verification required due to low trust score. Your account will be blocked for 2 days if verification fails."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NebulaBiometricModal;
