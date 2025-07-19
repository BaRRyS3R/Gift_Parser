// src/app/tournament/page.tsx - Updated to use API instead of direct DB

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Pagination,
} from "@nextui-org/react";
import {
    Trophy,
    Clock,
    Users,
    ChevronDown,
    ChevronUp,
    Play,
    Crown,
    Medal,
    Award,
    CalendarDays,
    Star,
    Activity,
    TrendingUp,
    Info,
    Zap,
    Target,
    BarChart3,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";

// Tournament types (from new API)
interface Tournament {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    prizes: string[];
    created_at: string;
    updated_at: string;
}

interface TournamentWithStatus extends Tournament {
    status: 'upcoming' | 'active' | 'completed';
    participants_count?: number;
    time_until_start?: number;
    time_until_end?: number;
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
    survival_time: number;
    survival_score: number;
    last_game_score: number;
    max_level_reached: number;
    perfect_streak: number;
    correct_hits: number;
    death_cause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
    games_played: number;
    created_at: string;
    rank: number;
}

interface TournamentListResponse {
    active: TournamentWithStatus[];
    upcoming: TournamentWithStatus[];
    completed: TournamentWithStatus[];
}

// Utility functions
const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Ended";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);

    if (days > 0) {
        const hours = totalHours % 24;
        return `${days}d ${hours}h`;
    } else if (totalHours > 0) {
        const minutes = totalMinutes % 60;
        return `${totalHours}h ${minutes}m`;
    } else if (totalMinutes > 0) {
        const seconds = totalSeconds % 60;
        return `${totalMinutes}m ${seconds}s`;
    } else {
        return `${totalSeconds}s`;
    }
};

const formatTournamentSurvivalTime = (milliseconds: number): string => {
    if (milliseconds < 0) {
        console.warn('Negative survival time detected:', milliseconds);
        return "0.000s";
    }

    if (isNaN(milliseconds) || !isFinite(milliseconds)) {
        console.warn('Invalid survival time value:', milliseconds);
        return "0.000s";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    }

    return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};

interface UserPositionComponentProps {
    leaderboard: TournamentLeaderboardEntry[];
    tournament: TournamentWithStatus;
}

const UserPositionComponent: React.FC<UserPositionComponentProps> = ({ leaderboard, tournament }) => {
    const { user } = useUser();
    const t = useT();

    if (!user) return null;

    const userEntry = leaderboard.find(entry => entry.telegram_id === user.telegram_id);

    if (!userEntry) {
        return (
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-6">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                        <Target className="text-white/60" size={20} />
                        <span className="text-lg font-medium text-white/80">{t("tournament.yourProgress")}</span>
                    </div>
                    <p className="text-white/50 text-sm">{t("tournament.notParticipating")}</p>
                    <p className="text-white/40 text-xs">{t("tournament.playToJoinLeaderboard")}</p>
                </div>
            </div>
        );
    }

    const isWinner = userEntry.rank <= tournament.prizes.length;
    const prize = isWinner ? tournament.prizes[userEntry.rank - 1] : null;

    return (
        <div className={`
            border-2 rounded-xl p-4 mb-6 transition-all duration-300
            ${isWinner
                ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-400/40"
                : "bg-white/5 border-white/20"
            }
        `}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center border-2
                        ${isWinner
                            ? "bg-yellow-400/20 border-yellow-400/60"
                            : "bg-white/10 border-white/30"
                        }
                    `}>
                        {userEntry.rank <= 3 ? (
                            userEntry.rank === 1 ? <Crown className="text-yellow-400" size={24} /> :
                                userEntry.rank === 2 ? <Medal className="text-white" size={24} /> :
                                    <Award className="text-orange-400" size={24} />
                        ) : (
                            <span className={`text-lg font-bold ${isWinner ? "text-yellow-400" : "text-white"}`}>
                                #{userEntry.rank}
                            </span>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center space-x-2">
                            <span className={`font-bold ${isWinner ? "text-yellow-400" : "text-white"}`}>
                                {t("tournament.yourPosition")}
                            </span>
                            {isWinner && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-400/20 rounded-full">
                                    <Crown className="text-yellow-400" size={12} />
                                    <span className="text-yellow-400 text-xs font-medium">{t("tournament.prizePosition")}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                            <div className="flex items-center space-x-1">
                                <Star className="text-yellow-400" size={12} />
                                <span>{userEntry.survival_score} pts</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Activity size={12} />
                                <span>{userEntry.games_played || 1} игр</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Clock size={12} />
                                <span>{formatTournamentSurvivalTime(userEntry.survival_time)}</span>
                            </div>
                        </div>
                        {prize && (
                            <div className="mt-1">
                                <span className="text-yellow-400 text-sm font-medium">{prize}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-2xl font-bold text-white">#{userEntry.rank}</div>
                    <div className="text-xs text-white/60">{t("tournament.outOf")} {leaderboard.length}</div>
                </div>
            </div>
        </div>
    );
};

interface ParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: TournamentLeaderboardEntry[];
    tournament: TournamentWithStatus;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
    isOpen,
    onClose,
    participants,
    tournament
}) => {
    const t = useT();
    const { user } = useUser();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const totalPages = Math.ceil(participants.length / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentParticipants = participants.slice(startIndex, startIndex + itemsPerPage);

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown className="text-white" size={16} />;
            case 2: return <Medal className="text-white/80" size={16} />;
            case 3: return <Award className="text-white/60" size={16} />;
            default: return <span className="text-white/50 text-sm font-medium">#{position}</span>;
        }
    };

    const isCurrentUser = (telegramId: number) => user?.telegram_id === telegramId;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
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
                <ModalHeader className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                        <Users className="text-white/80" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-white">{t("tournament.allParticipants")}</h2>
                        <p className="text-white/60 text-sm">{participants.length} {t("tournament.totalParticipants")}</p>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-3">
                    {currentParticipants.map((participant, index) => {
                        const globalRank = startIndex + index + 1;
                        const isWinner = globalRank <= tournament.prizes.length;
                        const prize = isWinner ? tournament.prizes[globalRank - 1] : null;

                        return (
                            <div
                                key={participant.id}
                                className={`
                                    flex items-center space-x-4 p-3 rounded-lg border transition-all duration-300
                                    ${isCurrentUser(participant.telegram_id)
                                        ? "bg-white/15 border-white/40 ring-1 ring-white/30"
                                        : isWinner
                                            ? "bg-yellow-500/10 border-yellow-400/30"
                                            : "bg-white/5 border-white/20 hover:bg-white/10"
                                    }
                                `}
                            >
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(globalRank)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-medium text-sm ${isCurrentUser(participant.telegram_id) ? "text-white" :
                                            isWinner ? "text-yellow-400" : "text-white/90"
                                            }`}>
                                            {participant.first_name} {participant.last_name || ""}
                                        </span>
                                        {participant.is_premium && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                        )}
                                        {isCurrentUser(participant.telegram_id) && (
                                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
                                                {t("leaderboard.you")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
                                        <div className="flex items-center space-x-1">
                                            <Activity size={10} />
                                            <span>{participant.games_played || 1} игр</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Clock size={10} />
                                            <span>{formatTournamentSurvivalTime(participant.survival_time)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <TrendingUp size={10} />
                                            <span>L{participant.max_level_reached}</span>
                                        </div>
                                    </div>

                                    {prize && (
                                        <div className="mt-1">
                                            <span className="text-yellow-400 text-xs">{prize}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center space-x-1">
                                        <Star className="text-yellow-400" size={14} />
                                        <span className="text-base font-bold text-white">{participant.survival_score}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </ModalBody>

                <ModalFooter className="justify-center">
                    {totalPages > 1 && (
                        <Pagination
                            total={totalPages}
                            page={currentPage}
                            onChange={setCurrentPage}
                            size="sm"
                            showControls
                            className="text-white"
                            classNames={{
                                item: "bg-white/10 text-white border-white/20",
                                cursor: "bg-white/20 text-white",
                            }}
                        />
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

interface PrizesModalProps {
    isOpen: boolean;
    onClose: () => void;
    prizes: string[];
}

const PrizesModal: React.FC<PrizesModalProps> = ({ isOpen, onClose, prizes }) => {
    const t = useT();

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown className="text-yellow-400" size={20} />;
            case 2: return <Medal className="text-white" size={20} />;
            case 3: return <Award className="text-orange-400" size={20} />;
            default: return <Trophy className="text-white/60" size={20} />;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            backdrop="blur"
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
                        <Trophy className="text-white/80" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-white">{t("tournament.tournamentPrizes")}</h2>
                        <p className="text-white/60 text-sm">{prizes.length} {t("tournament.prizePositions")}</p>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-3">
                    {prizes.map((prize, index) => (
                        <div
                            key={index}
                            className={`
                                flex items-center space-x-4 p-4 rounded-lg border transition-all duration-300
                                ${index < 3
                                    ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-400/30"
                                    : "bg-white/5 border-white/20"
                                }
                            `}
                        >
                            <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center border
                                ${index < 3
                                    ? "bg-yellow-400/20 border-yellow-400/40"
                                    : "bg-white/10 border-white/30"
                                }
                            `}>
                                {getRankIcon(index + 1)}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <span className={`text-lg font-bold ${index < 3 ? "text-yellow-400" : "text-white"
                                        }`}>
                                        {index + 1} {t("tournament.place")}
                                    </span>
                                </div>
                                <div className="text-white/80 font-medium mt-1">
                                    {prize}
                                </div>
                            </div>
                        </div>
                    ))}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    const t = useT();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
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
                        <Crown className="text-white/80" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-white">{t("tournament.kingOfTheHillRules")}</h2>
                        <p className="text-white/60 text-sm">{t("tournament.competitionFormat")}</p>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-6">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <Crown className="text-yellow-400" size={24} />
                            <div>
                                <h3 className="text-lg font-bold text-yellow-400">{t("tournament.conceptTitle")}</h3>
                                <p className="text-yellow-300/80 text-sm">{t("tournament.conceptSubtitle")}</p>
                            </div>
                        </div>
                        <p className="text-white/90 leading-relaxed">
                            {t("tournament.conceptDescription")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Target className="text-white/80" size={18} />
                                <h4 className="text-white font-medium">{t("tournament.howToPlay")}</h4>
                            </div>
                            <ul className="space-y-2 text-white/80 text-sm">
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.playRule1")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.playRule2")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.playRule3")}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Star className="text-yellow-400" size={18} />
                                <h4 className="text-white font-medium">{t("tournament.scoringSystem")}</h4>
                            </div>
                            <ul className="space-y-2 text-white/80 text-sm">
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.scoringRule1")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.scoringRule2")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.scoringRule3")}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Trophy className="text-white/80" size={18} />
                                <h4 className="text-white font-medium">{t("tournament.winningStrategy")}</h4>
                            </div>
                            <ul className="space-y-2 text-white/80 text-sm">
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.strategyRule1")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.strategyRule2")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.strategyRule3")}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Clock className="text-white/80" size={18} />
                                <h4 className="text-white font-medium">{t("tournament.timeConstraints")}</h4>
                            </div>
                            <ul className="space-y-2 text-white/80 text-sm">
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.timeRule1")}</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                                    <span>{t("tournament.timeRule2")}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Info className="text-white/80" size={18} />
                            <h4 className="text-white font-medium">{t("tournament.importantNotes")}</h4>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                            {t("tournament.finalNote")}
                        </p>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

interface ActiveTournamentSectionProps {
    tournament: TournamentWithStatus;
    leaderboard: TournamentLeaderboardEntry[];
    onPlayClick: () => void;
    onDetailsClick: () => void;
}

const ActiveTournamentSection: React.FC<ActiveTournamentSectionProps> = ({
    tournament,
    leaderboard,
    onPlayClick,
    onDetailsClick,
}) => {
    const t = useT();
    const { user } = useUser();
    const [timeDisplay, setTimeDisplay] = useState<string>("");
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    const [isPrizesModalOpen, setIsPrizesModalOpen] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const endDate = new Date(tournament.end_date);
            const diff = endDate.getTime() - now.getTime();
            setTimeDisplay(diff > 0 ? formatTimeRemaining(diff) : t("tournament.ended"));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [tournament, t]);

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="text-white" size={16} />;
            case 2:
                return <Medal className="text-white/80" size={16} />;
            case 3:
                return <Award className="text-white/60" size={16} />;
            default:
                return <span className="text-white/50 text-sm font-medium">#{position}</span>;
        }
    };

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId;
    };

    const topParticipants = leaderboard.slice(0, 5);
    const hasAttemptsRemaining = user?.attempts_remaining && user.attempts_remaining > 0;

    return (
        <div className="space-y-6">
            {/* Tournament Header */}
            <div className="text-center space-y-4">
                <div className="relative">
                    <div className="w-20 h-20 bg-white/10 border-2 border-white/30 rounded-2xl flex items-center justify-center mx-auto animate-pulse-subtle">
                        <Trophy className="text-white" size={40} />
                        <div className="absolute -top-2 -right-2">
                            <div className="w-6 h-6 bg-white rounded-full animate-pulse flex items-center justify-center">
                                <Zap className="text-black" size={12} />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-bold text-white tracking-wide">{tournament.name}</h1>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 font-medium">{t("tournament.tournamentActive")}</span>
                    </div>
                </div>

                {/* Enhanced Time Display */}
                <div className="bg-white/10 border border-white/30 rounded-xl p-4 space-y-3">
                    {timeDisplay && (
                        <div className="flex items-center justify-center space-x-3">
                            <Clock className="text-white" size={20} />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white font-mono">{timeDisplay}</div>
                                <div className="text-white/60 text-sm">{t("tournament.timeRemaining")}</div>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-white/20 pt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-white/60 text-xs uppercase tracking-wider mb-1">
                                    {t("tournament.startDate")}
                                </div>
                                <div className="text-white font-mono text-xs">
                                    {new Date(tournament.start_date).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-white/60 text-xs uppercase tracking-wider mb-1">
                                    {t("tournament.endDate")}
                                </div>
                                <div className="text-white font-mono text-xs">
                                    {new Date(tournament.end_date).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tournament Statistics */}
            <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <BarChart3 className="text-white/80" size={20} />
                    <h2 className="text-lg font-bold text-white">{t("tournament.tournamentStats")}</h2>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <button
                        onClick={() => setIsParticipantsModalOpen(true)}
                        className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg hover:bg-white/5 transition-all duration-300 group"
                    >
                        <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/15 transition-all duration-300">
                            <Users className="text-white/80 group-hover:text-white transition-colors duration-300" size={22} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                                {leaderboard.length}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider font-medium leading-tight">
                                {t("tournament.participants")}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setIsPrizesModalOpen(true)}
                        className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg hover:bg-white/5 transition-all duration-300 group"
                    >
                        <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/15 transition-all duration-300">
                            <Trophy className="text-white/80 group-hover:text-white transition-colors duration-300" size={22} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                                {tournament.prizes.length}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider font-medium leading-tight">
                                {t("tournament.prizes")}
                            </div>
                        </div>
                    </button>

                    <div className="flex flex-col items-center text-center space-y-3 p-4">
                        <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                            <Star className="text-yellow-400" size={22} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-white">
                                {leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.survival_score)) : 0}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-wider font-medium leading-tight">
                                {t("tournament.topScore")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Position Component */}
            <UserPositionComponent leaderboard={leaderboard} tournament={tournament} />

            {/* Top Participants */}
            {topParticipants.length > 0 && (
                <div className="bg-white/5 border border-white/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <Crown className="text-white/80" size={20} />
                        <h2 className="text-lg font-bold text-white">{t("tournament.topParticipants")}</h2>
                    </div>

                    <div className="space-y-3">
                        {topParticipants.map((participant, index) => (
                            <div
                                key={participant.id}
                                className={`
                                    flex items-center space-x-4 p-3 rounded-lg border transition-all duration-300
                                    ${isCurrentUser(participant.telegram_id)
                                        ? "bg-white/15 border-white/40 ring-1 ring-white/30"
                                        : "bg-white/5 border-white/20 hover:bg-white/10"
                                    }
                                `}
                            >
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(index + 1)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-medium text-sm ${isCurrentUser(participant.telegram_id) ? "text-white" : "text-white/90"}`}>
                                            {participant.first_name} {participant.last_name || ""}
                                        </span>
                                        {participant.is_premium && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                        )}
                                        {isCurrentUser(participant.telegram_id) && (
                                            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
                                                {t("leaderboard.you")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
                                        <div className="flex items-center space-x-1">
                                            <Activity size={10} />
                                            <span>{participant.games_played || 1} игр</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Clock size={10} />
                                            <span>{formatTournamentSurvivalTime(participant.survival_time)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <TrendingUp size={10} />
                                            <span>L{participant.max_level_reached}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center space-x-1">
                                        <Star className="text-yellow-400" size={14} />
                                        <span className="text-base font-bold text-white">{participant.survival_score}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
                <button
                    onClick={onPlayClick}
                    disabled={!hasAttemptsRemaining}
                    className={`
                        w-full px-6 py-4 rounded-xl text-lg font-bold transition-all duration-300 flex items-center justify-center space-x-3
                        ${hasAttemptsRemaining
                            ? "bg-white/15 border-2 border-white/40 text-white hover:border-white/60 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                            : "bg-white/5 border border-white/20 text-white/50 cursor-not-allowed opacity-60"
                        }
                    `}
                >
                    <Play size={24} />
                    <span>
                        {hasAttemptsRemaining
                            ? t("tournament.enterTournament")
                            : t("game.general.noAttempts")
                        }
                    </span>
                </button>

                <button
                    onClick={() => setIsRulesModalOpen(true)}
                    className="w-full px-6 py-3 bg-white/5 border border-white/20 text-white rounded-xl text-base font-medium hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-[1.01] active:scale-[0.99]"
                >
                    <BookOpen size={20} />
                    <span>{t("tournament.rulesAndStrategy")}</span>
                </button>

                {!hasAttemptsRemaining && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                        <p className="text-white/60 text-sm">{t("game.general.attemptsUsed")}</p>
                        <p className="text-white/40 text-xs mt-1">{t("game.general.waitForReset")}</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ParticipantsModal
                isOpen={isParticipantsModalOpen}
                onClose={() => setIsParticipantsModalOpen(false)}
                participants={leaderboard}
                tournament={tournament}
            />

            <PrizesModal
                isOpen={isPrizesModalOpen}
                onClose={() => setIsPrizesModalOpen(false)}
                prizes={tournament.prizes}
            />

            <RulesModal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
            />
        </div>
    );
};

interface CompletedTournamentCardProps {
    tournament: TournamentWithStatus;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onLoadWinners: (tournamentId: string, prizeCount: number) => Promise<TournamentLeaderboardEntry[]>;
}

const CompletedTournamentCard: React.FC<CompletedTournamentCardProps> = ({
    tournament,
    isExpanded,
    onToggleExpand,
    onLoadWinners,
}) => {
    const t = useT();
    const [winners, setWinners] = useState<TournamentLeaderboardEntry[]>([]);
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    useEffect(() => {
        if (isExpanded && winners.length === 0) {
            const loadWinners = async () => {
                setIsLoadingWinners(true);
                try {
                    const tournamentWinners = await onLoadWinners(tournament.id, tournament.prizes.length);
                    setWinners(tournamentWinners);
                } catch (error) {
                    console.error("Error loading winners:", error);
                } finally {
                    setIsLoadingWinners(false);
                }
            };
            loadWinners();
        }
    }, [isExpanded, tournament.id, tournament.prizes.length, winners.length, onLoadWinners]);

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
        <div className="bg-white/5 border border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/8 hover:border-white/30">
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-xl flex items-center justify-center">
                            <Award className="text-white/50" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white/70 tracking-wide">
                                {tournament.name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm mt-1">
                                <div className="flex items-center space-x-1">
                                    <Star className="text-white/50" size={14} />
                                    <span className="text-white/60 font-medium">{t("tournament.completed")}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onToggleExpand}
                        className="p-2 rounded-lg transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30"
                    >
                        {isExpanded ? (
                            <ChevronUp className="text-white/60" size={18} />
                        ) : (
                            <ChevronDown className="text-white/60" size={18} />
                        )}
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <Trophy className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.prizes")}</span>
                            </div>
                            <div className="text-lg font-bold text-white/70">{tournament.prizes.length}</div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <Users className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.participants")}</span>
                            </div>
                            <div className="text-lg font-bold text-white/70">{tournament.participants_count || 0}</div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                                <CalendarDays className="text-white/50" size={14} />
                                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{t("tournament.status")}</span>
                            </div>
                            <div className="text-sm font-bold text-white/70 capitalize">
                                {t("tournament.completed")}
                            </div>
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <CalendarDays className="text-white/70" size={16} />
                                <span className="text-sm font-bold text-white/70 uppercase tracking-wider">{t("tournament.tournamentDates")}</span>
                            </div>
                            <div className="space-y-2 text-sm text-white/60">
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

                        <div className="bg-white/5 border border-white/15 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Crown className="text-white/70" size={16} />
                                <span className="text-sm font-bold text-white/70 uppercase tracking-wider">
                                    {t("tournament.champions")} ({tournament.prizes.length} {t("tournament.prizePositions")})
                                </span>
                            </div>

                            {isLoadingWinners ? (
                                <div className="flex items-center justify-center space-x-3 py-6">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                                    <span className="text-white/50 text-sm font-medium">{t("tournament.loadingChampions")}</span>
                                </div>
                            ) : winners.length > 0 ? (
                                <div className="space-y-3">
                                    {winners.map((winner, index) => (
                                        <div
                                            key={winner.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/8 transition-all duration-300"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center justify-center w-8">
                                                    {getRankIcon(index + 1)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white/80">
                                                        {winner.first_name} {winner.last_name || ""}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs text-white/50">
                                                        <div className="flex items-center space-x-1">
                                                            <Activity size={10} />
                                                            <span>{winner.games_played || 1} игр</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <Clock size={10} />
                                                            <span className="font-mono">{formatTournamentSurvivalTime(winner.survival_time)}</span>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-white/40" />
                                                        <div className="flex items-center space-x-1">
                                                            <TrendingUp size={10} />
                                                            <span>L{winner.max_level_reached}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-white/80">
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="text-yellow-400/80" size={12} />
                                                        <span>{winner.survival_score} pts</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-white/50">
                                                    {tournament.prizes[index]}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Trophy className="text-white/30 mx-auto mb-3" size={32} />
                                    <p className="text-white/40 text-sm font-medium">{t("tournament.noChampionsData")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function TournamentsPage() {
    const router = useRouter();
    const t = useT();
    const { makeAuthenticatedRequest } = useUser();

    const [tournaments, setTournaments] = useState<TournamentListResponse>({
        active: [],
        upcoming: [],
        completed: []
    });
    const [activeLeaderboard, setActiveLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadTournaments = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log('Loading tournaments...');

                // Load all tournaments
                const tournamentsResponse = await makeAuthenticatedRequest('/api/tournament/list');

                if (!tournamentsResponse.ok) {
                    const errorData = await tournamentsResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to load tournaments');
                }

                const tournamentsResult = await tournamentsResponse.json();

                if (!tournamentsResult.success) {
                    throw new Error(tournamentsResult.error || 'Failed to load tournaments');
                }

                const tournamentsData: TournamentListResponse = tournamentsResult.data;
                setTournaments(tournamentsData);

                // Load leaderboard for active tournament
                if (tournamentsData.active.length > 0) {
                    const activeTournament = tournamentsData.active[0];
                    console.log('Loading leaderboard for active tournament:', activeTournament.id);

                    const leaderboardResponse = await makeAuthenticatedRequest('/api/tournament/leaderboard', {
                        method: 'POST',
                        body: JSON.stringify({
                            tournamentId: activeTournament.id,
                            limit: 100
                        }),
                    });

                    if (leaderboardResponse.ok) {
                        const leaderboardResult = await leaderboardResponse.json();
                        if (leaderboardResult.success) {
                            setActiveLeaderboard(leaderboardResult.data);
                        }
                    }
                }

                console.log('Tournaments loaded successfully:', {
                    active: tournamentsData.active.length,
                    upcoming: tournamentsData.upcoming.length,
                    completed: tournamentsData.completed.length
                });

            } catch (err) {
                console.error("Error loading tournaments:", err);
                setError(err instanceof Error ? err.message : t("tournament.errorLoadingTournaments"));
            } finally {
                setIsLoading(false);
            }
        };

        loadTournaments();
    }, [t, makeAuthenticatedRequest]);

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

    const handlePlayTournament = () => {
        router.push("/tournament/play");
    };

    const handleViewDetails = () => {
        router.push("/tournament/active");
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

    const handleLoadWinners = async (tournamentId: string, prizeCount: number): Promise<TournamentLeaderboardEntry[]> => {
        try {
            const response = await makeAuthenticatedRequest('/api/tournament/winners', {
                method: 'POST',
                body: JSON.stringify({ tournamentId, prizeCount }),
            });

            if (!response.ok) {
                throw new Error('Failed to load winners');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load winners');
            }

            return result.data;
        } catch (error) {
            console.error('Error loading winners:', error);
            return [];
        }
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
                        <p className="text-white text-lg font-medium">{t("tournament.loadingTournaments")}</p>
                        <p className="text-white/60 text-sm">{t("tournament.fetchingData")}</p>
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
                        <p className="text-white/60 text-sm">{t("tournament.tryRefreshPage")}</p>
                    </div>
                    <button
                        className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 active:scale-95"
                        onClick={() => window.location.reload()}
                    >
                        {t("tournament.refresh")}
                    </button>
                </div>
            </div>
        );
    }

    const hasActiveTournament = tournaments.active.length > 0;
    const hasCompletedTournaments = tournaments.completed.length > 0;

    if (!hasActiveTournament && !hasCompletedTournaments) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-8 max-w-md mx-auto px-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-white/5 border border-white/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Trophy className="text-white/40" size={40} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                            <CalendarDays className="text-white/60" size={16} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-3">{t("tournament.noTournamentsAvailable")}</h1>
                        <p className="text-white/60 text-sm leading-relaxed">
                            {t("tournament.checkBackSoon")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {hasActiveTournament && (
                <div className="py-6">
                    <ActiveTournamentSection
                        tournament={tournaments.active[0]}
                        leaderboard={activeLeaderboard}
                        onPlayClick={handlePlayTournament}
                        onDetailsClick={handleViewDetails}
                    />
                </div>
            )}

            {hasCompletedTournaments && (
                <div className={`${hasActiveTournament ? 'py-6 border-t border-white/10' : 'py-6'}`}>
                    <div className="mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center">
                                <Star className="text-white/60" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white/70 tracking-wide">{t("tournament.hallOfFame")}</h2>
                                <p className="text-white/40 text-sm uppercase tracking-[0.2em]">{tournaments.completed.length} {t("tournament.tournaments")}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {tournaments.completed.map((tournament) => (
                            <CompletedTournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                isExpanded={expandedTournaments.has(tournament.id)}
                                onToggleExpand={() => handleToggleExpand(tournament.id)}
                                onLoadWinners={handleLoadWinners}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}