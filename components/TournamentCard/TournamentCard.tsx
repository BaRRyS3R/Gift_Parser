// src/components/TournamentCard/TournamentCard.tsx - Updated to use API instead of direct DB
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, ChevronRight, Calendar } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament types (from the new API)
interface Tournament {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    prizes: string[];
    created_at: string;
    updated_at: string;
}

interface TournamentStatus {
    isActive: boolean;
    activeTournament: Tournament | null;
    timeRemaining?: number;
    hasStarted?: boolean;
}

interface TournamentCardProps {
    priority?: "high" | "low"; // high = активный турнир (показать в начале), low = нет турнира (показать в конце)
}

// Utility function to format time remaining
const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Ended";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);

    if (days > 0) {
        const hours = totalHours % 24;
        return `${days}d ${hours}h`;
    } else if (totalHours > 0) {
        const minutes = totalMinutes % 60;
        return `${totalHours}h ${minutes}m`;
    } else if (totalMinutes > 0) {
        const seconds = totalSeconds % 60;
        return `${totalMinutes}m ${seconds}s`;
    } else {
        return `${totalSeconds}s`;
    }
};

export default function TournamentCard({ priority = "low" }: TournamentCardProps) {
    const router = useRouter();
    const t = useT();
    const { makeAuthenticatedRequest } = useUser();

    const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
        isActive: false,
        activeTournament: null,
    });
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load tournament status using new API
    useEffect(() => {
        const loadTournamentStatus = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await makeAuthenticatedRequest('/api/tournament/active');

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to fetch tournament status');
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch tournament status');
                }

                const status: TournamentStatus = result.data;
                setTournamentStatus(status);

                if (status.isActive && status.activeTournament && status.timeRemaining) {
                    setTimeRemaining(formatTimeRemaining(status.timeRemaining));
                }
            } catch (error) {
                console.error("Error loading tournament status:", error);
                setError(error instanceof Error ? error.message : "Failed to load tournament");
            } finally {
                setIsLoading(false);
            }
        };

        loadTournamentStatus();
    }, [makeAuthenticatedRequest]);

    // Update countdown timer
    useEffect(() => {
        if (!tournamentStatus.activeTournament || !tournamentStatus.isActive) {
            setTimeRemaining("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const endDate = new Date(tournamentStatus.activeTournament!.end_date);
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining("");
                clearInterval(interval);
                // Reload tournament status
                const reloadStatus = async () => {
                    try {
                        const response = await makeAuthenticatedRequest('/api/tournament/active');
                        if (response.ok) {
                            const result = await response.json();
                            if (result.success) {
                                setTournamentStatus(result.data);
                            }
                        }
                    } catch (error) {
                        console.error("Error reloading tournament status:", error);
                    }
                };
                reloadStatus();
            } else {
                setTimeRemaining(formatTimeRemaining(diff));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [tournamentStatus.activeTournament, tournamentStatus.isActive, makeAuthenticatedRequest]);

    const handleClick = () => {
        router.push("/tournament");
    };

    if (isLoading) {
        return (
            <div className="backdrop-blur-sm border border-white/20 rounded-xl p-4 bg-white/5">
                <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-sm">{t("tournament.loadingTournament")}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="backdrop-blur-sm border border-red-400/30 rounded-xl p-4 bg-red-500/10">
                <div className="flex items-center justify-center space-x-2">
                    <span className="text-red-400 text-sm">{error}</span>
                </div>
            </div>
        );
    }

    // Активный турнир - показываем в начале
    if (tournamentStatus.isActive && tournamentStatus.activeTournament) {
        return (
            <button
                onClick={handleClick}
                className="w-full backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 hover:border-yellow-400/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-400/20 border border-yellow-400/40 rounded-lg flex items-center justify-center">
                            <Trophy className="text-yellow-400" size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-yellow-300">
                                {tournamentStatus.activeTournament.name}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm">
                                <span className="text-yellow-400/80">{t("tournament.tournamentActive")}</span>
                                {timeRemaining && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-yellow-400/60" />
                                        <div className="flex items-center space-x-1">
                                            <Clock className="text-yellow-400/80" size={12} />
                                            <span className="text-yellow-400/80">{timeRemaining}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="text-yellow-400/60" size={20} />
                </div>

                {/* Пульсирующий эффект для активного турнира */}
                <div className="absolute inset-0 rounded-xl bg-yellow-400/5 animate-pulse opacity-50" />
            </button>
        );
    }

    // Нет активного турнира - показываем в конце только если priority="low"
    if (priority === "low") {
        return (
            <button
                onClick={handleClick}
                className="w-full backdrop-blur-sm border border-white/20 rounded-xl p-4 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <Trophy className="text-white/60" size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-medium text-white/80">
                                {t("tournament.title")}
                            </h3>
                            <p className="text-sm text-white/50">
                                {t("tournament.noActiveTournament")}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="text-white/40" size={20} />
                </div>
            </button>
        );
    }

    // Если нет активного турнира и priority="high", не показываем ничего
    return null;
}