// src/components/Notifications/EnhancedProgressNotifications.tsx - Улучшенная система уведомлений

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
    ArrowUp,
    X,
    CheckCircle
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
    duration?: number;
    timestamp: number;
    fingerprint: string;
    priority: number; // Higher numbers = higher priority
}

interface EnhancedProgressNotificationsProps {
    notifications: ProgressNotification[];
    onDismiss: (notificationId: string) => void;
    maxConcurrent?: number;
    autoCloseEnabled?: boolean;
}

// Enhanced configuration with priority system
const NOTIFICATION_CONFIG = {
    MAX_CONCURRENT: 2, // Reduced for better UX
    AUTO_DISMISS_DURATION: 6000, // Increased for readability
    DEDUPLICATION_WINDOW: 15000, // Increased deduplication window
    STAGGER_DELAY: 400, // Slightly increased delay
    PRIORITY_WEIGHTS: {
        league_promotion: 100,
        level_up: 80,
        reward_available: 60,
        achievement: 40,
    },
} as const;

// Persistent storage helper
class NotificationPersistence {
    private static getStorageKey(): string {
        return 'circusle_notifications_seen';
    }

    static getSeenNotifications(): Set<string> {
        if (typeof window === 'undefined') return new Set();

        try {
            const stored = localStorage.getItem(this.getStorageKey());
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    }

    static markNotificationSeen(fingerprint: string): void {
        if (typeof window === 'undefined') return;

        try {
            const seen = this.getSeenNotifications();
            seen.add(fingerprint);

            // Keep only recent fingerprints to prevent storage bloat
            const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
            const filtered = Array.from(seen).filter(fp => {
                const timestamp = fp.split('_')[1];
                return timestamp && parseInt(timestamp) > cutoff;
            });

            localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));
        } catch (error) {
            console.warn('Failed to persist notification state:', error);
        }
    }

    static isNotificationSeen(fingerprint: string): boolean {
        return this.getSeenNotifications().has(fingerprint);
    }
}

const EnhancedProgressNotifications: React.FC<EnhancedProgressNotificationsProps> = ({
    notifications,
    onDismiss,
    maxConcurrent = NOTIFICATION_CONFIG.MAX_CONCURRENT,
    autoCloseEnabled = true
}) => {
    const t = useT();
    const [visibleNotifications, setVisibleNotifications] = useState<ProgressNotification[]>([]);
    const [notificationQueue, setNotificationQueue] = useState<ProgressNotification[]>([]);

    // Enhanced deduplication tracking
    const shownNotificationsRef = useRef<Map<string, number>>(new Map());
    const autoCloseTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Sort notifications by priority
    const sortNotificationsByPriority = useCallback((notifications: ProgressNotification[]) => {
        return [...notifications].sort((a, b) => {
            // First by priority
            const priorityDiff = b.priority - a.priority;
            if (priorityDiff !== 0) return priorityDiff;

            // Then by timestamp (newer first)
            return b.timestamp - a.timestamp;
        });
    }, []);

    // Enhanced notification processing with priority system
    useEffect(() => {
        const processNotificationQueue = () => {
            setNotificationQueue(currentQueue => {
                if (currentQueue.length === 0 || visibleNotifications.length >= maxConcurrent) {
                    return currentQueue;
                }

                // Sort queue by priority
                const sortedQueue = sortNotificationsByPriority(currentQueue);
                const nextNotification = sortedQueue[0];
                const remainingQueue = sortedQueue.slice(1);

                // Check if notification was already seen
                if (NotificationPersistence.isNotificationSeen(nextNotification.fingerprint)) {
                    console.log(`Skipping already seen notification: ${nextNotification.fingerprint}`);
                    return remainingQueue;
                }

                // Check deduplication
                const lastShown = shownNotificationsRef.current.get(nextNotification.fingerprint);
                const now = Date.now();

                if (lastShown && (now - lastShown) < NOTIFICATION_CONFIG.DEDUPLICATION_WINDOW) {
                    console.log(`Skipping duplicate notification: ${nextNotification.fingerprint}`);
                    return remainingQueue;
                }

                // Show the notification
                setVisibleNotifications(prev => [...prev, nextNotification]);
                shownNotificationsRef.current.set(nextNotification.fingerprint, now);

                // Mark as seen in persistent storage
                NotificationPersistence.markNotificationSeen(nextNotification.fingerprint);

                // Setup auto-close timer if enabled
                if (autoCloseEnabled) {
                    const duration = nextNotification.duration || NOTIFICATION_CONFIG.AUTO_DISMISS_DURATION;
                    const timer = setTimeout(() => {
                        handleDismiss(nextNotification.id);
                    }, duration);

                    autoCloseTimersRef.current.set(nextNotification.id, timer);
                }

                return remainingQueue;
            });
        };

        const timeoutId = setTimeout(processNotificationQueue, NOTIFICATION_CONFIG.STAGGER_DELAY);
        return () => clearTimeout(timeoutId);
    }, [visibleNotifications.length, notificationQueue.length, maxConcurrent, sortNotificationsByPriority, autoCloseEnabled]);

    // Process new incoming notifications
    useEffect(() => {
        const newNotifications = notifications.filter(notification => {
            const isAlreadyVisible = visibleNotifications.some(v => v.id === notification.id);
            const isAlreadyQueued = notificationQueue.some(q => q.id === notification.id);

            return !isAlreadyVisible && !isAlreadyQueued;
        });

        if (newNotifications.length > 0) {
            console.log(`Adding ${newNotifications.length} new notifications to queue`);
            setNotificationQueue(prev => [...prev, ...newNotifications]);
        }
    }, [notifications, visibleNotifications, notificationQueue]);

    // Enhanced dismiss handler
    const handleDismiss = useCallback((notificationId: string) => {
        // Clear auto-close timer
        const timer = autoCloseTimersRef.current.get(notificationId);
        if (timer) {
            clearTimeout(timer);
            autoCloseTimersRef.current.delete(notificationId);
        }

        // Remove from visible notifications
        setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));

        // Call parent dismiss handler
        onDismiss(notificationId);
    }, [onDismiss]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            autoCloseTimersRef.current.forEach(timer => clearTimeout(timer));
            autoCloseTimersRef.current.clear();
        };
    }, []);

    // Enhanced icon selection
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

    // Enhanced color scheme
    const getNotificationColors = (notification: ProgressNotification) => {
        switch (notification.type) {
            case "level_up":
                return {
                    background: "bg-blue-500/25",
                    border: "border-blue-400/50",
                    glow: "shadow-blue-500/30",
                };
            case "league_promotion":
                const leagueColors = getLeagueColors(notification.league!);
                return {
                    background: leagueColors.background,
                    border: leagueColors.border,
                    glow: `shadow-${notification.league!.toLowerCase()}-500/30`,
                };
            case "reward_available":
                return {
                    background: "bg-yellow-500/25",
                    border: "border-yellow-400/50",
                    glow: "shadow-yellow-500/30",
                };
            case "achievement":
                return {
                    background: "bg-purple-500/25",
                    border: "border-purple-400/50",
                    glow: "shadow-purple-500/30",
                };
            default:
                return {
                    background: "bg-white/15",
                    border: "border-white/40",
                    glow: "shadow-white/20",
                };
        }
    };

    // Enhanced animations
    const getNotificationAnimation = (index: number) => ({
        initial: {
            opacity: 0,
            x: 320,
            scale: 0.9,
            rotateY: 15
        },
        animate: {
            opacity: 1,
            x: 0,
            scale: 1,
            rotateY: 0,
            y: index * 85
        },
        exit: {
            opacity: 0,
            x: 320,
            scale: 0.9,
            rotateY: -15,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
        },
        transition: {
            type: "spring",
            stiffness: 280,
            damping: 25,
            mass: 0.8,
            layout: { duration: 0.4 }
        }
    });

    return (
        <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
            <AnimatePresence mode="popLayout">
                {visibleNotifications.slice(0, maxConcurrent).map((notification, index) => {
                    const colors = getNotificationColors(notification);
                    const animations = getNotificationAnimation(index);

                    return (
                        <motion.div
                            key={notification.id}
                            layout
                            {...animations}
                            className={`
                                relative overflow-hidden rounded-xl p-4 backdrop-blur-xl
                                ${colors.background} border ${colors.border}
                                shadow-2xl ${colors.glow}
                                cursor-pointer group
                                max-w-xs min-w-[280px]
                            `}
                            onClick={() => handleDismiss(notification.id)}
                            style={{ zIndex: 50 - index }}
                        >
                            {/* Enhanced background effects */}
                            <div className="absolute inset-0 opacity-20">
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        repeatDelay: 4,
                                        ease: "linear"
                                    }}
                                />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex items-start space-x-3">
                                {/* Enhanced icon with animation */}
                                <div className="flex-shrink-0 mt-1">
                                    <motion.div
                                        className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"
                                        initial={{ rotate: 0, scale: 0.8 }}
                                        animate={{
                                            rotate: [0, 5, -5, 0],
                                            scale: [0.8, 1, 1.05, 1]
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            repeat: Infinity,
                                            repeatDelay: 3,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {getNotificationIcon(notification)}
                                    </motion.div>
                                </div>

                                {/* Enhanced text content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-sm mb-1 leading-tight">
                                        {notification.title}
                                    </h3>
                                    <p className="text-white/85 text-xs leading-relaxed">
                                        {notification.description}
                                    </p>

                                    {/* Enhanced type-specific content */}
                                    {notification.type === "level_up" && notification.level && (
                                        <div className="mt-2 flex items-center space-x-2">
                                            <div className="flex items-center space-x-1">
                                                <Sparkles className="text-blue-400" size={12} />
                                                <span className="text-blue-300 text-xs font-bold">
                                                    {t("notifications.level")} {notification.level}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {notification.type === "league_promotion" && notification.league && (
                                        <div className="mt-2 flex items-center space-x-2">
                                            <div className="flex items-center space-x-2">
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
                                        <div className="mt-2 flex items-center space-x-2">
                                            <Gift className="text-yellow-400" size={12} />
                                            <span className="text-yellow-300 text-xs font-bold">
                                                {notification.rewardName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Enhanced dismiss button */}
                                <div className="flex-shrink-0">
                                    <button
                                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 
                                                 flex items-center justify-center transition-all duration-200
                                                 group-hover:bg-white/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDismiss(notification.id);
                                        }}
                                    >
                                        <X size={14} className="text-white/60 group-hover:text-white/80" />
                                    </button>
                                </div>
                            </div>

                            {/* Enhanced progress bar */}
                            {autoCloseEnabled && (
                                <motion.div
                                    className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-full"
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{
                                        duration: (notification.duration || NOTIFICATION_CONFIG.AUTO_DISMISS_DURATION) / 1000,
                                        ease: "linear"
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Enhanced queue indicator */}
            {notificationQueue.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                >
                    <div className="bg-black/70 backdrop-blur-md border border-white/30 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="text-white/60" size={14} />
                            <span className="text-white/70 text-xs font-medium">
                                +{notificationQueue.length} more updates
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default EnhancedProgressNotifications;

// Enhanced hook with priority system and better deduplication
export function useEnhancedProgressNotifications() {
    const [notifications, setNotifications] = useState<ProgressNotification[]>([]);

    const generateFingerprint = (type: string, level?: number, league?: string, rewardName?: string): string => {
        const timestamp = Date.now();
        return `${type}_${timestamp}_${level || ''}_${league || ''}_${rewardName || ''}`;
    };

    const addNotification = useCallback((notification: Omit<ProgressNotification, "id" | "timestamp" | "fingerprint" | "priority">) => {
        const fingerprint = generateFingerprint(notification.type, notification.level, notification.league, notification.rewardName);
        const now = Date.now();

        // Check if we've already shown this type of notification recently
        if (NotificationPersistence.isNotificationSeen(fingerprint)) {
            console.log(`Notification already seen, skipping: ${fingerprint}`);
            return;
        }

        const id = `notification_${now}_${Math.random().toString(36).substr(2, 9)}`;
        const priority = NOTIFICATION_CONFIG.PRIORITY_WEIGHTS[notification.type] || 0;

        const newNotification: ProgressNotification = {
            ...notification,
            id,
            timestamp: now,
            fingerprint,
            priority,
        };

        console.log(`Adding notification with priority ${priority}:`, newNotification);
        setNotifications(prev => [...prev, newNotification]);
    }, []);

    const dismissNotification = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Enhanced notification methods with priority
    const showLevelUp = useCallback((newLevel: number) => {
        addNotification({
            type: "level_up",
            title: "Level Up!",
            description: `Congratulations! You've reached level ${newLevel}!`,
            level: newLevel,
            duration: 7000,
        });
    }, [addNotification]);

    const showLeaguePromotion = useCallback((newLeague: League, previousLeague: League) => {
        addNotification({
            type: "league_promotion",
            title: "League Promotion!",
            description: `You've been promoted to ${newLeague} League!`,
            league: newLeague,
            previousLeague: previousLeague,
            duration: 8000,
        });
    }, [addNotification]);

    const showRewardAvailable = useCallback((rewardName: string, level: number) => {
        addNotification({
            type: "reward_available",
            title: "New Reward Available!",
            description: `You can now claim your level ${level} reward!`,
            rewardName: rewardName,
            level: level,
            duration: 9000,
        });
    }, [addNotification]);

    const showAchievement = useCallback((title: string, description: string) => {
        addNotification({
            type: "achievement",
            title: title,
            description: description,
            duration: 6000,
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