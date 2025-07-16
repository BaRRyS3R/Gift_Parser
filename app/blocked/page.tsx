// src/app/blocked/page.tsx - Enhanced blocked page with better design

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Clock,
  AlertTriangle,
  RefreshCw,
  Home,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp
} from "lucide-react";

import { userService } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface BlockInfo {
  isBlocked: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
  trustScore: number;
}

export default function BlockedPage() {
  const router = useRouter();
  const { telegramUser, refreshUser } = useUser();
  const t = useT();

  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Check block status on page load
  useEffect(() => {
    checkBlockStatus();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!blockInfo?.timeUntilUnblock) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        blockInfo.timeUntilUnblock! - (Date.now() - lastUpdateTime),
      );

      if (remaining <= 0) {
        checkBlockStatus();
      } else {
        setTimeRemaining(formatTimeRemaining(remaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [blockInfo, lastUpdateTime]);

  const checkBlockStatus = async () => {
    if (!telegramUser?.id) {
      router.push("/");
      return;
    }

    setIsCheckingStatus(true);

    try {
      const securityResult = await userService.checkUserBlockStatus(
        telegramUser.id,
      );

      setBlockInfo({
        isBlocked: securityResult.isBlocked,
        timeUntilUnblock: securityResult.timeUntilUnblock,
        blockReason: securityResult.blockReason,
        trustScore: securityResult.trustScore,
      });

      setLastUpdateTime(Date.now());

      // If user is no longer blocked, redirect to main page
      if (!securityResult.isBlocked) {
        await refreshUser();
        router.push("/main");
        return;
      }

      // Set initial countdown
      if (securityResult.timeUntilUnblock) {
        setTimeRemaining(formatTimeRemaining(securityResult.timeUntilUnblock));
      }
    } catch (error) {
      console.error("Error checking block status:", error);
    } finally {
      setIsLoading(false);
      setIsCheckingStatus(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${seconds}s`;
    }
  };

  const getBlockReasonData = (reason?: string) => {
    switch (reason) {
      case "captcha_failed":
        return {
          title: "Failed Security Verification",
          description: "Multiple failed captcha attempts have triggered a temporary security lock.",
          icon: <XCircle className="text-red-400" size={24} />,
          duration: "2 minutes",
          color: "red"
        };
      case "biometric_failed":
        return {
          title: "Biometric Authentication Failed",
          description: "Biometric verification was unsuccessful, resulting in a temporary account restriction.",
          icon: <Shield className="text-orange-400" size={24} />,
          duration: "5 minutes",
          color: "orange"
        };
      case "suspicious_activity":
        return {
          title: "Suspicious Activity Detected",
          description: "Automated systems have detected unusual behavior patterns requiring verification.",
          icon: <AlertTriangle className="text-yellow-400" size={24} />,
          duration: "10 minutes",
          color: "yellow"
        };
      default:
        return {
          title: "Security Hold",
          description: "Your account is temporarily restricted for security verification.",
          icon: <Shield className="text-gray-400" size={24} />,
          duration: "several minutes",
          color: "gray"
        };
    }
  };

  const getTrustScoreInfo = (score: number) => {
    if (score >= 60) {
      return {
        level: "Good Standing",
        color: "text-green-400",
        bgColor: "bg-green-500/10 border-green-400/30",
        description: "Your security standing is excellent.",
        tips: ["Continue following platform guidelines", "Participate normally in activities"]
      };
    } else if (score >= 40) {
      return {
        level: "Fair Standing",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10 border-yellow-400/30",
        description: "Your security standing needs attention.",
        tips: ["Complete security verifications promptly", "Avoid suspicious activity patterns"]
      };
    } else if (score >= 20) {
      return {
        level: "Low Standing",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10 border-orange-400/30",
        description: "Your security standing requires improvement.",
        tips: ["Pass all security challenges", "Follow all platform guidelines carefully"]
      };
    } else {
      return {
        level: "Critical Standing",
        color: "text-red-400",
        bgColor: "bg-red-500/10 border-red-400/30",
        description: "Your security standing is very low.",
        tips: ["Complete all required verifications", "Review and follow platform policies"]
      };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-white/80 text-lg">Checking account status...</p>
        </div>
      </div>
    );
  }

  const blockReasonData = getBlockReasonData(blockInfo?.blockReason);
  const trustScoreInfo = getTrustScoreInfo(blockInfo?.trustScore || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Main Block Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500/20 via-red-600/20 to-orange-500/20 p-6 border-b border-gray-700/50">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <Shield className="text-red-400" size={40} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Account Temporarily Restricted
              </h1>
              <p className="text-gray-400 text-sm">
                Security measures are currently active
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Block Reason Card */}
            <div className={`rounded-xl p-4 border ${blockReasonData.color === 'red' ? 'bg-red-500/10 border-red-500/30' :
                blockReasonData.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30' :
                  blockReasonData.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-gray-500/10 border-gray-500/30'
              }`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {blockReasonData.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold mb-1">
                    {blockReasonData.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {blockReasonData.description}
                  </p>
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <Clock size={12} className="text-gray-500" />
                    <span className="text-gray-500">
                      Block duration: {blockReasonData.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            {blockInfo?.timeUntilUnblock && blockInfo.timeUntilUnblock > 0 && (
              <div className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-6">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Clock className="text-orange-400" size={20} />
                    <span className="text-gray-300 font-medium">Time Remaining</span>
                  </div>
                  <div className="text-4xl font-bold text-orange-400 font-mono mb-2">
                    {timeRemaining}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(10, 100 - ((blockInfo.timeUntilUnblock - (Date.now() - lastUpdateTime)) / blockInfo.timeUntilUnblock) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs">
                    Your account will be automatically restored
                  </p>
                </div>
              </div>
            )}

            {/* Trust Score Display */}
            <div className={`rounded-xl p-4 border ${trustScoreInfo.bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className={trustScoreInfo.color} size={16} />
                  <span className="text-gray-300 text-sm font-medium">Security Standing</span>
                </div>
                <span className={`font-bold ${trustScoreInfo.color}`}>
                  {blockInfo?.trustScore || 0}/100
                </span>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${trustScoreInfo.color.replace('text-', 'bg-')}`}
                  style={{
                    width: `${Math.max(5, blockInfo?.trustScore || 0)}%`,
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-semibold ${trustScoreInfo.color}`}>
                    {trustScoreInfo.level}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  {trustScoreInfo.description}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                disabled={isCheckingStatus}
                onClick={checkBlockStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>Check Status</span>
                  </>
                )}
              </button>

              <button
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                onClick={() => router.push("/")}
              >
                <Home size={18} />
                <span>Return to Start</span>
              </button>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-6 space-y-4">
          {/* What's Next Card */}
          <div className="bg-gray-900/60 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-white font-semibold mb-2 text-sm">
                  What happens next?
                </h3>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={12} />
                    <p>Your account will be automatically restored when the timer expires</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={12} />
                    <p>Complete future security verifications promptly to improve your standing</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={12} />
                    <p>Follow platform guidelines to maintain good security standing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Tips Card */}
          <div className="bg-gray-900/60 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-white font-semibold mb-2 text-sm">
                  Improve your security standing
                </h3>
                <div className="space-y-1 text-xs text-gray-400">
                  {trustScoreInfo.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === "development" && telegramUser && (
          <div className="mt-4 bg-gray-900/30 border border-gray-700/50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">
              Debug: User {telegramUser.first_name} (ID: {telegramUser.id})
            </p>
            <p className="text-gray-500 text-xs">
              Block reason: {blockInfo?.blockReason || 'unknown'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}