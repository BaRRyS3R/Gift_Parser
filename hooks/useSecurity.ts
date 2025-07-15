// src/hooks/useSecurity.ts - Minimal changes to eliminate direct Supabase calls

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SecurityCheckResult, userService } from '@/lib/supabase';
import {
    checkSecurityStatus,
    generateSecureCaptcha,
    validateSecureCaptcha,
    validateSecureBiometric,
    authService // ADDED: Direct import of authService
} from '@/lib/authService';
import { useUser } from '@/hooks/useUser';

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
}

const SECURITY_CHECK_CACHE_DURATION = 30000; // 30 seconds cache
const TRUST_SCORE_THRESHOLDS = {
    CAPTCHA: 40,
    BIOMETRIC: 20,
} as const;

export function useSecurity(): SecurityHookReturn {
    const router = useRouter();
    const { telegramUser, isAuthenticated, refreshUser } = useUser();

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

    const isCheckingRef = useRef(false);
    const lastSecurityCheckRef = useRef<number>(0);

    // UPDATED: Check security status with API-first approach
    const checkSecurity = useCallback(async (): Promise<SecurityCheckResult> => {
        if (!telegramUser?.id || isCheckingRef.current) {
            throw new Error('Cannot check security: user not available or check in progress');
        }

        // Use cache if recent
        const now = Date.now();
        if (now - lastSecurityCheckRef.current < SECURITY_CHECK_CACHE_DURATION) {
            console.log('Using cached security status');
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
        setSecurityState(prev => ({ ...prev, isLoading: true }));

        try {
            let result: SecurityCheckResult;

            // UPDATED: Try authenticated API first, fallback to direct service
            if (isAuthenticated) {
                try {
                    result = await authService.checkUserSecurityStatus();
                } catch (apiError) {
                    console.warn('Authenticated security check failed, using direct service:', apiError);
                    // FALLBACK: Only use direct service if API fails
                    result = await userService.checkUserBlockStatus(telegramUser.id);
                }
            } else {
                // For non-authenticated users, still avoid direct calls where possible
                // Try using the public security check method from authService if available
                try {
                    result = await authService.checkUserBlockedStatus(telegramUser.id);
                } catch (serviceError) {
                    console.warn('Service security check failed:', serviceError);
                    // Last resort fallback
                    result = await userService.checkUserBlockStatus(telegramUser.id);
                }
            }

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
                console.log('User is blocked, redirecting to blocked page');
                router.push('/blocked');
            }

            return result;
        } catch (error) {
            console.error('Error checking security status:', error);

            // On error, assume safe defaults but mark as needing check
            setSecurityState(prev => ({
                ...prev,
                isLoading: false,
                // Keep previous state on error to avoid false positives
            }));

            throw error;
        } finally {
            isCheckingRef.current = false;
        }
    }, [telegramUser?.id, isAuthenticated, router, securityState]);

    // Auto check security on mount and user changes
    useEffect(() => {
        if (telegramUser?.id && !isCheckingRef.current) {
            checkSecurity().catch(error => {
                console.error('Initial security check failed:', error);
            });
        }
    }, [telegramUser?.id, checkSecurity]);

    // Handle security check triggers
    const triggerSecurityCheck = useCallback(async () => {
        try {
            const result = await checkSecurity();

            // Show appropriate modal based on security needs
            if (result.needsBiometric && !result.isBlocked) {
                setShowBiometric(true);
            } else if (result.needsCaptcha && !result.isBlocked) {
                // UPDATED: Generate captcha using API method
                try {
                    const captcha = await authService.generateCaptcha();
                    setCaptchaData(captcha);
                    setShowCaptcha(true);
                } catch (error) {
                    console.error('Failed to generate captcha:', error);
                }
            }
        } catch (error) {
            console.error('Error triggering security check:', error);
        }
    }, [checkSecurity]);

    // Check if security check is needed
    const isSecurityCheckNeeded = useCallback((): boolean => {
        return (securityState.needsCaptcha || securityState.needsBiometric) && !securityState.isBlocked;
    }, [securityState]);

    // UPDATED: Captcha handlers using API methods
    const handleCaptchaSuccess = useCallback(() => {
        console.log('Captcha verification successful');
        setShowCaptcha(false);
        setCaptchaData(null);

        // Refresh security status and user data
        refreshSecurityStatus();
        refreshUser();
    }, [refreshUser]);

    const handleCaptchaFailure = useCallback(() => {
        console.log('Captcha verification failed - user will be blocked');
        setShowCaptcha(false);
        setCaptchaData(null);

        // Redirect to blocked page
        router.push('/blocked');
    }, [router]);

    // UPDATED: Biometric handlers using API methods
    const handleBiometricSuccess = useCallback(() => {
        console.log('Biometric verification successful');
        setShowBiometric(false);

        // Refresh security status and user data
        refreshSecurityStatus();
        refreshUser();
    }, [refreshUser]);

    const handleBiometricFailure = useCallback(() => {
        console.log('Biometric verification failed - user will be blocked');
        setShowBiometric(false);

        // Redirect to blocked page
        router.push('/blocked');
    }, [router]);

    // Dismiss security checks (for testing/admin)
    const dismissSecurityCheck = useCallback(() => {
        setShowCaptcha(false);
        setShowBiometric(false);
        setCaptchaData(null);
    }, []);

    // Refresh security status
    const refreshSecurityStatus = useCallback(async () => {
        // Clear cache to force fresh check
        lastSecurityCheckRef.current = 0;

        try {
            await checkSecurity();
        } catch (error) {
            console.error('Error refreshing security status:', error);
        }
    }, [checkSecurity]);

    // Format trust score for display
    const formatTrustScore = useCallback((score: number) => {
        if (score >= 60) {
            return { color: 'text-green-400', label: 'Good' };
        } else if (score >= 40) {
            return { color: 'text-yellow-400', label: 'Fair' };
        } else if (score >= 20) {
            return { color: 'text-orange-400', label: 'Low' };
        } else {
            return { color: 'text-red-400', label: 'Very Low' };
        }
    }, []);

    // Auto-trigger security checks when needed
    useEffect(() => {
        if (isSecurityCheckNeeded() && !showCaptcha && !showBiometric) {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => {
                triggerSecurityCheck();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isSecurityCheckNeeded, showCaptcha, showBiometric, triggerSecurityCheck]);

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
    };
}