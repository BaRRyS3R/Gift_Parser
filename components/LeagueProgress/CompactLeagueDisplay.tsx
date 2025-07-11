// src/components/LeagueProgress/CompactLeagueDisplay.tsx - Compact league display for main page

"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Star, Medal, Award, Crown } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import leagueService, { type LeagueProgressInfo } from "@/lib/league_service";

interface CompactLeagueDisplayProps {
    className?: string;
}

const CompactLeagueDisplay: React.FC<CompactLeagueDisplayProps> = ({
    className = ""
}) => {
    const { user, telegramUser } = useUser();
    const t = useT();

    const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProgressInfo = async () => {
            if (!user || !telegramUser) {
                setIsLoading(false);
                return;
            }

            try {
                const progress = await leagueService.getUserLeagueProgress(
                    user.id,
                    user.total_games
                );
                setProgressInfo(progress);
            } catch (error) {
                console.error("Error loading league progress:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProgressInfo();
    }, [user, telegramUser]);

    if (isLoading) {
        return (
            <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 ${className}`}>
                <div className="animate-pulse flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white/20 rounded" />
                    <div className="w-24 h-3 bg-white/20 rounded" />
                </div>
            </div>
        );
    }

    if (!progressInfo) {
        return null;
    }

    // Get league icon and colors
    const getLeagueIcon = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze': return Trophy;
            case 'silver': return Medal;
            case 'gold': return Award;
            case 'platinum': return Crown;
            case 'diamond': return Star;
            default: return Trophy;
        }
    };

    const getLeagueColor = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze': return 'text-orange-400';
            case 'silver': return 'text-gray-300';
            case 'gold': return 'text-yellow-400';
            case 'platinum': return 'text-purple-300';
            case 'diamond': return 'text-cyan-300';
            default: return 'text-white';
        }
    };

    const LeagueIcon = getLeagueIcon(progressInfo.currentLeague.name);
    const leagueColor = getLeagueColor(progressInfo.currentLeague.name);

    return (
        <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 hover:bg-white/15 transition-all duration-300 ${className}`}>
            <div className="flex items-center justify-center space-x-3">
                {/* Level */}
                <div className="flex items-center space-x-1">
                    <Star className="text-white/80" size={14} />
                    <span className="text-white text-sm font-bold">
                        {progressInfo.currentLevel}
                    </span>
                </div>

                {/* Separator */}
                <div className="w-px h-4 bg-white/30" />

                {/* League */}
                <div className="flex items-center space-x-1">
                    <LeagueIcon className={`${leagueColor} animate-pulse-gentle`} size={14} />
                    <span className={`text-sm font-medium ${leagueColor}`}>
                        {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CompactLeagueDisplay;