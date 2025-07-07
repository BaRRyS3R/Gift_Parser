// src/app/tournament/page.tsx - Обновленная главная страница турниров

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Clock,
    Users,
    ChevronDown,
    ChevronUp,
    Play,
    Crown,
    Medal,
    Award,
    CalendarDays,
    Star,
    Activity,
    TrendingUp,
    Info,
    Zap,
    Target,
    BarChart3,
} from "lucide-react";

import { tournamentService, formatTournamentSurvivalTime } from "@/lib/supabase_tournament_extension";
import type {
    TournamentWithStatus,
    TournamentListResponse
} from "@/lib/supabase_tournament_extension";
import type { TournamentLeaderboardEntry } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";

interface ActiveTournamentSectionProps {
    tournament: TournamentWithStatus;
    leaderboard: TournamentLeaderboardEntry[];
    onPlayClick: () => void;
    onDetailsClick: () => void;
}

const ActiveTournamentSection: React.FC<ActiveTournamentSectionProps> = ({
    tournament,
    leaderboard,
    onPlayClick,
    onDetailsClick,
}) => {
    const t = useT();
    const { user } = useUser();
    const [timeDisplay, setTimeDisplay] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const endDate = new Date(tournament.end_date);
            const diff = endDate.getTime() - now.getTime();
            setTimeDisplay(diff > 0 ? formatTimeRemaining(diff) : t("tournament.ended"));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [tournament, t]);

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-white" size={16} />;
            case 2:
                return <Medal className="text-white/80" size={16} />;
            case 3:
                return <Award className="text-white/60" size={16} />;
            default:
                return <span className="text-white/50 text-sm font-medium">#{position}</span>;
        }
    };

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId;
    };

    const topParticipants = leaderboard.slice(0, 5);
    const hasAttemptsRemaining = user?.attempts_remaining && user.attempts_remaining > 0;

    return (
        <div className="space-y-6">
            {/* Tournament Header */}
            <div className="text-center space-y-4">
                <div className="relative">
                    <div className="w-20 h-20 bg-white/10 border-2 border-white/30 rounded-2xl flex items-center justify-center mx-auto animate-pulse-subtle">
                        <Trophy className="text-white" size={40} />
                        <div className="absolute -top-2 -right-2">
                            <div className="w-6 h-6 bg-white rounded-full animate-pulse flex items-center justify-center">
                                <Zap className="text-black" size={12} />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-bold text-white tracking-wide">{tournament.name}</h1>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 font-medium">{t("tournament.tournamentActive")}</span>
                    </div>
                </div>

                {timeDisplay && (
                    <div className="bg-white/10 border border-white/30 rounded-xl p-4">
                        <div className="flex items-center justify-center space-x-3">
                            <Clock className="text-white" size={20} />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white font-mono">{timeDisplay}</div>
                                <div className="text-white/60 text-sm">{t("tournament.timeRemaining")}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tournament Statistics */}
            <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <BarChart3 className="text-white/80" size={20} />
                    <h2 className="text-lg font-bold text-white">{t("tournament.tournamentStats")}</h2>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center mx-auto">
                            <Users className="text-white/80" size={20} />
                        </div>
                        <div className="text-2xl font-bold text-white">{leaderboard.length}</div>
                        <div className="text-xs text-white/60 uppercase tracking-wider">{t("tournament.participants")}</div>
                    </div>

                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center mx-auto">
                            <Trophy className="text-white/80" size={20} />
                        </div>
                        <div className="text-2xl font-bold text-white">{tournament.prizes.length}</div>
                        <div className="text-xs text-white/60 uppercase tracking-wider">{t("tournament.prizes")}</div>
                    </div>

                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center mx-auto">
                            <Star className="text-yellow-400" size={20} />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.survival_score)) : 0}
                        </div>
                        <div className="text-xs text-white/60 uppercase tracking-wider">{t("tournament.topScore")}</div>
                    </div>
                </div>
            </div>

            {/* Top Participants */}
            {topParticipants.length > 0 && (
                <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <Crown className="text-white/80" size={20} />
                        <h2 className="text-lg font-bold text-white">{t("tournament.topParticipants")}</h2>
                    </div>

                    <div className="space-y-3">
                        {topParticipants.map((participant, index) => (
                            <div
                                key={participant.id}
                                className={`
                                    flex items-center space-x-4 p-3 rounded-lg border transition-all duration-300
                                    ${isCurrentUser(participant.telegram_id)
                                        ? "bg-white/15 border-white/40 ring-1 ring-white/30"
                                        : "bg-white/5 border-white/20 hover:bg-white/10"
                                    }
                                `}
                            >
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(index + 1)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-medium text-sm ${isCurrentUser(participant.telegram_id) ? "text-white" : "text-white/90"}`}>
                                            {participant.first_name} {participant.last_name || ""}
                                        </span>
                                        {participant.is_premium && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                        )}
                                        {isCurrentUser(participant.telegram_id) && (
                                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
                                                {t("leaderboard.you")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
                                        <div className="flex items-center space-x-1">
                                            <Activity size={10} />
                                            <span>{participant.games_played || 1} игр</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Clock size={10} />
                                            <span>{formatTournamentSurvivalTime(participant.survival_time)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <TrendingUp size={10} />
                                            <span>L{participant.max_level_reached}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center space-x-1">
                                        <Star className="text-yellow-400" size={14} />
                                        <span className="text-base font-bold text-white">{participant.survival_score}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
                <button
                    onClick={onPlayClick}
                    disabled={!hasAttemptsRemaining}
                    className={`
                        w-full px-6 py-4 rounded-xl text-lg font-bold transition-all duration-300 flex items-center justify-center space-x-3
                        ${hasAttemptsRemaining
                            ? "bg-white/15 border-2 border-white/40 text-white hover:border-white/60 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
                        }
                    `}
                >
                    <Play size={24} />
                    <span>
                        {hasAttemptsRemaining
                            ? t("tournament.enterTournament")
                            : t("game.general.noAttempts")
                        }
                    </span>
                </button>

                <button
                    onClick={onDetailsClick}
                    className="w-full px-6 py-3 bg-white/5 border border-white/20 text-white rounded-xl text-base font-medium hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-[1.01] active:scale-[0.99]"
                >
                    <Info size={20} />
                    <span>{t("tournament.viewDetails")}</span>
                </button>

                {!hasAttemptsRemaining && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                        <p className="text-white/60 text-sm">{t("game.general.attemptsUsed")}</p>
                        <p className="text-white/40 text-xs mt-1">{t("game.general.waitForReset")}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface CompletedTournamentCardProps {
    tournament: TournamentWithStatus;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const CompletedTournamentCard: React.FC<CompletedTournamentCardProps> = ({
    tournament,
    isExpanded,
    onToggleExpand,
}) => {
    const t = useT();
    const [winners, setWinners] = useState<TournamentLeaderboardEntry[]>([]);
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    useEffect(() => {
        if (isExpanded && winners.length === 0) {
            const loadWinners = async () => {
                setIsLoadingWinners(true);
                try {
                    const tournamentWinners = await tournamentService.getTournamentWinners(
                        tournament.id,
                        tournament.prizes.length
                    );
                    setWinners(tournamentWinners);
                } catch (error) {
                    console.error("Error loading winners:", error);
                } finally {
                    setIsLoadingWinners(false);
                }
            };
            loadWinners();
        }
    }, [isExpanded, tournament.id, tournament.prizes.length, winners.length]);

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-white" size={14} />;
            case 2:
                return <Medal className="text-white/80" size={14} />;
            case 3:
                return <Award className="text-white/60" size={14} />;
            default:
                return <span className="text-white/50 text-xs font-medium">#{position}</span>;
        }
    };

    return (
        <div className="bg-white/5 border border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/8 hover:border-white/30">
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-xl flex items-center justify-center">
                            <Award className="text-white/50" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white/70 tracking-wide">
                                {tournament.name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm mt-1">
                                <div className="flex items-center space-x-1">
                                    <Star className="text-white/50" size={14} />
                                    <span className="text-white/60 font-medium">{t("tournament.completed")}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onToggleExpand}
                        className="p-2 rounded-lg transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30"
                    >
                        {isExpanded ? (
                            <ChevronUp className="text-white/60" size={18} />
                        ) : (
                            <ChevronDown className="text-white/60" size={18} />
                        )}
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <Trophy className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.prizes")}</span>
                            </div>
                            <div className="text-lg font-bold text-white/70">{tournament.prizes.length}</div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <Users className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.participants")}</span>
                            </div>
                            <div className="text-lg font-bold text-white/70">{tournament.participants_count || 0}</div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <CalendarDays className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.status")}</span>
                            </div>
                            <div className="text-sm font-bold text-white/70 capitalize">
                                {t("tournament.completed")}
                            </div>
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <CalendarDays className="text-white/70" size={16} />
                                <span className="text-sm font-bold text-white/70 uppercase tracking-wider">{t("tournament.tournamentDates")}</span>
                            </div>
                            <div className="space-y-2 text-sm text-white/60">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{t("tournament.start")}:</span>
                                    <span className="font-mono">{new Date(tournament.start_date).toLocaleString('ru-RU')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{t("tournament.end")}:</span>
                                    <span className="font-mono">{new Date(tournament.end_date).toLocaleString('ru-RU')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Crown className="text-white/70" size={16} />
                                <span className="text-sm font-bold text-white/70 uppercase tracking-wider">
                                    {t("tournament.champions")} ({tournament.prizes.length} {t("tournament.prizePositions")})
                                </span>
                            </div>

                            {isLoadingWinners ? (
                                <div className="flex items-center justify-center space-x-3 py-6">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                                    <span className="text-white/50 text-sm font-medium">{t("tournament.loadingChampions")}</span>
                                </div>
                            ) : winners.length > 0 ? (
                                <div className="space-y-3">
                                    {winners.map((winner, index) => (
                                        <div
                                            key={winner.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/8 transition-all duration-300"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center justify-center w-8">
                                                    {getRankIcon(index + 1)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white/80">
                                                        {winner.first_name} {winner.last_name || ""}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs text-white/50">
                                                        <div className="flex items-center space-x-1">
                                                            <Activity size={10} />
                                                            <span>{winner.games_played || 1} игр</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <Clock size={10} />
                                                            <span className="font-mono">{formatTournamentSurvivalTime(winner.survival_time)}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <TrendingUp size={10} />
                                                            <span>L{winner.max_level_reached}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-white/80">
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="text-yellow-400/80" size={12} />
                                                        <span>{winner.survival_score} pts</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-white/50">
                                                    {tournament.prizes[index]}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Trophy className="text-white/30 mx-auto mb-3" size={32} />
                                    <p className="text-white/40 text-sm font-medium">{t("tournament.noChampionsData")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function TournamentsPage() {
    const router = useRouter();
    const t = useT();
    const [tournaments, setTournaments] = useState<TournamentListResponse>({
        active: [],
        upcoming: [],
        completed: []
    });
    const [activeLeaderboard, setActiveLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadTournaments = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const tournamentsData = await tournamentService.getAllTournaments();
                setTournaments(tournamentsData);

                // Load leaderboard for active tournament
                if (tournamentsData.active.length > 0) {
                    const activeTournament = tournamentsData.active[0];
                    const leaderboard = await tournamentService.getTournamentLeaderboard(activeTournament.id, 20);
                    setActiveLeaderboard(leaderboard);
                }
            } catch (err) {
                console.error("Error loading tournaments:", err);
                setError(t("tournament.errorLoadingTournaments"));
            } finally {
                setIsLoading(false);
            }
        };

        loadTournaments();
    }, [t]);

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

    const handlePlayTournament = () => {
        router.push("/tournament/play");
    };

    const handleViewDetails = () => {
        router.push("/tournament/active");
    };

    const handleToggleExpand = (tournamentId: string) => {
        setExpandedTournaments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tournamentId)) {
                newSet.delete(tournamentId);
            } else {
                newSet.add(tournamentId);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                        <Trophy className="absolute inset-0 m-auto text-white/30" size={20} />
                    </div>
                    <div>
                        <p className="text-white text-lg font-medium">{t("tournament.loadingTournaments")}</p>
                        <p className="text-white/60 text-sm">{t("tournament.fetchingData")}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="w-16 h-16 bg-white/5 border border-white/20 rounded-xl flex items-center justify-center mx-auto">
                        <Trophy className="text-white/40" size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">{error}</h2>
                        <p className="text-white/60 text-sm">{t("tournament.tryRefreshPage")}</p>
                    </div>
                    <button
                        className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 active:scale-95"
                        onClick={() => window.location.reload()}
                    >
                        {t("tournament.refresh")}
                    </button>
                </div>
            </div>
        );
    }

    const hasActiveTournament = tournaments.active.length > 0;
    const hasCompletedTournaments = tournaments.completed.length > 0;

    if (!hasActiveTournament && !hasCompletedTournaments) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-8 max-w-md mx-auto px-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-white/5 border border-white/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Trophy className="text-white/40" size={40} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <CalendarDays className="text-white/60" size={16} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-3">{t("tournament.noTournamentsAvailable")}</h1>
                        <p className="text-white/60 text-sm leading-relaxed">
                            {t("tournament.checkBackSoon")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {hasActiveTournament && (
                <div className="py-6">
                    <ActiveTournamentSection
                        tournament={tournaments.active[0]}
                        leaderboard={activeLeaderboard}
                        onPlayClick={handlePlayTournament}
                        onDetailsClick={handleViewDetails}
                    />
                </div>
            )}

            {hasCompletedTournaments && (
                <div className={`${hasActiveTournament ? 'py-6 border-t border-white/10' : 'py-6'}`}>
                    <div className="mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center">
                                <Star className="text-white/60" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white/70 tracking-wide">{t("tournament.hallOfFame")}</h2>
                                <p className="text-white/40 text-sm uppercase tracking-[0.2em]">{tournaments.completed.length} {t("tournament.tournaments")}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {tournaments.completed.map((tournament) => (
                            <CompletedTournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}