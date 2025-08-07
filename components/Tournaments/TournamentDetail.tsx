// src/components/Tournaments/TournamentDetail.tsx - Tournament detail component

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter, Button, Spinner, Chip } from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Users,
    Target,
    ArrowLeft,
    Play,
    Calendar,
    Award,
    Crosshair,
    Atom,
    RotateCw,
    AlertTriangle,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import type {
    Tournament,
    Prize
} from "@/hooks/modules/useTournaments";

// Props interface
interface TournamentDetailProps {
    tournament: Tournament;
    onBack: () => void;
    onJoinTournament?: (tournament: Tournament) => void;
    onViewLeaderboard?: (tournament: Tournament) => void;
}

// Game mode icon mapping
const getModeIcon = (mode: string): React.ComponentType<any> => {
    switch (mode) {
        case 'survival':
            return Crosshair;
        case 'physics':
            return Atom;
        case 'rotation':
            return RotateCw;
        default:
            return Target;
    }
};

// Game mode colors
const getModeColors = (mode: string) => {
    switch (mode) {
        case 'survival':
            return {
                primary: "text-red-400",
                background: "bg-red-500/10",
                border: "border-red-400/30",
                button: "bg-red-500/20 hover:bg-red-500/30 border-red-400/40",
            };
        case 'physics':
            return {
                primary: "text-purple-400",
                background: "bg-purple-500/10",
                border: "border-purple-400/30",
                button: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/40",
            };
        case 'rotation':
            return {
                primary: "text-orange-400",
                background: "bg-orange-500/10",
                border: "border-orange-400/30",
                button: "bg-orange-500/20 hover:bg-orange-500/30 border-orange-400/40",
            };
        default:
            return {
                primary: "text-white",
                background: "bg-white/10",
                border: "border-white/30",
                button: "bg-white/20 hover:bg-white/30 border-white/40",
            };
    }
};

// Game route mapping
const gameRoutes: Record<string, string> = {
    survival: "/game/survival",
    physics: "/game/physics",
    rotation: "/game/rotation",
};

// Format time remaining
const formatTimeRemaining = (endTime: string): string => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining === 0) return "Ended";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

// Format time until start
const formatTimeUntilStart = (startTime: string): string => {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const remaining = Math.max(0, start - now);

    if (remaining === 0) return "Starting";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

// Prize display component
const PrizeItem: React.FC<{ prize: Prize; index: number }> = ({ prize, index }) => {
    const getPositionColor = (position: number): string => {
        switch (position) {
            case 1:
                return "text-yellow-400";
            case 2:
                return "text-gray-300";
            case 3:
                return "text-amber-600";
            default:
                return position <= 10 ? "text-blue-400" : "text-white/60";
        }
    };

    const getPositionIcon = (position: number): React.ComponentType<any> => {
        switch (position) {
            case 1:
                return Trophy;
            case 2:
            case 3:
                return Award;
            default:
                return Target;
        }
    };

    const PositionIcon = getPositionIcon(prize.position);
    const positionColor = getPositionColor(prize.position);

    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center space-x-3">
                <PositionIcon className={positionColor} size={20} />
                <span className={`font-bold ${positionColor}`}>
                    #{prize.position}
                </span>
            </div>
            <div className="text-right">
                <p className="text-white text-sm">{prize.description}</p>
                {prize.attempts && (
                    <p className="text-white/60 text-xs">+{prize.attempts} attempts</p>
                )}
            </div>
        </div>
    );
};

// Tournament statistics component
const TournamentStats: React.FC<{ tournament: Tournament; mode: string }> = ({ tournament, mode }) => {
    const t = useT();

    interface StatItem {
        key: string;
        label: string;
        type: 'duration' | 'date' | 'mode' | 'status';
    }

    const relevantStats: StatItem[] = [
        { key: 'duration', label: t("tournaments.details.duration"), type: 'duration' },
        { key: 'start_time', label: t("tournaments.stats.startDate"), type: 'date' },
        { key: 'end_time', label: t("tournaments.stats.endDate"), type: 'date' },
        { key: 'mode', label: t("tournaments.details.mode"), type: 'mode' },
        { key: 'status', label: t("tournaments.stats.status"), type: 'status' },
    ];

    const formatStatValue = (stat: StatItem, tournament: Tournament): string => {
        switch (stat.type) {
            case 'duration':
                const start = new Date(tournament.start_time);
                const end = new Date(tournament.end_time);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return `${days} ${days === 1 ? t("tournaments.time.day") : t("tournaments.time.days")}`;
            case 'date':
                const date = new Date(tournament[stat.key as keyof Tournament] as string);
                return date.toLocaleDateString();
            case 'mode':
                return t(`tournaments.modes.${tournament.mode}` as any);
            case 'status':
                return t(`tournaments.status.${tournament.status}` as any);
            default:
                return String(tournament[stat.key as keyof Tournament] || 'N/A');
        }
    };

    return (
        <div className="grid grid-cols-2 gap-3">
            {relevantStats.map((stat: StatItem) => (
                <div key={stat.key} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-white/60 text-xs uppercase tracking-wider">{stat.label}</p>
                    <p className="text-white font-bold text-sm mt-1">
                        {formatStatValue(stat, tournament)}
                    </p>
                </div>
            ))}
        </div>
    );
};

// Main component
export default function TournamentDetail({
    tournament,
    onBack,
    onJoinTournament,
    onViewLeaderboard,
}: TournamentDetailProps): React.JSX.Element {
    const router = useRouter();
    const t = useT();

    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const ModeIcon = getModeIcon(tournament.mode);
    const colors = getModeColors(tournament.mode);

    // Update countdown timer
    useEffect(() => {
        const updateTimer = () => {
            if (tournament.status === 'active') {
                setTimeLeft(formatTimeRemaining(tournament.end_time));
            } else if (tournament.status === 'upcoming') {
                setTimeLeft(formatTimeUntilStart(tournament.start_time));
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [tournament.end_time, tournament.start_time, tournament.status]);

    // Handle tournament actions
    const handleJoinTournament = useCallback(() => {
        if (tournament.status === 'active' && tournament.mode && tournament.mode in gameRoutes) {
            setIsLoading(true);
            const gameRoute = gameRoutes[tournament.mode];
            console.log('Navigating to:', gameRoute); // Debug log
            setTimeout(() => {
                router.push(gameRoute);
            }, 600);
        } else {
            console.error('Invalid tournament mode or status:', tournament.mode, tournament.status);
        }
    }, [tournament, router]);

    const handleViewLeaderboard = useCallback(() => {
        if (onViewLeaderboard && tournament.mode) {
            onViewLeaderboard(tournament);
        } else {
            console.error('Cannot view leaderboard: missing mode or callback');
        }
    }, [tournament, onViewLeaderboard]);

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom safe-area-inset">
            <div className="px-4 pb-8">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        className="mb-4 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                        variant="bordered"
                        startContent={<ArrowLeft size={16} />}
                        onClick={onBack}
                    >
                        {t("tournaments.leaderboard.backToTournaments")}
                    </Button>

                    <Card className={`bg-black/40 backdrop-blur-sm border-2 ${colors.border}`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-16 h-16 rounded-xl ${colors.background} border ${colors.border} flex items-center justify-center`}>
                                        <ModeIcon className={colors.primary} size={32} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                                        <p className={`text-sm ${colors.primary}`}>
                                            {t(`tournaments.modes.${tournament.mode}` as any)}
                                        </p>
                                        <Chip
                                            size="sm"
                                            className={`mt-2 ${colors.background} ${colors.primary} border ${colors.border}`}
                                            variant="bordered"
                                        >
                                            {t(`tournaments.status.${tournament.status}` as any)}
                                        </Chip>
                                    </div>
                                </div>

                                {tournament.status === 'active' && timeLeft && (
                                    <div className="text-right">
                                        <div className="text-white/60 text-xs">{t("tournaments.details.timeLeft")}</div>
                                        <div className={`font-mono text-xl ${colors.primary}`}>{timeLeft}</div>
                                    </div>
                                )}

                                {tournament.status === 'upcoming' && timeLeft && (
                                    <div className="text-right">
                                        <div className="text-white/60 text-xs">{t("tournaments.details.startsIn")}</div>
                                        <div className={`font-mono text-xl ${colors.primary}`}>{timeLeft}</div>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardBody className="pt-2">
                            {tournament.description && (
                                <p className="text-white/70 text-sm mb-4">{tournament.description}</p>
                            )}

                            {/* Tournament Statistics */}
                            <TournamentStats tournament={tournament} mode={tournament.mode} />
                        </CardBody>

                        <CardFooter className="pt-2">
                            <div className="flex items-center space-x-3 w-full">
                                {tournament.status === 'active' && (
                                    <Button
                                        className={`flex-1 border ${colors.button} text-white font-bold`}
                                        variant="bordered"
                                        startContent={<Play size={16} />}
                                        isLoading={isLoading}
                                        onClick={handleJoinTournament}
                                    >
                                        {isLoading ? t("common.loading") : t("tournaments.details.joinTournament")}
                                    </Button>
                                )}

                                <Button
                                    className={`flex-1 border ${colors.button} text-white font-bold`}
                                    variant="bordered"
                                    startContent={<Trophy size={16} />}
                                    onClick={handleViewLeaderboard}
                                >
                                    {t("tournaments.details.viewLeaderboard")}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                {/* How to Participate */}
                <Card className="bg-white/5 border border-white/20 mb-6">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Target className="text-blue-400" size={20} />
                            <h2 className="text-lg font-bold text-white">
                                {t("tournaments.participation.howToParticipate")}
                            </h2>
                        </div>
                    </CardHeader>
                    <CardBody className="pt-2">
                        <div className="space-y-3">
                            <p className="text-white/70 text-sm">
                                {t("tournaments.participation.playGames", {
                                    mode: t(`tournaments.modes.${tournament.mode}` as any)
                                })}
                            </p>
                            <p className="text-white/70 text-sm">
                                {t("tournaments.participation.bestScore")}
                            </p>
                            <p className="text-white/70 text-sm">
                                {t("tournaments.participation.multipleGames")}
                            </p>
                            <p className="text-white/70 text-sm">
                                {t("tournaments.participation.timeLimit")}
                            </p>
                            <p className="text-green-400 text-sm font-bold">
                                {t("tournaments.participation.goodLuck")}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                {/* Prizes */}
                {tournament.prizes && tournament.prizes.length > 0 && (
                    <Card className="bg-white/5 border border-white/20">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <Trophy className="text-yellow-400" size={20} />
                                <h2 className="text-lg font-bold text-white">
                                    {t("tournaments.details.prizes")}
                                </h2>
                            </div>
                        </CardHeader>
                        <CardBody className="pt-2">
                            <div className="space-y-3">
                                {tournament.prizes.map((prize: Prize, index: number) => (
                                    <PrizeItem key={prize.position || index} prize={prize} index={index} />
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    );
}