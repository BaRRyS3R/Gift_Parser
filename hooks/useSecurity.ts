// src/hooks/useSecurity.ts - Fixed duplicate calls and trust score display

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

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

  // Manual trigger methods for Nebula page
  startCaptchaVerification: () => Promise<void>;
  startBiometricVerification: () => void;

  // Utils
  isSecurityCheckNeeded: () => boolean;
  formatTrustScore: (score: number) => { color: string; label: string };
  isSecurityInitialized: () => boolean;
}

const SECURITY_CHECK_CACHE_DURATION = 30000; // 30 seconds cache
const SECURITY_EVENT = 'security-state-changed';

const emitSecurityStateChange = () => {
  if (typeof window !== 'undefined') {
    console.log('Emitting security state change event');
    window.dispatchEvent(new CustomEvent(SECURITY_EVENT));
  }
};

export function useSecurity(): SecurityHookReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, refreshUser, signOut } = useUser();

  const [securityState, setSecurityState] = useState<SecurityState>({
    isLoading: false,
    isBlocked: false,
    needsCaptcha: false,
    needsBiometric: false,
    trustScore: 50, // Default value instead of 0 to prevent empty display
  });

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);

  // Track security initialization
  const [securityInitialized, setSecurityInitialized] = useState(false);

  // FIXED: Single source of truth for checking state
  const isCheckingRef = useRef(false);
  const lastSecurityCheckRef = useRef<number>(0);
  const initializationRef = useRef(false);

  // Track captcha generation to prevent duplicates
  const captchaGenerationRef = useRef(false);

  // Check if we're on the Nebula page
  const isOnNebulaPage = pathname === '/nebula';

  // FIXED: Enhanced security initialization logic with proper trust score handling
  useEffect(() => {
    if (!isAuthenticated) {
      setSecurityInitialized(false);
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        trustScore: 50 // Reset to default
      }));
      return;
    }

    if (!securityState.isLoading) {
      const isVerificationNeeded = securityState.needsCaptcha || securityState.needsBiometric;
      const hasGoodTrustScore = securityState.trustScore >= 40;

      if (!securityState.isBlocked && (!isVerificationNeeded || hasGoodTrustScore)) {
        setSecurityInitialized(true);
      } else if (securityState.isBlocked || isVerificationNeeded) {
        setSecurityInitialized(false);
      }
    }
  }, [
    isAuthenticated,
    securityState.isLoading,
    securityState.isBlocked,
    securityState.needsCaptcha,
    securityState.needsBiometric,
    securityState.trustScore
  ]);

  // FIXED: Improved security check with single execution guarantee
  const checkSecurity = useCallback(async (): Promise<SecurityCheckResult> => {
    if (!isAuthenticated) {
      console.log("Cannot check security: user not authenticated");
      throw new Error("User not authenticated");
    }

    if (isCheckingRef.current) {
      console.log("Security check already in progress, returning cached result");
      // Return current state as result instead of throwing error
      return {
        isBlocked: securityState.isBlocked,
        needsCaptcha: securityState.needsCaptcha,
        needsBiometric: securityState.needsBiometric,
        trustScore: securityState.trustScore,
        timeUntilUnblock: securityState.timeUntilUnblock,
        blockReason: securityState.blockReason,
      };
    }

    const now = Date.now();

    // Use cache if recent and valid
    if (
      now - lastSecurityCheckRef.current < SECURITY_CHECK_CACHE_DURATION &&
      securityState.lastChecked &&
      !securityState.isLoading
    ) {
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

    // Set checking flag and loading state
    isCheckingRef.current = true;
    setSecurityState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Checking security status via API...");

      const result = await authService.checkUserSecurityStatus();

      // FIXED: Ensure trust score is always a valid number
      const trustScore = typeof result.trustScore === 'number' && !isNaN(result.trustScore)
        ? result.trustScore
        : 50;

      // Update state with results
      setSecurityState({
        isLoading: false,
        isBlocked: result.isBlocked,
        needsCaptcha: result.needsCaptcha,
        needsBiometric: result.needsBiometric,
        trustScore: trustScore,
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

      console.log("Security status checked successfully via API", { trustScore });
      return { ...result, trustScore };
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

  // FIXED: Controlled initialization - only once per session
  useEffect(() => {
    if (!isAuthenticated || initializationRef.current || isOnNebulaPage) {
      return;
    }

    initializationRef.current = true;

    const timeoutId = setTimeout(() => {
      if (isAuthenticated && !isCheckingRef.current) {
        checkSecurity().catch((error) => {
          console.error("Initial security check failed:", error);
        });
      }
    }, 1000); // Single delayed check

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, isOnNebulaPage, checkSecurity]);

  // Reset state for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setSecurityState({
        isLoading: false,
        isBlocked: false,
        needsCaptcha: false,
        needsBiometric: false,
        trustScore: 50,
      });
      setSecurityInitialized(false);
      initializationRef.current = false;
      isCheckingRef.current = false;
      captchaGenerationRef.current = false;
    }
  }, [isAuthenticated]);

  // FIXED: Single captcha generation with duplicate prevention
  const startCaptchaVerification = useCallback(async () => {
    if (captchaGenerationRef.current) {
      console.log("Captcha generation already in progress, skipping");
      return;
    }

    captchaGenerationRef.current = true;

    try {
      console.log("Starting captcha verification manually...");
      const captcha = await authService.generateCaptcha();
      setCaptchaData(captcha);
      setShowCaptcha(true);
      console.log("Captcha generated successfully for manual verification");
    } catch (error) {
      console.error("Failed to generate captcha for manual verification:", error);
      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.log("Token expired during captcha generation, signing out user");
        signOut();
      }
      throw error;
    } finally {
      // Reset flag after a delay to allow for modal display
      setTimeout(() => {
        captchaGenerationRef.current = false;
      }, 1000);
    }
  }, [signOut]);

  // Manual trigger for biometric verification (for Nebula page)
  const startBiometricVerification = useCallback(() => {
    console.log("Starting biometric verification manually...");
    setShowBiometric(true);
  }, []);

  // Check if security check is needed
  const isSecurityCheckNeeded = useCallback((): boolean => {
    return (
      (securityState.needsCaptcha || securityState.needsBiometric) &&
      !securityState.isBlocked
    );
  }, [securityState]);

  // Check if security is initialized
  const isSecurityInitialized = useCallback((): boolean => {
    return securityInitialized;
  }, [securityInitialized]);

  // Enhanced success handlers with forced state updates
  const handleCaptchaSuccess = useCallback(async () => {
    console.log("Captcha verification successful - updating security state");
    setShowCaptcha(false);
    setCaptchaData(null);
    captchaGenerationRef.current = false;

    // Force immediate state update before API calls
    setSecurityState(prev => ({
      ...prev,
      needsCaptcha: false,
      trustScore: Math.min(100, prev.trustScore + 15), // Optimistic update
    }));

    // Force security to be initialized immediately
    setSecurityInitialized(true);

    // Emit global event to sync all components
    emitSecurityStateChange();

    try {
      // Clear cache and refresh
      lastSecurityCheckRef.current = 0;
      await Promise.all([
        refreshSecurityStatus(),
        refreshUser()
      ]);

      console.log("Post-captcha refresh completed successfully");
    } catch (error) {
      console.error("Error during post-captcha refresh:", error);
    }
  }, [refreshUser]);

  const handleCaptchaFailure = useCallback(() => {
    console.log("Captcha verification failed - user will be blocked");
    setShowCaptcha(false);
    setCaptchaData(null);
    captchaGenerationRef.current = false;

    // Redirect to blocked page
    router.push("/blocked");
  }, [router]);

  // Enhanced biometric success handler
  const handleBiometricSuccess = useCallback(async () => {
    console.log("Biometric verification successful - updating security state");
    setShowBiometric(false);

    // Force immediate state update before API calls
    setSecurityState(prev => ({
      ...prev,
      needsBiometric: false,
      needsCaptcha: false, // Biometric success also clears captcha requirement
      trustScore: Math.min(100, prev.trustScore + 30), // Optimistic update
    }));

    // Force security to be initialized immediately
    setSecurityInitialized(true);

    // Emit global event to sync all components
    emitSecurityStateChange();

    try {
      // Clear cache and refresh
      lastSecurityCheckRef.current = 0;
      await Promise.all([
        refreshSecurityStatus(),
        refreshUser()
      ]);

      console.log("Post-biometric refresh completed successfully");
    } catch (error) {
      console.error("Error during post-biometric refresh:", error);
    }
  }, [refreshUser]);

  const handleBiometricFailure = useCallback(() => {
    console.log("Biometric verification failed - user will be blocked");
    setShowBiometric(false);

    // Redirect to blocked page
    router.push("/blocked");
  }, [router]);

  // Dismiss security checks
  const dismissSecurityCheck = useCallback(() => {
    setShowCaptcha(false);
    setShowBiometric(false);
    setCaptchaData(null);
    captchaGenerationRef.current = false;
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
      console.log("Refreshing security status...");
      await checkSecurity();
    } catch (error) {
      console.error("Error refreshing security status:", error);
    }
  }, [checkSecurity, isAuthenticated]);

  // Format trust score for display
  const formatTrustScore = useCallback((score: number) => {
    // FIXED: Handle invalid trust scores
    const validScore = typeof score === 'number' && !isNaN(score) ? score : 50;

    if (validScore >= 60) {
      return { color: "text-green-400", label: "Good" };
    } else if (validScore >= 40) {
      return { color: "text-yellow-400", label: "Fair" };
    } else if (validScore >= 20) {
      return { color: "text-orange-400", label: "Low" };
    } else {
      return { color: "text-red-400", label: "Very Low" };
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCheckingRef.current = false;
      initializationRef.current = false;
      captchaGenerationRef.current = false;
    };
  }, []);

  // Listen for global security state change events
  useEffect(() => {
    const handleSecurityStateChange = () => {
      console.log('Security state change event received, forcing component sync');

      if (!isAuthenticated) {
        return;
      }

      // Force immediate security state refresh
      lastSecurityCheckRef.current = 0;

      // Update local state optimistically
      setSecurityState(prev => {
        if (prev.trustScore >= 40) {
          return {
            ...prev,
            needsCaptcha: false,
            needsBiometric: false,
          };
        }
        return prev;
      });

      // Ensure security is marked as initialized if trust score is good
      if (securityState.trustScore >= 40) {
        setSecurityInitialized(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SECURITY_EVENT, handleSecurityStateChange);

      return () => {
        window.removeEventListener(SECURITY_EVENT, handleSecurityStateChange);
      };
    }
  }, [isAuthenticated, securityState.trustScore]);

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

    // Manual triggers for Nebula page
    startCaptchaVerification,
    startBiometricVerification,

    // Utils
    isSecurityCheckNeeded,
    formatTrustScore,
    isSecurityInitialized,
  };
}