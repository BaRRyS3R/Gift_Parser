// src/hooks/useSecurity.ts - Updated with unified modal and new trust score thresholds

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { SecurityCheckResult } from "@/lib/supabase";
import {
  authService,
  generateSecureCaptcha,
  validateSecureCaptcha,
  validateSecureBiometric,
} from "@/lib/authService";
import { useUser } from "@/hooks/useUser";

export type SecurityType = "captcha" | "biometric" | "gyroscope";

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
  showSecurityModal: boolean;
  securityModalType: SecurityType | null;
  captchaData: CaptchaData | null;

  // Actions
  checkSecurity: () => Promise<SecurityCheckResult>;
  handleSecuritySuccess: () => void;
  handleSecurityFailure: () => void;
  dismissSecurityCheck: () => void;
  refreshSecurityStatus: () => Promise<void>;
  manualTriggerSecurityCheck: () => Promise<void>;

  // Utils
  isSecurityCheckNeeded: () => boolean;
  getRequiredSecurityType: () => SecurityType | null;
  formatTrustScore: (score: number) => { color: string; label: string };

  // Security check visibility - new feature
  shouldBlockUI: () => boolean;
}

const SECURITY_CHECK_CACHE_DURATION = 30000; // 30 seconds cache

// Updated trust score thresholds
const TRUST_SCORE_THRESHOLDS = {
  GYROSCOPE: 10, // Below this requires gyroscope
  BIOMETRIC: 20, // Below this requires biometric  
  CAPTCHA: 40,   // Below this requires captcha
  GOOD: 60,      // Above this is considered good
};

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

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityModalType, setSecurityModalType] = useState<SecurityType | null>(null);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);

  const isCheckingRef = useRef(false);
  const lastSecurityCheckRef = useRef<number>(0);

  // Enhanced security check with new thresholds
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

      const result = await authService.checkUserSecurityStatus();

      // Enhanced logic with new thresholds
      const needsGyroscope = !result.isBlocked && result.trustScore < TRUST_SCORE_THRESHOLDS.GYROSCOPE;
      const needsBiometric = !result.isBlocked && result.trustScore < TRUST_SCORE_THRESHOLDS.BIOMETRIC && !needsGyroscope;
      const needsCaptcha = !result.isBlocked && result.trustScore < TRUST_SCORE_THRESHOLDS.CAPTCHA && !needsBiometric && !needsGyroscope;

      // Update state with enhanced security checks
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
        // Extending the result with gyroscope check
        needsGyroscope,
      } as SecurityCheckResult & { needsGyroscope: boolean };
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
        needsGyroscope: false,
        trustScore: 50,
      });
    }
  }, [isAuthenticated, checkSecurity]);

  // Get required security type based on trust score
  const getRequiredSecurityType = useCallback((): SecurityType | null => {
    if (securityState.isBlocked) return null;

    if (securityState.needsGyroscope) return "gyroscope";
    if (securityState.needsBiometric) return "biometric";
    if (securityState.needsCaptcha) return "captcha";

    return null;
  }, [securityState]);

  // Check if security verification is needed
  const isSecurityCheckNeeded = useCallback((): boolean => {
    return (
      (securityState.needsCaptcha ||
        securityState.needsBiometric ||
        securityState.needsGyroscope) &&
      !securityState.isBlocked
    );
  }, [securityState]);

  // NEW: Check if UI should be blocked (immediate check without waiting for modals)
  const shouldBlockUI = useCallback((): boolean => {
    return isSecurityCheckNeeded() || securityState.isLoading;
  }, [isSecurityCheckNeeded, securityState.isLoading]);

  // Handle security check triggers with new unified modal
  const triggerSecurityCheck = useCallback(async () => {
    if (!isAuthenticated || securityState.isBlocked) {
      console.log("User not authenticated or blocked, skipping security check trigger");
      return;
    }

    try {
      const result = await checkSecurity();
      const requiredType = getRequiredSecurityType();

      if (requiredType && !showSecurityModal) {
        console.log(`Triggering security check: ${requiredType}`);

        // Generate captcha if needed
        if (requiredType === "captcha" || requiredType === "gyroscope") {
          try {
            console.log("Generating captcha via API...");
            const captcha = await authService.generateCaptcha();
            setCaptchaData(captcha);
            console.log("Captcha generated successfully via API");
          } catch (error) {
            console.error("Failed to generate captcha via API:", error);
            if (
              error instanceof Error &&
              error.message.includes("Authentication expired")
            ) {
              console.log("Token expired during captcha generation, signing out user");
              signOut();
              return;
            }
          }
        }

        setSecurityModalType(requiredType);
        setShowSecurityModal(true);
      }
    } catch (error) {
      console.error("Error triggering security check:", error);
    }
  }, [checkSecurity, isAuthenticated, securityState.isBlocked, showSecurityModal, getRequiredSecurityType, signOut]);

  // Enhanced security handlers
  const handleSecuritySuccess = useCallback(() => {
    console.log("Security verification successful");
    setShowSecurityModal(false);
    setSecurityModalType(null);
    setCaptchaData(null);

    // Refresh security status and user data
    refreshSecurityStatus();
    refreshUser();
  }, [refreshUser]);

  const handleSecurityFailure = useCallback(() => {
    console.log("Security verification failed - user will be blocked");
    setShowSecurityModal(false);
    setSecurityModalType(null);
    setCaptchaData(null);

    // Redirect to blocked page
    router.push("/blocked");
  }, [router]);

  // Dismiss security checks (for testing/admin)
  const dismissSecurityCheck = useCallback(() => {
    setShowSecurityModal(false);
    setSecurityModalType(null);
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
    if (score >= TRUST_SCORE_THRESHOLDS.GOOD) {
      return { color: "text-green-400", label: "Good" };
    } else if (score >= TRUST_SCORE_THRESHOLDS.CAPTCHA) {
      return { color: "text-yellow-400", label: "Fair" };
    } else if (score >= TRUST_SCORE_THRESHOLDS.BIOMETRIC) {
      return { color: "text-orange-400", label: "Low" };
    } else {
      return { color: "text-red-400", label: "Very Low" };
    }
  }, []);

  // Auto-trigger security checks when needed but don't show to user immediately
  useEffect(() => {
    if (
      isAuthenticated &&
      isSecurityCheckNeeded() &&
      !showSecurityModal
    ) {
      // Small delay to ensure UI is ready, but don't auto-show modal
      const timer = setTimeout(() => {
        console.log("Security check needed but not auto-triggering modal");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    isAuthenticated,
    isSecurityCheckNeeded,
    showSecurityModal,
  ]);

  // Manual trigger method for when user tries to perform actions
  const manualTriggerSecurityCheck = useCallback(async () => {
    if (isSecurityCheckNeeded()) {
      await triggerSecurityCheck();
    }
  }, [isSecurityCheckNeeded, triggerSecurityCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
    };
  }, []);

  return {
    // State
    securityState,
    showSecurityModal,
    securityModalType,
    captchaData,

    // Actions
    checkSecurity,
    handleSecuritySuccess,
    handleSecurityFailure,
    dismissSecurityCheck,
    refreshSecurityStatus,
    manualTriggerSecurityCheck,

    // Utils
    isSecurityCheckNeeded,
    getRequiredSecurityType,
    formatTrustScore,
    shouldBlockUI,
  };
}