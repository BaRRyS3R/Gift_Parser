// src/app/leaderboard/page.tsx - Обновлена с использованием защищенной системы API

"use client";

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
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { authService } from "@/lib/authService";
import {
  formatSurvivalTime,
  formatPhysicsTime,
  formatRotationTime,
} from "@/utils/timeFormatter";
import { getReactionRatingColor } from "@/game-modes/reaction/ReactionGameLogic";
import { useT } from "@/contexts/LocalizationContext";

// Импорт безопасных типов
import type {
  SafeReactionLeaderboardEntry,
  SafeSurvivalLeaderboardEntry,
  SafePhysicsLeaderboardEntry,
  SafeRotationLeaderboardEntry,
} from "@/types/safe-leaderboard";

type LeaderboardType = "reaction" | "survival" | "physics" | "rotation";

export default function LeaderboardPage() {
  const { isAuthenticated } = useUser();
  const t = useT();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("reaction");
  const [reactionLeaderboard, setReactionLeaderboard] = useState<SafeReactionLeaderboardEntry[]>([]);
  const [survivalLeaderboard, setSurvivalLeaderboard] = useState<SafeSurvivalLeaderboardEntry[]>([]);
  const [physicsLeaderboard, setPhysicsLeaderboard] = useState<SafePhysicsLeaderboardEntry[]>([]);
  const [rotationLeaderboard, setRotationLeaderboard] = useState<SafeRotationLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboards = async () => {
      if (!isAuthenticated) {
        console.log("User not authenticated, skipping leaderboard load");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Loading leaderboards via secure API...");

        const [reaction, survival, physics, rotation] = await Promise.all([
          authService.getReactionLeaderboard(50),
          authService.getSurvivalLeaderboard(50),
          authService.getPhysicsLeaderboard(50),
          authService.getRotationLeaderboard(50),
        ]);

        setReactionLeaderboard(reaction);
        setSurvivalLeaderboard(survival);
        setPhysicsLeaderboard(physics);
        setRotationLeaderboard(rotation);

        console.log("Leaderboards loaded successfully via secure API");
      } catch (err) {
        console.error("Error loading leaderboards via secure API:", err);

        // Handle authentication errors
        if (err instanceof Error && err.message.includes("Authentication expired")) {
          console.log("Authentication expired during leaderboard load");
          setError(t("leaderboard.authenticationRequired"));
        } else {
          setError(t("leaderboard.failedToLoad"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboards();
  }, [isAuthenticated, t]);

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

  const renderReactionLeaderboardEntry = (
    entry: SafeReactionLeaderboardEntry,
    position: number,
  ) => {
    const getRatingFromTime = (time: number): string => {
      if (time <= 100) return "LIGHTNING";
      if (time <= 200) return "EXCELLENT";
      if (time <= 300) return "GOOD";
      if (time <= 500) return "AVERAGE";
      return "SLOW";
    };

    const rating = getRatingFromTime(entry.bestReactionTime);

    return (
      <div
        key={entry.rank}
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
                  {position <= 3 ? (
                    getRankIcon(position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.displayName}
                    </h3>
                    {entry.isPremium && (
                      <Star
                        className="text-yellow-400 flex-shrink-0"
                        size={12}
                      />
                    )}
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
                    <span>{entry.reactionGames}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {entry.bestReactionTime}ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSurvivalLeaderboardEntry = (
    entry: SafeSurvivalLeaderboardEntry,
    position: number,
  ) => {
    return (
      <div
        key={entry.rank}
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
                  {position <= 3 ? (
                    getRankIcon(position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.displayName}
                    </h3>
                    {entry.isPremium && (
                      <Star
                        className="text-yellow-400 flex-shrink-0"
                        size={12}
                      />
                    )}
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
                    <span>L{entry.maxLevel}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.bestStreak}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.survivalGames}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatSurvivalTime(entry.bestSurvivalTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPhysicsLeaderboardEntry = (
    entry: SafePhysicsLeaderboardEntry,
    position: number,
  ) => {
    return (
      <div
        key={entry.rank}
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
                  {position <= 3 ? (
                    getRankIcon(position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.displayName}
                    </h3>
                    {entry.isPremium && (
                      <Star
                        className="text-yellow-400 flex-shrink-0"
                        size={12}
                      />
                    )}
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
                    <span>{formatPhysicsTime(entry.bestPhysicsTime)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.bestHits}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.physicsGames}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {entry.bestPhysicsScore}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRotationLeaderboardEntry = (
    entry: SafeRotationLeaderboardEntry,
    position: number,
  ) => {
    return (
      <div
        key={entry.rank}
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
                  {position <= 3 ? (
                    getRankIcon(position)
                  ) : (
                    <span className="text-white/80 text-sm font-bold">
                      #{position}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3
                      className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                    >
                      {entry.displayName}
                    </h3>
                    {entry.isPremium && (
                      <Star
                        className="text-yellow-400 flex-shrink-0"
                        size={12}
                      />
                    )}
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
                    <span>L{entry.maxLevel}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target size={10} />
                    <span>{entry.bestStreak}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity size={10} />
                    <span>{entry.rotationGames}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatRotationTime(entry.bestRotationTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Check authentication and show appropriate message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <TrendingUp className="text-white/60 mx-auto" size={48} />
          <h2 className="text-white text-xl font-bold">Authentication Required</h2>
          <p className="text-white/80">Please log in to view leaderboards</p>
        </div>
      </div>
    );
  }

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
            onClick={() => window.location.reload()}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const getCurrentLeaderboard = () => {
    switch (activeTab) {
      case "reaction":
        return reactionLeaderboard;
      case "survival":
        return survivalLeaderboard;
      case "physics":
        return physicsLeaderboard;
      case "rotation":
        return rotationLeaderboard;
    }
  };

  const currentLeaderboard = getCurrentLeaderboard();
  const isReactionTab = activeTab === "reaction";
  const isSurvivalTab = activeTab === "survival";
  const isPhysicsTab = activeTab === "physics";
  const isRotationTab = activeTab === "rotation";

  const getEmptyStateMessage = () => {
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
      <div className="text-center space-y-4 mb-8 pt-6">
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
              {isReactionTab ? (
                <Clock className="text-white/80" size={14} />
              ) : isSurvivalTab ? (
                <Clock className="text-white/80" size={14} />
              ) : isPhysicsTab ? (
                <Target className="text-white/80" size={14} />
              ) : (
                <Clock className="text-white/80" size={14} />
              )}
              <span className="font-bold text-white">
                {currentLeaderboard[0]
                  ? isReactionTab
                    ? `${(currentLeaderboard[0] as SafeReactionLeaderboardEntry).bestReactionTime}ms`
                    : isSurvivalTab
                      ? formatSurvivalTime(
                        (currentLeaderboard[0] as SafeSurvivalLeaderboardEntry)
                          .bestSurvivalTime,
                      )
                      : isPhysicsTab
                        ? `${(currentLeaderboard[0] as SafePhysicsLeaderboardEntry).bestPhysicsScore} pts`
                        : formatRotationTime(
                          (currentLeaderboard[0] as SafeRotationLeaderboardEntry)
                            .bestRotationTime,
                        )
                  : "0"}
              </span>
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
                  flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-300
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
            {currentLeaderboard.map((entry, index) =>
              isReactionTab
                ? renderReactionLeaderboardEntry(
                  entry as SafeReactionLeaderboardEntry,
                  index + 1,
                )
                : isSurvivalTab
                  ? renderSurvivalLeaderboardEntry(
                    entry as SafeSurvivalLeaderboardEntry,
                    index + 1,
                  )
                  : isPhysicsTab
                    ? renderPhysicsLeaderboardEntry(
                      entry as SafePhysicsLeaderboardEntry,
                      index + 1,
                    )
                    : renderRotationLeaderboardEntry(
                      entry as SafeRotationLeaderboardEntry,
                      index + 1,
                    ),
            )}
          </div>
        )}
      </div>

      {/* Bottom spacing for safe area */}
      <div className="h-24" />
    </div>
  );
}