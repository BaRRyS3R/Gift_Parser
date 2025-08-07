// src/app/tournaments/page.tsx - Main tournaments page

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter, Button, Spinner } from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Users,
    Crosshair,
    Atom,
    RotateCw,
    ChevronRight,
    Calendar,
    Target,
    AlertTriangle,
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

// Get mode icon component
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

// Get mode color classes
function getModeColors(mode: string) {
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
}

// Format time remaining
function formatTimeRemaining(endTime: string): string {
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
}

// Format time until start
function formatTimeUntilStart(startTime: string): string {
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
}

// Tournament card component
function TournamentCard({ tournament, onViewDetails, onViewLeaderboard }: {
    tournament: Tournament;
    onViewDetails: (tournament: Tournament) => void;
    onViewLeaderboard: (tournament: Tournament) => void;
}) {
    const t = useT();
    const [timeLeft, setTimeLeft] = useState<string>("");
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

    return (
        <Card
            className={`bg-black/40 backdrop-blur-sm border-2 ${colors.border} hover:border-opacity-60 transition-all duration-300 hover:scale-105`}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl ${colors.background} border ${colors.border} flex items-center justify-center`}>
                            <ModeIcon className={colors.primary} size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">{tournament.name}</h3>
                            <p className={`text-sm ${colors.primary}`}>
                                {t(`tournaments.modes.${tournament.mode}` as any)}
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.background} ${colors.primary} border ${colors.border}`}>
                        {t(`tournaments.status.${tournament.status}` as any)}
                    </div>
                </div>
            </CardHeader>

            <CardBody className="py-2">
                {tournament.description && (
                    <p className="text-white/70 text-sm mb-3">{tournament.description}</p>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center space-x-1">
                            <Clock size={14} />
                            <span>
                                {tournament.status === 'active' ? t("tournaments.details.timeLeft") :
                                    tournament.status === 'upcoming' ? t("tournaments.details.startsIn") :
                                        t("tournaments.details.endedOn")}
                            </span>
                        </span>
                        <span className={`font-mono ${colors.primary}`}>
                            {tournament.status === 'completed'
                                ? new Date(tournament.end_time).toLocaleDateString()
                                : timeLeft}
                        </span>
                    </div>

                    {tournament.prizes && tournament.prizes.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60 flex items-center space-x-1">
                                <Trophy size={14} />
                                <span>{t("tournaments.details.prizes")}</span>
                            </span>
                            <span className="text-yellow-400 font-bold">
                                {tournament.prizes.length} {t("tournaments.prizes.topTen")}
                            </span>
                        </div>
                    )}
                </div>
            </CardBody>

            <CardFooter className="pt-2">
                <div className="flex items-center space-x-2 w-full">
                    {tournament.status === 'active' && (
                        <Button
                            className={`flex-1 border ${colors.button} text-white font-bold`}
                            variant="bordered"
                            onClick={() => onViewDetails(tournament)}
                        >
                            {t("tournaments.details.joinTournament")}
                        </Button>
                    )}

                    <Button
                        className={`flex-1 border ${colors.button} text-white font-bold`}
                        variant="bordered"
                        endContent={<ChevronRight size={16} />}
                        onClick={() => onViewLeaderboard(tournament)}
                    >
                        {t("tournaments.details.viewLeaderboard")}
                    </Button>
                </div>
            </CardFooter>
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

    // Check if we should show a specific tournament leaderboard
    const tournamentQuery = searchParams.get('tournament');

    // Fetch tournaments data
    const fetchTournaments = useCallback(async () => {
        if (tournamentQuery) {
            // Fetch specific tournament and its leaderboard
            try {
                setIsLoading(true);
                setError(null);

                const response = await makeAuthenticatedRequest(
                    `/api/tournaments?tournament=${encodeURIComponent(tournamentQuery)}`
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
            // Fetch all tournaments
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
    }, [makeAuthenticatedRequest, tournamentQuery]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    // Handle tournament actions
    const handleViewDetails = useCallback((tournament: Tournament) => {
        if (tournament.status === 'active') {
            // Navigate to the appropriate game mode
            const gameRoute = `/game/${tournament.mode}`;
            router.push(gameRoute);
        }
    }, [router]);

    const handleViewLeaderboard = useCallback((tournament: Tournament) => {
        const query = `${tournament.mode}-week-${Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7))}-${new Date().getFullYear()}`;
        router.push(`/tournaments?tournament=${encodeURIComponent(query)}`);
    }, [router]);

    const handleBackToTournaments = useCallback(() => {
        router.push('/tournaments');
    }, [router]);

    const handleRetry = useCallback(() => {
        setError(null);
        fetchTournaments();
    }, [fetchTournaments]);

    // Telegram WebApp back button
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

    // Show tournament leaderboard if specific tournament is selected
    if (selectedTournament) {
        return (
            <TournamentLeaderboard
                tournament={selectedTournament}
                onBack={handleBackToTournaments}
            />
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white safe-area-inset">
                <div className="text-center space-y-4">
                    <Spinner color="white" size="lg" />
                    <p className="text-white/80">{t("tournaments.errors.loadingTournaments")}</p>
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
                    <h2 className="text-xl font-bold">{t("tournaments.errors.failedToLoad")}</h2>
                    <p className="text-white/70">{error}</p>
                    <Button
                        className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                        variant="bordered"
                        onClick={handleRetry}
                    >
                        {t("tournaments.errors.tryAgain")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom safe-area-inset">
            <div className="px-4 pb-8">
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
                        {t("tournaments.title")}
                    </h1>
                    <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
                        {t("tournaments.subtitle")}
                    </p>
                </div>

                {/* Active Tournament */}
                {tournaments?.active && (
                    <div className="mb-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                            <Trophy className="text-yellow-400" size={24} />
                            <span>{t("tournaments.sections.activeTournament")}</span>
                        </h2>
                        <TournamentCard
                            tournament={tournaments.active}
                            onViewDetails={handleViewDetails}
                            onViewLeaderboard={handleViewLeaderboard}
                        />
                    </div>
                )}

                {/* No Active Tournament */}
                {!tournaments?.active && (
                    <div className="mb-8 animate-fade-in">
                        <div className="bg-white/5 border border-white/20 rounded-xl p-6 text-center">
                            <Calendar className="text-white/40 mx-auto mb-4" size={48} />
                            <h3 className="text-lg font-bold text-white mb-2">
                                {t("tournaments.sections.noActiveTournament")}
                            </h3>
                            <p className="text-white/60">
                                {tournaments?.upcoming && tournaments.upcoming.length > 0
                                    ? t("tournaments.empty.checkBackLater")
                                    : t("tournaments.empty.firstTournament")}
                            </p>
                        </div>
                    </div>
                )}

                {/* Upcoming Tournaments */}
                {tournaments?.upcoming && tournaments.upcoming.length > 0 && (
                    <div className="mb-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                            <Clock className="text-blue-400" size={24} />
                            <span>{t("tournaments.sections.upcomingTournaments")}</span>
                        </h2>
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
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                            <Trophy className="text-gray-400" size={24} />
                            <span>{t("tournaments.sections.completedTournaments")}</span>
                        </h2>
                        <div className="space-y-4">
                            {tournaments.completed.slice(0, 5).map((tournament) => (
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
                        <div className="text-center py-12 animate-fade-in">
                            <Trophy className="text-white/20 mx-auto mb-6" size={64} />
                            <h3 className="text-xl font-bold text-white mb-2">
                                {t("tournaments.empty.noTournaments")}
                            </h3>
                            <p className="text-white/60">
                                {t("tournaments.empty.firstTournament")}
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
}

export default function TournamentsPage() {
    return (
        <AuthGuard requireCompleteAuth={true} showError={true}>
            <TournamentsPageContent />
        </AuthGuard>
    );
}