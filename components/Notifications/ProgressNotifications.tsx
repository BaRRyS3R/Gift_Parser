// src/components/Notifications/ProgressNotifications.tsx - Player progress notifications

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy,
    Crown,
    Gift,
    Star,
    Award,
    Medal,
    Sparkles,
    ArrowUp
} from "lucide-react";

import type { League } from "@/lib/supabase";
import { getLeagueColors, getLeagueIcon } from "@/utils/leagueSystem";
import { useT } from "@/contexts/LocalizationContext";

export interface ProgressNotification {
    id: string;
    type: "level_up" | "league_promotion" | "reward_available" | "achievement";
    title: string;
    description: string;
    level?: number;
    league?: League;
    previousLeague?: League;
    rewardName?: string;
    duration?: number; // Auto dismiss duration in ms (default 5000)
}

interface ProgressNotificationsProps {
    notifications: ProgressNotification[];
    onDismiss: (notificationId: string) => void;
}

const ProgressNotifications: React.FC<ProgressNotificationsProps> = ({
    notifications,
    onDismiss
}) => {
    const t = useT();
    const [visibleNotifications, setVisibleNotifications] = useState<ProgressNotification[]>([]);

    useEffect(() => {
        // Process new notifications
        notifications.forEach(notification => {
            if (!visibleNotifications.find(n => n.id === notification.id)) {
                setVisibleNotifications(prev => [...prev, notification]);

                // Auto dismiss after specified duration or default 5 seconds
                const duration = notification.duration || 5000;
                setTimeout(() => {
                    handleDismiss(notification.id);
                }, duration);
            }
        });
    }, [notifications, visibleNotifications]);

    const handleDismiss = (notificationId: string) => {
        setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));
        onDismiss(notificationId);
    };

    const getNotificationIcon = (notification: ProgressNotification) => {
        switch (notification.type) {
            case "level_up":
                return <ArrowUp className="text-blue-400" size={24} />;
            case "league_promotion":
                return getLeagueIconComponent(notification.league!);
            case "reward_available":
                return <Gift className="text-yellow-400" size={24} />;
            case "achievement":
                return <Star className="text-purple-400" size={24} />;
            default:
                return <Trophy className="text-white" size={24} />;
        }
    };

    const getLeagueIconComponent = (league: League) => {
        const colors = getLeagueColors(league);
        const iconProps = { size: 24, className: colors.primary };

        switch (league) {
            case "Bronze":
                return <Award {...iconProps} />;
            case "Silver":
                return <Medal {...iconProps} />;
            case "Gold":
                return <Trophy {...iconProps} />;
            case "Diamond":
                return <Crown {...iconProps} />;
        }
    };

    const getNotificationColors = (notification: ProgressNotification) => {
        switch (notification.type) {
            case "level_up":
                return {
                    background: "bg-blue-500/20",
                    border: "border-blue-400/40",
                    glow: "shadow-blue-500/20",
                };
            case "league_promotion":
                const leagueColors = getLeagueColors(notification.league!);
                return {
                    background: leagueColors.background,
                    border: leagueColors.border,
                    glow: `shadow-${notification.league!.toLowerCase()}-500/20`,
                };
            case "reward_available":
                return {
                    background: "bg-yellow-500/20",
                    border: "border-yellow-400/40",
                    glow: "shadow-yellow-500/20",
                };
            case "achievement":
                return {
                    background: "bg-purple-500/20",
                    border: "border-purple-400/40",
                    glow: "shadow-purple-500/20",
                };
            default:
                return {
                    background: "bg-white/10",
                    border: "border-white/30",
                    glow: "shadow-white/10",
                };
        }
    };

    return (
        <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
            <AnimatePresence>
                {visibleNotifications.map((notification) => {
                    const colors = getNotificationColors(notification);

                    return (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 300, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 300, scale: 0.8 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                exit: { duration: 0.3 }
                            }}
                            className={`
                relative overflow-hidden rounded-xl p-4 backdrop-blur-xl
                ${colors.background} border ${colors.border}
                shadow-2xl ${colors.glow}
                cursor-pointer group
              `}
                            onClick={() => handleDismiss(notification.id)}
                        >
                            {/* Animated background shimmer */}
                            <div className="absolute inset-0 opacity-30">
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 3,
                                        ease: "linear"
                                    }}
                                />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex items-start space-x-3">
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-1">
                                    <motion.div
                                        initial={{ rotate: 0, scale: 1 }}
                                        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                                        transition={{
                                            duration: 0.6,
                                            repeat: Infinity,
                                            repeatDelay: 2,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {getNotificationIcon(notification)}
                                    </motion.div>
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-sm mb-1 leading-tight">
                                        {notification.title}
                                    </h3>
                                    <p className="text-white/80 text-xs leading-relaxed">
                                        {notification.description}
                                    </p>

                                    {/* Special content for different notification types */}
                                    {notification.type === "level_up" && notification.level && (
                                        <div className="mt-2 flex items-center space-x-1">
                                            <Sparkles className="text-blue-400" size={12} />
                                            <span className="text-blue-300 text-xs font-bold">
                                                {t("notifications.level")} {notification.level}
                                            </span>
                                        </div>
                                    )}

                                    {notification.type === "league_promotion" && notification.league && (
                                        <div className="mt-2 flex items-center space-x-2">
                                            <div className="flex items-center space-x-1">
                                                <span className="text-white/60 text-xs">
                                                    {notification.previousLeague} →
                                                </span>
                                                <span className={`text-xs font-bold ${getLeagueColors(notification.league).primary}`}>
                                                    {notification.league}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {notification.type === "reward_available" && notification.rewardName && (
                                        <div className="mt-2 flex items-center space-x-1">
                                            <Gift className="text-yellow-400" size={12} />
                                            <span className="text-yellow-300 text-xs font-bold">
                                                {notification.rewardName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Dismiss indicator */}
                                <div className="flex-shrink-0 text-white/40 group-hover:text-white/60 transition-colors">
                                    <span className="text-xs">✕</span>
                                </div>
                            </div>

                            {/* Progress bar for auto-dismiss */}
                            <motion.div
                                className="absolute bottom-0 left-0 h-0.5 bg-white/30"
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{
                                    duration: (notification.duration || 5000) / 1000,
                                    ease: "linear"
                                }}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default ProgressNotifications;

// Hook for managing progress notifications
export function useProgressNotifications() {
    const [notifications, setNotifications] = useState<ProgressNotification[]>([]);

    const addNotification = (notification: Omit<ProgressNotification, "id">) => {
        const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setNotifications(prev => [...prev, { ...notification, id }]);
    };

    const dismissNotification = (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    // Helper methods for common notifications
    const showLevelUp = (newLevel: number) => {
        addNotification({
            type: "level_up",
            title: "Level Up!",
            description: `Congratulations! You've reached level ${newLevel}!`,
            level: newLevel,
            duration: 6000,
        });
    };

    const showLeaguePromotion = (newLeague: League, previousLeague: League) => {
        addNotification({
            type: "league_promotion",
            title: "League Promotion!",
            description: `You've been promoted to ${newLeague} League!`,
            league: newLeague,
            previousLeague: previousLeague,
            duration: 7000,
        });
    };

    const showRewardAvailable = (rewardName: string, level: number) => {
        addNotification({
            type: "reward_available",
            title: "New Reward Available!",
            description: `You can now claim your level ${level} reward!`,
            rewardName: rewardName,
            level: level,
            duration: 8000,
        });
    };

    const showAchievement = (title: string, description: string) => {
        addNotification({
            type: "achievement",
            title: title,
            description: description,
            duration: 5000,
        });
    };

    return {
        notifications,
        addNotification,
        dismissNotification,
        clearAllNotifications,
        showLevelUp,
        showLeaguePromotion,
        showRewardAvailable,
        showAchievement,
    };
}