// src/game-modes/reaction/ReactionGameLogic.ts

import {
    ReactionGameConfig,
    ReactionGameStats,
    ReactionGameResult,
    ReactionGameState
} from '@/types/game-modes/reaction';
import { Circle, GameState, GameMode } from '@/types/game-modes/common';

export const REACTION_CONFIG: ReactionGameConfig = {
    id: 'reaction',
    name: 'REACTION SPEED',
    minDelayMs: 3000,
    maxDelayMs: 5000,
    circleActiveTimeMs: 10000, // 10 секунд на клик после появления
    gridSize: 9 // 3x3 сетка для простоты
};

export const createCircleGrid = (count: number): Circle[] => {
    return Array.from({ length: count }, (_, index) => ({
        id: index,
        isActive: false,
        isAnimating: false,
        isDecoy: false,
    }));
};

export const getRandomCircleId = (totalCircles: number): number => {
    return Math.floor(Math.random() * totalCircles);
};

export const getRandomDelay = (config: ReactionGameConfig): number => {
    return Math.random() * (config.maxDelayMs - config.minDelayMs) + config.minDelayMs;
};

export const initializeReactionGameState = (): ReactionGameState => {
    return {
        config: REACTION_CONFIG,
        gameState: GameState.NOT_STARTED,
        stats: {
            reactionTime: null,
            clicked: false,
            startTime: null,
            clickTime: null,
            missedTarget: false
        },
        circles: createCircleGrid(REACTION_CONFIG.gridSize),
        activeCircleId: null,
        startDelayTimeout: null,
        gameTimeout: null
    };
};

export const activateRandomCircle = (
    state: ReactionGameState,
    onCircleActivated: (circleId: number) => void,
    onGameTimeout: () => void
): ReactionGameState => {
    const circleId = getRandomCircleId(state.config.gridSize);
    const activationTime = Date.now();

    const newState = {
        ...state,
        activeCircleId: circleId,
        stats: {
            ...state.stats,
            startTime: activationTime
        },
        circles: state.circles.map(circle =>
            circle.id === circleId
                ? { ...circle, isActive: true }
                : circle
        )
    };

    onCircleActivated(circleId);

    // Set timeout for game ending if no click
    const gameTimeout = setTimeout(() => {
        onGameTimeout();
    }, state.config.circleActiveTimeMs);

    return {
        ...newState,
        gameTimeout
    };
};

export const handleCircleClick = (
    state: ReactionGameState,
    clickedCircleId: number
): ReactionGameState => {
    const clickTime = Date.now();

    if (state.activeCircleId === clickedCircleId && state.stats.startTime) {
        // Correct click
        const reactionTime = clickTime - state.stats.startTime;

        return {
            ...state,
            gameState: GameState.FINISHED,
            stats: {
                ...state.stats,
                clicked: true,
                clickTime,
                reactionTime,
                missedTarget: false
            },
            circles: state.circles.map(circle =>
                circle.id === clickedCircleId
                    ? { ...circle, isAnimating: true }
                    : circle
            )
        };
    } else {
        // Wrong click
        return {
            ...state,
            gameState: GameState.FINISHED,
            stats: {
                ...state.stats,
                clicked: true,
                clickTime,
                reactionTime: null,
                missedTarget: true
            }
        };
    }
};

export const calculateReactionRating = (reactionTime: number | null, missed: boolean): ReactionGameResult['rating'] => {
    if (missed || reactionTime === null) {
        return 'MISSED';
    }

    if (reactionTime <= 150) return 'LIGHTNING';
    if (reactionTime <= 200) return 'EXCELLENT';
    if (reactionTime <= 300) return 'GOOD';
    if (reactionTime <= 500) return 'AVERAGE';
    return 'SLOW';
};

export const calculateReactionScore = (reactionTime: number | null, missed: boolean): number => {
    if (missed || reactionTime === null) {
        return 0;
    }

    // Score formula: higher score for faster reaction
    const baseScore = Math.max(0, 1000 - reactionTime);

    if (reactionTime <= 150) return Math.floor(baseScore * 1.5); // Lightning bonus
    if (reactionTime <= 200) return Math.floor(baseScore * 1.3); // Excellence bonus
    if (reactionTime <= 300) return Math.floor(baseScore * 1.1); // Good bonus

    return Math.floor(baseScore);
};

export const createReactionGameResult = (state: ReactionGameState): ReactionGameResult => {
    const missed = state.stats.missedTarget || !state.stats.clicked;
    const reactionTime = state.stats.reactionTime || 0;
    const rating = calculateReactionRating(state.stats.reactionTime, missed);
    const score = calculateReactionScore(state.stats.reactionTime, missed);

    return {
        mode: GameMode.REACTION,
        score,
        duration: reactionTime,
        reactionTime,
        missed,
        rating,
        createdAt: new Date().toISOString()
    };
};

export const cleanupReactionGame = (state: ReactionGameState): void => {
    if (state.startDelayTimeout) {
        clearTimeout(state.startDelayTimeout);
    }
    if (state.gameTimeout) {
        clearTimeout(state.gameTimeout);
    }
};

export const getReactionRatingDescription = (rating: ReactionGameResult['rating']): string => {
    switch (rating) {
        case 'LIGHTNING': return 'Lightning fast reflexes!';
        case 'EXCELLENT': return 'Excellent reaction time!';
        case 'GOOD': return 'Good response speed!';
        case 'AVERAGE': return 'Average reaction time.';
        case 'SLOW': return 'Could be faster...';
        case 'MISSED': return 'Target missed or timeout.';
    }
};

export const getReactionRatingColor = (rating: ReactionGameResult['rating']): string => {
    switch (rating) {
        case 'LIGHTNING': return 'text-yellow-400';
        case 'EXCELLENT': return 'text-green-400';
        case 'GOOD': return 'text-blue-400';
        case 'AVERAGE': return 'text-white';
        case 'SLOW': return 'text-orange-400';
        case 'MISSED': return 'text-red-400';
    }
};