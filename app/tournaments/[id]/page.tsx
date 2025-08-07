// src/app/tournaments/[id]/page.tsx - Fixed detail page with proper types

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Users,
    Calendar,
    Clock,
    Gift,
    Target,
    Crosshair,
    Atom,
    RotateCw,
    RefreshCw,
    Play
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useTournaments } from "@/hooks/modules/useTournaments";
import TournamentLeaderboard from "@/components/Tournament/TournamentLeaderboard";
import { useT } from "@/contexts/LocalizationContext";
import {
    getTournamentTimeRemaining,
    getTournamentTimeUntilStart,
    type TournamentGameMode,
    type TournamentPrize
} from "@/types/tournaments";

interface TournamentDetailPageProps {
    params: {
        id: string;
    };
}

interface GameModeColors {
    primary: string;
    bg: string;
    border: string;
}

export default function TournamentDetailPage({ params }: TournamentDetailPageProps) {
    const router = useRouter();
    const { makeAuthenticatedRequest } = useUser();
    const {
        currentTournament,
        leaderboard,
        isLoading,
        error,
        fetchTournamentDetails,
        fetchTournamentLeaderboard,
        clearError,
    } = useTournaments(makeAuthenticatedRequest);

    const t = useT();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "leaderboard">("overview");

    // Setup Telegram WebApp back button
    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            if (tg.BackButton) {
                tg.BackButton.show();

                const handleBackClick = () => {
                    router.push("/tournaments");
                };

                tg.BackButton.onClick(handleBackClick);

                return () => {
                    tg.BackButton.offClick(handleBackClick);
                    tg.BackButton.hide();
                };
            }
        }
    }, [router]);

    // Load tournament data on mount
    useEffect(() => {
        const loadTournamentData = async () => {
            await fetchTournamentDetails(params.id);
            if (activeTab === "leaderboard") {
                await fetchTournamentLeaderboard(params.id);
            }
        };

        loadTournamentData();
    }, [params.id, fetchTournamentDetails, fetchTournamentLeaderboard, activeTab]);

    const handleTabChange = async (tab: "overview" | "leaderboard") => {
        setActiveTab(tab);
        if (tab === "leaderboard" && !leaderboard) {
            await fetchTournamentLeaderboard(params.id);
        }
    };

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        clearError();

        await fetchTournamentDetails(params.id);
        if (activeTab === "leaderboard") {
            await fetchTournamentLeaderboard(params.id);
        }

        setIsRefreshing(false);
    }, [params.id, activeTab, fetchTournamentDetails, fetchTournamentLeaderboard, clearError]);

    const handlePlayGame = () => {
        if (!currentTournament) return;

        const gameRoutes: Record<TournamentGameMode, string> = {
            survival: "/game/survival",
            physics: "/game/physics",
            rotation: "/game/rotation",
        };

        const route = gameRoutes[currentTournament.game_mode];
        if (route) {
            router.push(route);
        }
    };

    const getGameModeIcon = (mode: TournamentGameMode) => {
        switch (mode) {
            case "survival":
                return <Crosshair className="text-red-400" size={24} />;
            case "physics":
                return <Atom className="text-purple-400" size={24} />;
            case "rotation":
                return <RotateCw className="text-orange-400" size={24} />;
        }
    };

    const getGameModeColors = (mode: TournamentGameMode): GameModeColors => {
        switch (mode) {
            case "survival":
                return {
                    primary: "text-red-400",
                    bg: "bg-red-500/10",
                    border: "border-red-400/30",
                };
            case "physics":
                return {
                    primary: "text-purple-400",
                    bg: "bg-purple-500/10",
                    border: "border-purple-400/30",
                };
            case "rotation":
                return {
                    primary: "text-orange-400",
                    bg: "bg-orange-500/10",
                    border: "border-orange-400/30",
                };
            default:
                return {
                    primary: "text-gray-400",
                    bg: "bg-gray-500/10",
                    border: "border-gray-400/30",
                };
        }
    };

    const formatDateRange = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const formatOptions: Intl.DateTimeFormatOptions = {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };

        return `${start.toLocaleDateString("en-US", formatOptions)} - ${end.toLocaleDateString("en-US", formatOptions)}`;
    };

    const getStatusDisplay = () => {
        if (!currentTournament) return null;

        switch (currentTournament.status) {
            case "upcoming": {
                const timeUntilStart = getTournamentTimeUntilStart(currentTournament);
                const daysUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60 * 24));
                return {
                    text: t("tournaments.status.upcoming"),
                    detail: daysUntilStart > 0 ? `${daysUntilStart} d` : t("tournaments.status.startingSoon"),
                    color: "text-blue-400",
                    bgColor: "bg-blue-500/10",
                };
            }
            case "active": {
                const timeRemaining = getTournamentTimeRemaining(currentTournament);
                const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
                return {
                    text: t("tournaments.status.active"),
                    detail: hoursRemaining > 24 ? `${Math.ceil(hoursRemaining / 24)} d` : `${hoursRemaining} h`,
                    color: "text-green-400",
                    bgColor: "bg-green-500/10",
                };
            }
            case "ended":
                return {
                    text: t("tournaments.status.ended"),
                    detail: "",
                    color: "text-gray-400",
                    bgColor: "bg-gray-500/10",
                };
            default:
                return {
                    text: "Unknown",
                    detail: "",
                    color: "text-gray-400",
                    bgColor: "bg-gray-500/10",
                };
        }
    };

    const getTournamentModeTranslationKey = (mode: TournamentGameMode) => {
        switch (mode) {
            case "survival":
                return "tournaments.modes.survival" as const;
            case "physics":
                return "tournaments.modes.physics" as const;
            case "rotation":
                return "tournaments.modes.rotation" as const;
            default:
                return "tournaments.modes.survival" as const;
        }
    };

    const getTournamentRulesTranslationKey = (mode: TournamentGameMode) => {
        switch (mode) {
            case "survival":
                return "tournaments.rules.survival" as const;
            case "physics":
                return "tournaments.rules.physics" as const;
            case "rotation":
                return "tournaments.rules.rotation" as const;
            default:
                return "tournaments.rules.survival" as const;
        }
    };

    if (isLoading && !currentTournament) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">{t("tournaments.loading")}</p>
                </div>
            </div>
        );
    }

    if (error || !currentTournament) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Trophy className="text-white/40 mx-auto" size={48} />
                    <h3 className="text-lg font-bold text-white/80">
                        {t("tournaments.error.notFound")}
                    </h3>
                    <p className="text-white/60">{error || t("tournaments.error.loadFailed")}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        {t("common.retry")}
                    </button>
                </div>
            </div>
        );
    }

    const status = getStatusDisplay();
    const colors = getGameModeColors(currentTournament.game_mode);

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom">
            <div className="px-6 py-8">
                {/* Tournament Header */}
                <div className={`rounded-xl border backdrop-blur-sm p-6 mb-6 ${colors.bg} ${colors.border}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            {getGameModeIcon(currentTournament.game_mode)}
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {currentTournament.name}
                                </h1>
                                <p className="text-white/70 capitalize">
                                    {t(getTournamentModeTranslationKey(currentTournament.game_mode))}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {status && (
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                                    {status.text}
                                    {status.detail && (
                                        <span className="ml-2 text-xs">
                                            {status.detail} {t("tournaments.remaining")}
                                        </span>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`${isRefreshing ? "animate-spin" : ""}`} size={16} />
                            </button>
                        </div>
                    </div>

                    {currentTournament.description && (
                        <p className="text-white/80 mb-4">
                            {currentTournament.description}
                        </p>
                    )}

                    {/* Tournament Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Calendar className="text-blue-400" size={16} />
                                <span className="text-blue-400 text-sm font-medium">
                                    {t("tournaments.duration")}
                                </span>
                            </div>
                            <div className="text-white text-sm">
                                {formatDateRange(currentTournament.start_date, currentTournament.end_date)}
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Users className="text-green-400" size={16} />
                                <span className="text-green-400 text-sm font-medium">
                                    {t("tournaments.participants")}
                                </span>
                            </div>
                            <div className="text-white text-sm">
                                {currentTournament.participant_count.toLocaleString()}
                                {currentTournament.max_participants && (
                                    <span className="text-white/60">
                                        /{currentTournament.max_participants.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Gift className="text-yellow-400" size={16} />
                                <span className="text-yellow-400 text-sm font-medium">
                                    {t("tournaments.prizes")}
                                </span>
                            </div>
                            <div className="text-white text-sm">
                                {currentTournament.prizes.length} {t("tournaments.positions")}
                            </div>
                        </div>
                    </div>

                    {/* User Status & Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {currentTournament.user_result && (
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-green-300 text-sm font-medium">
                                        {t("tournaments.participating")}
                                    </span>
                                    {currentTournament.user_position && (
                                        <span className="text-white/60 text-sm">
                                            #{currentTournament.user_position}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {currentTournament.status === "active" && (
                            <button
                                onClick={handlePlayGame}
                                className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <Play size={16} />
                                <span>{t("tournaments.playNow")}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-1 mb-6">
                    <button
                        onClick={() => handleTabChange("overview")}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "overview"
                            ? "bg-white/10 text-white border border-white/20"
                            : "text-white/60 hover:text-white/80"
                            }`}
                    >
                        {t("tournaments.tabs.overview")}
                    </button>
                    <button
                        onClick={() => handleTabChange("leaderboard")}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "leaderboard"
                            ? "bg-white/10 text-white border border-white/20"
                            : "text-white/60 hover:text-white/80"
                            }`}
                    >
                        {t("tournaments.tabs.leaderboard")}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "overview" ? (
                    <div className="space-y-6">
                        {/* Prizes Section */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                                <Gift className="text-yellow-400" size={20} />
                                <span>{t("tournaments.prizes")}</span>
                            </h2>

                            <div className="space-y-3">
                                {currentTournament.prizes.map((prize: TournamentPrize, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${prize.position === 1 ? "bg-yellow-400 text-black" :
                                                prize.position === 2 ? "bg-gray-300 text-black" :
                                                    prize.position === 3 ? "bg-amber-500 text-black" :
                                                        "bg-white/20 text-white"
                                                }`}>
                                                #{prize.position}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{prize.title}</div>
                                                <div className="text-white/60 text-sm">{prize.description}</div>
                                            </div>
                                        </div>
                                        {prize.value && (
                                            <div className="text-white font-medium">
                                                {prize.value}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rules Section */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                                <Target className="text-blue-400" size={20} />
                                <span>{t("tournaments.rules.title")}</span>
                            </h2>

                            <div className="prose prose-invert max-w-none">
                                <p className="text-white/80 mb-4">
                                    {t(getTournamentRulesTranslationKey(currentTournament.game_mode))}
                                </p>

                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <h3 className="text-white font-medium mb-2">
                                        {t("tournaments.rules.scoring")}
                                    </h3>
                                    <p className="text-white/70 text-sm">
                                        {t("tournaments.rules.bestScore")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    leaderboard ? (
                        <TournamentLeaderboard
                            leaderboard={leaderboard.leaderboard}
                            userPosition={leaderboard.user_position}
                            totalParticipants={leaderboard.total_participants}
                            stats={leaderboard.stats}
                            isLoading={isLoading}
                            gameMode={currentTournament.game_mode}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white">{t("tournaments.leaderboard.loading")}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}