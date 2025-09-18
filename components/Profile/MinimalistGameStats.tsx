// src/components/Profile/MinimalistGameStats.tsx - Updated with removed Card component and integrated into page background

"use client";

import type { UserProfileGameStats } from "@/hooks/modules/useProfile";

import React from "react";
import {
  Zap,
  Crosshair,
  Trophy,
  Activity,
  Clock,
  Atom,
  BarChart3,
  RotateCw,
  TrendingUp,
} from "lucide-react";

import {
  formatSurvivalTime,
  formatPhysicsTime,
  formatRotationTime,
} from "@/utils/timeFormatter";
import { useT } from "@/contexts/LocalizationContext";

interface MinimalistGameStatsProps {
  user: UserProfileGameStats | null;
  isLoading?: boolean;
}

const MinimalistGameStats: React.FC<MinimalistGameStatsProps> = ({
  user,
  isLoading = false,
}) => {
  const t = useT();

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="space-y-6 px-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <BarChart3 className="text-white/80" size={18} />
          <span>{t("profile.stats.title")}</span>
        </h3>

        <div className="p-5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-white/10 animate-pulse" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-32" />
              </div>
              <div className="ml-8 space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const StatItem = ({
    icon: Icon,
    label,
    value,
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
    gamesPlayed,
    isLast = false,
  }: {
    title: string;
    icon: React.ComponentType<any>;
    children: React.ReactNode;
    gamesPlayed: number;
    isLast?: boolean;
  }) => {
    const hasData = gamesPlayed > 0;

    return (
      <div className={!isLast ? "border-b border-white/10 pb-4 mb-4" : ""}>
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10 shadow-sm">
            <Icon className="text-white/80" size={12} />
          </div>
          <h4 className="text-sm font-semibold text-white/90">{title}</h4>
        </div>

        {!hasData ? (
          <div className="ml-8">
            <span className="text-white/50 text-xs">
              {t("profile.noDataYet")}
            </span>
          </div>
        ) : (
          <div className="ml-8 space-y-1">{children}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 px-4">
      <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
        <BarChart3 className="text-white/80" size={18} />
        <span>{t("profile.stats.title")}</span>
      </h3>

      {/* Statistics content integrated into page background */}
      <div className="p-5 space-y-4">
        {/* Overall Statistics Section */}
        <StatsSection
          gamesPlayed={user.total_games}
          icon={Activity}
          title={t("profile.overallStats")}
        >
          <StatItem
            icon={Activity}
            label={t("profile.totalGames")}
            value={user.total_games}
          />
        </StatsSection>

        {/* Reaction Mode Statistics Section */}
        <StatsSection
          gamesPlayed={user.reaction_games}
          icon={Zap}
          title={t("profile.reactionMode")}
        >
          <StatItem
            icon={Activity}
            label={t("profile.totalGames")}
            value={user.reaction_games}
          />
          <StatItem
            icon={Clock}
            label={t("profile.stats.bestTime")}
            value={
              user.reaction_best_time > 0
                ? `${user.reaction_best_time}ms`
                : "-"
            }
          />
          <StatItem
            icon={Trophy}
            label={t("profile.stats.bestScore")}
            value={user.reaction_best_score || 0}
          />
        </StatsSection>

        {/* Survival Mode Statistics Section */}
        <StatsSection
          gamesPlayed={user.survival_games}
          icon={Crosshair}
          title={t("profile.survivalMode")}
        >
          <StatItem
            icon={Activity}
            label={t("profile.totalGames")}
            value={user.survival_games}
          />
          <StatItem
            icon={Clock}
            label={t("profile.stats.bestTime")}
            value={formatSurvivalTime(user.survival_best_time || 0)}
          />
          <StatItem
            icon={Trophy}
            label={t("profile.stats.bestScore")}
            value={user.survival_best_score || 0}
          />
          <StatItem
            icon={TrendingUp}
            label={t("profile.stats.maxLevel")}
            value={user.survival_max_level || 0}
          />
        </StatsSection>

        {/* Physics Mode Statistics Section */}
        <StatsSection
          gamesPlayed={user.physics_games}
          icon={Atom}
          title={t("profile.physicsMode")}
        >
          <StatItem
            icon={Activity}
            label={t("profile.totalGames")}
            value={user.physics_games}
          />
          <StatItem
            icon={Clock}
            label={t("profile.stats.bestTime")}
            value={formatPhysicsTime(user.physics_best_time || 0)}
          />
          <StatItem
            icon={Trophy}
            label={t("profile.stats.bestScore")}
            value={user.physics_best_score || 0}
          />
          <StatItem
            icon={TrendingUp}
            label={t("profile.stats.maxLevel")}
            value={user.physics_best_hits || 0}
          />
        </StatsSection>

        {/* Rotation Mode Statistics Section */}
        <StatsSection
          gamesPlayed={user.rotation_games}
          icon={RotateCw}
          isLast={true}
          title={t("profile.rotationMode")}
        >
          <StatItem
            icon={Activity}
            label={t("profile.totalGames")}
            value={user.rotation_games}
          />
          <StatItem
            icon={Clock}
            label={t("profile.stats.bestTime")}
            value={formatRotationTime(user.rotation_best_time || 0)}
          />
          <StatItem
            icon={Trophy}
            label={t("profile.stats.bestScore")}
            value={user.rotation_best_score || 0}
          />
          <StatItem
            icon={TrendingUp}
            label={t("profile.stats.maxLevel")}
            value={user.rotation_max_level || 0}
          />
        </StatsSection>
      </div>
    </div>
  );
};

export default MinimalistGameStats;