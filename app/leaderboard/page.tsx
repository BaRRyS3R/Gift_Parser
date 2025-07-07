// src/app/leaderboard/page.tsx - Обновленная версия с едиными стилями и без разделения

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
} from "lucide-react";

import {
  userService,
  type ReactionLeaderboard,
  type SurvivalLeaderboard,
  type PhysicsLeaderboard,
} from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { formatSurvivalTime, formatPhysicsTime } from "@/utils/timeFormatter";
import { getReactionRatingColor } from "@/game-modes/reaction/ReactionGameLogic";
import { useT } from "@/contexts/LocalizationContext";

type LeaderboardType = "reaction" | "survival" | "physics";

export default function LeaderboardPage() {
  const { user } = useUser();
  const t = useT();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("reaction");
  const [reactionLeaderboard, setReactionLeaderboard] = useState<
    ReactionLeaderboard[]
  >([]);
  const [survivalLeaderboard, setSurvivalLeaderboard] = useState<
    SurvivalLeaderboard[]
  >([]);
  const [physicsLeaderboard, setPhysicsLeaderboard] = useState<
    PhysicsLeaderboard[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [reaction, survival, physics] = await Promise.all([
          userService.getReactionLeaderboard(50),
          userService.getSurvivalLeaderboard(50),
          userService.getPhysicsLeaderboard(50),
        ]);

        setReactionLeaderboard(reaction);
        setSurvivalLeaderboard(survival);
        setPhysicsLeaderboard(physics);
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError(t("leaderboard.failedToLoad"));
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboards();
  }, [t]);

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

  const isCurrentUser = (telegramId: number) => {
    return user?.telegram_id === telegramId;
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
    };

    return isActive ? colors[tab].active : colors[tab].inactive;
  };

  const renderReactionLeaderboardEntry = (
    entry: ReactionLeaderboard,
    position: number,
  ) => {
    const getRatingFromTime = (time: number): string => {
      if (time <= 150) return "LIGHTNING";
      if (time <= 200) return "EXCELLENT";
      if (time <= 300) return "GOOD";
      if (time <= 500) return "AVERAGE";
      return "SLOW";
    };

    const rating = getRatingFromTime(entry.best_reaction_time);

    return (
      <div
        key={entry.id}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${isCurrentUser(entry.telegram_id) ? "ring-1 ring-white/60 bg-white/25" : ""}
          rounded-lg
        `}
      >
        {/* Background Pattern with Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Zap size={120} className="text-white" />
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
                    <span className="text-white/80 text-sm font-bold">#{position}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id) ? "text-white" : "text-white/90"}`}>
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.is_premium && (
                      <Star className="text-yellow-400 flex-shrink-0" size={12} />
                    )}
                    {isCurrentUser(entry.telegram_id) && (
                      <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded border border-white/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">@{entry.username}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`text-xs font-bold ${getReactionRatingColor(rating as any)}`}>
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

  const renderSurvivalLeaderboardEntry = (
    entry: SurvivalLeaderboard,
    position: number,
  ) => {
    return (
      <div
        key={entry.id}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${isCurrentUser(entry.telegram_id) ? "ring-1 ring-red-400/60 bg-red-500/25" : ""}
          rounded-lg
        `}
      >
        {/* Background Pattern with Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Crosshair size={120} className="text-red-400" />
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
                    <span className="text-white/80 text-sm font-bold">#{position}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id) ? "text-white" : "text-white/90"}`}>
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.is_premium && (
                      <Star className="text-yellow-400 flex-shrink-0" size={12} />
                    )}
                    {isCurrentUser(entry.telegram_id) && (
                      <span className="text-xs bg-red-500/30 text-red-200 px-2 py-0.5 rounded border border-red-400/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">@{entry.username}</p>
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

  const renderPhysicsLeaderboardEntry = (
    entry: PhysicsLeaderboard,
    position: number,
  ) => {
    return (
      <div
        key={entry.id}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${isCurrentUser(entry.telegram_id) ? "ring-1 ring-purple-400/60 bg-purple-500/25" : ""}
          rounded-lg
        `}
      >
        {/* Background Pattern with Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
            <Atom size={120} className="text-purple-400" />
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
                    <span className="text-white/80 text-sm font-bold">#{position}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id) ? "text-white" : "text-white/90"}`}>
                      {entry.first_name} {entry.last_name || ""}
                    </h3>
                    {entry.is_premium && (
                      <Star className="text-yellow-400 flex-shrink-0" size={12} />
                    )}
                    {isCurrentUser(entry.telegram_id) && (
                      <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded border border-purple-400/30">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  {entry.username && (
                    <p className="text-xs text-white/60 truncate">@{entry.username}</p>
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
    }
  };

  const currentLeaderboard = getCurrentLeaderboard();
  const isReactionTab = activeTab === "reaction";
  const isSurvivalTab = activeTab === "survival";
  const isPhysicsTab = activeTab === "physics";

  const getTabLabel = (tab: LeaderboardType) => {
    switch (tab) {
      case "reaction":
        return t("leaderboard.reaction").split(" ")[0];
      case "survival":
        return t("leaderboard.survival").split(" ")[0];
      case "physics":
        return t("leaderboard.physics").split(" ")[0];
    }
  };

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
    } else {
      return {
        icon: <Atom className="text-purple-400/60 mx-auto mb-3" size={32} />,
        title: t("leaderboard.noPhysicists"),
        subtitle: t("leaderboard.tryPhysics"),
      };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-32 safe-area-inset-bottom">
      {/* Main content container with proper bottom padding */}
      <div className="px-4 pt-6 safe-area-inset">
        {/* Header - Unified with Other Pages */}
        <div className="text-center space-y-4 mb-8">
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
                ) : (
                  <Target className="text-white/80" size={14} />
                )}
                <span className="font-bold text-white">
                  {currentLeaderboard[0]
                    ? isReactionTab
                      ? `${(currentLeaderboard[0] as ReactionLeaderboard).best_reaction_time}ms`
                      : isSurvivalTab
                        ? formatSurvivalTime(
                          (currentLeaderboard[0] as SurvivalLeaderboard).best_survival_time,
                        )
                        : `${(currentLeaderboard[0] as PhysicsLeaderboard).best_physics_score} pts`
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
              {(["reaction", "survival", "physics"] as const).map((tab) => (
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
                    <span>{getTabLabel(tab)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Content - Single Unified List */}
        <div className="space-y-4">
          {currentLeaderboard.length === 0 ? (
            <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg">
              {(() => {
                const emptyState = getEmptyStateMessage();
                return (
                  <>
                    {emptyState.icon}
                    <p className="font-bold text-white/80">{emptyState.title}</p>
                    <p className="text-sm mt-1 text-white/60">{emptyState.subtitle}</p>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="animate-fade-in space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {currentLeaderboard.map((entry, index) =>
                isReactionTab
                  ? renderReactionLeaderboardEntry(entry as ReactionLeaderboard, index + 1)
                  : isSurvivalTab
                    ? renderSurvivalLeaderboardEntry(entry as SurvivalLeaderboard, index + 1)
                    : renderPhysicsLeaderboardEntry(entry as PhysicsLeaderboard, index + 1),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}