// src/types/tasks.ts - Типы для системы заданий

export type TaskType =
  | "telegram_channel"
  | "telegram_chat"
  | "twitter_follow"
  | "twitter_repost"
  | "website_visit"
  | "story_share";

export type TaskStatus = "started" | "completed" | "claimed";

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  telegram_id?: number;
  url: string;
  reward_attempts: number;
  color: string;
  is_active: boolean;
  cooldown_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface UserTaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  completed_at?: string;
  claimed_at?: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface TaskWithCompletion extends Task {
  user_completion?: UserTaskCompletion;
  can_complete: boolean;
  next_available_at?: string;
}

export interface TaskProcessingState {
  isStarting?: boolean;
  isChecking?: boolean;
  isClaiming?: boolean;
  countdown?: number;
  error?: string;
}

export interface TelegramMembershipCheckRequest {
  chat_id: number;
  user_id: number;
}

export interface TelegramMembershipCheckResponse {
  is_member: boolean;
  status?: string;
  error?: string;
  user_info?: {
    id: number;
    first_name: string;
    username?: string;
  };
}

export interface TaskRewardResult {
  completion: UserTaskCompletion;
  reward: number;
}

export interface TaskStats {
  total_completed: number;
  total_attempts_earned: number;
  tasks_completed_today: number;
}

// Константы для заданий
export const TASK_COMPLETION_DELAY = 10000; // 10 секунд для проверки на доверии
export const STORY_TASK_COOLDOWN = 120; // 2 часа в минутах

// Маппинг типов заданий к цветам
export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  telegram_channel: "from-blue-500/20 to-cyan-500/20",
  telegram_chat: "from-green-500/20 to-emerald-500/20",
  twitter_follow: "from-sky-500/20 to-blue-500/20",
  twitter_repost: "from-sky-500/20 to-blue-500/20",
  website_visit: "from-orange-500/20 to-red-500/20",
  story_share: "from-yellow-500/20 to-orange-500/20",
};

// Функция для проверки, является ли задание telegram-заданием
export function isTelegramTask(type: TaskType): boolean {
  return type === "telegram_channel" || type === "telegram_chat";
}

// Функция для проверки, требует ли задание автоматической проверки
export function requiresAutomaticVerification(type: TaskType): boolean {
  return isTelegramTask(type);
}

// Функция для получения времени задержки для задания
export function getTaskDelay(type: TaskType): number {
  if (isTelegramTask(type)) {
    return 3000; // 3 секунды для telegram заданий
  }

  return TASK_COMPLETION_DELAY; // 10 секунд для остальных
}

// Функция для форматирования времени кулдауна
export function formatCooldownTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
