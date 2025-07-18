// src/components/AttemptsDisplay.tsx - Обновленный компонент с props для устранения дублирования

"use client";

import React, { useState, useEffect } from "react";
import { Target, RotateCcw, Clock, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

import { useT } from "@/contexts/LocalizationContext";
import type { AttemptsStatus } from "@/hooks/modules/useAttempts";

interface AttemptsDisplayProps {
    className?: string;
    attemptsStatus: AttemptsStatus | null;
    isLoading: boolean;
    error: string | null;
    canPlay: boolean;
    attemptsRemaining: number;
    onRetry?: () => void;
    showShopButton?: boolean;
}

const AttemptsDisplay: React.FC<AttemptsDisplayProps> = ({
    className = "",
    attemptsStatus,
    isLoading,
    error,
    canPlay,
    attemptsRemaining,
    onRetry,
    showShopButton = false
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
                // Trigger retry if callback is provided
                if (onRetry) {
                    onRetry();
                }
            } else {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                if (hours > 0) {
                    setTimeUntilReset(`${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
                } else {
                    setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, "0")}`);
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
            <div className={`flex items-center justify-center ${className}`}>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-center ${className}`}>
                <div className="flex items-center justify-center mb-2">
                    <span className="text-red-400 text-sm">⚡ --</span>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-xs text-red-300 hover:text-red-200 transition-colors"
                    >
                        {t("common.retry")}
                    </button>
                )}
            </div>
        );
    }

    const isEmpty = attemptsRemaining === 0;

    // Simple display variant for main page
    if (!showShopButton) {
        return (
            <div className={`flex items-center justify-center space-x-2 ${className}`}>
                {isEmpty && timeUntilReset ? (
                    <>
                        <RotateCcw className="text-red-400" size={18} />
                        <span className="text-red-400 text-lg font-bold tabular-nums">
                            {timeUntilReset}
                        </span>
                        <Clock className="text-red-400" size={18} />
                    </>
                ) : (
                    <>
                        <span className="text-white text-lg font-bold tabular-nums">
                            {attemptsRemaining} ⚡
                        </span>
                    </>
                )}
            </div>
        );
    }

    // Enhanced display variant for game page
    const getBatteryLevel = () => {
        if (attemptsRemaining <= 0) return 0;
        if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
        return 100;
    };

    const getBatteryColor = () => {
        if (isEmpty) return "text-red-400";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "text-orange-400";
        return "text-green-400";
    };

    const getBatteryBgColor = () => {
        if (isEmpty) return "bg-red-500/20 border-red-400/40";
        if (attemptsRemaining <= 2 && attemptsRemaining > 0) return "bg-orange-500/20 border-orange-400/40";
        return "bg-white/10 border-white/30";
    };

    return (
        <div
            className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${getBatteryBgColor()} ${className}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <Target className={getBatteryColor()} size={16} />
                    <span className={`text-sm font-bold ${getBatteryColor()}`}>
                        {t("attempts.current")}
                    </span>
                </div>
                <span className={`text-lg font-bold ${getBatteryColor()}`}>
                    {attemptsRemaining} ⚡
                </span>
            </div>

            <div className="mb-3">
                <div
                    className={`w-full h-2 rounded-full overflow-hidden ${isEmpty
                        ? "bg-red-400/20"
                        : attemptsRemaining <= 2 && attemptsRemaining > 0
                            ? "bg-orange-400/20"
                            : "bg-white/20"
                        }`}
                >
                    <div
                        className={`h-full transition-all duration-500 ${getBatteryColor().replace(
                            "text-",
                            "bg-"
                        )}`}
                        style={{ width: `${getBatteryLevel()}%` }}
                    />
                </div>
            </div>

            {isEmpty && (
                <div className="space-y-3">
                    <div className="text-center space-y-2">
                        <p className="text-red-400/80 text-xs">
                            {t("game.general.waitForReset")}
                        </p>
                        {timeUntilReset && (
                            <div className="space-y-1">
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("attempts.resetTime")}
                                </div>
                                <div className="text-lg font-bold text-green-400">
                                    {timeUntilReset}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleShopClick}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <ShoppingCart size={16} />
                        <span className="font-bold text-sm">{t("nav.shop")}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AttemptsDisplay;