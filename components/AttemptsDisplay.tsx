// src/components/AttemptsDisplay.tsx - Красивый компонент для отображения попыток внизу экрана

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Zap, Battery, Shield } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService, type AttemptsStatus } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";

interface AttemptsDisplayProps {
    className?: string;
}

const AttemptsDisplay: React.FC<AttemptsDisplayProps> = ({ className = "" }) => {
    const { telegramUser } = useUser();
    const t = useT();

    const [attemptsStatus, setAttemptsStatus] = useState<AttemptsStatus>({
        canPlay: true,
        attemptsRemaining: 0,
    });
    const [timeUntilReset, setTimeUntilReset] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const checkAttempts = useCallback(async () => {
        if (!telegramUser?.id) return;

        try {
            const status = await userService.checkAndUpdateAttemptsWithServerValidation(
                telegramUser.id,
            );
            setAttemptsStatus(status);
        } catch (error) {
            console.error("Error checking attempts:", error);
        } finally {
            setIsLoading(false);
        }
    }, [telegramUser?.id]);

    useEffect(() => {
        checkAttempts();
    }, [checkAttempts]);

    // Обновление таймера
    useEffect(() => {
        if (!attemptsStatus.resetTime || attemptsStatus.canPlay) {
            setTimeUntilReset("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const diff = attemptsStatus.resetTime!.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilReset("");
                checkAttempts();
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
    }, [attemptsStatus.resetTime, attemptsStatus.canPlay, checkAttempts]);

    if (isLoading) {
        return (
            <div className={`w-full ${className}`}>
                <div className="mx-4 mb-2">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-4">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span className="text-white/80 text-sm font-medium">
                                {t("common.loading")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isEmpty = attemptsStatus.attemptsRemaining === 0;
    const isLow = attemptsStatus.attemptsRemaining <= 2 && attemptsStatus.attemptsRemaining > 0;
    const isHigh = attemptsStatus.attemptsRemaining > 10;

    const getColors = () => {
        if (isEmpty) {
            return {
                text: "text-red-400",
                border: "border-red-400/40",
                bg: "bg-gradient-to-r from-red-500/20 to-red-600/20",
                glow: "shadow-lg shadow-red-500/20",
                icon: "text-red-400"
            };
        }
        if (isLow) {
            return {
                text: "text-orange-400",
                border: "border-orange-400/40",
                bg: "bg-gradient-to-r from-orange-500/20 to-yellow-500/20",
                glow: "shadow-lg shadow-orange-500/20",
                icon: "text-orange-400"
            };
        }
        if (isHigh) {
            return {
                text: "text-blue-400",
                border: "border-blue-400/40",
                bg: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20",
                glow: "shadow-lg shadow-blue-500/20",
                icon: "text-blue-400"
            };
        }
        return {
            text: "text-green-400",
            border: "border-green-400/40",
            bg: "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
            glow: "shadow-lg shadow-green-500/20",
            icon: "text-green-400"
        };
    };

    const colors = getColors();

    const getBatteryLevel = () => {
        if (attemptsStatus.attemptsRemaining <= 0) return 0;
        const maxDisplay = 20;
        return Math.min(100, (attemptsStatus.attemptsRemaining / maxDisplay) * 100);
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="mx-4 mb-2">
                <div className={`backdrop-blur-xl border rounded-2xl px-6 py-4 transition-all duration-500 ${colors.bg} ${colors.border} ${colors.glow}`}>
                    {isEmpty && timeUntilReset ? (
                        // Режим таймера восстановления
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <Clock className={`${colors.icon} animate-pulse`} size={20} />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                </div>
                                <div>
                                    <div className="text-xs text-red-300/80 uppercase tracking-wider font-medium">
                                        {t("attempts.resetTime")}
                                    </div>
                                    <div className={`text-lg font-bold ${colors.text} tabular-nums`}>
                                        {timeUntilReset}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Shield className="text-red-400/60" size={16} />
                                <span className="text-red-400/80 text-sm font-medium">0</span>
                            </div>
                        </div>
                    ) : (
                        // Режим отображения попыток
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <Battery className={colors.icon} size={20} />
                                        {isLow && !isEmpty && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/60 uppercase tracking-wider font-medium">
                                            {t("common.attempts")}
                                        </div>
                                        <div className={`text-xl font-bold ${colors.text} tabular-nums`}>
                                            {attemptsStatus.attemptsRemaining}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Zap className={`${colors.icon} ${isHigh ? "animate-pulse" : ""}`} size={18} />
                                    <div className="text-right">
                                        <div className="text-xs text-white/50 uppercase tracking-wider">
                                            {isEmpty ? "EMPTY" : isLow ? "LOW" : isHigh ? "PLENTY" : "READY"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Индикатор уровня */}
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-white/40">0</span>
                                    <span className="text-xs text-white/40">
                                        {attemptsStatus.attemptsRemaining > 20 ? "20+" : "20"}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 ease-out rounded-full ${isEmpty ? "bg-red-400" :
                                                isLow ? "bg-gradient-to-r from-orange-400 to-yellow-400" :
                                                    isHigh ? "bg-gradient-to-r from-blue-400 to-cyan-400" :
                                                        "bg-gradient-to-r from-green-400 to-emerald-400"
                                            }`}
                                        style={{ width: `${getBatteryLevel()}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttemptsDisplay;