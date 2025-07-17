// src/app/tasks/page.tsx - Fixed version with immediate attempts counter update

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip } from "@nextui-org/react";
import ConfettiExplosion from "react-confetti-explosion";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Users,
  Globe,
  MessageSquare,
  Share2,
  Camera,
  Twitter,
  Loader2,
  Trophy,
  Target,
  Zap,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { authService } from "@/lib/authService";
import { useT } from "@/contexts/LocalizationContext";
import {
  TASK_CONFIGS,
  type TaskWithCompletion,
  type TaskType,
  formatAttemptsReward,
  getTaskIcon,
  getTaskColor,
} from "@/types/tasks";

interface TaskState {
  isLoading: boolean;
  isCompleting: boolean;
  error: string | null;
  completingTask: number | null;
  taskStates: Map<
    number,
    "available" | "link_opened" | "verifying" | "completed"
  >;
}

interface SuccessNotification {
  show: boolean;
  title: string;
  message: string;
  icon: React.ReactNode;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalAttemptsEarned: number;
}

export default function TasksPage() {
  const router = useRouter();
  const { user, refreshUser, isAuthenticated, forceRefreshAttempts } =
    useUser();
  const t = useT();
  const [isExploding, setIsExploding] = useState(false);

  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    totalAttemptsEarned: 0,
  });

  const [taskState, setTaskState] = useState<TaskState>({
    isLoading: true,
    isCompleting: false,
    error: null,
    completingTask: null,
    taskStates: new Map(),
  });

  const [successNotification, setSuccessNotification] =
    useState<SuccessNotification>({
      show: false,
      title: "",
      message: "",
      icon: null,
    });

  // Authentication verification
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Authentication required - redirecting to main page");
      router.push("/");

      return;
    }
  }, [isAuthenticated, router]);

  // Load tasks data
  useEffect(() => {
    const loadTasks = async () => {
      if (!isAuthenticated) {
        console.log("User not authenticated, skipping tasks load");
        setTaskState((prev) => ({ ...prev, isLoading: false }));

        return;
      }

      try {
        setTaskState((prev) => ({ ...prev, isLoading: true, error: null }));
        console.log("Loading tasks via secure API...");

        const response = await fetch("/api/tasks", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Authentication expired during tasks load");
            router.push("/");

            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load tasks");
        }

        setTasks(data.tasks || []);
        setTaskStats(
          data.stats || {
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
            totalAttemptsEarned: 0,
          },
        );

        console.log("Tasks loaded successfully via secure API");
      } catch (error) {
        console.error("Error loading tasks via secure API:", error);

        if (
          error instanceof Error &&
          error.message.includes("Authentication")
        ) {
          console.log("Authentication error during tasks load");
          router.push("/");

          return;
        }

        setTaskState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : t("tasks.failedToLoad"),
        }));
      } finally {
        setTaskState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadTasks();
  }, [isAuthenticated, router, t]);

  // Error message auto-dismiss
  useEffect(() => {
    if (taskState.error) {
      const timer = setTimeout(() => {
        setTaskState((prev) => ({ ...prev, error: null }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [taskState.error]);

  // Telegram WebApp navigation setup
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        router.push("/main");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  const showSuccessNotification = (
    task: TaskWithCompletion,
    attemptsAwarded: number,
  ) => {
    const taskConfig = TASK_CONFIGS[task.type];

    const icon = <CheckCircle className="text-green-400" size={32} />;
    const title = t("tasks.notifications.taskSuccess");
    const plural =
      attemptsAwarded === 1
        ? t("tasks.rewards.attempt")
        : t("tasks.rewards.attempts");
    const message = t("tasks.notifications.taskSuccessMessage", {
      attempts: attemptsAwarded,
      plural: plural,
    });

    setSuccessNotification({
      show: true,
      title,
      message,
      icon,
    });

    setIsExploding(true);
    setTimeout(() => setIsExploding(false), 2000);
    setTimeout(() => {
      setSuccessNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleTaskAction = async (task: TaskWithCompletion) => {
    if (taskState.isCompleting || !isAuthenticated || task.is_completed) {
      return;
    }

    const currentTaskState = taskState.taskStates.get(task.id) || "available";

    if (currentTaskState === "available") {
      // First click - open link and change state
      await openTaskLink(task);

      setTaskState((prev) => ({
        ...prev,
        taskStates: new Map(prev.taskStates.set(task.id, "link_opened")),
      }));
    } else if (currentTaskState === "link_opened") {
      // Second click - verify and complete task
      await verifyAndCompleteTask(task);
    }
  };

  const verifyAndCompleteTask = async (task: TaskWithCompletion) => {
    setTaskState((prev) => ({
      ...prev,
      isCompleting: true,
      error: null,
      completingTask: task.id,
      taskStates: new Map(prev.taskStates.set(task.id, "verifying")),
    }));

    try {
      console.log("Verifying and completing task:", task.id, task.type);

      // For trust-based tasks, complete immediately
      const trustBasedTasks = [
        "visit_website",
        "telegram_story",
        "twitter_follow",
        "twitter_repost",
      ];
      let verificationResult = { success: true, verified: true };

      if (!trustBasedTasks.includes(task.type)) {
        // For telegram channels/chats, perform actual verification
        const response = await fetch("/api/tasks/verify", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId: task.id,
            verificationType: task.type,
            verificationData: {
              timestamp: Date.now(),
              user_agent: navigator.userAgent,
            },
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Authentication expired during task verification");
            router.push("/");

            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        verificationResult = await response.json();
      }

      if (!verificationResult.success || !verificationResult.verified) {
        throw new Error("Task verification failed");
      }

      // Complete the task
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
          verificationData: {
            timestamp: Date.now(),
            user_agent: navigator.userAgent,
            task_type: task.type,
            verification_result: verificationResult,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("Authentication expired during task completion");
          router.push("/");

          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Task completion failed");
      }

      console.log("Task completed successfully:", data);

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                is_completed: true,
                completed_at: new Date().toISOString(),
              }
            : t,
        ),
      );

      // Update task state
      setTaskState((prev) => ({
        ...prev,
        isCompleting: false,
        completingTask: null,
        taskStates: new Map(prev.taskStates.set(task.id, "completed")),
      }));

      // Update stats
      setTaskStats((prev) => ({
        ...prev,
        completedTasks: prev.completedTasks + 1,
        totalAttemptsEarned: prev.totalAttemptsEarned + data.attempts_awarded,
        completionRate:
          prev.totalTasks > 0
            ? ((prev.completedTasks + 1) / prev.totalTasks) * 100
            : 0,
      }));

      // CRITICAL FIX: Comprehensive attempts counter update
      console.log("Tasks: Starting comprehensive attempts counter update...");

      // Step 1: Refresh user data
      await refreshUser();
      console.log("Tasks: User data refreshed");

      // Step 2: Force refresh attempts (bypass cache)
      await forceRefreshAttempts();
      console.log("Tasks: Attempts force refreshed");

      // Step 3: Dispatch custom event for AttemptsDisplay
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("attemptsUpdated"));
        console.log("Tasks: Attempts update event dispatched");
      }

      // Step 4: Small delay to ensure all updates propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("Tasks: Attempts counter update complete");

      // Show success notification
      showSuccessNotification(task, data.attempts_awarded);
    } catch (error) {
      console.error("Task verification/completion error:", error);

      if (error instanceof Error && error.message.includes("Authentication")) {
        console.log("Authentication error during task completion");
        router.push("/");

        return;
      }

      // Reset task state on error
      setTaskState((prev) => ({
        ...prev,
        isCompleting: false,
        completingTask: null,
        taskStates: new Map(prev.taskStates.set(task.id, "available")),
        error:
          error instanceof Error
            ? error.message
            : t("tasks.errors.unknownError"),
      }));
    }
  };

  const openTaskLink = async (task: TaskWithCompletion) => {
    try {
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;

        tg.openLink(task.url);
      } else {
        window.open(task.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening task link:", error);
      window.open(task.url, "_blank");
    }
  };

  const getTaskTypeIcon = (type: TaskType) => {
    const iconMap = {
      telegram_channel: <MessageSquare className="text-blue-400" size={20} />,
      telegram_chat: <Users className="text-blue-500" size={20} />,
      twitter_follow: <Twitter className="text-sky-400" size={20} />,
      twitter_repost: <Share2 className="text-sky-500" size={20} />,
      visit_website: <Globe className="text-green-400" size={20} />,
      telegram_story: <Camera className="text-purple-400" size={20} />,
    };

    return iconMap[type] || <Target className="text-white" size={20} />;
  };

  const getTaskBadge = (task: TaskWithCompletion) => {
    if (task.is_completed) {
      return {
        text: "Completed",
        textKey: "tasks.status.completed",
        color: "success",
      };
    }

    if (task.attempts_reward >= 3) {
      return { text: "Bonus", textKey: "tasks.badges.bonus", color: "warning" };
    }

    return null;
  };

  const isTaskLoading = (taskId: number) => {
    return taskState.completingTask === taskId && taskState.isCompleting;
  };

  const getTaskCurrentState = (task: TaskWithCompletion) => {
    if (task.is_completed) return "completed";

    return taskState.taskStates.get(task.id) || "available";
  };

  const getButtonText = (task: TaskWithCompletion) => {
    const currentState = getTaskCurrentState(task);

    if (currentState === "completed") {
      return t("tasks.buttons.completed");
    }

    if (isTaskLoading(task.id)) {
      if (currentState === "verifying") {
        return t("tasks.buttons.verifying");
      }

      return t("tasks.buttons.completing");
    }

    if (currentState === "link_opened") {
      return t("tasks.buttons.verify");
    }

    return t("tasks.buttons.complete");
  };

  const getButtonIcon = (task: TaskWithCompletion) => {
    const currentState = getTaskCurrentState(task);

    if (currentState === "completed") {
      return <CheckCircle size={16} />;
    }

    if (isTaskLoading(task.id)) {
      return <Loader2 className="animate-spin" size={16} />;
    }

    if (currentState === "link_opened") {
      return <CheckCircle size={16} />;
    }

    return <ExternalLink size={16} />;
  };

  const getTaskInstruction = (task: TaskWithCompletion) => {
    const instructions = {
      telegram_channel: t("tasks.instructions.telegramChannel"),
      telegram_chat: t("tasks.instructions.telegramChat"),
      twitter_follow: t("tasks.instructions.twitterFollow"),
      twitter_repost: t("tasks.instructions.twitterRepost"),
      visit_website: t("tasks.instructions.visitWebsite"),
      telegram_story: t("tasks.instructions.telegramStory"),
    };

    return instructions[task.type] || t("tasks.instructions.general");
  };

  // Render guard for unauthenticated users
  if (!isAuthenticated) {
    return null;
  }

  if (taskState.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("tasks.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {isExploding && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <ConfettiExplosion
            colors={["#FFD700", "#FF69B4", "#00BFFF", "#7B68EE", "#FF4500"]}
            duration={2000}
            force={0.8}
            particleCount={100}
            width={400}
          />
        </div>
      )}

      {/* Header Section */}
      <div className="text-center space-y-4 mb-8 pt-6">
        <h1 className="text-4xl font-bold tracking-widest text-white animate-fade-in">
          {t("tasks.title")}
        </h1>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
          {t("tasks.subtitle")}
        </p>
      </div>

      {/* Stats Section */}
      {taskStats.totalTasks > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg p-3 text-sm">
            <div className="flex items-center space-x-1">
              <Trophy className="text-yellow-400" size={14} />
              <span className="font-bold text-white">
                {taskStats.completedTasks}/{taskStats.totalTasks}
              </span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-1">
              <Zap className="text-green-400" size={14} />
              <span className="font-bold text-white">
                {taskStats.totalAttemptsEarned}
              </span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-1">
              <Target className="text-blue-400" size={14} />
              <span className="font-bold text-white">
                {Math.round(taskStats.completionRate)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {taskState.error && (
        <div className="max-w-2xl mx-auto mb-6">
          <Card className="bg-red-500/10 border border-red-500/20">
            <CardBody className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <span className="text-red-100 text-sm">{taskState.error}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tasks Grid */}
      <div className="max-w-2xl mx-auto space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/30 rounded-lg">
            <Trophy className="text-white/60 mx-auto mb-3" size={32} />
            <p className="font-bold text-white/80">{t("tasks.noTasks")}</p>
            <p className="text-sm mt-1 text-white/60">
              {t("tasks.noTasksDescription")}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              badge={getTaskBadge(task)}
              currentState={getTaskCurrentState(task)}
              getButtonIcon={getButtonIcon}
              getButtonText={getButtonText}
              getTaskInstruction={getTaskInstruction}
              getTaskTypeIcon={getTaskTypeIcon}
              loading={isTaskLoading(task.id)}
              t={t}
              task={task}
              onAction={handleTaskAction}
            />
          ))
        )}
      </div>

      {/* Success Notification */}
      {successNotification.show && (
        <div
          className={`
            fixed top-4 left-4 right-4 z-50
            transform transition-all duration-500 ease-out
            ${successNotification.show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
          `}
        >
          <Card className="bg-gradient-to-r from-green-500/20 to-green-400/15 border border-green-400/30 backdrop-blur-md shadow-2xl">
            <CardBody className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  {successNotification.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-400 text-lg">
                    {successNotification.title}
                  </h4>
                  <p className="text-green-300 text-sm mt-1">
                    {successNotification.message}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Bottom spacing for safe area */}
      <div className="h-24" />
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithCompletion;
  badge: { text: string; textKey: string; color: string } | null;
  loading: boolean;
  currentState: "available" | "link_opened" | "verifying" | "completed";
  onAction: (task: TaskWithCompletion) => void;
  getButtonText: (task: TaskWithCompletion) => string;
  getButtonIcon: (task: TaskWithCompletion) => React.ReactNode;
  getTaskTypeIcon: (type: TaskType) => React.ReactNode;
  getTaskInstruction: (task: TaskWithCompletion) => string;
  t: any;
}

function TaskCard({
  task,
  badge,
  loading,
  currentState,
  onAction,
  getButtonText,
  getButtonIcon,
  getTaskTypeIcon,
  getTaskInstruction,
  t,
}: TaskCardProps) {
  const taskConfig = TASK_CONFIGS[task.type];
  const taskColor = getTaskColor(task.type);

  return (
    <Card
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-white/10 to-white/5 border border-white/20
        hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
        transition-all duration-200
        ${task.is_completed ? "opacity-75" : ""}
        ${loading ? "opacity-80" : ""}
      `}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-5">
          <div className={`text-6xl ${taskColor}`}>
            {getTaskIcon(task.type)}
          </div>
        </div>
      </div>

      <CardBody className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-3 mb-3">
              <div className="mt-1">{getTaskTypeIcon(task.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-bold text-white truncate">
                    {task.title}
                  </h3>
                  {badge && (
                    <Chip
                      className={`
                        ${
                          badge.color === "success"
                            ? "bg-green-500/20 text-green-300 border border-green-400/30"
                            : badge.color === "warning"
                              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/30"
                              : "bg-white/20 text-white border border-white/30"
                        }
                      `}
                      size="sm"
                      variant="flat"
                    >
                      {t(badge.textKey)}
                    </Chip>
                  )}
                </div>
                <p className="text-white/70 text-sm">
                  {task.description ||
                    t(`tasks.types.${task.type.replace("_", "")}Desc`)}
                </p>
                {!task.is_completed && (
                  <p className="text-white/50 text-xs mt-1">
                    {getTaskInstruction(task)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Zap className="text-yellow-400" size={14} />
                  <span className="text-white/80 text-sm font-bold">
                    +{task.attempts_reward}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-white/60 text-xs">
                    {formatAttemptsReward(task.attempts_reward)}
                  </span>
                </div>
              </div>

              <Button
                className={`
                  relative z-20 min-w-[120px]
                  ${
                    currentState === "completed"
                      ? "bg-green-500/20 text-green-300 border border-green-400/30"
                      : currentState === "link_opened"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50"
                        : "bg-white/20 text-white border border-white/40 hover:bg-white/30 hover:border-white/60"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                isDisabled={loading || currentState === "completed"}
                size="sm"
                startContent={getButtonIcon(task)}
                onClick={() => onAction(task)}
              >
                {getButtonText(task)}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
