// src/app/tasks/page.tsx - Обновленная страница заданий с монохромными карточками

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Progress, Chip, Divider } from "@nextui-org/react";
import {
    Check,
    Play,
    AlertCircle,
    CheckCircle2,
    Globe,
    Camera,
    Target
} from "lucide-react";
import { 
    SiTelegram, 
    SiX 
} from "react-icons/si";

import { useT, useLanguage } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";
import { taskService } from "@/lib/supabase_tasks";
import type { TaskWithCompletion, TaskType, TaskProcessingState } from "@/types/tasks";

interface TaskProcessing {
    [taskId: string]: TaskProcessingState;
}

// Mapping task types to their respective icons
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
    const { user, refreshUser, telegramUser } = useUser();
    const t = useT();

    const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<TaskProcessing>({});
    const [error, setError] = useState<string | null>(null);

    // Загрузка заданий
    const loadTasks = async () => {
        if (!user) return;

        try {
            setError(null);
            const tasksData = await taskService.getTasksForUser(user.id);
            setTasks(tasksData);
        } catch (err) {
            console.error('Error loading tasks:', err);
            setError(t('tasks.errors.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, [user]);

    // Таймер для обратного отсчета
    useEffect(() => {
        const interval = setInterval(() => {
            setProcessing(prev => {
                const updated = { ...prev };
                let hasActiveCountdowns = false;

                Object.keys(updated).forEach(taskId => {
                    if (updated[taskId].countdown && updated[taskId].countdown! > 0) {
                        updated[taskId].countdown! -= 1000;
                        hasActiveCountdowns = true;

                        if (updated[taskId].countdown! <= 0) {
                            delete updated[taskId].countdown;
                            // Автоматически проверяем задание после истечения таймера
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

    // Начало выполнения задания
    const handleStartTask = async (task: TaskWithCompletion) => {
        if (!user || !telegramUser) return;

        setProcessing(prev => ({
            ...prev,
            [task.id]: { isStarting: true }
        }));

        try {
            await taskService.startTask(user.id, task.id);

            // Открываем ссылку в зависимости от типа задания
            if (task.type === 'story_share') {
                handleStoryTask(task);
            } else {
                openTaskLink(task);
            }

            // Для telegram заданий сразу проверяем, для остальных ставим таймер
            if (task.type === 'telegram_channel' || task.type === 'telegram_chat') {
                // Небольшая задержка для перехода пользователя
                setTimeout(() => handleCheckTask(task.id), 3000);
            } else if (task.type !== 'story_share') {
                // 10 секунд ожидания для остальных типов
                setProcessing(prev => ({
                    ...prev,
                    [task.id]: { countdown: 10000 }
                }));
            }

            await loadTasks();
        } catch (err) {
            console.error('Error starting task:', err);
            setProcessing(prev => ({
                ...prev,
                [task.id]: { error: t('tasks.errors.unknownError') }
            }));
        }
    };

    // Обработка story задания
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

                // Сразу завершаем story задание
                setTimeout(() => handleCheckTask(task.id), 1000);
            } else {
                setProcessing(prev => ({
                    ...prev,
                    [task.id]: { error: t('tasks.storyTask.notSupported') }
                }));
            }
        }
    };

    // Открытие ссылки задания
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

    // Проверка выполнения задания
    const handleCheckTask = async (taskId: string) => {
        if (!user || !telegramUser) return;

        setProcessing(prev => ({
            ...prev,
            [taskId]: { isChecking: true }
        }));

        try {
            const isCompleted = await taskService.checkTaskCompletion(user.id, taskId, telegramUser.id);

            if (isCompleted) {
                await taskService.completeTask(user.id, taskId);
                await loadTasks();

                setProcessing(prev => ({
                    ...prev,
                    [taskId]: {}
                }));
            } else {
                setProcessing(prev => ({
                    ...prev,
                    [taskId]: { error: t('tasks.errors.notSubscribed') }
                }));
            }
        } catch (err) {
            console.error('Error checking task:', err);
            setProcessing(prev => ({
                ...prev,
                [taskId]: { error: t('tasks.errors.verificationFailed') }
            }));
        }
    };

    // Получение награды
    const handleClaimReward = async (task: TaskWithCompletion) => {
        if (!user || !telegramUser) return;

        setProcessing(prev => ({
            ...prev,
            [task.id]: { isClaiming: true }
        }));

        try {
            const result = await taskService.claimTaskReward(user.id, task.id, telegramUser.id);

            // Показываем уведомление об успехе
            if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }

            await refreshUser();
            await loadTasks();

            setProcessing(prev => ({
                ...prev,
                [task.id]: {}
            }));
        } catch (err) {
            console.error('Error claiming reward:', err);
            setProcessing(prev => ({
                ...prev,
                [task.id]: { error: t('tasks.errors.rewardClaimFailed') }
            }));
        }
    };

    // Получение состояния кнопки
    const getButtonState = (task: TaskWithCompletion) => {
        const proc = processing[task.id];

        if (proc?.isStarting) {
            return { text: t('tasks.start'), disabled: true, loading: true, color: 'primary' as const };
        }

        if (proc?.isChecking) {
            return { text: t('tasks.checking'), disabled: true, loading: true, color: 'primary' as const };
        }

        if (proc?.isClaiming) {
            return { text: t('tasks.claim'), disabled: true, loading: true, color: 'success' as const };
        }

        if (proc?.countdown) {
            const seconds = Math.ceil(proc.countdown / 1000);
            return { text: t('tasks.waitSeconds', { seconds }), disabled: true, loading: false, color: 'default' as const };
        }

        if (proc?.error) {
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

    // Обработка клика по заданию
    const handleTaskClick = async (task: TaskWithCompletion) => {
        const proc = processing[task.id];

        if (proc?.error) {
            // Сбрасываем ошибку и пробуем снова
            setProcessing(prev => ({
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

    // Разделение заданий по категориям
    const storyTasks = tasks.filter(task => task.type === 'story_share');
    const activeTasks = tasks.filter(task =>
        task.type !== 'story_share' &&
        (task.can_complete || (task.user_completion && task.user_completion.status !== 'claimed'))
    );
    const completedTasks = tasks.filter(task =>
        task.type !== 'story_share' &&
        task.user_completion?.status === 'claimed'
    );

    if (loading) {
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
        <div className="min-h-screen bg-black text-white">
            <div className="px-4 pt-20 pb-24">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{t('tasks.title')}</h1>
                    <p className="text-white/60 text-sm">{t('tasks.subtitle')}</p>
                </div>

                {error && (
                    <div className="max-w-2xl mx-auto mb-6">
                        <Card className="bg-white/10 border border-white/20">
                            <CardBody className="p-4">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle size={20} className="text-white" />
                                    <span className="text-white">{error}</span>
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
                                    processing={processing[task.id]}
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
                                        processing={processing[task.id]}
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
                                        processing={processing[task.id]}
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
                    {activeTasks.length === 0 && completedTasks.length === 0 && storyTasks.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-lg font-bold mb-2">{t('tasks.empty.noActiveTasks')}</h3>
                            <p className="text-white/60 text-sm">{t('tasks.empty.startCompleting')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Компонент карточки задания с монохромным дизайном
interface TaskCardProps {
    task: TaskWithCompletion;
    processing?: any;
    onTaskClick: (task: TaskWithCompletion) => void;
    getButtonState: (task: TaskWithCompletion) => any;
    t: any;
    isSpecial?: boolean;
    isCompleted?: boolean;
}

function TaskCard({
    task,
    processing,
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
            {/* Background Pattern with Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Full card pattern with blur */}
                <div className="absolute -top-8 -left-8 w-full h-full transform rotate-12 opacity-10 blur-sm">
                    <div className="grid grid-cols-8 gap-4 w-full h-full">
                        {Array.from({ length: 64 }).map((_, i) => (
                            <TaskIcon key={i} size={24} className="text-white" />
                        ))}
                    </div>
                </div>
            </div>

            <CardBody className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        {/* Header */}
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

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Target className="text-white" size={16} />
                                <span className="text-white font-bold">
                                    +{task.reward_attempts}
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

                        {/* Error message */}
                        {processing?.error && (
                            <div className="mt-2 text-white/80 text-xs bg-white/10 rounded px-2 py-1 border border-white/20">
                                {processing.error}
                            </div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}