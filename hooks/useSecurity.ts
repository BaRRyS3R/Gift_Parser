// src/hooks/useSecurity.ts - Enhanced security hook with automatic evaluation
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { useUser } from "@/hooks/useUser";

interface SecurityChallenge {
  question: string;
  expectedAnswer: string;
}

interface SecurityState {
  isLoading: boolean;
  requiresVerification: boolean;
  verificationMethod?: "interactive" | "biometric";
  isBlocked: boolean;
  sessionToken?: string;
  challenge?: SecurityChallenge;
  hasEvaluated: boolean; // Track if initial evaluation is complete
}

interface SecurityEvaluation {
  status: "allow" | "require_verification" | "block";
  method?: "interactive" | "biometric";
  token?: string;
  expires?: number;
}

interface VerificationResult {
  verified: boolean;
  status: string;
}

export function useSecurity() {
  const router = useRouter();
  const { isAuthenticated } = useUser();

  const [securityState, setSecurityState] = useState<SecurityState>({
    isLoading: false,
    requiresVerification: false,
    isBlocked: false,
    hasEvaluated: false,
  });

  // Automatic security evaluation on hook initialization
  useEffect(() => {
    if (isAuthenticated && !securityState.hasEvaluated) {
      console.log("Performing automatic security evaluation...");
      performInitialSecurityCheck();
    }
  }, [isAuthenticated, securityState.hasEvaluated]);

  const performInitialSecurityCheck = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    setSecurityState(prev => ({
      ...prev,
      isLoading: true,
      hasEvaluated: true // Mark as evaluated to prevent multiple calls
    }));

    try {
      const evaluation: SecurityEvaluation = await authService.evaluateSecurityRequirements("page_access");

      if (evaluation.status === "block") {
        console.log("User is blocked, redirecting to blocked page");
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          isBlocked: true
        }));
        router.push("/blocked");
        return;
      }

      if (evaluation.status === "require_verification") {
        console.log("Verification required:", evaluation.method);
        let challenge: SecurityChallenge | undefined;

        if (evaluation.method === "interactive") {
          challenge = await authService.generateInteractiveChallenge();
        }

        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          requiresVerification: true,
          verificationMethod: evaluation.method,
          sessionToken: evaluation.token,
          challenge
        }));
        return;
      }

      // Status is "allow"
      console.log("Security check passed - access allowed");
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false
      }));
    } catch (error) {
      console.error("Initial security evaluation failed:", error);
      // On error, allow access but log the issue
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false
      }));
    }
  }, [isAuthenticated, router]);

  const evaluateAccess = useCallback(async (action: string = "game_access"): Promise<void> => {
    if (!isAuthenticated) return;

    setSecurityState(prev => ({ ...prev, isLoading: true }));

    try {
      const evaluation: SecurityEvaluation = await authService.evaluateSecurityRequirements(action);

      if (evaluation.status === "block") {
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          isBlocked: true
        }));
        router.push("/blocked");
        return;
      }

      if (evaluation.status === "require_verification") {
        let challenge: SecurityChallenge | undefined;

        if (evaluation.method === "interactive") {
          challenge = await authService.generateInteractiveChallenge();
        }

        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          requiresVerification: true,
          verificationMethod: evaluation.method,
          sessionToken: evaluation.token,
          challenge
        }));
        return;
      }

      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false
      }));
    } catch (error) {
      console.error("Security evaluation failed:", error);
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false
      }));
    }
  }, [isAuthenticated, router]);

  const submitVerification = useCallback(async (userInput: string | boolean): Promise<void> => {
    if (!securityState.sessionToken || !securityState.verificationMethod) return;

    setSecurityState(prev => ({ ...prev, isLoading: true }));

    try {
      let payload: any;

      if (securityState.verificationMethod === "interactive") {
        payload = {
          userInput: userInput as string,
          expectedOutput: securityState.challenge?.expectedAnswer
        };
      } else {
        payload = { biometricResult: userInput as boolean };
      }

      const result: VerificationResult = await authService.submitVerification(
        securityState.sessionToken,
        securityState.verificationMethod,
        payload
      );

      if (result.verified) {
        console.log("Verification successful");
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          requiresVerification: false,
          sessionToken: undefined,
          challenge: undefined
        }));
      } else {
        console.log("Verification failed, user will be blocked");
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          isBlocked: true
        }));
        router.push("/blocked");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        isBlocked: true
      }));
      router.push("/blocked");
    }
  }, [securityState, router]);

  const resetSecurityState = useCallback(() => {
    setSecurityState({
      isLoading: false,
      requiresVerification: false,
      isBlocked: false,
      hasEvaluated: false, // Allow re-evaluation
    });
  }, []);

  // Force re-evaluation (for manual refresh)
  const forceSecurityEvaluation = useCallback(async () => {
    setSecurityState(prev => ({ ...prev, hasEvaluated: false }));
    await performInitialSecurityCheck();
  }, [performInitialSecurityCheck]);

  return {
    securityState,
    evaluateAccess,
    submitVerification,
    resetSecurityState,
    forceSecurityEvaluation,
  };
}