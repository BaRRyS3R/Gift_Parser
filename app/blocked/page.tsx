// src/app/blocked/page.tsx - Updated to display 1-year block duration for unsupported biometrics

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Clock, AlertTriangle, RefreshCw, Home, XCircle } from "lucide-react";

import { authService } from "@/lib/authService";
import { useUser } from "@/hooks/useUser";

interface BlockInfo {
  isBlocked: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
  trustScore: number;
}

export default function BlockedPage() {
  const router = useRouter();
  const { telegramUser, refreshUser, isAuthenticated } = useUser();
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Check if user is authenticated, if not redirect to login
  useEffect(() => {
    if (!isAuthenticated && !telegramUser?.id) {
      console.log("User not authenticated on blocked page, redirecting to login");
      router.push("/");
      return;
    }
  }, [isAuthenticated, telegramUser, router]);

  // Check block status using secure API endpoints
  const checkBlockStatus = async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, cannot check block status");
      router.push("/");
      return;
    }

    setIsCheckingStatus(true);

    try {
      console.log("Checking block status via secure API...");

      // Use authService to get security status instead of direct RPC calls
      const securityResult = await authService.checkUserSecurityStatus();

      const blockInfo: BlockInfo = {
        isBlocked: securityResult.isBlocked,
        timeUntilUnblock: securityResult.timeUntilUnblock,
        blockReason: securityResult.blockReason,
        trustScore: securityResult.trustScore,
      };

      setBlockInfo(blockInfo);
      setLastUpdateTime(Date.now());

      // If user is no longer blocked, redirect to main page
      if (!securityResult.isBlocked) {
        console.log("User is no longer blocked, refreshing user data and redirecting");
        await refreshUser();
        router.push("/main");
        return;
      }

      // Set initial countdown if still blocked
      if (securityResult.timeUntilUnblock) {
        setTimeRemaining(formatTimeRemaining(securityResult.timeUntilUnblock));
      }

      console.log("Block status checked successfully via secure API:", {
        isBlocked: securityResult.isBlocked,
        trustScore: securityResult.trustScore,
        blockReason: securityResult.blockReason,
        hasTimeRemaining: !!securityResult.timeUntilUnblock,
      });

    } catch (error) {
      console.error("Error checking block status via secure API:", error);

      // Handle authentication errors
      if (error instanceof Error && error.message.includes("Authentication expired")) {
        console.log("Authentication expired, redirecting to login");
        router.push("/");
        return;
      }

      // For other errors, show generic error state
      setBlockInfo({
        isBlocked: true,
        trustScore: 0,
        blockReason: "unknown",
        timeUntilUnblock: undefined,
      });
    } finally {
      setIsLoading(false);
      setIsCheckingStatus(false);
    }
  };

  // Initial block status check on page load
  useEffect(() => {
    if (isAuthenticated) {
      checkBlockStatus();
    }
  }, [isAuthenticated]);

  // Update countdown timer
  useEffect(() => {
    if (!blockInfo?.timeUntilUnblock) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastUpdateTime;
      const remaining = Math.max(0, blockInfo.timeUntilUnblock! - elapsed);

      if (remaining <= 0) {
        console.log("Block time expired, checking status");
        checkBlockStatus();
      } else {
        setTimeRemaining(formatTimeRemaining(remaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [blockInfo?.timeUntilUnblock, lastUpdateTime]);

  // Format time remaining for display - enhanced for long durations
  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalYears = Math.floor(totalDays / 365);

    // For very long blocks (over 30 days), show years/months/days
    if (totalDays > 30) {
      if (totalYears > 0) {
        const remainingDays = totalDays % 365;
        const months = Math.floor(remainingDays / 30);
        if (months > 0) {
          return `${totalYears}y ${months}m`;
        }
        return `${totalYears} year${totalYears > 1 ? 's' : ''}`;
      }
      return `${totalDays} days`;
    }

    // For shorter blocks, show hours/minutes/seconds
    if (totalHours > 0) {
      const remainingMinutes = totalMinutes % 60;
      return `${totalHours}:${remainingMinutes.toString().padStart(2, "0")}`;
    }

    if (totalMinutes > 0) {
      const remainingSeconds = totalSeconds % 60;
      return `${totalMinutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    return `${totalSeconds}s`;
  };

  // Get human-readable block reason
  const getBlockReasonText = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return "Failed Captcha Verification";
      case "biometric_failed":
        return "Failed Biometric Authentication";
      case "biometric_not_supported":
        return "Device Does Not Support Biometric Authentication";
      case "suspicious_activity":
        return "Suspicious Activity Detected";
      default:
        return "Security Violation";
    }
  };

  // Get detailed block reason description
  const getBlockReasonDescription = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return "Your account was temporarily blocked due to failed captcha verification. This helps protect the system from automated access.";
      case "biometric_failed":
        return "Your account was temporarily blocked due to failed biometric authentication. This is a security measure to protect your account.";
      case "biometric_not_supported":
        return "Your account was blocked because your device does not support biometric authentication, which is required for accounts with very low trust scores. This is a security policy to protect the platform integrity.";
      case "suspicious_activity":
        return "Your account was temporarily blocked due to detected suspicious activity. This helps maintain the security and integrity of the platform.";
      default:
        return "Your account was blocked for security reasons. Please wait for the block period to expire or use a compatible device.";
    }
  };

  // Get expected block duration text - UPDATED for 1-year blocks
  const getBlockDurationText = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return "2 minutes";
      case "biometric_failed":
        return "5 minutes";
      case "biometric_not_supported":
        return "1 year"; // UPDATED: Changed from 10 minutes to 1 year
      case "suspicious_activity":
        return "10 minutes";
      default:
        return "varies";
    }
  };

  // Check if this is a long-term block (over 1 day)
  const isLongTermBlock = (reason?: string): boolean => {
    return reason === "biometric_not_supported";
  };

  // Get trust score display color
  const getTrustScoreColor = (score: number): string => {
    if (score >= 60) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    if (score >= 20) return "text-orange-400";
    return "text-red-400";
  };

  // Get trust score display label
  const getTrustScoreLabel = (score: number): string => {
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Low";
    return "Very Low";
  };

  // Show loading state while checking authentication or block status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="text-white mx-auto animate-spin mb-4" size={32} />
          <p className="text-white/80">Checking account status...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (safety check)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Main Block Information Card */}
        <div className={`bg-gray-900 border rounded-xl p-6 shadow-2xl ${isLongTermBlock(blockInfo?.blockReason)
            ? "border-red-600/60"
            : "border-red-500/40"
          }`}>
          {/* Header Section */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isLongTermBlock(blockInfo?.blockReason)
                ? "bg-red-600/30"
                : "bg-red-500/20"
              }`}>
              {isLongTermBlock(blockInfo?.blockReason) ? (
                <XCircle className="text-red-400" size={40} />
              ) : (
                <Shield className="text-red-400" size={40} />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isLongTermBlock(blockInfo?.blockReason)
                ? "Account Blocked"
                : "Account Temporarily Blocked"
              }
            </h1>
            <p className="text-gray-400 text-sm">
              {isLongTermBlock(blockInfo?.blockReason)
                ? "Extended security block is in place"
                : "Security measures are in place"
              }
            </p>
          </div>

          {/* Block Information Section */}
          <div className="space-y-4 mb-6">
            {/* Block Reason */}
            <div className={`border rounded-lg p-4 ${isLongTermBlock(blockInfo?.blockReason)
                ? "bg-red-600/20 border-red-600/50"
                : "bg-red-500/10 border-red-500/30"
              }`}>
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                <span className="text-red-300 font-semibold text-sm">
                  {getBlockReasonText(blockInfo?.blockReason)}
                </span>
              </div>
              <p className="text-red-200/80 text-xs leading-relaxed">
                {getBlockReasonDescription(blockInfo?.blockReason)}
              </p>
            </div>

            {/* Long-term Block Notice */}
            {isLongTermBlock(blockInfo?.blockReason) && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="text-orange-400 flex-shrink-0" size={16} />
                  <span className="text-orange-300 font-semibold text-sm">
                    Extended Security Block
                  </span>
                </div>
                <p className="text-orange-200/80 text-xs leading-relaxed">
                  This is a long-term security block. To regain access, you need to use a device that supports biometric authentication.
                  Contact support if you believe this is an error.
                </p>
              </div>
            )}

            {/* Countdown Timer - only for short-term blocks */}
            {blockInfo?.timeUntilUnblock && blockInfo.timeUntilUnblock > 0 && !isLongTermBlock(blockInfo?.blockReason) && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="text-orange-400" size={16} />
                  <span className="text-gray-300 text-sm">Time Remaining</span>
                </div>
                <div className="text-3xl font-bold text-orange-400 font-mono">
                  {timeRemaining}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Block duration: {getBlockDurationText(blockInfo?.blockReason)}
                </p>
              </div>
            )}

            {/* Long-term Block Duration Display */}
            {isLongTermBlock(blockInfo?.blockReason) && blockInfo?.timeUntilUnblock && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="text-red-400" size={16} />
                  <span className="text-gray-300 text-sm">Block Duration</span>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {getBlockDurationText(blockInfo?.blockReason)}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Remaining: {timeRemaining}
                </div>
              </div>
            )}

            {/* Trust Score Display */}
            {blockInfo && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Trust Score</span>
                  <span className={`font-bold ${getTrustScoreColor(blockInfo.trustScore)}`}>
                    {blockInfo.trustScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${blockInfo.trustScore >= 60
                        ? "bg-green-400"
                        : blockInfo.trustScore >= 40
                          ? "bg-yellow-400"
                          : blockInfo.trustScore >= 20
                            ? "bg-orange-400"
                            : "bg-red-400"
                      }`}
                    style={{
                      width: `${Math.max(5, blockInfo.trustScore)}%`,
                    }}
                  />
                </div>
                <p className={`text-xs ${getTrustScoreColor(blockInfo.trustScore)}`}>
                  {getTrustScoreLabel(blockInfo.trustScore)} -{" "}
                  {isLongTermBlock(blockInfo?.blockReason)
                    ? "Device compatibility required for access"
                    : blockInfo.trustScore < 40
                      ? "Additional security checks may be required"
                      : "Continue following the rules to maintain good standing"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Only show check status for short-term blocks */}
            {!isLongTermBlock(blockInfo?.blockReason) && (
              <button
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                disabled={isCheckingStatus}
                onClick={checkBlockStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Check Status</span>
                  </>
                )}
              </button>
            )}

            <button
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              onClick={() => router.push("/")}
            >
              <Home size={16} />
              <span>Return to Start</span>
            </button>
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 text-sm">
            {isLongTermBlock(blockInfo?.blockReason) ? "How to regain access?" : "What happens next?"}
          </h3>
          <div className="space-y-2 text-xs text-gray-400">
            {isLongTermBlock(blockInfo?.blockReason) ? (
              <>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Use a device that supports biometric authentication (fingerprint, Face ID, etc.)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Ensure biometric authentication is enabled in your device settings</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Contact support if you need assistance with compatible devices</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Your account will be automatically unblocked when the time expires</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Follow security guidelines to improve your trust score</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                  <p>Repeated violations may result in longer blocks</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Development Debug Information */}
        {process.env.NODE_ENV === "development" && telegramUser && (
          <div className="mt-4 bg-gray-900/30 border border-gray-700 rounded-lg p-3">
            <p className="text-gray-500 text-xs">
              Debug: User {telegramUser.first_name} (ID: {telegramUser.id})
              {blockInfo && ` - Trust Score: ${blockInfo.trustScore}, Block Reason: ${blockInfo.blockReason}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}