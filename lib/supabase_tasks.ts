// src/lib/supabase_tasks.ts - Исправленная версия без циклических вызовов API
import { supabase } from "./supabase";

export type TaskType =
    | 'telegram_channel'
    | 'telegram_chat'
    | 'twitter_follow'
    | 'twitter_repost'
    | 'website_visit'
    | 'story_share';

export type TaskStatus = 'started' | 'completed' | 'claimed';

export interface Task {
    id: string;
    name: string;
    type: TaskType;
    telegram_id?: number;
    url: string;
    reward_attempts: number;
    icon: string;
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

// Вспомогательная функция для получения токена авторизации
const getAuthToken = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_access_token') || '';
    }
    return '';
};

export const taskService = {
    // Получение всех активных заданий
    async getActiveTasks(): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }

        return data || [];
    },

    // ИСПРАВЛЕНО: Получение заданий с информацией о выполнении для пользователя - БЕЗ API вызовов
    async getTasksForUser(userId: string): Promise<TaskWithCompletion[]> {
        console.log('=== TASK SERVICE: getTasksForUser via direct DB ===');
        console.log('User ID:', userId);

        try {
            // Получаем все активные задания
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (tasksError) {
                console.error('Error fetching tasks:', tasksError);
                throw new Error('Failed to fetch tasks');
            }

            // Получаем завершения пользователя
            const { data: completions, error: completionsError } = await supabase
                .from('user_task_completions')
                .select('*')
                .eq('user_id', userId);

            if (completionsError) {
                console.error('Error fetching completions:', completionsError);
                throw new Error('Failed to fetch task completions');
            }

            // Объединяем задания с информацией о выполнении
            const tasksWithCompletion: TaskWithCompletion[] = (tasks || []).map(task => {
                const completion = completions?.find(c => c.task_id === task.id);
                const canComplete = this.canTaskBeCompleted(task, completion);
                const nextAvailable = this.getNextAvailableTime(task, completion);

                return {
                    ...task,
                    user_completion: completion,
                    can_complete: canComplete,
                    next_available_at: nextAvailable
                };
            });

            console.log('Tasks fetched via direct DB:', tasksWithCompletion.length);
            console.log('=== TASK SERVICE: getTasksForUser END ===');

            return tasksWithCompletion;

        } catch (error) {
            console.error('Error fetching tasks via direct DB:', error);
            throw error;
        }
    },

    // Вспомогательный метод для проверки возможности выполнения задания
    canTaskBeCompleted(task: Task, completion?: UserTaskCompletion): boolean {
        // Если задание уже получено, то его нельзя выполнить повторно
        if (completion && completion.status === 'claimed') {
            return false;
        }

        // Проверяем кулдаун для story_share заданий
        if (task.type === 'story_share' && task.cooldown_minutes && completion && completion.claimed_at) {
            const claimedAt = new Date(completion.claimed_at);
            const cooldownEnd = new Date(claimedAt.getTime() + (task.cooldown_minutes * 60 * 1000));
            const now = new Date();

            if (now < cooldownEnd) {
                return false;
            }
        }

        return true;
    },

    // Вспомогательный метод для получения времени следующего доступа
    getNextAvailableTime(task: Task, completion?: UserTaskCompletion): string | undefined {
        if (task.type === 'story_share' && task.cooldown_minutes && completion && completion.claimed_at) {
            const claimedAt = new Date(completion.claimed_at);
            const cooldownEnd = new Date(claimedAt.getTime() + (task.cooldown_minutes * 60 * 1000));
            const now = new Date();

            if (now < cooldownEnd) {
                return cooldownEnd.toISOString();
            }
        }

        return undefined;
    },

    // Начало выполнения задания через API
    async startTask(userId: string, taskId: string): Promise<UserTaskCompletion> {
        try {
            const response = await fetch('/api/tasks/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to start task');
            }

            return result.completion;

        } catch (error) {
            console.error('Error starting task via API:', error);
            throw error;
        }
    },

    // Проверка выполнения задания - остается локальной для внутреннего использования
    async checkTaskCompletion(userId: string, taskId: string, telegramUserId: number): Promise<boolean> {
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (taskError || !task) {
            throw new Error('Task not found');
        }

        if (task.type === 'telegram_channel' || task.type === 'telegram_chat') {
            return await this.checkTelegramMembership(task.telegram_id!, telegramUserId);
        }

        return true;
    },

    // Проверка подписки на Telegram канал/чат - остается локальной
    async checkTelegramMembership(chatId: number, userId: number): Promise<boolean> {
        try {
            const response = await fetch('/api/check-telegram-membership', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    user_id: userId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to check membership');
            }

            const result = await response.json();
            return result.is_member;
        } catch (error) {
            console.error('Error checking telegram membership:', error);
            return false;
        }
    },

    // Завершение задания - локальная функция
    async completeTask(userId: string, taskId: string): Promise<UserTaskCompletion> {
        const { data: completion, error: findError } = await supabase
            .from('user_task_completions')
            .select('*')
            .eq('user_id', userId)
            .eq('task_id', taskId)
            .eq('status', 'started')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (findError || !completion) {
            throw new Error('Task completion not found or not started');
        }

        const { data, error } = await supabase
            .from('user_task_completions')
            .update({
                completed_at: new Date().toISOString(),
                status: 'completed'
            })
            .eq('id', completion.id)
            .select()
            .single();

        if (error) {
            console.error('Error completing task:', error);
            throw error;
        }

        return data;
    },

    // Получение награды за задание через API
    async claimTaskReward(userId: string, taskId: string, telegramUserId: number): Promise<{
        completion: UserTaskCompletion;
        reward: number;
    }> {
        try {
            const response = await fetch('/api/tasks/claim-reward', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to claim reward');
            }

            return {
                completion: result.completion || {} as UserTaskCompletion,
                reward: result.reward?.attempts || 0,
            };

        } catch (error) {
            console.error('Error claiming reward via API:', error);
            throw error;
        }
    },

    // Получение выполненных заданий пользователя - остается локальной
    async getUserCompletedTasks(userId: string): Promise<UserTaskCompletion[]> {
        const { data, error } = await supabase
            .from('user_task_completions')
            .select('*, task:tasks(*)')
            .eq('user_id', userId)
            .eq('status', 'claimed')
            .order('claimed_at', { ascending: false });

        if (error) {
            console.error('Error fetching completed tasks:', error);
            throw error;
        }

        return data || [];
    },

    // Получение статистики заданий пользователя - остается локальной
    async getUserTaskStats(userId: string): Promise<{
        total_completed: number;
        total_attempts_earned: number;
        tasks_completed_today: number;
    }> {
        const { data: completions, error } = await supabase
            .from('user_task_completions')
            .select('*, task:tasks(reward_attempts)')
            .eq('user_id', userId)
            .eq('status', 'claimed');

        if (error) {
            console.error('Error fetching user task stats:', error);
            throw error;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
            total_completed: completions?.length || 0,
            total_attempts_earned: 0,
            tasks_completed_today: 0
        };

        if (completions) {
            for (const completion of completions) {
                const task = completion.task as unknown as Task;
                stats.total_attempts_earned += task.reward_attempts;

                if (completion.claimed_at && new Date(completion.claimed_at) >= today) {
                    stats.tasks_completed_today++;
                }
            }
        }

        return stats;
    }
};