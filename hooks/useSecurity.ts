// src/hooks/useSecurity.ts - Fixed security hook without infinite loops
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  hasEvaluated: boolean;
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

  // Ref to prevent multiple simultaneous evaluations
  const evaluationInProgressRef = useRef<boolean>(false);

  // REMOVED: Automatic security evaluation on hook initialization to prevent infinite loops
  // The security check will only be performed when explicitly requested via evaluateAccess

  const performSecurityCheck = useCallback(async (action: string): Promise<SecurityEvaluation> => {
    if (!isAuthenticated || evaluationInProgressRef.current) {
      throw new Error("Security check not available");
    }

    evaluationInProgressRef.current = true;

    try {
      console.log(`Performing security check for action: ${action}`);
      const evaluation: SecurityEvaluation = await authService.evaluateSecurityRequirements(action);
      console.log(`Security evaluation result: ${evaluation.status}`);
      return evaluation;
    } finally {
      evaluationInProgressRef.current = false;
    }
  }, [isAuthenticated]);

  const evaluateAccess = useCallback(async (action: string = "game_access"): Promise<void> => {
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping security evaluation");
      return;
    }

    if (evaluationInProgressRef.current) {
      console.log("Security evaluation already in progress, skipping");
      return;
    }

    setSecurityState(prev => ({
      ...prev,
      isLoading: true,
      hasEvaluated: true
    }));

    try {
      const evaluation = await performSecurityCheck(action);

      if (evaluation.status === "block") {
        console.log("Access blocked, redirecting to blocked page");
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          isBlocked: true,
          requiresVerification: false
        }));
        router.push("/blocked");
        return;
      }

      if (evaluation.status === "require_verification") {
        console.log(`Verification required: ${evaluation.method}`);
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
          challenge,
          isBlocked: false
        }));
        return;
      }

      // Status is "allow"
      console.log("Access granted");
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false,
        isBlocked: false
      }));
    } catch (error) {
      console.error("Security evaluation failed:", error);
      // On error, allow access but log the issue
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        requiresVerification: false,
        isBlocked: false
      }));
    }
  }, [isAuthenticated, performSecurityCheck, router]);

  const submitVerification = useCallback(async (userInput: string | boolean): Promise<void> => {
    if (!securityState.sessionToken || !securityState.verificationMethod) {
      console.error("No active verification session");
      return;
    }

    if (evaluationInProgressRef.current) {
      console.log("Verification already in progress, skipping");
      return;
    }

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
          challenge: undefined,
          isBlocked: false
        }));
      } else {
        console.log("Verification failed, redirecting to blocked page");
        setSecurityState(prev => ({
          ...prev,
          isLoading: false,
          isBlocked: true,
          requiresVerification: false
        }));
        router.push("/blocked");
      }
    } catch (error) {
      console.error("Verification submission failed:", error);
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        isBlocked: true,
        requiresVerification: false
      }));
      router.push("/blocked");
    }
  }, [securityState.sessionToken, securityState.verificationMethod, securityState.challenge, router]);

  const resetSecurityState = useCallback(() => {
    console.log("Resetting security state");
    evaluationInProgressRef.current = false;
    setSecurityState({
      isLoading: false,
      requiresVerification: false,
      isBlocked: false,
      hasEvaluated: false,
    });
  }, []);

  // Manual security evaluation (for explicit checks)
  const checkSecurityStatus = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      console.log("User not authenticated, cannot check security status");
      return;
    }

    await evaluateAccess("security_check");
  }, [isAuthenticated, evaluateAccess]);

  return {
    securityState,
    evaluateAccess,
    submitVerification,
    resetSecurityState,
    checkSecurityStatus, // New method for manual security checks
  };
}