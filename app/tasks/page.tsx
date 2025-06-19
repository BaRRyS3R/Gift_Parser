// src/app/tasks/page.tsx - Обновленная страница заданий с клиентской логикой

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@nextui-org/react";
import { ArrowLeft, Gift, RefreshCw } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { tasksService } from "@/lib/tasksService";
import type { TaskType } from "@/config/tasks";
import TaskCard from "@/components/Tasks/TaskCard";
import TaskProgressCard from "@/components/Tasks/TaskProgressCard";

interface TaskWithConfig {
    id: string;
    type: TaskType;
    title: string;
    description: string;
    reward: number;
    icon: string;
    action_url?: string;
    channel_id?: string;
    is_repeatable: boolean;
    validation_type: 'manual' | 'automatic' | 'timer';
    timer_duration?: number;
    status: 'available' | 'in_progress' | 'completed' | 'claimed';
    completed_at?: string;
    claimed_at?: string;
    countdown?: number;
}

export default function TasksPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
    const t = useT();

    const [tasks, setTasks] = useState<TaskWithConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingTask, setProcessingTask] = useState<TaskType | null>(null);

    // Настройка кнопки возврата Telegram WebApp
    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.BackButton.show();

            const handleBackClick = () => {
                router.push("/main");
            };

            tg.BackButton.onClick(handleBackClick);

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(handleBackClick);
            };
        }
    }, [router]);

    // Загрузка пользовательских заданий при монтировании компонента
    useEffect(() => {
        loadUserTasks();
    }, []);

    // Обновление заданий с таймерами каждую секунду
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prevTasks => {
                const hasActiveTimers = prevTasks.some(task =>
                    task.status === "in_progress" && task.countdown !== undefined
                );

                if (hasActiveTimers) {
                    loadUserTasks();
                }

                return prevTasks;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const loadUserTasks = useCallback(async () => {
        try {
            setError(null);
            const response = await tasksService.getUserTasks();

            if (response.success) {
                setTasks(response.tasks as TaskWithConfig[]);
            } else {
                setError(response.error || t("tasks.errors.loadFailed"));
            }
        } catch (err) {
            console.error("Ошибка загрузки заданий:", err);
            setError(t("tasks.errors.loadFailed"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const handleTaskAction = async (taskType: TaskType) => {
        if (processingTask || !user) return;

        try {
            setProcessingTask(taskType);
            setError(null);

            const task = tasks.find(t => t.type === taskType);
            if (!task) return;

            if (task.status === "completed") {
                // Получение награды за выполненное задание
                const response = await tasksService.claimReward(taskType);

                if (response.success) {
                    await refreshUser();
                    await loadUserTasks();

                    // Показать уведомление об успешном получении награды
                    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
                    }
                } else {
                    setError(response.error || t("tasks.errors.claimFailed"));
                }
            } else if (task.status === "available") {
                // Начало выполнения задания
                await handleTaskStart(task);
            }
        } catch (err) {
            console.error("Ошибка обработки задания:", err);
            setError(t("tasks.errors.checkFailed"));
        } finally {
            setProcessingTask(null);
        }
    };

    const handleTaskStart = async (task: TaskWithConfig) => {
        const { type: taskType, action_url, validation_type } = task;

        // Открытие внешних ссылок для определенных типов заданий
        if (action_url) {
            if (taskType === "subscribe_channel") {
                await handleSubscribeChannel(action_url);
            } else {
                await handleExternalAction(action_url);
            }
        } else if (taskType === "share_link") {
            await handleShareLink();
        } else if (taskType === "post_story") {
            await handlePostStory();
        }

        // Запуск логики выполнения задания
        const response = await tasksService.startTask(taskType);

        if (response.success) {
            await loadUserTasks();
        } else {
            setError(response.error || t("tasks.errors.checkFailed"));
        }
    };

    const handleSubscribeChannel = async (channelUrl: string) => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(channelUrl);
        } else {
            window.open(channelUrl, "_blank");
        }
    };

    const handleExternalAction = async (url: string) => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.openLink(url);
        } else {
            window.open(url, "_blank");
        }
    };

    const handleShareLink = async () => {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/marketaggregator_bot?startapp=share")}&text=${encodeURIComponent("🎮 Попробуйте эту потрясающую игру!")}`;

        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, "_blank");
        }
    };

    const handlePostStory = async () => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.shareToStory) {
            try {
                window.Telegram.WebApp.shareToStory("/videos/mainbg.mp4", {
                    text: "🎮 Играю в эту потрясающую игру!",
                    widget_link: {
                        url: "https://t.me/marketaggregator_bot",
                        name: "Играть"
                    }
                });
            } catch (err) {
                console.log("shareToStory недоступен, используем fallback");
                // Fallback для устройств без поддержки Stories
                await handleShareLink();
            }
        } else {
            // Fallback для старых версий Telegram
            await handleShareLink();
        }
    };

    const progress = tasksService.getProgress();
    const totalReward = tasks.reduce((sum, task) => sum + task.reward, 0);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white">{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="px-4 pt-20 pb-8">
                {/* Заголовок страницы */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{t("tasks.title")}</h1>
                    <p className="text-white/60 text-sm">{t("tasks.subtitle")}</p>
                </div>

                {/* Карточка прогресса выполнения заданий */}
                <TaskProgressCard
                    progress={progress}
                    totalReward={totalReward}
                />

                {/* Отображение сообщений об ошибках */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                            <p className="text-red-400 text-sm">{error}</p>
                            <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => setError(null)}
                            >
                                {t("common.close")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Кнопка обновления заданий */}
                <div className="mb-6 flex justify-center">
                    <Button
                        variant="bordered"
                        size="sm"
                        startContent={<RefreshCw size={16} />}
                        onPress={loadUserTasks}
                        isLoading={isLoading}
                    >
                        Обновить задания
                    </Button>
                </div>

                {/* Список заданий */}
                <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <Card className="bg-white/5 border border-white/20">
                            <CardBody className="text-center py-8">
                                <Gift className="text-white/40 mx-auto mb-3" size={32} />
                                <p className="text-white/60 text-sm">{t("tasks.noTasks")}</p>
                            </CardBody>
                        </Card>
                    ) : (
                        tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                isProcessing={processingTask === task.type}
                                onAction={() => handleTaskAction(task.type)}
                            />
                        ))
                    )}
                </div>

                {/* Отступ снизу для безопасной области */}
                <div className="h-20" />
            </div>
        </div>
    );
}