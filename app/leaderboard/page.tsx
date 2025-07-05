// src/app/leaderboard/page.tsx - Updated with unified header design

"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Medal,
  Award,
  Star,
  Trophy,
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

  const getRankBg = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500/20 border-yellow-400/40";
      case 2:
        return "bg-gray-400/20 border-gray-300/40";
      case 3:
        return "bg-amber-600/20 border-amber-500/40";
      default:
        return "bg-white/5 border-white/20";
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
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
          ${position <= 3
            ? "bg-white/20 border-white/40"
            : "bg-white/10 border-white/30"
          }
          ${isCurrentUser(entry.telegram_id)
            ? "ring-1 ring-white/60 bg-white/25"
            : "hover:bg-white/15"
          }
        `}
      >
        <div className="flex items-center justify-center w-8">
          {position <= 3 ? (
            getRankIcon(position)
          ) : (
            <span className="text-white/80 text-sm font-bold">#{position}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id)
                ? "text-white"
                : "text-white/90"
                }`}
            >
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

        <div className="text-right space-y-1">
          <div className="text-lg font-bold text-white">
            {entry.best_reaction_time}
          </div>
          <div className="flex items-center space-x-2 text-xs text-white/80">
            <div
              className={`text-xs font-bold ${getReactionRatingColor(rating as any)}`}
            >
              {rating}
            </div>
            <div className="flex items-center space-x-1">
              <Activity size={10} />
              <span>{entry.reaction_games}</span>
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
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
          ${position <= 3
            ? "bg-red-500/20 border-red-400/40"
            : "bg-red-500/10 border-red-400/30"
          }
          ${isCurrentUser(entry.telegram_id)
            ? "ring-1 ring-red-400/60 bg-red-500/25"
            : "hover:bg-red-500/15"
          }
        `}
      >
        <div className="flex items-center justify-center w-8">
          {position <= 3 ? (
            getRankIcon(position)
          ) : (
            <span className="text-red-300/80 text-sm font-bold">
              #{position}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id)
                ? "text-red-200"
                : "text-red-300"
                }`}
            >
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
            <p className="text-xs text-red-300/60 truncate">
              @{entry.username}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="text-lg font-bold text-red-300">
            {formatSurvivalTime(entry.best_survival_time)}
          </div>
          <div className="flex items-center space-x-2 text-xs text-red-400/80">
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
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
          ${position <= 3
            ? "bg-purple-500/20 border-purple-400/40"
            : "bg-purple-500/10 border-purple-400/30"
          }
          ${isCurrentUser(entry.telegram_id)
            ? "ring-1 ring-purple-400/60 bg-purple-500/25"
            : "hover:bg-purple-500/15"
          }
        `}
      >
        <div className="flex items-center justify-center w-8">
          {position <= 3 ? (
            getRankIcon(position)
          ) : (
            <span className="text-purple-300/80 text-sm font-bold">
              #{position}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id)
                ? "text-purple-200"
                : "text-purple-300"
                }`}
            >
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
            <p className="text-xs text-purple-300/60 truncate">
              @{entry.username}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="text-lg font-bold text-purple-300">
            {entry.best_physics_score}
          </div>
          <div className="flex items-center space-x-2 text-xs text-purple-400/80">
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

  const getLeaderboardTitle = () => {
    switch (activeTab) {
      case "reaction":
        return t("leaderboard.reaction");
      case "survival":
        return t("leaderboard.survival");
      case "physics":
        return t("leaderboard.physics");
    }
  };

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

  const getTopPlayersLabel = () => {
    if (isReactionTab) {
      return t("leaderboard.speedElite");
    } else if (isSurvivalTab) {
      return t("leaderboard.survivalElite");
    } else {
      return t("leaderboard.physicsElite");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Header - Unified with Game Page */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("leaderboard.title")}
        </h1>
      </div>

      {/* Current Leaderboard Stats */}
      {currentLeaderboard.length > 0 && (
        <div className="mb-6">
          <div
            className={`flex items-center justify-center space-x-4 backdrop-blur-xl border rounded-lg p-2 text-sm ${isReactionTab
              ? "bg-white/10 border-white/30"
              : isSurvivalTab
                ? "bg-red-500/10 border-red-400/30"
                : "bg-purple-500/10 border-purple-400/30"
              }`}
          >
            <div className="flex items-center space-x-1">
              <Users
                className={`${isReactionTab
                  ? "text-white/80"
                  : isSurvivalTab
                    ? "text-red-400/80"
                    : "text-purple-400/80"
                  }`}
                size={14}
              />
              <span
                className={`font-bold ${isReactionTab
                  ? "text-white"
                  : isSurvivalTab
                    ? "text-red-300"
                    : "text-purple-300"
                  }`}
              >
                {currentLeaderboard.length}
              </span>
            </div>
            <div
              className={`w-px h-4 ${isReactionTab
                ? "bg-white/30"
                : isSurvivalTab
                  ? "bg-red-400/30"
                  : "bg-purple-400/30"
                }`}
            />
            <div className="flex items-center space-x-1">
              {isReactionTab ? (
                <Clock className="text-white/80" size={14} />
              ) : isSurvivalTab ? (
                <Clock className="text-red-400/80" size={14} />
              ) : (
                <Trophy className="text-purple-400/80" size={14} />
              )}
              <span
                className={`font-bold ${isReactionTab
                  ? "text-white"
                  : isSurvivalTab
                    ? "text-red-300"
                    : "text-purple-300"
                  }`}
              >
                {currentLeaderboard[0]
                  ? isReactionTab
                    ? `${(currentLeaderboard[0] as ReactionLeaderboard).best_reaction_time}`
                    : isSurvivalTab
                      ? formatSurvivalTime(
                        (currentLeaderboard[0] as SurvivalLeaderboard)
                          .best_survival_time,
                      )
                      : formatPhysicsTime((currentLeaderboard[0] as PhysicsLeaderboard).best_physics_time)
                  : "0"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4">
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

      {/* Leaderboard Content */}
      <div className="space-y-3">
        {currentLeaderboard.length === 0 ? (
          <div
            className={`text-center py-8 backdrop-blur-xl border rounded-lg ${isReactionTab
              ? "bg-white/10 border-white/30"
              : isSurvivalTab
                ? "bg-red-500/10 border-red-400/30"
                : "bg-purple-500/10 border-purple-400/30"
              }`}
          >
            {(() => {
              const emptyState = getEmptyStateMessage();
              return (
                <>
                  {emptyState.icon}
                  <p
                    className={`font-bold ${isReactionTab
                      ? "text-white/80"
                      : isSurvivalTab
                        ? "text-red-300/80"
                        : "text-purple-300/80"
                      }`}
                  >
                    {emptyState.title}
                  </p>
                  <p
                    className={`text-sm mt-1 ${isReactionTab
                      ? "text-white/60"
                      : isSurvivalTab
                        ? "text-red-400/60"
                        : "text-purple-400/60"
                      }`}
                  >
                    {emptyState.subtitle}
                  </p>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Top 3 Section */}
            {currentLeaderboard.slice(0, 3).length > 0 && (
              <div
                className={`backdrop-blur-xl border rounded-lg p-4 mb-3 ${isReactionTab
                  ? "bg-white/10 border-white/30"
                  : isSurvivalTab
                    ? "bg-red-500/10 border-red-400/30"
                    : "bg-purple-500/10 border-purple-400/30"
                  }`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Crown
                    className={`${isReactionTab
                      ? "text-white"
                      : isSurvivalTab
                        ? "text-red-400"
                        : "text-purple-400"
                      }`}
                    size={16}
                  />
                  <h3
                    className={`text-sm font-bold ${isReactionTab
                      ? "text-white"
                      : isSurvivalTab
                        ? "text-red-300"
                        : "text-purple-300"
                      }`}
                  >
                    {getTopPlayersLabel()}
                  </h3>
                </div>
                <div className="space-y-2">
                  {currentLeaderboard
                    .slice(0, 3)
                    .map((entry, index) =>
                      isReactionTab
                        ? renderReactionLeaderboardEntry(
                          entry as ReactionLeaderboard,
                          index + 1,
                        )
                        : isSurvivalTab
                          ? renderSurvivalLeaderboardEntry(
                            entry as SurvivalLeaderboard,
                            index + 1,
                          )
                          : renderPhysicsLeaderboardEntry(
                            entry as PhysicsLeaderboard,
                            index + 1,
                          ),
                    )}
                </div>
              </div>
            )}

            {/* All Players Section */}
            {currentLeaderboard.length > 3 && (
              <div
                className={`backdrop-blur-xl border rounded-lg p-4 ${isReactionTab
                  ? "bg-white/10 border-white/30"
                  : isSurvivalTab
                    ? "bg-red-500/10 border-red-400/30"
                    : "bg-purple-500/10 border-purple-400/30"
                  }`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Users
                    className={`${isReactionTab
                      ? "text-white"
                      : isSurvivalTab
                        ? "text-red-400"
                        : "text-purple-400"
                      }`}
                    size={16}
                  />
                  <h3
                    className={`text-sm font-bold ${isReactionTab
                      ? "text-white"
                      : isSurvivalTab
                        ? "text-red-300"
                        : "text-purple-300"
                      }`}
                  >
                    {t("leaderboard.allPlayers")}
                  </h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {currentLeaderboard
                    .slice(3)
                    .map((entry, index) =>
                      isReactionTab
                        ? renderReactionLeaderboardEntry(
                          entry as ReactionLeaderboard,
                          index + 4,
                        )
                        : isSurvivalTab
                          ? renderSurvivalLeaderboardEntry(
                            entry as SurvivalLeaderboard,
                            index + 4,
                          )
                          : renderPhysicsLeaderboardEntry(
                            entry as PhysicsLeaderboard,
                            index + 4,
                          ),
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}