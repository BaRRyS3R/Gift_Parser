// src/app/tournament/page.tsx - Minimalist tournament page with improved localization

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Clock,
    Target,
    Users,
    Play,
    AlertTriangle,
    Crown,
    Medal,
    Award,
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
                loadTournamentData();
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
                return <Crown className="text-white" size={16} />;
            case 2:
                return <Medal className="text-white/80" size={16} />;
            case 3:
                return <Award className="text-white/60" size={16} />;
            default:
                return (
                    <span className="text-white/50 text-sm font-medium">#{position}</span>
                );
        }
    };

    const getRankBg = (position: number) => {
        switch (position) {
            case 1:
                return "bg-white/20 border-white/40";
            case 2:
                return "bg-white/15 border-white/30";
            case 3:
                return "bg-white/10 border-white/25";
            default:
                return "bg-white/5 border-white/20";
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
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-sm
          ${getRankBg(position)}
          ${isCurrentUser(entry.telegram_id)
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
                            className={`font-medium truncate text-sm ${isCurrentUser(entry.telegram_id)
                                ? "text-white"
                                : "text-white/90"
                                }`}
                        >
                            {entry.first_name} {entry.last_name || ""}
                        </h3>
                        {entry.is_premium && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded text-xs">
                                {t("leaderboard.you")}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/50 truncate">@{entry.username}</p>
                    )}
                    {prize && (
                        <div className="flex items-center space-x-1 mt-1">
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                            <span className="text-xs text-white/70">{prize}</span>
                        </div>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-base font-medium text-white">
                        {formatTournamentSurvivalTime(entry.survival_time)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-white/60">
                        <div className="flex items-center space-x-1">
                            <TrendingUp size={8} />
                            <span>L{entry.max_level_reached}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Target size={8} />
                            <span>{entry.perfect_streak}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Activity size={8} />
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
            if (isEmpty) return "bg-red-500/10 border-red-400/20";
            if (isLow) return "bg-orange-500/10 border-orange-400/20";
            return "bg-white/5 border-white/20";
        };

        return (
            <div className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${getBatteryBgColor()}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Battery className={getBatteryColor()} size={16} />
                        <span className={`text-sm font-medium ${getBatteryColor()}`}>
                            {t("attempts.current")}
                        </span>
                    </div>
                    <span className={`text-lg font-medium ${getBatteryColor()}`}>
                        {attemptsRemaining}
                    </span>
                </div>

                <div className="mb-2">
                    <div
                        className={`w-full h-1.5 rounded-full overflow-hidden ${isEmpty
                            ? "bg-red-400/20"
                            : isLow
                                ? "bg-orange-400/20"
                                : "bg-white/20"
                            }`}
                    >
                        <div
                            className={`h-full transition-all duration-500 ${getBatteryColor().replace("text-", "bg-")}`}
                            style={{ width: `${getBatteryLevel()}%` }}
                        />
                    </div>
                </div>

                {isEmpty && (
                    <div className="space-y-3 mt-3">
                        <div className="text-center space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                                <AlertTriangle className="text-red-400" size={16} />
                                <span className="text-sm text-red-300">
                                    {t("attempts.noRemaining")}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenShop}
                            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/15 hover:border-white/30 transition-all duration-300"
                        >
                            <ShoppingCart size={14} />
                            <span className="text-sm">
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
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">{t("tournament.loadingTournament")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Trophy className="text-white/40 mx-auto" size={32} />
                    <p className="text-white/60">{error}</p>
                    <button
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
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
                    <div className="text-4xl mb-4">🏆</div>
                    <h1 className="text-2xl font-medium text-white">{t("tournament.noActiveTournament")}</h1>
                    <p className="text-white/60 text-sm leading-relaxed">
                        {t("tournament.noActiveTournamentDesc")}
                    </p>
                    <button
                        className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300"
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
                        <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <Trophy className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-medium text-white">{tournament.name}</h1>
                            <p className="text-white/60 text-sm">{t("tournament.tournamentActive")}</p>
                        </div>
                    </div>

                    {timeRemaining && (
                        <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                <Clock className="text-white/80" size={16} />
                                <span className="text-white font-medium">{timeRemaining}</span>
                                <span className="text-white/60">{t("tournament.timeRemaining")}</span>
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
            w-full px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300
            ${attemptsRemaining > 0 && !isTransitioning
                            ? "bg-white/10 border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
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
                <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <Trophy className="text-white/80" size={16} />
                        <h3 className="text-sm font-medium text-white">{t("tournament.prizes")}</h3>
                    </div>
                    <div className="space-y-2">
                        {tournament.prizes.map((prize, index) => (
                            <div
                                key={index}
                                className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg border border-white/10"
                            >
                                {getRankIcon(index + 1)}
                                <span className="text-white/80 text-sm">{prize}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User's Result */}
            {userResult && (
                <div className="mb-6">
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Target className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">{t("tournament.yourBestResult")}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-lg font-medium text-white">
                                    {formatTournamentSurvivalTime(userResult.survival_time)}
                                </div>
                                <div className="text-xs text-white/60">{t("common.time")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">#{userResult.rank || "?"}</div>
                                <div className="text-xs text-white/60">{t("tournament.rank")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">L{userResult.max_level_reached}</div>
                                <div className="text-xs text-white/60">{t("common.level")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            <div className="space-y-4">
                {winners.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Crown className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">
                                {t("tournament.winners")} ({winners.length}/{prizeCount})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {winners.map((entry, index) => renderLeaderboardEntry(entry, index + 1))}
                        </div>
                    </div>
                )}

                {otherParticipants.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Users className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">
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
                    <div className="bg-white/5 border border-white/20 rounded-xl p-6 text-center">
                        <Trophy className="text-white/40 mx-auto mb-3" size={32} />
                        <p className="text-white/60">{t("tournament.noParticipants")}</p>
                        <p className="text-white/40 text-sm mt-1">{t("tournament.beFirstParticipant")}</p>
                    </div>
                )}
            </div>

            {/* Statistics */}
            {leaderboard.length > 0 && (
                <div className="mt-6 mb-8">
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-lg font-medium text-white">{leaderboard.length}</div>
                                <div className="text-xs text-white/60">{t("tournament.participants")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">
                                    {formatTournamentSurvivalTime(leaderboard[0]?.survival_time || 0)}
                                </div>
                                <div className="text-xs text-white/60">{t("tournament.bestTime")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">
                                    L{Math.max(...leaderboard.map(e => e.max_level_reached), 0)}
                                </div>
                                <div className="text-xs text-white/60">{t("tournament.maxLevel")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}