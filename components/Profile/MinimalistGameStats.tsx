// src/components/Profile/MinimalistGameStats.tsx - Clean game statistics display with full localization

"use client";

import React from "react";
import { Card, CardBody } from "@nextui-org/react";
import { Zap, Crosshair, Trophy, Activity, Clock, Target } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";
import { formatSurvivalTime } from "@/game-modes/survival/SurvivalGameLogic";
import { useT } from "@/contexts/LocalizationContext";

interface MinimalistGameStatsProps {
    user: UserType;
}

const MinimalistGameStats: React.FC<MinimalistGameStatsProps> = ({ user }) => {
    const t = useT();

    const StatItem = ({
        icon: Icon,
        label,
        value
    }: {
        icon: React.ComponentType<any>;
        label: string;
        value: string | number;
    }) => (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
                <Icon className="text-white/60" size={16} />
                <span className="text-white/80 text-sm">{label}</span>
            </div>
            <span className="text-white font-medium text-sm">{value}</span>
        </div>
    );

    return (
        <div className="space-y-6 px-4">
            {/* Overall Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.overallStats")}</h3>
                <Card className="bg-white/5 border border-white/20">
                    <CardBody className="p-4 space-y-3">
                        <StatItem
                            icon={Activity}
                            label={t("profile.totalGames")}
                            value={user.total_games}
                        />
                        <StatItem
                            icon={Trophy}
                            label={t("profile.stats.bestScore")}
                            value={user.best_score}
                        />
                    </CardBody>
                </Card>
            </div>

            {/* Reaction Mode Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.reactionMode")}</h3>
                <Card className="bg-white/5 border border-white/20">
                    <CardBody className="p-4">
                        {user.reaction_games === 0 ? (
                            <div className="text-center py-4">
                                <Zap className="text-white/40 mx-auto mb-2" size={24} />
                                <p className="text-white/60 text-sm">{t("profile.noReactionTestsYet")}</p>
                                <p className="text-white/40 text-xs mt-1">{t("profile.testReflexesToSeeStats")}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <StatItem
                                    icon={Clock}
                                    label={t("profile.stats.bestTime")}
                                    value={`${user.reaction_best_time || 0}ms`}
                                />
                                <StatItem
                                    icon={Trophy}
                                    label={t("profile.stats.bestScore")}
                                    value={user.reaction_best_score || 0}
                                />
                                <StatItem
                                    icon={Target}
                                    label={t("profile.stats.averageTime")}
                                    value={`${user.reaction_average_time || 0}ms`}
                                />
                                <StatItem
                                    icon={Activity}
                                    label={t("profile.totalTests")}
                                    value={user.reaction_games}
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Survival Mode Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.survivalMode")}</h3>
                <Card className="bg-white/5 border border-white/20">
                    <CardBody className="p-4">
                        {user.survival_games === 0 ? (
                            <div className="text-center py-4">
                                <Crosshair className="text-white/40 mx-auto mb-2" size={24} />
                                <p className="text-white/60 text-sm">{t("profile.noSurvivalAttemptsYet")}</p>
                                <p className="text-white/40 text-xs mt-1">{t("profile.enterSurvivalToSeeStats")}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <StatItem
                                    icon={Clock}
                                    label={t("profile.stats.bestTime")}
                                    value={formatSurvivalTime(user.survival_best_time || 0)}
                                />
                                <StatItem
                                    icon={Trophy}
                                    label={t("profile.stats.maxLevel")}
                                    value={user.survival_max_level || 0}
                                />
                                <StatItem
                                    icon={Target}
                                    label={t("profile.stats.bestStreak")}
                                    value={user.survival_best_streak || 0}
                                />
                                <StatItem
                                    icon={Activity}
                                    label={t("profile.totalAttempts")}
                                    value={user.survival_games}
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default MinimalistGameStats;