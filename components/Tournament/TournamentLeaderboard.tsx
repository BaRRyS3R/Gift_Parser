// src/components/Tournament/TournamentLeaderboard.tsx - Лидерборд турнира

"use client";

import type {
  TournamentLeaderboardEntry,
  TournamentStats,
} from "@/types/tournaments";

import React from "react";
import { Trophy, Medal, Award, Users, Target } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface TournamentLeaderboardProps {
  leaderboard: TournamentLeaderboardEntry[];
  userPosition?: number;
  totalParticipants: number;
  stats: TournamentStats;
  isLoading?: boolean;
  gameMode: string;
}

export default function TournamentLeaderboard({
  leaderboard,
  userPosition,
  totalParticipants,
  stats,
  isLoading = false,
  gameMode,
}: TournamentLeaderboardProps) {
  const t = useT();

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="text-yellow-400" size={20} />;
      case 2:
        return <Medal className="text-gray-300" size={20} />;
      case 3:
        return <Award className="text-amber-500" size={20} />;
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-white/80 text-sm font-bold">{position}</span>
          </div>
        );
    }
  };

  const getPositionStyling = (position: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return "bg-blue-500/10 border-blue-400/30";
    }

    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-600/8 to-yellow-800/4";
      case 2:
        return "bg-gradient-to-r from-gray-500/8 to-gray-700/4";
      case 3:
        return "bg-gradient-to-r from-amber-700/8 to-amber-900/4";
      default:
        return "hover:bg-white/5";
    }
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatLastPlayed = (lastPlayed?: string) => {
    if (!lastPlayed) return "-";

    const date = new Date(lastPlayed);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return t("tournaments.time.justNow");
    if (diffInHours < 24)
      return t("tournaments.time.hoursAgo", { hours: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);

    return t("tournaments.time.daysAgo", { days: diffInDays });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-16 bg-white/5 rounded-lg border border-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="text-blue-400" size={16} />
            <span className="text-blue-400 text-sm font-medium">
              {t("tournaments.stats.participants")}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {totalParticipants.toLocaleString()}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="text-green-400" size={16} />
            <span className="text-green-400 text-sm font-medium">
              {t("tournaments.stats.gamesPlayed")}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.total_games_played.toLocaleString()}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="text-yellow-400" size={16} />
            <span className="text-yellow-400 text-sm font-medium">
              {t("tournaments.stats.topScore")}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatScore(stats.highest_score)}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 bg-purple-400 rounded-full" />
            <span className="text-purple-400 text-sm font-medium">
              {t("tournaments.stats.avgScore")}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatScore(stats.average_score)}
          </div>
        </div>
      </div>

      {/* Current User Position (if not in top) */}
      {userPosition && userPosition > leaderboard.length && (
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-400 font-bold">#{userPosition}</div>
              <div>
                <div className="text-white font-medium">
                  {t("tournaments.yourPosition")}
                </div>
                <div className="text-blue-400/60 text-sm">
                  {t("tournaments.outOfParticipants", {
                    total: totalParticipants,
                  })}
                </div>
              </div>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => {
                // Scroll to user in full leaderboard or navigate to game
              }}
            >
              {t("tournaments.playGame")}
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-0 rounded-lg overflow-hidden border border-white/10">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 bg-white/5">
            <Trophy className="text-white/40 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-bold text-white/80 mb-2">
              {t("tournaments.leaderboard.empty")}
            </h3>
            <p className="text-white/60">
              {t("tournaments.leaderboard.beFirst")}
            </p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={`${entry.user_id}-${entry.position}`}
              className={`
                flex items-center justify-between p-4 transition-all duration-200
                ${getPositionStyling(entry.position, entry.isCurrentUser || false)}
                ${index !== leaderboard.length - 1 ? "border-b border-white/10" : ""}
              `}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getPositionIcon(entry.position)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-medium truncate ${
                        entry.isCurrentUser
                          ? "text-white"
                          : entry.position <= 3
                            ? "text-white"
                            : "text-white/90"
                      }`}
                    >
                      {entry.first_name} {entry.last_name || ""}
                    </span>
                    {entry.isCurrentUser && (
                      <div className="flex-shrink-0 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded">
                        {t("leaderboard.you")}
                      </div>
                    )}
                  </div>
                  {entry.username && (
                    <div className="text-xs text-white/50 truncate">
                      @{entry.username}
                    </div>
                  )}
                  <div className="text-xs text-white/60 mt-1">
                    {entry.games_played} {t("tournaments.gamesPlayed")} •{" "}
                    {formatLastPlayed(entry.last_game_at)}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className={`text-lg font-bold ${
                    entry.position === 1
                      ? "text-yellow-400"
                      : entry.position === 2
                        ? "text-gray-300"
                        : entry.position === 3
                          ? "text-amber-500"
                          : "text-white"
                  }`}
                >
                  {formatScore(entry.best_score)}
                </div>
                <div className="text-xs text-white/50">
                  {t("tournaments.bestScore")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button (if needed) */}
      {leaderboard.length < totalParticipants && (
        <div className="text-center pt-4">
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-medium transition-all duration-200">
            {t("tournaments.leaderboard.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
