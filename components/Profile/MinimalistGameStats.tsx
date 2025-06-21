// src/components/Profile/MinimalistGameStats.tsx - Unified statistics component with internal sections

"use client";

import React, { useState } from "react";
import { Card, CardBody } from "@nextui-org/react";
import {
    Zap,
    Crosshair,
    Trophy,
    Activity,
    Clock,
    Target,
    ChevronDown,
    ChevronUp,
    Atom,
    BarChart3
} from "lucide-react";
import type { User as UserType } from "@/lib/supabase";
import { formatSurvivalTime, formatPhysicsTime } from "@/utils/timeFormatter";
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
        value,
        iconColor = "text-white/60"
    }: {
        icon: React.ComponentType<any>;
        label: string;
        value: string | number;
        iconColor?: string;
    }) => (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
                <Icon className={iconColor} size={16} />
                <span className="text-white/80 text-sm">{label}</span>
            </div>
            <span className="text-white font-medium text-sm">{value}</span>
        </div>
    );

    const StatsSection = ({
        id,
        title,
        icon: Icon,
        iconColor,
        children,
        emptyState,
        isLast = false
    }: {
        id: string;
        title: string;
        icon: React.ComponentType<any>;
        iconColor: string;
        children: React.ReactNode;
        emptyState?: React.ReactNode;
        isLast?: boolean;
    }) => {
        const isExpanded = expandedSections.includes(id);
        const isEmpty = emptyState && React.isValidElement(emptyState);

        return (
            <div className={!isLast ? "border-b border-white/10 pb-6 mb-6" : ""}>
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between mb-4 hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/20">
                            <Icon className={iconColor} size={16} />
                        </div>
                        <h4 className="text-base font-semibold text-white">{title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                        {!isExpanded && !isEmpty && (
                            <span className="text-white/40 text-xs">Нажмите для просмотра</span>
                        )}
                        {!isExpanded && isEmpty && (
                            <span className="text-white/40 text-xs">Нет данных</span>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="text-white/60" size={16} />
                        ) : (
                            <ChevronDown className="text-white/60" size={16} />
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="animate-fade-in ml-11">
                        {isEmpty ? emptyState : children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 px-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <BarChart3 className="text-white/80" size={20} />
                <span>Игровая статистика</span>
            </h3>

            <Card className="bg-white/5 border border-white/20">
                <CardBody className="p-6">
                    {/* Overall Statistics Section */}
                    <StatsSection
                        id="overall"
                        title={t("profile.overallStats")}
                        icon={Activity}
                        iconColor="text-white"
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
                    </StatsSection>

                    {/* Reaction Mode Statistics Section */}
                    <StatsSection
                        id="reaction"
                        title={t("profile.reactionMode")}
                        icon={Zap}
                        iconColor="text-white"
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
                                value={`${user.reaction_best_time || 0}`}
                                iconColor="text-white/60"
                            />
                            <StatItem
                                icon={Trophy}
                                label={t("profile.stats.bestScore")}
                                value={user.reaction_best_score || 0}
                                iconColor="text-white/60"
                            />
                            <StatItem
                                icon={Target}
                                label={t("profile.stats.averageTime")}
                                value={`${user.reaction_average_time || 0}`}
                                iconColor="text-white/60"
                            />
                            <StatItem
                                icon={Activity}
                                label={t("profile.totalTests")}
                                value={user.reaction_games}
                                iconColor="text-white/60"
                            />
                        </div>
                    </StatsSection>

                    {/* Survival Mode Statistics Section */}
                    <StatsSection
                        id="survival"
                        title={t("profile.survivalMode")}
                        icon={Crosshair}
                        iconColor="text-red-400"
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
                                iconColor="text-red-400/60"
                            />
                            <StatItem
                                icon={Trophy}
                                label={t("profile.stats.maxLevel")}
                                value={user.survival_max_level || 0}
                                iconColor="text-red-400/60"
                            />
                            <StatItem
                                icon={Target}
                                label={t("profile.stats.bestStreak")}
                                value={user.survival_best_streak || 0}
                                iconColor="text-red-400/60"
                            />
                            <StatItem
                                icon={Activity}
                                label={t("profile.totalAttempts")}
                                value={user.survival_games}
                                iconColor="text-red-400/60"
                            />
                        </div>
                    </StatsSection>

                    {/* Physics Mode Statistics Section */}
                    <StatsSection
                        id="physics"
                        title={t("profile.physicsMode")}
                        icon={Atom}
                        iconColor="text-purple-400"
                        isLast={true}
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
                                iconColor="text-purple-400/60"
                            />
                            <StatItem
                                icon={Clock}
                                label={t("profile.stats.bestTime")}
                                value={formatPhysicsTime(user.physics_best_time || 0)}
                                iconColor="text-purple-400/60"
                            />
                            <StatItem
                                icon={Target}
                                label={t("profile.stats.bestSurvival")}
                                value={user.physics_best_hits || 0}
                                iconColor="text-purple-400/60"
                            />
                            <StatItem
                                icon={Activity}
                                label={t("profile.stats.totalExperiments")}
                                value={user.physics_games}
                                iconColor="text-purple-400/60"
                            />
                        </div>
                    </StatsSection>
                </CardBody>
            </Card>
        </div>
    );
};

export default MinimalistGameStats;