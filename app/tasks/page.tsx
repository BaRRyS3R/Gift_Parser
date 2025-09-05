// src/app/tasks/page.tsx - Оптимизированная версия с мгновенной загрузкой

"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Globe,
  Zap,
} from "lucide-react";
import { SiTelegram, SiX } from "react-icons/si";

import { useUser } from "@/hooks/useUser";
import { useTasks } from "@/hooks/modules/useTasks";
import {
  TaskWithStatus,
  TaskType,
  TaskStatus,
  canStartTask,
  canClaimReward,
  isTaskRewarded,
} from "@/types/tasks";
import { useT } from "@/contexts/LocalizationContext";
import CatEasterEgg from "@/components/EasterEggs/CatEasterEgg";
import MatreshkaAccordion from "@/components/MatreshkaAccordion";

// Скелетон для карточки задания
function TaskCardSkeleton() {
  return (
    <Card className="bg-gradient-to-r from-white/5 to-white/10">
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-5 h-5 bg-white/10 rounded animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="h-5 bg-white/10 rounded animate-pulse w-32" />
                  <div className="h-4 bg-white/10 rounded animate-pulse w-16" />
                </div>
                <div className="h-4 bg-white/10 rounded animate-pulse w-48 mb-2" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-20" />
              </div>
              <div className="h-8 bg-white/10 rounded animate-pulse w-20" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const { user, refreshUser, makeAuthenticatedRequest } = useUser();
  const t = useT();

  // Use updated tasks hook
  const tasksModule = useTasks(makeAuthenticatedRequest);

  const [isExploding, setIsExploding] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Easter egg state - ONLY Cat Easter Egg on Tasks page
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [showCatEasterEgg, setShowCatEasterEgg] = useState(false);
  const titleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle title clicks for easter egg activation
  const handleTitleClick = () => {
    setTitleClickCount((prev) => {
      const newCount = prev + 1;

      // Clear previous timeout
      if (titleClickTimeoutRef.current) {
        clearTimeout(titleClickTimeoutRef.current);
      }

      // Reset counter after 2 seconds of no clicks
      titleClickTimeoutRef.current = setTimeout(() => {
        setTitleClickCount(0);
      }, 2000);

      // Activate cat easter egg on 3rd click
      if (newCount === 3) {
        setShowCatEasterEgg(true);
        setTitleClickCount(0); // Reset counter

        // Haptic feedback for cat activation
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
          } catch (error) {
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100, 50, 100]); // Multiple vibrations for cat
            }
          }
        }
      }

      return newCount;
    });
  };

  // Close cat easter egg
  const handleCloseCatEasterEgg = () => {
    setShowCatEasterEgg(false);
  };

  // Fetch tasks on mount
  useEffect(() => {
    if (user && !dataLoaded) {
      const fetchData = async () => {
        await tasksModule.fetchTasks();
        setDataLoaded(true);
      };
      fetchData();
    }
  }, [user, dataLoaded]);

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
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleClickTimeoutRef.current) {
        clearTimeout(titleClickTimeoutRef.current);
      }
    };
  }, []);

  const handleTaskAction = async (
    task: TaskWithStatus,
    action: "start" | "retry" | "claim",
  ) => {
    try {
      switch (action) {
        case "start":
          await tasksModule.startTaskWithTimer(task);
          break;

        case "retry":
          await tasksModule.retryVerification(task);
          break;

        case "claim":
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
      console.error("Error in task action:", error);
    }
  };

  const getBackgroundIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.TELEGRAM_CHANNEL:
      case TaskType.TELEGRAM_CHAT:
        return <SiTelegram className="text-white text-[120px] leading-none" />;
      case TaskType.TWITTER_FOLLOW:
      case TaskType.TWITTER_REPOST:
        return <SiX className="text-white text-[120px] leading-none" />;
      case TaskType.WEBSITE_VISIT:
        return <Globe className="text-white" size={120} />;
      default:
        return <Zap className="text-white" size={120} />;
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
    const isLoading =
      tasksModule.isTaskLoading(task.task_id, "start") ||
      tasksModule.isTaskLoading(task.task_id, "verify") ||
      tasksModule.isTaskLoading(task.task_id, "claim");

    // Show timer if running
    if (timer > 0) {
      return {
        text: `${timer}s`,
        action: null,
        variant: "secondary" as const,
        icon: <Clock size={16} />,
        disabled: true,
        loading: false,
      };
    }

    // Task not started
    if (canStartTask(task)) {
      return {
        text: t("tasks.start"),
        action: "start" as const,
        variant: "default" as const,
        icon: <Play size={16} />,
        disabled: isLoading,
        loading: tasksModule.isTaskLoading(task.task_id, "start"),
      };
    }

    // Task started but not completed (for Telegram tasks that failed verification)
    if (task.user_status === TaskStatus.STARTED) {
      const isTelegramTask =
        task.task_type === TaskType.TELEGRAM_CHANNEL ||
        task.task_type === TaskType.TELEGRAM_CHAT;

      if (isTelegramTask) {
        return {
          text: t("tasks.checking"),
          action: "retry" as const,
          variant: "secondary" as const,
          icon: <RotateCcw size={16} />,
          disabled: isLoading,
          loading: tasksModule.isTaskLoading(task.task_id, "verify"),
        };
      }
    }

    // Task completed, ready to claim
    if (canClaimReward(task)) {
      return {
        text: t("tasks.claim"),
        action: "claim" as const,
        variant: "success" as const,
        icon: <Gift size={16} />,
        disabled: isLoading,
        loading: tasksModule.isTaskLoading(task.task_id, "claim"),
      };
    }

    // Task rewarded
    if (isTaskRewarded(task)) {
      return {
        text: t("tasks.completed"),
        action: null,
        variant: "success" as const,
        icon: <CheckCircle size={16} />,
        disabled: true,
        loading: false,
      };
    }

    // Default fallback
    return {
      text: t("tasks.start"),
      action: "start" as const,
      variant: "default" as const,
      icon: <Play size={16} />,
      disabled: true,
      loading: false,
    };
  };

  const getTaskBadge = (task: TaskWithStatus) => {
    if (isTaskRewarded(task)) {
      return { text: t("tasks.completed"), color: "success" };
    }
    if (canClaimReward(task)) {
      return { text: t("tasks.readyToClaim"), color: "warning" };
    }
    if (task.user_status === TaskStatus.STARTED) {
      const timer = tasksModule.getTaskTimer(task.task_id);

      // During timer countdown, show "checking" status, not the timer
      if (timer > 0) {
        return { text: t("tasks.checking"), color: "primary" };
      }

      return { text: t("tasks.checking"), color: "primary" };
    }

    return null;
  };

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

      {/* Header with clickable title for easter egg */}
      <div className="text-center space-y-4 mb-8 pt-6">
        <div
          aria-label="Activate easter egg"
          className="text-4xl font-bold tracking-widest text-white animate-fade-in select-none cursor-default"
          role="button"
          style={{
            WebkitTapHighlightColor: "transparent",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            touchAction: "manipulation",
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTitleClick();
            }
          }}
          onTouchEnd={handleTitleClick}
        >
          <h1 className="m-0 p-0">{t("tasks.title")}</h1>
        </div>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
          {t("tasks.subtitle")}
        </p>
      </div>

      {/* Cat Easter Egg - positioned between header and content */}
      <CatEasterEgg
        isVisible={showCatEasterEgg}
        makeAuthenticatedRequest={makeAuthenticatedRequest}
        onComplete={handleCloseCatEasterEgg}
      />

      {/* Error message */}
      {tasksModule.error && (
        <div className="max-w-2xl mx-auto mb-6 animate-fade-in">
          <Card className="bg-white/10 border border-white/20">
            <CardBody className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-white" size={20} />
                <span className="text-white">{tasksModule.error}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tasks list - показываем контент сразу */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Показываем скелетоны во время первичной загрузки */}
        {!dataLoaded && tasksModule.isLoading ? (
          <>
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <TaskCardSkeleton />
              </div>
            ))}
          </>
        ) : tasksModule.tasks.length > 0 ? (
          // Показываем реальные задания с анимациями
          tasksModule.tasks.map((task, index) => (
            <div key={task.task_id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <TaskCard
                getBackgroundIcon={getBackgroundIcon}
                getTaskBadge={getTaskBadge}
                getTaskButton={getTaskButton}
                getTaskIcon={getTaskIcon}
                t={t}
                task={task}
                onAction={handleTaskAction}
              />
            </div>
          ))
        ) : dataLoaded ? (
          // Empty state только после загрузки данных
          <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">
              {t("tasks.empty.noActiveTasks")}
            </h3>
            <p className="text-white/60 mb-6">
              {t("tasks.empty.startCompleting")}
            </p>
            <Button
              className="border-white/30 text-white"
              variant="bordered"
              onPress={() => {
                setDataLoaded(false);
                tasksModule.fetchTasks().then(() => setDataLoaded(true));
              }}
            >
              {t("tasks.refresh")}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Matreshka Accordion - Bonus Content */}
      <div className="mt-12 mb-8 animate-fade-in">
        <MatreshkaAccordion />
      </div>

      {/* Bottom spacing for safe area */}
      <div className="h-24" />
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithStatus;
  onAction: (task: TaskWithStatus, action: "start" | "retry" | "claim") => void;
  getTaskIcon: (taskType: TaskType) => React.ReactNode;
  getBackgroundIcon: (taskType: TaskType) => React.ReactNode;
  getTaskButton: (task: TaskWithStatus) => any;
  getTaskBadge: (task: TaskWithStatus) => any;
  t: any;
}

function TaskCard({
  task,
  onAction,
  getTaskIcon,
  getBackgroundIcon,
  getTaskButton,
  getTaskBadge,
  t,
}: TaskCardProps) {
  const button = getTaskButton(task);
  const badge = getTaskBadge(task);
  const taskIcon = getTaskIcon(task.task_type as TaskType);
  const backgroundIcon = getBackgroundIcon(task.task_type as TaskType);

  return (
    <Card
      className={`
                relative overflow-hidden
                hover:border-white/30 hover:bg-gradient-to-r hover:from-white/15 hover:to-white/10
                transition-all duration-200
                ${task.image_url ? "" : "bg-gradient-to-r from-white/5 to-white/10"}
            `}
      style={
        task.image_url
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${task.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {!task.image_url && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 opacity-10">
            {backgroundIcon}
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
                      className={`
                                                ${badge.color === "success" ? "bg-green-500/20 text-green-400 border border-green-500/30" : ""}
                                                ${badge.color === "warning" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : ""}
                                                ${badge.color === "primary" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : ""}
                                            `}
                      size="sm"
                      variant="flat"
                    >
                      {badge.text}
                    </Chip>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-2">{task.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="text-yellow-400" size={16} />
                <span className="text-yellow-400 font-bold">
                  +{task.attempts_reward} {t("tasks.reward")}
                </span>
              </div>

              <Button
                className={`
                                    relative z-20 
                                    ${
                                      button.variant === "success"
                                        ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                                        : button.variant === "secondary"
                                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30"
                                          : "bg-white/20 text-white border border-white/40 hover:bg-white/30"
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                isDisabled={button.disabled}
                isLoading={button.loading}
                size="sm"
                startContent={!button.loading ? button.icon : null}
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