// src/lib/tasksService.ts - Сервис для работы с заданиями

import type {
    TaskType,
    Task,
    CheckTaskRequest,
    CheckTaskResponse,
    GetUserTasksRequest,
    GetUserTasksResponse,
    CompleteTaskRequest,
    CompleteTaskResponse,
} from "@/types/tasks";

import { TASKS_CONFIG } from "@/types/tasks";

// URL PHP backend для заданий
const PHP_BACKEND_URL = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;

// Получение initData от Telegram WebApp
const getTelegramInitData = (): string => {
    if (typeof window === "undefined") {
        return "";
    }

    // В продакшене используйте реальные данные от Telegram
    if (window.Telegram?.WebApp?.initData) {
        return window.Telegram.WebApp.initData;
    }

    // Для разработки и тестирования
    if (process.env.NODE_ENV === "development") {
        console.warn("Using mock initData for development");
        return "mock_init_data_for_development";
    }

    return "";
};

// Получение заданий пользователя
const getUserTasks = async (): Promise<GetUserTasksResponse> => {
    try {
        const initData = getTelegramInitData();

        if (!initData) {
            throw new Error("Telegram WebApp data not available");
        }

        const requestData: GetUserTasksRequest = {
            initData
        };

        console.log("Getting user tasks");

        const response = await fetch(`${PHP_BACKEND_URL}/tasks_handler.php?action=get_tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: GetUserTasksResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Failed to get user tasks");
        }

        console.log("User tasks retrieved successfully:", result);

        return result;
    } catch (error) {
        console.error("Error getting user tasks:", error);

        return {
            success: false,
            tasks: [],
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
};

// Проверка выполнения задания
const checkTask = async (taskType: TaskType): Promise<CheckTaskResponse> => {
    try {
        const initData = getTelegramInitData();

        if (!initData) {
            throw new Error("Telegram WebApp data not available");
        }

        const requestData: CheckTaskRequest = {
            initData,
            taskType
        };

        console.log("Checking task:", taskType);

        const response = await fetch(`${PHP_BACKEND_URL}/tasks_handler.php?action=check_task`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: CheckTaskResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Failed to check task");
        }

        console.log("Task check completed:", result);

        return result;
    } catch (error) {
        console.error("Error checking task:", error);

        return {
            success: false,
            task_completed: false,
            reward_claimed: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
};

// Получение награды за задание
const claimReward = async (taskType: TaskType): Promise<CompleteTaskResponse> => {
    try {
        const initData = getTelegramInitData();

        if (!initData) {
            throw new Error("Telegram WebApp data not available");
        }

        const requestData: CompleteTaskRequest = {
            initData,
            taskType
        };

        console.log("Claiming reward for task:", taskType);

        const response = await fetch(`${PHP_BACKEND_URL}/tasks_handler.php?action=claim_reward`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: CompleteTaskResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Failed to claim reward");
        }

        console.log("Reward claimed successfully:", result);

        return result;
    } catch (error) {
        console.error("Error claiming reward:", error);

        return {
            success: false,
            reward_claimed: false,
            attempts_added: 0,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
};

// Утилитарные функции
export const getTaskConfig = (taskType: TaskType) => {
    return TASKS_CONFIG[taskType];
};

export const formatTaskReward = (reward: number): string => {
    return `+${reward} attempts`;
};

// Основной объект сервиса заданий
export const tasksService = {
    getUserTasks,
    checkTask,
    claimReward,
    getTaskConfig,
    formatTaskReward,
};

// Экспорт всех функций
export {
    getUserTasks,
    checkTask,
    claimReward,
    getTelegramInitData,
};