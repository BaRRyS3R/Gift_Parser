// src/components/Profile/LeagueLevelDisplay.tsx - League and Level Display Component

"use client";

import React from "react";
import { Card, CardBody, Progress } from "@nextui-org/react";
import {
    Award,
    Medal,
    Trophy,
    Crown,
    TrendingUp,
    Target,
    Users,
    Star
} from "lucide-react";

import type { User, League } from "@/lib/supabase";
import {
    calculatePlayerLevel,
    calculateLeague,
    getLevelProgress,
    getGamesToNextLevel,
    getLeagueProgress,
    getLeagueColors,
    getLeagueIcon
} from "@/utils/leagueSystem";
import { useT } from "@/contexts/LocalizationContext";

interface LeagueLevelDisplayProps {
    user: User;
}

const LeagueLevelDisplay: React.FC<LeagueLevelDisplayProps> = ({ user }) => {
    const t = useT();

    const currentLevel = calculatePlayerLevel(user);
    const currentLeague = calculateLeague(user);
    const levelProgress = getLevelProgress(user);
    const gamesToNextLevel = getGamesToNextLevel(user);
    const leagueProgressInfo = getLeagueProgress(user);

    const leagueColors = getLeagueColors(currentLeague);

    const getLeagueIconComponent = (league: League) => {
        const iconProps = { size: 24, className: leagueColors.primary };

        switch (league) {
            case "Bronze":
                return <Award {...iconProps} />;
            case "Silver":
                return <Medal {...iconProps} />;
            case "Gold":
                return <Trophy {...iconProps} />;
            case "Diamond":
                return <Crown {...iconProps} />;
        }
    };

    const qualifyingGames = user.survival_games + user.physics_games + user.rotation_games;

    return (
        <div className="space-y-4 px-4">
            {/* League and Level Header */}
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white flex items-center justify-center space-x-2">
                    <Star className="text-white/80" size={18} />
                    <span>{t("profile.leagueAndLevel")}</span>
                </h3>
            </div>

            {/* Main League and Level Card */}
            <Card className={`${leagueColors.background} border ${leagueColors.border}`}>
                <CardBody className="p-5">
                    {/* League Display */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-lg ${leagueColors.background} border ${leagueColors.border} flex items-center justify-center`}>
                                {getLeagueIconComponent(currentLeague)}
                            </div>
                            <div>
                                <h4 className={`text-lg font-bold ${leagueColors.primary}`}>
                                    {currentLeague} League
                                </h4>
                                <p className="text-white/60 text-sm">
                                    {qualifyingGames} qualifying games
                                </p>
                            </div>
                        </div>

                        {/* Level Badge */}
                        <div className={`px-4 py-2 rounded-lg ${leagueColors.background} border ${leagueColors.border}`}>
                            <div className="text-center">
                                <div className={`text-2xl font-bold ${leagueColors.primary}`}>
                                    {currentLevel}
                                </div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    Level
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Level Progress */}
                    {currentLevel < 100 && (
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/80">Level Progress</span>
                                <span className="text-white/60">
                                    {gamesToNextLevel} games to level {currentLevel + 1}
                                </span>
                            </div>
                            <Progress
                                value={levelProgress * 100}
                                className="h-2"
                                classNames={{
                                    track: "bg-white/10",
                                    indicator: `bg-gradient-to-r ${leagueColors.gradient}`,
                                }}
                            />
                        </div>
                    )}

                    {/* League Progress */}
                    {leagueProgressInfo.nextLeague && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/80">League Progress</span>
                                <span className="text-white/60">
                                    {leagueProgressInfo.gamesNeeded} games to {leagueProgressInfo.nextLeague}
                                </span>
                            </div>
                            <Progress
                                value={leagueProgressInfo.progress * 100}
                                className="h-2"
                                classNames={{
                                    track: "bg-white/10",
                                    indicator: `bg-gradient-to-r ${leagueColors.gradient}`,
                                }}
                            />
                        </div>
                    )}

                    {/* Max Level Achievement */}
                    {currentLevel >= 100 && (
                        <div className="text-center py-2">
                            <div className="flex items-center justify-center space-x-2">
                                <Crown className="text-yellow-400" size={16} />
                                <span className="text-yellow-400 font-bold text-sm">MAX LEVEL REACHED!</span>
                                <Crown className="text-yellow-400" size={16} />
                            </div>
                        </div>
                    )}

                    {/* Diamond League Achievement */}
                    {currentLeague === "Diamond" && !leagueProgressInfo.nextLeague && (
                        <div className="text-center py-2">
                            <div className="flex items-center justify-center space-x-2">
                                <Crown className="text-cyan-400" size={16} />
                                <span className="text-cyan-400 font-bold text-sm">DIAMOND LEAGUE CHAMPION!</span>
                                <Crown className="text-cyan-400" size={16} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Statistics Breakdown */}
            <Card className="bg-black/40 border border-white/20">
                <CardBody className="p-4">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                        <TrendingUp className="text-white/80" size={14} />
                        <span>Qualifying Game Modes</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-red-400">
                                {user.survival_games}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">
                                Survival
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-purple-400">
                                {user.physics_games}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">
                                Physics
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-orange-400">
                                {user.rotation_games}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">
                                Rotation
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 text-center">
                        <div className="text-sm text-white/60">
                            Total Qualifying Games: <span className="font-bold text-white">{qualifyingGames}</span>
                        </div>
                        <div className="text-xs text-white/50 mt-1">
                            Reaction mode games do not count towards level progression
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default LeagueLevelDisplay;