// src/app/tasks/page.tsx - Updated with task sections and reward type badges

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
  Info,
  RotateCcw as RestoreIcon,
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
  getTaskRewardType,
  RewardType,
  TASK_TYPE_CONFIG,
} from "@/types/tasks";
import { useT } from "@/contexts/LocalizationContext";
import CatEasterEgg from "@/components/EasterEggs/CatEasterEgg";
import MatreshkaAccordion from "@/components/MatreshkaAccordion";
import BonusAttemptsInfoModal from "@/components/Tasks/BonusAttemptsInfoModal";

export default function TasksPage() {
  const router = useRouter();
  const { user, refreshUser, makeAuthenticatedRequest } = useUser();
  const t = useT();

  // Use updated tasks hook
  const tasksModule = useTasks(makeAuthenticatedRequest);

  const [isExploding, setIsExploding] = useState(false);
  const [showBonusInfoModal, setShowBonusInfoModal] = useState(false);
  const [lastClaimedReward, setLastClaimedReward] = useState<{
    type: 'attempts' | 'restore_bonus';
    amount: number;
    taskTitle: string;
  } | null>(null);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleClickTimeoutRef.current) {
        clearTimeout(titleClickTimeoutRef.current);
      }
    };
  }, []);

  // NEW: Group tasks by status
  const groupedTasks = React.useMemo(() => {
    const available = tasksModule.tasks.filter(task => 
      task.user_status === TaskStatus.NOT_STARTED || task.user_status === TaskStatus.STARTED
    );
    const readyToClaim = tasksModule.tasks.filter(task => 
      task.user_status === TaskStatus.COMPLETED
    );
    const completed = tasksModule.tasks.filter(task => 
      task.user_status === TaskStatus.REWARDED
    );

    return { available, readyToClaim, completed };
  }, [tasksModule.tasks]);

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
            // Store reward info for success message
            setLastClaimedReward({
              type: claimResult.rewardType || 'attempts',
              amount: claimResult.rewardType === 'restore_bonus' 
                ? claimResult.bonusRestoreAdded || 0 
                : claimResult.attemptsAdded || 0,
              taskTitle: task.title,
            });

            // Refresh user data to get updated attempts/bonus
            await refreshUser();
            
            // Trigger confetti explosion
            setIsExploding(true);
            setTimeout(() => {
              setIsExploding(false);
              setLastClaimedReward(null);
            }, 3000);
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

  // NEW: Get reward badge for display in first row
  const getRewardBadge = (task: TaskWithStatus) => {
    const rewardType = getTaskRewardType(task.task_type as TaskType);
    const isRestoreBonus = rewardType === RewardType.RESTORE_BONUS;
    
    return {
      icon: isRestoreBonus ? <RestoreIcon size={12} /> : <Zap size={12} />,
      text: isRestoreBonus ? t("tasks.badges.restoreBonus") : t("tasks.badges.attempts"),
      className: isRestoreBonus 
        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    };
  };

  // NEW: Render task section
  const renderTaskSection = (title: string, tasks: TaskWithStatus[], sectionKey: string) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            {title}
          </h2>
          <span className="text-white/50 text-sm">
            {tasks.length}
          </span>
        </div>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.task_id}
              getBackgroundIcon={getBackgroundIcon}
              getTaskButton={getTaskButton}
              getTaskIcon={getTaskIcon}
              getRewardBadge={getRewardBadge}
              t={t}
              task={task}
              onAction={handleTaskAction}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset">
      {/* Success message overlay for rewards */}
      {isExploding && lastClaimedReward && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-2xl">
              {lastClaimedReward.type === 'restore_bonus' ? '🔄' : '⚡'}
            </div>
            <div className="bg-black/90 backdrop-blur-xl border border-white/30 px-4 py-2 rounded">
              <p className="text-white font-bold text-sm">
                {lastClaimedReward.type === 'restore_bonus' 
                  ? t("tasks.success.restoreBonusRewardClaimedMessage", { 
                      count: lastClaimedReward.amount, 
                      title: lastClaimedReward.taskTitle 
                    })
                  : t("tasks.success.attemptsRewardClaimedMessage", { 
                      count: lastClaimedReward.amount, 
                      title: lastClaimedReward.taskTitle 
                    })
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confetti explosion */}
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
        <div className="space-y-2">
          <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
            {t("tasks.subtitle")}
          </p>
          {/* NEW: Info button for bonus attempts system */}
          <button
            className="inline-flex items-center space-x-2 text-white/50 hover:text-white/80 transition-colors text-xs"
            onClick={() => setShowBonusInfoModal(true)}
          >
            <Info size={14} />
            <span>{t("tasks.info.learnMoreBonuses")}</span>
          </button>
        </div>
      </div>

      {/* Cat Easter Egg - positioned between header and content */}
      <CatEasterEgg
        isVisible={showCatEasterEgg}
        makeAuthenticatedRequest={makeAuthenticatedRequest}
        onComplete={handleCloseCatEasterEgg}
      />

      {/* Bonus Attempts Info Modal */}
      <BonusAttemptsInfoModal
        isOpen={showBonusInfoModal}
        onClose={() => setShowBonusInfoModal(false)}
      />

      {/* Error message */}
      {tasksModule.error && (
        <div className="max-w-2xl mx-auto mb-6">
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

      {/* Loading state */}
      {tasksModule.isLoading && tasksModule.tasks.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-8">
          <p className="text-white/60">{t("tasks.loading")}</p>
        </div>
      )}

      {/* Tasks sections - NEW: Organized by status */}
      {!tasksModule.isLoading && tasksModule.tasks.length > 0 && (
        <div className="max-w-2xl mx-auto">
          {/* Ready to Claim section (highest priority) */}
          {renderTaskSection(
            t("tasks.sections.readyToClaim"),
            groupedTasks.readyToClaim,
            "readyToClaim"
          )}

          {/* Available Tasks section */}
          {renderTaskSection(
            t("tasks.sections.available"),
            groupedTasks.available,
            "available"
          )}

          {/* Completed Tasks section */}
          {renderTaskSection(
            t("tasks.sections.completed"),
            groupedTasks.completed,
            "completed"
          )}
        </div>
      )}

      {/* Empty state */}
      {!tasksModule.isLoading && tasksModule.tasks.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-12">
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
            onPress={() => tasksModule.fetchTasks()}
          >
            {t("tasks.refresh")}
          </Button>
        </div>
      )}

      {/* Matreshka Accordion - Bonus Content */}
      <div className="mt-12 mb-8">
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
  getRewardBadge: (task: TaskWithStatus) => any; // NEW: Added reward badge prop
  t: any;
}

function TaskCard({
  task,
  onAction,
  getTaskIcon,
  getBackgroundIcon,
  getTaskButton,
  getRewardBadge, // NEW: Added reward badge prop
  t,
}: TaskCardProps) {
  const button = getTaskButton(task);
  const taskIcon = getTaskIcon(task.task_type as TaskType);
  const backgroundIcon = getBackgroundIcon(task.task_type as TaskType);

  // NEW: Get reward badge info
  const rewardBadge = getRewardBadge(task);
  
  // Determine reward type and get task type name
  const rewardType = getTaskRewardType(task.task_type as TaskType);
  const isRestoreBonus = rewardType === RewardType.RESTORE_BONUS;
  const taskTypeConfig = TASK_TYPE_CONFIG[task.task_type as TaskType];

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
            {/* UPDATED: First row with reward type badge */}
            <div className="flex items-center space-x-3 mb-2">
              {taskIcon}
              <h3 className="font-bold text-white truncate flex-1">
                {task.title}
              </h3>
              {/* NEW: Reward type badge */}
              <Chip
                className={rewardBadge.className}
                size="sm"
                startContent={rewardBadge.icon}
                variant="flat"
              >
                {rewardBadge.text}
              </Chip>
              {/* Task type badge */}
              <Chip
                className="bg-white/10 text-white/80 border border-white/20"
                size="sm"
                variant="flat"
              >
                {taskTypeConfig?.name || task.task_type}
              </Chip>
            </div>

            {/* Second row: Task description */}
            <p className="text-white/70 text-sm mb-3">{task.description}</p>

            {/* Third row: Reward amount and Action button */}
            <div className="flex items-center justify-between">
              <div className={`${isRestoreBonus ? "text-blue-400" : "text-yellow-400"} font-bold text-lg`}>
                +{task.attempts_reward}
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