// src/hooks/modules/useDailyQuests.ts - Исправлена проблема циклических вызовов

import { useState, useCallback, useRef } from "react";
import type {
    DailyQuestWithProgress,
    QuestCompletionResult,
    QuestContentParams,
    QuestLocalizedContent,
} from "@/types/daily-quests";
import { QuestType, GameMode } from "@/types/daily-quests";

// Hook state interface
interface DailyQuestsState {
    quest: DailyQuestWithProgress | null;
    isLoading: boolean;
    error: string | null;
    lastCompletion: QuestCompletionResult | null;
}

// Translation function type - more flexible
type TranslationFunction = (key: string, params?: any) => string;

/**
 * Hook for managing daily quests on client side
 */
export function useDailyQuests(
    makeAuthenticatedRequest: (
        endpoint: string,
        options?: RequestInit,
    ) => Promise<Response>,
) {
    const [state, setState] = useState<DailyQuestsState>({
        quest: null,
        isLoading: false,
        error: null,
        lastCompletion: null,
    });

    const fetchingRef = useRef<boolean>(false);

    /**
     * Fetch current daily quest with user progress
     * ИСПРАВЛЕНО: Убрана state.quest из зависимостей
     */
    const fetchDailyQuest = useCallback(
        async (force: boolean = false): Promise<DailyQuestWithProgress | null> => {
            if (fetchingRef.current && !force) {
                // Возвращаем текущий quest из состояния
                return state.quest;
            }

            fetchingRef.current = true;
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const response = await makeAuthenticatedRequest("/api/quests/daily");

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error || `Server error: ${response.status}`,
                    );
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || "Failed to fetch daily quest");
                }

                const questData = result.quest || null;

                setState((prev) => ({
                    ...prev,
                    quest: questData,
                    isLoading: false,
                    error: null,
                }));

                return questData;
            } catch (error) {
                console.error("Error fetching daily quest:", error);
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));

                return null;
            } finally {
                fetchingRef.current = false;
            }
        },
        [makeAuthenticatedRequest], // ✅ ИСПРАВЛЕНО: убрана state.quest из зависимостей
    );

    /**
     * Update quest progress after a game
     */
    const updateQuestProgress = useCallback(
        async (
            gameMode: GameMode,
            gameResult: any,
        ): Promise<QuestCompletionResult | null> => {
            try {
                const response = await makeAuthenticatedRequest("/api/quests/progress", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        gameMode,
                        gameResult,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error || `Server error: ${response.status}`,
                    );
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || "Failed to update quest progress");
                }

                // If quest was completed, store the completion result
                if (result.completion) {
                    setState((prev) => ({
                        ...prev,
                        lastCompletion: result.completion,
                    }));

                    // Refresh quest data to get updated progress
                    setTimeout(() => {
                        fetchDailyQuest(true);
                    }, 100);
                }

                return result.completion || null;
            } catch (error) {
                console.error("Error updating quest progress:", error);
                return null;
            }
        },
        [makeAuthenticatedRequest, fetchDailyQuest],
    );

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    /**
     * Clear last completion result
     */
    const clearLastCompletion = useCallback(() => {
        setState((prev) => ({ ...prev, lastCompletion: null }));
    }, []);

    /**
     * Reset quest state
     */
    const resetQuestState = useCallback(() => {
        setState({
            quest: null,
            isLoading: false,
            error: null,
            lastCompletion: null,
        });
        fetchingRef.current = false; // Сбрасываем флаг загрузки
    }, []);

    /**
     * Generate localized content for current quest
     */
    const getQuestContent = useCallback(
        (t: TranslationFunction): QuestLocalizedContent | null => {
            if (!state.quest) return null;

            const { quest, progress } = state.quest;
            const currentProgress = progress?.progress_value || 0;

            const params: QuestContentParams = {
                questType: quest.quest_type as QuestType,
                gameMode: quest.game_mode as GameMode | "any",
                targetValue: quest.target_value,
                rewardAttempts: quest.reward_attempts,
                currentProgress,
            };

            // Generate title based on quest type and game mode
            const titleKey = `quests.${quest.quest_type}.${quest.game_mode}.title`;
            const fallbackTitleKey = `quests.${quest.quest_type}.any.title`;

            // Generate description
            const descriptionKey = `quests.${quest.quest_type}.${quest.game_mode}.description`;
            const fallbackDescriptionKey = `quests.${quest.quest_type}.any.description`;

            // Progress text
            const progressKey = progress?.is_completed
                ? "quests.progress.completed"
                : "quests.progress.current";

            return {
                title: t(titleKey, params) || t(fallbackTitleKey, params),
                description: t(descriptionKey, params) || t(fallbackDescriptionKey, params),
                progressText: t(progressKey, {
                    current: currentProgress,
                    target: quest.target_value,
                }),
                completedText: t("quests.progress.completed"),
                rewardText: t("quests.reward", { attempts: quest.reward_attempts }),
            };
        },
        [state.quest],
    );

    /**
     * Check if user has active quest
     */
    const hasActiveQuest = useCallback((): boolean => {
        return state.quest !== null;
    }, [state.quest]);

    /**
     * Check if quest is completed
     */
    const isQuestCompleted = useCallback((): boolean => {
        return state.quest?.progress?.is_completed || false;
    }, [state.quest]);

    /**
     * Get quest progress percentage
     */
    const getProgressPercentage = useCallback((): number => {
        if (!state.quest) return 0;

        const current = state.quest.progress?.progress_value || 0;
        const target = state.quest.quest.target_value;

        return Math.min((current / target) * 100, 100);
    }, [state.quest]);

    return {
        // State 
        quest: state.quest,
        isLoading: state.isLoading,
        error: state.error,
        lastCompletion: state.lastCompletion,

        // Computed values
        hasActiveQuest: hasActiveQuest(),
        isCompleted: isQuestCompleted(),
        progressPercentage: getProgressPercentage(),

        // Actions
        fetchDailyQuest,
        updateQuestProgress,
        getQuestContent,
        clearError,
        clearLastCompletion,
        resetQuestState,
    };
}