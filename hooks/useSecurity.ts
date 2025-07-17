// src/hooks/useSecurity.ts - ИСПРАВЛЕНО: предотвращение множественных вызовов

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { SecurityCheckResult } from "@/lib/supabase";
import { authService } from "@/lib/authService";
import { useUser } from "@/hooks/useUser";

export interface SecurityState {
  isLoading: boolean;
  isBlocked: boolean;
  needsCaptcha: boolean;
  needsBiometric: boolean;
  needsGyroscope: boolean;
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
  // State
  securityState: SecurityState;
  showCaptcha: boolean;
  showBiometric: boolean;
  showGyroscope: boolean;
  captchaData: CaptchaData | null;
  isSilentCheck: boolean;

  // Actions
  checkSecurity: () => Promise<SecurityCheckResult>;
  performSilentCheck: () => Promise<void>;
  handleCaptchaSuccess: () => void;
  handleCaptchaFailure: () => void;
  handleBiometricSuccess: () => void;
  handleBiometricFailure: () => void;
  handleGyroscopeSuccess: () => void;
  handleGyroscopeFailure: () => void;
  dismissSecurityCheck: () => void;
  refreshSecurityStatus: () => Promise<void>;

  // Utils
  isSecurityCheckNeeded: () => boolean;
  formatTrustScore: (score: number) => { color: string; label: string };
}

const SECURITY_CHECK_CACHE_DURATION = 30000; // 30 seconds cache

export function useSecurity(): SecurityHookReturn {
  const router = useRouter();
  const { isAuthenticated, refreshUser, signOut } = useUser();

  const [securityState, setSecurityState] = useState<SecurityState>({
    isLoading: true,
    isBlocked: false,
    needsCaptcha: false,
    needsBiometric: false,
    needsGyroscope: false,
    trustScore: 50,
  });

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showGyroscope, setShowGyroscope] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [isSilentCheck, setIsSilentCheck] = useState(false);

  const isCheckingRef = useRef(false);
  const lastSecurityCheckRef = useRef<number>(0);
  const silentCheckInProgressRef = useRef(false);
  // НОВОЕ: защита от множественного запуска триггера
  const triggerInProgressRef = useRef(false);

  // ИСПРАВЛЕНО: проверка безопасности с защитой от повторных вызовов
  const checkSecurity = useCallback(async (): Promise<SecurityCheckResult> => {
    if (!isAuthenticated || isCheckingRef.current) {
      console.log("Security check skipped: not authenticated or already checking");
      throw new Error(
        "Cannot check security: user not authenticated or check in progress",
      );
    }

    // Use cache if recent
    const now = Date.now();
    if (now - lastSecurityCheckRef.current < SECURITY_CHECK_CACHE_DURATION) {
      console.log("Using cached security status");
      return {
        isBlocked: securityState.isBlocked,
        needsCaptcha: securityState.needsCaptcha,
        needsBiometric: securityState.needsBiometric,
        needsGyroscope: securityState.needsGyroscope,
        trustScore: securityState.trustScore,
        timeUntilUnblock: securityState.timeUntilUnblock,
        blockReason: securityState.blockReason,
      };
    }

    isCheckingRef.current = true;
    setSecurityState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Performing security check via API...");
      const result = await authService.checkUserSecurityStatus();

      // Update state with new thresholds
      const needsCaptcha = !result.isBlocked && result.trustScore < 50;
      const needsBiometric = !result.isBlocked && result.trustScore < 20;
      const needsGyroscope = !result.isBlocked && result.trustScore < 10;

      setSecurityState({
        isLoading: false,
        isBlocked: result.isBlocked,
        needsCaptcha,
        needsBiometric,
        needsGyroscope,
        trustScore: result.trustScore,
        timeUntilUnblock: result.timeUntilUnblock,
        blockReason: result.blockReason,
        lastChecked: now,
      });

      lastSecurityCheckRef.current = now;

      // Handle blocking immediately
      if (result.isBlocked) {
        console.log("User is blocked, redirecting to blocked page");
        router.push("/blocked");
      }

      console.log("Security status checked successfully via API");

      return {
        ...result,
        needsCaptcha,
        needsBiometric,
        needsGyroscope,
      };
    } catch (error) {
      console.error("Error checking security status via API:", error);
      setSecurityState((prev) => ({
        ...prev,
        isLoading: false,
      }));

      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.log("Token expired during security check, signing out user");
        signOut();
      }

      throw error;
    } finally {
      isCheckingRef.current = false;
    }
  }, [isAuthenticated, router, securityState, signOut]);

  // ИСПРАВЛЕНО: silent check с защитой от повторных вызовов
  const performSilentCheck = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || silentCheckInProgressRef.current) {
      console.log("Silent check skipped: not authenticated or already in progress");
      return;
    }

    silentCheckInProgressRef.current = true;
    setIsSilentCheck(true);

    try {
      console.log("Performing silent security check...");
      await checkSecurity();
      console.log("Silent security check completed");
    } catch (error) {
      console.error("Silent security check failed:", error);
    } finally {
      silentCheckInProgressRef.current = false;
      setIsSilentCheck(false);
    }
  }, [isAuthenticated, checkSecurity]);

  // ИСПРАВЛЕНО: триггер проверки безопасности с защитой от повторных вызовов
  const triggerSecurityCheck = useCallback(async () => {
    if (!isAuthenticated || triggerInProgressRef.current) {
      console.log("Security trigger skipped: not authenticated or already in progress");
      return;
    }

    triggerInProgressRef.current = true;

    try {
      const result = await checkSecurity();

      // Show appropriate modal based on priority
      if (result.needsGyroscope && !result.isBlocked) {
        console.log("Showing gyroscope modal");
        setShowGyroscope(true);
      } else if (result.needsBiometric && !result.isBlocked) {
        console.log("Showing biometric modal");
        setShowBiometric(true);
      } else if (result.needsCaptcha && !result.isBlocked) {
        // ИСПРАВЛЕНО: генерируем капчу только один раз здесь
        try {
          console.log("Generating captcha for security check...");
          const captcha = await authService.generateCaptcha();
          setCaptchaData(captcha);
          setShowCaptcha(true);
          console.log("Captcha generated and modal shown");
        } catch (error) {
          console.error("Failed to generate captcha:", error);
          if (
            error instanceof Error &&
            error.message.includes("Authentication expired")
          ) {
            console.log("Token expired during captcha generation, signing out user");
            signOut();
          }
        }
      }
    } catch (error) {
      console.error("Error triggering security check:", error);
    } finally {
      triggerInProgressRef.current = false;
    }
  }, [checkSecurity, isAuthenticated, signOut]);

  // Check if security check is needed
  const isSecurityCheckNeeded = useCallback((): boolean => {
    return (
      (securityState.needsCaptcha ||
        securityState.needsBiometric ||
        securityState.needsGyroscope) &&
      !securityState.isBlocked
    );
  }, [securityState]);

  // ИСПРАВЛЕНО: обработчики успеха/неудачи с очисткой состояния
  const handleCaptchaSuccess = useCallback(() => {
    console.log("Captcha verification successful");
    setShowCaptcha(false);
    setCaptchaData(null); // ВАЖНО: очищаем данные

    // Update trust score to 40
    setSecurityState(prev => ({
      ...prev,
      trustScore: 40,
      needsCaptcha: false,
    }));

    // Invalidate cache to force fresh check
    lastSecurityCheckRef.current = 0;
    triggerInProgressRef.current = false;

    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleCaptchaFailure = useCallback(() => {
    console.log("Captcha verification failed - user will be blocked");
    setShowCaptcha(false);
    setCaptchaData(null); // ВАЖНО: очищаем данные
    triggerInProgressRef.current = false;

    setSecurityState(prev => ({
      ...prev,
      trustScore: 19,
      isBlocked: true,
    }));

    router.push("/blocked");
  }, [router]);

  const handleBiometricSuccess = useCallback(() => {
    console.log("Biometric verification successful");
    setShowBiometric(false);
    triggerInProgressRef.current = false;

    setSecurityState(prev => ({
      ...prev,
      trustScore: 39,
      needsBiometric: false,
      needsCaptcha: false,
    }));

    lastSecurityCheckRef.current = 0;
    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleBiometricFailure = useCallback(() => {
    console.log("Biometric verification failed - user will be blocked");
    setShowBiometric(false);
    triggerInProgressRef.current = false;

    setSecurityState(prev => ({
      ...prev,
      trustScore: 9,
      isBlocked: true,
    }));

    router.push("/blocked");
  }, [router]);

  const handleGyroscopeSuccess = useCallback(() => {
    console.log("Gyroscope verification successful");
    setShowGyroscope(false);
    triggerInProgressRef.current = false;

    setSecurityState(prev => ({
      ...prev,
      trustScore: 19,
      needsGyroscope: false,
    }));

    lastSecurityCheckRef.current = 0;
    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleGyroscopeFailure = useCallback(() => {
    console.log("Gyroscope verification failed - user will be permanently blocked");
    setShowGyroscope(false);
    triggerInProgressRef.current = false;

    setSecurityState(prev => ({
      ...prev,
      isBlocked: true,
    }));

    router.push("/blocked");
  }, [router]);

  // Dismiss security checks (for testing/admin)
  const dismissSecurityCheck = useCallback(() => {
    setShowCaptcha(false);
    setShowBiometric(false);
    setShowGyroscope(false);
    setCaptchaData(null);
    triggerInProgressRef.current = false;
  }, []);

  // Refresh security status
  const refreshSecurityStatus = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security status refresh");
      return;
    }

    // Clear cache to force fresh check
    lastSecurityCheckRef.current = 0;
    triggerInProgressRef.current = false;

    try {
      await checkSecurity();
    } catch (error) {
      console.error("Error refreshing security status:", error);
    }
  }, [checkSecurity, isAuthenticated]);

  // Format trust score for display with updated thresholds
  const formatTrustScore = useCallback((score: number) => {
    if (score >= 50) {
      return { color: "text-green-400", label: "Good" };
    } else if (score >= 20) {
      return { color: "text-yellow-400", label: "Fair" };
    } else if (score >= 10) {
      return { color: "text-orange-400", label: "Low" };
    } else {
      return { color: "text-red-400", label: "Critical" };
    }
  }, []);

  // Auto check security on mount and authentication changes
  useEffect(() => {
    if (isAuthenticated && !isCheckingRef.current) {
      checkSecurity().catch((error) => {
        console.error("Initial security check failed:", error);
      });
    } else if (!isAuthenticated) {
      setSecurityState({
        isLoading: false,
        isBlocked: false,
        needsCaptcha: false,
        needsBiometric: false,
        needsGyroscope: false,
        trustScore: 50,
      });
    }
  }, [isAuthenticated, checkSecurity]);

  // ИСПРАВЛЕНО: автотриггер с защитой от повторных вызовов
  useEffect(() => {
    if (
      isAuthenticated &&
      isSecurityCheckNeeded() &&
      !showCaptcha &&
      !showBiometric &&
      !showGyroscope &&
      !isSilentCheck &&
      !triggerInProgressRef.current
    ) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        triggerSecurityCheck();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    isAuthenticated,
    isSecurityCheckNeeded,
    showCaptcha,
    showBiometric,
    showGyroscope,
    triggerSecurityCheck,
    isSilentCheck,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
      silentCheckInProgressRef.current = false;
      triggerInProgressRef.current = false;
    };
  }, []);

  return {
    // State
    securityState,
    showCaptcha,
    showBiometric,
    showGyroscope,
    captchaData,
    isSilentCheck,

    // Actions
    checkSecurity,
    performSilentCheck,
    handleCaptchaSuccess,
    handleCaptchaFailure,
    handleBiometricSuccess,
    handleBiometricFailure,
    handleGyroscopeSuccess,
    handleGyroscopeFailure,
    dismissSecurityCheck,
    refreshSecurityStatus,

    // Utils
    isSecurityCheckNeeded,
    formatTrustScore,
  };
}