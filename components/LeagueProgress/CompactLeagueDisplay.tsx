// src/components/LeagueProgress/CompactLeagueDisplay.tsx - Updated to use league module

"use client";

import React, { useEffect } from "react";
import { Trophy, Star, Medal, Award, Crown } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface CompactLeagueDisplayProps {
    className?: string;
    onClick?: () => void;
}

const CompactLeagueDisplay: React.FC<CompactLeagueDisplayProps> = ({
    className = "",
    onClick
}) => {
    const { user, telegramUser, league } = useUser(); // NEW: Use league module from useUser
    const t = useT();

    // Fetch league data when component mounts
    useEffect(() => {
        if (user && telegramUser && !league.leagueData) {
            console.log("Fetching league data for compact display...");
            league.fetchLeagueData();
        }
    }, [user, telegramUser, league]);

    // Loading state
    if (league.isLoading) {
        return (
            <div className={`animate-pulse flex items-center justify-center space-x-2 ${className}`}>
                <div className="w-4 h-4 bg-white/20 rounded" />
                <div className="w-24 h-3 bg-white/20 rounded" />
            </div>
        );
    }

    // Get progress info from league module
    const progressInfo = league.getProgressInfo();

    if (!progressInfo) {
        return null;
    }

    // Helper functions
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

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center justify-center space-x-3 text-white/80 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
        >
            {/* Level */}
            <div className="flex items-center space-x-1">
                <Star className="text-white/60" size={16} />
                <span className="text-sm font-medium">
                    {progressInfo.currentLevel}
                </span>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-white/30" />

            {/* League */}
            <div className="flex items-center space-x-1">
                <LeagueIcon className={`${leagueColor} animate-pulse-gentle`} size={16} />
                <span className={`text-sm font-medium ${leagueColor}`}>
                    {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
                </span>
            </div>

            {/* Error state */}
            {league.error && (
                <div className="text-red-400 text-xs">
                    ⚠️
                </div>
            )}
        </button>
    );
};

export default CompactLeagueDisplay;