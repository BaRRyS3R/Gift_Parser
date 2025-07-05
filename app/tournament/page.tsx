// src/app/tournament/page.tsx - Стильная версия страницы турниров

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
    Zap,
    Target,
    TrendingUp,
    Star,
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

    const getStatusConfig = () => {
        switch (tournament.status) {
            case "active":
                return {
                    bg: "bg-white/15 border-white/40",
                    text: "text-white",
                    icon: "text-white/90",
                    button: "bg-white/20 hover:bg-white/30 border-white/50 text-white hover:scale-105",
                    accent: "bg-white/10",
                    statusIcon: Zap,
                    bgIcon: Trophy,
                    statusLabel: t("tournament.tournamentActive"),
                    pulse: true
                };
            case "upcoming":
                return {
                    bg: "bg-white/10 border-white/30",
                    text: "text-white/90",
                    icon: "text-white/70",
                    button: "bg-white/15 hover:bg-white/25 border-white/40 text-white/90",
                    accent: "bg-white/8",
                    statusIcon: Timer,
                    bgIcon: Calendar,
                    statusLabel: t("tournament.upcoming"),
                    pulse: false
                };
            case "completed":
                return {
                    bg: "bg-white/5 border-white/20",
                    text: "text-white/70",
                    icon: "text-white/50",
                    button: "bg-white/10 hover:bg-white/15 border-white/30 text-white/70",
                    accent: "bg-white/5",
                    statusIcon: Star,
                    bgIcon: Award,
                    statusLabel: t("tournament.completed"),
                    pulse: false
                };
        }
    };

    const config = getStatusConfig();
    const StatusIcon = config.statusIcon;
    const BgIcon = config.bgIcon;

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
        <div className={`
            group relative backdrop-blur-sm border rounded-xl transition-all duration-300 overflow-hidden
            ${config.bg} hover:border-white/50 hover:bg-white/20 hover:scale-[1.01] active:scale-[0.99]
            ${config.pulse ? 'animate-pulse-subtle' : ''}
        `}>
            {/* Background Decorative Icon */}
            <div className="absolute right-0 top-1/2 transform translate-x-1/4 -translate-y-1/2 pointer-events-none opacity-5">
                <BgIcon size={100} className="text-white transform rotate-12" />
            </div>

            <div className="p-5 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className={`relative w-12 h-12 border rounded-xl flex items-center justify-center ${config.accent} border-white/30 group-hover:border-white/50 transition-all duration-300`}>
                            <Trophy className={`${config.icon} group-hover:scale-110 transition-transform duration-300`} size={22} />
                            {tournament.status === "active" && (
                                <div className="absolute -top-1 -right-1">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xl font-bold ${config.text} group-hover:text-white transition-colors duration-300 tracking-wide`}>
                                {tournament.name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm mt-1">
                                <div className="flex items-center space-x-1">
                                    <StatusIcon className={config.icon} size={14} />
                                    <span className={`${config.text} font-medium`}>{config.statusLabel}</span>
                                </div>
                                {timeDisplay && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                        <div className="flex items-center space-x-1">
                                            <Clock className={config.icon} size={12} />
                                            <span className={`${config.text} font-mono`}>{timeDisplay}</span>
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
                                className={`px-4 py-2 border rounded-lg transition-all duration-300 ${config.button} text-sm font-bold tracking-wide shadow-lg hover:shadow-xl`}
                            >
                                <div className="flex items-center space-x-2">
                                    <Play size={14} />
                                    <span>{t("tournament.enter")}</span>
                                </div>
                            </button>
                        )}

                        {tournament.status === "completed" && (
                            <button
                                onClick={onToggleExpand}
                                className={`p-2 rounded-lg transition-all duration-300 ${config.button}`}
                            >
                                {isExpanded ? (
                                    <ChevronUp className={config.icon} size={18} />
                                ) : (
                                    <ChevronDown className={config.icon} size={18} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tournament Stats Bar */}
                <div className={`${config.accent} border border-white/10 rounded-lg p-3 mb-4`}>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <Trophy className="text-white/60" size={14} />
                                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">{t("tournament.prizes")}</span>
                            </div>
                            <div className={`text-lg font-bold ${config.text}`}>{tournament.prizes.length}</div>
                        </div>

                        {tournament.status === "completed" && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-center space-x-1">
                                    <Users className="text-white/60" size={14} />
                                    <span className="text-xs text-white/60 uppercase tracking-wider font-medium">{t("tournament.participants")}</span>
                                </div>
                                <div className={`text-lg font-bold ${config.text}`}>{tournament.participants_count || 0}</div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <CalendarDays className="text-white/60" size={14} />
                                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">{t("tournament.status")}</span>
                            </div>
                            <div className={`text-sm font-bold ${config.text} capitalize`}>
                                {config.statusLabel}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tournament Dates for Upcoming */}
                {tournament.status === "upcoming" && (
                    <div className="bg-white/5 border border-white/15 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <CalendarDays className="text-white/80" size={16} />
                            <span className="text-sm font-bold text-white/80 uppercase tracking-wider">{t("tournament.conductionDate")}</span>
                        </div>
                        <div className="space-y-2 text-sm text-white/70">
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
                )}

                {/* Expanded Content for Completed Tournaments */}
                {isExpanded && tournament.status === "completed" && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        {/* Tournament Dates */}
                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <CalendarDays className="text-white/80" size={16} />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">{t("tournament.tournamentDates")}</span>
                            </div>
                            <div className="space-y-2 text-sm text-white/70">
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

                        {/* Winners */}
                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Crown className="text-white/80" size={16} />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">
                                    {t("tournament.prizeWinners")} ({tournament.prizes.length})
                                </span>
                            </div>

                            {isLoadingWinners ? (
                                <div className="flex items-center justify-center space-x-3 py-6">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span className="text-white/60 text-sm font-medium">{t("tournament.loadingWinners")}</span>
                                </div>
                            ) : winners.length > 0 ? (
                                <div className="space-y-3">
                                    {winners.map((winner, index) => (
                                        <div
                                            key={winner.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center justify-center w-8">
                                                    {getRankIcon(index + 1)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">
                                                        {winner.first_name} {winner.last_name || ""}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs text-white/60">
                                                        <div className="flex items-center space-x-1">
                                                            <Clock size={10} />
                                                            <span className="font-mono">{formatTournamentSurvivalTime(winner.survival_time)}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <TrendingUp size={10} />
                                                            <span>L{winner.max_level_reached}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <Target size={10} />
                                                            <span>{winner.correct_hits}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-white">
                                                    {tournament.prizes[index]}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Trophy className="text-white/30 mx-auto mb-3" size={32} />
                                    <p className="text-white/50 text-sm font-medium">{t("tournament.noWinnersData")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SectionHeader: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    count?: number;
    opacity?: string;
}> = ({ icon: Icon, title, count, opacity = "text-white" }) => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                <Icon className={opacity} size={20} />
            </div>
            <div>
                <h2 className={`text-xl font-bold ${opacity} tracking-wide`}>{title}</h2>
                {count !== undefined && (
                    <p className="text-white/50 text-sm">{count}</p>
                )}
            </div>
        </div>
    </div>
);

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
                <div className="text-center space-y-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                        <Trophy className="absolute inset-0 m-auto text-white/30" size={20} />
                    </div>
                    <div>
                        <p className="text-white text-lg font-medium">{t("tournament.loadingTournament")}</p>
                        <p className="text-white/60 text-sm">Loading data...</p>
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
                        <p className="text-white/60 text-sm">{t("common.retry")}</p>
                    </div>
                    <button
                        className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 active:scale-95"
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
                <div className="text-center space-y-8 max-w-md mx-auto px-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-white/5 border border-white/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Trophy className="text-white/40" size={40} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <Calendar className="text-white/60" size={16} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-3">{t("tournament.noTournamentsAvailable")}</h1>
                        <p className="text-white/60 text-sm leading-relaxed">
                            {t("tournament.checkBackLater")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Enhanced Header */}
            <div className="mb-8">
                <div className="text-center space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-wide">{t("tournament.title")}</h1>
                        <p className="text-white/60 text-sm uppercase tracking-[0.2em] mt-2">{t("tournament.tournamentsList")}</p>
                    </div>
                </div>
            </div>

            {/* Active Tournaments */}
            {tournaments.active.length > 0 && (
                <div className="mb-10">
                    <SectionHeader
                        icon={Zap}
                        title={t("tournament.activeTournaments")}
                        count={tournaments.active.length}
                        opacity="text-white"
                    />
                    <div className="space-y-4">
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
                <div className="mb-10">
                    <SectionHeader
                        icon={Timer}
                        title={t("tournament.upcomingTournaments")}
                        count={tournaments.upcoming.length}
                        opacity="text-white/80"
                    />
                    <div className="space-y-4">
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
                    <SectionHeader
                        icon={Star}
                        title={t("tournament.completedTournaments")}
                        count={tournaments.completed.length}
                        opacity="text-white/60"
                    />
                    <div className="space-y-4">
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