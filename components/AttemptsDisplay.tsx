// src/components/AttemptsDisplay.tsx - Минималистичный текстовый показатель попыток

"use client";

import React, { useState, useEffect, useCallback } from "react";

import { useUser } from "@/hooks/useUser";
import { userService, type AttemptsStatus } from "@/lib/supabase";
import { useT } from "@/contexts/LocalizationContext";
import {
    Target,
    Clock
} from "lucide-react";

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
            <div className={`text-center ${className}`}>
                <span className="text-white/60 text-sm">
                    {t("common.loading")}
                </span>
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

    return (
        <div className={`text-center ${className}`}>
            {isEmpty && timeUntilReset ? (
                <div className="space-y-1">
                    <div className="text-red-400 text-lg font-bold tabular-nums">
                        <Clock size={24} className="text-red" /> {timeUntilReset}
                    </div>
                </div>
            ) : (
                <div className="space-y-1">
                    <div className={`${getTextColor()} text-lg font-bold tabular-nums`}>
                        <Target size={24} className="text-white" /> {attemptsStatus.attemptsRemaining}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttemptsDisplay;