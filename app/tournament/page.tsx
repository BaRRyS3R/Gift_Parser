// src/app/tournament/page.tsx - Полностью локализованная турнирная страница

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Clock,
    Target,
    Users,
    Gift,
    Star,
    Play,
    AlertTriangle,
    Crown,
    Medal,
    Award,
    Zap,
    Activity,
    TrendingUp,
    ShoppingCart,
    Battery,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService } from "@/lib/supabase";
import { tournamentService, formatTournamentSurvivalTime } from "@/lib/supabase_tournament_extension";
import type { Tournament, TournamentLeaderboardEntry, TournamentResult, TournamentStatus } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

export default function TournamentPage() {
    const router = useRouter();
    const { user, telegramUser } = useUser();
    const t = useT();

    const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
        isActive: false,
        activeTournament: null,
    });
    const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
    const [userResult, setUserResult] = useState<TournamentResult | null>(null);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [isTransitioning, setIsTransitioning] = useState(false);

    const loadTournamentData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const status = await tournamentService.getTournamentStatus();
            setTournamentStatus(status);

            if (status.activeTournament) {
                const [tournamentLeaderboard, userTournamentResult] = await Promise.all([
                    tournamentService.getTournamentLeaderboard(status.activeTournament.id),
                    user?.id ? tournamentService.getUserTournamentResult(status.activeTournament.id, user.id) : null
                ]);

                setLeaderboard(tournamentLeaderboard);
                setUserResult(userTournamentResult);
            }

            // Load user attempts
            if (telegramUser?.id) {
                const attemptsStatus = await userService.checkAndUpdateAttemptsWithServerValidation(telegramUser.id);
                setAttemptsRemaining(attemptsStatus.attemptsRemaining);
            }

        } catch (err) {
            console.error("Error loading tournament data:", err);
            setError(t("tournament.tournamentNotFound"));
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, telegramUser?.id, t]);

    useEffect(() => {
        loadTournamentData();
    }, [loadTournamentData]);

    // Update countdown timer
    useEffect(() => {
        if (!tournamentStatus.activeTournament || !tournamentStatus.timeRemaining) {
            setTimeRemaining("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const endDate = new Date(tournamentStatus.activeTournament!.end_date);
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(t("tournament.ended"));
                clearInterval(interval);
                loadTournamentData(); // Reload to update status
            } else {
                setTimeRemaining(formatTimeRemaining(diff));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [tournamentStatus.activeTournament, tournamentStatus.timeRemaining, loadTournamentData, t]);

    const handleStartTournament = useCallback(async () => {
        if (!tournamentStatus.activeTournament || attemptsRemaining <= 0 || isTransitioning) return;

        setIsTransitioning(true);
        setTimeout(() => {
            router.push("/tournament/play");
        }, 600);
    }, [tournamentStatus.activeTournament, attemptsRemaining, isTransitioning, router]);

    const handleOpenShop = () => {
        router.push("/shop");
    };

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
                    <span className="text-yellow-400/60 text-sm font-bold">#{position}</span>
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
                return "bg-yellow-500/10 border-yellow-400/30";
        }
    };

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId;
    };

    const renderLeaderboardEntry = (entry: TournamentLeaderboardEntry, position: number) => {
        const isWinner = position <= (tournamentStatus.activeTournament?.prizes.length || 0);
        const prize = isWinner ? tournamentStatus.activeTournament?.prizes[position - 1] : null;

        return (
            <div
                key={entry.id}
                className={`
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
          ${getRankBg(position)}
          ${isCurrentUser(entry.telegram_id)
                        ? "ring-1 ring-yellow-400/60 bg-yellow-500/25"
                        : "hover:bg-yellow-500/15"
                    }
        `}
            >
                <div className="flex items-center justify-center w-8">
                    {getRankIcon(position)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3
                            className={`font-bold truncate text-sm ${isCurrentUser(entry.telegram_id)
                                ? "text-yellow-200"
                                : "text-yellow-300"
                                }`}
                        >
                            {entry.first_name} {entry.last_name || ""}
                        </h3>
                        {entry.is_premium && (
                            <Star className="text-yellow-400 flex-shrink-0" size={12} />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded border border-yellow-400/30">
                                {t("leaderboard.you")}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-yellow-300/60 truncate">@{entry.username}</p>
                    )}
                    {prize && (
                        <div className="flex items-center space-x-1 mt-1">
                            <Gift className="text-yellow-400" size={10} />
                            <span className="text-xs text-yellow-400 font-bold">{prize}</span>
                        </div>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-lg font-bold text-yellow-300">
                        {formatTournamentSurvivalTime(entry.survival_time)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-yellow-400/80">
                        <div className="flex items-center space-x-1">
                            <TrendingUp size={10} />
                            <span>L{entry.max_level_reached}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Target size={10} />
                            <span>{entry.perfect_streak}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Activity size={10} />
                            <span>{entry.correct_hits}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AttemptsDisplay = () => {
        const isEmpty = attemptsRemaining === 0;
        const isLow = attemptsRemaining <= 2 && attemptsRemaining > 0;

        const getBatteryLevel = () => {
            if (attemptsRemaining <= 0) return 0;
            if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
            return 100;
        };

        const getBatteryColor = () => {
            if (isEmpty) return "text-red-400";
            if (isLow) return "text-orange-400";
            return "text-green-400";
        };

        const getBatteryBgColor = () => {
            if (isEmpty) return "bg-red-500/20 border-red-400/40";
            if (isLow) return "bg-orange-500/20 border-orange-400/40";
            return "bg-yellow-500/10 border-yellow-400/30";
        };

        return (
            <div className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${getBatteryBgColor()}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Battery className={getBatteryColor()} size={18} />
                        <span className={`text-sm font-bold ${getBatteryColor()}`}>
                            {t("attempts.current")}
                        </span>
                    </div>
                    <span className={`text-lg font-bold ${getBatteryColor()}`}>
                        {attemptsRemaining}
                    </span>
                </div>

                <div className="mb-3">
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isEmpty ? "bg-red-400/20" : isLow ? "bg-orange-400/20" : "bg-yellow-400/20"
                        }`}>
                        <div
                            className={`h-full transition-all duration-500 ${getBatteryColor().replace("text-", "bg-")}`}
                            style={{ width: `${getBatteryLevel()}%` }}
                        />
                    </div>
                </div>

                {isEmpty && (
                    <div className="space-y-3">
                        <div className="text-center space-y-2">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <AlertTriangle className="text-red-400" size={18} />
                                <span className="text-sm font-bold text-red-300">
                                    {t("attempts.noRemaining")}
                                </span>
                            </div>
                            <p className="text-red-400/80 text-xs">
                                {t("attempts.noRemaining")}
                            </p>
                        </div>

                        <button
                            onClick={handleOpenShop}
                            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:from-yellow-500/30 hover:to-orange-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            <ShoppingCart size={16} />
                            <span className="font-bold text-sm">
                                {t("nav.shop")}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto" />
                    <p className="text-yellow-300">{t("tournament.loadingTournament")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Trophy className="text-yellow-400/60 mx-auto" size={32} />
                    <p className="text-yellow-300/80">{error}</p>
                    <button
                        className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        {t("common.retry")}
                    </button>
                </div>
            </div>
        );
    }

    if (!tournamentStatus.isActive || !tournamentStatus.activeTournament) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="text-6xl mb-4">🏆</div>
                    <h1 className="text-3xl font-bold text-yellow-400">{t("tournament.noActiveTournament")}</h1>
                    <p className="text-yellow-300/80">
                        {t("tournament.noActiveTournamentDesc")}
                    </p>
                    <button
                        className="px-6 py-3 bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 rounded-xl hover:bg-yellow-500/30 hover:border-yellow-400/60 transition-all duration-300"
                        onClick={() => router.push("/main")}
                    >
                        {t("common.back")}
                    </button>
                </div>
            </div>
        );
    }

    const tournament = tournamentStatus.activeTournament;
    const prizeCount = tournament.prizes.length;
    const winners = leaderboard.slice(0, prizeCount);
    const otherParticipants = leaderboard.slice(prizeCount);

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Header */}
            <div className="mb-6">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-400/30 rounded-lg flex items-center justify-center">
                            <Trophy className="text-yellow-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-yellow-400">{tournament.name}</h1>
                            <p className="text-yellow-300/60 text-sm">{t("tournament.tournamentActive")}</p>
                        </div>
                    </div>

                    {timeRemaining && (
                        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                <Clock className="text-yellow-400" size={16} />
                                <span className="text-yellow-300 font-bold">{timeRemaining}</span>
                                <span className="text-yellow-400/60">{t("tournament.timeRemaining")}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Attempts Display */}
            <div className="mb-6">
                <AttemptsDisplay />
            </div>

            {/* Tournament Entry Button */}
            <div className="mb-6">
                <button
                    className={`
            w-full px-6 py-4 rounded-xl text-lg font-bold transition-all duration-300
            ${attemptsRemaining > 0 && !isTransitioning
                            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/60 text-yellow-300 hover:border-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 hover:scale-105 active:scale-95"
                            : "bg-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed opacity-50"
                        }
          `}
                    disabled={attemptsRemaining <= 0 || isTransitioning}
                    onClick={handleStartTournament}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <Play size={20} />
                        <span>
                            {isTransitioning
                                ? t("game.general.initializingGame")
                                : attemptsRemaining > 0
                                    ? t("tournament.enterTournament")
                                    : t("game.general.noAttemptsLeft")}
                        </span>
                    </div>
                </button>
            </div>

            {/* Prizes Section */}
            <div className="mb-6">
                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <Gift className="text-yellow-400" size={16} />
                        <h3 className="text-sm font-bold text-yellow-300">{t("tournament.prizes")}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {tournament.prizes.map((prize, index) => (
                            <div
                                key={index}
                                className="flex items-center space-x-3 p-2 bg-yellow-500/5 rounded-lg border border-yellow-400/20"
                            >
                                {getRankIcon(index + 1)}
                                <span className="text-yellow-300 font-medium">{prize}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User's Result */}
            {userResult && (
                <div className="mb-6">
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Target className="text-yellow-400" size={16} />
                            <h3 className="text-sm font-bold text-yellow-300">{t("tournament.yourBestResult")}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-lg font-bold text-yellow-300">
                                    {formatTournamentSurvivalTime(userResult.survival_time)}
                                </div>
                                <div className="text-xs text-yellow-400/60">{t("common.time")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-yellow-300">#{userResult.rank || "?"}</div>
                                <div className="text-xs text-yellow-400/60">{t("tournament.rank")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-yellow-300">L{userResult.max_level_reached}</div>
                                <div className="text-xs text-yellow-400/60">{t("common.level")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            <div className="space-y-4">
                {winners.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Crown className="text-yellow-400" size={16} />
                            <h3 className="text-sm font-bold text-yellow-300">
                                {t("tournament.winners")} ({winners.length}/{prizeCount})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {winners.map((entry, index) => renderLeaderboardEntry(entry, index + 1))}
                        </div>
                    </div>
                )}

                {otherParticipants.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Users className="text-yellow-400" size={16} />
                            <h3 className="text-sm font-bold text-yellow-300">
                                {t("tournament.otherParticipants")} ({otherParticipants.length})
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {otherParticipants.map((entry, index) =>
                                renderLeaderboardEntry(entry, index + prizeCount + 1)
                            )}
                        </div>
                    </div>
                )}

                {leaderboard.length === 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-6 text-center">
                        <Trophy className="text-yellow-400/60 mx-auto mb-3" size={32} />
                        <p className="text-yellow-300/80 font-bold">{t("tournament.noParticipants")}</p>
                        <p className="text-yellow-400/60 text-sm mt-1">{t("tournament.beFirstParticipant")}</p>
                    </div>
                )}
            </div>

            {/* Statistics */}
            {leaderboard.length > 0 && (
                <div className="mt-6 mb-8">
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-lg font-bold text-yellow-300">{leaderboard.length}</div>
                                <div className="text-xs text-yellow-400/60">{t("tournament.participants")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-yellow-300">
                                    {formatTournamentSurvivalTime(leaderboard[0]?.survival_time || 0)}
                                </div>
                                <div className="text-xs text-yellow-400/60">{t("tournament.bestTime")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-yellow-300">
                                    L{Math.max(...leaderboard.map(e => e.max_level_reached), 0)}
                                </div>
                                <div className="text-xs text-yellow-400/60">{t("tournament.maxLevel")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}