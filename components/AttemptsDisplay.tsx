// src/components/AttemptsDisplay.tsx - Minimal icon-based attempts display

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Target, RotateCcw, Clock } from "lucide-react";

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

    // Timer update logic
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
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const isEmpty = attemptsStatus.attemptsRemaining === 0;

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
                    ⚡
                    <span className="text-white text-lg font-bold tabular-nums">
                        {attemptsStatus.attemptsRemaining}
                    </span>
                </>
            )}
        </div>
    );
};

export default AttemptsDisplay;