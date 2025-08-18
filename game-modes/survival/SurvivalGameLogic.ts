// src/game-modes/survival/SurvivalGameLogic.ts - Removed logging while preserving game functionality

import {
  SurvivalGameConfig,
  SurvivalGameStats,
  SurvivalGameResult,
  SurvivalGameState,
  SurvivalLevelConfig,
} from "@/types/game-modes/survival";
import { Circle, GameState, GameMode } from "@/types/game-modes/common";

export const SURVIVAL_CONFIG: SurvivalGameConfig = {
  id: "survival",
  name: "SURVIVAL MODE",
  circleCount: 25, // 6x6 grid
  initialActivationTimeMin: 1000,
  initialActivationTimeMax: 1800,
  initialCircleActiveTime: 2000,
  intensityIncreaseInterval: 8, // seconds
  maxIntensityLevel: 15,
  simultaneousCirclesMin: 1,
  simultaneousCirclesMax: 4,
  circleReactivationCooldown: 2000, // 2 seconds
  maxHistoryRetention: 5000, // 5 seconds retention
};

export const SURVIVAL_LEVELS: SurvivalLevelConfig[] = [
  {
    level: 1,
    simultaneousCircles: 1,
    redCircles: 0,
    activationTimeMin: 1200,
    activationTimeMax: 2000,
    circleActiveTime: 2500,
    description: "WARMING UP",
  },
  {
    level: 2,
    simultaneousCircles: 2,
    redCircles: 0,
    activationTimeMin: 1100,
    activationTimeMax: 1900,
    circleActiveTime: 2300,
    description: "GETTING STARTED",
  },
  {
    level: 3,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 1000,
    activationTimeMax: 1700,
    circleActiveTime: 2100,
    description: "BASIC PRECISION",
  },
  {
    level: 4,
    simultaneousCircles: 4,
    redCircles: 1,
    activationTimeMin: 900,
    activationTimeMax: 1600,
    circleActiveTime: 1900,
    description: "FOCUS REQUIRED",
  },
  {
    level: 5,
    simultaneousCircles: 5,
    redCircles: 1,
    activationTimeMin: 850,
    activationTimeMax: 1500,
    circleActiveTime: 1800,
    description: "MULTI-TARGET",
  },
  {
    level: 6,
    simultaneousCircles: 6,
    redCircles: 2,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1700,
    description: "ENHANCED DIFFICULTY",
  },
  {
    level: 7,
    simultaneousCircles: 7,
    redCircles: 2,
    activationTimeMin: 750,
    activationTimeMax: 1300,
    circleActiveTime: 1600,
    description: "INTENSE FOCUS",
  },
  {
    level: 8,
    simultaneousCircles: 8,
    redCircles: 3,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1500,
    description: "OVERWHELMING",
  },
  {
    level: 9,
    simultaneousCircles: 10,
    redCircles: 4,
    activationTimeMin: 650,
    activationTimeMax: 1100,
    circleActiveTime: 1400,
    description: "CHAOS MANAGEMENT",
  },
  {
    level: 10,
    simultaneousCircles: 12,
    redCircles: 5,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1300,
    description: "EXPERT PRECISION",
  },
  {
    level: 11,
    simultaneousCircles: 15,
    redCircles: 6,
    activationTimeMin: 550,
    activationTimeMax: 950,
    circleActiveTime: 1200,
    description: "MASTER LEVEL",
  },
  {
    level: 12,
    simultaneousCircles: 16,
    redCircles: 7,
    activationTimeMin: 500,
    activationTimeMax: 900,
    circleActiveTime: 1100,
    description: "LEGENDARY SKILL",
  },
  {
    level: 13,
    simultaneousCircles: 18,
    redCircles: 8,
    activationTimeMin: 450,
    activationTimeMax: 850,
    circleActiveTime: 1000,
    description: "SUPERHUMAN",
  },
  {
    level: 14,
    simultaneousCircles: 18,
    redCircles: 10,
    activationTimeMin: 400,
    activationTimeMax: 800,
    circleActiveTime: 900,
    description: "BEYOND LIMITS",
  },
  {
    level: 15,
    simultaneousCircles: 18,
    redCircles: 8,
    activationTimeMin: 350,
    activationTimeMax: 750,
    circleActiveTime: 800,
    description: "PERFECT MACHINE",
  },
];

export const createSurvivalCircleGrid = (count: number): Circle[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
  }));
};

const cleanupOldEntries = (
  recentlyUsedCircles: Map<number, number>,
  maxAge: number = SURVIVAL_CONFIG.maxHistoryRetention,
): Map<number, number> => {
  const currentTime = Date.now();
  const cleanedMap = new Map<number, number>();

  recentlyUsedCircles.forEach((timestamp, circleId) => {
    if (currentTime - timestamp < maxAge) {
      cleanedMap.set(circleId, timestamp);
    }
  });

  return cleanedMap;
};

export const initializeSurvivalGameState = (): SurvivalGameState => {
  const gameStartTime = Date.now();

  return {
    config: SURVIVAL_CONFIG,
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
      gameStartTime,
    },
    circles: createSurvivalCircleGrid(SURVIVAL_CONFIG.circleCount),
    currentLevel: 1,
    timeInCurrentLevel: 0,
    activeCircleIds: [],
    circleTimeouts: new Map(),
    activationTimeout: null,
    levelUpdateInterval: null,
    isActive: true,
    gameStartTime,
    recentlyUsedCircles: new Map<number, number>(),
    isGameEnding: false,
    pendingActivationTimeouts: new Set(),
  };
};

export const getLevelConfig = (level: number): SurvivalLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, SURVIVAL_LEVELS.length));
  const config = SURVIVAL_LEVELS[clampedLevel - 1];

  return config;
};

export const updateSurvivalLevel = (
  state: SurvivalGameState,
  currentTime?: number,
): SurvivalGameState => {
  // Enhanced state validation
  if (!state.isActive || !state.gameStartTime || state.isGameEnding) {
    return state;
  }

  const now = currentTime || Date.now();
  const actualSurvivalTime = now - state.gameStartTime;
  const newTimeInCurrentLevel =
    actualSurvivalTime -
    (state.currentLevel - 1) * state.config.intensityIncreaseInterval * 1000;

  const shouldIncreaseLevel =
    newTimeInCurrentLevel >= state.config.intensityIncreaseInterval * 1000 &&
    state.currentLevel < state.config.maxIntensityLevel;

  const cleanedRecentlyUsed = cleanupOldEntries(state.recentlyUsedCircles);

  if (shouldIncreaseLevel) {
    const newLevel = state.currentLevel + 1;
    const levelConfig = getLevelConfig(newLevel);

    return {
      ...state,
      currentLevel: newLevel,
      timeInCurrentLevel: 0,
      recentlyUsedCircles: cleanedRecentlyUsed,
      stats: {
        ...state.stats,
        survivalTime: actualSurvivalTime,
        currentLevel: newLevel,
      },
    };
  }

  return {
    ...state,
    timeInCurrentLevel: newTimeInCurrentLevel,
    recentlyUsedCircles: cleanedRecentlyUsed,
    stats: {
      ...state.stats,
      survivalTime: actualSurvivalTime,
    },
  };
};

const getAvailableCircleIds = (
  totalCircles: number,
  excludeIds: number[],
  recentlyUsedCircles: Map<number, number>,
  cooldownMs: number = SURVIVAL_CONFIG.circleReactivationCooldown,
): number[] => {
  const currentTime = Date.now();

  return Array.from({ length: totalCircles }, (_, i) => i).filter((id) => {
    if (excludeIds.includes(id)) return false;

    const lastUsedTime = recentlyUsedCircles.get(id);

    if (lastUsedTime && currentTime - lastUsedTime < cooldownMs) {
      return false;
    }

    return true;
  });
};

export const getRandomCircleIds = (
  totalCircles: number,
  targetCount: number,
  excludeIds: number[] = [],
  recentlyUsedCircles: Map<number, number> = new Map(),
  cooldownMs: number = SURVIVAL_CONFIG.circleReactivationCooldown,
): number[] => {
  const availableIds = getAvailableCircleIds(
    totalCircles,
    excludeIds,
    recentlyUsedCircles,
    cooldownMs,
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

export const activateSurvivalCircles = (
  state: SurvivalGameState,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): SurvivalGameState => {
  // Enhanced state validation before activation
  if (
    !state.isActive ||
    state.gameState !== GameState.PLAYING ||
    state.isGameEnding
  ) {
    return state;
  }

  const levelConfig = getLevelConfig(state.currentLevel);
  const availableSlots =
    levelConfig.simultaneousCircles - state.activeCircleIds.length;

  if (availableSlots <= 0) {
    return state;
  }

  const selectedIds = getRandomCircleIds(
    state.config.circleCount,
    availableSlots,
    state.activeCircleIds,
    state.recentlyUsedCircles,
    state.config.circleReactivationCooldown,
  );

  if (selectedIds.length === 0) {
    return state;
  }

  const currentTime = Date.now();
  const updatedRecentlyUsed = new Map(state.recentlyUsedCircles);

  selectedIds.forEach((id) => {
    updatedRecentlyUsed.set(id, currentTime);
  });

  const whiteCirclesNeeded = Math.max(
    1,
    selectedIds.length - levelConfig.redCircles,
  );
  const actualRedCircles = Math.min(
    levelConfig.redCircles,
    selectedIds.length - whiteCirclesNeeded,
  );

  const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
  const redIds =
    actualRedCircles > 0 ? shuffledIds.slice(0, actualRedCircles) : [];
  const whiteIds = selectedIds.filter((id) => !redIds.includes(id));

  const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
  const newCircleTimeouts = new Map(state.circleTimeouts);

  selectedIds.forEach((circleId) => {
    const isDecoy = redIds.includes(circleId);

    // Enhanced check game state before setting timeout
    const timeout = setTimeout(() => {
      // Double-check game state when timeout fires
      if (!state.isActive || state.isGameEnding) {
        return;
      }

      onCircleTimeout(circleId, isDecoy);
    }, levelConfig.circleActiveTime);

    newCircleTimeouts.set(circleId, timeout);
  });

  const newCircles = state.circles.map((circle) => {
    if (selectedIds.includes(circle.id)) {
      const isDecoy = redIds.includes(circle.id);

      return {
        ...circle,
        isActive: true,
        isDecoy,
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
    recentlyUsedCircles: updatedRecentlyUsed,
  };
};

export const handleSurvivalCircleClick = (
  state: SurvivalGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: SurvivalGameState; result: "correct" | "wrong" | "decoy" } => {
  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    return { newState: state, result: "wrong" };
  }

  // Enhanced check if game is ending
  if (state.isGameEnding) {
    return { newState: state, result: "wrong" };
  }

  const updatedState = updateSurvivalLevel(state, clickTime);

  if (clickedCircle.isActive && !clickedCircle.isAnimating) {
    if (clickedCircle.isDecoy) {
      return {
        newState: {
          ...updatedState,
          gameState: GameState.FINISHED,
          isActive: false,
          isGameEnding: true,
          stats: {
            ...updatedState.stats,
            decoyHits: updatedState.stats.decoyHits + 1,
          },
        },
        result: "decoy",
      };
    } else {
      const newStats = {
        ...updatedState.stats,
        correctHits: updatedState.stats.correctHits + 1,
        perfectStreak: updatedState.stats.perfectStreak + 1,
        hitCount: updatedState.stats.hitCount + 1,
      };

      return {
        newState: {
          ...updatedState,
          stats: newStats,
        },
        result: "correct",
      };
    }
  } else {
    return {
      newState: {
        ...updatedState,
        gameState: GameState.FINISHED,
        isActive: false,
        isGameEnding: true,
        stats: {
          ...updatedState.stats,
          wrongHits: updatedState.stats.wrongHits + 1,
        },
      },
      result: "wrong",
    };
  }
};

export const deactivateSurvivalCircle = (
  state: SurvivalGameState,
  circleId: number,
): SurvivalGameState => {
  const newActiveCircleIds = state.activeCircleIds.filter(
    (id) => id !== circleId,
  );
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

export const calculateSurvivalScore = (
  stats: SurvivalGameStats,
  level: number,
): number => {
  const timeScore = Math.floor(stats.survivalTime / 1000);
  const levelScore = level;
  const clickScore = stats.correctHits;
  const totalScore = timeScore + levelScore + clickScore;

  return totalScore;
};

export const getSurvivalDeathCause = (
  stats: SurvivalGameStats,
): SurvivalGameResult["deathCause"] => {
  let deathCause: SurvivalGameResult["deathCause"];

  if (stats.decoyHits > 0) deathCause = "decoy_hit";
  else if (stats.wrongHits > 0) deathCause = "wrong_click";
  else if (stats.missedCircles > 0) deathCause = "miss";
  else deathCause = "timeout";

  return deathCause;
};

export const createSurvivalGameResult = (
  state: SurvivalGameState,
): SurvivalGameResult => {
  const finalState = updateSurvivalLevel(state, Date.now());
  const finalScore = calculateSurvivalScore(
    finalState.stats,
    finalState.currentLevel,
  );
  const deathCause = getSurvivalDeathCause(finalState.stats);

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

// Enhanced comprehensive cleanup function
export const cleanupSurvivalGame = (state: SurvivalGameState): void => {
  // Set game ending flag to prevent new operations
  state.isGameEnding = true;

  // Clear all circle timeouts
  state.circleTimeouts.forEach((timeout) => {
    clearTimeout(timeout);
  });
  state.circleTimeouts.clear();

  // Clear activation timeout
  if (state.activationTimeout) {
    clearTimeout(state.activationTimeout);
    state.activationTimeout = null;
  }

  // Clear level update interval
  if (state.levelUpdateInterval) {
    clearInterval(state.levelUpdateInterval);
    state.levelUpdateInterval = null;
  }

  // Clear any pending activation timeouts
  if (state.pendingActivationTimeouts) {
    state.pendingActivationTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    state.pendingActivationTimeouts.clear();
  }
};

export const formatSurvivalTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};
