// src/app/profile/page.tsx - Enhanced with localization

"use client";

import { useState, useEffect } from "react";
import {
    Zap,
    Crosshair,
    Target,
    Clock,
    TrendingUp,
    Star,
    Medal,
    Award,
    User,
    Activity,
    Calendar,
    Trophy,
    Users,
    Share2,
    Copy,
    Gift,
    Link,
    Check,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService, type GameResultDB, type ReferralInfo } from "@/lib/supabase";
import { GameMode } from "@/types/game-modes/common";
import { formatSurvivalTime } from "@/game-modes/survival/SurvivalGameLogic";
import { useT } from "@/contexts/LocalizationContext";

interface UserRankings {
    overall: number | null;
    reaction: number | null;
    survival: number | null;
}

export default function ProfilePage() {
    const { user, telegramUser, isLoading: userLoading } = useUser();
    const t = useT();
    const [gameHistory, setGameHistory] = useState<GameResultDB[]>([]);
    const [rankings, setRankings] = useState<UserRankings>({
        overall: null,
        reaction: null,
        survival: null,
    });
    const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<
        "stats" | "history" | "achievements" | "referrals"
    >("stats");
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return;

            try {
                setIsLoadingData(true);

                const [history, overallRank, reactionRank, survivalRank, refInfo] =
                    await Promise.all([
                        userService.getGameHistory(telegramUser.id, 20),
                        userService.getUserRanking(telegramUser.id),
                        userService.getUserReactionRanking(telegramUser.id),
                        userService.getUserSurvivalRanking(telegramUser.id),
                        userService.getReferralInfo(telegramUser.id),
                    ]);

                setGameHistory(history);
                setRankings({
                    overall: overallRank,
                    reaction: reactionRank,
                    survival: survivalRank,
                });
                setReferralInfo(refInfo);
            } catch (error) {
                console.error("Error loading profile data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        if (telegramUser && !userLoading) {
            loadProfileData();
        }
    }, [telegramUser, userLoading]);

    const handleCopyReferralLink = async () => {
        if (!referralInfo) return;

        try {
            await navigator.clipboard.writeText(referralInfo.referralLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleShareReferralLink = () => {
        if (!referralInfo) return;

        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const shareText = `🎮 ${t('profile.referrals.shareWithFriends')}: ${referralInfo.referralLink}`;

            // Try to use Telegram's share functionality
            if (window.Telegram.WebApp.openTelegramLink) {
                window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralInfo.referralLink)}&text=${encodeURIComponent(shareText)}`);
            } else {
                // Fallback to copying
                handleCopyReferralLink();
            }
        } else {
            // Fallback for non-Telegram environments
            handleCopyReferralLink();
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getAchievements = () => {
        if (!user) return [];

        const achievements = [];

        // General achievements
        if (user.total_games >= 10)
            achievements.push({
                icon: Target,
                name: t('profile.achievements.activePlayer'),
                desc: t('profile.achievements.descriptions.gamesPlayed', { count: 10 }),
                color: "text-blue-400",
            });
        if (user.total_games >= 50)
            achievements.push({
                icon: Medal,
                name: t('profile.achievements.dedicatedGamer'),
                desc: t('profile.achievements.descriptions.gamesPlayed', { count: 50 }),
                color: "text-purple-400",
            });
        if (user.total_games >= 100)
            achievements.push({
                icon: Award,
                name: t('profile.achievements.gameMaster'),
                desc: t('profile.achievements.descriptions.gamesPlayed', { count: 100 }),
                color: "text-yellow-400",
            });

        // Referral achievements
        if (user.referral_count >= 1)
            achievements.push({
                icon: Users,
                name: t('profile.achievements.recruiter'),
                desc: t('profile.achievements.descriptions.invitedFriend', { count: 1 }),
                color: "text-green-400",
            });
        if (user.referral_count >= 5)
            achievements.push({
                icon: Share2,
                name: t('profile.achievements.influencer'),
                desc: t('profile.achievements.descriptions.invitedFriends', { count: 5 }),
                color: "text-green-400",
            });
        if (user.referral_count >= 10)
            achievements.push({
                icon: Gift,
                name: t('profile.achievements.ambassador'),
                desc: t('profile.achievements.descriptions.invitedFriends', { count: 10 }),
                color: "text-green-400",
            });

        // Reaction Mode achievements
        if (user.reaction_games >= 1)
            achievements.push({
                icon: Zap,
                name: t('profile.achievements.speedTester'),
                desc: t('profile.achievements.descriptions.testedReaction'),
                color: "text-white",
            });
        if (user.reaction_games >= 10)
            achievements.push({
                icon: Zap,
                name: t('profile.achievements.quickReflexes'),
                desc: t('profile.achievements.descriptions.reactionTests', { count: 10 }),
                color: "text-white",
            });
        if ((user.reaction_best_time || 0) <= 200)
            achievements.push({
                icon: Zap,
                name: t('profile.achievements.lightningFast'),
                desc: t('profile.achievements.descriptions.subReaction', { time: 200 }),
                color: "text-white",
            });
        if ((user.reaction_best_time || 0) <= 150)
            achievements.push({
                icon: Zap,
                name: t('profile.achievements.superhumanSpeed'),
                desc: t('profile.achievements.descriptions.subReaction', { time: 150 }),
                color: "text-white",
            });
        if (rankings.reaction && rankings.reaction <= 10)
            achievements.push({
                icon: Trophy,
                name: t('profile.achievements.speedDemon'),
                desc: t('profile.achievements.descriptions.topReaction'),
                color: "text-white",
            });

        // Survival Mode achievements
        if (user.survival_games >= 1)
            achievements.push({
                icon: Crosshair,
                name: t('profile.achievements.survivor'),
                desc: t('profile.achievements.descriptions.enteredSurvival'),
                color: "text-red-400",
            });
        if (user.survival_games >= 10)
            achievements.push({
                icon: Crosshair,
                name: t('profile.achievements.persistentSurvivor'),
                desc: t('profile.achievements.descriptions.survivalAttempts', { count: 10 }),
                color: "text-red-400",
            });
        if ((user.survival_best_time || 0) >= 30000)
            achievements.push({
                icon: Clock,
                name: t('profile.achievements.enduranceMaster'),
                desc: t('profile.achievements.descriptions.secondsSurvival', { time: 30 }),
                color: "text-red-400",
            });
        if ((user.survival_best_time || 0) >= 60000)
            achievements.push({
                icon: Clock,
                name: t('profile.achievements.survivalLegend'),
                desc: t('profile.achievements.descriptions.minuteSurvival', { time: 1 }),
                color: "text-red-400",
            });
        if ((user.survival_max_level || 0) >= 5)
            achievements.push({
                icon: TrendingUp,
                name: t('profile.achievements.levelClimber'),
                desc: t('profile.achievements.descriptions.reachedLevel', { level: 5 }),
                color: "text-red-400",
            });
        if ((user.survival_max_level || 0) >= 10)
            achievements.push({
                icon: TrendingUp,
                name: t('profile.achievements.eliteSurvivor'),
                desc: t('profile.achievements.descriptions.reachedLevel', { level: 10 }),
                color: "text-red-400",
            });
        if ((user.survival_best_streak || 0) >= 50)
            achievements.push({
                icon: Target,
                name: t('profile.achievements.streakMaster'),
                desc: t('profile.achievements.descriptions.perfectHits', { count: 50 }),
                color: "text-red-400",
            });
        if (rankings.survival && rankings.survival <= 5)
            achievements.push({
                icon: Trophy,
                name: t('profile.achievements.survivalElite'),
                desc: t('profile.achievements.descriptions.topSurvivor', { rank: 5 }),
                color: "text-red-400",
            });

        // Overall rankings
        if (rankings.overall && rankings.overall <= 10)
            achievements.push({
                icon: Trophy,
                name: t('profile.achievements.topPlayer'),
                desc: t('profile.achievements.descriptions.topOverall', { rank: 10 }),
                color: "text-yellow-400",
            });

        return achievements;
    };

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0;
        const survivalGames = user?.survival_games || 0;
        const reactionGames = user?.reaction_games || 0;

        // Factor in different game modes for level calculation
        const adjustedTotal = totalGames + survivalGames * 2 + reactionGames * 1.5;

        if (adjustedTotal >= 100)
            return { level: t('profile.levels.legend'), color: "text-yellow-400" };
        if (adjustedTotal >= 50)
            return { level: t('profile.levels.expert'), color: "text-purple-400" };
        if (adjustedTotal >= 20)
            return { level: t('profile.levels.skilled'), color: "text-blue-400" };
        if (adjustedTotal >= 10)
            return { level: t('profile.levels.active'), color: "text-green-400" };

        return { level: t('profile.levels.rookie'), color: "text-white" };
    };

    const getGameModeIcon = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION:
                return Zap;
            case GameMode.SURVIVAL:
                return Crosshair;
            default:
                return Target;
        }
    };

    const getGameModeColor = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION:
                return "text-white";
            case GameMode.SURVIVAL:
                return "text-red-400";
            default:
                return "text-white";
        }
    };

    const getGameModeName = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION:
                return t('game.modes.reaction.name');
            case GameMode.SURVIVAL:
                return t('game.modes.survival.name');
            default:
                return "UNKNOWN";
        }
    };

    if (userLoading || isLoadingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">{t('profile.loadingProfile')}</p>
                </div>
            </div>
        );
    }

    if (!user || !telegramUser) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <User className="text-white/60 mx-auto" size={32} />
                    <p className="text-white">{t('profile.notFound')}</p>
                </div>
            </div>
        );
    }

    const profileLevel = getProfileLevel();

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Profile Header */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <User className="text-white" size={20} />
                            </div>
                            <div
                                className={`absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-xs font-bold ${profileLevel.color} bg-black/60`}
                            >
                                {profileLevel.level}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-white">
                                {user.first_name} {user.last_name || ""}
                            </h1>
                            {user.username && (
                                <p className="text-white/60 text-xs">
                                    @{user.username}
                                </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                                {user.is_premium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs">
                                        <Star className="mr-1" size={10} />
                                        PREMIUM
                                    </span>
                                )}
                                {rankings.overall && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs">
                                        #{rankings.overall}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Activity className="text-white/60 mx-auto mb-1" size={12} />
                            <div className="text-lg font-bold text-white">
                                {user.total_games}
                            </div>
                            <div className="text-xs text-white/60">{t('common.total')}</div>
                        </div>
                        <div className="text-center p-2 bg-white/10 rounded-lg border border-white/30">
                            <Zap className="text-white mx-auto mb-1" size={12} />
                            <div className="text-lg font-bold text-white">
                                {user.reaction_games || 0}
                            </div>
                            <div className="text-xs text-white/60">
                                {t('game.modes.reaction.name')}
                            </div>
                        </div>
                        <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                            <Crosshair className="text-red-400 mx-auto mb-1" size={12} />
                            <div className="text-lg font-bold text-red-400">
                                {user.survival_games || 0}
                            </div>
                            <div className="text-xs text-red-300/60">
                                {t('game.modes.survival.name')}
                            </div>
                        </div>
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Trophy className="text-white/60 mx-auto mb-1" size={12} />
                            <div className="text-lg font-bold text-white">
                                {user.best_score}
                            </div>
                            <div className="text-xs text-white/60">{t('common.best')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex">
                        {(["stats", "referrals", "history", "achievements"] as const).map((tab) => (
                            <button
                                key={tab}
                                className={`
                                    flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all duration-300
                                    ${activeTab === tab
                                        ? "bg-white/20 text-white"
                                        : "text-white/60 hover:text-white/80"
                                    }
                                `}
                                onClick={() => setActiveTab(tab)}
                            >
                                {t(`profile.tabs.${tab}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === "stats" && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Current Attempts Display */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Zap className="text-yellow-400" size={16} />
                                <h3 className="text-sm text-white font-bold">
                                    {t('profile.stats.currentAttempts')}
                                </h3>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400 mb-2">
                                    {user.attempts_remaining}
                                </div>
                                <div className="text-xs text-white/60">
                                    {t('attempts.remaining')}
                                </div>
                            </div>
                        </div>

                        {/* Reaction Mode Statistics */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Zap className="text-white" size={16} />
                                <h3 className="text-sm text-white font-bold">
                                    {t('profile.stats.reactionModeStats')}
                                </h3>
                            </div>

                            {(user.reaction_games || 0) === 0 ? (
                                <div className="text-center py-4">
                                    <Zap className="text-white/60 mx-auto mb-2" size={24} />
                                    <p className="text-white/60 text-sm">
                                        {t('profile.stats.noReactionTests')}
                                    </p>
                                    <p className="text-white/40 text-xs mt-1">
                                        {t('profile.stats.testReflexes')}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                                        <Clock className="text-white mx-auto mb-1" size={16} />
                                        <div className="text-lg font-bold text-white">
                                            {user.reaction_best_time || 0}ms
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {t('profile.stats.bestTime')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                                        <Target
                                            className="text-white mx-auto mb-1"
                                            size={16}
                                        />
                                        <div className="text-lg font-bold text-white">
                                            {user.reaction_best_score || 0}
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {t('profile.stats.bestScore')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                                        <TrendingUp
                                            className="text-white mx-auto mb-1"
                                            size={16}
                                        />
                                        <div className="text-lg font-bold text-white">
                                            {user.reaction_average_time || 0}ms
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {t('profile.stats.averageTime')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                                        <Trophy
                                            className="text-white mx-auto mb-1"
                                            size={16}
                                        />
                                        <div className="text-lg font-bold text-white">
                                            #{rankings.reaction || "N/A"}
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {t('profile.stats.ranking')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Survival Mode Statistics */}
                        <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Crosshair className="text-red-400" size={16} />
                                <h3 className="text-sm text-red-300 font-bold">
                                    {t('profile.stats.survivalModeStats')}
                                </h3>
                            </div>

                            {(user.survival_games || 0) === 0 ? (
                                <div className="text-center py-4">
                                    <Crosshair
                                        className="text-red-400/60 mx-auto mb-2"
                                        size={24}
                                    />
                                    <p className="text-red-300/60 text-sm">
                                        {t('profile.stats.noSurvivalAttempts')}
                                    </p>
                                    <p className="text-red-400/40 text-xs mt-1">
                                        {t('profile.stats.enterSurvival')}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Clock className="text-red-300 mx-auto mb-1" size={16} />
                                        <div className="text-lg font-bold text-red-300">
                                            {formatSurvivalTime(user.survival_best_time || 0)}
                                        </div>
                                        <div className="text-xs text-red-400/60">
                                            {t('profile.stats.bestTime')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <TrendingUp
                                            className="text-orange-300 mx-auto mb-1"
                                            size={16}
                                        />
                                        <div className="text-lg font-bold text-orange-300">
                                            {user.survival_max_level || 0}
                                        </div>
                                        <div className="text-xs text-red-400/60">
                                            {t('profile.stats.maxLevel')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Target className="text-green-300 mx-auto mb-1" size={16} />
                                        <div className="text-lg font-bold text-green-300">
                                            {user.survival_best_streak || 0}
                                        </div>
                                        <div className="text-xs text-red-400/60">
                                            {t('profile.stats.bestStreak')}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Trophy className="text-red-300 mx-auto mb-1" size={16} />
                                        <div className="text-lg font-bold text-red-300">
                                            #{rankings.survival || "N/A"}
                                        </div>
                                        <div className="text-xs text-red-400/60">
                                            {t('profile.stats.ranking')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "referrals" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-green-500/10 backdrop-blur-xl border border-green-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Share2 className="text-green-400" size={16} />
                                <h3 className="text-sm text-green-300 font-bold">
                                    {t('profile.referrals.title')}
                                </h3>
                            </div>

                            {referralInfo && (
                                <div className="space-y-4">
                                    {/* Referral Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-400/30">
                                            <Users className="text-green-300 mx-auto mb-1" size={16} />
                                            <div className="text-lg font-bold text-green-300">
                                                {referralInfo.referralCount}
                                            </div>
                                            <div className="text-xs text-green-400/60">
                                                {t('profile.referrals.friendsInvited')}
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-400/30">
                                            <Gift className="text-green-300 mx-auto mb-1" size={16} />
                                            <div className="text-lg font-bold text-green-300">
                                                +{referralInfo.referralBonus}
                                            </div>
                                            <div className="text-xs text-green-400/60">
                                                {t('profile.referrals.attemptsBonus')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referral Code */}
                                    <div className="space-y-2">
                                        <div className="text-sm text-green-300 font-bold">
                                            {t('profile.referrals.yourReferralCode')}
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-3 border border-green-400/30">
                                            <div className="text-center font-mono text-lg font-bold text-green-400 tracking-wider">
                                                {referralInfo.referralCode}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referral Link */}
                                    <div className="space-y-2">
                                        <div className="text-sm text-green-300 font-bold">
                                            {t('profile.referrals.referralLink')}
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-3 border border-green-400/30">
                                            <div className="text-xs font-mono text-green-400/80 break-all">
                                                {referralInfo.referralLink}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleCopyReferralLink}
                                            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-green-500/20 border border-green-400/40 text-green-300 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-all duration-300"
                                        >
                                            {copySuccess ? (
                                                <>
                                                    <Check size={16} />
                                                    <span>{t('common.copied')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    <span>{t('profile.referrals.copyLink')}</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleShareReferralLink}
                                            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-green-500/20 border border-green-400/40 text-green-300 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-all duration-300"
                                        >
                                            <Share2 size={16} />
                                            <span>{t('profile.referrals.share')}</span>
                                        </button>
                                    </div>

                                    {/* How it works */}
                                    <div className="bg-black/40 rounded-lg p-4 border border-green-400/20">
                                        <div className="text-sm text-green-300 font-bold mb-2">
                                            {t('profile.referrals.howItWorks')}
                                        </div>
                                        <div className="space-y-1 text-xs text-green-400/80">
                                            <p>• {t('profile.referrals.shareWithFriends')}</p>
                                            <p>• {t('profile.referrals.theyGetExtra', {
                                                bonus: referralInfo.referralBonus,
                                                plural: referralInfo.referralBonus > 1 ? 's' : ''
                                            })}</p>
                                            <p>• {t('profile.referrals.youGetRecognition')}</p>
                                            <p>• {t('profile.referrals.helpGrow')}</p>
                                        </div>
                                    </div>

                                    {/* Referred by info */}
                                    {referralInfo.referredBy && (
                                        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
                                            <div className="text-sm text-blue-300 font-bold mb-1">
                                                {t('profile.referrals.referredBy')}
                                            </div>
                                            <div className="text-blue-400 font-mono font-bold">
                                                {referralInfo.referredBy}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Calendar className="text-white/80" size={16} />
                                <h3 className="text-sm text-white font-bold">
                                    {t('profile.history.title')}
                                </h3>
                            </div>
                            {gameHistory.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock className="text-white/40 mx-auto mb-2" size={24} />
                                    <p className="text-white/60 text-sm">
                                        {t('profile.history.noGamesYet')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {gameHistory.map((game) => {
                                        const Icon = getGameModeIcon(game.game_mode);
                                        const colorClass = getGameModeColor(game.game_mode);
                                        const isReaction = game.game_mode === GameMode.REACTION;
                                        const isSurvival = game.game_mode === GameMode.SURVIVAL;

                                        return (
                                            <div
                                                key={game.id}
                                                className={`flex items-center justify-between p-2 rounded-lg ${isReaction
                                                    ? "bg-white/10 border border-white/30"
                                                    : isSurvival
                                                        ? "bg-red-500/20 border border-red-400/30"
                                                        : "bg-white/10"
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <Icon className={colorClass} size={16} />
                                                    <div>
                                                        <div
                                                            className={`font-bold text-sm ${colorClass}`}
                                                        >
                                                            {getGameModeName(game.game_mode)}
                                                        </div>
                                                        <div className="text-xs text-white/60">
                                                            {formatDate(game.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div
                                                        className={`font-bold text-sm ${colorClass}`}
                                                    >
                                                        {game.score}
                                                    </div>
                                                    {isReaction && game.reaction_time ? (
                                                        <div className="text-xs text-white/60">
                                                            {game.reaction_time}ms
                                                        </div>
                                                    ) : isSurvival && game.survival_time ? (
                                                        <div className="text-xs text-red-300/60">
                                                            {formatSurvivalTime(game.survival_time)}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "achievements" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Award className="text-white/80" size={16} />
                                <h3 className="text-sm text-white font-bold">
                                    {t('profile.achievements.title')}
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {getAchievements().map((achievement, index) => {
                                    const Icon = achievement.icon;
                                    const isReactionAchievement =
                                        achievement.color === "text-white";
                                    const isSurvivalAchievement =
                                        achievement.color === "text-red-400";
                                    const isReferralAchievement =
                                        achievement.color === "text-green-400";

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-center space-x-3 p-2 rounded-lg ${isReactionAchievement
                                                ? "bg-white/10 border border-white/30"
                                                : isSurvivalAchievement
                                                    ? "bg-red-500/20 border border-red-400/30"
                                                    : isReferralAchievement
                                                        ? "bg-green-500/20 border border-green-400/30"
                                                        : "bg-white/10"
                                                }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReactionAchievement
                                                    ? "bg-white/30"
                                                    : isSurvivalAchievement
                                                        ? "bg-red-500/30"
                                                        : isReferralAchievement
                                                            ? "bg-green-500/30"
                                                            : "bg-white/20"
                                                    }`}
                                            >
                                                <Icon className={achievement.color} size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div
                                                    className={`font-bold text-sm ${achievement.color}`}
                                                >
                                                    {achievement.name}
                                                </div>
                                                <div
                                                    className={`text-xs ${isReactionAchievement
                                                        ? "text-white/60"
                                                        : isSurvivalAchievement
                                                            ? "text-red-400/60"
                                                            : isReferralAchievement
                                                                ? "text-green-400/60"
                                                                : "text-white/60"
                                                        }`}
                                                >
                                                    {achievement.desc}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-4 h-4 rounded-full flex items-center justify-center ${isReactionAchievement
                                                    ? "bg-white/30"
                                                    : isSurvivalAchievement
                                                        ? "bg-red-500/30"
                                                        : isReferralAchievement
                                                            ? "bg-green-500/30"
                                                            : "bg-white/20"
                                                    }`}
                                            >
                                                <div
                                                    className={`w-2 h-2 rounded-full ${achievement.color.replace("text-", "bg-")}`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {getAchievements().length === 0 && (
                                    <div className="text-center py-6">
                                        <Star className="text-white/40 mx-auto mb-2" size={24} />
                                        <p className="text-white/60 text-sm">
                                            {t('profile.achievements.noAchievements')}
                                        </p>
                                        <p className="text-white/40 text-xs mt-1">
                                            {t('profile.achievements.playToUnlock')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}