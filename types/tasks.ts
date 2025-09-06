// src/types/tasks.ts - Updated with differentiated reward system

// Task types enum
export enum TaskType {
  TELEGRAM_CHANNEL = "telegram_channel",
  TELEGRAM_CHAT = "telegram_chat",
  WEBSITE_VISIT = "website_visit",
  TWITTER_FOLLOW = "twitter_follow",
  TWITTER_REPOST = "twitter_repost",
}

// Task status enum
export enum TaskStatus {
  NOT_STARTED = "not_started",
  STARTED = "started",
  COMPLETED = "completed",
  REWARDED = "rewarded",
}

// Reward type enum
export enum RewardType {
  ATTEMPTS = "attempts",
  RESTORE_BONUS = "restore_bonus",
}

// Base task interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  url: string;
  telegram_id?: number;
  attempts_reward: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User task completion interface
export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: TaskStatus;
  started_at?: string;
  completed_at?: string;
  rewarded_at?: string;
  verification_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Combined task with user status
export interface TaskWithStatus {
  task_id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  url: string;
  telegram_id?: number;
  attempts_reward: number;
  image_url?: string;
  user_status: TaskStatus;
  started_at?: string;
  completed_at?: string;
  rewarded_at?: string;
}

// API Request/Response interfaces
export interface StartTaskRequest {
  taskId: string;
}

export interface StartTaskResponse {
  success: boolean;
  task?: TaskWithStatus;
  error?: string;
}

export interface VerifyTaskRequest {
  taskId: string;
  verificationData?: Record<string, any>;
}

export interface VerifyTaskResponse {
  success: boolean;
  verified: boolean;
  task?: TaskWithStatus;
  error?: string;
}

export interface ClaimRewardRequest {
  taskId: string;
}

// UPDATED: Enhanced claim reward response with differentiated rewards
export interface ClaimRewardResponse {
  success: boolean;
  attemptsAdded: number;
  bonusRestoreAdded: number;
  rewardType: 'attempts' | 'restore_bonus';
  newAttemptsTotal: number;
  newBonusRestoreTotal: number;
  task?: TaskWithStatus;
  error?: string;
}

export interface GetTasksResponse {
  success: boolean;
  tasks: TaskWithStatus[];
  categorized?: {
    notStarted: TaskWithStatus[];
    started: TaskWithStatus[];
    completed: TaskWithStatus[];
    rewarded: TaskWithStatus[];
  };
  error?: string;
}

// Telegram verification interfaces
export interface TelegramMembershipCheck {
  taskId: string;
  userId: number;
  chatId: number;
}

export interface TelegramMembershipResponse {
  success: boolean;
  isMember: boolean;
  memberStatus?:
    | "creator"
    | "administrator"
    | "member"
    | "restricted"
    | "left"
    | "kicked";
  error?: string;
}

// Task verification data interfaces
export interface TelegramVerificationData {
  chatId: number;
  userId: number;
  memberStatus: string;
  verifiedAt: string;
}

export interface WebsiteVerificationData {
  visitedAt: string;
  userAgent?: string;
  referrer?: string;
}

export interface TwitterVerificationData {
  verifiedAt: string;
  action: "follow" | "repost";
  username?: string;
  tweetId?: string;
}

// Task category for UI organization
export interface TaskCategory {
  key: "not_started" | "started" | "completed" | "rewarded";
  title: string;
  tasks: TaskWithStatus[];
  count: number;
}

// Task button state interface
export interface TaskButtonState {
  text: string;
  variant: "default" | "secondary" | "success" | "warning";
  disabled: boolean;
  loading: boolean;
  icon?: React.ComponentType<any>;
}

// Task completion statistics
export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalRewardsEarned: number;
  completionRate: number;
}

// Utility type for task filtering
export type TaskFilter = {
  type?: TaskType;
  status?: TaskStatus;
  hasReward?: boolean;
  isActive?: boolean;
};

// Constants for task configuration
export const TASK_CONFIG = {
  VERIFICATION_TIMEOUT: 30000, // 30 seconds
  MAX_VERIFICATION_ATTEMPTS: 3,
  COOLDOWN_PERIODS: {
    [TaskType.TELEGRAM_CHANNEL]: 0,
    [TaskType.TELEGRAM_CHAT]: 0,
    [TaskType.WEBSITE_VISIT]: 5000, // 5 seconds
    [TaskType.TWITTER_FOLLOW]: 10000, // 10 seconds
    [TaskType.TWITTER_REPOST]: 10000, // 10 seconds
  },
} as const;

// Task action types for UI
export type TaskAction = "start" | "verify" | "claim" | "visit";

// Helper type guards
export const isTaskCompleted = (task: TaskWithStatus): boolean => {
  return (
    task.user_status === TaskStatus.COMPLETED ||
    task.user_status === TaskStatus.REWARDED
  );
};

export const isTaskRewarded = (task: TaskWithStatus): boolean => {
  return task.user_status === TaskStatus.REWARDED;
};

export const canStartTask = (task: TaskWithStatus): boolean => {
  return task.user_status === TaskStatus.NOT_STARTED;
};

export const canVerifyTask = (task: TaskWithStatus): boolean => {
  return task.user_status === TaskStatus.STARTED;
};

export const canClaimReward = (task: TaskWithStatus): boolean => {
  return task.user_status === TaskStatus.COMPLETED;
};

// NEW: Helper function to get reward type based on task type
export const getTaskRewardType = (taskType: TaskType): RewardType => {
  if (taskType === TaskType.TELEGRAM_CHANNEL || taskType === TaskType.TELEGRAM_CHAT) {
    return RewardType.RESTORE_BONUS;
  }
  return RewardType.ATTEMPTS;
};

// NEW: Helper function to get reward icon based on reward type
export const getRewardIcon = (rewardType: RewardType): string => {
  switch (rewardType) {
    case RewardType.RESTORE_BONUS:
      return "🔄"; // Cycle icon for restore bonus
    case RewardType.ATTEMPTS:
      return "⚡"; // Lightning for instant attempts
    default:
      return "⚡";
  }
};

// Task type display configuration - UPDATED with reward types
export const TASK_TYPE_CONFIG = {
  [TaskType.TELEGRAM_CHANNEL]: {
    name: "Telegram Channel",
    icon: "📢",
    color: "blue",
    requiresVerification: true,
    actionText: "Subscribe",
    rewardType: RewardType.RESTORE_BONUS,
  },
  [TaskType.TELEGRAM_CHAT]: {
    name: "Telegram Chat",
    icon: "💬",
    color: "blue",
    requiresVerification: true,
    actionText: "Join",
    rewardType: RewardType.RESTORE_BONUS,
  },
  [TaskType.WEBSITE_VISIT]: {
    name: "Website Visit",
    icon: "🌐",
    color: "green",
    requiresVerification: false,
    actionText: "Visit",
    rewardType: RewardType.ATTEMPTS,
  },
  [TaskType.TWITTER_FOLLOW]: {
    name: "Twitter Follow",
    icon: "🐦",
    color: "sky",
    requiresVerification: false,
    actionText: "Follow",
    rewardType: RewardType.ATTEMPTS,
  },
  [TaskType.TWITTER_REPOST]: {
    name: "Twitter Repost",
    icon: "🔄",
    color: "sky",
    requiresVerification: false,
    actionText: "Repost",
    rewardType: RewardType.ATTEMPTS,
  },
} as const;