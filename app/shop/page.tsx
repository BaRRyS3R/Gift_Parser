// src/app/tasks/page.tsx - Updated with timer-based logic and no task reordering

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    RotateCcw,
    Gift,
    Users,
    Globe,
    Repeat,
    Zap
} from "lucide-react";
import { SiTelegram, SiX } from "react-icons/si";

import { useUser } from "@/hooks/useUser";
import { useTasks } from "@/hooks/modules/useTasks";
import { 
    TaskWithStatus, 
    TaskType, 
    TaskStatus, 
    TASK_TYPE_CONFIG,
    canStartTask,
    canClaimReward,
    isTaskRewarded
} from "@/types/tasks";
import { useT } from "@/contexts/LocalizationContext";

export default function TasksPage() {
    const router = useRouter();
    const { user, refreshUser, makeAuthenticatedRequest } = useUser();
    const t = useT();

    // Use updated tasks hook
    const tasksModule = useTasks(makeAuthenticatedRequest);

    const [isExploding, setIsExploding] = useState(false);

    // Fetch tasks on mount
    useEffect(() => {
        if (user && !tasksModule.isLoading && tasksModule.tasks.length === 0) {
            tasksModule.fetchTasks();
        }
    }, [user]);

    // Clear errors after 4 seconds
    useEffect(() => {
        if (tasksModule.error) {
            const timer = setTimeout(() => {
                tasksModule.clearError();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [tasksModule.error, tasksModule.clearError]);

    // Setup Telegram WebApp back button
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

    const handleTaskAction = async (task: TaskWithStatus, action: 'start' | 'retry' | 'claim') => {
        try {
            switch (action) {
                case 'start':
                    await tasksModule.startTaskWithTimer(task);
                    break;

                case 'retry':
                    await tasksModule.retryVerification(task);
                    break;

                case 'claim':
                    const claimResult = await tasksModule.claimReward(task.task_id);
                    if (claimResult.success) {
                        // Refresh user data to get updated attempts
                        await refreshUser();
                        // Trigger confetti explosion
                        setIsExploding(true);
                        setTimeout(() => {
                            setIsExploding(false);
                        }, 2000);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in task action:', error);
        }
    };

    const getTaskIcon = (taskType: TaskType) => {
        switch (taskType) {
            case TaskType.TELEGRAM_CHANNEL:
                return <SiTelegram size={20} />;
            case TaskType.TELEGRAM_CHAT:
                return <SiTelegram size={20} />;
            case TaskType.WEBSITE_VISIT:
                return <Globe size={20} />;
            case TaskType.TWITTER_FOLLOW:
                return <SiX size={20} />;
            case TaskType.TWITTER_REPOST:
                return <SiX size={20} />;
            default:
                return <Zap size={20} />;
        }
    };

    const getTaskButton = (task: TaskWithStatus) => {
        const timer = tasksModule.getTaskTimer(task.task_id);
        const isLoading = tasksModule.isTaskLoading(task.task_id, 'start') ||
                          tasksModule.isTaskLoading(task.task_id, 'verify') ||
                          tasksModule.isTaskLoading(task.task_id, 'claim');

        // Show timer if running
        if (timer > 0) {
            return {
                text: `${timer}s`,
                action: null,
                variant: 'secondary' as const,
                icon: <Clock size={16} />,
                disabled: true,
                loading: false,
            };
        }

        // Task not started
        if (canStartTask(task)) {
            return {
                text: t('tasks.start'),
                action: 'start' as const,
                variant: 'default' as const,
                icon: <Play size={16} />,
                disabled: isLoading,
                loading: tasksModule.isTaskLoading(task.task_id, 'start'),
            };
        }

        // Task started but not completed (for Telegram tasks that failed verification)
        if (task.user_status === TaskStatus.STARTED) {
            const isTelegramTask = task.task_type === TaskType.TELEGRAM_CHANNEL || 
                                  task.task_type === TaskType.TELEGRAM_CHAT;
            
            if (isTelegramTask) {
                return {
                    text: t('tasks.checking'),
                    action: 'retry' as const,
                    variant: 'secondary' as const,
                    icon: <RotateCcw size={16} />,
                    disabled: isLoading,
                    loading: tasksModule.isTaskLoading(task.task_id, 'verify'),
                };
            }
        }

        // Task completed, ready to claim
        if (canClaimReward(task)) {
            return {
                text: t('tasks.claim'),
                action: 'claim' as const,
                variant: 'success' as const,
                icon: <Gift size={16} />,
                disabled: isLoading,
                loading: tasksModule.isTaskLoading(task.task_id, 'claim'),
            };
        }

        // Task rewarded
        if (isTaskRewarded(task)) {
            return {
                text: t('tasks.completed'),
                action: null,
                variant: 'success' as const,
                icon: <CheckCircle size={16} />,
                disabled: true,
                loading: false,
            };
        }

        // Default fallback
        return {
            text: t('tasks.start'),
            action: 'start' as const,
            variant: 'default' as const,
            icon: <Play size={16} />,
            disabled: true,
            loading: false,
        };
    };

    const getTaskBadge = (task: TaskWithStatus) => {
        if (isTaskRewarded(task)) {
            return { text: t('tasks.completed'), color: 'success' };
        }
        if (canClaimReward(task)) {
            return { text: t('tasks.readyToClaim'), color: 'warning' };
        }
        if (task.user_status === TaskStatus.STARTED) {
            const timer = tasksModule.getTaskTimer(task.task_id);
            // During timer countdown, show "checking" status, not the timer
            if (timer > 0) {
                return { text: t('tasks.checking'), color: 'primary' };
            }
            return { text: t('tasks.checking'), color: 'primary' };
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {isExploding && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <ConfettiExplosion
                        force={0.8}
                        duration={2000}
                        particleCount={100}
                        width={400}
                        colors={['#FFD700', '#FF69B4', '#00BFFF', '#7B68EE', '#FF4500']}
                    />
                </div>
            )}

            {/* Header */}
            <div className="text-center space-y-4 mb-8 pt-6">
                <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
                    {t("tasks.title")}
                </h1>
                <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
                    {t("tasks.subtitle")}
                </p>
            </div>

            {/* Error message */}
            {tasksModule.error && (
                <div className="max-w-2xl mx-auto mb-6">
                    <Card className="bg-white/10 border border-white/20">
                        <CardBody className="p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle size={20} className="text-white" />
                                <span className="text-white">{tasksModule.error}</span>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Loading state */}
            {tasksModule.isLoading && tasksModule.tasks.length === 0 && (
                <div className="max-w-2xl mx-auto text-center py-8">
                    <p className="text-white/60">{t('tasks.loading')}</p>
                </div>
            )}

            {/* Tasks list - single list without categorization */}
            {!tasksModule.isLoading && tasksModule.tasks.length > 0 && (
                <div className="max-w-2xl mx-auto space-y-4">
                    {tasksModule.tasks.map((task) => (
                        <TaskCard
                            key={task.task_id}
                            task={task}
                            onAction={handleTaskAction}
                            getTaskIcon={getTaskIcon}
                            getTaskButton={getTaskButton}
                            getTaskBadge={getTaskBadge}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!tasksModule.isLoading && tasksModule.tasks.length === 0 && (
                <div className="max-w-2xl mx-auto text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold mb-2">{t('tasks.empty.noActiveTasks')}</h3>
                    <p className="text-white/60 mb-6">{t('tasks.empty.startCompleting')}</p>
                    <Button
                        variant="bordered"
                        className="border-white/30 text-white"
                        onPress={() => tasksModule.fetchTasks()}
                    >
                        {t('tasks.refresh')}
                    </Button>
                </div>
            )}

            {/* Bottom spacing for safe area */}
            <div className="h-24" />
        </div>
    );
}

interface TaskCardProps {
    task: TaskWithStatus;
    onAction: (task: TaskWithStatus, action: 'start' | 'retry' | 'claim') => void;
    getTaskIcon: (taskType: TaskType) => React.ReactNode;
    getTaskButton: (task: TaskWithStatus) => any;
    getTaskBadge: (task: TaskWithStatus) => any;
    t: any;
}

function TaskCard({
    task,
    onAction,
    getTaskIcon,
    getTaskButton,
    getTaskBadge,
    t
}: TaskCardProps) {
    const button = getTaskButton(task);
    const badge = getTaskBadge(task);
    const taskIcon = getTaskIcon(task.task_type as TaskType);

    return (
        <Card
            className={`
                relative overflow-hidden
                hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
                transition-all duration-200
                ${task.image_url ? '' : 'bg-gradient-to-r from-white/5 to-white/10'}
            `}
            style={task.image_url ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${task.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : undefined}
        >
            {!task.image_url && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 opacity-10">
                        <div className="text-white text-[120px] leading-none">
                            {TASK_TYPE_CONFIG[task.task_type as TaskType]?.icon || '⭐'}
                        </div>
                    </div>
                </div>
            )}

            <CardBody className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-start space-x-3 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div className="flex items-center space-x-2">
                                        {taskIcon}
                                        <h3 className="font-bold text-white truncate">
                                            {task.title}
                                        </h3>
                                    </div>
                                    {badge && (
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className={`
                                                ${badge.color === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                                                ${badge.color === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                                                ${badge.color === 'primary' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : ''}
                                            `}
                                        >
                                            {badge.text}
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-white/70 text-sm mb-2">
                                    {task.description}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Zap className="text-yellow-400" size={16} />
                                <span className="text-yellow-400 font-bold">
                                    +{task.attempts_reward} {t('tasks.reward')}
                                </span>
                            </div>

                            <Button
                                size="sm"
                                className={`
                                    relative z-20 
                                    ${button.variant === 'success' 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                                        : button.variant === 'secondary'
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30'
                                        : 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                                isLoading={button.loading}
                                isDisabled={button.disabled}
                                startContent={
                                    !button.loading ? button.icon : null
                                }
                                onPress={() => {
                                    if (button.action) {
                                        onAction(task, button.action);
                                    }
                                }}
                            >
                                {button.text}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}