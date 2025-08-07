// src/app/tournaments/page.tsx - Future Tech стилистика турниров

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardBody, Button, Spinner } from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Zap,
    Target,
    AlertTriangle,
    ArrowLeft,
    Play,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";
import TournamentLeaderboard from "@/components/Tournaments/TournamentLeaderboard";

// Tournament interfaces
interface Tournament {
    id: string;
    name: string;
    description?: string;
    mode: 'survival' | 'physics' | 'rotation';
    start_time: string;
    end_time: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    prizes: any[];
    created_at: string;
    updated_at: string;
}

interface TournamentsData {
    active?: Tournament;
    upcoming: Tournament[];
    completed: Tournament[];
}

// Future Tech цвета для режимов
function getFutureTechModeColors(mode: string) {
    switch (mode) {
        case 'survival':
            return {
                primary: "#ff0040",
                secondary: "#ff4d7a",
                accent: "#ff8fa3",
                glow: "rgba(255, 0, 64, 0.3)",
                gradient: "from-red-500 via-pink-500 to-red-600",
                border: "border-red-500/30",
                bg: "bg-red-500/5",
                text: "text-red-400",
            };
        case 'physics':
            return {
                primary: "#7c3aed",
                secondary: "#a855f7",
                accent: "#c084fc",
                glow: "rgba(124, 58, 237, 0.3)",
                gradient: "from-purple-600 via-violet-500 to-purple-700",
                border: "border-purple-500/30",
                bg: "bg-purple-500/5",
                text: "text-purple-400",
            };
        case 'rotation':
            return {
                primary: "#f59e0b",
                secondary: "#fbbf24",
                accent: "#fcd34d",
                glow: "rgba(245, 158, 11, 0.3)",
                gradient: "from-orange-500 via-amber-500 to-yellow-500",
                border: "border-orange-500/30",
                bg: "bg-orange-500/5",
                text: "text-orange-400",
            };
        default:
            return {
                primary: "#64748b",
                secondary: "#94a3b8",
                accent: "#cbd5e1",
                glow: "rgba(100, 116, 139, 0.3)",
                gradient: "from-slate-500 via-slate-400 to-slate-600",
                border: "border-slate-500/30",
                bg: "bg-slate-500/5",
                text: "text-slate-400",
            };
    }
}

// Получение иконки режима
function getModeIcon(mode: string) {
    switch (mode) {
        case 'survival':
            return "⚡";
        case 'physics':
            return "⚛️";
        case 'rotation':
            return "🔄";
        default:
            return "🎯";
    }
}

// Форматирование времени
function formatTimeRemaining(endTime: string): string {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining === 0) return "ENDED";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatTimeUntilStart(startTime: string): string {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const remaining = Math.max(0, start - now);

    if (remaining === 0) return "STARTING";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d`;
    return `${hours}h`;
}

// Компонент статуса турнира
function TournamentStatus({ status, colors }: { status: string; colors: any }) {
    const t = useT();

    const statusConfig = {
        active: { icon: "🟢", text: t(`tournaments.status.active`), pulse: true },
        upcoming: { icon: "🔵", text: t(`tournaments.status.upcoming`), pulse: false },
        completed: { icon: "⚫", text: t(`tournaments.status.completed`), pulse: false },
        cancelled: { icon: "🔴", text: t(`tournaments.status.cancelled`), pulse: false },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${colors.border} ${colors.bg}`}>
            <span className={config.pulse ? "animate-pulse" : ""}>{config.icon}</span>
            <span className={colors.text}>{config.text}</span>
        </div>
    );
}

// Компонент отображения призов
function PrizesDisplay({ prizes, colors }: { prizes: any[]; colors: any }) {
    const t = useT();

    if (!prizes || prizes.length === 0) return null;

    const prizeIcons = ["🥇", "🥈", "🥉", "🏆", "💎"];

    // Функция для безопасного получения позиции приза
    const getPrizePosition = (prize: any): string => {
        // Проверяем разные возможные поля
        if (prize.position !== undefined) {
            return typeof prize.position === 'string' ? prize.position : `#${prize.position}`;
        }
        if (prize.place !== undefined) {
            return typeof prize.place === 'string' ? prize.place : `#${prize.place}`;
        }
        // Fallback на основе индекса
        return `#${prizes.indexOf(prize) + 1}`;
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                <Trophy size={12} />
                <span>PRIZES</span>
            </div>
            <div className="flex flex-wrap gap-1">
                {prizes.slice(0, 5).map((prize, index) => (
                    <div
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${colors.border} ${colors.bg}`}
                        style={{
                            boxShadow: `0 0 8px ${colors.glow}`,
                        }}
                    >
                        <span>{prizeIcons[index] || "🎁"}</span>
                        <span className={colors.text}>
                            {getPrizePosition(prize)}
                        </span>
                    </div>
                ))}
                {prizes.length > 5 && (
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono border ${colors.border} ${colors.bg}`}>
                        <span className={colors.text}>+{prizes.length - 5}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Компонент карточки турнира
function TournamentCard({ tournament, onViewDetails, onViewLeaderboard }: {
    tournament: Tournament;
    onViewDetails: (tournament: Tournament) => void;
    onViewLeaderboard: (tournament: Tournament) => void;
}) {
    const t = useT();
    const [timeLeft, setTimeLeft] = useState<string>("");

    const colors = getFutureTechModeColors(tournament.mode);
    const modeIcon = getModeIcon(tournament.mode);

    useEffect(() => {
        if (!tournament || !tournament.mode) return;

        const updateTimer = () => {
            if (tournament.status === 'active') {
                setTimeLeft(formatTimeRemaining(tournament.end_time));
            } else if (tournament.status === 'upcoming') {
                setTimeLeft(formatTimeUntilStart(tournament.start_time));
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 30000);
        return () => clearInterval(interval);
    }, [tournament?.end_time, tournament?.start_time, tournament?.status, tournament?.mode]);

    if (!tournament || !tournament.mode) {
        return (
            <Card className="bg-black/60 backdrop-blur-sm border border-red-500/30">
                <CardBody className="text-center p-4">
                    <p className="text-red-400 text-sm font-mono">TOURNAMENT DATA ERROR</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card
            className="bg-black/80 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] group"
            style={{
                borderColor: colors.primary + "40",
                boxShadow: tournament.status === 'active' ? `0 0 20px ${colors.glow}` : "none",
            }}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center border"
                            style={{
                                backgroundColor: colors.primary + "20",
                                borderColor: colors.primary + "40",
                                boxShadow: `0 0 10px ${colors.glow}`,
                            }}
                        >
                            <span className="text-lg">{modeIcon}</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm font-mono">{tournament.name}</h3>
                            <p className="text-xs font-mono" style={{ color: colors.primary }}>
                                {t(`tournaments.modes.${tournament.mode}` as any)}
                            </p>
                        </div>
                    </div>
                    <TournamentStatus status={tournament.status} colors={colors} />
                </div>
            </CardHeader>

            <CardBody className="pt-0 pb-3 space-y-3">
                {/* Time Display */}
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60 flex items-center gap-1">
                        <Clock size={10} />
                        {tournament.status === 'active' ? 'ENDS' :
                            tournament.status === 'upcoming' ? 'STARTS' : 'ENDED'}
                    </span>
                    <span style={{ color: colors.primary }}>
                        {tournament.status === 'completed'
                            ? new Date(tournament.end_time).toLocaleDateString()
                            : timeLeft}
                    </span>
                </div>

                {/* Prizes */}
                <PrizesDisplay prizes={tournament.prizes} colors={colors} />

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    {tournament.status === 'active' && (
                        <Button
                            size="sm"
                            className="flex-1 bg-transparent border font-mono text-xs"
                            style={{
                                borderColor: colors.primary + "60",
                                color: colors.primary,
                            }}
                            startContent={<Play size={12} />}
                            onClick={() => onViewDetails(tournament)}
                        >
                            PLAY
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="flex-1 bg-transparent border font-mono text-xs"
                        style={{
                            borderColor: colors.primary + "40",
                            color: colors.text.replace('text-', ''),
                        }}
                        startContent={<Trophy size={12} />}
                        onClick={() => onViewLeaderboard(tournament)}
                    >
                        BOARD
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}

function TournamentsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { makeAuthenticatedRequest } = useUser();
    const t = useT();

    const [tournaments, setTournaments] = useState<TournamentsData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

    const tournamentId = searchParams.get('tournamentId');

    const fetchTournaments = useCallback(async () => {
        if (tournamentId) {
            try {
                setIsLoading(true);
                setError(null);

                const response = await makeAuthenticatedRequest(
                    `/api/tournaments/detail?tournamentId=${encodeURIComponent(tournamentId)}`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch tournament');
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch tournament');
                }

                setSelectedTournament(result.tournament);
            } catch (error) {
                console.error('Error fetching tournament:', error);
                setError(error instanceof Error ? error.message : 'Failed to fetch tournament');
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                setIsLoading(true);
                setError(null);

                const response = await makeAuthenticatedRequest('/api/tournaments');

                if (!response.ok) {
                    throw new Error('Failed to fetch tournaments');
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch tournaments');
                }

                setTournaments(result.data);
            } catch (error) {
                console.error('Error fetching tournaments:', error);
                setError(error instanceof Error ? error.message : 'Failed to fetch tournaments');
            } finally {
                setIsLoading(false);
            }
        }
    }, [makeAuthenticatedRequest, tournamentId]);

    const handleViewDetails = useCallback((tournament: Tournament) => {
        if (tournament.status === 'active') {
            const gameRoute = `/game/${tournament.mode}`;
            router.push(gameRoute);
        }
    }, [router]);

    const handleViewLeaderboard = useCallback((tournament: Tournament) => {
        if (!tournament.id) {
            console.error('Cannot view leaderboard: missing tournament ID', tournament);
            return;
        }

        router.push(`/tournaments?tournamentId=${encodeURIComponent(tournament.id)}`);
    }, [router]);

    const handleBackToTournaments = useCallback(() => {
        router.push('/tournaments');
    }, [router]);

    const handleRetry = useCallback(() => {
        setError(null);
        fetchTournaments();
    }, [fetchTournaments]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                if (selectedTournament) {
                    handleBackToTournaments();
                } else {
                    router.push("/main");
                }
            });

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(() => { });
            };
        }
    }, [router, selectedTournament, handleBackToTournaments]);

    if (selectedTournament) {
        return (
            <TournamentLeaderboard
                tournament={selectedTournament}
                onBack={handleBackToTournaments}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <Spinner color="primary" size="lg" />
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <p className="text-white/80 font-mono text-sm">LOADING TOURNAMENTS...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
                <div className="text-center space-y-6 p-6">
                    <div className="relative">
                        <AlertTriangle className="text-red-400 mx-auto" size={48} />
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white font-mono">SYSTEM ERROR</h2>
                        <p className="text-red-400 font-mono text-sm">{error}</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button
                            className="bg-red-500/20 border border-red-500/40 text-red-400 font-mono"
                            startContent={<Zap size={16} />}
                            onClick={handleRetry}
                        >
                            RETRY
                        </Button>
                        <Button
                            className="bg-white/10 border border-white/30 text-white font-mono"
                            startContent={<ArrowLeft size={16} />}
                            onClick={() => router.push('/main')}
                        >
                            BACK
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black safe-area-inset-bottom safe-area-inset">
            <div className="px-4 pb-8">
                {/* Header */}
                <div className="text-center space-y-3 mb-8 pt-6">
                    <div className="relative">
                        <h1 className="text-3xl font-bold font-mono tracking-[0.3em] text-white">
                            TOURNAMENTS
                        </h1>
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse" />
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                    <p className="text-blue-400/80 text-xs font-mono tracking-widest">
                        COMPETITIVE GAMING MATRIX
                    </p>
                </div>

                {/* Active Tournament */}
                {tournaments?.active && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <h2 className="text-sm font-mono text-green-400 tracking-wider">ACTIVE</h2>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-green-500/50 to-transparent" />
                        </div>
                        <TournamentCard
                            tournament={tournaments.active}
                            onViewDetails={handleViewDetails}
                            onViewLeaderboard={handleViewLeaderboard}
                        />
                    </div>
                )}

                {/* No Active Tournament */}
                {!tournaments?.active && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                <h2 className="text-sm font-mono text-slate-400 tracking-wider">STANDBY</h2>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-500/30 to-transparent" />
                        </div>
                        <Card className="bg-black/60 border border-slate-500/30">
                            <CardBody className="text-center p-6 space-y-3">
                                <Target className="text-slate-500 mx-auto" size={32} />
                                <div className="space-y-1">
                                    <h3 className="text-white font-mono text-sm">NO ACTIVE TOURNAMENTS</h3>
                                    <p className="text-slate-400 font-mono text-xs">
                                        {tournaments?.upcoming && tournaments.upcoming.length > 0
                                            ? "NEXT TOURNAMENT LOADING..."
                                            : "TOURNAMENT SYSTEM INITIALIZING..."}
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Upcoming Tournaments */}
                {tournaments?.upcoming && tournaments.upcoming.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                <h2 className="text-sm font-mono text-blue-400 tracking-wider">UPCOMING</h2>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
                        </div>
                        <div className="space-y-4">
                            {tournaments.upcoming.map((tournament) => (
                                <TournamentCard
                                    key={tournament.id}
                                    tournament={tournament}
                                    onViewDetails={handleViewDetails}
                                    onViewLeaderboard={handleViewLeaderboard}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Tournaments */}
                {tournaments?.completed && tournaments.completed.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-600 rounded-full" />
                                <h2 className="text-sm font-mono text-slate-400 tracking-wider">ARCHIVED</h2>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-600/30 to-transparent" />
                        </div>
                        <div className="space-y-4">
                            {tournaments.completed.slice(0, 3).map((tournament) => (
                                <TournamentCard
                                    key={tournament.id}
                                    tournament={tournament}
                                    onViewDetails={handleViewDetails}
                                    onViewLeaderboard={handleViewLeaderboard}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!tournaments?.active &&
                    (!tournaments?.upcoming || tournaments.upcoming.length === 0) &&
                    (!tournaments?.completed || tournaments.completed.length === 0) && (
                        <div className="text-center py-12">
                            <div className="relative mb-6">
                                <Trophy className="text-white/20 mx-auto" size={64} />
                                <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white font-mono">NO DATA FOUND</h3>
                                <p className="text-white/60 font-mono text-sm">TOURNAMENT SYSTEM OFFLINE</p>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}

export default function TournamentsPage() {
    return (
            <TournamentsPageContent />
    );
}