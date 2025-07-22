// src/app/blocked/page.tsx - Updated with new block reasons and enhanced UI

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  XCircle,
  Smartphone,
  Fingerprint,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Types for block information
interface UserBlock {
  blockId: string;
  telegramId: number;
  blockReason: string;
  blockedAt: string;
  unblockedAt: string;
  timeRemainingSeconds: number;
  verificationType?: string;
  trustScoreAtBlock?: number;
  isActive: boolean;
}

interface UnblockResponse {
  success: boolean;
  unblocked?: boolean;
  blockInfo?: UserBlock | null;
  timeRemaining?: number;
  error?: string;
}

interface PageState {
  isLoading: boolean;
  error: string | null;
  blockInfo: UserBlock | null;
  timeRemaining: number;
  isUnblocked: boolean;
  isCheckingUnblock: boolean;
}

export default function BlockedPage(): JSX.Element {
  const router = useRouter();
  const { makeAuthenticatedRequest, authState } = useUser();
  const t = useT();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unblockCheckRef = useRef<boolean>(false);

  const [pageState, setPageState] = useState<PageState>({
    isLoading: true,
    error: null,
    blockInfo: null,
    timeRemaining: 0,
    isUnblocked: false,
    isCheckingUnblock: false,
  });

  /**
   * Check unblock status
   */
  const checkUnblockStatus = useCallback(
    async (isInitialCheck: boolean = false) => {
      if (unblockCheckRef.current && !isInitialCheck) {
        return; // Prevent concurrent requests
      }

      unblockCheckRef.current = true;

      try {
        if (isInitialCheck) {
          setPageState((prev) => ({ ...prev, isLoading: true, error: null }));
        } else {
          setPageState((prev) => ({ ...prev, isCheckingUnblock: true }));
        }

        const response = await makeAuthenticatedRequest("/api/nebula/unblock", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: UnblockResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to check unblock status");
        }

        if (result.unblocked) {
          console.log("User has been unblocked");
          setPageState((prev) => ({
            ...prev,
            isLoading: false,
            isCheckingUnblock: false,
            isUnblocked: true,
            blockInfo: null,
            timeRemaining: 0,
          }));

          // Clear interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Redirect to login page after short delay
          setTimeout(() => {
            router.push("/");
          }, 3000);
        } else if (result.blockInfo) {
          console.log("User is still blocked:", result.blockInfo);
          setPageState((prev) => ({
            ...prev,
            isLoading: false,
            isCheckingUnblock: false,
            blockInfo: result.blockInfo!,
            timeRemaining: result.timeRemaining || 0,
          }));
        } else {
          throw new Error("Invalid response from unblock check");
        }
      } catch (error) {
        console.error("Error checking unblock status:", error);
        setPageState((prev) => ({
          ...prev,
          isLoading: false,
          isCheckingUnblock: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check unblock status",
        }));
      } finally {
        unblockCheckRef.current = false;
      }
    },
    [makeAuthenticatedRequest, router],
  );

  /**
   * Update countdown timer
   */
  const updateCountdown = useCallback(() => {
    setPageState((prev) => {
      if (prev.timeRemaining <= 0) {
        return prev;
      }

      const newTimeRemaining = prev.timeRemaining - 1;

      // If time has reached zero, trigger unblock check
      if (newTimeRemaining <= 0) {
        checkUnblockStatus();

        return {
          ...prev,
          timeRemaining: 0,
        };
      }

      return {
        ...prev,
        timeRemaining: newTimeRemaining,
      };
    });
  }, [checkUnblockStatus]);

  // Initialize page and start countdown
  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/");

      return;
    }

    // Initial check
    checkUnblockStatus(true);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authState.isAuthenticated, checkUnblockStatus, router]);

  // Start countdown timer when block info is available
  useEffect(() => {
    if (
      pageState.blockInfo &&
      pageState.timeRemaining > 0 &&
      !pageState.isUnblocked
    ) {
      intervalRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [
    pageState.blockInfo,
    pageState.timeRemaining,
    pageState.isUnblocked,
    updateCountdown,
  ]);

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) {
      return t("nebula.blocked.timeFormat.expired");
    }

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${t("nebula.blocked.timeFormat.days", { count: days })} ${t("nebula.blocked.timeFormat.hours", { count: hours })} ${t("nebula.blocked.timeFormat.minutes", { count: minutes })} ${t("nebula.blocked.timeFormat.seconds", { count: secs })}`;
    } else if (hours > 0) {
      return `${t("nebula.blocked.timeFormat.hours", { count: hours })} ${t("nebula.blocked.timeFormat.minutes", { count: minutes })} ${t("nebula.blocked.timeFormat.seconds", { count: secs })}`;
    } else if (minutes > 0) {
      return `${t("nebula.blocked.timeFormat.minutes", { count: minutes })} ${t("nebula.blocked.timeFormat.seconds", { count: secs })}`;
    } else {
      return t("nebula.blocked.timeFormat.seconds", { count: secs });
    }
  };

  /**
   * Get block reason description with enhanced localization
   */
  const getBlockReasonDescription = (reason: string): string => {
    const reasonKey = `nebula.blocked.reasons.${reason}` as any;

    return t(reasonKey) || t("nebula.blocked.reasons.default");
  };

  /**
   * Get block severity level with enhanced categorization
   */
  const getBlockSeverity = (
    reason: string,
  ): "low" | "medium" | "high" | "critical" => {
    switch (reason) {
      case "failed_captcha":
      case "abandoned_verification":
        return "low";
      case "failed_biometric":
      case "biometric_unavailable":
      case "biometric_permission_denied":
      case "device_unsupported_biometric":
        return "medium";
      case "failed_gyroscope":
      case "gyroscope_unavailable":
      case "gyroscope_permission_denied":
      case "device_unsupported_gyroscope":
      case "manual_block":
      case "suspicious_activity":
        return "critical";
      default:
        return "medium";
    }
  };

  /**
   * Get severity color with enhanced styling
   */
  const getSeverityColor = (
    severity: "low" | "medium" | "high" | "critical",
  ): string => {
    switch (severity) {
      case "low":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      case "medium":
        return "text-orange-400 border-orange-500/30 bg-orange-500/10";
      case "high":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      case "critical":
        return "text-red-500 border-red-600/40 bg-red-600/15";
      default:
        return "text-gray-400 border-gray-500/30 bg-gray-500/10";
    }
  };

  /**
   * Get block reason icon
   */
  const getBlockReasonIcon = (reason: string) => {
    switch (reason) {
      case "failed_biometric":
      case "biometric_unavailable":
      case "biometric_permission_denied":
      case "device_unsupported_biometric":
        return <Fingerprint size={20} />;
      case "failed_gyroscope":
      case "gyroscope_unavailable":
      case "gyroscope_permission_denied":
      case "device_unsupported_gyroscope":
        return <Smartphone size={20} />;
      case "failed_captcha":
        return <Shield size={20} />;
      case "abandoned_verification":
        return <XCircle size={20} />;
      case "manual_block":
      case "suspicious_activity":
        return <AlertTriangle size={20} />;
      default:
        return <Shield size={20} />;
    }
  };

  /**
   * Manual refresh
   */
  const handleManualRefresh = useCallback(() => {
    checkUnblockStatus();
  }, [checkUnblockStatus]);

  // Loading state
  if (pageState.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t("nebula.blocked.loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">
            {t("nebula.blocked.error")}
          </h2>
          <p className="text-red-300 text-sm mb-6">{pageState.error}</p>
          <button
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            onClick={handleManualRefresh}
          >
            {t("nebula.common.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  // Unblocked state
  if (pageState.isUnblocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-green-500/30 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-green-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {t("nebula.blocked.unblocked.title")}
          </h2>
          <p className="text-green-300 text-sm mb-4">
            {t("nebula.blocked.unblocked.message")}
          </p>
          <p className="text-gray-400 text-xs">
            {t("nebula.blocked.unblocked.redirecting")}
          </p>
        </div>
      </div>
    );
  }

  // Main blocked page
  if (!pageState.blockInfo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
          <Shield className="text-gray-400 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">
            {t("nebula.blocked.statusUnknown")}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {t("nebula.blocked.unableToCheck")}
          </p>
          <button
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            onClick={handleManualRefresh}
          >
            {t("nebula.blocked.checkStatus")}
          </button>
        </div>
      </div>
    );
  }

  const blockInfo = pageState.blockInfo;
  const severity = getBlockSeverity(blockInfo.blockReason);
  const severityColors = getSeverityColor(severity);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-red-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t("nebula.blocked.title")}
          </h1>
          <p className="text-gray-400 text-sm">
            {t("nebula.blocked.subtitle")}
          </p>
        </div>

        {/* Enhanced Block Information */}
        <div className={`border rounded-lg p-4 mb-6 ${severityColors}`}>
          <div className="flex items-center space-x-3 mb-3">
            {getBlockReasonIcon(blockInfo.blockReason)}
            <div className="flex-1">
              <h3 className="font-semibold capitalize">
                {t("nebula.blocked.blockReason")}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                  {severity === "critical"
                    ? "CRITICAL"
                    : severity.toUpperCase()}
                </span>
                {blockInfo.verificationType && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-600/20 text-blue-300">
                    {blockInfo.verificationType.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm opacity-90 leading-relaxed">
            {getBlockReasonDescription(blockInfo.blockReason)}
          </p>
        </div>

        {/* Time Remaining */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm flex items-center space-x-2">
              <Clock size={16} />
              <span>{t("nebula.blocked.timeRemaining")}</span>
            </span>
            {pageState.isCheckingUnblock && (
              <RotateCcw className="text-blue-400 animate-spin" size={16} />
            )}
          </div>
          <div className="text-center">
            <p
              className={`text-2xl font-bold ${pageState.timeRemaining <= 60 ? "text-red-400" : "text-white"}`}
            >
              {formatTimeRemaining(pageState.timeRemaining)}
            </p>
            {pageState.timeRemaining <= 60 && pageState.timeRemaining > 0 && (
              <p className="text-red-300 text-xs mt-1">
                {t("nebula.blocked.checkingForUnblock")}
              </p>
            )}
          </div>
        </div>

        {/* Enhanced Block Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {t("nebula.blocked.blockedAt")}
            </span>
            <span className="text-white">
              {new Date(blockInfo.blockedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {t("nebula.blocked.unblockAt")}
            </span>
            <span className="text-white">
              {new Date(blockInfo.unblockedAt).toLocaleString()}
            </span>
          </div>
          {blockInfo.trustScoreAtBlock && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {t("nebula.blocked.trustScoreAtBlock")}
              </span>
              <span className="text-white">{blockInfo.trustScoreAtBlock}</span>
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-blue-300 font-semibold mb-2 text-sm">
            {t("nebula.blocked.whatNext")}
          </h4>
          <div className="text-blue-200 text-xs space-y-1">
            <p>• {t("nebula.blocked.whatNextSteps.0")}</p>
            <p>• {t("nebula.blocked.whatNextSteps.1")}</p>
            <p>• {t("nebula.blocked.whatNextSteps.2")}</p>
          </div>
        </div>

        {/* Enhanced Appeal Contact Information */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-yellow-300 font-semibold mb-2 text-sm">
            {t("nebula.blocked.appeal.title")}
          </h4>
          <p className="text-yellow-200 text-xs mb-2">
            {t("nebula.blocked.appeal.subtitle")}
          </p>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-yellow-200 text-xs">
              {t("nebula.blocked.appeal.contact")}
            </span>
            <a
              className="text-yellow-300 text-xs font-bold hover:text-yellow-100 transition-colors flex items-center space-x-1"
              href={t("nebula.blocked.appeal.contactLink")}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>{t("nebula.blocked.appeal.contactText")}</span>
              <ExternalLink size={12} />
            </a>
          </div>
          <p className="text-yellow-200 text-xs opacity-80">
            {t("nebula.blocked.appeal.note")}
          </p>
        </div>

        {/* Manual Refresh Button */}
        <button
          className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mb-4"
          disabled={pageState.isCheckingUnblock}
          onClick={handleManualRefresh}
        >
          {pageState.isCheckingUnblock ? (
            <>
              <RotateCcw className="animate-spin" size={16} />
              <span>{t("nebula.blocked.checking")}</span>
            </>
          ) : (
            <>
              <RotateCcw size={16} />
              <span>{t("nebula.blocked.checkStatus")}</span>
            </>
          )}
        </button>

        {/* Auto-refresh notice */}
        <p className="text-gray-500 text-xs text-center">
          {t("nebula.blocked.autoRefresh")}
        </p>
      </div>
    </div>
  );
}
