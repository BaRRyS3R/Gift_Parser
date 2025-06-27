// src/app/tournament/page.tsx - Updated tournament page with points-based leaderboard

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
} from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Target,
    Users,
    Play,
    Crown,
    Medal,
    Award,
    Activity,
    TrendingUp,
    Info,
    AlertTriangle,
    BookOpen,
    ChevronDown,
    ChevronUp,
    BarChart3,
    List,
    ShoppingCart,
    Star,
    Zap
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService } from "@/lib/supabase";
import {
    tournamentService,
    formatTournamentSurvivalTime,
    formatTournamentPoints
} from "@/lib/supabase_tournament_extension";
import type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus
} from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

type RuleTabId = "gameMode" | "competition" | "scoring" | "format" | "fairPlay" | "tips";
type MainTabId = "tournament" | "leaderboard";

export default function TournamentPage() {
    const router = useRouter();
    const { user } = useUser();
    const t = useT();

    const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
        isActive: false,
        activeTournament: null,
    });
    const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
    const [userResult, setUserResult] = useState<TournamentResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [activeRuleTab, setActiveRuleTab] = useState<RuleTabId>("gameMode");
    const [activeMainTab, setActiveMainTab] = useState<MainTabId>("tournament");
    const [isPrizesExpanded, setIsPrizesExpanded] = useState(false);
    const [attemptsResetTime, setAttemptsResetTime] = useState<string>("");
    const [tournamentStats, setTournamentStats] = useState<{
        totalParticipants: number;
        totalPointsAwarded: number;
        topScore: number;
        topSurvivalTime: number;
    } | null>(null);

    // Helper functions for rule descriptions (keeping existing logic)
    const getRuleDescription = (ruleId: RuleTabId) => {
        switch (ruleId) {
            case "gameMode":
                return t("tournament.rules.gameMode.description");
            case "competition":
                return t("tournament.rules.competition.description");
            case "scoring":
                return t("tournament.rules.scoring.description");
            case "format":
                return t("tournament.rules.format.description");
            case "fairPlay":
                return t("tournament.rules.fairPlay.description");
            case "tips":
                return t("tournament.rules.tips.description");
            default:
                return "";
        }
    };

    const getRuleTitle = (ruleId: RuleTabId) => {
        switch (ruleId) {
            case "gameMode":
                return t("tournament.rules.gameMode.title");
            case "competition":
                return t("tournament.rules.competition.title");
            case "scoring":
                return t("tournament.rules.scoring.title");
            case "format":
                return t("tournament.rules.format.title");
            case "fairPlay":
                return t("tournament.rules.fairPlay.title");
            case "tips":
                return t("tournament.rules.tips.title");
            default:
                return "";
        }
    };

    // Check if user has attempts remaining
    const hasAttemptsRemaining = () => {
        return user?.attempts_remaining && user.attempts_remaining > 0;
    };

    // Update attempts reset timer
    useEffect(() => {
        if (!user?.attempts_reset_at || hasAttemptsRemaining()) {
            setAttemptsResetTime("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const resetTime = new Date(user.attempts_reset_at!);
            const diff = resetTime.getTime() - now.getTime();

            if (diff <= 0) {
                setAttemptsResetTime("");
                clearInterval(interval);
            } else {
                setAttemptsResetTime(formatTimeRemaining(diff));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user?.attempts_reset_at, user?.attempts_remaining]);

    const loadTournamentData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const status = await tournamentService.getTournamentStatus();
            setTournamentStatus(status);

            if (status.activeTournament) {
                const [tournamentLeaderboard, userTournamentResult, statistics] = await Promise.all([
                    tournamentService.getTournamentLeaderboard(status.activeTournament.id, 50),
                    user?.id ? tournamentService.getUserTournamentResult(status.activeTournament.id, user.id) : null,
                    tournamentService.getTournamentStatistics(status.activeTournament.id)
                ]);

                setLeaderboard(tournamentLeaderboard);
                setUserResult(userTournamentResult);
                setTournamentStats(statistics);
            }

        } catch (err) {
            console.error("Error loading tournament data:", err);
            setError(t("tournament.tournamentNotFound"));
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, t]);

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

    // Setup Telegram WebApp back button
    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                router.push("/main");
            });

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(() => { });
            };
        }
    }, [router]);

    const handleStartTournament = useCallback(async () => {
        if (!tournamentStatus.activeTournament || isTransitioning || !hasAttemptsRemaining()) return;

        setIsTransitioning(true);
        setTimeout(() => {
            router.push("/tournament/play");
        }, 600);
    }, [tournamentStatus.activeTournament, isTransitioning, router]);

    const handleOpenRules = () => {
        setIsRulesModalOpen(true);
    };

    const handleCloseRules = () => {
        setIsRulesModalOpen(false);
    };

    const handleGoToShop = () => {
        router.push("/shop");
    };

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-yellow-400" size={16} />;
            case 2:
                return <Medal className="text-gray-300" size={16} />;
            case 3:
                return <Award className="text-yellow-600" size={16} />;
            default:
                return (
                    <span className="text-white/50 text-sm font-medium">#{position}</span>
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
                return "bg-yellow-600/20 border-yellow-500/40";
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
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
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
                    {/* Primary stat: Total Points */}
                    <div className="flex items-center space-x-1">
                        <Star className="text-yellow-400" size={12} />
                        <span className="text-base font-bold text-yellow-400">
                            {formatTournamentPoints(entry.total_points)}
                        </span>
                    </div>

                    {/* Secondary stats */}
                    <div className="flex items-center space-x-2 text-xs text-white/60">
                        <div className="flex items-center space-x-1">
                            <Clock size={8} />
                            <span>{formatTournamentSurvivalTime(entry.survival_time)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <TrendingUp size={8} />
                            <span>L{entry.max_level_reached}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Target size={8} />
                            <span>{entry.perfect_streak}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTournamentStats = () => {
        if (!tournamentStats || leaderboard.length === 0) return null;

        return (
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="text-white/80" size={16} />
                    <h3 className="text-sm font-medium text-white">{t("leaderboard.tournamentStats")}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-lg font-medium text-white">{tournamentStats.totalParticipants}</div>
                        <div className="text-xs text-white/60">{t("tournament.participants")}</div>
                    </div>
                    <div>
                        <div className="text-lg font-medium text-yellow-400">
                            {formatTournamentPoints(tournamentStats.topScore)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.topPoints")}</div>
                    </div>
                    <div>
                        <div className="text-lg font-medium text-white">
                            {formatTournamentSurvivalTime(tournamentStats.topSurvivalTime)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.bestTime")}</div>
                    </div>
                    <div>
                        <div className="text-lg font-medium text-white">
                            {formatTournamentPoints(tournamentStats.totalPointsAwarded)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.totalPoints")}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUserResult = () => {
        if (!userResult) return null;

        return (
            <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Target className="text-white/80" size={16} />
                    <h3 className="text-sm font-medium text-white">{t("tournament.yourBestResult")}</h3>
                </div>

                {/* Primary metric: Total Points */}
                <div className="bg-white/10 border border-white/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                        <Star className="text-yellow-400" size={18} />
                        <span className="text-xs text-white/60 uppercase tracking-wider">
                            {t("tournament.totalPoints")}
                        </span>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                            {formatTournamentPoints(userResult.total_points)}
                        </div>
                        <div className="text-xs text-white/60">
                            #{userResult.rank || "?"} {t("tournament.rank")}
                        </div>
                    </div>
                </div>

                {/* Secondary metrics */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <div className="text-sm font-medium text-white">
                            {formatTournamentSurvivalTime(userResult.survival_time)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.bestTime")}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white">L{userResult.max_level_reached}</div>
                        <div className="text-xs text-white/60">{t("common.level")}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white">{userResult.correct_hits}</div>
                        <div className="text-xs text-white/60">{t("tournament.totalHits")}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderNoAttemptsWarning = () => {
        if (hasAttemptsRemaining()) return null;

        return (
            <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center space-y-3">
                <div className="space-y-2">
                    <p className="text-white/60 text-sm">{t("attempts.noRemaining")}</p>
                    {attemptsResetTime && (
                        <div className="flex items-center justify-center space-x-2">
                            <Clock className="text-white/50" size={14} />
                            <p className="text-white/50 text-xs">
                                {t("attempts.resetTime")}: {attemptsResetTime}
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleGoToShop}
                    className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/15 hover:border-white/30 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto"
                >
                    <ShoppingCart size={16} />
                    <span className="text-sm">{t("shop.moreAttempts")}</span>
                </button>
            </div>
        );
    };

    // Tournament entry button with points emphasis
    const renderTournamentEntryButton = () => {
        return (
            <div className="space-y-3">
                <button
                    className={`
                        w-full px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300 relative overflow-hidden
                        ${!isTransitioning && hasAttemptsRemaining()
                            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 text-white hover:border-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
                        }
                    `}
                    disabled={isTransitioning || !hasAttemptsRemaining()}
                    onClick={handleStartTournament}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Play size={20} />
                            {hasAttemptsRemaining() && (
                                <Zap className="text-yellow-400" size={16} />
                            )}
                        </div>
                        <span>
                            {isTransitioning
                                ? t("game.general.initializingGame")
                                : !hasAttemptsRemaining()
                                    ? t("game.general.noAttempts")
                                    : t("tournament.enterTournament")}
                        </span>
                    </div>

                    {!isTransitioning && hasAttemptsRemaining() && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                </button>

                {hasAttemptsRemaining() && (
                    <p className="text-center text-xs text-yellow-400/80">
                        {t("tournament.earnPointsMessage")}
                    </p>
                )}
            </div>
        );
    };

    // Rest of the component remains similar with updated stats display
    // ... (keeping existing modal and other render functions)

    const renderTournamentTab = () => {
        return (
            <div className="space-y-4">
                {/* Tournament Rules Button */}
                <button
                    className="w-full px-6 py-3 rounded-xl text-base font-medium transition-all duration-300 bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30 hover:text-white hover:scale-[1.01] active:scale-[0.99]"
                    onClick={handleOpenRules}
                    disabled={isTransitioning}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <Info size={18} />
                        <span>{t("tournament.rulesButton")}</span>
                    </div>
                </button>

                {/* User's Result */}
                {renderUserResult()}

                {/* Tournament Entry Button */}
                {renderTournamentEntryButton()}

                {/* No attempts warning */}
                {renderNoAttemptsWarning()}
            </div>
        );
    };

    const renderLeaderboardTab = () => {
        const tournament = tournamentStatus.activeTournament;
        if (!tournament) return null;

        const prizeCount = tournament.prizes.length;
        const winners = leaderboard.slice(0, prizeCount);
        const otherParticipants = leaderboard.slice(prizeCount, 20);

        return (
            <div className="space-y-4">
                {/* Tournament Statistics */}
                {renderTournamentStats()}

                {winners.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Crown className="text-yellow-400" size={16} />
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
                                {t("tournament.otherParticipants")} (Top 20)
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
        );
    };

    // Loading and error states remain the same
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

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Header */}
            <div className="mb-6">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/40 rounded-lg flex items-center justify-center">
                            <Trophy className="text-yellow-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-medium text-white">{tournament.name}</h1>
                            <p className="text-yellow-400/80 text-sm">{t("tournament.pointsBasedCompetition")}</p>
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

            {/* Main Tabs */}
            <div className="mb-6">
                <div className="bg-white/5 border border-white/20 rounded-xl p-1 flex">
                    <button
                        onClick={() => setActiveMainTab("tournament")}
                        className={`
                            flex-1 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2
                            ${activeMainTab === "tournament"
                                ? "bg-white/10 border border-white/20 text-white"
                                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }
                        `}
                    >
                        <Trophy size={16} />
                        <span className="font-medium">{t("nav.tournament")}</span>
                    </button>
                    <button
                        onClick={() => setActiveMainTab("leaderboard")}
                        className={`
                            flex-1 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2
                            ${activeMainTab === "leaderboard"
                                ? "bg-white/10 border border-white/20 text-white"
                                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }
                        `}
                    >
                        <List size={16} />
                        <span className="font-medium">{t("nav.leaderboard")}</span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
                {activeMainTab === "tournament" ? renderTournamentTab() : renderLeaderboardTab()}
            </div>
        </div>
    );
}