// src/components/AttemptsDisplay.tsx - Updated with new attempts architecture

"use client";

import React, { useState, useEffect } from "react";
import { Target, RotateCcw, Clock } from "lucide-react";

import { useAttempts } from "@/hooks/useAttempts";
import { useT } from "@/contexts/LocalizationContext";

interface AttemptsDisplayProps {
    className?: string;
}

const AttemptsDisplay: React.FC<AttemptsDisplayProps> = ({ className = "" }) => {
    const t = useT();
    const {
        attemptsStatus,
        isLoading,
        error,
        attemptsRemaining,
        canPlay
    } = useAttempts();

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
                // The useAttempts hook will automatically refresh when reset time is reached
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
    }, [attemptsStatus?.resetTime, canPlay]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <span className="text-red-400 text-sm">⚡ --</span>
            </div>
        );
    }

    const isEmpty = attemptsRemaining === 0;

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
};

export default AttemptsDisplay;