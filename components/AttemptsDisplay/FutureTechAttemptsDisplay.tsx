// src/components/AttemptsDisplay/FutureTechAttemptsDisplay.tsx - Future Tech стилистика для страницы игры

"use client";

import React, { useState, useEffect } from "react";
import { Target, RotateCcw, Clock, ShoppingCart, Zap, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { useT } from "@/contexts/LocalizationContext";
import type { AttemptsStatus, UserLevelInfo } from "@/hooks/modules/useAttempts";

interface FutureTechAttemptsDisplayProps {
    className?: string;
    attemptsStatus: AttemptsStatus | null;
    isLoading: boolean;
    error: string | null;
    canPlay: boolean;
    attemptsRemaining: number;
    onRetry?: () => void;
    showShopButton?: boolean;
}

const FutureTechAttemptsDisplay: React.FC<FutureTechAttemptsDisplayProps> = ({
    className = "",
    attemptsStatus,
    isLoading,
    error,
    canPlay,
    attemptsRemaining,
    onRetry,
    showShopButton = false,
}) => {
    const t = useT();
    const router = useRouter();
    const [timeUntilReset, setTimeUntilReset] = useState<string>("");

    // Timer update logic
    useEffect(() => {
        if (!attemptsStatus?.resetTime || canPlay) {
            setTimeUntilReset("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const diff = attemptsStatus.resetTime!.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilReset("");
                if (onRetry) {
                    onRetry();
                }
            } else {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                if (hours > 0) {
                    setTimeUntilReset(
                        `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
                    );
                } else {
                    setTimeUntilReset(
                        `${minutes}:${seconds.toString().padStart(2, "0")}`,
                    );
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [attemptsStatus?.resetTime, canPlay, onRetry]);

    const handleShopClick = () => {
        router.push("/shop");
    };

    if (isLoading) {
        return (
            <div className={`${className}`}>
                <div
                    className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full relative overflow-hidden"
                    style={{
                        clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                    }}
                >
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                    <div className="relative z-10 p-6">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span className="font-mono text-sm tracking-wider uppercase text-white/70">
                                {t("common.loading")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className}`}>
                <div
                    className="bg-black/90 backdrop-blur-xl border-2 border-red-400/40 text-white w-full relative overflow-hidden"
                    style={{
                        clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                    }}
                >
                    <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
                    <div className="relative z-10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="text-red-400" size={20} />
                                <span className="font-mono text-sm tracking-wider uppercase text-red-400">
                                    {t("common.error")}
                                </span>
                            </div>
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent mb-4" />

                        <p className="text-red-300 text-xs font-mono mb-4">{error}</p>

                        {onRetry && (
                            <button
                                className="w-full py-2 px-4 border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 transition-all duration-300 font-mono text-xs tracking-wider uppercase text-red-300 hover:text-red-200"
                                style={{
                                    clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
                                }}
                                onClick={onRetry}
                            >
                                {t("common.retry")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const isEmpty = attemptsRemaining === 0;
    const getBatteryLevel = () => {
        if (attemptsRemaining <= 0) return 0;
        if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
        return 100;
    };

    const getBorderColor = () => {
        if (isEmpty) return "border-red-400/40";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "border-orange-400/40";
        return "border-white/30";
    };

    const getBackgroundOverlay = () => {
        if (isEmpty) return "bg-red-500/10";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "bg-orange-500/10";
        return "bg-black/20";
    };

    const getAccentColor = () => {
        if (isEmpty) return "text-red-400";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "text-orange-400";
        return "text-green-400";
    };

    const getProgressColor = () => {
        if (isEmpty) return "bg-red-400";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "bg-orange-400";
        return "bg-green-400";
    };

    return (
        <div className={`${className}`}>
            <div
                className={`bg-black/90 backdrop-blur-xl border-2 ${getBorderColor()} text-white w-full relative overflow-hidden`}
                style={{
                    clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
                }}
            >
                <div className={`absolute inset-0 ${getBackgroundOverlay()} pointer-events-none`} />

                <div className="relative z-10 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Target className={getAccentColor()} size={20} />
                            <span className="font-mono text-sm tracking-wider uppercase text-white/90">
                                {t("attempts.current")}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 ${getAccentColor().replace('text-', 'bg-')} rounded-full animate-pulse`} />
                            <span className={`text-2xl font-mono tracking-widest ${getAccentColor()}`}>
                                {attemptsRemaining}
                            </span>
                            <Zap className={getAccentColor()} size={16} />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className={`h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-4`} />

                    {/* Battery Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-mono mb-2">
                            <span className="text-white/60">
                                {attemptsRemaining}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-none overflow-hidden relative">
                            <div
                                className={`h-full transition-all duration-500 ${getProgressColor()}`}
                                style={{
                                    width: `${getBatteryLevel()}%`,
                                    clipPath: "polygon(0 0, calc(100% - 2px) 0, 100% 100%, 2px 100%)"
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
                        </div>
                    </div>

                    {/* Reset Timer or Shop Button */}
                    {isEmpty && (
                        <div className="space-y-4">
                            {timeUntilReset && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <Clock className="text-green-400" size={16} />
                                        <span className="font-mono text-xs tracking-wider uppercase text-white/70">
                                            {t("attempts.resetTime")}
                                        </span>
                                    </div>
                                    <div className="text-xl font-mono tracking-widest text-green-400">
                                        {timeUntilReset}
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent mt-4 mb-4" />
                                </div>
                            )}

                            {showShopButton && (
                                <button
                                    className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 group flex items-center justify-center space-x-3"
                                    style={{
                                        clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                                    }}
                                    onClick={handleShopClick}
                                >
                                    <ShoppingCart
                                        className="text-yellow-300 group-hover:scale-110 transition-transform duration-300"
                                        size={16}
                                    />
                                    <span className="font-mono text-sm tracking-wider uppercase text-yellow-300">
                                        {t("nav.shop")}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Normal State Message */}
                    {!isEmpty && (
                        <div className="text-center">
                            <p className="font-mono text-xs tracking-wider uppercase text-white/60">
                                {t("game.general.readyToPlay")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FutureTechAttemptsDisplay;