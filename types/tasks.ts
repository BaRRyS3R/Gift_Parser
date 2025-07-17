// src/types/tasks.ts - Types for task system

export type TaskType =
  | "telegram_channel"
  | "telegram_chat"
  | "twitter_follow"
  | "twitter_repost"
  | "visit_website"
  | "telegram_story";

export interface Task {
  id: number;
  type: TaskType;
  title: string;
  description?: string;
  channel_id?: string;
  url: string;
  attempts_reward: number;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserTask {
  id: number;
  user_id: string;
  task_id: number;
  completed_at: string;
  attempts_awarded: number;
  verification_data?: any;
  created_at: string;
}

export interface TaskWithCompletion extends Task {
  is_completed: boolean;
  completed_at?: string;
  attempts_awarded?: number;
}

export interface TaskVerificationRequest {
  taskId: number;
  verificationType: TaskType;
  verificationData?: {
    // Для telegram каналов/чатов
    user_id?: number;
    chat_id?: string;

    // Для twitter
    tweet_id?: string;
    username?: string;

    // Для посещения сайта
    timestamp?: number;
    user_agent?: string;

    // Для telegram stories
    story_id?: string;
  };
}

export interface TaskVerificationResponse {
  success: boolean;
  message: string;
  verified: boolean;
  attempts_awarded?: number;
  error?: string;
}

export interface TaskCompletionRequest {
  taskId: number;
  verificationData?: any;
}

export interface TaskCompletionResponse {
  success: boolean;
  message: string;
  attempts_awarded: number;
  new_attempts_total: number;
  error?: string;
}

export interface TaskListResponse {
  success: boolean;
  tasks: TaskWithCompletion[];
  total: number;
  error?: string;
}

export interface TaskService {
  getTasks: () => Promise<TaskListResponse>;
  completeTask: (
    taskId: number,
    verificationData?: any,
  ) => Promise<TaskCompletionResponse>;
  verifyTask: (
    taskId: number,
    verificationType: TaskType,
    verificationData?: any,
  ) => Promise<TaskVerificationResponse>;
}

// Конфигурация для разных типов заданий
export const TASK_CONFIGS: Record<
  TaskType,
  {
    name: string;
    nameKey: string;
    icon: string;
    color: string;
    description: string;
    descriptionKey: string;
    requiresVerification: boolean;
  }
> = {
  telegram_channel: {
    name: "Telegram Channel",
    nameKey: "tasks.types.telegramChannel",
    icon: "📢",
    color: "text-blue-400",
    description: "Subscribe to Telegram channel",
    descriptionKey: "tasks.types.telegramChannelDesc",
    requiresVerification: true,
  },
  telegram_chat: {
    name: "Telegram Chat",
    nameKey: "tasks.types.telegramChat",
    icon: "💬",
    color: "text-blue-500",
    description: "Join Telegram chat",
    descriptionKey: "tasks.types.telegramChatDesc",
    requiresVerification: true,
  },
  twitter_follow: {
    name: "Twitter Follow",
    nameKey: "tasks.types.twitterFollow",
    icon: "🐦",
    color: "text-sky-400",
    description: "Follow on Twitter",
    descriptionKey: "tasks.types.twitterFollowDesc",
    requiresVerification: true,
  },
  twitter_repost: {
    name: "Twitter Repost",
    nameKey: "tasks.types.twitterRepost",
    icon: "🔄",
    color: "text-sky-500",
    description: "Repost on Twitter",
    descriptionKey: "tasks.types.twitterRepostDesc",
    requiresVerification: true,
  },
  visit_website: {
    name: "Visit Website",
    nameKey: "tasks.types.visitWebsite",
    icon: "🌐",
    color: "text-green-400",
    description: "Visit website",
    descriptionKey: "tasks.types.visitWebsiteDesc",
    requiresVerification: false,
  },
  telegram_story: {
    name: "Telegram Story",
    nameKey: "tasks.types.telegramStory",
    icon: "📸",
    color: "text-purple-400",
    description: "Share in Telegram Stories",
    descriptionKey: "tasks.types.telegramStoryDesc",
    requiresVerification: true,
  },
};

// Типы для статистики заданий
export interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_attempts_earned: number;
  most_popular_task_type: TaskType;
}

// Enum для статусов верификации
export enum VerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  FAILED = "failed",
  EXPIRED = "expired",
}

// Интерфейс для проверки участия в Telegram канале
export interface TelegramMembershipCheck {
  user_id: number;
  chat_id: string;
  status:
    | "member"
    | "administrator"
    | "creator"
    | "restricted"
    | "left"
    | "kicked";
  is_member: boolean;
}

// Утилиты для работы с заданиями
export const isTaskCompleted = (task: TaskWithCompletion): boolean => {
  return task.is_completed === true;
};

export const getTaskRewardText = (reward: number): string => {
  return reward === 1 ? `+${reward} attempt` : `+${reward} attempts`;
};

export const getTaskIcon = (type: TaskType): string => {
  return TASK_CONFIGS[type]?.icon || "📋";
};

export const getTaskColor = (type: TaskType): string => {
  return TASK_CONFIGS[type]?.color || "text-white";
};

export const validateTaskType = (type: string): type is TaskType => {
  return Object.keys(TASK_CONFIGS).includes(type);
};

// Функции для форматирования
export const formatAttemptsReward = (attempts: number): string => {
  return attempts === 1 ? "1 attempt" : `${attempts} attempts`;
};

export const formatTaskDescription = (task: Task): string => {
  const config = TASK_CONFIGS[task.type];

  return task.description || config.description;
};

// Константы для ограничений
export const TASK_LIMITS = {
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TITLE_LENGTH: 255,
  MAX_URL_LENGTH: 500,
  MIN_ATTEMPTS_REWARD: 1,
  MAX_ATTEMPTS_REWARD: 10,
  VERIFICATION_TIMEOUT: 300000, // 5 минут
} as const;
