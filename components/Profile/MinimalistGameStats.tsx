// src/components/Profile/MinimalistGameStats.tsx - Updated with correct types from server architecture

"use client";

import React from "react";
import { Card, CardBody } from "@nextui-org/react";
import {
    Zap,
    Crosshair,
    Trophy,
    Activity,
    Clock,
    Target,
    Atom,
    BarChart3,
    RotateCw,
    Star,
    ArrowUp,
} from "lucide-react";
import type { SafeProfileData } from "@/lib/server/profileService";
import { formatSurvivalTime, formatPhysicsTime, formatRotationTime } from "@/utils/timeFormatter";
import { useT } from "@/contexts/LocalizationContext";
import leagueService from "@/lib/league_service";

interface MinimalistGameStatsProps {
    user: SafeProfileData;
}

const MinimalistGameStats: React.FC<MinimalistGameStatsProps> = ({ user }) => {
    const t = useT();

    // Calculate level progress
    const currentLevel = leagueService.calculateLevel(user.total_games);
    const gamesInCurrentLevel = user.total_games % leagueService.GAMES_PER_LEVEL;
    const gamesToNextLevel = leagueService.GAMES_PER_LEVEL - gamesInCurrentLevel;
    const levelProgressPercent = (gamesInCurrentLevel / leagueService.GAMES_PER_LEVEL) * 100;
    const isMaxLevel = currentLevel >= leagueService.MAX_LEVEL;

    const StatItem = ({
        icon: Icon,
        label,
        value
    }: {
        icon: React.ComponentType<any>;
        label: string;
        value: string | number;
    }) => (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center space-x-2">
                <Icon className="text-white/60" size={14} />
                <span className="text-white/80 text-xs">{label}</span>
            </div>
            <span className="text-white font-medium text-xs">{value}</span>
        </div>
    );

    const StatsSection = ({
        title,
        icon: Icon,
        children,
        emptyState,
        isLast = false
    }: {
        title: string;
        icon: React.ComponentType<any>;
        children: React.ReactNode;
        emptyState?: React.ReactNode;
        isLast?: boolean;
    }) => {
        const isEmpty = emptyState && React.isValidElement(emptyState);

        return (
            <div className={!isLast ? "border-b border-white/10 pb-4 mb-4" : ""}>
                <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10">
                        <Icon className="text-white/80" size={12} />
                    </div>
                    <h4 className="text-sm font-semibold text-white/90">{title}</h4>
                </div>

                {isEmpty ? (
                    <div className="ml-8">
                        <span className="text-white/50 text-xs">Нет данных</span>
                    </div>
                ) : (
                    <div className="ml-8 space-y-1">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 px-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <BarChart3 className="text-white/80" size={18} />
                <span>{t("profile.overallStats")}</span>
            </h3>

            <Card className="bg-black/40 border border-white/20">
                <CardBody className="p-5">
                    {/* Level Progress Section */}
                    <StatsSection
                        title={`${t("leagues.level")} ${currentLevel}`}
                        icon={Star}
                    >
                        <div className="space-y-3">
                            {/* Level Progress Info */}
                            <div className="flex justify-between items-center">
                                <span className="text-white/70 text-xs">
                                    {t("leagues.progressDisplay.gamesPlayed")}
                                </span>
                                <span className="text-white font-bold text-xs">
                                    {user.total_games}
                                </span>
                            </div>

                            {!isMaxLevel && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-xs">
                                            Games to level {currentLevel + 1}
                                        </span>
                                        <div className="flex items-center space-x-1">
                                            <ArrowUp className="text-white/60" size={10} />
                                            <span className="text-white font-bold text-xs">
                                                {gamesToNextLevel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Level Progress Bar */}
                                    <div className="w-full bg-white/20 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-white/60 transition-all duration-500"
                                            style={{ width: `${levelProgressPercent}%` }}
                                        />
                                    </div>
                                </>
                            )}

                            {isMaxLevel && (
                                <div className="text-center py-2">
                                    <Star className="text-yellow-400 mx-auto mb-1" size={16} />
                                    <span className="text-yellow-400 text-xs font-bold">
                                        {t("leagues.progressDisplay.maxLevel")}
                                    </span>
                                </div>
                            )}
                        </div>
                    </StatsSection>

                    {/* Overall Statistics Section */}
                    <StatsSection
                        title={t("profile.overallStats")}
                        icon={Activity}
                    >
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
                    </StatsSection>

                    {/* Reaction Mode Statistics Section */}
                    <StatsSection
                        title={t("profile.reactionMode")}
                        icon={Zap}
                        emptyState={
                            user.reaction_games === 0 ? (
                                <div className="flex items-center space-x-2">
                                    <Zap className="text-white/40" size={14} />
                                    <span className="text-white/50 text-xs">{t("profile.noReactionTestsYet")}</span>
                                </div>
                            ) : null
                        }
                    >
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
                    </StatsSection>

                    {/* Survival Mode Statistics Section */}
                    <StatsSection
                        title={t("profile.survivalMode")}
                        icon={Crosshair}
                        emptyState={
                            user.survival_games === 0 ? (
                                <div className="flex items-center space-x-2">
                                    <Crosshair className="text-white/40" size={14} />
                                    <span className="text-white/50 text-xs">{t("profile.noSurvivalAttemptsYet")}</span>
                                </div>
                            ) : null
                        }
                    >
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
                    </StatsSection>

                    {/* Physics Mode Statistics Section */}
                    <StatsSection
                        title={t("profile.physicsMode")}
                        icon={Atom}
                        emptyState={
                            user.physics_games === 0 ? (
                                <div className="flex items-center space-x-2">
                                    <Atom className="text-white/40" size={14} />
                                    <span className="text-white/50 text-xs">{t("profile.noPhysicsAttemptsYet")}</span>
                                </div>
                            ) : null
                        }
                    >
                        <StatItem
                            icon={Trophy}
                            label={t("profile.stats.bestScore")}
                            value={user.physics_best_score || 0}
                        />
                        <StatItem
                            icon={Clock}
                            label={t("profile.stats.bestTime")}
                            value={formatPhysicsTime(user.physics_best_time || 0)}
                        />
                        <StatItem
                            icon={Target}
                            label={t("profile.stats.bestSurvival")}
                            value={user.physics_best_hits || 0}
                        />
                        <StatItem
                            icon={Activity}
                            label={t("profile.stats.totalExperiments")}
                            value={user.physics_games}
                        />
                    </StatsSection>

                    {/* Rotation Mode Statistics Section */}
                    <StatsSection
                        title={t("profile.rotationMode")}
                        icon={RotateCw}
                        isLast={true}
                        emptyState={
                            user.rotation_games === 0 ? (
                                <div className="flex items-center space-x-2">
                                    <RotateCw className="text-white/40" size={14} />
                                    <span className="text-white/50 text-xs">{t("profile.noRotationAttemptsYet")}</span>
                                </div>
                            ) : null
                        }
                    >
                        <StatItem
                            icon={Clock}
                            label={t("profile.stats.bestTime")}
                            value={formatRotationTime(user.rotation_best_time || 0)}
                        />
                        <StatItem
                            icon={Trophy}
                            label={t("profile.stats.maxLevel")}
                            value={user.rotation_max_level || 0}
                        />
                        <StatItem
                            icon={Target}
                            label={t("profile.stats.bestStreak")}
                            value={user.rotation_best_streak || 0}
                        />
                        <StatItem
                            icon={Activity}
                            label={t("profile.stats.totalSpins")}
                            value={user.rotation_games}
                        />
                    </StatsSection>
                </CardBody>
            </Card>
        </div>
    );
};

export default MinimalistGameStats;