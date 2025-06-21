// src/components/Profile/MinimalistGameStats.tsx - Expandable statistics with physics mode

"use client";

import React, { useState } from "react";
import { Card, CardBody } from "@nextui-org/react";
import { Zap, Crosshair, Trophy, Activity, Clock, Target, ChevronDown, ChevronUp, Atom } from "lucide-react";
import type { User as UserType } from "@/lib/supabase";
import { formatSurvivalTime } from "@/game-modes/survival/SurvivalGameLogic";
import { useT } from "@/contexts/LocalizationContext";

interface MinimalistGameStatsProps {
    user: UserType;
}

const MinimalistGameStats: React.FC<MinimalistGameStatsProps> = ({ user }) => {
    const t = useT();
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

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

    const ExpandableStatsCard = ({
        id,
        title,
        icon: Icon,
        iconColor,
        bgColor,
        borderColor,
        children,
        emptyState
    }: {
        id: string;
        title: string;
        icon: React.ComponentType<any>;
        iconColor: string;
        bgColor: string;
        borderColor: string;
        children: React.ReactNode;
        emptyState?: React.ReactNode;
    }) => {
        const isExpanded = expandedSections.includes(id);
        const isEmpty = emptyState && React.isValidElement(emptyState);

        return (
            <Card className={`${bgColor} border ${borderColor} transition-all duration-300 ${isExpanded ? 'ring-1 ring-white/20' : ''}`}>
                <CardBody className="p-4">
                    <button
                        onClick={() => toggleSection(id)}
                        className="w-full flex items-center justify-between mb-3 hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor} border ${borderColor}`}>
                                <Icon className={iconColor} size={16} />
                            </div>
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>
                        {isExpanded ? (
                            <ChevronUp className="text-white/60" size={16} />
                        ) : (
                            <ChevronDown className="text-white/60" size={16} />
                        )}
                    </button>

                    {isExpanded && (
                        <div className="animate-fade-in">
                            {isEmpty ? emptyState : children}
                        </div>
                    )}

                    {!isExpanded && !isEmpty && (
                        <div className="text-center py-2">
                            <span className="text-white/40 text-xs">Нажмите для просмотра статистики</span>
                        </div>
                    )}

                    {!isExpanded && isEmpty && (
                        <div className="text-center py-2">
                            <span className="text-white/40 text-xs">Нет данных</span>
                        </div>
                    )}
                </CardBody>
            </Card>
        );
    };

    return (
        <div className="space-y-6 px-4">
            {/* Overall Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.overallStats")}</h3>
                <ExpandableStatsCard
                    id="overall"
                    title="Общая статистика"
                    icon={Activity}
                    iconColor="text-white"
                    bgColor="bg-white/5"
                    borderColor="border-white/20"
                >
                    <div className="space-y-3">
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
                    </div>
                </ExpandableStatsCard>
            </div>

            {/* Reaction Mode Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.reactionMode")}</h3>
                <ExpandableStatsCard
                    id="reaction"
                    title="Статистика реакции"
                    icon={Zap}
                    iconColor="text-white"
                    bgColor="bg-white/5"
                    borderColor="border-white/20"
                    emptyState={
                        user.reaction_games === 0 ? (
                            <div className="text-center py-4">
                                <Zap className="text-white/40 mx-auto mb-2" size={24} />
                                <p className="text-white/60 text-sm">{t("profile.noReactionTestsYet")}</p>
                                <p className="text-white/40 text-xs mt-1">{t("profile.testReflexesToSeeStats")}</p>
                            </div>
                        ) : null
                    }
                >
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
                </ExpandableStatsCard>
            </div>

            {/* Survival Mode Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.survivalMode")}</h3>
                <ExpandableStatsCard
                    id="survival"
                    title="Статистика выживания"
                    icon={Crosshair}
                    iconColor="text-red-400"
                    bgColor="bg-red-500/5"
                    borderColor="border-red-400/20"
                    emptyState={
                        user.survival_games === 0 ? (
                            <div className="text-center py-4">
                                <Crosshair className="text-red-400/40 mx-auto mb-2" size={24} />
                                <p className="text-red-400/60 text-sm">{t("profile.noSurvivalAttemptsYet")}</p>
                                <p className="text-red-400/40 text-xs mt-1">{t("profile.enterSurvivalToSeeStats")}</p>
                            </div>
                        ) : null
                    }
                >
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
                </ExpandableStatsCard>
            </div>

            {/* Physics Mode Statistics */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("profile.physicsMode")}</h3>
                <ExpandableStatsCard
                    id="physics"
                    title="Статистика физики"
                    icon={Atom}
                    iconColor="text-purple-400"
                    bgColor="bg-purple-500/5"
                    borderColor="border-purple-400/20"
                    emptyState={
                        user.physics_games === 0 ? (
                            <div className="text-center py-4">
                                <Atom className="text-purple-400/40 mx-auto mb-2" size={24} />
                                <p className="text-purple-400/60 text-sm">{t("profile.noPhysicsAttemptsYet")}</p>
                                <p className="text-purple-400/40 text-xs mt-1">{t("profile.enterPhysicsToSeeStats")}</p>
                            </div>
                        ) : null
                    }
                >
                    <div className="space-y-3">
                        <StatItem
                            icon={Trophy}
                            label={t("profile.stats.bestScore")}
                            value={user.physics_best_score || 0}
                        />
                        <StatItem
                            icon={Clock}
                            label={t("profile.stats.bestTime")}
                            value={`${user.physics_best_time || 0}s`}
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
                    </div>
                </ExpandableStatsCard>
            </div>
        </div>
    );
};

export default MinimalistGameStats;