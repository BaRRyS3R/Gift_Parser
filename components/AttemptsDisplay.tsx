// src/components/AttemptsDisplay.tsx - Лаконичный показатель попыток для главной страницы

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Zap } from "lucide-react";

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
            <div className={`flex items-center justify-center ${className}`}>
                <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                        <span className="text-white/80 text-sm">
                            {t("common.loading")}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const isEmpty = attemptsStatus.attemptsRemaining === 0;
    const isLow = attemptsStatus.attemptsRemaining <= 2 && attemptsStatus.attemptsRemaining > 0;

    const getTextColor = () => {
        if (isEmpty) return "text-red-400";
        if (isLow) return "text-orange-400";
        return "text-green-400";
    };

    const getBorderColor = () => {
        if (isEmpty) return "border-red-400/30";
        if (isLow) return "border-orange-400/30";
        return "border-white/20";
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className={`bg-black/30 backdrop-blur-sm border rounded-lg px-4 py-2 ${getBorderColor()}`}>
                {isEmpty && timeUntilReset ? (
                    <div className="flex items-center space-x-2">
                        <Clock className="text-red-400" size={16} />
                        <span className="text-red-400 text-sm font-medium">
                            {timeUntilReset}
                        </span>
                        <span className="text-red-400/60 text-xs">
                            {t("attempts.resetTime")}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <Zap className={getTextColor()} size={16} />
                        <span className={`${getTextColor()} text-sm font-medium`}>
                            {attemptsStatus.attemptsRemaining}
                        </span>
                        <span className="text-white/60 text-xs">
                            {attemptsStatus.attemptsRemaining === 1
                                ? t("common.attempts").slice(0, -1)  // "attempt" instead of "attempts"
                                : t("common.attempts")
                            }
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttemptsDisplay;