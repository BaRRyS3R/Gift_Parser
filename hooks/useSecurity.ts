// src/hooks/useSecurity.ts - Fixed auto-unlock after successful verification

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
  captchaData: CaptchaData | null;

  // Actions
  checkSecurity: () => Promise<SecurityCheckResult>;
  handleCaptchaSuccess: () => void;
  handleCaptchaFailure: () => void;
  handleBiometricSuccess: () => void;
  handleBiometricFailure: () => void;
  dismissSecurityCheck: () => void;
  refreshSecurityStatus: () => Promise<void>;

  // Utils
  isSecurityCheckNeeded: () => boolean;
  formatTrustScore: (score: number) => { color: string; label: string };

  // FIX: Add security initialized state
  isSecurityInitialized: () => boolean;
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
    trustScore: 50,
  });

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);

  // FIX: Track security initialization
  const [securityInitialized, setSecurityInitialized] = useState(false);

  const isCheckingRef = useRef(false);
  const lastSecurityCheckRef = useRef<number>(0);

  // FIX: Update security initialization when state is ready
  useEffect(() => {
    if (isAuthenticated && !securityState.isLoading) {
      setSecurityInitialized(true);
    } else if (!isAuthenticated) {
      setSecurityInitialized(false);
    }
  }, [isAuthenticated, securityState.isLoading]);

  // UPDATED: Strict security check - API only, no fallback to direct Supabase
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
        trustScore: securityState.trustScore,
        timeUntilUnblock: securityState.timeUntilUnblock,
        blockReason: securityState.blockReason,
      };
    }

    isCheckingRef.current = true;
    setSecurityState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Checking security status via API...");

      // STRICT: Only use API calls for authenticated users
      const result = await authService.checkUserSecurityStatus();

      // Update state with results
      setSecurityState({
        isLoading: false,
        isBlocked: result.isBlocked,
        needsCaptcha: result.needsCaptcha,
        needsBiometric: result.needsBiometric,
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

      return result;
    } catch (error) {
      console.error("Error checking security status via API:", error);

      // CRITICAL: Do not fallback to direct Supabase calls
      setSecurityState((prev) => ({
        ...prev,
        isLoading: false,
        // On error, maintain previous state but stop loading
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

  // Auto check security on mount and authentication changes
  useEffect(() => {
    if (isAuthenticated && !isCheckingRef.current) {
      checkSecurity().catch((error) => {
        console.error("Initial security check failed:", error);
      });
    } else if (!isAuthenticated) {
      // Reset security state for non-authenticated users
      setSecurityState({
        isLoading: false,
        isBlocked: false,
        needsCaptcha: false,
        needsBiometric: false,
        trustScore: 50,
      });
      setSecurityInitialized(false);
    }
  }, [isAuthenticated, checkSecurity]);

  // Handle security check triggers
  const triggerSecurityCheck = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security check trigger");

      return;
    }

    try {
      const result = await checkSecurity();

      // Show appropriate modal based on security needs
      if (result.needsBiometric && !result.isBlocked) {
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
            console.log(
              "Token expired during captcha generation, signing out user",
            );
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
      (securityState.needsCaptcha || securityState.needsBiometric) &&
      !securityState.isBlocked
    );
  }, [securityState]);

  // FIX: Check if security is initialized
  const isSecurityInitialized = useCallback((): boolean => {
    return securityInitialized;
  }, [securityInitialized]);

  // UPDATED: Strict captcha handlers using API methods only
  const handleCaptchaSuccess = useCallback(() => {
    console.log("Captcha verification successful");
    setShowCaptcha(false);
    setCaptchaData(null);

    // FIX: Force security status refresh and re-initialization
    refreshSecurityStatus().then(() => {
      setSecurityInitialized(true);
    });
    refreshUser();
  }, [refreshUser]);

  const handleCaptchaFailure = useCallback(() => {
    console.log("Captcha verification failed - user will be blocked");
    setShowCaptcha(false);
    setCaptchaData(null);

    // Redirect to blocked page
    router.push("/blocked");
  }, [router]);

  // UPDATED: Strict biometric handlers using API methods only
  const handleBiometricSuccess = useCallback(() => {
    console.log("Biometric verification successful");
    setShowBiometric(false);

    // FIX: Force security status refresh and re-initialization
    refreshSecurityStatus().then(() => {
      setSecurityInitialized(true);
    });
    refreshUser();
  }, [refreshUser]);

  const handleBiometricFailure = useCallback(() => {
    console.log("Biometric verification failed - user will be blocked");
    setShowBiometric(false);

    // Redirect to blocked page
    router.push("/blocked");
  }, [router]);

  // Dismiss security checks (for testing/admin)
  const dismissSecurityCheck = useCallback(() => {
    setShowCaptcha(false);
    setShowBiometric(false);
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

  // Format trust score for display
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

  // Auto-trigger security checks when needed
  useEffect(() => {
    if (
      isAuthenticated &&
      isSecurityCheckNeeded() &&
      !showCaptcha &&
      !showBiometric
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
    triggerSecurityCheck,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
    };
  }, []);

  return {
    // State
    securityState,
    showCaptcha,
    showBiometric,
    captchaData,

    // Actions
    checkSecurity,
    handleCaptchaSuccess,
    handleCaptchaFailure,
    handleBiometricSuccess,
    handleBiometricFailure,
    dismissSecurityCheck,
    refreshSecurityStatus,

    // Utils
    isSecurityCheckNeeded,
    formatTrustScore,
    isSecurityInitialized, // FIX: Export security initialization state
  };
}