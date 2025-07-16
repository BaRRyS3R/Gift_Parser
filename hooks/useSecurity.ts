// src/hooks/useSecurity.ts - Updated with new security thresholds and gyroscope

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

  // Updated security check with new thresholds
  const checkSecurity = useCallback(async (): Promise<SecurityCheckResult> => {
    if (!isAuthenticated || isCheckingRef.current) {
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
      console.log("Checking security status via API...");
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

  // Silent security check for main page
  const performSilentCheck = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || silentCheckInProgressRef.current) {
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

  // Handle security check triggers with priority order: Gyroscope > Biometric > Captcha
  const triggerSecurityCheck = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security check trigger");
      return;
    }

    try {
      const result = await checkSecurity();

      // Show appropriate modal based on priority
      if (result.needsGyroscope && !result.isBlocked) {
        setShowGyroscope(true);
      } else if (result.needsBiometric && !result.isBlocked) {
        setShowBiometric(true);
      } else if (result.needsCaptcha && !result.isBlocked) {
        // Generate captcha using API method
        try {
          console.log("Generating captcha via API...");
          const captcha = await authService.generateCaptcha();
          setCaptchaData(captcha);
          setShowCaptcha(true);
          console.log("Captcha generated successfully via API");
        } catch (error) {
          console.error("Failed to generate captcha via API:", error);
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

  // Captcha handlers with updated trust scores
  const handleCaptchaSuccess = useCallback(() => {
    console.log("Captcha verification successful");
    setShowCaptcha(false);
    setCaptchaData(null);

    // Update trust score to 40
    setSecurityState(prev => ({
      ...prev,
      trustScore: 40,
      needsCaptcha: false,
    }));

    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleCaptchaFailure = useCallback(() => {
    console.log("Captcha verification failed - user will be blocked");
    setShowCaptcha(false);
    setCaptchaData(null);

    // Trust score will be set to 19 by the API
    setSecurityState(prev => ({
      ...prev,
      trustScore: 19,
      isBlocked: true,
    }));

    router.push("/blocked");
  }, [router]);

  // Biometric handlers with updated trust scores
  const handleBiometricSuccess = useCallback(() => {
    console.log("Biometric verification successful");
    setShowBiometric(false);

    // Update trust score to 39
    setSecurityState(prev => ({
      ...prev,
      trustScore: 39,
      needsBiometric: false,
      needsCaptcha: false,
    }));

    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleBiometricFailure = useCallback(() => {
    console.log("Biometric verification failed - user will be blocked");
    setShowBiometric(false);

    // Trust score will be set to 9 by the API
    setSecurityState(prev => ({
      ...prev,
      trustScore: 9,
      isBlocked: true,
    }));

    router.push("/blocked");
  }, [router]);

  // Gyroscope handlers
  const handleGyroscopeSuccess = useCallback(() => {
    console.log("Gyroscope verification successful");
    setShowGyroscope(false);

    // Update trust score to 19
    setSecurityState(prev => ({
      ...prev,
      trustScore: 19,
      needsGyroscope: false,
    }));

    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleGyroscopeFailure = useCallback(() => {
    console.log("Gyroscope verification failed - user will be permanently blocked");
    setShowGyroscope(false);

    // User will be blocked for 1 year
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
  }, []);

  // Refresh security status
  const refreshSecurityStatus = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security status refresh");
      return;
    }

    // Clear cache to force fresh check
    lastSecurityCheckRef.current = 0;

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

  // Auto-trigger security checks when needed with priority
  useEffect(() => {
    if (
      isAuthenticated &&
      isSecurityCheckNeeded() &&
      !showCaptcha &&
      !showBiometric &&
      !showGyroscope &&
      !isSilentCheck
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