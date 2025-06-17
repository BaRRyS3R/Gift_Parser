// src/app/leaderboard/page.tsx - Updated for monochrome reaction mode

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
} from "lucide-react";

import {
  userService,
  type LeaderboardEntry,
  type ReactionLeaderboard,
  type SurvivalLeaderboard,
} from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { formatSurvivalTime } from "@/game-modes/survival/SurvivalGameLogic";
import { getReactionRatingColor } from "@/game-modes/reaction/ReactionGameLogic";
import { useI18n } from "@/lib/i18n";

type LeaderboardType = "overall" | "reaction" | "survival";

export default function LeaderboardPage() {
  const { user } = useUser();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("overall");
  const [overallLeaderboard, setOverallLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [reactionLeaderboard, setReactionLeaderboard] = useState<
    ReactionLeaderboard[]
  >([]);
  const [survivalLeaderboard, setSurvivalLeaderboard] = useState<
    SurvivalLeaderboard[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [overall, reaction, survival] = await Promise.all([
          userService.getLeaderboard(50),
          userService.getReactionLeaderboard(50),
          userService.getSurvivalLeaderboard(50),
        ]);

        setOverallLeaderboard(overall);
        setReactionLeaderboard(reaction);
        setSurvivalLeaderboard(survival);
      } catch (err) {
        console.error("Error loading leaderboards:", err);
        setError(t("leaderboard.errors.loadFailed"));
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
          <span className="text-white/60 font-bpdots text-sm font-bold">
            #{position}
          </span>
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
      overall: {
        active: "bg-white/20 text-white",
        inactive: "text-white/60 hover:text-white/80",
      },
      reaction: {
        // Updated to monochrome scheme
        active: "bg-white/20 text-white border border-white/30",
        inactive: "text-white/60 hover:text-white/80",
      },
      survival: {
        active: "bg-red-500/20 text-red-300 border border-red-400/30",
        inactive: "text-red-400/60 hover:text-red-400/80",
      },
    };

    return isActive ? colors[tab].active : colors[tab].inactive;
  };

  const renderOverallLeaderboardEntry = (
    entry: LeaderboardEntry,
    position: number,
  ) => {
    return (
      <div
        key={entry.id}
        className={`
                    flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
                    ${getRankBg(position)}
                    ${
                      isCurrentUser(entry.telegram_id)
                        ? "ring-1 ring-white/40 bg-white/15"
                        : "hover:bg-white/10"
                    }
                `}
      >
        <div className="flex items-center justify-center w-8">
          {getRankIcon(position)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bpdots font-bold truncate text-sm ${
                isCurrentUser(entry.telegram_id)
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
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bpdots">
                {t("leaderboard.you")}
              </span>
            )}
          </div>
          {entry.username && (
            <p className="text-xs text-white/50 font-bpdots truncate">
              @{entry.username}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="text-lg font-bold font-bpdots text-white">
            {entry.best_score}
          </div>
          <div className="flex items-center space-x-2 text-xs text-white/60 font-bpdots">
            <div className="flex items-center space-x-1">
              <Activity size={10} />
              <span>{entry.total_games}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReactionLeaderboardEntry = (
    entry: ReactionLeaderboard,
    position: number,
  ) => {
    const getRatingFromTime = (time: number): string => {
      if (time <= 150) return t("game.modes.reaction.ratings.lightning");
      if (time <= 200) return t("game.modes.reaction.ratings.excellent");
      if (time <= 300) return t("game.modes.reaction.ratings.good");
      if (time <= 500) return t("game.modes.reaction.ratings.average");

      return t("game.modes.reaction.ratings.slow");
    };

    const rating = getRatingFromTime(entry.best_reaction_time);

    return (
      <div
        key={entry.id}
        className={`
                    flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
                    ${
                      position <= 3
                        ? "bg-white/20 border-white/40"
                        : "bg-white/10 border-white/30"
                    }
                    ${
                      isCurrentUser(entry.telegram_id)
                        ? "ring-1 ring-white/60 bg-white/25"
                        : "hover:bg-white/15"
                    }
                `}
      >
        <div className="flex items-center justify-center w-8">
          {position <= 3 ? (
            getRankIcon(position)
          ) : (
            <span className="text-white/80 font-bpdots text-sm font-bold">
              #{position}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bpdots font-bold truncate text-sm ${
                isCurrentUser(entry.telegram_id)
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
              <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded font-bpdots border border-white/30">
                {t("leaderboard.you")}
              </span>
            )}
          </div>
          {entry.username && (
            <p className="text-xs text-white/60 font-bpdots truncate">
              @{entry.username}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="text-lg font-bold font-bpdots text-white">
            {entry.best_reaction_time}ms
          </div>
          <div className="flex items-center space-x-2 text-xs text-white/80 font-bpdots">
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
                    ${
                      position <= 3
                        ? "bg-red-500/20 border-red-400/40"
                        : "bg-red-500/10 border-red-400/30"
                    }
                    ${
                      isCurrentUser(entry.telegram_id)
                        ? "ring-1 ring-red-400/60 bg-red-500/25"
                        : "hover:bg-red-500/15"
                    }
                `}
      >
        <div className="flex items-center justify-center w-8">
          {position <= 3 ? (
            getRankIcon(position)
          ) : (
            <span className="text-red-300/80 font-bpdots text-sm font-bold">
              #{position}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className={`font-bpdots font-bold truncate text-sm ${
                isCurrentUser(entry.telegram_id)
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
              <span className="text-xs bg-red-500/30 text-red-200 px-2 py-0.5 rounded font-bpdots border border-red-400/30">
                {t("leaderboard.you")}
              </span>
            )}
          </div>
          {entry.username && (
            <p className="text-xs text-red-300/60 font-bpdots truncate">
              @{entry.username}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="text-lg font-bold font-bpdots text-red-300">
            {formatSurvivalTime(entry.best_survival_time)}
          </div>
          <div className="flex items-center space-x-2 text-xs text-red-400/80 font-bpdots">
            <div className="flex items-center space-x-1">
              <TrendingUp size={10} />
              <span>
                {t("game.modes.survival.level")} {entry.max_level}
              </span>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white font-bpdots">LOADING RANKING DATA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <TrendingUp className="text-white/60 mx-auto" size={32} />
          <p className="text-white/80 font-bpdots">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg font-bpdots hover:bg-white/30 transition-colors"
            onClick={() => window.location.reload()}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const getCurrentLeaderboard = (): (LeaderboardEntry | ReactionLeaderboard | SurvivalLeaderboard)[] => {
    switch (activeTab) {
      case "overall":
        return overallLeaderboard;
      case "reaction":
        return reactionLeaderboard;
      case "survival":
        return survivalLeaderboard;
      default:
        return overallLeaderboard;
    }
  };

  const currentLeaderboard = getCurrentLeaderboard();
  const isReactionTab = activeTab === "reaction";
  const isSurvivalTab = activeTab === "survival";

  const renderLeaderboardEntry = (entry: LeaderboardEntry | ReactionLeaderboard | SurvivalLeaderboard, position: number) => {
    if (isReactionTab && 'best_reaction_time' in entry) {
      return renderReactionLeaderboardEntry(entry as ReactionLeaderboard, position);
    }
    if (isSurvivalTab && 'best_survival_time' in entry) {
      return renderSurvivalLeaderboardEntry(entry as SurvivalLeaderboard, position);
    }
    return renderOverallLeaderboardEntry(entry as LeaderboardEntry, position);
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Header */}
      <div className="mb-4">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isReactionTab
                  ? "bg-white/20 border border-white/30"
                  : isSurvivalTab
                    ? "bg-red-500/20 border border-red-400/30"
                    : "bg-white/20"
              }`}
            >
              {isReactionTab ? (
                <Zap className="text-white" size={20} />
              ) : isSurvivalTab ? (
                <Crosshair className="text-red-300" size={20} />
              ) : (
                <Trophy className="text-white" size={20} />
              )}
            </div>
            <h1
              className={`text-2xl font-bold font-bpdots ${
                isReactionTab
                  ? "text-white"
                  : isSurvivalTab
                    ? "text-red-300"
                    : "text-white"
              }`}
            >
              {isReactionTab
                ? t("leaderboard.titles.reaction")
                : isSurvivalTab
                  ? t("leaderboard.titles.survival")
                  : t("leaderboard.titles.overall")}
            </h1>
          </div>

          {currentLeaderboard.length > 0 && (
            <div
              className={`flex items-center justify-center space-x-4 backdrop-blur-xl border rounded-lg p-2 text-sm ${
                isReactionTab
                  ? "bg-white/10 border-white/30"
                  : isSurvivalTab
                    ? "bg-red-500/10 border-red-400/30"
                    : "bg-white/10 border-white/20"
              }`}
            >
              <div className="flex items-center space-x-1">
                <Users
                  className={`${
                    isReactionTab
                      ? "text-white/80"
                      : isSurvivalTab
                        ? "text-red-400/80"
                        : "text-white/60"
                  }`}
                  size={14}
                />
                <span
                  className={`font-bpdots ${
                    isReactionTab
                      ? "text-white/80"
                      : isSurvivalTab
                        ? "text-red-400/80"
                        : "text-white/60"
                  }`}
                >
                  {t("leaderboard.stats.players", "leaderboard", {
                    count: currentLeaderboard.length,
                  })}
                </span>
              </div>
              <div
                className={`w-px h-4 ${
                  isReactionTab
                    ? "bg-white/30"
                    : isSurvivalTab
                      ? "bg-red-400/30"
                      : "bg-white/20"
                }`}
              />
              <div className="flex items-center space-x-1">
                {isReactionTab ? (
                  <Clock className="text-white/80" size={14} />
                ) : isSurvivalTab ? (
                  <Clock className="text-red-400/80" size={14} />
                ) : (
                  <Trophy className="text-white/60" size={14} />
                )}
                <span
                  className={`font-bpdots ${
                    isReactionTab
                      ? "text-white/80"
                      : isSurvivalTab
                        ? "text-red-400/80"
                        : "text-white/60"
                  }`}
                >
                  {isReactionTab
                    ? t("leaderboard.stats.fastest")
                    : isSurvivalTab
                      ? t("leaderboard.stats.longest")
                      : t("leaderboard.stats.top")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-1">
          <div className="flex space-x-1">
            {(["overall", "reaction", "survival"] as const).map((tab) => (
              <button
                key={tab}
                className={`
                                    flex-1 px-3 py-2 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
                                    ${getTabColors(tab, activeTab === tab)}
                                `}
                onClick={() => setActiveTab(tab)}
              >
                <div className="flex items-center justify-center space-x-1">
                  {tab === "overall" && <Trophy size={12} />}
                  {tab === "reaction" && <Zap size={12} />}
                  {tab === "survival" && <Crosshair size={12} />}
                  <span>{t(`leaderboard.tabs.${tab}`)}</span>
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
            className={`text-center py-8 backdrop-blur-xl border rounded-lg ${
              isReactionTab
                ? "bg-white/10 border-white/30"
                : isSurvivalTab
                  ? "bg-red-500/10 border-red-400/30"
                  : "bg-white/10 border-white/20"
            }`}
          >
            <p
              className={`text-lg font-bpdots font-bold ${
                isReactionTab
                  ? "text-white"
                  : isSurvivalTab
                    ? "text-red-300"
                    : "text-white"
              }`}
            >
              {t("leaderboard.empty.noPlayers")}
            </p>
            <p
              className={`font-bpdots text-sm mt-1 ${
                isReactionTab
                  ? "text-white/60"
                  : isSurvivalTab
                    ? "text-red-400/60"
                    : "text-white/40"
              }`}
            >
              {isReactionTab
                ? t("leaderboard.empty.reactionPrompt")
                : isSurvivalTab
                  ? t("leaderboard.empty.survivalPrompt")
                  : t("leaderboard.empty.overallPrompt")}
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Top 3 Section */}
            {currentLeaderboard.slice(0, 3).length > 0 && (
              <div
                className={`backdrop-blur-xl border rounded-lg p-4 mb-3 ${
                  isReactionTab
                    ? "bg-white/10 border-white/30"
                    : isSurvivalTab
                      ? "bg-red-500/10 border-red-400/30"
                      : "bg-white/10 border-white/20"
                }`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Crown
                    className={`${
                      isReactionTab
                        ? "text-white"
                        : isSurvivalTab
                          ? "text-red-400"
                          : "text-white/80"
                    }`}
                    size={16}
                  />
                  <h3
                    className={`text-sm font-bpdots font-bold ${
                      isReactionTab
                        ? "text-white"
                        : isSurvivalTab
                          ? "text-red-300"
                          : "text-white"
                    }`}
                  >
                    {isReactionTab
                      ? t("leaderboard.sections.speedElite")
                      : isSurvivalTab
                        ? t("leaderboard.sections.survivalElite")
                        : t("leaderboard.sections.topPlayers")}
                  </h3>
                </div>
                <div className="space-y-2">
                  {currentLeaderboard.slice(0, 3).map((entry, index) => 
                    renderLeaderboardEntry(entry, index + 1)
                  )}
                </div>
              </div>
            )}

            {/* Rest of the Players */}
            {currentLeaderboard.slice(3).length > 0 && (
              <div
                className={`backdrop-blur-xl border rounded-lg p-4 ${
                  isReactionTab
                    ? "bg-white/10 border-white/30"
                    : isSurvivalTab
                      ? "bg-red-500/10 border-red-400/30"
                      : "bg-white/10 border-white/20"
                }`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Users
                    className={`${
                      isReactionTab
                        ? "text-white"
                        : isSurvivalTab
                          ? "text-red-400"
                          : "text-white/80"
                    }`}
                    size={16}
                  />
                  <h3
                    className={`text-sm font-bpdots font-bold ${
                      isReactionTab
                        ? "text-white"
                        : isSurvivalTab
                          ? "text-red-300"
                          : "text-white"
                    }`}
                  >
                    {t("leaderboard.sections.allPlayers")}
                  </h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {currentLeaderboard.slice(3).map((entry, index) => 
                    renderLeaderboardEntry(entry, index + 4)
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
