// tournament/page.tsx - Updated with tab structure and improved UX

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Button,
} from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Target,
    Users,
    Play,
    Crown,
    Medal,
    Award,
    Activity,
    TrendingUp,
    Info,
    AlertTriangle,
    BookOpen,
    ChevronDown,
    ChevronUp,
    BarChart3,
    List,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { tournamentService, formatTournamentSurvivalTime } from "@/lib/supabase_tournament_extension";
import type { Tournament, TournamentLeaderboardEntry, TournamentResult, TournamentStatus } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

type RuleTabId = "gameMode" | "competition" | "scoring" | "format" | "fairPlay" | "tips";
type MainTabId = "tournament" | "leaderboard";

export default function TournamentPage() {
    const router = useRouter();
    const { user } = useUser();
    const t = useT();

    const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>({
        isActive: false,
        activeTournament: null,
    });
    const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
    const [userResult, setUserResult] = useState<TournamentResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [activeRuleTab, setActiveRuleTab] = useState<RuleTabId>("gameMode");
    const [activeMainTab, setActiveMainTab] = useState<MainTabId>("tournament");
    const [isPrizesExpanded, setIsPrizesExpanded] = useState(false);

    // Helper function to get rule description in a type-safe way
    const getRuleDescription = (ruleId: RuleTabId) => {
        switch (ruleId) {
            case "gameMode":
                return t("tournament.rules.gameMode.description");
            case "competition":
                return t("tournament.rules.competition.description");
            case "scoring":
                return t("tournament.rules.scoring.description");
            case "format":
                return t("tournament.rules.format.description");
            case "fairPlay":
                return t("tournament.rules.fairPlay.description");
            case "tips":
                return t("tournament.rules.tips.description");
            default:
                return "";
        }
    };

    // Helper function to get rule title in a type-safe way
    const getRuleTitle = (ruleId: RuleTabId) => {
        switch (ruleId) {
            case "gameMode":
                return t("tournament.rules.gameMode.title");
            case "competition":
                return t("tournament.rules.competition.title");
            case "scoring":
                return t("tournament.rules.scoring.title");
            case "format":
                return t("tournament.rules.format.title");
            case "fairPlay":
                return t("tournament.rules.fairPlay.title");
            case "tips":
                return t("tournament.rules.tips.title");
            default:
                return "";
        }
    };

    // Check if user has attempts remaining
    const hasAttemptsRemaining = () => {
        return user?.attempts_remaining && user.attempts_remaining > 0;
    };

    const loadTournamentData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const status = await tournamentService.getTournamentStatus();
            setTournamentStatus(status);

            if (status.activeTournament) {
                const [tournamentLeaderboard, userTournamentResult] = await Promise.all([
                    tournamentService.getTournamentLeaderboard(status.activeTournament.id, 50),
                    user?.id ? tournamentService.getUserTournamentResult(status.activeTournament.id, user.id) : null
                ]);

                setLeaderboard(tournamentLeaderboard);
                setUserResult(userTournamentResult);
            }

        } catch (err) {
            console.error("Error loading tournament data:", err);
            setError(t("tournament.tournamentNotFound"));
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, t]);

    useEffect(() => {
        loadTournamentData();
    }, [loadTournamentData]);

    // Update countdown timer
    useEffect(() => {
        if (!tournamentStatus.activeTournament || !tournamentStatus.timeRemaining) {
            setTimeRemaining("");
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const endDate = new Date(tournamentStatus.activeTournament!.end_date);
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(t("tournament.ended"));
                clearInterval(interval);
                loadTournamentData();
            } else {
                setTimeRemaining(formatTimeRemaining(diff));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [tournamentStatus.activeTournament, tournamentStatus.timeRemaining, loadTournamentData, t]);

    // Setup Telegram WebApp back button to go to main page
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

    const handleStartTournament = useCallback(async () => {
        if (!tournamentStatus.activeTournament || isTransitioning || !hasAttemptsRemaining()) return;

        setIsTransitioning(true);
        setTimeout(() => {
            router.push("/tournament/play");
        }, 600);
    }, [tournamentStatus.activeTournament, isTransitioning, router]);

    const handleOpenRules = () => {
        setIsRulesModalOpen(true);
    };

    const handleCloseRules = () => {
        setIsRulesModalOpen(false);
    };

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-white" size={16} />;
            case 2:
                return <Medal className="text-white/80" size={16} />;
            case 3:
                return <Award className="text-white/60" size={16} />;
            default:
                return (
                    <span className="text-white/50 text-sm font-medium">#{position}</span>
                );
        }
    };

    const getRankBg = (position: number) => {
        switch (position) {
            case 1:
                return "bg-white/20 border-white/40";
            case 2:
                return "bg-white/15 border-white/30";
            case 3:
                return "bg-white/10 border-white/25";
            default:
                return "bg-white/5 border-white/20";
        }
    };

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId;
    };

    const renderLeaderboardEntry = (entry: TournamentLeaderboardEntry, position: number) => {
        const isWinner = position <= (tournamentStatus.activeTournament?.prizes.length || 0);
        const prize = isWinner ? tournamentStatus.activeTournament?.prizes[position - 1] : null;

        return (
            <div
                key={entry.id}
                className={`
                    flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-sm
                    ${getRankBg(position)}
                    ${isCurrentUser(entry.telegram_id)
                        ? "ring-1 ring-white/40 bg-white/15"
                        : "hover:bg-white/10"
                    }
                `}
            >
                <div className="flex items-center justify-center w-8">
                    {getRankIcon(position)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3
                            className={`font-medium truncate text-sm ${isCurrentUser(entry.telegram_id)
                                ? "text-white"
                                : "text-white/90"
                                }`}
                        >
                            {entry.first_name} {entry.last_name || ""}
                        </h3>
                        {entry.is_premium && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded text-xs">
                                {t("leaderboard.you")}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/50 truncate">@{entry.username}</p>
                    )}
                    {prize && (
                        <div className="flex items-center space-x-1 mt-1">
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                            <span className="text-xs text-white/70">{prize}</span>
                        </div>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-base font-medium text-white">
                        {formatTournamentSurvivalTime(entry.survival_time)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-white/60">
                        <div className="flex items-center space-x-1">
                            <TrendingUp size={8} />
                            <span>L{entry.max_level_reached}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Target size={8} />
                            <span>{entry.perfect_streak}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Activity size={8} />
                            <span>{entry.correct_hits}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getRuleDetails = (ruleSection: RuleTabId) => {
        const details = [];
        let index = 1;

        while (true) {
            let key: string;
            switch (ruleSection) {
                case "gameMode":
                    key = `tournament.rules.gameMode.detail${index}`;
                    break;
                case "competition":
                    key = `tournament.rules.competition.detail${index}`;
                    break;
                case "scoring":
                    key = `tournament.rules.scoring.detail${index}`;
                    break;
                case "format":
                    key = `tournament.rules.format.detail${index}`;
                    break;
                case "fairPlay":
                    key = `tournament.rules.fairPlay.detail${index}`;
                    break;
                case "tips":
                    key = `tournament.rules.tips.detail${index}`;
                    break;
                default:
                    return details;
            }

            const detail = t(key as any);

            if (detail === key) break;

            details.push(detail);
            index++;
        }

        return details;
    };

    // Simplified rules tabs without colors
    const rulesTabs: Array<{
        id: RuleTabId;
        title: string;
        icon: React.ComponentType<any>;
    }> = [
            {
                id: "gameMode",
                title: getRuleTitle("gameMode"),
                icon: Target,
            },
            {
                id: "competition",
                title: getRuleTitle("competition"),
                icon: Trophy,
            },
            {
                id: "scoring",
                title: getRuleTitle("scoring"),
                icon: Activity,
            },
            {
                id: "format",
                title: getRuleTitle("format"),
                icon: Clock,
            },
            {
                id: "fairPlay",
                title: getRuleTitle("fairPlay"),
                icon: AlertTriangle,
            },
            {
                id: "tips",
                title: getRuleTitle("tips"),
                icon: Info,
            }
        ];

    const renderActiveRuleContent = () => {
        const activeTab = rulesTabs.find(tab => tab.id === activeRuleTab);
        if (!activeTab) return null;

        const Icon = activeTab.icon;
        const details = getRuleDetails(activeRuleTab);

        return (
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                        <Icon className="text-white/80" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">{activeTab.title}</h3>
                        <p className="text-white/60 text-sm">
                            {getRuleDescription(activeRuleTab)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    {details.map((detail, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded border border-white/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                            <span className="text-white/90 text-sm leading-relaxed">{detail}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderRulesModal = () => {
        return (
            <Modal
                isOpen={isRulesModalOpen}
                onClose={handleCloseRules}
                size="2xl"
                backdrop="blur"
                scrollBehavior="inside"
                classNames={{
                    backdrop: "bg-black/80",
                    base: "bg-black border border-white/20",
                    header: "border-b border-white/10",
                    body: "py-6",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <BookOpen className="text-white/80" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-white">
                                {t("tournament.rulesTitle")}
                            </h2>
                            <p className="text-white/60 text-sm">
                                {t("tournament.rulesSubtitle")}
                            </p>
                        </div>
                    </ModalHeader>

                    <ModalBody className="space-y-4">
                        {/* Simplified Tabs Navigation */}
                        <div className="grid grid-cols-2 gap-2">
                            {rulesTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeRuleTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRuleTab(tab.id)}
                                        className={`
                                            p-3 rounded border transition-all duration-200 text-left
                                            ${isActive
                                                ? 'bg-white/10 border-white/30'
                                                : 'bg-white/5 border-white/20 hover:bg-white/8 hover:border-white/25'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Icon
                                                className={isActive ? 'text-white' : 'text-white/60'}
                                                size={16}
                                            />
                                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>
                                                {tab.title}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Tab Content */}
                        {renderActiveRuleContent()}
                    </ModalBody>
                </ModalContent>
            </Modal>
        );
    };

    const renderTournamentStats = () => {
        if (leaderboard.length === 0) return null;

        return (
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="text-white/80" size={16} />
                    <h3 className="text-sm font-medium text-white">{t("leaderboard.topPlayers")}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-medium text-white">{leaderboard.length}</div>
                        <div className="text-xs text-white/60">{t("tournament.participants")}</div>
                    </div>
                    <div>
                        <div className="text-lg font-medium text-white">
                            {formatTournamentSurvivalTime(leaderboard[0]?.survival_time || 0)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.bestTime")}</div>
                    </div>
                    <div>
                        <div className="text-lg font-medium text-white">
                            L{Math.max(...leaderboard.map(e => e.max_level_reached), 0)}
                        </div>
                        <div className="text-xs text-white/60">{t("tournament.maxLevel")}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPrizesSection = () => {
        if (!tournamentStatus.activeTournament) return null;

        return (
            <div className="bg-white/5 border border-white/20 rounded-xl mb-4">
                <button
                    onClick={() => setIsPrizesExpanded(!isPrizesExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl"
                >
                    <div className="flex items-center space-x-2">
                        <Trophy className="text-white/80" size={16} />
                        <h3 className="text-sm font-medium text-white">{t("tournament.prizes")}</h3>
                    </div>
                    {isPrizesExpanded ? (
                        <ChevronUp className="text-white/60" size={16} />
                    ) : (
                        <ChevronDown className="text-white/60" size={16} />
                    )}
                </button>
                
                {isPrizesExpanded && (
                    <div className="px-4 pb-4">
                        <div className="space-y-2">
                            {tournamentStatus.activeTournament.prizes.map((prize, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg border border-white/10"
                                >
                                    {getRankIcon(index + 1)}
                                    <span className="text-white/80 text-sm">{prize}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTournamentTab = () => {
        return (
            <div className="space-y-4">
                {/* Tournament Statistics */}
                {renderTournamentStats()}

                {/* Tournament Rules Button */}
                <button
                    className="w-full px-6 py-3 rounded-xl text-base font-medium transition-all duration-300 bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30 hover:text-white hover:scale-[1.01] active:scale-[0.99]"
                    onClick={handleOpenRules}
                    disabled={isTransitioning}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <Info size={18} />
                        <span>{t("tournament.rulesButton")}</span>
                    </div>
                </button>

                {/* Prizes Section */}
                {renderPrizesSection()}

                {/* User's Result */}
                {userResult && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Target className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">{t("tournament.yourBestResult")}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-lg font-medium text-white">
                                    {formatTournamentSurvivalTime(userResult.survival_time)}
                                </div>
                                <div className="text-xs text-white/60">{t("common.time")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">#{userResult.rank || "?"}</div>
                                <div className="text-xs text-white/60">{t("tournament.rank")}</div>
                            </div>
                            <div>
                                <div className="text-lg font-medium text-white">L{userResult.max_level_reached}</div>
                                <div className="text-xs text-white/60">{t("common.level")}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tournament Entry Button */}
                <button
                    className={`
                        w-full px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300
                        ${!isTransitioning && hasAttemptsRemaining()
                            ? "bg-white/10 border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
                        }
                    `}
                    disabled={isTransitioning || !hasAttemptsRemaining()}
                    onClick={handleStartTournament}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <Play size={20} />
                        <span>
                            {isTransitioning
                                ? t("game.general.initializingGame")
                                : !hasAttemptsRemaining()
                                    ? t("game.general.noAttempts")
                                    : t("tournament.enterTournament")}
                        </span>
                    </div>
                </button>

                {/* No attempts warning */}
                {!hasAttemptsRemaining() && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3 text-center">
                        <p className="text-white/60 text-sm">{t("attempts.noRemaining")}</p>
                        <p className="text-white/40 text-xs mt-1">{t("game.general.waitForReset")}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderLeaderboardTab = () => {
        const tournament = tournamentStatus.activeTournament;
        if (!tournament) return null;

        const prizeCount = tournament.prizes.length;
        const winners = leaderboard.slice(0, prizeCount);
        const otherParticipants = leaderboard.slice(prizeCount, 20); // Top 20 total

        return (
            <div className="space-y-4">
                {winners.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Crown className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">
                                {t("tournament.winners")} ({winners.length}/{prizeCount})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {winners.map((entry, index) => renderLeaderboardEntry(entry, index + 1))}
                        </div>
                    </div>
                )}

                {otherParticipants.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Users className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">
                                {t("tournament.otherParticipants")} (Top 20)
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {otherParticipants.map((entry, index) =>
                                renderLeaderboardEntry(entry, index + prizeCount + 1)
                            )}
                        </div>
                    </div>
                )}

                {leaderboard.length === 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-6 text-center">
                        <Trophy className="text-white/40 mx-auto mb-3" size={32} />
                        <p className="text-white/60">{t("tournament.noParticipants")}</p>
                        <p className="text-white/40 text-sm mt-1">{t("tournament.beFirstParticipant")}</p>
                    </div>
                )}

                {/* User Position if not in top leaderboard */}
                {userResult && userResult.rank && userResult.rank > 20 && (
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Target className="text-white/80" size={16} />
                            <h3 className="text-sm font-medium text-white">{t("leaderboard.you")}</h3>
                        </div>
                        <div className="p-3 bg-white/10 border border-white/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="text-white/70 text-sm font-medium">#{userResult.rank}</span>
                                    <span className="text-white font-medium">
                                        {user?.first_name} {user?.last_name || ""}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-base font-medium text-white">
                                        {formatTournamentSurvivalTime(userResult.survival_time)}
                                    </div>
                                    <div className="text-xs text-white/60">
                                        L{userResult.max_level_reached}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
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
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        {t("common.retry")}
                    </button>
                </div>
            </div>
        );
    }

    if (!tournamentStatus.isActive || !tournamentStatus.activeTournament) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="text-4xl mb-4">🏆</div>
                    <h1 className="text-2xl font-medium text-white">{t("tournament.noActiveTournament")}</h1>
                    <p className="text-white/60 text-sm leading-relaxed">
                        {t("tournament.noActiveTournamentDesc")}
                    </p>
                    <button
                        className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300"
                        onClick={() => router.push("/main")}
                    >
                        {t("common.back")}
                    </button>
                </div>
            </div>
        );
    }

    const tournament = tournamentStatus.activeTournament;

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
                            <h1 className="text-2xl font-medium text-white">{tournament.name}</h1>
                            <p className="text-white/60 text-sm">{t("tournament.tournamentActive")}</p>
                        </div>
                    </div>

                    {timeRemaining && (
                        <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                <Clock className="text-white/80" size={16} />
                                <span className="text-white font-medium">{timeRemaining}</span>
                                <span className="text-white/60">{t("tournament.timeRemaining")}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Tabs */}
            <div className="mb-6">
                <div className="bg-white/5 border border-white/20 rounded-xl p-1 flex">
                    <button
                        onClick={() => setActiveMainTab("tournament")}
                        className={`
                            flex-1 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2
                            ${activeMainTab === "tournament"
                                ? "bg-white/10 border border-white/20 text-white"
                                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }
                        `}
                    >
                        <Trophy size={16} />
                        <span className="font-medium">{t("nav.tournament")}</span>
                    </button>
                    <button
                        onClick={() => setActiveMainTab("leaderboard")}
                        className={`
                            flex-1 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2
                            ${activeMainTab === "leaderboard"
                                ? "bg-white/10 border border-white/20 text-white"
                                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }
                        `}
                    >
                        <List size={16} />
                        <span className="font-medium">{t("nav.leaderboard")}</span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
                {activeMainTab === "tournament" ? renderTournamentTab() : renderLeaderboardTab()}
            </div>

            {/* Rules Modal */}
            {renderRulesModal()}
        </div>
    );
}