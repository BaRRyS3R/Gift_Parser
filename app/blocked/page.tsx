// src/app/blocked/page.tsx - User blocked page

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Clock, AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { userService } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

interface BlockInfo {
    isBlocked: boolean;
    timeUntilUnblock?: number;
    blockReason?: string;
    trustScore: number;
}

export default function BlockedPage() {
    const router = useRouter();
    const { telegramUser, refreshUser } = useUser();
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    // Check block status on page load
    useEffect(() => {
        checkBlockStatus();
    }, []);

    // Update countdown timer
    useEffect(() => {
        if (!blockInfo?.timeUntilUnblock) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, blockInfo.timeUntilUnblock! - (Date.now() - lastUpdateTime));

            if (remaining <= 0) {
                checkBlockStatus();
            } else {
                setTimeRemaining(formatTimeRemaining(remaining));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [blockInfo]);

    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

    const checkBlockStatus = async () => {
        if (!telegramUser?.id) {
            router.push('/');
            return;
        }

        setIsCheckingStatus(true);

        try {
            const securityResult = await userService.checkUserBlockStatus(telegramUser.id);

            setBlockInfo({
                isBlocked: securityResult.isBlocked,
                timeUntilUnblock: securityResult.timeUntilUnblock,
                blockReason: securityResult.blockReason,
                trustScore: securityResult.trustScore,
            });

            setLastUpdateTime(Date.now());

            // If user is no longer blocked, redirect to main page
            if (!securityResult.isBlocked) {
                await refreshUser();
                router.push('/main');
                return;
            }

            // Set initial countdown
            if (securityResult.timeUntilUnblock) {
                setTimeRemaining(formatTimeRemaining(securityResult.timeUntilUnblock));
            }
        } catch (error) {
            console.error('Error checking block status:', error);
        } finally {
            setIsLoading(false);
            setIsCheckingStatus(false);
        }
    };

    const formatTimeRemaining = (ms: number): string => {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${seconds}s`;
        }
    };

    const getBlockReasonText = (reason?: string): string => {
        switch (reason) {
            case 'captcha_failed':
                return 'Failed Captcha Verification';
            case 'biometric_failed':
                return 'Failed Biometric Authentication';
            case 'suspicious_activity':
                return 'Suspicious Activity Detected';
            default:
                return 'Security Violation';
        }
    };

    const getBlockReasonDescription = (reason?: string): string => {
        switch (reason) {
            case 'captcha_failed':
                return 'Your account was temporarily blocked due to multiple failed captcha attempts. This helps protect the system from automated access.';
            case 'biometric_failed':
                return 'Your account was temporarily blocked due to failed biometric authentication. This is a security measure to protect your account.';
            case 'suspicious_activity':
                return 'Your account was temporarily blocked due to detected suspicious activity. This helps maintain the security and integrity of the platform.';
            default:
                return 'Your account was temporarily blocked for security reasons. Please wait for the block period to expire.';
        }
    };

    const getBlockDurationText = (reason?: string): string => {
        switch (reason) {
            case 'captcha_failed':
                return '2 minutes';
            case 'biometric_failed':
                return '5 minutes';
            case 'suspicious_activity':
                return '10 minutes';
            default:
                return 'a few minutes';
        }
    };

    const getTrustScoreColor = (score: number): string => {
        if (score >= 60) return 'text-green-400';
        if (score >= 40) return 'text-yellow-400';
        if (score >= 20) return 'text-orange-400';
        return 'text-red-400';
    };

    const getTrustScoreLabel = (score: number): string => {
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        if (score >= 20) return 'Low';
        return 'Very Low';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="text-white mx-auto animate-spin mb-4" size={32} />
                    <p className="text-white/80">Checking account status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Main Block Card */}
                <div className="bg-gray-900 border border-red-500/40 rounded-xl p-6 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="text-red-400" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Account Temporarily Blocked</h1>
                        <p className="text-gray-400 text-sm">Security measures are in place</p>
                    </div>

                    {/* Block Information */}
                    <div className="space-y-4 mb-6">
                        {/* Reason */}
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                                <span className="text-red-300 font-semibold text-sm">
                                    {getBlockReasonText(blockInfo?.blockReason)}
                                </span>
                            </div>
                            <p className="text-red-200/80 text-xs leading-relaxed">
                                {getBlockReasonDescription(blockInfo?.blockReason)}
                            </p>
                        </div>

                        {/* Countdown Timer */}
                        {blockInfo?.timeUntilUnblock && blockInfo.timeUntilUnblock > 0 && (
                            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <Clock className="text-orange-400" size={16} />
                                    <span className="text-gray-300 text-sm">Time Remaining</span>
                                </div>
                                <div className="text-3xl font-bold text-orange-400 font-mono">
                                    {timeRemaining}
                                </div>
                                <p className="text-gray-500 text-xs mt-1">
                                    Block duration: {getBlockDurationText(blockInfo?.blockReason)}
                                </p>
                            </div>
                        )}

                        {/* Trust Score */}
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-300 text-sm">Trust Score</span>
                                <span className={`font-bold ${getTrustScoreColor(blockInfo?.trustScore || 0)}`}>
                                    {blockInfo?.trustScore || 0}/100
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${(blockInfo?.trustScore || 0) >= 60
                                            ? 'bg-green-400'
                                            : (blockInfo?.trustScore || 0) >= 40
                                                ? 'bg-yellow-400'
                                                : (blockInfo?.trustScore || 0) >= 20
                                                    ? 'bg-orange-400'
                                                    : 'bg-red-400'
                                        }`}
                                    style={{ width: `${Math.max(5, blockInfo?.trustScore || 0)}%` }}
                                />
                            </div>
                            <p className={`text-xs ${getTrustScoreColor(blockInfo?.trustScore || 0)}`}>
                                {getTrustScoreLabel(blockInfo?.trustScore || 0)} - {blockInfo?.trustScore || 0 < 40
                                    ? 'Additional security checks may be required'
                                    : 'Continue following the rules to maintain good standing'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={checkBlockStatus}
                            disabled={isCheckingStatus}
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {isCheckingStatus ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Checking Status...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    <span>Check Status</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                            <Home size={16} />
                            <span>Return to Start</span>
                        </button>
                    </div>
                </div>

                {/* Information Card */}
                <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3 text-sm">What happens next?</h3>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                            <p>Your account will be automatically unblocked when the time expires</p>
                        </div>
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                            <p>Follow security guidelines to improve your trust score</p>
                        </div>
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                            <p>Repeated violations may result in longer blocks</p>
                        </div>
                    </div>
                </div>

                {/* User Info (Development) */}
                {process.env.NODE_ENV === 'development' && telegramUser && (
                    <div className="mt-4 bg-gray-900/30 border border-gray-700 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">
                            Debug: User {telegramUser.first_name} (ID: {telegramUser.id})
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}