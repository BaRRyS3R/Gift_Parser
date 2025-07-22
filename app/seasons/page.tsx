// src/app/seasons/page.tsx - Seasons page with current season data and leaderboard

"use client";

import type {
    CompleteSeasonData,
    SeasonLeaderboardEntry,
} from "@/hooks/modules/useSeasons";

import { useState, useEffect } from "react";
import {
    Crown,
    Medal,
    Award,
    Calendar,
    Gift,
    Crosshair,
    Clock,
    Users,
    Star,
    TrendingUp,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useSeasons } from "@/hooks/modules/useSeasons";
import { formatSurvivalTime } from "@/utils/timeFormatter";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";

function SeasonsPageContent() {
    const { user, makeAuthenticatedRequest } = useUser();
    const {
        seasonData,
        isLoading,
        error,
        fetchCurrentSeason,
        clearError,
        isUserInTopLeaderboard,
        getUserPosition,
        isSeasonActive,
        getTimeRemaining,
    } = useSeasons(makeAuthenticatedRequest);

    const t = useT();
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

    // Load season data on mount
    useEffect(() => {
        fetchCurrentSeason();
    }, [fetchCurrentSeason]);

    // Set up countdown timer for active season
    useEffect(() => {
        if (!seasonData?.isActive || !seasonData.timeRemaining) {
            setTimeRemaining(null);
            return;
        }

        const updateTimer = () => {
            const remaining = getTimeRemaining();
            setTimeRemaining(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [seasonData, getTimeRemaining]);

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

    const renderLeaderboardEntry = (entry: SeasonLeaderboardEntry) => {
        return (
            <div
                key={`season-${entry.position}`}
                className={`
          relative overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5 border border-white/20
          hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
          transition-all duration-200
          ${entry.isCurrentUser ? "ring-1 ring-blue-400/60 bg-blue-500/25" : ""}
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
                                    {getRankIcon(entry.position)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3
                                            className={`font-bold truncate text-sm ${entry.isCurrentUser ? "text-white" : "text-white/90"
                                                }`}
                                        >
                                            {entry.first_name} {entry.last_name || ""}
                                        </h3>
                                        {entry.isCurrentUser && (
                                            <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                                                You
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
                                        <span>{formatSurvivalTime(entry.survival_best_time)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Users size={10} />
                                        <span>{entry.survival_games}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-white">
                                        {entry.survival_best_score}
                                    </div>
                                    <div className="text-xs text-white/60">points</div>
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
        await fetchCurrentSeason();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">Loading season data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Calendar className="text-white/60 mx-auto" size={32} />
                    <p className="text-white/80">{error}</p>
                    <button
                        className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                        onClick={handleRefresh}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!seasonData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                    <Calendar className="text-white/60 mx-auto" size={48} />
                    <h2 className="text-2xl font-bold text-white">No Active Season</h2>
                    <p className="text-white/70 max-w-md">
                        There is currently no active season running. Check back later for upcoming seasonal competitions.
                    </p>
                    <button
                        className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                        onClick={handleRefresh}
                    >
                        Check Again
                    </button>
                </div>
            </div>
        );
    }

    const { season, leaderboard, userStats } = seasonData;
    const userPosition = getUserPosition();
    const isUserInTop = isUserInTopLeaderboard();
    const isActive = isSeasonActive();

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Header */}
            <div className="text-center space-y-4 mb-6 pt-6">
                <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
                    SEASONS
                </h1>
            </div>

            {/* Season Information */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg p-6">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {season.name}
                        </h2>
                        <div className="flex items-center justify-center space-x-4 text-sm text-white/70">
                            <div className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>
                                    {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                                </span>
                            </div>
                            {isActive && timeRemaining && (
                                <div className="flex items-center space-x-1 text-green-400">
                                    <Clock size={14} />
                                    <span>{timeRemaining} remaining</span>
                                </div>
                            )}
                            {!isActive && new Date() < new Date(season.start_date) && (
                                <div className="flex items-center space-x-1 text-yellow-400">
                                    <Clock size={14} />
                                    <span>Starts {new Date(season.start_date).toLocaleDateString()}</span>
                                </div>
                            )}
                            {!isActive && new Date() > new Date(season.end_date) && (
                                <div className="flex items-center space-x-1 text-red-400">
                                    <Clock size={14} />
                                    <span>Ended</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prizes */}
                    <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Gift className="text-yellow-400" size={16} />
                            <h3 className="text-lg font-bold text-white">Prizes</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {season.prizes.map((prize, index) => (
                                <div
                                    key={index}
                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-center"
                                >
                                    <div className="text-white/60">#{index + 1}</div>
                                    <div className="text-white font-medium">{prize}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* User Statistics (if not in top 10) */}
            {userStats.survival_games > 0 && userPosition && !isUserInTop && (
                <div className="mb-6">
                    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <Star className="text-blue-400" size={16} />
                            <span className="text-blue-300 font-bold">Your Position</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-2xl font-bold text-white">
                                    #{userPosition}
                                </span>
                                <div className="text-blue-300/80 text-sm">
                                    {userStats.survival_best_score} points • {formatSurvivalTime(userStats.survival_best_time)}
                                </div>
                            </div>
                            <div className="text-right text-sm text-blue-300/80">
                                {userStats.survival_games} games played
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Stats */}
            {leaderboard.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-center space-x-4 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg p-3 text-sm">
                        <div className="flex items-center space-x-1">
                            <TrendingUp className="text-white/80" size={14} />
                            <span className="font-bold text-white">Top {leaderboard.length}</span>
                        </div>
                        <div className="w-px h-4 bg-white/30" />
                        <div className="flex items-center space-x-1">
                            <Crosshair className="text-red-400/80" size={14} />
                            <span className="text-white/70 text-xs">Survival Mode</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Season Leaderboard */}
            <div className="space-y-4">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg">
                        <Crosshair className="text-red-400/60 mx-auto mb-3" size={32} />
                        <p className="font-bold text-white/80">No Players Yet</p>
                        <p className="text-sm mt-1 text-white/60">
                            Be the first to compete in this season!
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-3 max-h-[50vh] overflow-y-auto">
                        {leaderboard.map((entry) => renderLeaderboardEntry(entry))}
                    </div>
                )}
            </div>

            {/* Bottom spacing for safe area */}
            <div className="h-24" />
        </div>
    );
}

export default function SeasonsPage() {
    return (
        <AuthGuard requireCompleteAuth={true} showError={true}>
            <SeasonsPageContent />
        </AuthGuard>
    );
}