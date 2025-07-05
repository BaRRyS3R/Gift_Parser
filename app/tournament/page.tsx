// src/app/tournament/page.tsx - Монохромная версия страницы турниров

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Clock,
    Users,
    Calendar,
    ChevronDown,
    ChevronUp,
    Play,
    Crown,
    Medal,
    Award,
    CalendarDays,
    Timer,
    Info,
} from "lucide-react";

import { tournamentService, formatTournamentSurvivalTime } from "@/lib/supabase_tournament_extension";
import type {
    TournamentWithStatus,
    TournamentListResponse
} from "@/lib/supabase_tournament_extension";
import type { TournamentLeaderboardEntry } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

interface TournamentCardProps {
    tournament: TournamentWithStatus;
    onViewDetails: (tournament: TournamentWithStatus) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    onViewDetails,
    isExpanded,
    onToggleExpand,
}) => {
    const t = useT();
    const [timeDisplay, setTimeDisplay] = useState<string>("");
    const [winners, setWinners] = useState<TournamentLeaderboardEntry[]>([]);
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    // Update time display for active and upcoming tournaments
    useEffect(() => {
        if (tournament.status === "completed") {
            setTimeDisplay("");
            return;
        }

        const updateTime = () => {
            const now = new Date();

            if (tournament.status === "upcoming") {
                const startDate = new Date(tournament.start_date);
                const diff = startDate.getTime() - now.getTime();
                setTimeDisplay(diff > 0 ? formatTimeRemaining(diff) : "");
            } else if (tournament.status === "active") {
                const endDate = new Date(tournament.end_date);
                const diff = endDate.getTime() - now.getTime();
                setTimeDisplay(diff > 0 ? formatTimeRemaining(diff) : "");
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [tournament]);

    // Load winners when expanded and tournament is completed
    useEffect(() => {
        if (isExpanded && tournament.status === "completed" && winners.length === 0) {
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
    }, [isExpanded, tournament.status, tournament.id, tournament.prizes.length, winners.length]);

    const getStatusColor = () => {
        switch (tournament.status) {
            case "active":
                return {
                    bg: "bg-white/15 border-white/40",
                    text: "text-white",
                    icon: "text-white/80",
                    button: "bg-white/20 hover:bg-white/30 border-white/50 text-white"
                };
            case "upcoming":
                return {
                    bg: "bg-white/10 border-white/30",
                    text: "text-white/90",
                    icon: "text-white/70",
                    button: "bg-white/15 hover:bg-white/25 border-white/40 text-white/90"
                };
            case "completed":
                return {
                    bg: "bg-white/5 border-white/20",
                    text: "text-white/80",
                    icon: "text-white/60",
                    button: "bg-white/10 hover:bg-white/15 border-white/30 text-white/80"
                };
        }
    };

    const getStatusText = () => {
        switch (tournament.status) {
            case "active":
                return t("tournament.tournamentActive");
            case "upcoming":
                return t("tournament.upcoming");
            case "completed":
                return t("tournament.ended");
        }
    };

    const colors = getStatusColor();

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
        <div className={`backdrop-blur-sm border rounded-xl transition-all duration-300 ${colors.bg}`}>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 border rounded-lg flex items-center justify-center ${colors.bg}`}>
                            <Trophy className={colors.icon} size={20} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${colors.text}`}>
                                {tournament.name}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm">
                                <span className={colors.text}>{getStatusText()}</span>
                                {timeDisplay && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                        <div className="flex items-center space-x-1">
                                            <Clock className={colors.icon} size={12} />
                                            <span className={colors.text}>{timeDisplay}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {tournament.status === "active" && (
                            <button
                                onClick={() => onViewDetails(tournament)}
                                className={`px-3 py-1.5 border rounded-lg transition-all duration-300 ${colors.button} text-sm font-medium`}
                            >
                                <div className="flex items-center space-x-1">
                                    <Play size={12} />
                                    <span>{t("tournament.enter")}</span>
                                </div>
                            </button>
                        )}

                        {tournament.status === "completed" && (
                            <button
                                onClick={onToggleExpand}
                                className={`p-2 rounded-lg transition-all duration-300 ${colors.button}`}
                            >
                                {isExpanded ? (
                                    <ChevronUp className={colors.icon} size={16} />
                                ) : (
                                    <ChevronDown className={colors.icon} size={16} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tournament Dates for Upcoming */}
                {tournament.status === "upcoming" && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3 mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <CalendarDays className="text-white/80" size={14} />
                            <span className="text-sm font-medium text-white/80">{t("tournament.conductionDate")}</span>
                        </div>
                        <div className="text-sm text-white/70">
                            <div>
                                <strong>{t("tournament.start")}:</strong> {new Date(tournament.start_date).toLocaleString('ru-RU')}
                            </div>
                            <div>
                                <strong>{t("tournament.end")}:</strong> {new Date(tournament.end_date).toLocaleString('ru-RU')}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tournament Info */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">{t("tournament.prizes")}:</span>
                        <span className={colors.text}>{tournament.prizes.length} мест</span>
                    </div>

                    {tournament.status === "completed" && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">{t("tournament.participants")}:</span>
                            <span className={colors.text}>{tournament.participants_count || 0}</span>
                        </div>
                    )}
                </div>

                {/* Expanded Content for Completed Tournaments */}
                {isExpanded && tournament.status === "completed" && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        {/* Tournament Dates */}
                        <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-white mb-2">{t("tournament.tournamentDates")}</h4>
                            <div className="text-sm text-white/70 space-y-1">
                                <div>
                                    <strong>{t("tournament.start")}:</strong> {new Date(tournament.start_date).toLocaleString('ru-RU')}
                                </div>
                                <div>
                                    <strong>{t("tournament.end")}:</strong> {new Date(tournament.end_date).toLocaleString('ru-RU')}
                                </div>
                            </div>
                        </div>

                        {/* Winners */}
                        <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-white mb-3">
                                {t("tournament.prizeWinners")} ({tournament.prizes.length})
                            </h4>

                            {isLoadingWinners ? (
                                <div className="flex items-center justify-center space-x-2 py-4">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span className="text-white/60 text-sm">{t("tournament.loadingWinners")}</span>
                                </div>
                            ) : winners.length > 0 ? (
                                <div className="space-y-2">
                                    {winners.map((winner, index) => (
                                        <div
                                            key={winner.id}
                                            className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center justify-center w-6">
                                                    {getRankIcon(index + 1)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">
                                                        {winner.first_name} {winner.last_name || ""}
                                                    </div>
                                                    <div className="text-xs text-white/60">
                                                        {formatTournamentSurvivalTime(winner.survival_time)} • L{winner.max_level_reached}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-white">
                                                    {tournament.prizes[index]}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Trophy className="text-white/40 mx-auto mb-2" size={24} />
                                    <p className="text-white/60 text-sm">{t("tournament.noWinnersData")}</p>
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
            } catch (err) {
                console.error("Error loading tournaments:", err);
                setError(t("tournament.errorLoadingTournaments"));
            } finally {
                setIsLoading(false);
            }
        };

        loadTournaments();
    }, [t]);

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

    const handleViewTournamentDetails = (tournament: TournamentWithStatus) => {
        if (tournament.status === "active") {
            router.push("/tournament/active");
        }
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
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                        onClick={() => window.location.reload()}
                    >
                        {t("common.retry")}
                    </button>
                </div>
            </div>
        );
    }

    const hasAnyTournaments = tournaments.active.length > 0 || tournaments.upcoming.length > 0 || tournaments.completed.length > 0;

    if (!hasAnyTournaments) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="text-4xl mb-4">🏆</div>
                    <h1 className="text-2xl font-medium text-white">{t("tournament.noTournamentsAvailable")}</h1>
                    <p className="text-white/60 text-sm leading-relaxed">
                        {t("tournament.checkBackLater")}
                    </p>
                </div>
            </div>
        );
    }

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
                            <h1 className="text-2xl font-medium text-white">{t("tournament.title")}</h1>
                            <p className="text-white/60 text-sm">{t("tournament.tournamentsList")}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Tournaments */}
            {tournaments.active.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-4">
                        <Trophy className="text-white" size={18} />
                        <h2 className="text-lg font-bold text-white">{t("tournament.activeTournaments")}</h2>
                    </div>
                    <div className="space-y-3">
                        {tournaments.active.map((tournament) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Tournaments */}
            {tournaments.upcoming.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-4">
                        <Calendar className="text-white/80" size={18} />
                        <h2 className="text-lg font-bold text-white/80">{t("tournament.upcomingTournaments")}</h2>
                    </div>
                    <div className="space-y-3">
                        {tournaments.upcoming.map((tournament) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Tournaments */}
            {tournaments.completed.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-4">
                        <Trophy className="text-white/60" size={18} />
                        <h2 className="text-lg font-bold text-white/60">{t("tournament.completedTournaments")}</h2>
                    </div>
                    <div className="space-y-3">
                        {tournaments.completed.map((tournament) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
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