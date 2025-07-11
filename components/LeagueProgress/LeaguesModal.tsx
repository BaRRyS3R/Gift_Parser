// src/components/LeagueProgress/LeaguesModal.tsx - Enhanced modal with neighbor players

"use client";

import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Button,
    Card,
    CardBody,
    Tabs,
    Tab,
} from "@nextui-org/react";
import {
    Trophy,
    Star,
    Gift,
    Users,
    Medal,
    Crown,
    Award,
    ChevronRight,
    X,
    ArrowUp,
    ArrowDown,
    Target,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import leagueService, {
    type League,
    type LeagueProgressInfo,
    type UserLeagueReward,
    type LeagueLeaderboard,
    type LeagueNeighbors
} from "@/lib/league_service";

interface LeaguesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LeaguesModal: React.FC<LeaguesModalProps> = ({ isOpen, onClose }) => {
    const { user, telegramUser } = useUser();
    const t = useT();

    const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(null);
    const [allLeagues, setAllLeagues] = useState<League[]>([]);
    const [userRewards, setUserRewards] = useState<UserLeagueReward[]>([]);
    const [leaderboards, setLeaderboards] = useState<Record<number, LeagueLeaderboard>>({});
    const [leagueNeighbors, setLeagueNeighbors] = useState<LeagueNeighbors | null>(null);
    const [selectedTab, setSelectedTab] = useState("progress");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLeagueData = async () => {
            if (!user || !telegramUser || !isOpen) return;

            try {
                setIsLoading(true);

                const [progress, leagues, rewards, neighbors] = await Promise.all([
                    leagueService.getUserLeagueProgress(user.id, user.total_games),
                    leagueService.getAllLeagues(),
                    leagueService.getUserRewards(user.id),
                    leagueService.getLeagueNeighbors(user.id, user.total_games),
                ]);

                setProgressInfo(progress);
                setAllLeagues(leagues);
                setUserRewards(rewards);
                setLeagueNeighbors(neighbors);

                // Load leaderboards for leagues with rewards
                const leaderboardPromises = leagues
                    .filter(league => league.name !== 'bronze')
                    .map(async (league) => {
                        const leaderboard = await leagueService.getLeagueLeaderboard(league.id, user.id);
                        return { leagueId: league.id, leaderboard };
                    });

                const leaderboardResults = await Promise.all(leaderboardPromises);
                const leaderboardsMap: Record<number, LeagueLeaderboard> = {};

                leaderboardResults.forEach(({ leagueId, leaderboard }) => {
                    if (leaderboard) {
                        leaderboardsMap[leagueId] = leaderboard;
                    }
                });

                setLeaderboards(leaderboardsMap);
            } catch (error) {
                console.error("Error loading league data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadLeagueData();
    }, [user, telegramUser, isOpen]);

    // Helper functions
    const getLeagueIcon = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze': return Trophy;
            case 'silver': return Medal;
            case 'gold': return Award;
            case 'platinum': return Crown;
            case 'diamond': return Star;
            default: return Trophy;
        }
    };

    const getLeagueColorClasses = (leagueName: string) => {
        switch (leagueName) {
            case 'bronze':
                return {
                    text: 'text-orange-400',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-400/30',
                    accent: 'text-orange-300'
                };
            case 'silver':
                return {
                    text: 'text-gray-300',
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-400/30',
                    accent: 'text-gray-200'
                };
            case 'gold':
                return {
                    text: 'text-yellow-400',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-400/30',
                    accent: 'text-yellow-300'
                };
            case 'platinum':
                return {
                    text: 'text-purple-300',
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-400/30',
                    accent: 'text-purple-200'
                };
            case 'diamond':
                return {
                    text: 'text-cyan-300',
                    bg: 'bg-cyan-500/10',
                    border: 'border-cyan-400/30',
                    accent: 'text-cyan-200'
                };
            default:
                return {
                    text: 'text-white',
                    bg: 'bg-white/10',
                    border: 'border-white/30',
                    accent: 'text-white/80'
                };
        }
    };

    const formatDisplayName = (firstName: string, lastName?: string, username?: string) => {
        if (username) {
            return `${firstName} (@${username})`;
        }
        return lastName ? `${firstName} ${lastName}` : firstName;
    };

    // Progress Tab Component
    const ProgressTab = () => {
        if (!progressInfo) return null;

        const colors = getLeagueColorClasses(progressInfo.currentLeague.name);
        const Icon = getLeagueIcon(progressInfo.currentLeague.name);
        const isMaxLeague = !progressInfo.nextLeague;

        // Calculate level progress
        const currentLevel = progressInfo.currentLevel;
        const gamesInCurrentLevel = progressInfo.totalGames % leagueService.GAMES_PER_LEVEL;
        const gamesToNextLevel = leagueService.GAMES_PER_LEVEL - gamesInCurrentLevel;
        const levelProgressPercent = (gamesInCurrentLevel / leagueService.GAMES_PER_LEVEL) * 100;
        const isMaxLevel = currentLevel >= leagueService.MAX_LEVEL;

        return (
            <div className="space-y-6">
                {/* Current Status Card */}
                <Card className={`${colors.bg} border ${colors.border}`}>
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className={`w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                                    <Icon className={colors.text} size={24} />
                                </div>
                                <div>
                                    <h3 className={`text-lg font-bold ${colors.text}`}>
                                        {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
                                    </h3>
                                    <p className={`text-sm ${colors.accent}`}>
                                        {t("profile.levelDisplay", { level: progressInfo.currentLevel })}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={`text-2xl font-bold ${colors.text}`}>
                                    {progressInfo.totalGames}
                                </div>
                                <div className={`text-xs ${colors.accent}`}>
                                    {t("leagues.progressDisplay.gamesPlayed")}
                                </div>
                            </div>
                        </div>

                        {/* Level Progress */}
                        {!isMaxLevel && (
                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70 text-sm">
                                        {t("profile.levelProgress.gamesToNext")}
                                    </span>
                                    <span className="text-white font-bold">
                                        {gamesToNextLevel}
                                    </span>
                                </div>

                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-white/60 transition-all duration-500"
                                        style={{ width: `${levelProgressPercent}%` }}
                                    />
                                </div>

                                <div className="text-center">
                                    <span className="text-white/60 text-sm">
                                        {t("profile.levelProgress.nextLevel", { level: currentLevel + 1 })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* League Progress */}
                        {!isMaxLeague && progressInfo.nextLeague && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70 text-sm">
                                        {t("leagues.progressDisplay.gamesToNext")}
                                    </span>
                                    <span className="text-white font-bold">
                                        {progressInfo.gamesToNextLeague}
                                    </span>
                                </div>

                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-500 ${colors.text.replace('text-', 'bg-')}`}
                                        style={{ width: `${progressInfo.progressPercent}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-center space-x-2 pt-2">
                                    <span className="text-white/60 text-sm">{t("profile.levelProgress.nextLeague")}:</span>
                                    <span className={`font-bold ${getLeagueColorClasses(progressInfo.nextLeague.name).text}`}>
                                        {t(`leagues.names.${progressInfo.nextLeague.name}` as any)}
                                    </span>
                                    <ChevronRight className="text-white/60" size={16} />
                                </div>
                            </div>
                        )}

                        {/* Max League/Level Indicators */}
                        {isMaxLeague && isMaxLevel && (
                            <div className="text-center py-3">
                                <Crown className={colors.text} size={32} />
                                <p className={`text-sm font-bold ${colors.text} mt-2`}>
                                    {t("leagues.progressDisplay.maxAchieved")}
                                </p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* League Position Card */}
                {leagueNeighbors && (
                    <Card className={`${colors.bg} border ${colors.border}`}>
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <Users className={colors.text} size={20} />
                                <h4 className={`font-bold ${colors.text}`}>
                                    {t("profile.leaguePosition.title")}
                                </h4>
                            </div>

                            <div className="space-y-2">
                                {/* Players Ahead */}
                                {leagueNeighbors.playersAhead.map((player) => (
                                    <div
                                        key={player.user_id}
                                        className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-400/20"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                                                {player.position}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {formatDisplayName(player.first_name, player.last_name, player.username)}
                                                </div>
                                                <div className="text-xs text-red-300">
                                                    +{player.games_ahead} {t("profile.leaguePosition.gamesAhead")}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <ArrowUp className="text-red-400" size={14} />
                                            <span className="text-sm text-white/80">{player.games_count}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Current User */}
                                <div className="flex items-center justify-between p-3 rounded bg-white/10 border border-white/30">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-6 h-6 rounded-full ${colors.bg} ${colors.text} border ${colors.border} flex items-center justify-center text-xs font-bold`}>
                                            {leagueNeighbors.userPosition}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {formatDisplayName(user?.first_name || "You", user?.last_name, user?.username)}
                                            </div>
                                            <div className="text-xs text-white/60">
                                                {t("profile.leaguePosition.yourPosition")}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Target className={colors.text} size={14} />
                                        <span className={`text-sm font-bold ${colors.text}`}>{leagueNeighbors.userGames}</span>
                                    </div>
                                </div>

                                {/* Players Behind */}
                                {leagueNeighbors.playersBehind.map((player) => (
                                    <div
                                        key={player.user_id}
                                        className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-400/20"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">
                                                {player.position}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {formatDisplayName(player.first_name, player.last_name, player.username)}
                                                </div>
                                                <div className="text-xs text-green-300">
                                                    -{player.games_behind} {t("profile.leaguePosition.gamesBehind")}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <ArrowDown className="text-green-400" size={14} />
                                            <span className="text-sm text-white/80">{player.games_count}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty State */}
                                {leagueNeighbors.playersAhead.length === 0 && leagueNeighbors.playersBehind.length === 0 && (
                                    <div className="text-center py-4">
                                        <Users className="text-white/40 mx-auto mb-2" size={24} />
                                        <p className="text-white/60 text-sm">
                                            {t("profile.leaguePosition.aloneInLeague")}
                                        </p>
                                    </div>
                                )}

                                {leagueNeighbors.playersAhead.length === 0 && leagueNeighbors.playersBehind.length > 0 && (
                                    <div className="text-center py-2 border-b border-white/10 mb-2">
                                        <Crown className={colors.text} size={16} />
                                        <p className={`text-xs ${colors.text} font-bold`}>
                                            {t("profile.leaguePosition.leagueLeader")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* All Leagues Overview */}
                <div className="space-y-3">
                    <h4 className="text-lg font-bold text-white">{t("leagues.title")}</h4>
                    {allLeagues.map((league) => {
                        const colors = getLeagueColorClasses(league.name);
                        const Icon = getLeagueIcon(league.name);
                        const isCurrent = league.id === progressInfo.currentLeague.id;
                        const isUnlocked = user ? user.total_games >= league.min_games : false;

                        return (
                            <Card key={league.id} className={`${isUnlocked ? colors.bg : 'bg-white/5'} border ${isUnlocked ? colors.border : 'border-white/10'}`}>
                                <CardBody className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Icon
                                                className={isUnlocked ? colors.text : 'text-white/30'}
                                                size={20}
                                            />
                                            <div>
                                                <div className={`font-bold ${isUnlocked ? colors.text : 'text-white/50'}`}>
                                                    {t(`leagues.names.${league.name}` as any)}
                                                </div>
                                                <div className="text-xs text-white/60">
                                                    {league.min_games}
                                                    {league.max_games ? ` - ${league.max_games}` : '+'} {t("profile.gamesUnit")}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {isCurrent && (
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
                                                    {t("profile.currentLeague")}
                                                </div>
                                            )}
                                            {league.name !== 'bronze' && (
                                                <div className="flex items-center space-x-1">
                                                    <Gift className="text-white/60" size={14} />
                                                    <span className="text-xs text-white/60">{league.rewards_count} {t("profile.rewardsUnit")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Rewards Tab Component (existing)
    const RewardsTab = () => {
        return (
            <div className="space-y-6">
                {userRewards.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-lg font-bold text-white">{t("leagues.rewardsSection.yourRewards")}</h4>
                        {userRewards.map((reward) => (
                            <Card key={reward.id} className="bg-green-500/10 border border-green-400/30">
                                <CardBody className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Gift className="text-green-400" size={20} />
                                            <div>
                                                <div className="font-bold text-green-400">
                                                    {reward.reward?.name || t("leagues.rewardsSection.specialReward")}
                                                </div>
                                                <div className="text-xs text-green-300">
                                                    {t("leagues.rewardsSection.position", { position: reward.position })} {t("profile.inLeague")}{' '}
                                                    {reward.league && t(`leagues.names.${reward.league.name}` as any)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-green-400">
                                                {new Date(reward.received_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-green-300">
                                                {t("leagues.rewardsSection.rewardReceived")}
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white">{t("leagues.rewardsSection.availableRewards")}</h4>
                    {allLeagues
                        .filter(league => league.name !== 'bronze')
                        .map((league) => {
                            const colors = getLeagueColorClasses(league.name);
                            const Icon = getLeagueIcon(league.name);
                            const leaderboard = leaderboards[league.id];

                            return (
                                <Card key={league.id} className={`${colors.bg} border ${colors.border}`}>
                                    <CardBody className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <Icon className={colors.text} size={20} />
                                                <div>
                                                    <div className={`font-bold ${colors.text}`}>
                                                        {t(`leagues.names.${league.name}` as any)}
                                                    </div>
                                                    <div className={`text-xs ${colors.accent}`}>
                                                        {league.min_games}+ {t("profile.gamesRequired")}
                                                    </div>
                                                </div>
                                            </div>

                                            {leaderboard && (
                                                <div className="text-right">
                                                    <div className={`text-sm font-bold ${colors.text}`}>
                                                        {leaderboard.rewardsRemaining}/{league.rewards_count}
                                                    </div>
                                                    <div className={`text-xs ${colors.accent}`}>
                                                        {t("leagues.rewardsSection.rewardsLeft", { count: leaderboard.rewardsRemaining })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {leaderboard && leaderboard.rewardsRemaining > 0 && leaderboard.nextRewardAt && (
                                            <div className={`text-sm ${colors.accent}`}>
                                                {t("leagues.leaderboardSection.nextReward", { games: leaderboard.nextRewardAt })}
                                            </div>
                                        )}

                                        {leaderboard && leaderboard.rewardsRemaining === 0 && (
                                            <div className="text-red-400 text-sm">
                                                {t("leagues.rewardsSection.allClaimed")}
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            );
                        })}
                </div>
            </div>
        );
    };

    // Leaderboard Tab Component (existing)
    const LeaderboardTab = () => {
        return (
            <div className="space-y-6">
                {Object.values(leaderboards).map((leaderboard) => {
                    const colors = getLeagueColorClasses(leaderboard.league.name);
                    const Icon = getLeagueIcon(leaderboard.league.name);

                    return (
                        <Card key={leaderboard.league.id} className={`${colors.bg} border ${colors.border}`}>
                            <CardBody className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <Icon className={colors.text} size={20} />
                                        <div>
                                            <h4 className={`font-bold ${colors.text}`}>
                                                {t(`leagues.names.${leaderboard.league.name}` as any)}
                                            </h4>
                                            <p className={`text-sm ${colors.accent}`}>
                                                {t("leagues.leaderboardSection.playersInLeague", { count: leaderboard.totalInLeague })}
                                            </p>
                                        </div>
                                    </div>

                                    {leaderboard.userPosition && (
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${colors.text}`}>
                                                {t("leagues.leaderboardSection.yourPosition", { position: leaderboard.userPosition })}
                                            </div>
                                            {leaderboard.userGamesToNextReward && (
                                                <div className={`text-xs ${colors.accent}`}>
                                                    {t("leagues.leaderboardSection.gamesToNextReward", { games: leaderboard.userGamesToNextReward })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h5 className="text-sm font-bold text-white/80">{t("leagues.leaderboardSection.topPlayers")}</h5>
                                    {leaderboard.topPlayers.slice(0, 5).map((player, index) => (
                                        <div
                                            key={player.user_id}
                                            className={`flex items-center justify-between p-2 rounded ${player.user_id === user?.id ? 'bg-white/10' : 'bg-white/5'}`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${player.position <= 3 ? colors.bg : 'bg-white/10'
                                                    } ${player.position <= 3 ? colors.text : 'text-white/60'}`}>
                                                    {player.position}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">
                                                        {formatDisplayName(player.first_name, player.last_name, player.username)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-white/80">{player.games_count}</span>
                                                {player.got_reward && (
                                                    <Gift className="text-green-400" size={14} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
            classNames={{
                backdrop: "bg-black/80",
                base: "bg-black border border-white/20",
                header: "border-b border-white/10",
                body: "py-4"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                        <Trophy className="text-yellow-400" size={24} />
                        <h2 className="text-xl font-bold text-white">
                            {t("leagues.title")}
                        </h2>
                    </div>
                    <button
                        className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </ModalHeader>

                <ModalBody className="px-4 pb-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-4">
                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                                <p className="text-white/60">{t("leagues.status.loading")}</p>
                            </div>
                        </div>
                    ) : (
                        <Tabs
                            selectedKey={selectedTab}
                            onSelectionChange={(key) => setSelectedTab(key as string)}
                            classNames={{
                                tabList: "bg-white/10 rounded-lg p-1",
                                tab: "text-white/60 data-[selected=true]:text-white data-[selected=true]:bg-white/20",
                                tabContent: "text-sm font-medium",
                                panel: "pt-4"
                            }}
                        >
                            <Tab key="progress" title={t("leagues.progress")}>
                                <ProgressTab />
                            </Tab>
                            <Tab key="rewards" title={t("leagues.rewards")}>
                                <RewardsTab />
                            </Tab>
                            <Tab key="leaderboard" title={t("leagues.leaderboard")}>
                                <LeaderboardTab />
                            </Tab>
                        </Tabs>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default LeaguesModal;