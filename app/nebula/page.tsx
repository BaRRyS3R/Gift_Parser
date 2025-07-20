// src/app/nebula/page.tsx - Полная интеграция с улучшенной системой разрешений и локализацией

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Clock, Zap, RefreshCw } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { usePermissionStatus } from "@/hooks/modules/usePermissionStatus";
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
type AuthPhase = "initializing" | "permission_required" | "auth" | "success" | "error" | "unsupported" | "instructions" | "verification";

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
    currentPhase: AuthPhase;
    canAbandon: boolean;
}

interface AbandonmentState {
    lastVisibleTime: number;
    minimumAwayTime: number; // 30 seconds before considering abandonment
    abandonmentTimeoutId: NodeJS.Timeout | null;
    userReturnedAfterPermission: boolean;
}

export default function NebulaPage(): JSX.Element {
    const router = useRouter();
    const { makeAuthenticatedRequest, authState } = useUser();
    const {
        status: permissionStatus,
        recheckAllPermissions
    } = usePermissionStatus();
    const t = useT();

    // Refs for state management
    const abandonmentStateRef = useRef<AbandonmentState>({
        lastVisibleTime: Date.now(),
        minimumAwayTime: 30000, // 30 seconds
        abandonmentTimeoutId: null,
        userReturnedAfterPermission: false,
    });

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
        currentPhase: "initializing",
        canAbandon: false,
    });

    /**
     * Handle phase change from verification modal
     */
    const handlePhaseChange = useCallback((phase: AuthPhase, canAbandon: boolean) => {
        console.log(`Verification phase changed: ${phase}, can abandon: ${canAbandon}`);
        setPageState(prev => ({
            ...prev,
            currentPhase: phase,
            canAbandon,
        }));

        // Reset abandonment tracking when phase changes
        const abandonmentState = abandonmentStateRef.current;
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
        }

        // Special handling for permission_required phase
        if (phase === "permission_required") {
            abandonmentState.userReturnedAfterPermission = false;
            console.log("Entered permission phase - abandonment tracking disabled");
        }
    }, []);

    /**
     * Report verification abandonment to server
     */
    const reportAbandonment = useCallback(async (reason: string) => {
        if (!pageState.attemptId) {
            console.log("No attempt ID available for abandonment reporting");
            return;
        }

        console.log(`Reporting abandonment: ${reason}`);

        try {
            await makeAuthenticatedRequest("/api/nebula/abandon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attemptId: pageState.attemptId,
                    reason
                }),
            });
            console.log("Abandonment reported successfully");
        } catch (error) {
            console.error("Error reporting abandonment:", error);
        }
    }, [pageState.attemptId, makeAuthenticatedRequest]);

    /**
     * Enhanced visibility change handler with intelligent abandonment detection
     */
    const handleVisibilityChange = useCallback(async () => {
        const now = Date.now();
        const abandonmentState = abandonmentStateRef.current;

        if (document.hidden) {
            // User left the page
            abandonmentState.lastVisibleTime = now;
            console.log("Page became hidden");

            // Clear any existing timeout
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
            }

            // Only set abandonment timeout if user can abandon in current phase
            if (pageState.canAbandon && pageState.verificationInProgress && pageState.attemptId) {
                console.log(`Setting abandonment timeout for ${abandonmentState.minimumAwayTime}ms`);

                abandonmentState.abandonmentTimeoutId = setTimeout(() => {
                    if (document.hidden && pageState.canAbandon) {
                        console.log("User away too long, reporting abandonment");
                        reportAbandonment("page_hidden_timeout");
                    }
                }, abandonmentState.minimumAwayTime);
            } else {
                console.log("User in safe phase - no abandonment tracking");
            }
        } else {
            // User returned to the page
            const awayTime = now - abandonmentState.lastVisibleTime;
            console.log(`Page became visible, was away for ${awayTime}ms`);

            // Clear abandonment timeout
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
                abandonmentState.abandonmentTimeoutId = null;
            }

            // Track return after permission phase
            if (pageState.currentPhase === "permission_required" ||
                (pageState.currentPhase === "auth" && !abandonmentState.userReturnedAfterPermission)) {
                abandonmentState.userReturnedAfterPermission = true;
                console.log("User returned after permission phase");

                // Recheck permissions when user returns
                setTimeout(() => {
                    recheckAllPermissions();
                }, 1000);
            }
        }
    }, [pageState.canAbandon, pageState.verificationInProgress, pageState.attemptId,
    pageState.currentPhase, reportAbandonment, recheckAllPermissions]);

    /**
     * Handle before unload - immediate abandonment for page close
     */
    const handleBeforeUnload = useCallback(() => {
        if (pageState.verificationInProgress && pageState.attemptId && pageState.canAbandon) {
            console.log("Page unloading - reporting immediate abandonment");
            // Use sendBeacon for reliable delivery during page unload
            const payload = JSON.stringify({
                attemptId: pageState.attemptId,
                reason: "page_unload"
            });
            navigator.sendBeacon("/api/nebula/abandon", payload);
        }
    }, [pageState.verificationInProgress, pageState.attemptId, pageState.canAbandon]);

    /**
     * Set up abandonment tracking event listeners
     */
    useEffect(() => {
        console.log("Setting up abandonment tracking listeners");

        // Add event listeners
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Cleanup function
        return () => {
            console.log("Cleaning up abandonment tracking listeners");
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // Clear any pending timeouts
            const abandonmentState = abandonmentStateRef.current;
            if (abandonmentState.abandonmentTimeoutId) {
                clearTimeout(abandonmentState.abandonmentTimeoutId);
                abandonmentState.abandonmentTimeoutId = null;
            }
        };
    }, [handleVisibilityChange, handleBeforeUnload]);

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

        console.log("Starting verification process");
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
        console.log("Verification completed successfully");
        setPageState((prev) => ({
            ...prev,
            isModalOpen: false,
            verificationInProgress: false,
            verificationResult: "success",
            attemptId: null,
            canAbandon: false, // Safe state
        }));

        // Clear any pending abandonment timeouts
        const abandonmentState = abandonmentStateRef.current;
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
        }

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
            attemptId: null,
            canAbandon: false, // Safe state
        }));

        // Clear any pending abandonment timeouts
        const abandonmentState = abandonmentStateRef.current;
        if (abandonmentState.abandonmentTimeoutId) {
            clearTimeout(abandonmentState.abandonmentTimeoutId);
            abandonmentState.abandonmentTimeoutId = null;
        }

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

    /**
     * Get permission status display using proper localization
     */
    const getPermissionStatusDisplay = () => {
        if (!pageState.verificationType) return null;

        const status = permissionStatus[pageState.verificationType];
        const typeKey = pageState.verificationType;

        // Handle captcha case - it doesn't require permissions
        if (typeKey === 'captcha') {
            return null; // Captcha doesn't need permission status display
        }

        const typeName = typeKey === 'biometric'
            ? t("nebula.verification.permissionStatus.typeNames.biometric")
            : t("nebula.verification.permissionStatus.typeNames.gyroscope");

        switch (status) {
            case "checking":
                return (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            <span className="text-blue-300 text-sm">
                                {t("nebula.verification.permissionStatus.checking").replace("{type}", typeName)}
                            </span>
                        </div>
                    </div>
                );
            case "granted":
                return (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <Shield className="text-green-400" size={16} />
                            <span className="text-green-300 text-sm">
                                {t("nebula.verification.permissionStatus.granted").replace("{type}", typeName)}
                            </span>
                        </div>
                    </div>
                );
            case "prompt":
                return (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="text-yellow-400" size={16} />
                            <span className="text-yellow-300 text-sm">
                                {t("nebula.verification.permissionStatus.prompt").replace("{type}", typeName)}
                            </span>
                        </div>
                    </div>
                );
            case "denied":
                return (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="text-red-400" size={16} />
                            <span className="text-red-300 text-sm">
                                {t("nebula.verification.permissionStatus.denied").replace("{type}", typeName)}
                            </span>
                        </div>
                    </div>
                );
            case "unavailable":
                return (
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="text-gray-400" size={16} />
                            <span className="text-gray-300 text-sm">
                                {t("nebula.verification.permissionStatus.unavailable").replace("{type}", typeName)}
                            </span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Loading state
    if (pageState.isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">{t("nebula.verification.loading")}</p>
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
                        {t("nebula.verification.error")}
                    </h2>
                    <p className="text-red-300 text-sm mb-6">{pageState.error}</p>
                    <button
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                        onClick={checkNebulaStatus}
                    >
                        {t("nebula.verification.tryAgain")}
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
                        {t("nebula.verification.success.title")}
                    </h2>
                    <p className="text-green-300 text-sm mb-4">
                        {t("nebula.verification.success.message")}
                    </p>
                    <p className="text-gray-400 text-xs">{t("nebula.verification.success.redirecting")}</p>
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
                        {t("nebula.verification.failure.title")}
                    </h2>
                    <p className="text-red-300 text-sm mb-4">
                        {t("nebula.verification.failure.message")}
                    </p>
                    <p className="text-gray-400 text-xs">
                        {t("nebula.verification.failure.redirecting")}
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
                        {t("nebula.verification.title")}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {t("nebula.verification.subtitle")}
                    </p>
                </div>

                {/* Permission Status Display */}
                {getPermissionStatusDisplay()}

                {/* Trust Score Display */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 text-sm">{t("nebula.verification.trustScore")}</span>
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
                        {t("nebula.verification.requiredThreshold", { threshold: pageState.threshold })}
                    </p>
                </div>

                {/* Verification Info */}
                {pageState.verificationType && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-300 font-semibold mb-2 capitalize">
                            {pageState.verificationType === 'captcha'
                                ? t("nebula.verification.types.captcha.name")
                                : pageState.verificationType === 'biometric'
                                    ? t("nebula.verification.types.biometric.name")
                                    : t("nebula.verification.types.gyroscope.name")}
                        </h3>
                        <p className="text-blue-200 text-sm">
                            {pageState.verificationType === 'captcha'
                                ? t("nebula.verification.types.captcha.description")
                                : pageState.verificationType === 'biometric'
                                    ? t("nebula.verification.types.biometric.description")
                                    : t("nebula.verification.types.gyroscope.description")}
                        </p>
                    </div>
                )}

                {/* Enhanced Warning for Biometric */}
                {pageState.verificationType === "biometric" ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <Shield
                                className="text-green-400 flex-shrink-0 mt-0.5"
                                size={16}
                            />
                            <div>
                                <h4 className="text-green-300 font-semibold mb-1 text-sm">
                                    {t("nebula.verification.warningBiometricSafe")}
                                </h4>
                                <p className="text-green-200 text-xs">
                                    {t("nebula.verification.warningBiometricText")}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle
                                className="text-red-400 flex-shrink-0 mt-0.5"
                                size={16}
                            />
                            <div>
                                <h4 className="text-red-300 font-semibold mb-1 text-sm">
                                    {t("nebula.verification.warningCritical")}
                                </h4>
                                <p className="text-red-200 text-xs font-bold mb-2">
                                    {t("nebula.verification.warningLeaving")}
                                </p>
                                <p className="text-red-200 text-xs">
                                    {t("nebula.verification.warningBan")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Appeal Contact Information */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <h4 className="text-yellow-300 font-semibold mb-2 text-sm">
                        {t("nebula.blocked.appeal.title")}
                    </h4>
                    <p className="text-yellow-200 text-xs mb-2">
                        {t("nebula.blocked.appeal.subtitle")}
                    </p>
                    <div className="flex items-center space-x-2">
                        <span className="text-yellow-200 text-xs">{t("nebula.blocked.appeal.contact")}</span>
                        <a
                            href={t("nebula.blocked.appeal.contactLink")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-300 text-xs font-bold hover:text-yellow-100 transition-colors"
                        >
                            {t("nebula.blocked.appeal.contactText")}
                        </a>
                    </div>
                    <p className="text-yellow-200 text-xs mt-2 opacity-80">
                        {t("nebula.blocked.appeal.note")}
                    </p>
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
                            <span>{t("nebula.verification.verificationInProgress")}</span>
                        </>
                    ) : (
                        <>
                            <Shield size={20} />
                            <span>{t("nebula.verification.startVerification")}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Verification Modals with Phase Tracking */}
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
                    onPhaseChange={handlePhaseChange}
                />
            )}

            {pageState.verificationType === "gyroscope" && (
                <NebulaGyroscopeModal
                    attemptId={pageState.attemptId}
                    isOpen={pageState.isModalOpen}
                    onClose={handleCloseModal}
                    onFailure={handleVerificationFailure}
                    onSuccess={handleVerificationSuccess}
                    onPhaseChange={handlePhaseChange}
                />
            )}
        </div>
    );
}