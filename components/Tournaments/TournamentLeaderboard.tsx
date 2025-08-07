// src/components/Tournaments/TournamentLeaderboard.tsx - Future Tech лидерборд с отображением призов

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    Spinner,
    Avatar,
} from "@nextui-org/react";
import {
    Trophy,
    Target,
    ArrowLeft,
    Crown,
    Medal,
    Award,
    AlertTriangle,
    Star,
    TrendingUp,
    Zap,
    Users,
    Clock,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament и leaderboard interfaces
interface Tournament {
    id: string;
    name: string;
    description?: string;
    mode: "survival" | "physics" | "rotation";
    start_time: string;
    end_time: string;
    status: "upcoming" | "active" | "completed" | "cancelled";
    prizes: any[];
    created_at: string;
    updated_at: string;
}

interface PublicTournamentLeaderboardEntry {
    tournament_id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    best_score: number;
}

interface TournamentLeaderboardData {
    tournament: Tournament;
    leaderboard: PublicTournamentLeaderboardEntry[];
    userPosition?: {
        position: number;
        entry: PublicTournamentLeaderboardEntry;
    };
}

// Future Tech цвета
function getFutureTechModeColors(mode: string) {
    switch (mode) {
        case "survival":
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
        case "physics":
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
        case "rotation":
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

// Получение иконки позиции
function getPositionIcon(position: number): React.ComponentType<any> | null {
    switch (position) {
        case 1:
            return Crown;
        case 2:
        case 3:
            return Medal;
        default:
            return position <= 10 ? Award : null;
    }
}

// Получение цвета позиции
function getPositionColor(position: number): string {
    switch (position) {
        case 1:
            return "#ffd700";
        case 2:
            return "#c0c0c0";
        case 3:
            return "#cd7f32";
        default:
            return position <= 10 ? "#3b82f6" : "#64748b";
    }
}

// Форматирование больших чисел
function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

// Проверка принадлежности записи текущему пользователю
function isCurrentUserEntry(
    entry: PublicTournamentLeaderboardEntry,
    user: any
): boolean {
    if (!user) return false;

    const entryFullName = `${entry.first_name} ${entry.last_name || ""}`.trim();
    const userFullName = `${user.first_name} ${user.last_name || ""}`.trim();

    if (entry.username && user.username) {
        return entry.username === user.username;
    }

    return entryFullName === userFullName;
}

// Компонент отображения призов
function PrizesDisplay({ prizes, colors }: { prizes: any[]; colors: any }) {
    const t = useT();

    if (!prizes || prizes.length === 0) return null;

    const prizeConfig = [
        { icon: "🥇", color: "#ffd700", label: "1ST" },
        { icon: "🥈", color: "#c0c0c0", label: "2ND" },
        { icon: "🥉", color: "#cd7f32", label: "3RD" },
        { icon: "🏆", color: colors.primary, label: "TOP" },
        { icon: "💎", color: colors.secondary, label: "PRIZE" },
    ];

    // Функция для безопасного получения позиции приза
    const getPrizePosition = (prize: any): string => {
        if (prize.position !== undefined) {
            return typeof prize.position === 'string' ? prize.position : `#${prize.position}`;
        }
        if (prize.place !== undefined) {
            return typeof prize.place === 'string' ? prize.place : `#${prize.place}`;
        }
        return `#${prizes.indexOf(prize) + 1}`;
    };

    // Функция для безопасного получения описания приза
    const getPrizeDescription = (prize: any): string => {
        const description = prize.description || prize.prize || 'Prize';
        return description.length > 20 ? description.substring(0, 20) + '...' : description;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                <Trophy size={12} />
                <span>PRIZE MATRIX</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {prizes.slice(0, 4).map((prize, index) => {
                    const config = prizeConfig[index] || prizeConfig[4];
                    return (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2 rounded border bg-black/40"
                            style={{
                                borderColor: config.color + "40",
                                boxShadow: `0 0 8px ${config.color}20`,
                            }}
                        >
                            <span className="text-sm">{config.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-mono" style={{ color: config.color }}>
                                    {getPrizePosition(prize)}
                                </div>
                                <div className="text-xs text-white/60 truncate">
                                    {getPrizeDescription(prize)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {prizes.length > 4 && (
                <div className="text-center">
                    <span className="text-xs font-mono text-white/40">
                        +{prizes.length - 4} MORE PRIZES
                    </span>
                </div>
            )}
        </div>
    );
}

// Компонент записи лидерборда
function LeaderboardEntry({
    entry,
    position,
    colors,
    isCurrentUser = false,
}: {
    entry: PublicTournamentLeaderboardEntry;
    position: number;
    colors: any;
    isCurrentUser?: boolean;
}) {
    const PositionIcon = getPositionIcon(position);
    const positionColor = getPositionColor(position);

    return (
        <Card
            className={`bg-black/60 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01] ${isCurrentUser
                    ? `border-2 ${colors.border}`
                    : "border-white/10 hover:border-white/20"
                }`}
            style={{
                boxShadow: isCurrentUser ? `0 0 15px ${colors.glow}` : "none",
            }}
        >
            <CardBody className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Position */}
                        <div
                            className="flex items-center justify-center w-8 h-8 rounded border"
                            style={{
                                borderColor: positionColor + "60",
                                backgroundColor: positionColor + "20",
                            }}
                        >
                            {PositionIcon ? (
                                <PositionIcon
                                    className="text-sm"
                                    size={14}
                                    style={{ color: positionColor }}
                                />
                            ) : (
                                <span
                                    className="text-xs font-mono font-bold"
                                    style={{ color: positionColor }}
                                >
                                    {position}
                                </span>
                            )}
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-2">
                            <Avatar
                                className="bg-white/20 text-white border"
                                name={entry.first_name.charAt(0)}
                                size="sm"
                                style={{
                                    borderColor: isCurrentUser ? colors.primary : "transparent",
                                }}
                            />
                            <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-white font-mono text-sm truncate">
                                        {entry.first_name}
                                        {entry.last_name && ` ${entry.last_name.charAt(0)}.`}
                                    </span>
                                    {isCurrentUser && (
                                        <Star
                                            size={10}
                                            className="text-yellow-400 fill-current"
                                        />
                                    )}
                                </div>
                                {entry.username && (
                                    <span className="text-white/50 text-xs font-mono">
                                        @{entry.username.length > 12
                                            ? entry.username.substring(0, 12) + '...'
                                            : entry.username}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                        <div
                            className="text-sm font-mono font-bold"
                            style={{ color: isCurrentUser ? colors.primary : "#ffffff" }}
                        >
                            {formatNumber(entry.best_score)}
                        </div>
                        <div className="text-xs text-white/50 font-mono">PTS</div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

// Главный компонент лидерборда
export default function TournamentLeaderboard({
    tournament,
    onBack,
}: {
    tournament: Tournament;
    onBack: () => void;
}) {
    const { user, makeAuthenticatedRequest } = useUser();
    const t = useT();

    const [leaderboardData, setLeaderboardData] =
        useState<TournamentLeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const colors = getFutureTechModeColors(tournament.mode);

    const tournamentQuery = `${tournament.mode}-week-${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7))}-${new Date().getFullYear()}`;

    const fetchLeaderboard = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await makeAuthenticatedRequest(
                `/api/tournaments?tournament=${encodeURIComponent(tournamentQuery)}`,
            );

            if (!response.ok) {
                throw new Error("Failed to fetch leaderboard");
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to fetch leaderboard");
            }

            setLeaderboardData({
                tournament: result.tournament,
                leaderboard: result.leaderboard,
                userPosition: result.userPosition,
            });
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            setError(
                error instanceof Error ? error.message : "Failed to fetch leaderboard",
            );
        } finally {
            setIsLoading(false);
        }
    }, [makeAuthenticatedRequest, tournamentQuery]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // Update countdown timer
    useEffect(() => {
        const updateTimer = () => {
            if (tournament.status === "active") {
                const now = new Date().getTime();
                const end = new Date(tournament.end_time).getTime();
                const remaining = Math.max(0, end - now);

                if (remaining === 0) {
                    setTimeLeft("ENDED");
                    return;
                }

                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

                if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
                else setTimeLeft(`${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 30000);

        return () => clearInterval(interval);
    }, [tournament.end_time, tournament.status]);

    const handleRetry = useCallback(() => {
        setError(null);
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center safe-area-inset">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <Spinner color="primary" size="lg" />
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <p className="text-white/80 font-mono text-sm">LOADING LEADERBOARD...</p>
                </div>
            </div>
        );
    }

    // Error state
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
                            onClick={onBack}
                        >
                            BACK
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const { leaderboard, userPosition } = leaderboardData || {};

    return (
        <div className="min-h-screen bg-black safe-area-inset-bottom safe-area-inset">
            <div className="px-4 pb-8">
                {/* Header */}
                <div className="mb-6 pt-4">
                    <Button
                        className="mb-4 bg-white/10 border border-white/30 text-white font-mono text-xs"
                        startContent={<ArrowLeft size={14} />}
                        size="sm"
                        onClick={onBack}
                    >
                        BACK
                    </Button>

                    <Card
                        className="bg-black/80 backdrop-blur-sm border-2"
                        style={{
                            borderColor: colors.primary + "60",
                            boxShadow: `0 0 30px ${colors.glow}`,
                        }}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded border flex items-center justify-center"
                                        style={{
                                            backgroundColor: colors.primary + "20",
                                            borderColor: colors.primary + "60",
                                            boxShadow: `0 0 15px ${colors.glow}`,
                                        }}
                                    >
                                        <span className="text-lg">
                                            {tournament.mode === "survival" ? "⚡" :
                                                tournament.mode === "physics" ? "⚛️" : "🔄"}
                                        </span>
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-white font-mono">
                                            {tournament.name}
                                        </h1>
                                        <p className="text-xs font-mono" style={{ color: colors.primary }}>
                                            {t(`tournaments.modes.${tournament.mode}` as any)} • LEADERBOARD
                                        </p>
                                    </div>
                                </div>

                                {tournament.status === "active" && timeLeft && (
                                    <div className="text-right">
                                        <div className="text-xs text-white/60 font-mono">ENDS IN</div>
                                        <div
                                            className="text-sm font-mono font-bold"
                                            style={{ color: colors.primary }}
                                        >
                                            {timeLeft}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardBody className="pt-0">
                            {tournament.description && (
                                <p className="text-white/70 text-xs font-mono mb-3">
                                    {tournament.description}
                                </p>
                            )}

                            {/* Prizes Display */}
                            <PrizesDisplay prizes={tournament.prizes} colors={colors} />
                        </CardBody>
                    </Card>
                </div>

                {/* User Position */}
                {userPosition && (
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={12} style={{ color: colors.primary }} />
                                <h2 className="text-xs font-mono tracking-wider" style={{ color: colors.primary }}>
                                    YOUR POSITION
                                </h2>
                            </div>
                            <div
                                className="flex-1 h-px bg-gradient-to-r to-transparent"
                                style={{
                                    backgroundImage: `linear-gradient(to right, ${colors.primary}60, transparent)`
                                }}
                            />
                        </div>
                        <LeaderboardEntry
                            colors={colors}
                            entry={userPosition.entry}
                            isCurrentUser={true}
                            position={userPosition.position}
                        />
                    </div>
                )}

                {/* Non-participation message */}
                {!userPosition && user && (
                    <div className="mb-6">
                        <Card className="bg-blue-500/10 border border-blue-400/30">
                            <CardBody className="p-4 text-center space-y-2">
                                <Target className="text-blue-400 mx-auto" size={24} />
                                <h3 className="text-white font-mono text-sm font-bold">
                                    NOT IN COMPETITION
                                </h3>
                                <p className="text-blue-300 text-xs font-mono">
                                    Play {t(`tournaments.modes.${tournament.mode}` as any)} mode to join
                                </p>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Leaderboard */}
                {leaderboard && Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="text-yellow-400" size={12} />
                                <h2 className="text-xs font-mono text-yellow-400 tracking-wider">
                                    TOP PLAYERS
                                </h2>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent" />
                            <div className="flex items-center gap-1 text-xs font-mono text-white/50">
                                <Users size={10} />
                                <span>{leaderboard.length}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {leaderboard.map((entry, index) => {
                                if (!entry) return null; // Защита от пустых записей

                                const position = index + 1;
                                const isCurrentUser = isCurrentUserEntry(entry, user);

                                return (
                                    <LeaderboardEntry
                                        key={`${entry.tournament_id || 'unknown'}-${entry.first_name || 'unknown'}-${position}`}
                                        colors={colors}
                                        entry={entry}
                                        isCurrentUser={isCurrentUser}
                                        position={position}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="relative mb-6">
                            <Trophy className="text-white/20 mx-auto" size={48} />
                            <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white font-mono">NO DATA</h3>
                            <p className="text-white/60 font-mono text-sm">
                                {tournament.status === "upcoming"
                                    ? "TOURNAMENT NOT STARTED"
                                    : "NO PARTICIPANTS YET"}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}