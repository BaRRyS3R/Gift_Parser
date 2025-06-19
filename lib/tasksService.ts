// src/lib/tasksService.ts - Обновленный сервис для клиентской работы с заданиями

import { TASKS_CONFIG, getTaskById, getAllTasks, getTaskProgress } from "@/config/tasks";
import type { TaskConfig, TaskType, TaskStatus, UserTask } from "@/config/tasks";
import { userService } from "@/lib/supabase";

// Ключи для localStorage
const STORAGE_KEYS = {
    USER_TASKS: 'neuroland_user_tasks',
    TASK_TIMERS: 'neuroland_task_timers'
} as const;

// Интерфейсы для ответов API
export interface TasksResponse {
    success: boolean;
    tasks: UserTask[];
    error?: string;
}

export interface TaskActionResponse {
    success: boolean;
    task_completed?: boolean;
    reward_claimed?: boolean;
    attempts_added?: number;
    error?: string;
}

// Получение пользователя Telegram для идентификации
const getTelegramUserId = (): number => {
    if (typeof window === "undefined") {
        return 0;
    }

    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    // Для разработки возвращаем тестовый ID
    if (process.env.NODE_ENV === "development") {
        return 430743609;
    }

    return 0;
};

// Получение ключа для localStorage конкретного пользователя
const getUserStorageKey = (baseKey: string): string => {
    const userId = getTelegramUserId();
    return `${baseKey}_${userId}`;
};

// Загрузка заданий пользователя из localStorage
const loadUserTasksFromStorage = (): UserTask[] => {
    try {
        const storageKey = getUserStorageKey(STORAGE_KEYS.USER_TASKS);
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Ошибка загрузки заданий из localStorage:", error);
    }

    return [];
};

// Сохранение заданий пользователя в localStorage
const saveUserTasksToStorage = (tasks: UserTask[]): void => {
    try {
        const storageKey = getUserStorageKey(STORAGE_KEYS.USER_TASKS);
        localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (error) {
        console.error("Ошибка сохранения заданий в localStorage:", error);
    }
};

// Инициализация заданий для нового пользователя
const initializeUserTasks = (): UserTask[] => {
    const existingTasks = loadUserTasksFromStorage();
    const allTaskConfigs = getAllTasks();

    // Создаем задания для пользователя на основе конфигурации
    const userTasks: UserTask[] = allTaskConfigs.map(config => {
        // Проверяем есть ли уже это задание у пользователя
        const existingTask = existingTasks.find(task => task.type === config.type);

        if (existingTask) {
            return existingTask;
        }

        // Создаем новое задание
        return {
            id: config.id,
            type: config.type,
            status: "available"
        };
    });

    saveUserTasksToStorage(userTasks);
    return userTasks;
};

// Обновление статуса задания
const updateTaskStatus = (taskType: TaskType, newStatus: TaskStatus, additionalData?: Partial<UserTask>): UserTask[] => {
    const userTasks = loadUserTasksFromStorage();
    const updatedTasks = userTasks.map(task => {
        if (task.type === taskType) {
            const updatedTask = {
                ...task,
                status: newStatus,
                ...additionalData
            };

            // Добавляем timestamp для завершенных заданий
            if (newStatus === "completed" && !task.completed_at) {
                updatedTask.completed_at = new Date().toISOString();
            }

            if (newStatus === "claimed" && !task.claimed_at) {
                updatedTask.claimed_at = new Date().toISOString();
            }

            return updatedTask;
        }
        return task;
    });

    saveUserTasksToStorage(updatedTasks);
    return updatedTasks;
};

// Управление таймерами заданий
const startTaskTimer = (taskType: TaskType, duration: number): void => {
    const timerId = setInterval(() => {
        const userTasks = loadUserTasksFromStorage();
        const task = userTasks.find(t => t.type === taskType);

        if (task && task.countdown !== undefined) {
            if (task.countdown <= 1) {
                // Таймер завершен, отмечаем задание как выполненное
                clearInterval(timerId);
                updateTaskStatus(taskType, "completed");
            } else {
                // Обновляем countdown
                updateTaskStatus(taskType, "in_progress", {
                    countdown: task.countdown - 1
                });
            }
        } else {
            clearInterval(timerId);
        }
    }, 1000);
};

// Основной сервис заданий
export const tasksService = {
    // Получение заданий пользователя
    async getUserTasks(): Promise<TasksResponse> {
        try {
            let userTasks = loadUserTasksFromStorage();

            // Если заданий нет, инициализируем их
            if (userTasks.length === 0) {
                userTasks = initializeUserTasks();
            }

            // Объединяем пользовательские задания с конфигурацией
            const tasksWithConfig = userTasks.map(userTask => {
                const config = getTaskById(userTask.id);
                if (!config) return null;

                return {
                    ...config,
                    status: userTask.status,
                    completed_at: userTask.completed_at,
                    claimed_at: userTask.claimed_at,
                    countdown: userTask.countdown
                };
            }).filter(Boolean);

            return {
                success: true,
                tasks: tasksWithConfig as any[]
            };
        } catch (error) {
            console.error("Ошибка получения заданий:", error);
            return {
                success: false,
                tasks: [],
                error: "Не удалось загрузить задания"
            };
        }
    },

    // Проверка выполнения задания (для manual типа)
    async checkTask(taskType: TaskType): Promise<TaskActionResponse> {
        try {
            const config = getTaskById(taskType);
            if (!config) {
                return {
                    success: false,
                    error: "Задание не найдено"
                };
            }

            const userTasks = loadUserTasksFromStorage();
            const task = userTasks.find(t => t.type === taskType);

            if (!task) {
                return {
                    success: false,
                    error: "Задание пользователя не найдено"
                };
            }

            if (task.status !== "available") {
                return {
                    success: true,
                    task_completed: task.status === "completed" || task.status === "claimed"
                };
            }

            // Для manual типа просто отмечаем как выполненное
            if (config.validation_type === 'manual') {
                updateTaskStatus(taskType, "completed");
                return {
                    success: true,
                    task_completed: true
                };
            }

            return {
                success: true,
                task_completed: false
            };
        } catch (error) {
            console.error("Ошибка проверки задания:", error);
            return {
                success: false,
                error: "Ошибка проверки задания"
            };
        }
    },

    // Начало выполнения задания
    async startTask(taskType: TaskType): Promise<TaskActionResponse> {
        try {
            const config = getTaskById(taskType);
            if (!config) {
                return {
                    success: false,
                    error: "Задание не найдено"
                };
            }

            const userTasks = loadUserTasksFromStorage();
            const task = userTasks.find(t => t.type === taskType);

            if (!task || task.status !== "available") {
                return {
                    success: false,
                    error: "Задание недоступно"
                };
            }

            // Обработка разных типов валидации
            if (config.validation_type === 'timer' && config.timer_duration) {
                // Запускаем таймер
                updateTaskStatus(taskType, "in_progress", {
                    countdown: config.timer_duration
                });
                startTaskTimer(taskType, config.timer_duration);

                return {
                    success: true,
                    task_completed: false
                };
            } else if (config.validation_type === 'manual') {
                // Для manual заданий сразу помечаем как выполненное
                updateTaskStatus(taskType, "completed");
                return {
                    success: true,
                    task_completed: true
                };
            } else {
                // Automatic - сразу выполняем
                updateTaskStatus(taskType, "completed");
                return {
                    success: true,
                    task_completed: true
                };
            }
        } catch (error) {
            console.error("Ошибка начала задания:", error);
            return {
                success: false,
                error: "Ошибка начала задания"
            };
        }
    },

    // Получение награды за задание
    async claimReward(taskType: TaskType): Promise<TaskActionResponse> {
        try {
            const config = getTaskById(taskType);
            if (!config) {
                return {
                    success: false,
                    error: "Задание не найдено"
                };
            }

            const userTasks = loadUserTasksFromStorage();
            const task = userTasks.find(t => t.type === taskType);

            if (!task || task.status !== "completed") {
                return {
                    success: false,
                    error: "Задание не выполнено"
                };
            }

            // Отмечаем награду как полученную
            updateTaskStatus(taskType, "claimed");

            // Добавляем попытки пользователю через userService
            const userId = getTelegramUserId();
            if (userId && userId > 0) {
                try {
                    const user = await userService.findByTelegramId(userId);
                    if (user) {
                        await userService.resetAttempts(userId); // Обновляем попытки
                    }
                } catch (error) {
                    console.error("Ошибка обновления попыток пользователя:", error);
                }
            }

            return {
                success: true,
                reward_claimed: true,
                attempts_added: config.reward
            };
        } catch (error) {
            console.error("Ошибка получения награды:", error);
            return {
                success: false,
                error: "Ошибка получения награды"
            };
        }
    },

    // Сброс всех заданий (для тестирования)
    resetAllTasks(): void {
        const storageKey = getUserStorageKey(STORAGE_KEYS.USER_TASKS);
        localStorage.removeItem(storageKey);
    },

    // Получение прогресса
    getProgress(): { completed: number; total: number; percentage: number } {
        const userTasks = loadUserTasksFromStorage();
        return getTaskProgress(userTasks);
    }
};

// Экспорт утилитарных функций
export { TASKS_CONFIG, getTaskById, getAllTasks, getTaskProgress };