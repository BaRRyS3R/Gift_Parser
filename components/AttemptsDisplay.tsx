// src/components/AttemptsDisplay.tsx - Fixed version with force refresh capability

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, Clock } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { type AttemptsStatus } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface AttemptsDisplayProps {
  className?: string;
}

const AttemptsDisplay: React.FC<AttemptsDisplayProps> = ({
  className = "",
}) => {
  const {
    isAuthenticated,
    getAttemptsStatus,
    forceRefreshAttempts,
    getCachedAttemptsStatus,
  } = useUser();
  const t = useT();

  const [attemptsStatus, setAttemptsStatus] = useState<AttemptsStatus>({
    canPlay: true,
    attemptsRemaining: 0,
  });
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const checkAttempts = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated) {
        setIsLoading(false);

        return;
      }

      try {
        console.log(
          "AttemptsDisplay: Fetching attempts status via API...",
          forceRefresh ? "(force refresh)" : "(normal)",
        );

        let status: AttemptsStatus;

        if (forceRefresh) {
          // Force refresh bypasses cache
          status = await forceRefreshAttempts();
        } else {
          // Try cache first, then server
          const cachedStatus = getCachedAttemptsStatus();

          if (cachedStatus) {
            console.log("AttemptsDisplay: Using cached attempts status");
            status = cachedStatus;
          } else {
            status = await getAttemptsStatus();
          }
        }

        setAttemptsStatus(status);
        console.log(
          "AttemptsDisplay: Attempts status updated successfully:",
          status,
        );
      } catch (error) {
        console.error(
          "AttemptsDisplay: Error checking attempts via API:",
          error,
        );
        // Set default state on error
        setAttemptsStatus({
          canPlay: false,
          attemptsRemaining: 0,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      isAuthenticated,
      getAttemptsStatus,
      forceRefreshAttempts,
      getCachedAttemptsStatus,
    ],
  );

  // Initial load
  useEffect(() => {
    checkAttempts();
  }, [checkAttempts]);

  // NEW: Listen for external updates (purchases, tasks completion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Force refresh when tab becomes visible (user might have made purchase in another tab)
      if (!document.hidden && isAuthenticated) {
        console.log(
          "AttemptsDisplay: Tab became visible, force refreshing attempts",
        );
        checkAttempts(true);
      }
    };

    const handleFocus = () => {
      // Force refresh when window gains focus
      if (isAuthenticated) {
        console.log(
          "AttemptsDisplay: Window focused, force refreshing attempts",
        );
        checkAttempts(true);
      }
    };

    // Listen for browser events
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, checkAttempts]);

  // NEW: Custom event listener for manual updates
  useEffect(() => {
    const handleAttemptsUpdate = () => {
      console.log("AttemptsDisplay: Received attempts update event");
      checkAttempts(true);
    };

    // Listen for custom events
    window.addEventListener("attemptsUpdated", handleAttemptsUpdate);

    return () => {
      window.removeEventListener("attemptsUpdated", handleAttemptsUpdate);
    };
  }, [checkAttempts]);

  // NEW: Periodic refresh when attempts are empty (to catch server resets)
  useEffect(() => {
    if (attemptsStatus.attemptsRemaining === 0 && isAuthenticated) {
      const interval = setInterval(() => {
        console.log("AttemptsDisplay: Periodic refresh for empty attempts");
        checkAttempts(true);
      }, 30000); // Check every 30 seconds when no attempts

      return () => clearInterval(interval);
    }
  }, [attemptsStatus.attemptsRemaining, isAuthenticated, checkAttempts]);

  // Timer update logic
  useEffect(() => {
    if (!attemptsStatus.resetTime || attemptsStatus.canPlay) {
      setTimeUntilReset("");

      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = attemptsStatus.resetTime!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReset("");
        // Force refresh when reset time has passed
        console.log("AttemptsDisplay: Reset time reached, force refreshing");
        checkAttempts(true);
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (hours > 0) {
          setTimeUntilReset(
            `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          );
        } else {
          setTimeUntilReset(
            `${minutes}:${seconds.toString().padStart(2, "0")}`,
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptsStatus.resetTime, attemptsStatus.canPlay, checkAttempts]);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isEmpty = attemptsStatus.attemptsRemaining === 0;

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {isEmpty && timeUntilReset ? (
        <>
          <RotateCcw className="text-red-400" size={18} />
          <span className="text-red-400 text-lg font-bold tabular-nums">
            {timeUntilReset}
          </span>
          <Clock className="text-red-400" size={18} />
        </>
      ) : (
        <>
          <span className="text-white text-lg font-bold tabular-nums">
            {attemptsStatus.attemptsRemaining} ⚡
          </span>
        </>
      )}
    </div>
  );
};

export default AttemptsDisplay;
