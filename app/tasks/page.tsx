// src/app/tasks/page.tsx - Страница заданий

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Progress } from "@nextui-org/react";
import { ArrowLeft, Clock, CheckCircle, Gift, Star } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { tasksService } from "@/lib/tasksService";
import type { Task, TaskType, TaskStatus } from "@/types/tasks";
import { TASKS_CONFIG, getTaskProgress } from "@/types/tasks";
import TaskCard from "@/components/Tasks/TaskCard";
import TaskProgressCard from "@/components/Tasks/TaskProgressCard";

export default function TasksPage() {
    const router = useRouter();
    const { user, refreshUser } = useUser();
    const t = useT();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingTask, setProcessingTask] = useState<TaskType | null>(null);

    useEffect(() => {
        // Setup Telegram WebApp back button
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

    useEffect(() => {
        loadUserTasks();
    }, []);

    const loadUserTasks = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await tasksService.getUserTasks();

            if (response.success) {
                setTasks(response.tasks);
            } else {
                setError(response.error || t("tasks.errors.loadFailed"));
            }
        } catch (err) {
            console.error("Error loading tasks:", err);
            setError(t("tasks.errors.loadFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleTaskAction = async (taskType: TaskType) => {
        if (processingTask || !user) return;

        try {
            setProcessingTask(taskType);
            setError(null);

            const task = tasks.find(t => t.type === taskType);
            if (!task) return;

            if (task.status === "completed") {
                // Claim reward
                const response = await tasksService.claimReward(taskType);

                if (response.success) {
                    // Update task status
                    setTasks(prev => prev.map(t =>
                        t.type === taskType
                            ? { ...t, status: "claimed" as TaskStatus }
                            : t
                    ));

                    // Refresh user data to update attempts
                    await refreshUser();
                } else {
                    setError(response.error || t("tasks.errors.claimFailed"));
                }
            } else if (task.status === "available") {
                // Start task
                if (taskType === "subscribe_channel") {
                    await handleSubscribeChannel();
                } else if (taskType === "share_link") {
                    await handleShareLink();
                } else if (taskType === "post_story") {
                    await handlePostStory();
                }
            }
        } catch (err) {
            console.error("Error processing task:", err);
            setError(t("tasks.errors.checkFailed"));
        } finally {
            setProcessingTask(null);
        }
    };

    const handleSubscribeChannel = async () => {
        const config = TASKS_CONFIG.subscribe_channel;

        // Open channel in Telegram
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(config.action_url!);
        } else {
            window.open(config.action_url, "_blank");
        }

        // Wait a moment then check subscription
        setTimeout(async () => {
            await checkTaskCompletion("subscribe_channel");
        }, 3000);
    };

    const handleShareLink = async () => {
        // Update task status to in_progress
        setTasks(prev => prev.map(t =>
            t.type === "share_link"
                ? { ...t, status: "in_progress" as TaskStatus }
                : t
        ));

        // Generate share link
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/marketaggregator_bot?startapp=share")}&text=${encodeURIComponent("🎮 Check out this awesome game!")}`;

        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, "_blank");
        }

        // Start 5-second countdown
        startTaskCountdown("share_link");
    };

    const handlePostStory = async () => {
        // Update task status to in_progress
        setTasks(prev => prev.map(t =>
            t.type === "post_story"
                ? { ...t, status: "in_progress" as TaskStatus }
                : t
        ));

        // Try to use shareToStory if available
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.shareToStory) {
            try {
                window.Telegram.WebApp.shareToStory("/videos/mainbg.mp4", {
                    text: "🎮 Playing this amazing game!",
                    widget_link: {
                        url: "https://t.me/marketaggregator_bot",
                        name: "Play Game"
                    }
                });
            } catch (err) {
                console.log("shareToStory not available, fallback to manual");
            }
        }

        // Start 5-second countdown
        startTaskCountdown("post_story");
    };

    const startTaskCountdown = (taskType: TaskType) => {
        let countdown = 5;

        const interval = setInterval(() => {
            if (countdown <= 0) {
                clearInterval(interval);
                // Update task status to completed
                setTasks(prev => prev.map(t =>
                    t.type === taskType
                        ? { ...t, status: "completed" as TaskStatus }
                        : t
                ));
            } else {
                // Update countdown in task description or somewhere visible
                setTasks(prev => prev.map(t =>
                    t.type === taskType
                        ? { ...t, countdown }
                        : t
                ));
                countdown--;
            }
        }, 1000);
    };

    const checkTaskCompletion = async (taskType: TaskType) => {
        try {
            const response = await tasksService.checkTask(taskType);

            if (response.success && response.task_completed) {
                // Update task status
                setTasks(prev => prev.map(t =>
                    t.type === taskType
                        ? { ...t, status: "completed" as TaskStatus }
                        : t
                ));
            }
        } catch (err) {
            console.error("Error checking task:", err);
        }
    };

    const progress = getTaskProgress(tasks);
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
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{t("tasks.title")}</h1>
                    <p className="text-white/60 text-sm">{t("tasks.subtitle")}</p>
                </div>

                {/* Progress Card */}
                <TaskProgressCard
                    progress={progress}
                    totalReward={totalReward}
                />

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Tasks List */}
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

                {/* Bottom spacing for safe area */}
                <div className="h-20" />
            </div>
        </div>
    );
}