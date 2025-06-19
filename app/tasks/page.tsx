// src/app/tasks/page.tsx - Исправленная страница заданий

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Progress } from "@nextui-org/react";
import { Clock, Gift, ExternalLink, Check, Play } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";
import { userService, supabase } from "@/lib/supabase";
import { TASKS, type Task, type TaskType } from "@/config/tasks";

interface TaskProgress {
  [taskId: string]: {
    status: 'available' | 'in_progress' | 'ready_to_claim' | 'completed';
    startedAt?: number;
    completedAt?: number;
    lastClaimed?: number;
  };
}

const TASK_COMPLETION_DELAY = 10000; // 10 секунд
const STORAGE_KEY = 'task_progress';

export default function TasksPage() {
  const router = useRouter();
  const { user, refreshUser, telegramUser } = useUser();
  const t = useT();

  const [taskProgress, setTaskProgress] = useState<TaskProgress>({});
  const [countdown, setCountdown] = useState<{ [taskId: string]: number }>({});

  // Загрузка прогресса заданий из localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(STORAGE_KEY);
    if (savedProgress) {
      try {
        setTaskProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.error('Error loading task progress:', error);
      }
    }
  }, []);

  // Сохранение прогресса в localStorage
  const saveProgress = (progress: TaskProgress) => {
    setTaskProgress(progress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  };

  // Проверка доступности задания story (кулдаун)
  const isStoryTaskAvailable = (task: Task): boolean => {
    if (task.type !== 'story' || !task.cooldown) return true;
    
    const progress = taskProgress[task.id];
    if (!progress?.lastClaimed) return true;
    
    const timeSinceLastClaim = Date.now() - progress.lastClaimed;
    return timeSinceLastClaim >= task.cooldown;
  };

  // Получение времени до следующего доступного выполнения story
  const getStoryCooldownTime = (task: Task): number => {
    if (task.type !== 'story' || !task.cooldown) return 0;
    
    const progress = taskProgress[task.id];
    if (!progress?.lastClaimed) return 0;
    
    const timeSinceLastClaim = Date.now() - progress.lastClaimed;
    const remaining = task.cooldown - timeSinceLastClaim;
    return Math.max(0, remaining);
  };

  // Таймер обратного отсчета для заданий
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdown: { [taskId: string]: number } = {};
      let hasActiveCountdowns = false;

      Object.entries(taskProgress).forEach(([taskId, progress]) => {
        if (progress.status === 'in_progress' && progress.startedAt) {
          const elapsed = Date.now() - progress.startedAt;
          const remaining = Math.max(0, TASK_COMPLETION_DELAY - elapsed);
          
          if (remaining > 0) {
            newCountdown[taskId] = remaining;
            hasActiveCountdowns = true;
          } else if (remaining === 0) {
            // Задание готово к получению награды
            const updatedProgress = {
              ...taskProgress,
              [taskId]: {
                ...progress,
                status: 'ready_to_claim' as const
              }
            };
            saveProgress(updatedProgress);
          }
        }
      });

      setCountdown(newCountdown);

      if (!hasActiveCountdowns) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [taskProgress]);

  // Метод для обновления попыток пользователя
  const updateUserAttempts = async (reward: number): Promise<void> => {
    if (!telegramUser || !user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          attempts_remaining: user.attempts_remaining + reward,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramUser.id);

      if (error) {
        throw error;
      }

      await refreshUser();
    } catch (error) {
      console.error('Error updating user attempts:', error);
      throw error;
    }
  };

  // Обработка клика по заданию
  const handleTaskClick = async (task: Task) => {
    const currentProgress = taskProgress[task.id];

    // Проверка доступности story задания
    if (task.type === 'story' && !isStoryTaskAvailable(task)) {
      return;
    }

    if (currentProgress?.status === 'ready_to_claim') {
      await handleClaimReward(task);
      return;
    }

    if (currentProgress?.status === 'in_progress' || currentProgress?.status === 'completed') {
      return;
    }

    // Запуск задания
    const updatedProgress = {
      ...taskProgress,
      [task.id]: {
        status: 'in_progress' as const,
        startedAt: Date.now()
      }
    };
    saveProgress(updatedProgress);

    // Открытие ссылки в зависимости от типа задания
    if (task.type === 'story') {
      handleStoryTask(task);
    } else {
      openTaskLink(task);
    }
  };

  // Обработка story задания
  const handleStoryTask = (task: Task) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      if (tg.shareToStory) {
        const storyUrl = `${window.location.origin}${task.url}`;
        tg.shareToStory(storyUrl, {
          text: "🎮 Playing this awesome game!",
          widget_link: {
            url: `https://t.me/your_bot?startapp=${user?.referral_code || ''}`,
            name: "Play Game"
          }
        });
      } else {
        // Fallback для старых версий
        alert("Story sharing is not supported in this version");
      }
    }
  };

  // Открытие ссылки задания
  const openTaskLink = (task: Task) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      if (task.type === 'twitter' || task.type === 'website') {
        tg.openLink(task.url);
      } else {
        tg.openTelegramLink(task.url);
      }
    } else {
      window.open(task.url, '_blank');
    }
  };

  // Получение награды
  const handleClaimReward = async (task: Task) => {
    try {
      // Обновляем количество попыток пользователя
      await updateUserAttempts(task.reward);

      // Обновляем статус задания
      const updatedProgress = {
        ...taskProgress,
        [task.id]: {
          ...taskProgress[task.id],
          status: task.type === 'story' ? 'available' as const : 'completed' as const,
          completedAt: Date.now(),
          lastClaimed: Date.now()
        }
      };
      saveProgress(updatedProgress);

      // Показываем уведомление
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

    } catch (error) {
      console.error('Error claiming task reward:', error);
    }
  };

  // Получение текста кнопки
  const getButtonText = (task: Task): string => {
    const progress = taskProgress[task.id];

    if (task.type === 'story' && !isStoryTaskAvailable(task)) {
      const cooldownTime = getStoryCooldownTime(task);
      const minutes = Math.ceil(cooldownTime / 60000);
      return `Wait ${minutes}m`;
    }

    if (!progress || progress.status === 'available') {
      return "START";
    }

    if (progress.status === 'in_progress') {
      const remaining = countdown[task.id];
      if (remaining) {
        const seconds = Math.ceil(remaining / 1000);
        return `WAIT ${seconds}s`;
      }
      return "CHECKING...";
    }

    if (progress.status === 'ready_to_claim') {
      return "CLAIM";
    }

    if (progress.status === 'completed') {
      return "COMPLETED";
    }

    return "START";
  };

  // Получение состояния кнопки
  const getButtonState = (task: Task) => {
    const progress = taskProgress[task.id];

    if (task.type === 'story' && !isStoryTaskAvailable(task)) {
      return { disabled: true, loading: false, color: 'default' as const };
    }

    if (!progress || progress.status === 'available') {
      return { disabled: false, loading: false, color: 'primary' as const };
    }

    if (progress.status === 'in_progress') {
      return { disabled: true, loading: true, color: 'default' as const };
    }

    if (progress.status === 'ready_to_claim') {
      return { disabled: false, loading: false, color: 'success' as const };
    }

    if (progress.status === 'completed') {
      return { disabled: true, loading: false, color: 'default' as const };
    }

    return { disabled: false, loading: false, color: 'primary' as const };
  };

  // Получение локализованного названия задания с ресурсом
  const getTaskDisplayName = (task: Task): string => {
    const actionMap = {
      'channel': 'Подписаться на канал',
      'chat': 'Присоединиться к чату',
      'twitter': 'Посетить Твиттер',
      'website': 'Посетить сайт',
      'story': 'Сделать сторис'
    };

    const action = actionMap[task.type] || 'Выполнить задание';
    return `${action} ${task.title}`;
  };

  // Получение описания задания
  const getTaskDescription = (task: Task): string => {
    return task.description;
  };

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-4 pt-20 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">TASKS</h1>
          <p className="text-white/60 text-sm">Complete tasks to earn extra attempts</p>
        </div>

        {/* Tasks List */}
        <div className="max-w-2xl mx-auto space-y-4">
          {TASKS.map((task) => {
            const progress = taskProgress[task.id];
            const buttonState = getButtonState(task);
            const isStoryOnCooldown = task.type === 'story' && !isStoryTaskAvailable(task);

            return (
              <Card
                key={task.id}
                className={`bg-gradient-to-r ${task.color} border border-white/20 hover:border-white/30 transition-all duration-200 ${
                  isStoryOnCooldown ? 'opacity-60' : ''
                }`}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div>
                          <h3 className="font-bold text-white">
                            {getTaskDisplayName(task)}
                          </h3>
                          <p className="text-white/70 text-sm">
                            {getTaskDescription(task)}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar for in-progress tasks */}
                      {progress?.status === 'in_progress' && countdown[task.id] && (
                        <div className="mb-3">
                          <Progress
                            value={((TASK_COMPLETION_DELAY - countdown[task.id]) / TASK_COMPLETION_DELAY) * 100}
                            className="h-2"
                            color="primary"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Gift className="text-yellow-400" size={16} />
                          <span className="text-yellow-400 font-bold">
                            +{task.reward} attempts
                          </span>
                        </div>

                        <Button
                          size="sm"
                          color={buttonState.color}
                          isLoading={buttonState.loading}
                          isDisabled={buttonState.disabled}
                          className={`
                            ${buttonState.color === 'success' ? 'bg-green-500 hover:bg-green-600' : ''}
                            ${buttonState.color === 'primary' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                          `}
                          startContent={
                            !buttonState.loading && progress?.status === 'ready_to_claim' ? (
                              <Check size={16} />
                            ) : !buttonState.loading && progress?.status === 'completed' ? (
                              <Check size={16} />
                            ) : !buttonState.loading && !progress ? (
                              <Play size={16} />
                            ) : null
                          }
                          onPress={() => handleTaskClick(task)}
                        >
                          {getButtonText(task)}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}