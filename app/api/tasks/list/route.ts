// src/app/api/tasks/list/route.ts - Исправленная версия без циклических вызовов
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase_server';
import type { TaskWithCompletion, Task, UserTaskCompletion, TaskType } from '@/types/tasks';

interface TaskStats {
    total_completed: number;
    total_attempts_earned: number;
    tasks_completed_today: number;
}

interface TaskListResponse {
    success: boolean;
    tasks: TaskWithCompletion[];
    stats?: TaskStats;
    error?: string;
}

// Вспомогательная функция для проверки возможности выполнения задания
function canTaskBeCompleted(task: Task, completion?: UserTaskCompletion): boolean {
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
}

// Вспомогательная функция для получения времени следующего доступа
function getNextAvailableTime(task: Task, completion?: UserTaskCompletion): string | undefined {
    if (task.type === 'story_share' && task.cooldown_minutes && completion && completion.claimed_at) {
        const claimedAt = new Date(completion.claimed_at);
        const cooldownEnd = new Date(claimedAt.getTime() + (task.cooldown_minutes * 60 * 1000));
        const now = new Date();

        if (now < cooldownEnd) {
            return cooldownEnd.toISOString();
        }
    }

    return undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse<TaskListResponse>> {
    try {
        // Извлекаем информацию о пользователе из заголовков middleware
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        console.log(`Получение задач для пользователя ${telegramIdNumber} через прямые запросы к БД`);

        try {
            // ИСПРАВЛЕНО: Прямые запросы к базе данных вместо использования taskService

            // Получаем все активные задания
            const { data: tasks, error: tasksError } = await supabaseServer
                .from('tasks')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (tasksError) {
                console.error('Ошибка при получении заданий:', tasksError);
                throw new Error('Failed to fetch tasks from database');
            }

            // Получаем завершения пользователя
            const { data: completions, error: completionsError } = await supabaseServer
                .from('user_task_completions')
                .select('*')
                .eq('user_id', userId);

            if (completionsError) {
                console.error('Ошибка при получении завершений заданий:', completionsError);
                throw new Error('Failed to fetch task completions from database');
            }

            // Объединяем задания с информацией о выполнении
            const tasksWithCompletion: TaskWithCompletion[] = (tasks || []).map(task => {
                const completion = completions?.find(c => c.task_id === task.id);
                const canComplete = canTaskBeCompleted(task, completion);
                const nextAvailable = getNextAvailableTime(task, completion);

                return {
                    ...task,
                    user_completion: completion,
                    can_complete: canComplete,
                    next_available_at: nextAvailable
                };
            });

            // Получаем статистику пользователя
            const stats = await getUserTaskStats(userId);

            console.log(`Успешно получено ${tasksWithCompletion.length} заданий для пользователя ${telegramIdNumber}`);

            return NextResponse.json({
                success: true,
                tasks: tasksWithCompletion,
                stats,
            });

        } catch (dbError) {
            console.error('Ошибка работы с базой данных:', dbError);
            return NextResponse.json(
                {
                    success: false,
                    tasks: [],
                    error: 'Database operation failed'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Ошибка при получении заданий:', error);

        return NextResponse.json(
            {
                success: false,
                tasks: [],
                error: error instanceof Error ? error.message : 'Failed to fetch tasks'
            },
            { status: 500 }
        );
    }
}

// Вспомогательная функция для получения статистики заданий пользователя
async function getUserTaskStats(userId: string): Promise<TaskStats> {
    try {
        const { data: completions, error } = await supabaseServer
            .from('user_task_completions')
            .select(`
                *,
                task:tasks(reward_attempts)
            `)
            .eq('user_id', userId)
            .eq('status', 'claimed');

        if (error) {
            console.error('Ошибка при получении статистики заданий:', error);
            // Возвращаем пустую статистику вместо падения
            return {
                total_completed: 0,
                total_attempts_earned: 0,
                tasks_completed_today: 0
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats: TaskStats = {
            total_completed: completions?.length || 0,
            total_attempts_earned: 0,
            tasks_completed_today: 0
        };

        if (completions) {
            for (const completion of completions) {
                const task = completion.task as unknown as Task;
                if (task && task.reward_attempts) {
                    stats.total_attempts_earned += task.reward_attempts;
                }

                if (completion.claimed_at && new Date(completion.claimed_at) >= today) {
                    stats.tasks_completed_today++;
                }
            }
        }

        return stats;
    } catch (error) {
        console.error('Критическая ошибка при получении статистики:', error);
        return {
            total_completed: 0,
            total_attempts_earned: 0,
            tasks_completed_today: 0
        };
    }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}