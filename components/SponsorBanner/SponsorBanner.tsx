// src/components/SponsorBanner/SponsorBanner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Clock, ExternalLink, Calendar } from "lucide-react";
import { formatTimeRemaining } from "@/types/tournaments";
import type { TournamentWithStatus } from "@/lib/supabase_tournament_extension";
import { useT } from "@/contexts/LocalizationContext";

interface SponsorBannerProps {
    tournament: TournamentWithStatus;
}

export default function SponsorBanner({ tournament }: SponsorBannerProps) {
    const t = useT();
    const [timeDisplay, setTimeDisplay] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const endDate = new Date(tournament.end_date);
            const diff = endDate.getTime() - now.getTime();
            setTimeDisplay(diff > 0 ? formatTimeRemaining(diff) : t("tournament.ended"));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [tournament, t]);

    const handleSponsorClick = () => {
        if (tournament.sponsor_channel_url) {
            window.open(tournament.sponsor_channel_url, '_blank');
        }
    };

    // Если нет спонсора, показываем простой баннер с информацией о турнире
    if (!tournament.sponsor_name || !tournament.sponsor_image_url) {
        return (
            <div className="w-full h-64 bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-xl overflow-hidden relative border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />

                <div className="relative h-full flex flex-col justify-between p-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide mb-2">
                            {tournament.name}
                        </h1>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-green-400 font-medium text-sm">
                                {t("tournament.tournamentActive")}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {timeDisplay && (
                            <div className="flex items-center space-x-3">
                                <Clock className="text-white/80" size={18} />
                                <div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {timeDisplay}
                                    </div>
                                    <div className="text-white/60 text-xs">
                                        {t("tournament.timeRemaining")}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>{new Date(tournament.start_date).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>{new Date(tournament.end_date).toLocaleDateString('ru-RU')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-64 relative rounded-xl overflow-hidden border border-white/10">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${tournament.sponsor_image_url})`
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-6">
                {/* Top Section - Sponsor Name and Tournament Info */}
                <div className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">
                                Sponsor
                            </div>
                            <h2 className="text-lg font-bold text-white">
                                {tournament.sponsor_name}
                            </h2>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-green-400 font-medium text-sm">
                                {t("tournament.tournamentActive")}
                            </span>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-white tracking-wide">
                        {tournament.name}
                    </h1>
                </div>

                {/* Bottom Section - Time Info and Channel Button */}
                <div className="space-y-4">
                    {/* Tournament Time Information */}
                    <div className="space-y-2">
                        {timeDisplay && (
                            <div className="flex items-center space-x-3">
                                <Clock className="text-white/80" size={16} />
                                <div>
                                    <div className="text-lg font-bold text-white font-mono">
                                        {timeDisplay}
                                    </div>
                                    <div className="text-white/60 text-xs">
                                        {t("tournament.timeRemaining")}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>
                                    {new Date(tournament.start_date).toLocaleDateString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>
                                    {new Date(tournament.end_date).toLocaleDateString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sponsor Channel Button */}
                    {tournament.sponsor_channel_url && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleSponsorClick}
                                className="flex items-center space-x-2 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 rounded-lg transition-all duration-300 backdrop-blur-sm hover:scale-105 active:scale-95"
                            >
                                <ExternalLink className="text-white" size={14} />
                                <span className="text-white font-medium text-sm">
                                    Sponsor Channel
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}