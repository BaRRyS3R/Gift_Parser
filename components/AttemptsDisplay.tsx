// src/components/AttemptsDisplay.tsx - Attempts counter for main page

"use client";

import React, { useState, useEffect } from "react";
import { Clock, Zap } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

export default function AttemptsDisplay() {
    const { user } = useUser();
    const t = useT();
    const [timeUntilReset, setTimeUntilReset] = useState<string>("");

    // Update reset timer
    useEffect(() => {
        if (!user?.attempts_reset_at || (user?.attempts_remaining && user.attempts_remaining > 0)) {
            setTimeUntilReset("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const resetTime = new Date(user.attempts_reset_at!);
            const diff = resetTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilReset("");
                clearInterval(interval);
            } else {
                setTimeUntilReset(formatTimeRemaining(diff));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user?.attempts_reset_at, user?.attempts_remaining]);

    if (!user) {
        return (
            <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    const hasAttempts = user.attempts_remaining && user.attempts_remaining > 0;

    return (
        <div className="text-center py-4 px-4">
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-3">
                    <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                        <Zap className={hasAttempts ? "text-white" : "text-white/50"} size={20} />
                    </div>

                    <div className="text-left">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-white/60 uppercase tracking-wider">
                                {t("attempts.current")}
                            </span>
                            <span className={`text-xl font-bold ${hasAttempts ? "text-white" : "text-white/50"}`}>
                                {user.attempts_remaining || 0}
                            </span>
                        </div>

                        {!hasAttempts && timeUntilReset && (
                            <div className="flex items-center space-x-1 mt-1">
                                <Clock className="text-white/40" size={12} />
                                <span className="text-xs text-white/40">
                                    {t("attempts.resetTime")}: {timeUntilReset}
                                </span>
                            </div>
                        )}

                        {hasAttempts && (
                            <div className="text-xs text-white/40 mt-1">
                                {t("attempts.remaining")}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}