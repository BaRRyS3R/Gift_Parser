// src/app/leaderboard/page.tsx - Обновленная страница лидерборда с исправлениями

"use client";

import type {
  SafeReactionLeaderboard,
  SafeSurvivalLeaderboard,
  SafePhysicsLeaderboard,
  SafeRotationLeaderboard,
} from "@/hooks/modules/useLeaderboard";

import { useState, useEffect } from "react";
import {
  Crown,
  Medal,
  Award,
  Star,
  TrendingUp,
  Users,
  Zap,
  Target,
  Activity,
  Clock,
  Crosshair,
  Atom,
  RotateCw,
  Eye,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useLeaderboard } from "@/hooks/modules/useLeaderboard";
import {
  formatSurvivalTime,
  formatPhysicsTime,
  formatRotationTime,
} from "@/utils/timeFormatter";
import { getReactionRatingColor } from "@/game-modes/reaction/ReactionGameLogic";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";

type LeaderboardType = "reaction" | "survival" | "physics" | "rotation";

function LeaderboardPageContent() {
  const { makeAuthenticatedRequest } = useUser();
  const {
    leaderboardData,
    isLoading,
    error,
    fetchLeaderboards,
    clearError,
    isUserInTopLeaderboard,
    getUserPosition,
  } = useLeaderboard(makeAuthenticatedRequest);

  const t = useT();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("reaction");

  // Load leaderboards on mount
  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="text-yellow-400" size={18} />;
      case 2:
        return <Medal className="text-gray-300" size={18} />;
      case 3:
        return <Award className="text-amber-600" size={18} />;
      default:
        return (
          <span className="text-white/60 text-sm font-bold">#{position}</span>
        );
    }
  };

  const getTabColors = (tab: LeaderboardType, isActive: boolean) => {
    const colors = {
      reaction: {
        active: "bg-white/20 text-white border border-white/30",
        inactive: "text-white/60 hover:text-white/80",
      },
      survival: {
        active: "bg-red-500/20 text-red-300 border border-red-400/30",
        inactive: "text-red-400/60 hover:text-red-400/80",
      },
      physics: {
        active: "bg-purple-500/20 text-purple-300 border border-purple-400/30",
        inactive: "text-purple-400/60 hover:text-purple-400/80",
      },
      rotation: {
        active: "bg-orange-500/20 text-orange-300 border border-orange-400/30",
        inactive: "text-orange-400/60 hover:text-orange-400/80",
      },
    };

    return isActive ? colors[tab].active : colors[tab].inactive;
  };

  const renderReactionLeaderboardEntry = (entry: SafeReactionLeaderboard) => {
    const getRatingFromTime = (time: number): string => {
      if (time <= 100) return "LIGHTNING";
      if (time <= 200) return "EXCELLENT";
      if (time <= 300) return "GOOD";
      if (time <= 500) return "AVERAGE";

      return "SLOW";
    };

    const rating = getRatingFromTime(entry.best_reaction_time);

    return (
      <div
        key={`reaction-${entry.position}`}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${entry.isCurrentUser ? "ring-1 ring-white/60 bg-white/25" : ""}
          rounded-lg
        `}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Zap className="text-white" size={120} />
          </div>
        </div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-8">
                  {entry.position <= 3 ? (
                    getRankIcon(entry.position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{entry.position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded border border-white/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">
                      @{entry.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`text-xs font-bold ${getReactionRatingColor(rating as any)}`}
                  >
                    {rating}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-white/80">
                    <Activity size={10} />
                    <span>{entry.reaction_games}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {entry.best_reaction_time}ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSurvivalLeaderboardEntry = (entry: SafeSurvivalLeaderboard) => {
    return (
      <div
        key={`survival-${entry.position}`}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${entry.isCurrentUser ? "ring-1 ring-red-400/60 bg-red-500/25" : ""}
          rounded-lg
        `}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Crosshair className="text-red-400" size={120} />
          </div>
        </div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-8">
                  {entry.position <= 3 ? (
                    getRankIcon(entry.position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{entry.position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-red-500/30 text-red-200 px-2 py-0.5 rounded border border-red-400/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">
                      @{entry.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white/80">
                  <div className="flex items-center space-x-1">
                    <TrendingUp size={10} />
                    <span>L{entry.max_level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.best_streak}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.survival_games}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatSurvivalTime(entry.best_survival_time)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPhysicsLeaderboardEntry = (entry: SafePhysicsLeaderboard) => {
    return (
      <div
        key={`physics-${entry.position}`}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${entry.isCurrentUser ? "ring-1 ring-purple-400/60 bg-purple-500/25" : ""}
          rounded-lg
        `}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Atom className="text-purple-400" size={120} />
          </div>
        </div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-8">
                  {entry.position <= 3 ? (
                    getRankIcon(entry.position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{entry.position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded border border-purple-400/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">
                      @{entry.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white/80">
                  <div className="flex items-center space-x-1">
                    <Clock size={10} />
                    <span>{formatPhysicsTime(entry.best_physics_time)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.best_hits}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.physics_games}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {entry.best_physics_score}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRotationLeaderboardEntry = (entry: SafeRotationLeaderboard) => {
    return (
      <div
        key={`rotation-${entry.position}`}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${entry.isCurrentUser ? "ring-1 ring-orange-400/60 bg-orange-500/25" : ""}
          rounded-lg
        `}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <RotateCw className="text-orange-400" size={120} />
          </div>
        </div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-8">
                  {entry.position <= 3 ? (
                    getRankIcon(entry.position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{entry.position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-orange-500/30 text-orange-200 px-2 py-0.5 rounded border border-orange-400/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">
                      @{entry.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white/80">
                  <div className="flex items-center space-x-1">
                    <TrendingUp size={10} />
                    <span>L{entry.max_level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.best_streak}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.rotation_games}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatRotationTime(entry.best_rotation_time)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = async () => {
    clearError();
    await fetchLeaderboards();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("leaderboard.loadingRanking")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <TrendingUp className="text-white/60 mx-auto" size={32} />
          <p className="text-white/80">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const getCurrentLeaderboard = () => {
    if (!leaderboardData) return [];

    switch (activeTab) {
      case "reaction":
        return leaderboardData.reaction;
      case "survival":
        return leaderboardData.survival;
      case "physics":
        return leaderboardData.physics;
      case "rotation":
        return leaderboardData.rotation;
    }
  };

  const currentLeaderboard = getCurrentLeaderboard();
  const userPosition = getUserPosition(activeTab);
  const isUserInTop = isUserInTopLeaderboard(activeTab);

  const getEmptyStateMessage = () => {
    const isReactionTab = activeTab === "reaction";
    const isSurvivalTab = activeTab === "survival";
    const isPhysicsTab = activeTab === "physics";

    if (isReactionTab) {
      return {
        icon: <Zap className="text-white/60 mx-auto mb-3" size={32} />,
        title: t("leaderboard.noSpeedDemons"),
        subtitle: t("leaderboard.testReflexes"),
      };
    } else if (isSurvivalTab) {
      return {
        icon: <Crosshair className="text-red-400/60 mx-auto mb-3" size={32} />,
        title: t("leaderboard.noSurvivors"),
        subtitle: t("leaderboard.enterChallenge"),
      };
    } else if (isPhysicsTab) {
      return {
        icon: <Atom className="text-purple-400/60 mx-auto mb-3" size={32} />,
        title: t("leaderboard.noPhysicists"),
        subtitle: t("leaderboard.tryPhysics"),
      };
    } else {
      return {
        icon: (
          <RotateCw className="text-orange-400/60 mx-auto mb-3" size={32} />
        ),
        title: t("leaderboard.noSpinners"),
        subtitle: t("leaderboard.tryRotation"),
      };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Header */}
      <div className="text-center space-y-4 mb-6 pt-6">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("leaderboard.title")}
        </h1>
      </div>

      {/* Current Leaderboard Stats */}
      {currentLeaderboard.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg p-3 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="text-white/80" size={14} />
              <span className="font-bold text-white">
                {currentLeaderboard.length}
              </span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-1">
              <Eye className="text-white/80" size={14} />
              <span className="text-white/70 text-xs">Top 100</span>
            </div>
          </div>
        </div>
      )}

      {/* User Position (if not in top 100) */}
      {userPosition && !isUserInTop && (
        <div className="mb-6">
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="text-blue-400" size={16} />
              <span className="text-blue-300 font-bold">Your Position</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-white">
                #{userPosition}
              </span>
              <p className="text-blue-300/80 text-sm mt-1">
                Keep playing to reach the top 100!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-1">
          <div className="flex space-x-1">
            {(["reaction", "survival", "physics", "rotation"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-bold
                  ${getTabColors(tab, activeTab === tab)}
                `}
                  onClick={() => setActiveTab(tab)}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {tab === "reaction" && <Zap size={12} />}
                    {tab === "survival" && <Crosshair size={12} />}
                    {tab === "physics" && <Atom size={12} />}
                    {tab === "rotation" && <RotateCw size={12} />}
                  </div>
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="space-y-4">
        {currentLeaderboard.length === 0 ? (
          <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg">
            {(() => {
              const emptyState = getEmptyStateMessage();

              return (
                <>
                  {emptyState.icon}
                  <p className="font-bold text-white/80">{emptyState.title}</p>
                  <p className="text-sm mt-1 text-white/60">
                    {emptyState.subtitle}
                  </p>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="animate-fade-in space-y-3 max-h-[70vh] overflow-y-auto">
            {currentLeaderboard.map((entry) => {
              switch (activeTab) {
                case "reaction":
                  return renderReactionLeaderboardEntry(
                    entry as SafeReactionLeaderboard,
                  );
                case "survival":
                  return renderSurvivalLeaderboardEntry(
                    entry as SafeSurvivalLeaderboard,
                  );
                case "physics":
                  return renderPhysicsLeaderboardEntry(
                    entry as SafePhysicsLeaderboard,
                  );
                case "rotation":
                  return renderRotationLeaderboardEntry(
                    entry as SafeRotationLeaderboard,
                  );
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>

      {/* Bottom spacing for safe area */}
      <div className="h-24" />
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AuthGuard requireCompleteAuth={true} showError={true}>
      <LeaderboardPageContent />
    </AuthGuard>
  );
}
