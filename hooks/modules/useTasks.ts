// src/hooks/modules/useTasks.ts - Updated with timer-based verification logic

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    TaskWithStatus,
    TaskStatus,
    TaskType,
    GetTasksResponse,
    StartTaskResponse,
    VerifyTaskResponse,
    ClaimRewardResponse,
    TaskStats,
    TASK_CONFIG
} from '@/types/tasks';

// Hook state interface with timer support
interface TasksState {
    tasks: TaskWithStatus[];
    isLoading: boolean;
    error: string | null;
    loadingTaskId: string | null;
    claimingTaskId: string | null;
    timers: Record<string, number>; // taskId -> seconds remaining
    verifyingTaskId: string | null;
}

// Timer intervals for cleanup
const timerIntervals: Record<string, NodeJS.Timeout> = {};

/**
 * Updated tasks hook with timer-based verification system
 */
export function useTasks(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<TasksState>({
        tasks: [],
        isLoading: false,
        error: null,
        loadingTaskId: null,
        claimingTaskId: null,
        timers: {},
        verifyingTaskId: null,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch all tasks (no categorization to prevent reordering)
     */
    const fetchTasks = useCallback(async (): Promise<TaskWithStatus[] | null> => {
        if (fetchingRef.current) {
            console.log('Tasks fetch already in progress');
            return state.tasks;
        }

        fetchingRef.current = true;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Fetching fresh tasks from API...');

            const response = await makeAuthenticatedRequest('/api/tasks');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result: GetTasksResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch tasks');
            }

            // Preserve existing timers for tasks that are still in progress
            const existingTimers: Record<string, number> = {};
            result.tasks.forEach(task => {
                if (state.timers[task.task_id] && task.user_status === TaskStatus.STARTED) {
                    existingTimers[task.task_id] = state.timers[task.task_id];
                }
            });

            setState(prev => ({
                ...prev,
                tasks: result.tasks,
                isLoading: false,
                error: null,
                timers: existingTimers,
            }));

            console.log('Successfully fetched tasks:', {
                total: result.tasks.length,
            });

            return result.tasks;

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
     * Start task with immediate redirect and timer
     */
    const startTaskWithTimer = useCallback(async (task: TaskWithStatus): Promise<boolean> => {
        setState(prev => ({ ...prev, loadingTaskId: task.task_id, error: null }));

        try {
            console.log('Starting task with timer:', task.task_id);

            // First, start the task on the server
            const response = await makeAuthenticatedRequest('/api/tasks/start', {
                method: 'POST',
                body: JSON.stringify({ taskId: task.task_id }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result: StartTaskResponse = await response.json();

            if (!result.success || !result.task) {
                throw new Error(result.error || 'Failed to start task');
            }

            // Open the task URL immediately
            if (typeof window !== 'undefined') {
                window.open(task.url, '_blank', 'noopener,noreferrer');
            }

            // Update task status and start 10-second timer
            setState(prev => {
                const updatedTasks = prev.tasks.map(t =>
                    t.task_id === task.task_id ? { ...t, user_status: TaskStatus.STARTED } : t
                );

                return {
                    ...prev,
                    tasks: updatedTasks,
                    loadingTaskId: null,
                    timers: {
                        ...prev.timers,
                        [task.task_id]: 10
                    }
                };
            });

            // Start countdown timer
            const intervalId = setInterval(() => {
                setState(prev => {
                    const currentTime = prev.timers[task.task_id];
                    if (currentTime <= 1) {
                        // Timer finished, trigger verification
                        clearInterval(intervalId);
                        delete timerIntervals[task.task_id];

                        // Remove timer and trigger verification
                        const newTimers = { ...prev.timers };
                        delete newTimers[task.task_id];

                        // Trigger verification after timer
                        setTimeout(() => verifyTaskAfterTimer(task), 100);

                        return {
                            ...prev,
                            timers: newTimers
                        };
                    }

                    return {
                        ...prev,
                        timers: {
                            ...prev.timers,
                            [task.task_id]: currentTime - 1
                        }
                    };
                });
            }, 1000);

            timerIntervals[task.task_id] = intervalId;

            console.log('Task started with timer successfully:', task.task_id);
            return true;

        } catch (error) {
            console.error('Error starting task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to start task';

            setState(prev => ({
                ...prev,
                loadingTaskId: null,
                error: errorMessage,
            }));

            return false;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Verify task after timer completion
     */
    const verifyTaskAfterTimer = useCallback(async (task: TaskWithStatus): Promise<void> => {
        const isTelegramTask = task.task_type === TaskType.TELEGRAM_CHANNEL ||
            task.task_type === TaskType.TELEGRAM_CHAT;

        if (isTelegramTask) {
            // For Telegram tasks, attempt automatic verification
            setState(prev => ({ ...prev, verifyingTaskId: task.task_id }));

            try {
                const response = await makeAuthenticatedRequest('/api/tasks/verify', {
                    method: 'POST',
                    body: JSON.stringify({ taskId: task.task_id }),
                });

                const result: VerifyTaskResponse = await response.json();

                setState(prev => {
                    const updatedTasks = prev.tasks.map(t => {
                        if (t.task_id === task.task_id) {
                            return {
                                ...t,
                                user_status: result.verified ? TaskStatus.COMPLETED : TaskStatus.STARTED
                            };
                        }
                        return t;
                    });

                    return {
                        ...prev,
                        tasks: updatedTasks,
                        verifyingTaskId: null,
                    };
                });

                if (!result.verified) {
                    console.log('Telegram verification failed, user can retry');
                }

            } catch (error) {
                console.error('Error verifying Telegram task:', error);
                setState(prev => ({ ...prev, verifyingTaskId: null }));
            }
        } else {
            // For non-Telegram tasks, automatically mark as completed (trust-based)
            setState(prev => {
                const updatedTasks = prev.tasks.map(t =>
                    t.task_id === task.task_id
                        ? { ...t, user_status: TaskStatus.COMPLETED }
                        : t
                );

                return {
                    ...prev,
                    tasks: updatedTasks,
                };
            });
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Retry verification for failed Telegram tasks
     */
    const retryVerification = useCallback(async (task: TaskWithStatus): Promise<boolean> => {
        setState(prev => ({ ...prev, verifyingTaskId: task.task_id, error: null }));

        try {
            const response = await makeAuthenticatedRequest('/api/tasks/verify', {
                method: 'POST',
                body: JSON.stringify({ taskId: task.task_id }),
            });

            const result: VerifyTaskResponse = await response.json();

            setState(prev => {
                const updatedTasks = prev.tasks.map(t => {
                    if (t.task_id === task.task_id) {
                        return {
                            ...t,
                            user_status: result.verified ? TaskStatus.COMPLETED : TaskStatus.STARTED
                        };
                    }
                    return t;
                });

                return {
                    ...prev,
                    tasks: updatedTasks,
                    verifyingTaskId: null,
                };
            });

            return result.verified;

        } catch (error) {
            console.error('Error retrying verification:', error);
            setState(prev => ({
                ...prev,
                verifyingTaskId: null,
                error: 'Verification failed, please try again'
            }));
            return false;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Claim task reward
     */
    const claimReward = useCallback(async (taskId: string): Promise<{ success: boolean; attemptsAdded?: number; newTotal?: number }> => {
        setState(prev => ({ ...prev, claimingTaskId: taskId, error: null }));

        try {
            console.log('Claiming reward for task:', taskId);

            const response = await makeAuthenticatedRequest('/api/tasks/claim', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result: ClaimRewardResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to claim reward');
            }

            // Update task status to rewarded
            setState(prev => {
                const updatedTasks = prev.tasks.map(task =>
                    task.task_id === taskId
                        ? { ...task, user_status: TaskStatus.REWARDED }
                        : task
                );

                return {
                    ...prev,
                    tasks: updatedTasks,
                    claimingTaskId: null,
                };
            });

            console.log('Reward claimed successfully:', {
                taskId,
                attemptsAdded: result.attemptsAdded,
                newTotal: result.newAttemptsTotal,
            });

            return {
                success: true,
                attemptsAdded: result.attemptsAdded,
                newTotal: result.newAttemptsTotal,
            };

        } catch (error) {
            console.error('Error claiming reward:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to claim reward';

            setState(prev => ({
                ...prev,
                claimingTaskId: null,
                error: errorMessage,
            }));

            return { success: false };
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Get remaining timer for a task
     */
    const getTaskTimer = useCallback((taskId: string): number => {
        return state.timers[taskId] || 0;
    }, [state.timers]);

    /**
     * Check if task action is in progress
     */
    const isTaskLoading = useCallback((taskId: string, action: 'start' | 'verify' | 'claim'): boolean => {
        switch (action) {
            case 'start':
                return state.loadingTaskId === taskId;
            case 'verify':
                return state.verifyingTaskId === taskId;
            case 'claim':
                return state.claimingTaskId === taskId;
            default:
                return false;
        }
    }, [state.loadingTaskId, state.verifyingTaskId, state.claimingTaskId]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Reset tasks state and clean up timers
     */
    const resetTasks = useCallback(() => {
        // Clear all active timers
        Object.values(timerIntervals).forEach(clearInterval);
        Object.keys(timerIntervals).forEach(key => delete timerIntervals[key]);

        setState({
            tasks: [],
            isLoading: false,
            error: null,
            loadingTaskId: null,
            claimingTaskId: null,
            timers: {},
            verifyingTaskId: null,
        });
    }, []);

    /**
     * Cleanup timers on unmount
     */
    useEffect(() => {
        return () => {
            Object.values(timerIntervals).forEach(clearInterval);
        };
    }, []);

    /**
     * Get task statistics
     */
    const getTaskStats = useCallback((): TaskStats => {
        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(task =>
            task.user_status === TaskStatus.COMPLETED || task.user_status === TaskStatus.REWARDED
        ).length;
        const pendingTasks = state.tasks.filter(task =>
            task.user_status === TaskStatus.STARTED
        ).length;
        const totalRewardsEarned = state.tasks
            .filter(task => task.user_status === TaskStatus.REWARDED)
            .reduce((total, task) => total + task.attempts_reward, 0);
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
            totalTasks,
            completedTasks,
            pendingTasks,
            totalRewardsEarned,
            completionRate,
        };
    }, [state.tasks]);

    return {
        // State
        tasks: state.tasks,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchTasks,
        startTaskWithTimer,
        retryVerification,
        claimReward,
        clearError,
        resetTasks,

        // Utility functions
        getTaskStats,
        getTaskTimer,
        isTaskLoading,

        // Computed values for convenience
        totalTasks: state.tasks.length,
        completedTasks: state.tasks.filter(task =>
            task.user_status === TaskStatus.COMPLETED || task.user_status === TaskStatus.REWARDED
        ),
        availableTasks: state.tasks.filter(task =>
            task.user_status === TaskStatus.NOT_STARTED
        ),
        inProgressTasks: state.tasks.filter(task =>
            task.user_status === TaskStatus.STARTED
        ),
    };
}