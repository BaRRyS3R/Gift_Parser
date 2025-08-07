// src/components/Tournaments/TournamentButton.tsx - Tournament access button for main page

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@nextui-org/react";
import { Trophy, Clock, Target, Sparkles } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament interface (simplified)
interface Tournament {
    id: string;
    name: string;
    mode: 'survival' | 'physics' | 'rotation';
    start_time: string;
    end_time: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

interface TournamentButtonProps {
    isTransitioning?: boolean;
    onClick: () => void;
}

// Format time remaining for active tournaments
function formatTimeRemaining(endTime: string): string {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining === 0) return "Ended";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// Format time until start for upcoming tournaments
function formatTimeUntilStart(startTime: string): string {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const remaining = Math.max(0, start - now);

    if (remaining === 0) return "Starting";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d`;
    return `${hours}h`;
}

// Get mode colors for visual distinction
function getModeColors(mode: string) {
    switch (mode) {
        case 'survival':
            return {
                primary: "text-red-400",
                glow: "bg-red-500/20",
                border: "border-red-400/40",
            };
        case 'physics':
            return {
                primary: "text-purple-400",
                glow: "bg-purple-500/20",
                border: "border-purple-400/40",
            };
        case 'rotation':
            return {
                primary: "text-orange-400",
                glow: "bg-orange-500/20",
                border: "border-orange-400/40",
            };
        default:
            return {
                primary: "text-white",
                glow: "bg-white/20",
                border: "border-white/40",
            };
    }
}

export default function TournamentButton({ isTransitioning = false, onClick }: TournamentButtonProps) {
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();

    const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
    const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [timeDisplay, setTimeDisplay] = useState<string>("");

    // Fetch tournament data
    const fetchTournamentData = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await makeAuthenticatedRequest('/api/tournaments');

            if (!response.ok) {
                console.error('Failed to fetch tournaments for button');
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                setActiveTournament(result.data.active || null);
                setNextTournament(result.data.upcoming?.[0] || null);
            }
        } catch (error) {
            console.error('Error fetching tournament data for button:', error);
        } finally {
            setIsLoading(false);
        }
    }, [makeAuthenticatedRequest]);

    // Initial fetch
    useEffect(() => {
        fetchTournamentData();
    }, [fetchTournamentData]);

    // Update time display
    useEffect(() => {
        const updateTimeDisplay = () => {
            if (activeTournament) {
                setTimeDisplay(formatTimeRemaining(activeTournament.end_time));
            } else if (nextTournament) {
                setTimeDisplay(formatTimeUntilStart(nextTournament.start_time));
            }
        };

        updateTimeDisplay();
        const interval = setInterval(updateTimeDisplay, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [activeTournament, nextTournament]);

    // Determine which tournament to display and button style
    const displayTournament = activeTournament || nextTournament;
    const isActive = !!activeTournament;

    if (!displayTournament || !displayTournament.mode) {
        // Default tournament button when no tournaments are available or mode is missing
        return (
            <button
                className="group relative w-full max-w-[200px] px-6 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-bold hover:border-white/60 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isTransitioning}
                onClick={onClick}
            >
                <div className="flex flex-col items-center space-y-2">
                    <Trophy className="text-white/60" size={24} />
                    <span className="text-sm tracking-wider">
                        {t("tournaments.navigation.tournaments")}
                    </span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
            </button>
        );
    }

    const colors = getModeColors(displayTournament.mode);

    return (
        <button
            className={`group relative w-full max-w-[220px] px-6 py-4 bg-transparent border-2 ${colors.border} text-white rounded-xl font-bold hover:border-opacity-80 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
            disabled={isTransitioning || isLoading}
            onClick={onClick}
        >
            {/* Background glow effect */}
            <div className={`absolute inset-0 ${colors.glow} opacity-30`} />

            {/* Active tournament pulse effect */}
            {isActive && (
                <div className={`absolute inset-0 ${colors.glow} opacity-20 animate-pulse`} />
            )}

            <div className="relative z-10 flex flex-col items-center space-y-2">
                {/* Icon and status */}
                <div className="flex items-center space-x-2">
                    {isActive ? (
                        <Sparkles className={`${colors.primary} animate-pulse`} size={20} />
                    ) : (
                        <Clock className="text-white/60" size={20} />
                    )}
                    <Trophy className={colors.primary} size={24} />
                </div>

                {/* Tournament info */}
                <div className="text-center">
                    <div className="text-xs text-white/60 mb-1">
                        {isActive ? t("tournaments.status.active") : t("tournaments.status.upcoming")}
                    </div>
                    <div className="text-sm font-bold tracking-wider">
                        {t(`tournaments.modes.${displayTournament.mode}` as any)}
                    </div>
                    {timeDisplay && (
                        <div className={`text-xs font-mono ${colors.primary} mt-1`}>
                            {timeDisplay}
                        </div>
                    )}
                </div>
            </div>

            {/* Hover effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-${colors.primary.replace('text-', '').replace('-400', '-500')}/20 via-transparent to-${colors.primary.replace('text-', '').replace('-400', '-500')}/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300`} />

            {/* Live indicator for active tournaments */}
            {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
        </button>
    );
}