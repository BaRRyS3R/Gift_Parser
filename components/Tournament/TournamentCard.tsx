// src/components/Tournament/TournamentCard.tsx - Fixed card component

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, Calendar, Clock, Crosshair, Atom, RotateCw } from "lucide-react";
import type { Tournament, TournamentGameMode } from "@/types/tournaments";
import { getTournamentTimeRemaining, getTournamentTimeUntilStart } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

interface TournamentCardProps {
    tournament: Tournament;
    userPosition?: number;
    isParticipating?: boolean;
    className?: string;
}

export default function TournamentCard({
    tournament,
    userPosition,
    isParticipating = false,
    className = "",
}: TournamentCardProps) {
    const router = useRouter();
    const t = useT();

    const handleCardClick = () => {
        router.push(`/tournaments/details?id=${tournament.id}`);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
        }
    };

    const getGameModeIcon = (mode: TournamentGameMode) => {
        switch (mode) {
            case "survival":
                return <Crosshair className="text-red-400" size={20} />;
            case "physics":
                return <Atom className="text-purple-400" size={20} />;
            case "rotation":
                return <RotateCw className="text-orange-400" size={20} />;
        }
    };

    const getGameModeColor = (mode: TournamentGameMode) => {
        switch (mode) {
            case "survival":
                return "border-red-400/30 bg-red-500/5";
            case "physics":
                return "border-purple-400/30 bg-purple-500/5";
            case "rotation":
                return "border-orange-400/30 bg-orange-500/5";
        }
    };

    const getStatusDisplay = () => {
        switch (tournament.status) {
            case "upcoming": {
                const timeUntilStart = getTournamentTimeUntilStart(tournament);
                const daysUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60 * 24));
                return {
                    text: t("tournaments.status.upcoming"),
                    detail: daysUntilStart > 0 ? `${daysUntilStart}d` : t("tournaments.status.startingSoon"),
                    color: "text-blue-400",
                    bgColor: "bg-blue-500/10",
                };
            }
            case "active": {
                const timeRemaining = getTournamentTimeRemaining(tournament);
                const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
                return {
                    text: t("tournaments.status.active"),
                    detail: hoursRemaining > 24 ? `${Math.ceil(hoursRemaining / 24)}d` : `${hoursRemaining}h`,
                    color: "text-green-400",
                    bgColor: "bg-green-500/10",
                };
            }
            case "ended":
                return {
                    text: t("tournaments.status.ended"),
                    detail: "",
                    color: "text-gray-400",
                    bgColor: "bg-gray-500/10",
                };
            default:
                return {
                    text: "Unknown",
                    detail: "",
                    color: "text-gray-400",
                    bgColor: "bg-gray-500/10",
                };
        }
    };

    const status = getStatusDisplay();
    const modeColor = getGameModeColor(tournament.game_mode);

    return (
        <div
            className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
        ${modeColor} ${className}
      `}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${tournament.name} tournament`}
        >
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        {getGameModeIcon(tournament.game_mode)}
                        <div>
                            <h3 className="text-lg font-bold text-white line-clamp-1">
                                {tournament.name}
                            </h3>
                            <p className="text-sm text-white/60 capitalize">
                                {t(`tournaments.modes.${tournament.game_mode}`)}
                            </p>
                        </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.text}
                    </div>
                </div>

                {/* Description */}
                {tournament.description && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                        {tournament.description}
                    </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 text-white/60">
                            <Trophy size={14} />
                            <span>{tournament.prizes.length} {t("tournaments.prizes")}</span>
                        </div>

                        {tournament.status === "active" && status.detail && (
                            <div className="flex items-center space-x-1 text-green-400">
                                <Clock size={14} />
                                <span>{status.detail} {t("tournaments.remaining")}</span>
                            </div>
                        )}
                    </div>

                    {userPosition && (
                        <div className="text-right">
                            <div className="text-white font-medium">
                                #{userPosition}
                            </div>
                            <div className="text-white/60 text-xs">
                                {t("tournaments.yourPosition")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Participation indicator */}
                {isParticipating && (
                    <div className="mt-3 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-300 text-xs font-medium">
                                {t("tournaments.participating")}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    );
}