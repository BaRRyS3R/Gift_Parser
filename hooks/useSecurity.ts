// src/hooks/useSecurity.ts - Complete fix for multiple calls and trust score issues

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

import { SecurityCheckResult } from "@/lib/supabase";
import { authService } from "@/lib/authService";
import { useUser } from "@/hooks/useUser";

// Global security check manager to prevent multiple simultaneous checks
class SecurityCheckManager {
  private static instance: SecurityCheckManager;
  private currentCheck: Promise<SecurityCheckResult> | null = null;
  private lastResult: SecurityCheckResult | null = null;
  private lastCheckTime: number = 0;
  private readonly CACHE_DURATION = 3000; // Reduced to 3 seconds for better responsiveness

  public static getInstance(): SecurityCheckManager {
    if (!SecurityCheckManager.instance) {
      SecurityCheckManager.instance = new SecurityCheckManager();
    }
    return SecurityCheckManager.instance;
  }

  public async checkSecurity(authService: any, force: boolean = false): Promise<SecurityCheckResult> {
    const now = Date.now();

    // Return cached result if valid and not forced
    if (!force && this.lastResult && (now - this.lastCheckTime) < this.CACHE_DURATION) {
      console.log("SecurityCheckManager: Using cached result", { trustScore: this.lastResult.trustScore });
      return this.lastResult;
    }

    // If a check is already in progress, wait for it
    if (this.currentCheck) {
      console.log("SecurityCheckManager: Check already in progress, waiting");
      return this.currentCheck;
    }

    // Start new check
    console.log("SecurityCheckManager: Starting new security check", { force });
    this.currentCheck = this.performSecurityCheck(authService);

    try {
      const result = await this.currentCheck;
      this.lastResult = result;
      this.lastCheckTime = now;
      console.log("SecurityCheckManager: Security check completed", { trustScore: result.trustScore });
      return result;
    } finally {
      this.currentCheck = null;
    }
  }

  private async performSecurityCheck(authService: any): Promise<SecurityCheckResult> {
    return await authService.checkUserSecurityStatus();
  }

  public clearCache(): void {
    this.lastResult = null;
    this.lastCheckTime = 0;
    console.log("SecurityCheckManager: Cache cleared");
  }

  public getLastResult(): SecurityCheckResult | null {
    return this.lastResult;
  }
}

export interface SecurityState {
  isLoading: boolean;
  isBlocked: boolean;
  needsCaptcha: boolean;
  needsBiometric: boolean;
  needsGyroscope: boolean; // NEW: Add gyroscope requirement
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
  showGyroscope: boolean; // NEW: Add gyroscope modal state
  captchaData: CaptchaData | null;
  checkSecurity: (force?: boolean) => Promise<SecurityCheckResult>;
  handleCaptchaSuccess: () => void;
  handleCaptchaFailure: () => void;
  handleBiometricSuccess: () => void;
  handleBiometricFailure: () => void;
  handleGyroscopeSuccess: () => void; // NEW: Add gyroscope handlers
  handleGyroscopeFailure: () => void; // NEW: Add gyroscope handlers
  dismissSecurityCheck: () => void;
  refreshSecurityStatus: () => Promise<void>;
  startCaptchaVerification: () => Promise<void>;
  startBiometricVerification: () => void;
  startGyroscopeVerification: () => void; // NEW: Add gyroscope verification
  isSecurityCheckNeeded: () => boolean;
  formatTrustScore: (score: number) => { color: string; label: string };
  isSecurityInitialized: () => boolean;
}

const SECURITY_EVENT = 'security-state-changed';
const securityManager = SecurityCheckManager.getInstance();

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

  // Initialize with minimal state - trust score must come from API
  const [securityState, setSecurityState] = useState<SecurityState>({
    isLoading: false,
    isBlocked: false,
    needsCaptcha: false,
    needsBiometric: false,
    needsGyroscope: false,
    trustScore: 0, // No default value - must be set from API
  });

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const [showGyroscope, setShowGyroscope] = useState(false); // NEW: Add gyroscope modal state

  // Single verification operation flag
  const verificationOperationRef = useRef(false);
  const initializationAttemptedRef = useRef(false);

  const isOnNebulaPage = pathname === '/nebula';

  // Enhanced security check using centralized manager
  const checkSecurity = useCallback(async (force: boolean = false): Promise<SecurityCheckResult> => {
    if (!isAuthenticated) {
      console.log("Cannot check security: user not authenticated");
      throw new Error("User not authenticated");
    }

    setSecurityState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await securityManager.checkSecurity(authService, force);

      // Always update state with fresh data from API
      const newSecurityState = {
        isLoading: false,
        isBlocked: result.isBlocked,
        needsCaptcha: result.needsCaptcha,
        needsBiometric: result.needsBiometric,
        needsGyroscope: result.needsGyroscope,
        trustScore: result.trustScore,
        timeUntilUnblock: result.timeUntilUnblock,
        blockReason: result.blockReason,
        lastChecked: Date.now(),
      };

      setSecurityState(newSecurityState);

      // Handle blocked users
      if (result.isBlocked) {
        console.log("User is blocked, redirecting to blocked page");
        router.push("/blocked");
      }

      console.log("Security status updated successfully", {
        trustScore: result.trustScore,
        needsCaptcha: result.needsCaptcha,
        needsBiometric: result.needsBiometric,
        needsGyroscope: result.needsGyroscope,
      });

      return result;
    } catch (error) {
      console.error("Error checking security status:", error);

      setSecurityState(prev => ({ ...prev, isLoading: false }));

      if (error instanceof Error && error.message.includes("Authentication expired")) {
        console.log("Token expired during security check, signing out user");
        signOut();
      }

      throw error;
    }
  }, [isAuthenticated, router, signOut]);

  // Initialize security check only for non-nebula pages
  useEffect(() => {
    if (!isAuthenticated || isOnNebulaPage || initializationAttemptedRef.current) {
      return;
    }

    initializationAttemptedRef.current = true;

    const timeoutId = setTimeout(() => {
      if (isAuthenticated && !isOnNebulaPage) {
        console.log("Initializing security check for non-nebula page");
        checkSecurity().catch((error) => {
          console.error("Initial security check failed:", error);
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, isOnNebulaPage, checkSecurity]);

  // Reset all state for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setSecurityState({
        isLoading: false,
        isBlocked: false,
        needsCaptcha: false,
        needsBiometric: false,
        needsGyroscope: false,
        trustScore: 0,
      });
      setSecurityInitialized(false);
      verificationOperationRef.current = false;
      initializationAttemptedRef.current = false;
      securityManager.clearCache();
    }
  }, [isAuthenticated]);

  // Security initialization logic - only when trust score is available
  useEffect(() => {
    if (!isAuthenticated) {
      setSecurityInitialized(false);
      return;
    }

    // Only consider initialized if we have a valid trust score from API
    if (!securityState.isLoading && securityState.trustScore > 0) {
      const isVerificationNeeded = securityState.needsCaptcha || securityState.needsBiometric || securityState.needsGyroscope;
      const hasGoodTrustScore = securityState.trustScore >= 40;

      if (!securityState.isBlocked && (!isVerificationNeeded || hasGoodTrustScore)) {
        setSecurityInitialized(true);
      } else if (securityState.isBlocked || isVerificationNeeded) {
        setSecurityInitialized(false);
      }
    }
  }, [isAuthenticated, securityState]);

  // Fixed captcha verification - single operation control
  const startCaptchaVerification = useCallback(async () => {
    if (verificationOperationRef.current) {
      console.log("Captcha verification already in progress, skipping");
      return;
    }

    verificationOperationRef.current = true;

    try {
      console.log("Starting captcha verification...");
      const captcha = await authService.generateCaptcha();
      setCaptchaData(captcha);
      setShowCaptcha(true);
      console.log("Captcha generated successfully");
    } catch (error) {
      console.error("Failed to generate captcha:", error);
      verificationOperationRef.current = false;

      if (error instanceof Error && error.message.includes("Authentication expired")) {
        console.log("Token expired during captcha generation, signing out user");
        signOut();
      }
      throw error;
    }
  }, [signOut]);

  // Fixed biometric verification - single operation control
  const startBiometricVerification = useCallback(() => {
    if (verificationOperationRef.current) {
      console.log("Biometric verification already in progress, skipping");
      return;
    }

    verificationOperationRef.current = true;
    console.log("Starting biometric verification...");
    setShowBiometric(true);
  }, []);

  // Security check needed determination
  const isSecurityCheckNeeded = useCallback((): boolean => {
    return (
      (securityState.needsCaptcha || securityState.needsBiometric || securityState.needsGyroscope) && // NEW: Add gyroscope check
      !securityState.isBlocked &&
      securityState.trustScore > 0
    );
  }, [securityState]);

  // Security initialization status
  const isSecurityInitialized = useCallback((): boolean => {
    return securityInitialized;
  }, [securityInitialized]);

  // Enhanced success handlers with proper cleanup
  const handleCaptchaSuccess = useCallback(async () => {
    console.log("Captcha verification successful - updating security state");
    setShowCaptcha(false);
    setCaptchaData(null);
    verificationOperationRef.current = false;

    // Clear security cache and force refresh
    securityManager.clearCache();
    setSecurityInitialized(true);

    // Emit global event
    emitSecurityStateChange();

    try {
      await Promise.all([
        checkSecurity(true), // Force fresh check
        refreshUser()
      ]);
      console.log("Post-captcha refresh completed successfully");
    } catch (error) {
      console.error("Error during post-captcha refresh:", error);
    }
  }, [checkSecurity, refreshUser]);

  const handleCaptchaFailure = useCallback(() => {
    console.log("Captcha verification failed - user will be blocked");
    setShowCaptcha(false);
    setCaptchaData(null);
    verificationOperationRef.current = false;
    router.push("/blocked");
  }, [router]);

  const handleBiometricSuccess = useCallback(async () => {
    console.log("Biometric verification successful - updating security state");
    setShowBiometric(false);
    verificationOperationRef.current = false;

    // Clear security cache and force refresh
    securityManager.clearCache();
    setSecurityInitialized(true);

    // Emit global event
    emitSecurityStateChange();

    try {
      await Promise.all([
        checkSecurity(true), // Force fresh check
        refreshUser()
      ]);
      console.log("Post-biometric refresh completed successfully");
    } catch (error) {
      console.error("Error during post-biometric refresh:", error);
    }
  }, [checkSecurity, refreshUser]);

  const handleBiometricFailure = useCallback(() => {
    console.log("Biometric verification failed - user will be blocked");
    setShowBiometric(false);
    verificationOperationRef.current = false;
    router.push("/blocked");
  }, [router]);

  // NEW: Add gyroscope verification function
  const startGyroscopeVerification = useCallback(() => {
    if (verificationOperationRef.current) {
      console.log("Gyroscope verification already in progress, skipping");
      return;
    }

    verificationOperationRef.current = true;
    console.log("Starting gyroscope verification...");
    setShowGyroscope(true);
  }, []);

  // NEW: Add gyroscope success handler
  const handleGyroscopeSuccess = useCallback(async () => {
    console.log("Gyroscope verification successful - updating security state");
    setShowGyroscope(false);
    verificationOperationRef.current = false;

    // Clear security cache and force refresh
    securityManager.clearCache();
    setSecurityInitialized(true);

    // Emit global event
    emitSecurityStateChange();

    try {
      await Promise.all([
        checkSecurity(true), // Force fresh check
        refreshUser()
      ]);
      console.log("Post-gyroscope refresh completed successfully");
    } catch (error) {
      console.error("Error during post-gyroscope refresh:", error);
    }
  }, [checkSecurity, refreshUser]);

  // NEW: Add gyroscope failure handler
  const handleGyroscopeFailure = useCallback(() => {
    console.log("Gyroscope verification failed - user will be blocked");
    setShowGyroscope(false);
    verificationOperationRef.current = false;
    router.push("/blocked");
  }, [router]);

  // Dismiss security checks
  const dismissSecurityCheck = useCallback(() => {
    setShowCaptcha(false);
    setShowBiometric(false);
    setShowGyroscope(false); // NEW: Add gyroscope dismissal
    setCaptchaData(null);
    verificationOperationRef.current = false;
  }, []);

  // Refresh security status with cache clearing
  const refreshSecurityStatus = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security status refresh");
      return;
    }

    try {
      console.log("Refreshing security status...");
      await checkSecurity(true); // Force fresh check
    } catch (error) {
      console.error("Error refreshing security status:", error);
    }
  }, [checkSecurity, isAuthenticated]);

  // Trust score formatting
  const formatTrustScore = useCallback((score: number) => {
    const validScore = typeof score === 'number' && !isNaN(score) && score > 0 ? score : 0;

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
      verificationOperationRef.current = false;
      initializationAttemptedRef.current = false;
    };
  }, []);

  // Listen for global security state change events
  useEffect(() => {
    const handleSecurityStateChange = () => {
      console.log('Security state change event received');

      if (!isAuthenticated) {
        return;
      }

      // Force refresh security state
      refreshSecurityStatus().catch(console.error);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SECURITY_EVENT, handleSecurityStateChange);
      return () => {
        window.removeEventListener(SECURITY_EVENT, handleSecurityStateChange);
      };
    }
  }, [isAuthenticated, refreshSecurityStatus]);

  return {
    securityState,
    showCaptcha,
    showBiometric,
    showGyroscope, // NEW: Add gyroscope modal state
    captchaData,
    checkSecurity,
    handleCaptchaSuccess,
    handleCaptchaFailure,
    handleBiometricSuccess,
    handleBiometricFailure,
    handleGyroscopeSuccess, // NEW: Add gyroscope handlers
    handleGyroscopeFailure, // NEW: Add gyroscope handlers
    dismissSecurityCheck,
    refreshSecurityStatus,
    startCaptchaVerification,
    startBiometricVerification,
    startGyroscopeVerification, // NEW: Add gyroscope verification
    isSecurityCheckNeeded,
    formatTrustScore,
    isSecurityInitialized,
  };
}