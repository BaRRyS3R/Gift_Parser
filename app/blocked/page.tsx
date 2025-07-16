// src/app/blocked/page.tsx - Updated minimal blocked page with auto-refresh

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Clock, AlertTriangle, RefreshCw } from "lucide-react";

import { authService } from "@/lib/authService";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface BlockInfo {
  isBlocked: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
  trustScore: number;
  unblockDate?: Date;
}

export default function BlockedPage() {
  const router = useRouter();
  const { telegramUser, refreshUser, isAuthenticated } = useUser();
  const t = useT();

  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [autoRefreshIn, setAutoRefreshIn] = useState<number>(0);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Server-side time synchronization
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Check block status on page load
  useEffect(() => {
    checkBlockStatus();

    // Set up automatic checking every 30 seconds
    checkIntervalRef.current = setInterval(() => {
      checkBlockStatus();
    }, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!blockInfo?.timeUntilUnblock) return;

    const timer = setInterval(() => {
      const now = Date.now() + serverTimeOffset;
      const elapsed = now - lastUpdateTime;
      const remaining = Math.max(0, blockInfo.timeUntilUnblock! - elapsed);

      if (remaining <= 0) {
        setTimeRemaining("Checking...");
        checkBlockStatus();
      } else {
        setTimeRemaining(formatTimeRemaining(remaining));

        // Auto-refresh when 10 seconds remaining
        if (remaining <= 10000 && autoRefreshIn === 0) {
          setAutoRefreshIn(10);
          autoRefreshIntervalRef.current = setInterval(() => {
            setAutoRefreshIn(prev => {
              if (prev <= 1) {
                window.location.reload();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [blockInfo, lastUpdateTime, serverTimeOffset, autoRefreshIn]);

  const checkBlockStatus = async () => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    try {
      console.log("Checking block status via API...");
      const securityResult = await authService.checkUserSecurityStatus();

      // Calculate server time offset for better accuracy
      const requestTime = Date.now();
      setServerTimeOffset(0); // Reset offset as API provides relative times

      const unblockDate = securityResult.timeUntilUnblock
        ? new Date(requestTime + securityResult.timeUntilUnblock)
        : undefined;

      setBlockInfo({
        isBlocked: securityResult.isBlocked,
        timeUntilUnblock: securityResult.timeUntilUnblock,
        blockReason: securityResult.blockReason,
        trustScore: securityResult.trustScore,
        unblockDate,
      });

      setLastUpdateTime(requestTime);

      // If user is no longer blocked, redirect to main page
      if (!securityResult.isBlocked) {
        console.log("User is no longer blocked, redirecting to main");
        await refreshUser();
        router.push("/main");
        return;
      }

      // Set initial countdown
      if (securityResult.timeUntilUnblock) {
        setTimeRemaining(formatTimeRemaining(securityResult.timeUntilUnblock));
      }

      console.log("Block status checked successfully via API");
    } catch (error) {
      console.error("Error checking block status via API:", error);

      // On API error, try fallback with telegram ID
      if (telegramUser?.id) {
        try {
          const fallbackResult = await authService.checkUserBlockedStatus(telegramUser.id);

          const unblockDate = fallbackResult.timeUntilUnblock
            ? new Date(Date.now() + fallbackResult.timeUntilUnblock)
            : undefined;

          setBlockInfo({
            isBlocked: fallbackResult.isBlocked,
            timeUntilUnblock: fallbackResult.timeUntilUnblock,
            blockReason: fallbackResult.blockReason,
            trustScore: fallbackResult.trustScore,
            unblockDate,
          });

          if (!fallbackResult.isBlocked) {
            router.push("/main");
          }
        } catch (fallbackError) {
          console.error("Fallback block check also failed:", fallbackError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);

    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }

    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (totalMinutes < 60) {
      return `${totalMinutes}:${seconds.toString().padStart(2, "0")}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours < 24) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return `${days}d ${remainingHours}h ${minutes}m`;
  };

  const getBlockReasonText = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return t("security.captchaFailed");
      case "biometric_failed":
        return t("security.biometricFailed");
      case "gyroscope_failed":
        return t("security.gyroscopeFailed");
      case "suspicious_activity":
        return t("security.suspiciousActivity");
      default:
        return "Security Violation";
    }
  };

  const getBlockDuration = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return t("security.captchaBlockDuration");
      case "biometric_failed":
        return t("security.biometricBlockDuration");
      case "gyroscope_failed":
        return t("security.gyroscopeBlockDuration");
      case "suspicious_activity":
        return t("security.suspiciousBlockDuration");
      default:
        return "Unknown";
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const isTemporaryBlock = blockInfo?.blockReason !== "gyroscope_failed";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="text-white mx-auto animate-spin mb-4" size={32} />
          <p className="text-white/80">{t("security.checking")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Main Block Card */}
        <div className="bg-gray-900 border border-red-500/40 rounded-xl p-6 shadow-2xl text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-red-400" size={32} />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              {isTemporaryBlock ? t("security.accountBlocked") : t("security.accountPermanentlyBlocked")}
            </h1>
            <p className="text-red-400 text-sm">
              {getBlockReasonText(blockInfo?.blockReason)}
            </p>
          </div>

          {/* Countdown Timer */}
          {blockInfo?.timeUntilUnblock && blockInfo.timeUntilUnblock > 0 ? (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="text-orange-400" size={18} />
                <span className="text-gray-300 text-sm font-medium">{t("security.timeRemaining")}</span>
              </div>
              <div className="text-2xl font-bold text-orange-400 font-mono mb-2">
                {timeRemaining}
              </div>
              {blockInfo.unblockDate && (
                <div className="text-xs text-gray-500">
                  <div>{t("security.unblockDate")}: {formatDate(blockInfo.unblockDate)}</div>
                </div>
              )}
            </div>
          ) : blockInfo?.blockReason === "gyroscope_failed" ? (
            <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4 mb-4">
              <AlertTriangle className="text-red-400 mx-auto mb-2" size={24} />
              <p className="text-red-300 text-sm font-semibold">
                Permanent Block
              </p>
              <p className="text-red-400/80 text-xs mt-1">
                Account blocked for 1 year
              </p>
            </div>
          ) : null}

          {/* Auto-refresh indicator */}
          {autoRefreshIn > 0 && (
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="text-blue-400" size={16} />
                <span className="text-blue-300 text-sm">
                  {t("security.autoRefresh")} {autoRefreshIn}s
                </span>
              </div>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            disabled={isLoading}
            onClick={checkBlockStatus}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
            <span>{t("security.checkStatus")}</span>
          </button>
        </div>

        {/* Minimal Info Card */}
        <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-2">
            {t("security.blockDuration")}: {getBlockDuration(blockInfo?.blockReason)}
          </p>
          {isTemporaryBlock && (
            <p className="text-gray-500 text-xs">
              {t("security.pageWillRefresh")}
            </p>
          )}
        </div>

        {/* Debug Info (Development) */}
        {process.env.NODE_ENV === "development" && blockInfo && (
          <div className="mt-4 bg-gray-900/30 border border-gray-700 rounded-lg p-3">
            <div className="text-gray-500 text-xs space-y-1">
              <p>Debug Info:</p>
              <p>Trust Score: {blockInfo.trustScore}</p>
              <p>Reason: {blockInfo.blockReason}</p>
              <p>Time Until Unblock: {blockInfo.timeUntilUnblock}ms</p>
              <p>Server Offset: {serverTimeOffset}ms</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}