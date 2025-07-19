// src/components/LeagueProgress/LeagueProgressDisplay.tsx - Updated to use leagues API

"use client";

import React, { useEffect } from "react";
import { Trophy, Star, ArrowUp, Target } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

interface LeagueProgressDisplayProps {
    className?: string;
    showLevelProgress?: boolean;
}

const LeagueProgressDisplay: React.FC<LeagueProgressDisplayProps> = ({
    className = "",
    showLevelProgress = false
}) => {
    const { user, telegramUser, leagues } = useUser();
    const t = useT();

    // Load league data when user is authenticated
    useEffect(() => {
        if (user && telegramUser && !leagues.leagueData && !leagues.isLoading) {
            console.log("Loading league data for progress display...");
            leagues.fetchLeagueData();
        }
    }, [user, telegramUser, leagues.leagueData, leagues.isLoading, leagues.fetchLeagueData]);

    if (leagues.isLoading) {
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

    if (!leagues.progressInfo) {
        return null;
    }

    // Get league color
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

    const leagueColor = getLeagueColor(leagues.progressInfo.currentLeague.name);
    const isMaxLeague = !leagues.progressInfo.nextLeague;

    // Calculate level progress using client-side utilities
    const currentLevel = leagues.progressInfo.currentLevel;
    const gamesInCurrentLevel = leagues.progressInfo.totalGames % leagues.leagueUtils.GAMES_PER_LEVEL;
    const gamesToNextLevel = leagues.leagueUtils.GAMES_PER_LEVEL - gamesInCurrentLevel;
    const levelProgressPercent = (gamesInCurrentLevel / leagues.leagueUtils.GAMES_PER_LEVEL) * 100;
    const isMaxLevel = currentLevel >= leagues.leagueUtils.MAX_LEVEL;

    return (
        <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 hover:bg-white/15 transition-all duration-300 ${className}`}>
            {/* Header with Level and League */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <Star className={`${leagueColor} animate-pulse-gentle`} size={16} />
                    <span className="text-white text-sm font-bold">
                        {t("leagues.level")} {leagues.progressInfo.currentLevel}
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    <Trophy className={leagueColor} size={14} />
                    <span className={`text-xs font-medium ${leagueColor}`}>
                        {t(`leagues.names.${leagues.progressInfo.currentLeague.name}` as any)}
                    </span>
                </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
                {/* Level Progress */}
                {showLevelProgress && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-1">
                                <Target className="text-white/60" size={10} />
                                <span className="text-white/60 text-xs">
                                    {t("leagues.level")} {currentLevel}
                                </span>
                            </div>

                            {!isMaxLevel && (
                                <div className="flex items-center space-x-1">
                                    <ArrowUp className="text-white/60" size={10} />
                                    <span className="text-white/60 text-xs">
                                        {gamesToNextLevel}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Level Progress Bar */}
                        <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                            <div
                                className="h-full transition-all duration-500 ease-out bg-white/60"
                                style={{
                                    width: `${isMaxLevel ? 100 : levelProgressPercent}%`
                                }}
                            />
                        </div>

                        {/* Level Progress Info */}
                        {!isMaxLevel && (
                            <div className="text-center">
                                <span className="text-white/50 text-xs">
                                    {gamesToNextLevel} to level {currentLevel + 1}
                                </span>
                            </div>
                        )}

                        {isMaxLevel && (
                            <div className="text-center">
                                <span className="text-white/50 text-xs">
                                    {t("leagues.progressDisplay.maxLevel")}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* League Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-white/60 text-xs">
                            {leagues.progressInfo.totalGames} {t("leagues.progressDisplay.gamesPlayed")}
                        </span>

                        {!isMaxLeague && (
                            <div className="flex items-center space-x-1">
                                <ArrowUp className="text-white/60" size={10} />
                                <span className="text-white/60 text-xs">
                                    {leagues.progressInfo.gamesToNextLeague}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* League Progress Bar */}
                    <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ease-out ${leagueColor.replace('text-', 'bg-')}`}
                            style={{
                                width: `${isMaxLeague ? 100 : leagues.progressInfo.progressPercent}%`
                            }}
                        />
                    </div>

                    {/* Next League Info */}
                    {!isMaxLeague && leagues.progressInfo.nextLeague && (
                        <div className="text-center">
                            <span className="text-white/50 text-xs">
                                {leagues.progressInfo.gamesToNextLeague} to {t(`leagues.names.${leagues.progressInfo.nextLeague.name}` as any)}
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
        </div>
    );
};

export default LeagueProgressDisplay;