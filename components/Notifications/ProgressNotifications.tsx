// src/components/Notifications/ProgressNotifications.tsx - Fixed TypeScript iteration error

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
    timestamp: number; // Added for deduplication
    fingerprint: string; // Added for deduplication
}

interface ProgressNotificationsProps {
    notifications: ProgressNotification[];
    onDismiss: (notificationId: string) => void;
}

// Configuration constants
const NOTIFICATION_CONFIG = {
    MAX_CONCURRENT: 3, // Maximum notifications shown at once
    AUTO_DISMISS_DURATION: 5000, // Default auto-dismiss time
    DEDUPLICATION_WINDOW: 10000, // 10 seconds window for deduplication
    STAGGER_DELAY: 300, // Delay between showing multiple notifications
} as const;

const ProgressNotifications: React.FC<ProgressNotificationsProps> = ({
    notifications,
    onDismiss
}) => {
    const t = useT();
    const [visibleNotifications, setVisibleNotifications] = useState<ProgressNotification[]>([]);
    const [notificationQueue, setNotificationQueue] = useState<ProgressNotification[]>([]);

    // Track shown notifications to prevent immediate duplicates
    const shownNotificationsRef = useRef<Set<string>>(new Set());

    // Process notification queue with rate limiting
    useEffect(() => {
        const processQueue = () => {
            setNotificationQueue(queue => {
                if (queue.length === 0 || visibleNotifications.length >= NOTIFICATION_CONFIG.MAX_CONCURRENT) {
                    return queue;
                }

                const nextNotification = queue[0];
                const remainingQueue = queue.slice(1);

                // Check if we haven't shown this notification recently
                if (!shownNotificationsRef.current.has(nextNotification.fingerprint)) {
                    setVisibleNotifications(prev => [...prev, nextNotification]);
                    shownNotificationsRef.current.add(nextNotification.fingerprint);

                    // Schedule auto-dismiss
                    const duration = nextNotification.duration || NOTIFICATION_CONFIG.AUTO_DISMISS_DURATION;
                    setTimeout(() => {
                        handleDismiss(nextNotification.id);
                    }, duration);
                }

                return remainingQueue;
            });
        };

        const timeoutId = setTimeout(processQueue, NOTIFICATION_CONFIG.STAGGER_DELAY);
        return () => clearTimeout(timeoutId);
    }, [visibleNotifications.length, notificationQueue.length]);

    // Process new notifications with deduplication
    useEffect(() => {
        const newNotifications = notifications.filter(notification => {
            const isAlreadyVisible = visibleNotifications.some(v => v.id === notification.id);
            const isAlreadyQueued = notificationQueue.some(q => q.id === notification.id);
            const isRecentlyShown = shownNotificationsRef.current.has(notification.fingerprint);

            return !isAlreadyVisible && !isAlreadyQueued && !isRecentlyShown;
        });

        if (newNotifications.length > 0) {
            setNotificationQueue(prev => [...prev, ...newNotifications]);
        }
    }, [notifications, visibleNotifications, notificationQueue]);

    // Clean up old fingerprints periodically
    useEffect(() => {
        const cleanup = () => {
            const cutoff = Date.now() - NOTIFICATION_CONFIG.DEDUPLICATION_WINDOW;
            // Note: In a real implementation, you'd want to track timestamps per fingerprint
            // For now, we clear all after the window to prevent memory leaks
            if (shownNotificationsRef.current.size > 50) { // Arbitrary limit
                shownNotificationsRef.current.clear();
            }
        };

        const intervalId = setInterval(cleanup, NOTIFICATION_CONFIG.DEDUPLICATION_WINDOW);
        return () => clearInterval(intervalId);
    }, []);

    const handleDismiss = useCallback((notificationId: string) => {
        setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));
        onDismiss(notificationId);
    }, [onDismiss]);

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
            <AnimatePresence mode="popLayout">
                {visibleNotifications.slice(0, NOTIFICATION_CONFIG.MAX_CONCURRENT).map((notification, index) => {
                    const colors = getNotificationColors(notification);

                    return (
                        <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, x: 300, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                x: 0,
                                scale: 1,
                                y: index * 80 // Stack notifications with offset
                            }}
                            exit={{
                                opacity: 0,
                                x: 300,
                                scale: 0.8,
                                transition: { duration: 0.3 }
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                layout: { duration: 0.3 }
                            }}
                            className={`
                relative overflow-hidden rounded-xl p-4 backdrop-blur-xl
                ${colors.background} border ${colors.border}
                shadow-2xl ${colors.glow}
                cursor-pointer group
                max-w-xs
              `}
                            onClick={() => handleDismiss(notification.id)}
                            style={{ zIndex: 50 - index }} // Higher z-index for newer notifications
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
                                    duration: (notification.duration || NOTIFICATION_CONFIG.AUTO_DISMISS_DURATION) / 1000,
                                    ease: "linear"
                                }}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Queue indicator */}
            {notificationQueue.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1">
                        <span className="text-white/60 text-xs">
                            +{notificationQueue.length} more
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ProgressNotifications;

// Enhanced hook for managing progress notifications with deduplication
export function useProgressNotifications() {
    const [notifications, setNotifications] = useState<ProgressNotification[]>([]);

    // Track recent notifications to prevent duplicates
    const recentNotificationsRef = useRef<Map<string, number>>(new Map());

    const generateFingerprint = (type: string, level?: number, league?: string, rewardName?: string): string => {
        return `${type}_${level || ''}_${league || ''}_${rewardName || ''}`;
    };

    const addNotification = useCallback((notification: Omit<ProgressNotification, "id" | "timestamp" | "fingerprint">) => {
        const fingerprint = generateFingerprint(notification.type, notification.level, notification.league, notification.rewardName);
        const now = Date.now();

        // Check if we've shown this notification recently
        const lastShown = recentNotificationsRef.current.get(fingerprint);
        if (lastShown && (now - lastShown) < NOTIFICATION_CONFIG.DEDUPLICATION_WINDOW) {
            console.log(`Duplicate notification prevented: ${fingerprint}`);
            return;
        }

        const id = `notification_${now}_${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: ProgressNotification = {
            ...notification,
            id,
            timestamp: now,
            fingerprint,
        };

        setNotifications(prev => [...prev, newNotification]);
        recentNotificationsRef.current.set(fingerprint, now);

        // Clean up old entries periodically - FIXED: Using forEach instead of entries() iteration
        if (recentNotificationsRef.current.size > 100) {
            const cutoff = now - NOTIFICATION_CONFIG.DEDUPLICATION_WINDOW;
            recentNotificationsRef.current.forEach((timestamp, key) => {
                if (timestamp < cutoff) {
                    recentNotificationsRef.current.delete(key);
                }
            });
        }
    }, []);

    const dismissNotification = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Helper methods for common notifications with built-in deduplication
    const showLevelUp = useCallback((newLevel: number) => {
        addNotification({
            type: "level_up",
            title: "Level Up!",
            description: `Congratulations! You've reached level ${newLevel}!`,
            level: newLevel,
            duration: 6000,
        });
    }, [addNotification]);

    const showLeaguePromotion = useCallback((newLeague: League, previousLeague: League) => {
        addNotification({
            type: "league_promotion",
            title: "League Promotion!",
            description: `You've been promoted to ${newLeague} League!`,
            league: newLeague,
            previousLeague: previousLeague,
            duration: 7000,
        });
    }, [addNotification]);

    const showRewardAvailable = useCallback((rewardName: string, level: number) => {
        addNotification({
            type: "reward_available",
            title: "New Reward Available!",
            description: `You can now claim your level ${level} reward!`,
            rewardName: rewardName,
            level: level,
            duration: 8000,
        });
    }, [addNotification]);

    const showAchievement = useCallback((title: string, description: string) => {
        addNotification({
            type: "achievement",
            title: title,
            description: description,
            duration: 5000,
        });
    }, [addNotification]);

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