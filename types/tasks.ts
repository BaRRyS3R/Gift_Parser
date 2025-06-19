// src/types/tasks.ts - Типы для системы заданий

export interface Task {
    id: string;
    type: TaskType;
    title: string;
    description: string;
    reward: number; // количество попыток за выполнение
    icon: string;
    action_url?: string; // URL для выполнения (канал, бот и т.д.)
    channel_id?: string; // ID канала для проверки подписки
    is_repeatable: boolean;
    status: TaskStatus;
    completed_at?: string;
}

export type TaskType =
    | "subscribe_channel"
    | "share_link"
    | "post_story";

export type TaskStatus =
    | "available"    // доступно для выполнения
    | "in_progress"  // в процессе выполнения (для заданий с задержкой)
    | "completed"    // выполнено
    | "claimed";     // награда получена

export interface UserTask {
    id: string;
    user_id: string;
    telegram_id: number;
    task_type: TaskType;
    status: TaskStatus;
    completed_at?: string;
    reward_claimed: boolean;
    created_at: string;
    updated_at: string;
}

export interface TaskReward {
    task_type: TaskType;
    attempts_bonus: number;
    claimed: boolean;
}

// Конфигурация заданий
export const TASKS_CONFIG: Record<TaskType, Omit<Task, 'id' | 'status' | 'completed_at'>> = {
    subscribe_channel: {
        type: "subscribe_channel",
        title: "tasks.subscribeChannel.title",
        description: "tasks.subscribeChannel.description",
        reward: 5,
        icon: "📢",
        action_url: "https://t.me/thefacets",
        channel_id: "-1002367424339", // ID канала (с минусом для публичных каналов)
        is_repeatable: false
    },
    share_link: {
        type: "share_link",
        title: "tasks.shareLink.title",
        description: "tasks.shareLink.description",
        reward: 5,
        icon: "🔗",
        is_repeatable: false
    },
    post_story: {
        type: "post_story",
        title: "tasks.postStory.title",
        description: "tasks.postStory.description",
        reward: 5,
        icon: "📸",
        is_repeatable: false
    }
};

// API интерфейсы
export interface CheckTaskRequest {
    initData: string;
    taskType: TaskType;
}

export interface CheckTaskResponse {
    success: boolean;
    task_completed: boolean;
    reward_claimed: boolean;
    attempts_added?: number;
    error?: string;
}

export interface GetUserTasksRequest {
    initData: string;
}

export interface GetUserTasksResponse {
    success: boolean;
    tasks: Task[];
    error?: string;
}

export interface CompleteTaskRequest {
    initData: string;
    taskType: TaskType;
}

export interface CompleteTaskResponse {
    success: boolean;
    reward_claimed: boolean;
    attempts_added: number;
    error?: string;
}

// Утилиты для работы с заданиями
export const getTaskById = (taskType: TaskType): Task => {
    const config = TASKS_CONFIG[taskType];
    return {
        id: taskType,
        ...config,
        status: "available"
    };
};

export const isTaskCompleted = (task: Task): boolean => {
    return task.status === "completed" || task.status === "claimed";
};

export const canClaimReward = (task: Task): boolean => {
    return task.status === "completed";
};

export const getTaskProgress = (tasks: Task[]): {
    completed: number;
    total: number;
    percentage: number;
} => {
    const completed = tasks.filter(task => isTaskCompleted(task)).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
};