// src/game-modes/tournament/TournamentGameLogic.ts - Tournament-specific game logic with optimized settings

import {
    SurvivalGameConfig,
    SurvivalGameStats,
    SurvivalGameResult,
    SurvivalGameState,
    SurvivalLevelConfig,
} from "@/types/game-modes/survival";
import { Circle, GameState, GameMode } from "@/types/game-modes/common";

// Tournament-optimized configuration for more competitive gameplay
export const TOURNAMENT_CONFIG: SurvivalGameConfig = {
    id: "tournament",
    name: "TOURNAMENT MODE",
    circleCount: 36, // 6x6 grid - smaller for more focused gameplay
    initialActivationTimeMin: 800, // Faster than regular survival
    initialActivationTimeMax: 1500,
    initialCircleActiveTime: 1800, // Slightly faster reactions required
    intensityIncreaseInterval: 6, // Faster progression (6 seconds instead of 8)
    maxIntensityLevel: 12, // Reduced to 12 levels for tournament balance
    simultaneousCirclesMin: 1,
    simultaneousCirclesMax: 3, // Start with fewer simultaneous circles
};

// Tournament-specific level progression for balanced competition
export const TOURNAMENT_LEVELS: SurvivalLevelConfig[] = [
    {
        level: 1,
        simultaneousCircles: 1,
        redCircles: 0,
        activationTimeMin: 1000,
        activationTimeMax: 1800,
        circleActiveTime: 2200,
        description: "TOURNAMENT START",
    },
    {
        level: 2,
        simultaneousCircles: 2,
        redCircles: 0,
        activationTimeMin: 900,
        activationTimeMax: 1600,
        circleActiveTime: 2000,
        description: "BUILDING PACE",
    },
    {
        level: 3,
        simultaneousCircles: 2,
        redCircles: 1,
        activationTimeMin: 800,
        activationTimeMax: 1500,
        circleActiveTime: 1900,
        description: "TRAP INTRODUCTION",
    },
    {
        level: 4,
        simultaneousCircles: 3,
        redCircles: 1,
        activationTimeMin: 750,
        activationTimeMax: 1400,
        circleActiveTime: 1800,
        description: "ACCELERATION",
    },
    {
        level: 5,
        simultaneousCircles: 4,
        redCircles: 1,
        activationTimeMin: 700,
        activationTimeMax: 1300,
        circleActiveTime: 1700,
        description: "MULTI-FOCUS",
    },
    {
        level: 6,
        simultaneousCircles: 5,
        redCircles: 2,
        activationTimeMin: 650,
        activationTimeMax: 1200,
        circleActiveTime: 1600,
        description: "DANGER ZONE",
    },
    {
        level: 7,
        simultaneousCircles: 6,
        redCircles: 2,
        activationTimeMin: 600,
        activationTimeMax: 1100,
        circleActiveTime: 1500,
        description: "INTENSE PRESSURE",
    },
    {
        level: 8,
        simultaneousCircles: 7,
        redCircles: 3,
        activationTimeMin: 550,
        activationTimeMax: 1000,
        circleActiveTime: 1400,
        description: "CRITICAL POINT",
    },
    {
        level: 9,
        simultaneousCircles: 8,
        redCircles: 3,
        activationTimeMin: 500,
        activationTimeMax: 950,
        circleActiveTime: 1300,
        description: "TOURNAMENT ELITE",
    },
    {
        level: 10,
        simultaneousCircles: 10,
        redCircles: 4,
        activationTimeMin: 450,
        activationTimeMax: 900,
        circleActiveTime: 1200,
        description: "CHAMPIONSHIP LEVEL",
    },
    {
        level: 11,
        simultaneousCircles: 12,
        redCircles: 4,
        activationTimeMin: 400,
        activationTimeMax: 850,
        circleActiveTime: 1100,
        description: "LEGENDARY TIER",
    },
    {
        level: 12,
        simultaneousCircles: 15,
        redCircles: 5,
        activationTimeMin: 350,
        activationTimeMax: 800,
        circleActiveTime: 1000,
        description: "TOURNAMENT MASTER",
    },
];

export const createTournamentCircleGrid = (count: number): Circle[] => {
    return Array.from({ length: count }, (_, index) => ({
        id: index,
        isActive: false,
        isAnimating: false,
        isDecoy: false,
    }));
};

export const initializeTournamentGameState = (): SurvivalGameState => {
    const gameStartTime = Date.now();

    return {
        config: TOURNAMENT_CONFIG,
        gameState: GameState.NOT_STARTED,
        stats: {
            correctHits: 0,
            wrongHits: 0,
            missedCircles: 0,
            decoyHits: 0,
            survivalTime: 0,
            currentLevel: 1,
            perfectStreak: 0,
            totalReactionTime: 0,
            hitCount: 0,
            gameStartTime, // Ensure game start time is properly set
        },
        circles: createTournamentCircleGrid(TOURNAMENT_CONFIG.circleCount),
        currentLevel: 1,
        timeInCurrentLevel: 0,
        activeCircleIds: [],
        circleTimeouts: new Map(),
        activationTimeout: null,
        levelUpdateInterval: null,
        isActive: true,
        gameStartTime, // Also in main state for consistency
    };
};

export const getTournamentLevelConfig = (level: number): SurvivalLevelConfig => {
    const clampedLevel = Math.max(1, Math.min(level, TOURNAMENT_LEVELS.length));
    return TOURNAMENT_LEVELS[clampedLevel - 1];
};

// Precise time tracking for tournament
export const updateTournamentLevel = (
    state: SurvivalGameState,
    currentTime?: number
): SurvivalGameState => {
    if (!state.isActive || !state.gameStartTime) {
        console.warn('Tournament game not active or missing start time');
        return state;
    }

    const now = currentTime || Date.now();

    // Ensure we have a valid start time
    if (!state.gameStartTime || state.gameStartTime <= 0) {
        console.warn('Invalid game start time, resetting');
        return {
            ...state,
            gameStartTime: now,
            stats: {
                ...state.stats,
                gameStartTime: now,
                survivalTime: 0,
            }
        };
    }

    const actualSurvivalTime = Math.max(0, now - state.gameStartTime);
    const newTimeInCurrentLevel = actualSurvivalTime - ((state.currentLevel - 1) * state.config.intensityIncreaseInterval * 1000);

    const shouldIncreaseLevel =
        newTimeInCurrentLevel >= state.config.intensityIncreaseInterval * 1000 &&
        state.currentLevel < state.config.maxIntensityLevel;

    if (shouldIncreaseLevel) {
        return {
            ...state,
            currentLevel: state.currentLevel + 1,
            timeInCurrentLevel: 0,
            stats: {
                ...state.stats,
                survivalTime: actualSurvivalTime,
                currentLevel: state.currentLevel + 1,
            },
        };
    }

    return {
        ...state,
        timeInCurrentLevel: newTimeInCurrentLevel,
        stats: {
            ...state.stats,
            survivalTime: actualSurvivalTime,
        },
    };
};

export const getRandomTournamentCircleIds = (
    totalCircles: number,
    targetCount: number,
    excludeIds: number[] = [],
): number[] => {
    const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
        (id) => !excludeIds.includes(id),
    );

    const count = Math.min(targetCount, availableIds.length);
    const selectedIds: number[] = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        const selectedId = availableIds.splice(randomIndex, 1)[0];
        selectedIds.push(selectedId);
    }

    return selectedIds;
};

export const activateTournamentCircles = (
    state: SurvivalGameState,
    onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
    onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): SurvivalGameState => {
    const levelConfig = getTournamentLevelConfig(state.currentLevel);
    const availableSlots = levelConfig.simultaneousCircles - state.activeCircleIds.length;

    if (availableSlots <= 0) return state;

    const selectedIds = getRandomTournamentCircleIds(
        state.config.circleCount,
        availableSlots,
        state.activeCircleIds,
    );

    if (selectedIds.length === 0) return state;

    // Determine red circles
    const whiteCirclesNeeded = Math.max(1, selectedIds.length - levelConfig.redCircles);
    const actualRedCircles = Math.min(levelConfig.redCircles, selectedIds.length - whiteCirclesNeeded);

    const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
    const redIds = actualRedCircles > 0 ? shuffledIds.slice(0, actualRedCircles) : [];

    // Update active circles
    const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
    const newCircleTimeouts = new Map(state.circleTimeouts);

    // Set timeouts for each circle
    selectedIds.forEach((circleId) => {
        const isDecoy = redIds.includes(circleId);
        const timeout = setTimeout(() => {
            onCircleTimeout(circleId, isDecoy);
        }, levelConfig.circleActiveTime);

        newCircleTimeouts.set(circleId, timeout);
    });

    const newCircles = state.circles.map((circle) => {
        if (selectedIds.includes(circle.id)) {
            return {
                ...circle,
                isActive: true,
                isDecoy: redIds.includes(circle.id),
            };
        }
        return circle;
    });

    onCirclesActivated(selectedIds, redIds);

    return {
        ...state,
        activeCircleIds: newActiveCircleIds,
        circleTimeouts: newCircleTimeouts,
        circles: newCircles,
    };
};

export const handleTournamentCircleClick = (
    state: SurvivalGameState,
    clickedCircleId: number,
    clickTime: number = Date.now(),
): { newState: SurvivalGameState; result: "correct" | "wrong" | "decoy" } => {
    const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

    if (!clickedCircle) {
        return { newState: state, result: "wrong" };
    }

    // Update time at click moment
    const updatedState = updateTournamentLevel(state, clickTime);

    if (clickedCircle.isActive && !clickedCircle.isAnimating) {
        if (clickedCircle.isDecoy) {
            // Red circle clicked - game over
            return {
                newState: {
                    ...updatedState,
                    gameState: GameState.FINISHED,
                    isActive: false,
                    stats: {
                        ...updatedState.stats,
                        decoyHits: updatedState.stats.decoyHits + 1,
                    },
                },
                result: "decoy",
            };
        } else {
            // Correct white circle click
            const newStats = {
                ...updatedState.stats,
                correctHits: updatedState.stats.correctHits + 1,
                perfectStreak: updatedState.stats.perfectStreak + 1,
                hitCount: updatedState.stats.hitCount + 1,
            };

            const newCircles = updatedState.circles.map((c) =>
                c.id === clickedCircleId ? { ...c, isAnimating: true } : c,
            );

            return {
                newState: {
                    ...updatedState,
                    stats: newStats,
                    circles: newCircles,
                },
                result: "correct",
            };
        }
    } else {
        // Wrong click on inactive circle - game over
        return {
            newState: {
                ...updatedState,
                gameState: GameState.FINISHED,
                isActive: false,
                stats: {
                    ...updatedState.stats,
                    wrongHits: updatedState.stats.wrongHits + 1,
                },
            },
            result: "wrong",
        };
    }
};

export const deactivateTournamentCircle = (
    state: SurvivalGameState,
    circleId: number,
): SurvivalGameState => {
    const newActiveCircleIds = state.activeCircleIds.filter((id) => id !== circleId);

    const newCircleTimeouts = new Map(state.circleTimeouts);
    const timeout = newCircleTimeouts.get(circleId);

    if (timeout) {
        clearTimeout(timeout);
        newCircleTimeouts.delete(circleId);
    }

    const newCircles = state.circles.map((circle) =>
        circle.id === circleId
            ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
            : circle,
    );

    return {
        ...state,
        activeCircleIds: newActiveCircleIds,
        circleTimeouts: newCircleTimeouts,
        circles: newCircles,
    };
};

export const calculateTournamentScore = (
    stats: SurvivalGameStats,
    level: number,
): number => {
    // Время выживания в секундах (базовая составляющая)
    const survivalTimePoints = Math.floor(stats.survivalTime / 1000);

    // Бонус за достигнутый уровень (без множителя)
    const levelBonus = level;

    // Бонус за правильные попадания (без множителя)
    const correctHitsBonus = stats.correctHits;

    return survivalTimePoints + levelBonus + correctHitsBonus;
};

export const getTournamentDeathCause = (
    stats: SurvivalGameStats,
): SurvivalGameResult["deathCause"] => {
    if (stats.decoyHits > 0) return "decoy_hit";
    if (stats.wrongHits > 0) return "wrong_click";
    if (stats.missedCircles > 0) return "miss";
    return "timeout";
};

export const createTournamentGameResult = (
    state: SurvivalGameState,
): SurvivalGameResult => {
    // Final time update to ensure accuracy
    const finalState = updateTournamentLevel(state, Date.now());
    const finalScore = calculateTournamentScore(finalState.stats, finalState.currentLevel);
    const deathCause = getTournamentDeathCause(finalState.stats);

    return {
        mode: GameMode.SURVIVAL,
        score: finalScore,
        duration: Math.floor(finalState.stats.survivalTime / 1000),
        survivalTime: finalState.stats.survivalTime,
        maxLevelReached: finalState.currentLevel,
        perfectStreak: finalState.stats.perfectStreak,
        correctHits: finalState.stats.correctHits,
        deathCause,
        createdAt: new Date().toISOString(),
    };
};

export const cleanupTournamentGame = (state: SurvivalGameState): void => {
    state.circleTimeouts.forEach((timeout) => clearTimeout(timeout));
    if (state.activationTimeout) {
        clearTimeout(state.activationTimeout);
    }
    if (state.levelUpdateInterval) {
        clearInterval(state.levelUpdateInterval);
    }
};

export const formatTournamentTime = (milliseconds: number): string => {
    // Ensure we handle edge cases properly
    if (milliseconds < 0 || isNaN(milliseconds) || !isFinite(milliseconds)) {
        return "0.000s";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    }

    return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};