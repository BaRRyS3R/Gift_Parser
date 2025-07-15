// src/hooks/useSecurity.ts - Refactored: all security operations via API routes only

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export interface SecurityState {
  isLoading: boolean;
  isBlocked: boolean;
  needsCaptcha: boolean;
  needsBiometric: boolean;
  trustScore: number;
  timeUntilUnblock?: number;
  blockReason?: string;
  lastChecked?: number;
}

export interface CaptchaData {
  challenge: string;
  correctAnswer: string;
  expiresAt: number;
}

interface SecurityHookReturn {
  securityState: SecurityState;
  showCaptcha: boolean;
  showBiometric: boolean;
  captchaData: CaptchaData | null;
  checkSecurity: () => Promise<any>;
  handleCaptchaSuccess: () => void;
  handleCaptchaFailure: () => void;
  handleBiometricSuccess: () => void;
  handleBiometricFailure: () => void;
  dismissSecurityCheck: () => void;
  refreshSecurityStatus: () => Promise<void>;
  isSecurityCheckNeeded: () => boolean;
  formatTrustScore: (score: number) => { color: string; label: string };
}

const SECURITY_CHECK_CACHE_DURATION = 30000;

export function useSecurity(): SecurityHookReturn {
  const router = useRouter();
  const { telegramUser, refreshUser } = useUser();

  const [securityState, setSecurityState] = useState<SecurityState>({
    isLoading: true,
    isBlocked: false,
    needsCaptcha: false,
    needsBiometric: false,
    trustScore: 50,
  });
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const isCheckingRef = useRef(false);
  const lastSecurityCheckRef = useRef<number>(0);

  // Check security status
  const checkSecurity = useCallback(async () => {
    if (!telegramUser?.id || isCheckingRef.current) {
      throw new Error(
        "Cannot check security: user not available or check in progress",
      );
    }
    const now = Date.now();
    if (now - lastSecurityCheckRef.current < SECURITY_CHECK_CACHE_DURATION) {
      return securityState;
    }
    isCheckingRef.current = true;
    setSecurityState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch("/api/security/check-status", {
        headers: {
          Authorization: "Bearer " + (localStorage.getItem("jwt") || ""),
        },
      });
      const data = await res.json();
      setSecurityState({
        isLoading: false,
        isBlocked: data.isBlocked,
        needsCaptcha: data.needsCaptcha,
        needsBiometric: data.needsBiometric,
        trustScore: data.trustScore,
        timeUntilUnblock: data.timeUntilUnblock,
        blockReason: data.blockReason,
        lastChecked: now,
      });
      lastSecurityCheckRef.current = now;
      if (data.isBlocked) {
        router.push("/blocked");
      }
      return data;
    } catch (error) {
      setSecurityState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    } finally {
      isCheckingRef.current = false;
    }
  }, [telegramUser?.id, router, securityState]);

  useEffect(() => {
    if (telegramUser?.id && !isCheckingRef.current) {
      checkSecurity().catch((error) => {
        console.error("Initial security check failed:", error);
      });
    }
  }, [telegramUser?.id, checkSecurity]);

  // Trigger security check and show modals
  const triggerSecurityCheck = useCallback(async () => {
    try {
      const result = await checkSecurity();
      if (result.needsBiometric && !result.isBlocked) {
        setShowBiometric(true);
      } else if (result.needsCaptcha && !result.isBlocked) {
        try {
          const res = await fetch("/api/security/generate-captcha", {
            headers: {
              Authorization: "Bearer " + (localStorage.getItem("jwt") || ""),
            },
          });
          const captcha = await res.json();
          setCaptchaData(captcha);
          setShowCaptcha(true);
        } catch (error) {
          console.error("Failed to generate captcha:", error);
        }
      }
    } catch (error) {
      console.error("Error triggering security check:", error);
    }
  }, [checkSecurity]);

  const isSecurityCheckNeeded = useCallback(() => {
    return (
      (securityState.needsCaptcha || securityState.needsBiometric) &&
      !securityState.isBlocked
    );
  }, [securityState]);

  // Captcha handlers
  const handleCaptchaSuccess = useCallback(() => {
    setShowCaptcha(false);
    setCaptchaData(null);
    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);
  const handleCaptchaFailure = useCallback(() => {
    setShowCaptcha(false);
    setCaptchaData(null);
    router.push("/blocked");
  }, [router]);

  // Biometric handlers
  const handleBiometricSuccess = useCallback(() => {
    setShowBiometric(false);
    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);
  const handleBiometricFailure = useCallback(() => {
    setShowBiometric(false);
    router.push("/blocked");
  }, [router]);

  const dismissSecurityCheck = useCallback(() => {
    setShowCaptcha(false);
    setShowBiometric(false);
    setCaptchaData(null);
  }, []);

  const refreshSecurityStatus = useCallback(async () => {
    lastSecurityCheckRef.current = 0;
    try {
      await checkSecurity();
    } catch (error) {
      console.error("Error refreshing security status:", error);
    }
  }, [checkSecurity]);

  const formatTrustScore = useCallback((score: number) => {
    if (score >= 60) {
      return { color: "text-green-400", label: "Good" };
    } else if (score >= 40) {
      return { color: "text-yellow-400", label: "Fair" };
    } else if (score >= 20) {
      return { color: "text-orange-400", label: "Low" };
    } else {
      return { color: "text-red-400", label: "Very Low" };
    }
  }, []);

  useEffect(() => {
    if (isSecurityCheckNeeded() && !showCaptcha && !showBiometric) {
      const timer = setTimeout(() => {
        triggerSecurityCheck();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSecurityCheckNeeded, showCaptcha, showBiometric, triggerSecurityCheck]);

  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
    };
  }, []);

  return {
    securityState,
    showCaptcha,
    showBiometric,
    captchaData,
    checkSecurity,
    handleCaptchaSuccess,
    handleCaptchaFailure,
    handleBiometricSuccess,
    handleBiometricFailure,
    dismissSecurityCheck,
    refreshSecurityStatus,
    isSecurityCheckNeeded,
    formatTrustScore,
  };
}
