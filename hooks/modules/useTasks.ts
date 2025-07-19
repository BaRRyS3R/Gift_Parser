// src/hooks/modules/useTasks.ts - Client-side tasks management hook

import { useState, useCallback, useRef } from 'react';
import {
    TaskWithStatus,
    TaskStatus,
    TaskType,
    GetTasksResponse,
    StartTaskResponse,
    VerifyTaskResponse,
    ClaimRewardResponse,
    TaskCategory,
    TaskStats,
    TASK_CONFIG
} from '@/types/tasks';

// Hook state interface
interface TasksState {
    tasks: TaskWithStatus[];
    categorizedTasks: {
        notStarted: TaskWithStatus[];
        started: TaskWithStatus[];
        completed: TaskWithStatus[];
        rewarded: TaskWithStatus[];
    } | null;
    isLoading: boolean;
    error: string | null;
    loadingTaskId: string | null;
    verifyingTaskId: string | null;
    claimingTaskId: string | null;
}

/**
 * Specialized hook for tasks management with server validation
 */
export function useTasks(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<TasksState>({
        tasks: [],
        categorizedTasks: null,
        isLoading: false,
        error: null,
        loadingTaskId: null,
        verifyingTaskId: null,
        claimingTaskId: null,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch all tasks with user status (always fresh data)
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

            setState({
                tasks: result.tasks,
                categorizedTasks: result.categorized || null,
                isLoading: false,
                error: null,
                loadingTaskId: null,
                verifyingTaskId: null,
                claimingTaskId: null,
            });

            console.log('Successfully fetched tasks:', {
                total: result.tasks.length,
                categorized: result.categorized ? {
                    notStarted: result.categorized.notStarted.length,
                    started: result.categorized.started.length,
                    completed: result.categorized.completed.length,
                    rewarded: result.categorized.rewarded.length,
                } : 'Not categorized'
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
     * Start a task
     */
    const startTask = useCallback(async (taskId: string): Promise<TaskWithStatus | null> => {
        setState(prev => ({ ...prev, loadingTaskId: taskId, error: null }));

        try {
            console.log('Starting task:', taskId);

            const response = await makeAuthenticatedRequest('/api/tasks/start', {
                method: 'POST',
                body: JSON.stringify({ taskId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result: StartTaskResponse = await response.json();

            if (!result.success || !result.task) {
                throw new Error(result.error || 'Failed to start task');
            }

            // Update local state
            setState(prev => {
                const updatedTasks = prev.tasks.map(task =>
                    task.task_id === taskId ? result.task! : task
                );

                // Recategorize tasks
                const categorizedTasks = {
                    notStarted: updatedTasks.filter(task => task.user_status === TaskStatus.NOT_STARTED),
                    started: updatedTasks.filter(task => task.user_status === TaskStatus.STARTED),
                    completed: updatedTasks.filter(task => task.user_status === TaskStatus.COMPLETED),
                    rewarded: updatedTasks.filter(task => task.user_status === TaskStatus.REWARDED),
                };

                return {
                    ...prev,
                    tasks: updatedTasks,
                    categorizedTasks,
                    loadingTaskId: null,
                };
            });

            console.log('Task started successfully:', taskId);
            return result.task;

        } catch (error) {
            console.error('Error starting task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to start task';

            setState(prev => ({
                ...prev,
                loadingTaskId: null,
                error: errorMessage,
            }));

            return null;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Verify task completion
     */
    const verifyTask = useCallback(async (taskId: string, verificationData?: Record<string, any>): Promise<boolean> => {
        setState(prev => ({ ...prev, verifyingTaskId: taskId, error: null }));

        try {
            console.log('Verifying task:', taskId);

            const response = await makeAuthenticatedRequest('/api/tasks/verify', {
                method: 'POST',
                body: JSON.stringify({ taskId, verificationData }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result: VerifyTaskResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Verification failed');
            }

            // If verification successful and task provided, update state
            if (result.verified && result.task) {
                setState(prev => {
                    const updatedTasks = prev.tasks.map(task =>
                        task.task_id === taskId ? result.task! : task
                    );

                    // Recategorize tasks
                    const categorizedTasks = {
                        notStarted: updatedTasks.filter(task => task.user_status === TaskStatus.NOT_STARTED),
                        started: updatedTasks.filter(task => task.user_status === TaskStatus.STARTED),
                        completed: updatedTasks.filter(task => task.user_status === TaskStatus.COMPLETED),
                        rewarded: updatedTasks.filter(task => task.user_status === TaskStatus.REWARDED),
                    };

                    return {
                        ...prev,
                        tasks: updatedTasks,
                        categorizedTasks,
                        verifyingTaskId: null,
                    };
                });

                console.log('Task verified successfully:', taskId);
            } else {
                setState(prev => ({
                    ...prev,
                    verifyingTaskId: null,
                    error: result.error || 'Verification failed - please complete the task and try again',
                }));
            }

            return result.verified;

        } catch (error) {
            console.error('Error verifying task:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to verify task';

            setState(prev => ({
                ...prev,
                verifyingTaskId: null,
                error: errorMessage,
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

            // Update local state
            if (result.task) {
                setState(prev => {
                    const updatedTasks = prev.tasks.map(task =>
                        task.task_id === taskId ? result.task! : task
                    );

                    // Recategorize tasks
                    const categorizedTasks = {
                        notStarted: updatedTasks.filter(task => task.user_status === TaskStatus.NOT_STARTED),
                        started: updatedTasks.filter(task => task.user_status === TaskStatus.STARTED),
                        completed: updatedTasks.filter(task => task.user_status === TaskStatus.COMPLETED),
                        rewarded: updatedTasks.filter(task => task.user_status === TaskStatus.REWARDED),
                    };

                    return {
                        ...prev,
                        tasks: updatedTasks,
                        categorizedTasks,
                        claimingTaskId: null,
                    };
                });
            } else {
                setState(prev => ({
                    ...prev,
                    claimingTaskId: null,
                }));
            }

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
     * Open task URL (with delay for trust-based verification)
     */
    const openTaskUrl = useCallback(async (task: TaskWithStatus): Promise<void> => {
        try {
            // Open the URL
            if (typeof window !== 'undefined') {
                window.open(task.url, '_blank', 'noopener,noreferrer');
            }

            // For trust-based tasks, add a delay before allowing verification
            const cooldownTime = TASK_CONFIG.COOLDOWN_PERIODS[task.task_type as TaskType] || 0;

            if (cooldownTime > 0) {
                console.log(`Applying cooldown of ${cooldownTime}ms for task type: ${task.task_type}`);
                await new Promise(resolve => setTimeout(resolve, cooldownTime));
            }

        } catch (error) {
            console.error('Error opening task URL:', error);
        }
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
     * Reset tasks state
     */
    const resetTasks = useCallback(() => {
        setState({
            tasks: [],
            categorizedTasks: null,
            isLoading: false,
            error: null,
            loadingTaskId: null,
            verifyingTaskId: null,
            claimingTaskId: null,
        });
    }, []);

    return {
        // State
        tasks: state.tasks,
        categorizedTasks: state.categorizedTasks,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        fetchTasks,
        startTask,
        verifyTask,
        claimReward,
        openTaskUrl,
        clearError,
        resetTasks,

        // Utility functions
        getTaskStats,
        isTaskLoading,

        // Computed values for convenience
        totalTasks: state.tasks.length,
        notStartedTasks: state.categorizedTasks?.notStarted || [],
        startedTasks: state.categorizedTasks?.started || [],
        completedTasks: state.categorizedTasks?.completed || [],
        rewardedTasks: state.categorizedTasks?.rewarded || [],
    };
}