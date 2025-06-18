// src/components/Profile/GameStatistics.tsx - Game statistics display component

"use client";

import React from "react";
import { Card, CardBody } from "@nextui-org/react";
import {
    Zap,
    Crosshair,
    Clock,
    Target,
    TrendingUp,
    Trophy,
    Activity,
    Star
} from "lucide-react";
import type { User as UserType } from "@/lib/supabase";
import { formatSurvivalTime } from "@/game-modes/survival/SurvivalGameLogic";
import { useT } from "@/contexts/LocalizationContext";

interface GameStatisticsProps {
    user: UserType;
    rankings: {
        overall: number | null;
        reaction: number | null;
        survival: number | null;
    };
}

const GameStatistics: React.FC<GameStatisticsProps> = ({ user, rankings }) => {
    const t = useT();

    const StatCard = ({
        icon: Icon,
        label,
        value,
        subValue,
        className = "bg-white/5 border-white/20"
    }: {
        icon: React.ComponentType<any>;
        label: string;
        value: string | number;
        subValue?: string;
        className?: string;
    }) => (
        <Card className={`${className} border`}>
            <CardBody className="text-center p-4">
                <Icon className="text-white/80 mx-auto mb-2" size={20} />
                <div className="text-lg font-bold text-white">
                    {value}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                    {label}
                </div>
                {subValue && (
                    <div className="text-xs text-white/40 mt-1">
                        {subValue}
                    </div>
                )}
            </CardBody>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Overall Statistics */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Activity className="text-white/80" size={16} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                        Overall Statistics
                    </h3>
                    <div className="flex-1 h-px bg-white/20" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={Activity}
                        label="Total Games"
                        value={user.total_games}
                    />
                    <StatCard
                        icon={Trophy}
                        label="Best Score"
                        value={user.best_score}
                    />
                    <StatCard
                        icon={Star}
                        label="Current Attempts"
                        value={user.attempts_remaining}
                        className="bg-white/10 border-white/30"
                    />
                    <StatCard
                        icon={Target}
                        label="Overall Rank"
                        value={rankings.overall ? `#${rankings.overall}` : "Unranked"}
                    />
                </div>
            </div>

            {/* Reaction Mode Statistics */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Zap className="text-white" size={16} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {t("profile.stats.reactionModeStats")}
                    </h3>
                    <div className="flex-1 h-px bg-white/20" />
                </div>

                {user.reaction_games === 0 ? (
                    <Card className="bg-white/5 border border-white/20">
                        <CardBody className="text-center py-6">
                            <Zap className="text-white/60 mx-auto mb-3" size={24} />
                            <p className="text-white/60 text-sm">
                                {t("profile.stats.noReactionTests")}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                {t("profile.stats.testReflexes")}
                            </p>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={Clock}
                            label={t("profile.stats.bestTime")}
                            value={`${user.reaction_best_time || 0}ms`}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={Target}
                            label={t("profile.stats.bestScore")}
                            value={user.reaction_best_score || 0}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label={t("profile.stats.averageTime")}
                            value={`${user.reaction_average_time || 0}ms`}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={Trophy}
                            label={t("profile.stats.ranking")}
                            value={rankings.reaction ? `#${rankings.reaction}` : "Unranked"}
                            className="bg-white/10 border-white/30"
                        />
                        <div className="col-span-2">
                            <StatCard
                                icon={Activity}
                                label="Total Tests"
                                value={user.reaction_games}
                                className="bg-white/10 border-white/30"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Survival Mode Statistics */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Crosshair className="text-white" size={16} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {t("profile.stats.survivalModeStats")}
                    </h3>
                    <div className="flex-1 h-px bg-white/20" />
                </div>

                {user.survival_games === 0 ? (
                    <Card className="bg-white/5 border border-white/20">
                        <CardBody className="text-center py-6">
                            <Crosshair className="text-white/60 mx-auto mb-3" size={24} />
                            <p className="text-white/60 text-sm">
                                {t("profile.stats.noSurvivalAttempts")}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                {t("profile.stats.enterSurvival")}
                            </p>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={Clock}
                            label={t("profile.stats.bestTime")}
                            value={formatSurvivalTime(user.survival_best_time || 0)}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label={t("profile.stats.maxLevel")}
                            value={user.survival_max_level || 0}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={Target}
                            label={t("profile.stats.bestStreak")}
                            value={user.survival_best_streak || 0}
                            className="bg-white/10 border-white/30"
                        />
                        <StatCard
                            icon={Trophy}
                            label={t("profile.stats.ranking")}
                            value={rankings.survival ? `#${rankings.survival}` : "Unranked"}
                            className="bg-white/10 border-white/30"
                        />
                        <div className="col-span-2">
                            <StatCard
                                icon={Activity}
                                label="Total Attempts"
                                value={user.survival_games}
                                className="bg-white/10 border-white/30"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameStatistics;