// tournament/page.tsx - Fixed version with type-safe rule descriptions

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody,
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
    X,
    AlertTriangle,
    Zap,
    Crosshair,
    Timer,
    Shield,
    BookOpen,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { tournamentService, formatTournamentSurvivalTime } from "@/lib/supabase_tournament_extension";
import type { Tournament, TournamentLeaderboardEntry, TournamentResult, TournamentStatus } from "@/types/tournaments";
import { formatTimeRemaining } from "@/types/tournaments";
import { useT } from "@/contexts/LocalizationContext";

// Type-safe rule tab IDs
type RuleTabId = "gameMode" | "competition" | "scoring" | "format" | "fairPlay" | "tips";

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

    const loadTournamentData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const status = await tournamentService.getTournamentStatus();
            setTournamentStatus(status);

            if (status.activeTournament) {
                const [tournamentLeaderboard, userTournamentResult] = await Promise.all([
                    tournamentService.getTournamentLeaderboard(status.activeTournament.id),
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
        if (!tournamentStatus.activeTournament || isTransitioning) return;

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
            // Create the key manually for each section to ensure type safety
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

            const detail = t(key as any); // Type assertion needed here for dynamic keys

            // If the detail is the same as the key, it means translation doesn't exist
            if (detail === key) break;

            details.push(detail);
            index++;
        }

        return details;
    };

    const rulesTabs: Array<{
        id: RuleTabId;
        title: string;
        icon: React.ComponentType<any>;
        color: string;
        bgColor: string;
        borderColor: string;
    }> = [
            {
                id: "gameMode",
                title: getRuleTitle("gameMode"),
                icon: Crosshair,
                color: "text-red-400",
                bgColor: "bg-red-500/10",
                borderColor: "border-red-400/30"
            },
            {
                id: "competition",
                title: getRuleTitle("competition"),
                icon: Shield,
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
                borderColor: "border-blue-400/30"
            },
            {
                id: "scoring",
                title: getRuleTitle("scoring"),
                icon: Trophy,
                color: "text-yellow-400",
                bgColor: "bg-yellow-500/10",
                borderColor: "border-yellow-400/30"
            },
            {
                id: "format",
                title: getRuleTitle("format"),
                icon: Timer,
                color: "text-green-400",
                bgColor: "bg-green-500/10",
                borderColor: "border-green-400/30"
            },
            {
                id: "fairPlay",
                title: getRuleTitle("fairPlay"),
                icon: AlertTriangle,
                color: "text-red-400",
                bgColor: "bg-red-500/10",
                borderColor: "border-red-400/30"
            },
            {
                id: "tips",
                title: getRuleTitle("tips"),
                icon: Zap,
                color: "text-purple-400",
                bgColor: "bg-purple-500/10",
                borderColor: "border-purple-400/30"
            }
        ];

    const renderActiveRuleContent = () => {
        const activeTab = rulesTabs.find(tab => tab.id === activeRuleTab);
        if (!activeTab) return null;

        const Icon = activeTab.icon;
        const details = getRuleDetails(activeRuleTab);

        return (
            <div className={`${activeTab.bgColor} ${activeTab.borderColor} border rounded-xl p-6 min-h-[400px]`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 ${activeTab.bgColor} ${activeTab.borderColor} border rounded-lg flex items-center justify-center`}>
                        <Icon className={activeTab.color} size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{activeTab.title}</h3>
                        <p className="text-white/70 text-sm">
                            {getRuleDescription(activeRuleTab)}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {details.map((detail, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${activeTab.color.replace('text-', 'bg-')} mt-2 flex-shrink-0`} />
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
                size="3xl"
                backdrop="blur"
                scrollBehavior="inside"
                classNames={{
                    backdrop: "bg-black/80",
                    base: "bg-black border border-white/20",
                    header: "border-b border-white/10",
                    body: "py-6",
                    footer: "border-t border-white/10"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-400/30 rounded-lg flex items-center justify-center">
                                <BookOpen className="text-yellow-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {t("tournament.rulesTitle")}
                                </h2>
                                <p className="text-white/60 text-sm">
                                    {t("tournament.rulesSubtitle")}
                                </p>
                            </div>
                        </div>
                    </ModalHeader>

                    <ModalBody className="space-y-6">
                        {/* Tabs Navigation */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {rulesTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeRuleTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRuleTab(tab.id)}
                                        className={`
                                            p-3 rounded-lg border transition-all duration-300 text-left
                                            ${isActive
                                                ? `${tab.bgColor} ${tab.borderColor} scale-105`
                                                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Icon
                                                className={isActive ? tab.color : 'text-white/60'}
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

                    <ModalFooter className="flex justify-between">
                        <Button
                            className="bg-white/10 border border-white/30 text-white hover:bg-white/20"
                            variant="bordered"
                            onPress={handleCloseRules}
                        >
                            {t("common.close")}
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-8"
                            color="primary"
                            onPress={() => {
                                handleCloseRules();
                                handleStartTournament();
                            }}
                            disabled={!tournamentStatus.activeTournament || isTransitioning}
                        >
                            {isTransitioning ? t("game.general.initializingGame") : t("tournament.enterTournament")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
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
    const prizeCount = tournament.prizes.length;
    const winners = leaderboard.slice(0, prizeCount);
    const otherParticipants = leaderboard.slice(prizeCount);

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

            {/* Action Buttons */}
            <div className="mb-6 space-y-3">
                {/* Tournament Entry Button */}
                <button
                    className={`
            w-full px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300
            ${!isTransitioning
                            ? "bg-white/10 border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
                        }
          `}
                    disabled={isTransitioning}
                    onClick={handleStartTournament}
                >
                    <div className="flex items-center justify-center space-x-3">
                        <Play size={20} />
                        <span>
                            {isTransitioning
                                ? t("game.general.initializingGame")
                                : t("tournament.enterTournament")}
                        </span>
                    </div>
                </button>

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
            </div>

            {/* Prizes Section */}
            <div className="mb-6">
                <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <Trophy className="text-white/80" size={16} />
                        <h3 className="text-sm font-medium text-white">{t("tournament.prizes")}</h3>
                    </div>
                    <div className="space-y-2">
                        {tournament.prizes.map((prize, index) => (
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
            </div>

            {/* User's Result */}
            {userResult && (
                <div className="mb-6">
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
                </div>
            )}

            {/* Leaderboard */}
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
                                {t("tournament.otherParticipants")} ({otherParticipants.length})
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
            </div>

            {/* Statistics */}
            {leaderboard.length > 0 && (
                <div className="mt-6 mb-8">
                    <div className="bg-white/5 border border-white/20 rounded-xl p-4">
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
                </div>
            )}

            {/* Rules Modal */}
            {renderRulesModal()}
        </div>
    );
}