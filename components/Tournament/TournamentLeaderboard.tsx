// src/components/Tournament/TournamentLeaderboard.tsx - Fixed with null safety

"use client";

import React from "react";
import { Trophy, Medal, Award, Users, Target } from "lucide-react";
import type { TournamentLeaderboardEntry, TournamentStats } from "@/types/tournaments";
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
    leaderboard = [],
    userPosition,
    totalParticipants = 0,
    stats = {} as TournamentStats,
    isLoading = false,
    gameMode = "survival",
}: TournamentLeaderboardProps) {
    const t = useT();

    // Safe formatting functions with null checks
    const safeToLocaleString = (value: number | null | undefined): string => {
        if (value == null || isNaN(value)) return "0";
        return Math.floor(value).toLocaleString();
    };

    const formatScore = (score: number | null | undefined): string => {
        return safeToLocaleString(score);
    };

    const formatLastPlayed = (lastPlayed?: string | null): string => {
        if (!lastPlayed) return "-";

        try {
            const date = new Date(lastPlayed);
            if (isNaN(date.getTime())) return "-";

            const now = new Date();
            const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

            if (diffInHours < 1) return t("tournaments.time.justNow");
            if (diffInHours < 24) return t("tournaments.time.hoursAgo", { hours: diffInHours });

            const diffInDays = Math.floor(diffInHours / 24);
            return t("tournaments.time.daysAgo", { days: diffInDays });
        } catch (error) {
            console.error("Error formatting date:", error);
            return "-";
        }
    };

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

    // Safe access to stats properties with defaults
    const safeStats = {
        total_participants: stats?.total_participants ?? totalParticipants,
        total_games_played: stats?.total_games_played ?? 0,
        highest_score: stats?.highest_score ?? 0,
        average_score: stats?.average_score ?? 0,
        games_per_day: stats?.games_per_day ?? [],
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                        <div className="h-16 bg-white/5 rounded-lg border border-white/10"></div>
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
                        {safeToLocaleString(safeStats.total_participants)}
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
                        {safeToLocaleString(safeStats.total_games_played)}
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
                        {formatScore(safeStats.highest_score)}
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                        <span className="text-purple-400 text-sm font-medium">
                            {t("tournaments.stats.avgScore")}
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {formatScore(safeStats.average_score)}
                    </div>
                </div>
            </div>

            {/* Current User Position (if not in top) */}
            {userPosition && userPosition > leaderboard.length && (
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="text-blue-400 font-bold">
                                #{userPosition}
                            </div>
                            <div>
                                <div className="text-white font-medium">
                                    {t("tournaments.yourPosition")}
                                </div>
                                <div className="text-blue-400/60 text-sm">
                                    {t("tournaments.outOfParticipants", { total: safeStats.total_participants })}
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
                {!leaderboard || leaderboard.length === 0 ? (
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
                    leaderboard.map((entry, index) => {
                        // Safe access to entry properties with defaults
                        const safeEntry = {
                            position: entry?.position ?? index + 1,
                            user_id: entry?.user_id ?? `unknown_${index}`,
                            first_name: entry?.first_name ?? "Unknown",
                            last_name: entry?.last_name ?? "",
                            username: entry?.username ?? "",
                            best_score: entry?.best_score ?? 0,
                            games_played: entry?.games_played ?? 0,
                            total_score: entry?.total_score ?? 0,
                            last_game_at: entry?.last_game_at ?? null,
                            isCurrentUser: entry?.isCurrentUser ?? false,
                        };

                        return (
                            <div
                                key={`${safeEntry.user_id}-${safeEntry.position}`}
                                className={`
                                    flex items-center justify-between p-4 transition-all duration-200
                                    ${getPositionStyling(safeEntry.position, safeEntry.isCurrentUser)}
                                    ${index !== leaderboard.length - 1 ? "border-b border-white/10" : ""}
                                `}
                            >
                                <div className="flex items-center space-x-4 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        {getPositionIcon(safeEntry.position)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className={`font-medium truncate ${safeEntry.isCurrentUser
                                                    ? "text-white"
                                                    : safeEntry.position <= 3
                                                        ? "text-white"
                                                        : "text-white/90"
                                                }`}>
                                                {safeEntry.first_name} {safeEntry.last_name}
                                            </span>
                                            {safeEntry.isCurrentUser && (
                                                <div className="flex-shrink-0 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded">
                                                    {t("leaderboard.you")}
                                                </div>
                                            )}
                                        </div>
                                        {safeEntry.username && (
                                            <div className="text-xs text-white/50 truncate">
                                                @{safeEntry.username}
                                            </div>
                                        )}
                                        <div className="text-xs text-white/60 mt-1">
                                            {safeToLocaleString(safeEntry.games_played)} {t("tournaments.gamesPlayed")} • {formatLastPlayed(safeEntry.last_game_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <div className={`text-lg font-bold ${safeEntry.position === 1
                                            ? "text-yellow-400"
                                            : safeEntry.position === 2
                                                ? "text-gray-300"
                                                : safeEntry.position === 3
                                                    ? "text-amber-500"
                                                    : "text-white"
                                        }`}>
                                        {formatScore(safeEntry.best_score)}
                                    </div>
                                    <div className="text-xs text-white/50">
                                        {t("tournaments.bestScore")}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Load More Button (if needed) */}
            {leaderboard && leaderboard.length < safeStats.total_participants && (
                <div className="text-center pt-4">
                    <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-medium transition-all duration-200">
                        {t("tournaments.leaderboard.loadMore")}
                    </button>
                </div>
            )}
        </div>
    );
}