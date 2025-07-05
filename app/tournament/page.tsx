// src/app/tournament/page.tsx - Премиум стильная версия с цветами и анимациями

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
    Zap,
    Target,
    TrendingUp,
    Star,
    Sparkles,
    ArrowRight,
    Activity,
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
    index: number;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    onViewDetails,
    isExpanded,
    onToggleExpand,
    index,
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
                    bg: "bg-gradient-to-br from-emerald-500/10 via-white/10 to-emerald-500/5 border-emerald-400/30",
                    text: "text-white",
                    icon: "text-emerald-300",
                    button: "bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 border-emerald-400/50 text-emerald-100 hover:text-white shadow-emerald-500/20",
                    accent: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 border-emerald-400/20",
                    statusIcon: Zap,
                    bgIcon: Trophy,
                    statusLabel: t("tournament.tournamentActive"),
                    pulse: true,
                    glowColor: "shadow-emerald-500/20"
                };
            case "upcoming":
                return {
                    bg: "bg-gradient-to-br from-sky-500/10 via-white/8 to-sky-500/5 border-sky-400/25",
                    text: "text-white/95",
                    icon: "text-sky-300",
                    button: "bg-gradient-to-r from-sky-500/15 to-sky-600/15 hover:from-sky-500/25 hover:to-sky-600/25 border-sky-400/40 text-sky-100 shadow-sky-500/15",
                    accent: "bg-gradient-to-br from-sky-500/12 to-sky-600/8 border-sky-400/15",
                    statusIcon: Timer,
                    bgIcon: Calendar,
                    statusLabel: t("tournament.upcoming"),
                    pulse: false,
                    glowColor: "shadow-sky-500/15"
                };
            case "completed":
                return {
                    bg: "bg-gradient-to-br from-amber-500/8 via-white/5 to-amber-500/3 border-amber-400/20",
                    text: "text-white/80",
                    icon: "text-amber-300/80",
                    button: "bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 border-amber-400/30 text-amber-100/80 shadow-amber-500/10",
                    accent: "bg-gradient-to-br from-amber-500/8 to-amber-600/5 border-amber-400/12",
                    statusIcon: Star,
                    bgIcon: Award,
                    statusLabel: t("tournament.completed"),
                    pulse: false,
                    glowColor: "shadow-amber-500/10"
                };
        }
    };

    const config = getStatusConfig();
    const StatusIcon = config.statusIcon;
    const BgIcon = config.bgIcon;

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-amber-300" size={14} />;
            case 2:
                return <Medal className="text-slate-300" size={14} />;
            case 3:
                return <Award className="text-orange-300" size={14} />;
            default:
                return <span className="text-white/50 text-xs font-medium">#{position}</span>;
        }
    };

    return (
        <div
            className={`
                group relative backdrop-blur-sm border rounded-2xl transition-all duration-500 overflow-hidden
                ${config.bg} hover:border-opacity-60 hover:scale-[1.02] active:scale-[0.99]
                ${config.glowColor} hover:shadow-xl
                ${config.pulse ? 'animate-pulse-gentle' : ''}
                animate-slide-in-up
            `}
            style={{
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'both'
            }}
        >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 animate-pulse-slow" />
            </div>

            {/* Background Decorative Icon with Animation */}
            <div className="absolute right-0 top-1/2 transform translate-x-1/4 -translate-y-1/2 pointer-events-none opacity-5 group-hover:opacity-8 transition-opacity duration-700">
                <BgIcon size={120} className="text-white transform rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-all duration-700" />
            </div>

            {/* Active Tournament Glow Effect */}
            {tournament.status === "active" && (
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 rounded-2xl blur-sm animate-pulse-gentle" />
            )}

            <div className="p-6 relative z-10">
                {/* Enhanced Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-4">
                        <div className={`relative w-14 h-14 border-2 rounded-2xl flex items-center justify-center ${config.accent} group-hover:border-opacity-70 transition-all duration-500 overflow-hidden`}>
                            <Trophy className={`${config.icon} group-hover:scale-125 transition-all duration-500 drop-shadow-lg`} size={24} />
                            {tournament.status === "active" && (
                                <>
                                    <div className="absolute -top-1 -right-1">
                                        <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse-gentle shadow-emerald-400/50 shadow-lg" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-emerald-500/10 animate-pulse-slow" />
                                </>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-2xl font-bold ${config.text} group-hover:text-white transition-colors duration-500 tracking-wide drop-shadow-sm`}>
                                {tournament.name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm mt-2">
                                <div className="flex items-center space-x-2">
                                    <StatusIcon className={`${config.icon} animate-pulse-gentle`} size={16} />
                                    <span className={`${config.text} font-semibold tracking-wide`}>{config.statusLabel}</span>
                                </div>
                                {timeDisplay && (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                                        <div className="flex items-center space-x-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                                            <Clock className={`${config.icon} animate-spin-slow`} size={14} />
                                            <span className={`${config.text} font-mono font-bold tracking-wider`}>{timeDisplay}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {tournament.status === "active" && (
                            <button
                                onClick={() => onViewDetails(tournament)}
                                className={`
                                    px-6 py-3 border-2 rounded-xl transition-all duration-500 
                                    ${config.button} text-sm font-bold tracking-wide 
                                    shadow-lg hover:shadow-xl transform hover:scale-105 
                                    active:scale-95 hover:-translate-y-0.5 group/btn
                                    relative overflow-hidden
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                <div className="flex items-center space-x-2 relative z-10">
                                    <Play size={16} className="group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span>{t("tournament.joinNow")}</span>
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
                                </div>
                            </button>
                        )}

                        {tournament.status === "completed" && (
                            <button
                                onClick={onToggleExpand}
                                className={`
                                    p-3 rounded-xl transition-all duration-500 
                                    ${config.button} transform hover:scale-110 
                                    active:scale-95 hover:rotate-180
                                `}
                            >
                                {isExpanded ? (
                                    <ChevronUp className={config.icon} size={20} />
                                ) : (
                                    <ChevronDown className={config.icon} size={20} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className={`${config.accent} border-2 rounded-xl p-4 mb-5 backdrop-blur-sm`}>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="space-y-2 group/stat">
                            <div className="flex items-center justify-center space-x-2">
                                <div className={`w-8 h-8 ${config.accent} rounded-lg flex items-center justify-center border border-white/10 group-hover/stat:scale-110 transition-transform duration-300`}>
                                    <Trophy className={`${config.icon} group-hover/stat:rotate-12 transition-transform duration-300`} size={16} />
                                </div>
                                <span className="text-xs text-white/70 uppercase tracking-wider font-bold">{t("tournament.prizes")}</span>
                            </div>
                            <div className={`text-xl font-bold ${config.text} group-hover/stat:scale-110 transition-transform duration-300`}>
                                {tournament.prizes.length}
                            </div>
                        </div>

                        {tournament.status === "completed" && (
                            <div className="space-y-2 group/stat">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className={`w-8 h-8 ${config.accent} rounded-lg flex items-center justify-center border border-white/10 group-hover/stat:scale-110 transition-transform duration-300`}>
                                        <Users className={`${config.icon} group-hover/stat:rotate-12 transition-transform duration-300`} size={16} />
                                    </div>
                                    <span className="text-xs text-white/70 uppercase tracking-wider font-bold">{t("tournament.participants")}</span>
                                </div>
                                <div className={`text-xl font-bold ${config.text} group-hover/stat:scale-110 transition-transform duration-300`}>
                                    {tournament.participants_count || 0}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 group/stat">
                            <div className="flex items-center justify-center space-x-2">
                                <div className={`w-8 h-8 ${config.accent} rounded-lg flex items-center justify-center border border-white/10 group-hover/stat:scale-110 transition-transform duration-300`}>
                                    <Activity className={`${config.icon} group-hover/stat:rotate-12 transition-transform duration-300`} size={16} />
                                </div>
                                <span className="text-xs text-white/70 uppercase tracking-wider font-bold">{t("tournament.status")}</span>
                            </div>
                            <div className={`text-sm font-bold ${config.text} capitalize group-hover/stat:scale-110 transition-transform duration-300`}>
                                {config.statusLabel}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tournament Dates for Upcoming */}
                {tournament.status === "upcoming" && (
                    <div className="bg-gradient-to-br from-sky-500/8 to-sky-600/5 border border-sky-400/20 rounded-xl p-4 mb-4 backdrop-blur-sm animate-fade-in">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-sky-500/20 border border-sky-400/30 rounded-lg flex items-center justify-center">
                                <CalendarDays className="text-sky-300 animate-pulse-gentle" size={18} />
                            </div>
                            <span className="text-sm font-bold text-sky-100 uppercase tracking-wider">{t("tournament.schedule")}</span>
                        </div>
                        <div className="space-y-3 text-sm text-sky-100/90">
                            <div className="flex items-center justify-between p-2 bg-sky-500/5 rounded-lg border border-sky-400/10">
                                <span className="font-semibold">{t("tournament.start")}:</span>
                                <span className="font-mono text-sky-200">{new Date(tournament.start_date).toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-sky-500/5 rounded-lg border border-sky-400/10">
                                <span className="font-semibold">{t("tournament.end")}:</span>
                                <span className="font-mono text-sky-200">{new Date(tournament.end_date).toLocaleString('ru-RU')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enhanced Expanded Content for Completed Tournaments */}
                {isExpanded && tournament.status === "completed" && (
                    <div className="mt-5 space-y-5 animate-fade-in-up">
                        {/* Tournament Timeline */}
                        <div className="bg-gradient-to-br from-amber-500/8 to-amber-600/5 border border-amber-400/20 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/20 border border-amber-400/30 rounded-lg flex items-center justify-center">
                                    <CalendarDays className="text-amber-300" size={18} />
                                </div>
                                <span className="text-sm font-bold text-amber-100 uppercase tracking-wider">{t("tournament.timeline")}</span>
                            </div>
                            <div className="space-y-3 text-sm text-amber-100/90">
                                <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg border border-amber-400/10">
                                    <span className="font-semibold">{t("tournament.start")}:</span>
                                    <span className="font-mono text-amber-200">{new Date(tournament.start_date).toLocaleString('ru-RU')}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg border border-amber-400/10">
                                    <span className="font-semibold">{t("tournament.end")}:</span>
                                    <span className="font-mono text-amber-200">{new Date(tournament.end_date).toLocaleString('ru-RU')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Winners Section */}
                        <div className="bg-gradient-to-br from-amber-500/8 to-amber-600/5 border border-amber-400/20 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center space-x-3 mb-5">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-400/40 rounded-lg flex items-center justify-center">
                                    <Crown className="text-amber-300 animate-pulse-gentle" size={18} />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-amber-100 uppercase tracking-wider">
                                        {t("tournament.champions")}
                                    </span>
                                    <p className="text-xs text-amber-200/70 mt-1">{tournament.prizes.length} {t("tournament.prizePositions")}</p>
                                </div>
                            </div>

                            {isLoadingWinners ? (
                                <div className="flex items-center justify-center space-x-4 py-8">
                                    <div className="relative">
                                        <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                                        <Crown className="absolute inset-0 m-auto text-amber-400/30" size={16} />
                                    </div>
                                    <span className="text-amber-100/80 text-sm font-medium">{t("tournament.loadingChampions")}</span>
                                </div>
                            ) : winners.length > 0 ? (
                                <div className="space-y-3">
                                    {winners.map((winner, index) => (
                                        <div
                                            key={winner.id}
                                            className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/5 via-white/5 to-amber-500/5 rounded-lg border border-amber-400/15 hover:bg-amber-500/10 transition-all duration-500 hover:scale-[1.02] group/winner"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center justify-center w-10 h-10 bg-amber-500/10 rounded-lg border border-amber-400/20 group-hover/winner:scale-110 transition-transform duration-300">
                                                    {getRankIcon(index + 1)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white flex items-center space-x-2">
                                                        <span>{winner.first_name} {winner.last_name || ""}</span>
                                                        {winner.is_premium && (
                                                            <Sparkles className="text-amber-400" size={12} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
                                                        <div className="flex items-center space-x-1">
                                                            <Clock size={10} />
                                                            <span className="font-mono">{formatTournamentSurvivalTime(winner.survival_time)}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <TrendingUp size={10} />
                                                            <span>Level {winner.max_level_reached}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <Target size={10} />
                                                            <span>{winner.correct_hits} {t("tournament.hits")}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-amber-200 group-hover/winner:text-amber-100 transition-colors duration-300">
                                                    {tournament.prizes[index]}
                                                </div>
                                                <div className="text-xs text-amber-300/60 mt-1">
                                                    {t("tournament.position")} #{index + 1}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Trophy className="text-amber-400/50" size={32} />
                                    </div>
                                    <p className="text-amber-100/60 text-sm font-medium">{t("tournament.noChampionsData")}</p>
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
    subtitle?: string;
    count?: number;
    colorClass?: string;
    accentColor?: string;
}> = ({ icon: Icon, title, subtitle, count, colorClass = "text-white", accentColor = "bg-white/10" }) => (
    <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 ${accentColor} border border-white/20 rounded-xl flex items-center justify-center group hover:scale-110 transition-transform duration-300`}>
                <Icon className={`${colorClass} group-hover:rotate-12 transition-transform duration-300`} size={24} />
            </div>
            <div>
                <h2 className={`text-2xl font-bold ${colorClass} tracking-wide drop-shadow-sm`}>{title}</h2>
                <div className="flex items-center space-x-3 mt-1">
                    {count !== undefined && (
                        <span className="text-white/60 text-sm font-medium">{count}</span>
                    )}
                    {subtitle && (
                        <>
                            {count !== undefined && <div className="w-1 h-1 rounded-full bg-white/40" />}
                            <span className="text-white/50 text-sm">{subtitle}</span>
                        </>
                    )}
                </div>
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
                <div className="text-center space-y-8 animate-fade-in">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Trophy className="text-emerald-400/50" size={24} />
                        </div>
                        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 rounded-full blur-lg animate-pulse" />
                    </div>
                    <div>
                        <p className="text-white text-xl font-bold tracking-wide">{t("tournament.loadingTournaments")}</p>
                        <p className="text-emerald-300/80 text-sm mt-2">{t("tournament.fetchingData")}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-8 max-w-md mx-auto px-6 animate-fade-in">
                    <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-400/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Trophy className="text-red-400/60" size={40} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center justify-center">
                            <span className="text-red-400 text-xs font-bold">!</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-3">{error}</h2>
                        <p className="text-red-300/80 text-sm leading-relaxed">{t("tournament.tryRefreshPage")}</p>
                    </div>
                    <button
                        className="px-8 py-4 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-100 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-500 border border-red-400/30 hover:border-red-400/50 hover:scale-105 active:scale-95 shadow-red-500/20 hover:shadow-xl font-bold tracking-wide"
                        onClick={() => window.location.reload()}
                    >
                        {t("tournament.refresh")}
                    </button>
                </div>
            </div>
        );
    }

    const hasAnyTournaments = tournaments.active.length > 0 || tournaments.upcoming.length > 0 || tournaments.completed.length > 0;

    if (!hasAnyTournaments) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-10 max-w-md mx-auto px-6 animate-fade-in">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-400/20 rounded-3xl flex items-center justify-center mx-auto">
                            <Trophy className="text-slate-400/60" size={48} />
                        </div>
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-slate-500/10 border border-slate-400/20 rounded-xl flex items-center justify-center">
                            <Calendar className="text-slate-400/80" size={20} />
                        </div>
                        <div className="absolute -inset-6 bg-gradient-to-r from-slate-500/5 via-slate-400/3 to-slate-500/5 rounded-full blur-2xl animate-pulse-slow" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-4 tracking-wide">{t("tournament.noTournamentsAvailable")}</h1>
                        <p className="text-slate-300/80 text-sm leading-relaxed">
                            {t("tournament.checkBackSoon")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Premium Header */}
            <div className="mb-12 animate-fade-in">
                <div className="text-center space-y-8">
                    <div className="relative inline-block">
                        <div className="w-20 h-20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 border border-white/20 rounded-3xl flex items-center justify-center mx-auto group hover:scale-110 transition-all duration-500">
                            <Trophy className="text-white group-hover:rotate-12 transition-transform duration-500" size={40} />
                        </div>
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-emerald-600/15 border border-emerald-400/30 rounded-xl flex items-center justify-center animate-pulse-gentle">
                            <Crown className="text-emerald-400" size={16} />
                        </div>
                        <div className="absolute -inset-8 bg-gradient-to-r from-white/5 via-white/3 to-white/5 rounded-full blur-2xl animate-pulse-slow" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-wide drop-shadow-lg">{t("tournament.title")}</h1>
                        <p className="text-white/70 text-sm uppercase tracking-[0.3em] mt-3 font-medium">{t("tournament.competitionCenter")}</p>
                    </div>
                </div>
            </div>

            {/* Active Tournaments */}
            {tournaments.active.length > 0 && (
                <div className="mb-12">
                    <SectionHeader
                        icon={Zap}
                        title={t("tournament.activeTournaments")}
                        subtitle={t("tournament.joinAndCompete")}
                        count={tournaments.active.length}
                        colorClass="text-emerald-300"
                        accentColor="bg-gradient-to-br from-emerald-500/15 to-emerald-600/10"
                    />
                    <div className="space-y-6">
                        {tournaments.active.map((tournament, index) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Tournaments */}
            {tournaments.upcoming.length > 0 && (
                <div className="mb-12">
                    <SectionHeader
                        icon={Timer}
                        title={t("tournament.upcomingTournaments")}
                        subtitle={t("tournament.prepareForBattle")}
                        count={tournaments.upcoming.length}
                        colorClass="text-sky-300"
                        accentColor="bg-gradient-to-br from-sky-500/15 to-sky-600/10"
                    />
                    <div className="space-y-6">
                        {tournaments.upcoming.map((tournament, index) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                                index={index}
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
                        subtitle={t("tournament.hallOfFame")}
                        count={tournaments.completed.length}
                        colorClass="text-amber-300"
                        accentColor="bg-gradient-to-br from-amber-500/15 to-amber-600/10"
                    />
                    <div className="space-y-6">
                        {tournaments.completed.map((tournament, index) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onViewDetails={handleViewTournamentDetails}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}