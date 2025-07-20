// src/app/nebula/page.tsx - Nebula Security Verification Page with abandonment tracking

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, Zap } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import NebulaCaptchaModal from "@/components/Security/NebulaCaptchaModal";
import NebulaBiometricModal from "@/components/Security/NebulaBiometricModal";
import NebulaGyroscopeModal from "@/components/Security/NebulaGyroscopeModal";

// Types for Nebula check response
interface NebulaCheckResponse {
  success: boolean;
  blocked?: {
    isBlocked: true;
    blockInfo: any;
  };
  verification?: {
    required: true;
    type: "captcha" | "biometric" | "gyroscope";
    trustScore: number;
    threshold: number;
    attemptId: string;
  };
  allowed?: {
    proceed: true;
    trustScore: number;
  };
  error?: string;
}

type VerificationType = "captcha" | "biometric" | "gyroscope";

interface PageState {
  isLoading: boolean;
  error: string | null;
  verificationType: VerificationType | null;
  trustScore: number;
  threshold: number;
  isModalOpen: boolean;
  verificationInProgress: boolean;
  verificationResult: "success" | "failure" | null;
  attemptId: string | null;
}

export default function NebulaPage(): JSX.Element {
  const router = useRouter();
  const { makeAuthenticatedRequest, authState } = useUser();

  const [pageState, setPageState] = useState<PageState>({
    isLoading: true,
    error: null,
    verificationType: null,
    trustScore: 50,
    threshold: 40,
    isModalOpen: false,
    verificationInProgress: false,
    verificationResult: null,
    attemptId: null,
  });

  /**
   * Handle page unload/close events to report abandonment
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pageState.verificationInProgress && pageState.attemptId) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          "/api/nebula/abandon",
          JSON.stringify({ attemptId: pageState.attemptId }),
        );
      }
    };

    const handleVisibilityChange = async () => {
      if (
        document.hidden &&
        pageState.verificationInProgress &&
        pageState.attemptId
      ) {
        try {
          await makeAuthenticatedRequest("/api/nebula/abandon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId: pageState.attemptId }),
          });
        } catch (error) {
          console.error("Error reporting abandoned attempt:", error);
        }
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    pageState.verificationInProgress,
    pageState.attemptId,
    makeAuthenticatedRequest,
  ]);

  /**
   * Check Nebula verification requirements
   */
  const checkNebulaStatus = useCallback(async () => {
    setPageState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await makeAuthenticatedRequest("/api/nebula/check");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: NebulaCheckResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to check verification status");
      }

      // Check if user is blocked
      if (result.blocked) {
        console.log("User is blocked, redirecting to blocked page");
        router.push("/blocked");

        return;
      }

      // Check if user is allowed to proceed
      if (result.allowed) {
        console.log("User passed Nebula checks, redirecting to main");
        router.push("/main");

        return;
      }

      // User requires verification
      if (result.verification) {
        console.log(`User requires ${result.verification.type} verification`);
        setPageState((prev) => ({
          ...prev,
          isLoading: false,
          verificationType: result.verification!.type,
          trustScore: result.verification!.trustScore,
          threshold: result.verification!.threshold,
          attemptId: result.verification!.attemptId,
        }));
      } else {
        throw new Error("Unknown verification status");
      }
    } catch (error) {
      console.error("Error checking Nebula status:", error);
      setPageState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check verification status",
      }));
    }
  }, [makeAuthenticatedRequest, router]);

  // Initialize page
  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/");

      return;
    }

    checkNebulaStatus();
  }, [authState.isAuthenticated, checkNebulaStatus, router]);

  /**
   * Start verification process
   */
  const handleStartVerification = useCallback(() => {
    if (
      pageState.verificationInProgress ||
      !pageState.verificationType ||
      !pageState.attemptId
    ) {
      return;
    }

    setPageState((prev) => ({
      ...prev,
      isModalOpen: true,
      verificationInProgress: true,
      verificationResult: null,
    }));
  }, [
    pageState.verificationInProgress,
    pageState.verificationType,
    pageState.attemptId,
  ]);

  /**
   * Handle successful verification
   */
  const handleVerificationSuccess = useCallback(() => {
    console.log("Verification successful");
    setPageState((prev) => ({
      ...prev,
      isModalOpen: false,
      verificationInProgress: false,
      verificationResult: "success",
      attemptId: null, // Clear attempt ID as verification is complete
    }));

    // Redirect to main page after short delay
    setTimeout(() => {
      router.push("/main");
    }, 2000);
  }, [router]);

  /**
   * Handle failed verification
   */
  const handleVerificationFailure = useCallback(() => {
    console.log("Verification failed");
    setPageState((prev) => ({
      ...prev,
      isModalOpen: false,
      verificationInProgress: false,
      verificationResult: "failure",
      attemptId: null, // Clear attempt ID as verification is complete (failed)
    }));

    // Redirect to blocked page after short delay
    setTimeout(() => {
      router.push("/blocked");
    }, 2000);
  }, [router]);

  /**
   * Close verification modal (only if not in progress)
   */
  const handleCloseModal = useCallback(() => {
    if (!pageState.verificationInProgress) {
      setPageState((prev) => ({
        ...prev,
        isModalOpen: false,
      }));
    }
  }, [pageState.verificationInProgress]);

  /**
   * Get verification type description
   */
  const getVerificationDescription = (type: VerificationType): string => {
    switch (type) {
      case "captcha":
        return "Complete a security challenge to verify your identity";
      case "biometric":
        return "Use biometric authentication to verify your identity";
      case "gyroscope":
        return "Complete device movement verification to confirm authenticity";
      default:
        return "Complete security verification";
    }
  };

  /**
   * Get verification icon
   */
  const getVerificationIcon = (type: VerificationType) => {
    switch (type) {
      case "captcha":
        return <Shield className="text-yellow-400" size={64} />;
      case "biometric":
        return <Zap className="text-blue-400" size={64} />;
      case "gyroscope":
        return <Clock className="text-purple-400" size={64} />;
      default:
        return <Shield className="text-gray-400" size={64} />;
    }
  };

  /**
   * Get trust score color
   */
  const getTrustScoreColor = (score: number): string => {
    if (score >= 40) return "text-green-400";
    if (score >= 20) return "text-yellow-400";
    if (score >= 10) return "text-orange-400";

    return "text-red-400";
  };

  // Loading state
  if (pageState.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Checking security status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">
            Security Check Failed
          </h2>
          <p className="text-red-300 text-sm mb-6">{pageState.error}</p>
          <button
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            onClick={checkNebulaStatus}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success result display
  if (pageState.verificationResult === "success") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-green-500/30 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-green-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Verification Successful
          </h2>
          <p className="text-green-300 text-sm mb-4">
            Your identity has been verified successfully. Your trust score has
            been restored.
          </p>
          <p className="text-gray-400 text-xs">Redirecting to main page...</p>
        </div>
      </div>
    );
  }

  // Failure result display
  if (pageState.verificationResult === "failure") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Verification Failed
          </h2>
          <p className="text-red-300 text-sm mb-4">
            Identity verification was unsuccessful. Your account will be
            temporarily blocked.
          </p>
          <p className="text-gray-400 text-xs">
            Redirecting to blocked page...
          </p>
        </div>
      </div>
    );
  }

  // Main verification page
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
              {pageState.verificationType &&
                getVerificationIcon(pageState.verificationType)}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Security Verification Required
          </h1>
          <p className="text-gray-400 text-sm">
            Your account requires additional security verification to continue
          </p>
        </div>

        {/* Trust Score Display */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Current Trust Score</span>
            <span
              className={`font-bold text-lg ${getTrustScoreColor(pageState.trustScore)}`}
            >
              {pageState.trustScore}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{
                width: `${Math.min(100, (pageState.trustScore / 100) * 100)}%`,
              }}
            />
          </div>
          <p className="text-gray-400 text-xs">
            Required threshold: {pageState.threshold}
          </p>
        </div>

        {/* Verification Info */}
        {pageState.verificationType && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-blue-300 font-semibold mb-2 capitalize">
              {pageState.verificationType} Verification
            </h3>
            <p className="text-blue-200 text-sm">
              {getVerificationDescription(pageState.verificationType)}
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle
              className="text-yellow-400 flex-shrink-0 mt-0.5"
              size={16}
            />
            <div>
              <h4 className="text-yellow-300 font-semibold mb-1 text-sm">
                Important
              </h4>
              <p className="text-yellow-200 text-xs">
                You have one attempt to complete verification. Closing this page
                or navigating away will result in account blocking. Complete the
                verification within 15 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Start Verification Button */}
        <button
          className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-semibold"
          disabled={
            pageState.verificationInProgress ||
            !pageState.verificationType ||
            !pageState.attemptId
          }
          onClick={handleStartVerification}
        >
          {pageState.verificationInProgress ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verification in Progress...</span>
            </>
          ) : (
            <>
              <Shield size={20} />
              <span>Start Verification</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Modals */}
      {pageState.verificationType === "captcha" && (
        <NebulaCaptchaModal
          attemptId={pageState.attemptId}
          isOpen={pageState.isModalOpen}
          onClose={handleCloseModal}
          onFailure={handleVerificationFailure}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {pageState.verificationType === "biometric" && (
        <NebulaBiometricModal
          attemptId={pageState.attemptId}
          isOpen={pageState.isModalOpen}
          onClose={handleCloseModal}
          onFailure={handleVerificationFailure}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {pageState.verificationType === "gyroscope" && (
        <NebulaGyroscopeModal
          attemptId={pageState.attemptId}
          isOpen={pageState.isModalOpen}
          onClose={handleCloseModal}
          onFailure={handleVerificationFailure}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}
