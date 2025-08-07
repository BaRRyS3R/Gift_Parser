// src/components/Tournaments/TournamentLeaderboard.tsx - Tournament leaderboard component

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardBody, Button, Spinner, Avatar } from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Target,
    ArrowLeft,
    Crown,
    Medal,
    Award,
    Crosshair,
    Atom,
    RotateCw,
    AlertTriangle,
    Star,
    TrendingUp,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament and leaderboard interfaces
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

interface TournamentLeaderboardEntry {
    id: string;
    tournament_id: string;
    user_id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_premium: boolean;
    best_score: number;
    total_games: number;
    best_time?: number;
    max_level?: number;
    best_streak?: number;
    total_hits?: number;
    least_mistakes?: number;
    first_game_at?: string;
    last_game_at?: string;
    created_at: string;
    updated_at: string;
}

interface TournamentLeaderboardData {
    tournament: Tournament;
    leaderboard: TournamentLeaderboardEntry[];
    userPosition?: {
        position: number;
        entry: TournamentLeaderboardEntry;
    };
}

// Get mode icon and colors
function getModeIcon(mode: string): React.ComponentType<any> {
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
}

function getModeColors(mode: string) {
    switch (mode) {
        case 'survival':
            return {
                primary: "text-red-400",
                background: "bg-red-500/10",
                border: "border-red-400/30",
            };
        case 'physics':
            return {
                primary: "text-purple-400",
                background: "bg-purple-500/10",
                border: "border-purple-400/30",
            };
        case 'rotation':
            return {
                primary: "text-orange-400",
                background: "bg-orange-500/10",
                border: "border-orange-400/30",
            };
        default:
            return {
                primary: "text-white",
                background: "bg-white/10",
                border: "border-white/30",
            };
    }
}

// Get position icon based on rank
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

// Get position color based on rank
function getPositionColor(position: number): string {
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
}

// Format time for display
function formatTime(timeMs: number): string {
    if (timeMs <= 0) return "0s";

    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
}

// Format large numbers with internationalization support
function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

// Leaderboard entry component
function LeaderboardEntry({
    entry,
    position,
    mode,
    colors,
    isCurrentUser = false
}: {
    entry: TournamentLeaderboardEntry;
    position: number;
    mode: string;
    colors: any;
    isCurrentUser?: boolean;
}) {
    const t = useT();
    const PositionIcon = getPositionIcon(position);
    const positionColor = getPositionColor(position);

    return (
        <Card
            className={`bg-black/40 backdrop-blur-sm border transition-all duration-300 ${isCurrentUser
                    ? `border-2 ${colors.border} ${colors.background}`
                    : "border-white/20 hover:border-white/30"
                }`}
        >
            <CardBody className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {/* Position */}
                        <div className="flex items-center justify-center w-12 h-12 relative">
                            {PositionIcon ? (
                                <PositionIcon className={positionColor} size={24} />
                            ) : (
                                <span className={`text-lg font-bold ${positionColor}`}>
                                    #{position}
                                </span>
                            )}
                        </div>

                        {/* User info */}
                        <div className="flex items-center space-x-3">
                            <Avatar
                                size="sm"
                                name={entry.first_name.charAt(0)}
                                className="bg-white/20 text-white"
                            />
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white font-bold">
                                        {entry.first_name}
                                        {entry.last_name && ` ${entry.last_name}`}
                                    </span>
                                    {entry.is_premium && (
                                        <Star className="text-yellow-400" size={14} />
                                    )}
                                </div>
                                {entry.username && (
                                    <span className="text-white/60 text-sm">@{entry.username}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right space-y-1">
                        <div className={`text-lg font-bold ${colors.primary}`}>
                            {formatNumber(entry.best_score)}
                        </div>
                        <div className="text-white/60 text-xs">
                            {entry.total_games} {t("tournaments.leaderboard.games")}
                        </div>

                        {/* Mode-specific stats */}
                        {mode === 'survival' && entry.best_time && (
                            <div className="text-white/60 text-xs">
                                {formatTime(entry.best_time)} • L{entry.max_level}
                            </div>
                        )}
                        {mode === 'physics' && (
                            <div className="text-white/60 text-xs">
                                {entry.total_hits} {t("tournaments.leaderboard.hits")} •
                                {entry.least_mistakes} {t("tournaments.leaderboard.mistakes")}
                            </div>
                        )}
                        {mode === 'rotation' && entry.best_time && (
                            <div className="text-white/60 text-xs">
                                {formatTime(entry.best_time)} • S{entry.best_streak}
                            </div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

// Main tournament leaderboard component
export default function TournamentLeaderboard({
    tournament,
    onBack
}: {
    tournament: Tournament;
    onBack: () => void;
}) {
    const { user, makeAuthenticatedRequest } = useUser();
    const t = useT();

    const [leaderboardData, setLeaderboardData] = useState<TournamentLeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const ModeIcon = getModeIcon(tournament.mode);
    const colors = getModeColors(tournament.mode);

    // Generate query for API call
    const tournamentQuery = `${tournament.mode}-week-${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7))}-${new Date().getFullYear()}`;

    // Fetch leaderboard data
    const fetchLeaderboard = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await makeAuthenticatedRequest(
                `/api/tournaments?tournament=${encodeURIComponent(tournamentQuery)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch leaderboard');
            }

            setLeaderboardData({
                tournament: result.tournament,
                leaderboard: result.leaderboard,
                userPosition: result.userPosition,
            });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch leaderboard');
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
            if (tournament.status === 'active') {
                const now = new Date().getTime();
                const end = new Date(tournament.end_time).getTime();
                const remaining = Math.max(0, end - now);

                if (remaining === 0) {
                    setTimeLeft("Ended");
                    return;
                }

                const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                if (days > 0) setTimeLeft(`${days}d ${hours}h`);
                else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
                else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s`);
                else setTimeLeft(`${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [tournament.end_time, tournament.status]);

    const handleRetry = useCallback(() => {
        setError(null);
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white safe-area-inset">
                <div className="text-center space-y-4">
                    <Spinner color="white" size="lg" />
                    <p className="text-white/80">{t("tournaments.leaderboard.loadingLeaderboard")}</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white safe-area-inset">
                <div className="text-center space-y-4 p-6">
                    <AlertTriangle className="text-red-400 mx-auto" size={48} />
                    <h2 className="text-xl font-bold">{t("tournaments.leaderboard.errorLoadingLeaderboard")}</h2>
                    <p className="text-white/70">{error}</p>
                    <div className="flex items-center space-x-3">
                        <Button
                            className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                            variant="bordered"
                            onClick={handleRetry}
                        >
                            {t("tournaments.leaderboard.retryLoading")}
                        </Button>
                        <Button
                            className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                            variant="bordered"
                            startContent={<ArrowLeft size={16} />}
                            onClick={onBack}
                        >
                            {t("tournaments.leaderboard.backToTournaments")}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const { leaderboard, userPosition } = leaderboardData || {};

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
                                    <div className={`w-12 h-12 rounded-xl ${colors.background} border ${colors.border} flex items-center justify-center`}>
                                        <ModeIcon className={colors.primary} size={24} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                                        <p className={`text-sm ${colors.primary}`}>
                                            {t(`tournaments.modes.${tournament.mode}` as any)} • {t("tournaments.leaderboard.title")}
                                        </p>
                                    </div>
                                </div>

                                {tournament.status === 'active' && timeLeft && (
                                    <div className="text-right">
                                        <div className="text-white/60 text-xs">{t("tournaments.details.timeLeft")}</div>
                                        <div className={`font-mono text-lg ${colors.primary}`}>{timeLeft}</div>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardBody className="pt-2">
                            {tournament.description && (
                                <p className="text-white/70 text-sm">{tournament.description}</p>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* User Position (if participating) */}
                {userPosition && (
                    <div className="mb-6 animate-fade-in">
                        <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                            <TrendingUp className={colors.primary} size={20} />
                            <span>{t("tournaments.leaderboard.yourPosition")}</span>
                        </h2>
                        <LeaderboardEntry
                            entry={userPosition.entry}
                            position={userPosition.position}
                            mode={tournament.mode}
                            colors={colors}
                            isCurrentUser={true}
                        />
                    </div>
                )}

                {/* Participation message for non-participants */}
                {!userPosition && user && (
                    <div className="mb-6 animate-fade-in">
                        <Card className="bg-blue-500/10 border border-blue-400/30">
                            <CardBody className="p-4 text-center">
                                <Target className="text-blue-400 mx-auto mb-3" size={32} />
                                <h3 className="text-white font-bold mb-2">
                                    {t("tournaments.leaderboard.notParticipating")}
                                </h3>
                                <p className="text-blue-300 text-sm">
                                    {t("tournaments.leaderboard.participateFirst", {
                                        mode: t(`tournaments.modes.${tournament.mode}` as any)
                                    })}
                                </p>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Leaderboard */}
                {leaderboard && leaderboard.length > 0 ? (
                    <div className="animate-fade-in">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                            <Trophy className="text-yellow-400" size={20} />
                            <span>{t("tournaments.leaderboard.topPlayers")}</span>
                        </h2>

                        <div className="space-y-3">
                            {leaderboard.map((entry, index) => {
                                const position = index + 1;
                                const isCurrentUser = user ? entry.telegram_id === user.telegram_id : false;

                                return (
                                    <LeaderboardEntry
                                        key={entry.id}
                                        entry={entry}
                                        position={position}
                                        mode={tournament.mode}
                                        colors={colors}
                                        isCurrentUser={isCurrentUser}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 animate-fade-in">
                        <Trophy className="text-white/20 mx-auto mb-6" size={64} />
                        <h3 className="text-xl font-bold text-white mb-2">
                            {t("tournaments.empty.noTournaments")}
                        </h3>
                        <p className="text-white/60">
                            {tournament.status === 'upcoming'
                                ? t("tournaments.cards.comingSoon")
                                : t("tournaments.leaderboard.participateFirst", {
                                    mode: t(`tournaments.modes.${tournament.mode}` as any)
                                })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}