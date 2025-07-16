// src/components/Security/BiometricModal.tsx - Updated biometric modal with 1 attempt and access request logic

"use client";

import React, { useState, useEffect } from "react";
import { Fingerprint, Eye, Settings, Clock, AlertTriangle } from "lucide-react";

import { validateSecureBiometric } from "@/lib/authService";
import { useT } from "@/contexts/LocalizationContext";

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
  title,
  description,
}) => {
  const t = useT();
  const [biometricManager, setBiometricManager] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [accessTimeRemaining, setAccessTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "finger" | "face" | "unknown"
  >("unknown");
  const [currentPhase, setCurrentPhase] = useState<
    "init" | "requesting_access" | "ready" | "authenticating" | "complete"
  >("init");

  const authTimeout = 30000; // 30 seconds for authentication
  const accessTimeout = 30000; // 30 seconds for access request
  const startTime = Date.now();

  // Initialize biometric manager
  useEffect(() => {
    if (!isOpen) return;

    const initBiometric = async () => {
      if (typeof window === "undefined") return;

      const tg = window.Telegram?.WebApp;

      if (!tg?.BiometricManager) {
        setError(t("security.biometricNotAvailable"));
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
          setError(t("security.biometricNotAvailable"));
        } else if (!manager.isAccessGranted) {
          // Need to request access first
          setCurrentPhase("requesting_access");
          setAccessTimeRemaining(accessTimeout);
          requestBiometricAccess(manager);
        } else {
          // Access already granted, ready for authentication
          setCurrentPhase("ready");
          setTimeRemaining(authTimeout);
        }
      });
    };

    initBiometric();
  }, [isOpen]);

  // Timer for access request phase
  useEffect(() => {
    if (currentPhase !== "requesting_access") return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, accessTimeout - elapsed);
      setAccessTimeRemaining(remaining);

      if (remaining === 0) {
        handleAccessTimeout();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentPhase]);

  // Timer for authentication phase
  useEffect(() => {
    if (currentPhase !== "ready" && currentPhase !== "authenticating") return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, authTimeout - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleAuthTimeout();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentPhase]);

  const requestBiometricAccess = async (manager: any) => {
    setIsRequestingAccess(true);
    setError(null);

    try {
      manager.requestAccess(
        { reason: t("security.biometricDescription") },
        (granted: boolean) => {
          setIsRequestingAccess(false);

          if (granted) {
            // Access granted, move to authentication phase
            setCurrentPhase("ready");
            setTimeRemaining(authTimeout);
          } else {
            // Access denied, fail immediately
            setError(t("security.biometricAccessDenied"));
            onFailure();
          }
        },
      );
    } catch (error) {
      console.error("Error requesting biometric access:", error);
      setError(t("security.biometricNotAvailable"));
      setIsRequestingAccess(false);
      onFailure();
    }
  };

  const handleAuthenticate = async () => {
    if (!biometricManager || !isSupported || isAuthenticating || hasAttempted) return;

    setIsAuthenticating(true);
    setCurrentPhase("authenticating");
    setError(null);
    setHasAttempted(true);

    const authStartTime = Date.now();

    try {
      biometricManager.authenticate(
        { reason: t("security.biometricInstruction") },
        async (success: boolean, token?: string) => {
          const authEndTime = Date.now();
          const completedInTime = authEndTime - startTime < authTimeout;

          try {
            const result = await validateSecureBiometric(
              success,
              completedInTime,
            );

            if (result.success) {
              setCurrentPhase("complete");
              onSuccess();
            } else {
              // Only 1 attempt allowed - immediate failure
              onFailure();
            }
          } catch (error) {
            console.error("Error validating biometric:", error);
            onFailure();
          } finally {
            setIsAuthenticating(false);
          }
        },
      );
    } catch (error) {
      console.error("Error during biometric authentication:", error);
      setError(t("security.biometricFailed"));
      setIsAuthenticating(false);
      onFailure();
    }
  };

  const handleAccessTimeout = () => {
    setError(t("security.biometricPermissionTimeout"));
    onFailure();
  };

  const handleAuthTimeout = () => {
    if (!hasAttempted) {
      setHasAttempted(true);
      onFailure();
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
        return t("security.biometricFingerprint");
      case "face":
        return t("security.biometricFaceId");
      default:
        return t("security.biometricGeneric");
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
          <h2 className="text-xl font-bold text-white mb-2">
            {title || t("security.biometricTitle")}
          </h2>
          <p className="text-gray-400 text-sm">
            {description || t("security.biometricDescription")}
          </p>
        </div>

        {/* Content */}
        {!isInitialized ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Fingerprint className="text-blue-400 mx-auto mb-4" size={32} />
            </div>
            <p className="text-gray-400">{t("security.biometricInitializing")}</p>
          </div>
        ) : !isSupported || error ? (
          <div className="text-center space-y-4">
            {/* Error Display */}
            <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-300 text-sm">
                {error || t("security.biometricNotAvailable")}
              </p>
            </div>

            {/* Settings Button */}
            {biometricManager?.openSettings && (
              <button
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                onClick={handleOpenSettings}
              >
                <Settings size={16} />
                <span>{t("security.biometricOpenSettings")}</span>
              </button>
            )}
          </div>
        ) : currentPhase === "requesting_access" ? (
          <div className="space-y-6">
            {/* Access Request Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span className={`font-bold ${accessTimeRemaining < 10000 ? "text-red-400" : "text-orange-400"
                }`}>
                {formatTime(accessTimeRemaining)}
              </span>
              <span className="text-gray-500">{t("security.captchaTimeRemaining")}</span>
            </div>

            {/* Access Request Info */}
            <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-lg p-4 text-center">
              <div className="mb-3">{getBiometricIcon()}</div>
              <h3 className="text-white font-semibold mb-2">
                {t("security.biometricRequestingAccess")}
              </h3>
              <p className="text-yellow-200 text-sm">
                Please allow biometric access when prompted by your device.
              </p>
            </div>

            {/* Loading Indicator */}
            {isRequestingAccess && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  Requesting biometric access...
                </p>
              </div>
            )}
          </div>
        ) : currentPhase === "ready" || currentPhase === "authenticating" ? (
          <div className="space-y-6">
            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Clock className="text-orange-400" size={16} />
              <span className={`font-bold ${timeRemaining < 10000 ? "text-red-400" : "text-orange-400"
                }`}>
                {formatTime(timeRemaining)}
              </span>
              <span className="text-gray-500">{t("security.captchaTimeRemaining")}</span>
            </div>

            {/* Biometric Info */}
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
              <div className="mb-3">{getBiometricIcon()}</div>
              <h3 className="text-white font-semibold mb-1">
                {getBiometricTypeName()} {t("security.biometricAuthenticate")}
              </h3>
              <p className="text-gray-400 text-sm">
                {t("security.biometricInstruction")}
              </p>
            </div>

            {/* Single Attempt Warning */}
            <div className="text-center">
              <p className="text-yellow-400 text-sm font-semibold">
                ⚠️ Only 1 attempt allowed
              </p>
            </div>

            {/* Authentication Button */}
            <button
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
              disabled={isAuthenticating || timeRemaining === 0 || hasAttempted}
              onClick={handleAuthenticate}
            >
              {isAuthenticating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("security.biometricAuthenticating")}</span>
                </>
              ) : (
                <>
                  <Fingerprint size={20} />
                  <span>{t("security.biometricAuthenticate")}</span>
                </>
              )}
            </button>

            {/* Authentication Status */}
            {isAuthenticating && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-blue-300 text-sm">
                  {t("security.biometricComplete")}
                </p>
              </div>
            )}
          </div>
        ) : currentPhase === "complete" ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fingerprint className="text-green-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("security.success")}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Biometric verification successful
            </p>
          </div>
        ) : null}

        {/* Warning Message */}
        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-xs text-center">
            {t("security.biometricWarning")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BiometricModal;