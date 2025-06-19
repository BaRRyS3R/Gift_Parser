// src/config/tasks.ts - Конфигурация заданий для легкого редактирования

export interface TaskConfig {
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
    timer_duration?: number; // в секундах для timer типа
}

export type TaskType =
    | "subscribe_channel"
    | "share_link"
    | "post_story"
    | "join_chat"
    | "follow_social"
    | "visit_link";

export type TaskStatus =
    | "available"
    | "in_progress"
    | "completed"
    | "claimed";

// КОНФИГУРАЦИЯ ЗАДАНИЙ - ЛЕГКО РЕДАКТИРУЕМАЯ
export const TASKS_CONFIG: TaskConfig[] = [
    {
        id: "subscribe_thefacets",
        type: "subscribe_channel",
        title: "Подписаться на The Facets",
        description: "Подпишитесь на наш основной Telegram канал @thefacets",
        reward: 5,
        icon: "📢",
        action_url: "https://t.me/thefacets",
        channel_id: "-1002367424339",
        is_repeatable: false,
        validation_type: 'manual'
    },
    {
        id: "subscribe_neuroland_news",
        type: "subscribe_channel",
        title: "Подписаться на новости игры",
        description: "Подпишитесь на канал с новостями и обновлениями игры",
        reward: 3,
        icon: "📰",
        action_url: "https://t.me/neuroland_news",
        channel_id: "-1001234567890",
        is_repeatable: false,
        validation_type: 'manual'
    },
    {
        id: "share_with_friends",
        type: "share_link",
        title: "Поделиться с друзьями",
        description: "Расскажите друзьям об игре через Telegram",
        reward: 3,
        icon: "🔗",
        is_repeatable: false,
        validation_type: 'timer',
        timer_duration: 5
    },
    {
        id: "post_game_story",
        type: "post_story",
        title: "Опубликовать историю",
        description: "Поделитесь игрой в своих Telegram Stories",
        reward: 4,
        icon: "📸",
        is_repeatable: false,
        validation_type: 'timer',
        timer_duration: 5
    },
    {
        id: "join_community_chat",
        type: "join_chat",
        title: "Присоединиться к чату",
        description: "Вступите в чат сообщества игроков",
        reward: 2,
        icon: "💬",
        action_url: "https://t.me/neuroland_chat",
        channel_id: "-1001234567891",
        is_repeatable: false,
        validation_type: 'manual'
    },
    {
        id: "follow_twitter",
        type: "follow_social",
        title: "Подписаться в Twitter",
        description: "Подпишитесь на наш Twitter аккаунт",
        reward: 2,
        icon: "🐦",
        action_url: "https://twitter.com/neuroland_game",
        is_repeatable: false,
        validation_type: 'timer',
        timer_duration: 10
    },
    {
        id: "visit_website",
        type: "visit_link",
        title: "Посетить сайт проекта",
        description: "Изучите официальный сайт проекта",
        reward: 1,
        icon: "🌐",
        action_url: "https://neuroland.game",
        is_repeatable: false,
        validation_type: 'timer',
        timer_duration: 10
    }
];

// Вспомогательные функции
export const getTaskById = (taskId: string): TaskConfig | undefined => {
    return TASKS_CONFIG.find(task => task.id === taskId);
};

export const getTaskByType = (taskType: TaskType): TaskConfig | undefined => {
    return TASKS_CONFIG.find(task => task.type === taskType);
};

export const getAllTasks = (): TaskConfig[] => {
    return [...TASKS_CONFIG];
};

export const getTaskProgress = (userTasks: UserTask[]): {
    completed: number;
    total: number;
    percentage: number;
} => {
    const total = TASKS_CONFIG.length;
    const completed = userTasks.filter(task =>
        task.status === "completed" || task.status === "claimed"
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
};

// Типы для пользовательских заданий
export interface UserTask {
    id: string;
    type: TaskType;
    status: TaskStatus;
    completed_at?: string;
    claimed_at?: string;
    countdown?: number;
}