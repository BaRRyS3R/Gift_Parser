// src/components/LeagueProgress/LeagueProgressDisplay.tsx - Лаконичный компонент прогресса для главной страницы

"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Star, ArrowUp } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import leagueService, { type LeagueProgressInfo } from "@/lib/league_service";

interface LeagueProgressDisplayProps {
    className?: string;
}

const LeagueProgressDisplay: React.FC<LeagueProgressDisplayProps> = ({
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
            <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 ${className}`}>
                <div className="animate-pulse">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-5 h-5 bg-white/20 rounded" />
                        <div className="w-20 h-4 bg-white/20 rounded" />
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded" />
                </div>
            </div>
        );
    }

    if (!progressInfo) {
        return null;
    }

    // Определяем цвет лиги
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

    const leagueColor = getLeagueColor(progressInfo.currentLeague.name);
    const isMaxLeague = !progressInfo.nextLeague;

    return (
        <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 hover:bg-white/15 transition-all duration-300 ${className}`}>
            {/* Header with Level and League */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <Star className={`${leagueColor} animate-pulse-gentle`} size={16} />
                    <span className="text-white text-sm font-bold">
                        {t("leagues.level")} {progressInfo.currentLevel}
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    <Trophy className={leagueColor} size={14} />
                    <span className={`text-xs font-medium ${leagueColor}`}>
                        {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-white/60 text-xs">
                        {progressInfo.totalGames} {t("leagues.progressDisplay.gamesPlayed")}
                    </span>

                    {!isMaxLeague && (
                        <div className="flex items-center space-x-1">
                            <ArrowUp className="text-white/60" size={10} />
                            <span className="text-white/60 text-xs">
                                {progressInfo.gamesToNextLeague}
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar Visual */}
                <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${leagueColor.replace('text-', 'bg-')}`}
                        style={{
                            width: `${isMaxLeague ? 100 : progressInfo.progressPercent}%`
                        }}
                    />
                </div>

                {/* Next League Info */}
                {!isMaxLeague && progressInfo.nextLeague && (
                    <div className="text-center">
                        <span className="text-white/50 text-xs">
                            {progressInfo.gamesToNextLeague} to {t(`leagues.names.${progressInfo.nextLeague.name}` as any)}
                        </span>
                    </div>
                )}

                {/* Max League Indicator */}
                {isMaxLeague && (
                    <div className="text-center">
                        <span className={`text-xs font-medium ${leagueColor}`}>
                            {t("leagues.progressDisplay.inTopLeague")}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeagueProgressDisplay;