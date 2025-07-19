// src/hooks/modules/useTasks.ts - Хук для работы с заданиями через API

import { useState, useCallback, useRef } from 'react';
import type { TaskWithCompletion, TaskStats, TaskRewardResult, UserTaskCompletion } from '@/lib/server/tasksService';

// Hook state interface
interface TasksState {
    tasks: TaskWithCompletion[] | null;
    stats: TaskStats | null;
    isLoading: boolean;
    error: string | null;
}

// Task processing states
interface TaskProcessingStates {
    [taskId: string]: {
        isStarting?: boolean;
        isChecking?: boolean;
        isCompleting?: boolean;
        isClaiming?: boolean;
        error?: string;
    };
}

/**
 * Специализированный хук для управления заданиями
 */
export function useTasks(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<TasksState>({
        tasks: null,
        stats: null,
        isLoading: false,
        error: null,
    });

    const [processing, setProcessing] = useState<TaskProcessingStates>({});
    const fetchingRef = useRef<boolean>(false);

    /**
     * Получение всех заданий пользователя
     */
    const fetchTasks = useCallback(async (): Promise<TaskWithCompletion[] | null> => {
        if (fetchingRef.current) {
            console.log('Tasks fetch already in progress');
            return state.tasks;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching tasks from API...');

            const response = await makeAuthenticatedRequest('/api/tasks');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch tasks');
            }

            const tasks: TaskWithCompletion[] = result.data;

            setState(prev => ({
                ...prev,
                tasks,
                isLoading: false,
                error: null,
            }));

            console.log('Successfully fetched tasks:', tasks.length);
            return tasks;

        } catch (error) {
            console.error('Error fetching tasks:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return null;
        } finally {
            fetchingRef.current = false;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Получение статистики заданий
     */
    const fetchTaskStats = useCallback(async (): Promise<TaskStats | null> => {
        try {
            console.log('Fetching task statistics...');

            const response = await makeAuthenticatedRequest('/api/tasks/stats');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch task statistics');
            }

            const stats: TaskStats = result.data;

            setState(prev => ({
                ...prev,
                stats,
            }));

            console.log('Successfully fetched task statistics:', stats);
            return stats;

        } catch (error) {
            console.error('Error fetching task statistics:', error);
            return null;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Начало выполнения задания
     */
    const startTask = useCallback(async (taskId: string): Promise<UserTaskCompletion | null> => {
        setProcessing(prev => ({
            ...prev,
            [taskId]: { isStarting: true }
        }));

        try {
            console.log(`Starting task: ${taskId}`);

            const response = await makeAuthenticatedRequest('/api/tasks/start', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to start task');
            }

            setProcessing(prev => ({
                ...prev,
                [taskId]: {}
            }));

            console.log(`Task started successfully: ${taskId}`);
            return result.data;

        } catch (error) {
            console.error('Error starting task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setProcessing(prev => ({
                ...prev,
                [taskId]: { error: errorMessage }
            }));

            return null;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Проверка выполнения задания
     */
    const checkTask = useCallback(async (taskId: string): Promise<boolean> => {
        setProcessing(prev => ({
            ...prev,
            [taskId]: { isChecking: true }
        }));

        try {
            console.log(`Checking task completion: ${taskId}`);

            const response = await makeAuthenticatedRequest('/api/tasks/check', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to check task');
            }

            const isCompleted = result.data.isCompleted;

            if (!isCompleted) {
                setProcessing(prev => ({
                    ...prev,
                    [taskId]: { error: 'Task not completed yet' }
                }));
            } else {
                setProcessing(prev => ({
                    ...prev,
                    [taskId]: {}
                }));
            }

            console.log(`Task check result: ${taskId} - ${isCompleted}`);
            return isCompleted;

        } catch (error) {
            console.error('Error checking task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setProcessing(prev => ({
                ...prev,
                [taskId]: { error: errorMessage }
            }));

            return false;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Завершение задания
     */
    const completeTask = useCallback(async (taskId: string): Promise<UserTaskCompletion | null> => {
        setProcessing(prev => ({
            ...prev,
            [taskId]: { isCompleting: true }
        }));

        try {
            console.log(`Completing task: ${taskId}`);

            const response = await makeAuthenticatedRequest('/api/tasks/complete', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to complete task');
            }

            setProcessing(prev => ({
                ...prev,
                [taskId]: {}
            }));

            console.log(`Task completed successfully: ${taskId}`);
            return result.data;

        } catch (error) {
            console.error('Error completing task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setProcessing(prev => ({
                ...prev,
                [taskId]: { error: errorMessage }
            }));

            return null;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Получение награды за задание
     */
    const claimTaskReward = useCallback(async (taskId: string): Promise<TaskRewardResult | null> => {
        setProcessing(prev => ({
            ...prev,
            [taskId]: { isClaiming: true }
        }));

        try {
            console.log(`Claiming reward for task: ${taskId}`);

            const response = await makeAuthenticatedRequest('/api/tasks/claim', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to claim reward');
            }

            setProcessing(prev => ({
                ...prev,
                [taskId]: {}
            }));

            console.log(`Reward claimed successfully for task: ${taskId}`, result.data.reward);
            return result.data;

        } catch (error) {
            console.error('Error claiming task reward:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setProcessing(prev => ({
                ...prev,
                [taskId]: { error: errorMessage }
            }));

            return null;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Очистка ошибки для конкретного задания
     */
    const clearTaskError = useCallback((taskId: string) => {
        setProcessing(prev => ({
            ...prev,
            [taskId]: {}
        }));
    }, []);

    /**
     * Очистка общего состояния ошибки
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Сброс состояния заданий
     */
    const resetTasks = useCallback(() => {
        setState({
            tasks: null,
            stats: null,
            isLoading: false,
            error: null,
        });
        setProcessing({});
    }, []);

    return {
        // State
        tasks: state.tasks,
        stats: state.stats,
        isLoading: state.isLoading,
        error: state.error,
        processing,

        // Actions
        fetchTasks,
        fetchTaskStats,
        startTask,
        checkTask,
        completeTask,
        claimTaskReward,
        clearTaskError,
        clearError,
        resetTasks,
    };
}