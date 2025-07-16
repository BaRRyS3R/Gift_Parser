// src/app/blocked/page.tsx - Simplified blocked page without complex CSS

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Clock, RefreshCw, Home } from "lucide-react";

import { userService } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";

interface BlockInfo {
  isBlocked: boolean;
  timeUntilUnblock?: number;
  blockReason?: string;
  trustScore: number;
}

export default function BlockedPage() {
  const router = useRouter();
  const { telegramUser, refreshUser } = useUser();

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

  const getBlockReasonText = (reason?: string): string => {
    switch (reason) {
      case "captcha_failed":
        return "Failed Security Verification";
      case "biometric_failed":
        return "Biometric Authentication Failed";
      case "suspicious_activity":
        return "Suspicious Activity Detected";
      default:
        return "Security Hold";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto animate-spin mb-4" size={32} />
          <p>Checking account status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="text-red-400" size={32} />
          </div>
          <h1 className="text-xl font-bold">Account Temporarily Restricted</h1>
          <p className="text-gray-400 text-sm">
            Your account access has been temporarily limited
          </p>
        </div>

        {/* Block Reason */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">
            {getBlockReasonText(blockInfo?.blockReason)}
          </h3>
          <p className="text-gray-400 text-sm">
            This restriction was applied automatically for security reasons
          </p>
        </div>

        {/* Countdown Timer */}
        {blockInfo?.timeUntilUnblock && blockInfo.timeUntilUnblock > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="text-orange-400" size={16} />
              <span className="text-gray-300 text-sm">Time Remaining</span>
            </div>
            <div className="text-2xl font-bold text-orange-400 font-mono">
              {timeRemaining}
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Your account will be automatically restored
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

          <button
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            onClick={() => router.push("/")}
          >
            <Home size={16} />
            <span>Return to Start</span>
          </button>
        </div>

        {/* Simple Info */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs">
            This restriction will be automatically lifted when the timer expires.
            Please follow platform guidelines to maintain good standing.
          </p>
        </div>

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === "development" && telegramUser && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs">
              Debug: User {telegramUser.first_name} (ID: {telegramUser.id})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}