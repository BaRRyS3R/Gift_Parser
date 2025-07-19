// src/app/tasks/page.tsx - Обновленная страница задач с использованием новых API роутов

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip, Divider } from "@nextui-org/react";
import {
    Check,
    Play,
    AlertCircle,
    CheckCircle2,
    Globe,
    Camera
} from "lucide-react";
import {
    SiTelegram,
    SiX
} from "react-icons/si";

import { useT } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";
import { useTasks } from "@/hooks/modules/useTasks";
import type { TaskWithCompletion, TaskType } from '@/lib/server/tasksService';

interface TaskProcessingState {
    countdown?: number;
    error?: string;
}

interface TaskProcessing {
    [taskId: string]: TaskProcessingState;
}

const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
        case 'telegram_channel':
        case 'telegram_chat':
            return SiTelegram;
        case 'twitter_follow':
        case 'twitter_repost':
            return SiX;
        case 'website_visit':
            return Globe;
        case 'story_share':
            return Camera;
        default:
            return Globe;
    }
};

export default function TasksPage() {
    const router = useRouter();
    const { user, refreshUser, telegramUser, makeAuthenticatedRequest } = useUser();
    const t = useT();

    // Use new tasks hook
    const tasksModule = useTasks(makeAuthenticatedRequest);

    const [localProcessing, setLocalProcessing] = useState<TaskProcessing>({});

    // Load tasks on component mount
    useEffect(() => {
        if (user) {
            tasksModule.fetchTasks();
        }
    }, [user, tasksModule.fetchTasks]);

    // Countdown timer for task processing
    useEffect(() => {
        const interval = setInterval(() => {
            setLocalProcessing(prev => {
                const updated = { ...prev };
                let hasActiveCountdowns = false;

                Object.keys(updated).forEach(taskId => {
                    if (updated[taskId].countdown && updated[taskId].countdown! > 0) {
                        updated[taskId].countdown! -= 1000;
                        hasActiveCountdowns = true;

                        if (updated[taskId].countdown! <= 0) {
                            delete updated[taskId].countdown;
                            handleCheckTask(taskId);
                        }
                    }
                });

                return hasActiveCountdowns ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

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

    const handleStartTask = async (task: TaskWithCompletion) => {
        if (!user || !telegramUser) return;

        try {
            const result = await tasksModule.startTask(task.id);
            if (!result) return;

            if (task.type === 'story_share') {
                handleStoryTask(task);
            } else {
                openTaskLink(task);
            }

            if (task.type === 'telegram_channel' || task.type === 'telegram_chat') {
                setTimeout(() => handleCheckTask(task.id), 3000);
            } else if (task.type !== 'story_share') {
                setLocalProcessing(prev => ({
                    ...prev,
                    [task.id]: { countdown: 10000 }
                }));
            }

            // Refresh tasks list
            await tasksModule.fetchTasks();
        } catch (err) {
            console.error('Error starting task:', err);
        }
    };

    const handleStoryTask = (task: TaskWithCompletion) => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            if (tg.shareToStory) {
                const storyUrl = `${window.location.origin}${task.url}`;
                tg.shareToStory(storyUrl, {
                    text: "Попробуйте эту игру на реакцию!",
                    widget_link: {
                        url: `https://t.me/marketaggregator_bot?startapp=${user?.referral_code || ''}`,
                        name: "Играть"
                    }
                });

                setTimeout(() => handleCheckTask(task.id), 1000);
            } else {
                setLocalProcessing(prev => ({
                    ...prev,
                    [task.id]: { error: t('tasks.storyTask.notSupported') }
                }));
            }
        }
    };

    const openTaskLink = (task: TaskWithCompletion) => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            if (task.type === 'twitter_follow' || task.type === 'twitter_repost' || task.type === 'website_visit') {
                tg.openLink(task.url);
            } else {
                tg.openTelegramLink(task.url);
            }
        } else {
            window.open(task.url, '_blank');
        }
    };

    const handleCheckTask = async (taskId: string) => {
        if (!user || !telegramUser) return;

        try {
            const isCompleted = await tasksModule.checkTask(taskId);

            if (isCompleted) {
                const result = await tasksModule.completeTask(taskId);
                if (result) {
                    await tasksModule.fetchTasks();
                }
            }
        } catch (err) {
            console.error('Error checking task:', err);
        }
    };

    const handleClaimReward = async (task: TaskWithCompletion) => {
        if (!user || !telegramUser) return;

        try {
            const result = await tasksModule.claimTaskReward(task.id);
            if (!result) return;

            if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }

            await refreshUser();
            await tasksModule.fetchTasks();
        } catch (err) {
            console.error('Error claiming reward:', err);
        }
    };

    const getButtonState = (task: TaskWithCompletion) => {
        const apiProcessing = tasksModule.processing[task.id];
        const localProc = localProcessing[task.id];

        if (apiProcessing?.isStarting) {
            return { text: t('tasks.start'), disabled: true, loading: true, color: 'primary' as const };
        }

        if (apiProcessing?.isChecking) {
            return { text: t('tasks.checking'), disabled: true, loading: true, color: 'primary' as const };
        }

        if (apiProcessing?.isClaiming) {
            return { text: t('tasks.claim'), disabled: true, loading: true, color: 'success' as const };
        }

        if (localProc?.countdown) {
            const seconds = Math.ceil(localProc.countdown / 1000);
            return { text: t('tasks.waitSeconds', { seconds }), disabled: true, loading: false, color: 'default' as const };
        }

        if (apiProcessing?.error || localProc?.error) {
            return { text: t('tasks.start'), disabled: false, loading: false, color: 'danger' as const };
        }

        if (!task.can_complete) {
            if (task.next_available_at) {
                const nextAvailable = new Date(task.next_available_at);
                const now = new Date();
                const diffMs = nextAvailable.getTime() - now.getTime();
                const diffMinutes = Math.ceil(diffMs / 60000);
                return { text: t('tasks.waitMinutes', { minutes: diffMinutes }), disabled: true, loading: false, color: 'default' as const };
            }
            return { text: t('tasks.completed'), disabled: true, loading: false, color: 'default' as const };
        }

        if (!task.user_completion) {
            return { text: t('tasks.start'), disabled: false, loading: false, color: 'primary' as const };
        }

        if (task.user_completion.status === 'started') {
            return { text: t('tasks.checking'), disabled: false, loading: false, color: 'primary' as const };
        }

        if (task.user_completion.status === 'completed') {
            return { text: t('tasks.claim'), disabled: false, loading: false, color: 'success' as const };
        }

        return { text: t('tasks.start'), disabled: false, loading: false, color: 'primary' as const };
    };

    const handleTaskClick = async (task: TaskWithCompletion) => {
        const apiProcessing = tasksModule.processing[task.id];
        const localProc = localProcessing[task.id];

        if (apiProcessing?.error || localProc?.error) {
            tasksModule.clearTaskError(task.id);
            setLocalProcessing(prev => ({
                ...prev,
                [task.id]: {}
            }));
            return;
        }

        if (!task.user_completion) {
            await handleStartTask(task);
        } else if (task.user_completion.status === 'started') {
            await handleCheckTask(task.id);
        } else if (task.user_completion.status === 'completed') {
            await handleClaimReward(task);
        }
    };

    // Organize tasks by type
    const tasks = tasksModule.tasks || [];
    const storyTasks = tasks.filter(task => task.type === 'story_share');
    const activeTasks = tasks.filter(task =>
        task.type !== 'story_share' &&
        (task.can_complete || (task.user_completion && task.user_completion.status !== 'claimed'))
    );
    const completedTasks = tasks.filter(task =>
        task.type !== 'story_share' &&
        task.user_completion?.status === 'claimed'
    );

    if (tasksModule.isLoading && !tasks.length) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/60">{t("tasks.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
            {/* Header */}
            <div className="text-center space-y-4 mb-8 pt-6">
                <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
                    {t("tasks.title")}
                </h1>
                <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
                    {t("tasks.subtitle")}
                </p>
            </div>

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

            <div className="max-w-2xl mx-auto space-y-8">
                {/* Story Task Section */}
                {storyTasks.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 text-white">
                            {t('tasks.sections.story')}
                        </h2>
                        {storyTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                processing={tasksModule.processing[task.id]}
                                localProcessing={localProcessing[task.id]}
                                onTaskClick={handleTaskClick}
                                getButtonState={getButtonState}
                                t={t}
                                isSpecial={true}
                            />
                        ))}
                    </div>
                )}

                {/* Active Tasks Section */}
                {activeTasks.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4">
                            {t('tasks.sections.active')}
                        </h2>
                        <div className="space-y-4">
                            {activeTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    processing={tasksModule.processing[task.id]}
                                    localProcessing={localProcessing[task.id]}
                                    onTaskClick={handleTaskClick}
                                    getButtonState={getButtonState}
                                    t={t}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Tasks Section */}
                {completedTasks.length > 0 && (
                    <div>
                        <Divider className="bg-white/10 mb-4" />
                        <h2 className="text-lg font-bold mb-4 text-white">
                            {t('tasks.sections.completed')}
                        </h2>
                        <div className="space-y-4">
                            {completedTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    processing={tasksModule.processing[task.id]}
                                    localProcessing={localProcessing[task.id]}
                                    onTaskClick={handleTaskClick}
                                    getButtonState={getButtonState}
                                    t={t}
                                    isCompleted={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {activeTasks.length === 0 && completedTasks.length === 0 && storyTasks.length === 0 && !tasksModule.isLoading && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-lg font-bold mb-2">{t('tasks.empty.noActiveTasks')}</h3>
                        <p className="text-white/60 text-sm">{t('tasks.empty.startCompleting')}</p>
                    </div>
                )}
            </div>

            {/* Bottom spacing for safe area */}
            <div className="h-24" />
        </div>
    );
}

interface TaskCardProps {
    task: TaskWithCompletion;
    processing?: any;
    localProcessing?: TaskProcessingState;
    onTaskClick: (task: TaskWithCompletion) => void;
    getButtonState: (task: TaskWithCompletion) => any;
    t: any;
    isSpecial?: boolean;
    isCompleted?: boolean;
}

function TaskCard({
    task,
    processing,
    localProcessing,
    onTaskClick,
    getButtonState,
    t,
    isSpecial = false,
    isCompleted = false
}: TaskCardProps) {
    const buttonState = getButtonState(task);
    const TaskIcon = getTaskIcon(task.type);

    return (
        <Card
            className={`
                relative overflow-hidden
                ${isSpecial
                    ? 'bg-gradient-to-r from-white/20 to-white/15 border-2 border-white/40'
                    : 'bg-gradient-to-r from-white/10 to-white/5 border border-white/20'
                } 
                hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
                transition-all duration-200
                ${isCompleted ? 'opacity-75' : ''}
            `}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
                    <TaskIcon size={120} className="text-white" />
                </div>
            </div>

            <CardBody className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0">
                                <TaskIcon size={24} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-bold text-white truncate">
                                        {task.name}
                                    </h3>
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        className="bg-white/20 text-white border border-white/30"
                                    >
                                        {t(`tasks.types.${task.type}`)}
                                    </Chip>
                                </div>
                                <p className="text-white/70 text-sm">
                                    {t(`tasks.descriptions.${task.type}`)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-white font-bold">
                                    ⚡ +{task.reward_attempts}
                                </span>
                                {isCompleted && (
                                    <CheckCircle2 className="text-white ml-2" size={16} />
                                )}
                            </div>

                            {!isCompleted && (
                                <Button
                                    size="sm"
                                    className={`
                                        relative z-20
                                        ${buttonState.color === 'success'
                                            ? 'bg-white text-black hover:bg-white/90'
                                            : buttonState.color === 'primary'
                                                ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                                                : buttonState.color === 'danger'
                                                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                                    : 'bg-white/10 text-white/60 border border-white/20'
                                        }
                                        ${buttonState.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                    isLoading={buttonState.loading}
                                    isDisabled={buttonState.disabled}
                                    startContent={
                                        !buttonState.loading && buttonState.color === 'success' ? (
                                            <Check size={16} />
                                        ) : !buttonState.loading && buttonState.color !== 'danger' ? (
                                            <Play size={16} />
                                        ) : null
                                    }
                                    onPress={() => onTaskClick(task)}
                                >
                                    {buttonState.text}
                                </Button>
                            )}
                        </div>

                        {(processing?.error || localProcessing?.error) && (
                            <div className="mt-2 text-white/80 text-xs bg-white/10 rounded px-2 py-1 border border-white/20">
                                {processing?.error || localProcessing?.error}
                            </div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}