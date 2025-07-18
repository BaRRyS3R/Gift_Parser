// src/components/LeagueProgress/AchievementNotification.tsx - Updated with consolidated type imports

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody } from "@nextui-org/react";
import {
    Trophy,
    Star,
    Gift,
    Medal,
    Award,
    Crown,
    ArrowUp,
    X,
    Sparkles
} from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";
import type { League, LeagueRewardResult } from "@/types/league-definitions";

export interface AchievementNotificationData {
    type: 'level_up' | 'league_promotion' | 'reward_received';
    level?: number;
    league?: League;
    position?: number;
    reward?: LeagueRewardResult['reward'];
}

interface AchievementNotificationProps {
    notification: AchievementNotificationData | null;
    onClose: () => void;
    autoCloseDelay?: number;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
    notification,
    onClose,
    autoCloseDelay = 5000
}) => {
    const t = useT();
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Automated closure management with configurable delay
    useEffect(() => {
        if (!notification) return;

        setIsVisible(true);
        setIsExiting(false);

        const timer = setTimeout(() => {
            handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
    }, [notification, autoCloseDelay]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 300);
    };

    if (!notification || !isVisible) {
        return null;
    }

    // League visual identity configuration
    const getLeagueIcon = (leagueName?: string) => {
        switch (leagueName) {
            case 'bronze': return Trophy;
            case 'silver': return Medal;
            case 'gold': return Award;
            case 'platinum': return Crown;
            case 'diamond': return Star;
            default: return Trophy;
        }
    };

    const getLeagueColors = (leagueName?: string) => {
        switch (leagueName) {
            case 'bronze':
                return {
                    bg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/20',
                    border: 'border-orange-400/50',
                    text: 'text-orange-400',
                    accent: 'text-orange-300'
                };
            case 'silver':
                return {
                    bg: 'bg-gradient-to-br from-gray-400/20 to-gray-500/20',
                    border: 'border-gray-400/50',
                    text: 'text-gray-300',
                    accent: 'text-gray-200'
                };
            case 'gold':
                return {
                    bg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20',
                    border: 'border-yellow-400/50',
                    text: 'text-yellow-400',
                    accent: 'text-yellow-300'
                };
            case 'platinum':
                return {
                    bg: 'bg-gradient-to-br from-purple-400/20 to-purple-500/20',
                    border: 'border-purple-400/50',
                    text: 'text-purple-300',
                    accent: 'text-purple-200'
                };
            case 'diamond':
                return {
                    bg: 'bg-gradient-to-br from-cyan-400/20 to-cyan-500/20',
                    border: 'border-cyan-400/50',
                    text: 'text-cyan-300',
                    accent: 'text-cyan-200'
                };
            default:
                return {
                    bg: 'bg-gradient-to-br from-white/10 to-white/20',
                    border: 'border-white/30',
                    text: 'text-white',
                    accent: 'text-white/80'
                };
        }
    };

    // Dynamic notification content generation based on achievement type
    const renderNotificationContent = () => {
        switch (notification.type) {
            case 'level_up':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <ArrowUp className="text-blue-400 animate-bounce" size={24} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-blue-400">
                                    {t("leagues.notifications.levelUp.title")}
                                </h3>
                                <p className="text-white/80">
                                    {t("leagues.notifications.levelUp.message", { level: notification.level || 1 })}
                                </p>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-blue-300 text-sm">
                                {t("leagues.notifications.levelUp.keep_going")}
                            </p>
                        </div>
                    </div>
                );

            case 'league_promotion':
                if (!notification.league) return null;

                const leagueColors = getLeagueColors(notification.league.name);
                const LeagueIcon = getLeagueIcon(notification.league.name);

                return (
                    <div className="space-y-4">
                        <div className="text-center space-y-3">
                            <div className={`w-16 h-16 ${leagueColors.bg} rounded-full flex items-center justify-center border ${leagueColors.border} mx-auto`}>
                                <LeagueIcon className={`${leagueColors.text} animate-pulse-gentle`} size={28} />
                            </div>

                            <div>
                                <h3 className={`text-xl font-bold ${leagueColors.text}`}>
                                    {t("leagues.notifications.leaguePromotion.title")}
                                </h3>
                                <p className="text-white/90 text-lg">
                                    {t("leagues.notifications.leaguePromotion.message", {
                                        league: t(`leagues.names.${notification.league.name}` as any)
                                    })}
                                </p>
                            </div>

                            {notification.position && (
                                <div className={`inline-block px-3 py-1 rounded-full ${leagueColors.bg} border ${leagueColors.border}`}>
                                    <span className={`text-sm font-bold ${leagueColors.text}`}>
                                        {t("leagues.notifications.leaguePromotion.position", { position: notification.position })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Enhanced celebration effects for league promotions */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-xl">
                            <div className="absolute top-2 left-2 animate-bounce delay-75">
                                <Sparkles className="text-yellow-400" size={16} />
                            </div>
                            <div className="absolute top-4 right-4 animate-bounce delay-150">
                                <Sparkles className="text-yellow-400" size={12} />
                            </div>
                            <div className="absolute bottom-4 left-4 animate-bounce delay-300">
                                <Sparkles className="text-yellow-400" size={14} />
                            </div>
                        </div>
                    </div>
                );

            case 'reward_received':
                if (!notification.reward) return null;

                const isGiftReward = notification.reward.type !== 'attempts';
                const rewardColors = isGiftReward
                    ? getLeagueColors(notification.reward.league)
                    : {
                        bg: 'bg-gradient-to-br from-green-500/20 to-emerald-600/20',
                        border: 'border-green-400/50',
                        text: 'text-green-400',
                        accent: 'text-green-300'
                    };

                return (
                    <div className="space-y-4">
                        <div className="text-center space-y-3">
                            <div className={`w-16 h-16 ${rewardColors.bg} rounded-full flex items-center justify-center border ${rewardColors.border} mx-auto`}>
                                <Gift className={`${rewardColors.text} animate-pulse-gentle`} size={28} />
                            </div>

                            <div>
                                <h3 className={`text-xl font-bold ${rewardColors.text}`}>
                                    {t("leagues.notifications.rewardReceived.title")}
                                </h3>

                                {isGiftReward ? (
                                    <p className="text-white/90">
                                        {t("leagues.notifications.rewardReceived.giftMessage", {
                                            reward: notification.reward.name || 'Special Gift'
                                        })}
                                    </p>
                                ) : (
                                    <p className="text-white/90">
                                        {t("leagues.notifications.rewardReceived.attemptsMessage", {
                                            amount: notification.reward.amount || 20
                                        })}
                                    </p>
                                )}
                            </div>

                            <div className={`inline-block px-3 py-1 rounded-full ${rewardColors.bg} border ${rewardColors.border}`}>
                                <span className={`text-sm font-bold ${rewardColors.text}`}>
                                    {t("leagues.notifications.rewardReceived.position", {
                                        position: notification.reward.position || 1,
                                        league: t(`leagues.names.${notification.reward.league}` as any)
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Reward-specific celebration effects */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-xl">
                            <div className="absolute top-2 right-2 animate-bounce">
                                <Gift className="text-yellow-400" size={16} />
                            </div>
                            <div className="absolute bottom-2 left-2 animate-bounce delay-200">
                                <Gift className="text-yellow-400" size={14} />
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`
      fixed top-20 left-1/2 transform -translate-x-1/2 z-50 
      transition-all duration-300 ease-out
      ${isExiting
                ? 'opacity-0 -translate-y-4 scale-95'
                : 'opacity-100 translate-y-0 scale-100'
            }
    `}>
            <Card className="bg-black/90 backdrop-blur-lg border border-white/30 shadow-2xl max-w-sm mx-auto">
                <CardBody className="p-6 relative">
                    {/* Interactive close button with hover effects */}
                    <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    >
                        <X className="text-white/60 hover:text-white" size={16} />
                    </button>

                    {/* Dynamic notification content */}
                    {renderNotificationContent()}
                </CardBody>
            </Card>
        </div>
    );
};

// Specialized hook for centralized achievement notification management
export const useAchievementNotifications = () => {
    const [notification, setNotification] = useState<AchievementNotificationData | null>(null);

    const showNotification = (data: AchievementNotificationData) => {
        setNotification(data);
    };

    const hideNotification = () => {
        setNotification(null);
    };

    return {
        notification,
        showNotification,
        hideNotification
    };
};

export default AchievementNotification;