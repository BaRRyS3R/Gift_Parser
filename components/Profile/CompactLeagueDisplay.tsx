// src/components/Profile/CompactLeagueDisplay.tsx - Compact League and Level Display

"use client";

import React from "react";
import { Card, CardBody, Progress } from "@nextui-org/react";
import {
    Award,
    Medal,
    Trophy,
    Crown,
    TrendingUp,
    Target
} from "lucide-react";

import type { User, League } from "@/lib/supabase";
import {
    calculatePlayerLevel,
    calculateLeague,
    getLevelProgress,
    getGamesToNextLevel,
    getLeagueProgress,
    getLeagueColors
} from "@/utils/leagueSystem";
import { useT } from "@/contexts/LocalizationContext";

interface CompactLeagueDisplayProps {
    user: User;
}

const CompactLeagueDisplay: React.FC<CompactLeagueDisplayProps> = ({ user }) => {
    const t = useT();

    const currentLevel = calculatePlayerLevel(user);
    const currentLeague = calculateLeague(user);
    const levelProgress = getLevelProgress(user);
    const gamesToNextLevel = getGamesToNextLevel(user);
    const leagueProgressInfo = getLeagueProgress(user);

    const leagueColors = getLeagueColors(currentLeague);

    const getLeagueIconComponent = (league: League) => {
        const iconProps = { size: 20, className: leagueColors.primary };

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
        <Card className={`${leagueColors.background} border ${leagueColors.border}`}>
            <CardBody className="p-4">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-lg ${leagueColors.background} border ${leagueColors.border} flex items-center justify-center`}>
                            {getLeagueIconComponent(currentLeague)}
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${leagueColors.primary}`}>
                                {t(`profile.leagues.${currentLeague}`)}
                            </h4>
                            <p className="text-white/60 text-xs">
                                {qualifyingGames} {t("profile.qualifyingGames")}
                            </p>
                        </div>
                    </div>

                    <div className={`px-3 py-1 rounded-lg ${leagueColors.background} border ${leagueColors.border}`}>
                        <div className="text-center">
                            <div className={`text-lg font-bold ${leagueColors.primary}`}>
                                {currentLevel}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">
                                {t("profile.level")}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-3">
                    {/* Level Progress */}
                    {currentLevel < 100 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/80">{t("profile.levelProgress")}</span>
                                <span className="text-white/60">
                                    {gamesToNextLevel} {t("profile.gamesToNextLevel")}
                                </span>
                            </div>
                            <Progress
                                value={levelProgress * 100}
                                className="h-1.5"
                                classNames={{
                                    track: "bg-white/10",
                                    indicator: `bg-gradient-to-r ${leagueColors.gradient}`,
                                }}
                            />
                        </div>
                    )}

                    {/* League Progress */}
                    {leagueProgressInfo.nextLeague && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/80">{t("profile.leagueProgress")}</span>
                                <span className="text-white/60">
                                    {leagueProgressInfo.gamesNeeded} {t("profile.gamesToNextLeague")}
                                </span>
                            </div>
                            <Progress
                                value={leagueProgressInfo.progress * 100}
                                className="h-1.5"
                                classNames={{
                                    track: "bg-white/10",
                                    indicator: `bg-gradient-to-r ${leagueColors.gradient}`,
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Achievement Badges */}
                <div className="mt-3 flex justify-center space-x-4">
                    {currentLevel >= 100 && (
                        <div className="flex items-center space-x-1 text-yellow-400 text-xs">
                            <Crown size={12} />
                            <span className="font-bold">{t("profile.maxLevelReached")}</span>
                        </div>
                    )}

                    {currentLeague === "Diamond" && !leagueProgressInfo.nextLeague && (
                        <div className="flex items-center space-x-1 text-cyan-400 text-xs">
                            <Crown size={12} />
                            <span className="font-bold">{t("profile.diamondChampion")}</span>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default CompactLeagueDisplay;