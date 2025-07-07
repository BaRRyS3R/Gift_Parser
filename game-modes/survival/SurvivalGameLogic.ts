// src/game-modes/survival/SurvivalGameLogic.ts - Исправлено для точного учета времени

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
  circleCount: 36, // 6x6 grid
  initialActivationTimeMin: 1000,
  initialActivationTimeMax: 1800,
  initialCircleActiveTime: 2000,
  intensityIncreaseInterval: 8, // seconds
  maxIntensityLevel: 15,
  simultaneousCirclesMin: 1,
  simultaneousCirclesMax: 4,
};

export const SURVIVAL_LEVELS: SurvivalLevelConfig[] = [
  // Уровни 1-4 без изменений
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
  // Обновленные уровни 5-15
  {
    level: 5,
    simultaneousCircles: 5,  // было 6
    redCircles: 1,          // было 2
    activationTimeMin: 850, // было 800
    activationTimeMax: 1500,// было 1400
    circleActiveTime: 1800, // было 1700
    description: "MULTI-TARGET",
  },
  {
    level: 6,
    simultaneousCircles: 6,  // было 8
    redCircles: 2,          // было 3
    activationTimeMin: 800, // было 750
    activationTimeMax: 1400,// было 1300
    circleActiveTime: 1700, // было 1600
    description: "ENHANCED DIFFICULTY",
  },
  {
    level: 7,
    simultaneousCircles: 7,  // было 10
    redCircles: 2,          // было 4
    activationTimeMin: 750, // было 700
    activationTimeMax: 1300,// было 1200
    circleActiveTime: 1600, // было 1500
    description: "INTENSE FOCUS",
  },
  {
    level: 8,
    simultaneousCircles: 8,  // было 12
    redCircles: 3,          // было 5
    activationTimeMin: 700, // было 650
    activationTimeMax: 1200,// было 1100
    circleActiveTime: 1500, // было 1400
    description: "OVERWHELMING",
  },
  {
    level: 9,
    simultaneousCircles: 10, // было 15
    redCircles: 4,          // было 7
    activationTimeMin: 650, // было 600
    activationTimeMax: 1100,// было 1000
    circleActiveTime: 1400, // было 1300
    description: "CHAOS MANAGEMENT",
  },
  {
    level: 10,
    simultaneousCircles: 12, // было 18
    redCircles: 5,          // было 8
    activationTimeMin: 600, // было 550
    activationTimeMax: 1000,// было 950
    circleActiveTime: 1300, // было 1200
    description: "EXPERT PRECISION",
  },
  {
    level: 11,
    simultaneousCircles: 15, // было 22
    redCircles: 6,          // было 10
    activationTimeMin: 550, // было 500
    activationTimeMax: 950, // было 900
    circleActiveTime: 1200, // было 1100
    description: "MASTER LEVEL",
  },
  {
    level: 12,
    simultaneousCircles: 18, // было 26
    redCircles: 7,          // было 12
    activationTimeMin: 500, // было 450
    activationTimeMax: 900, // было 850
    circleActiveTime: 1100, // было 1000
    description: "LEGENDARY SKILL",
  },
  {
    level: 13,
    simultaneousCircles: 22, // было 30
    redCircles: 8,          // было 14
    activationTimeMin: 450, // было 400
    activationTimeMax: 850, // было 800
    circleActiveTime: 1000, // было 900
    description: "SUPERHUMAN",
  },
  {
    level: 14,
    simultaneousCircles: 26, // было 35
    redCircles: 10,         // было 16
    activationTimeMin: 400, // было 350
    activationTimeMax: 800, // было 750
    circleActiveTime: 900,  // было 800
    description: "BEYOND LIMITS",
  },
  {
    level: 15,
    simultaneousCircles: 30, // было 40, теперь 30 (макс. 36 возможно)
    redCircles: 12,         // было 18
    activationTimeMin: 350, // было 300
    activationTimeMax: 750, // было 700
    circleActiveTime: 800,  // было 700
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
      gameStartTime, // ДОБАВЛЕНО: точное время начала игры
    },
    circles: createSurvivalCircleGrid(SURVIVAL_CONFIG.circleCount),
    currentLevel: 1,
    timeInCurrentLevel: 0,
    activeCircleIds: [],
    circleTimeouts: new Map(),
    activationTimeout: null,
    levelUpdateInterval: null,
    isActive: true,
    gameStartTime, // ДОБАВЛЕНО: также в основное состояние
  };
};

export const getLevelConfig = (level: number): SurvivalLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, SURVIVAL_LEVELS.length));
  return SURVIVAL_LEVELS[clampedLevel - 1];
};

// ИЗМЕНЕНО: теперь использует реальное время вместо deltaTime
export const updateSurvivalLevel = (
  state: SurvivalGameState,
  currentTime?: number // ДОБАВЛЕНО: опциональный параметр для текущего времени
): SurvivalGameState => {
  if (!state.isActive || !state.gameStartTime) return state;

  const now = currentTime || Date.now();
  const actualSurvivalTime = now - state.gameStartTime; // ТОЧНОЕ время выживания
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
        survivalTime: actualSurvivalTime, // ТОЧНОЕ время
        currentLevel: state.currentLevel + 1,
      },
    };
  }

  return {
    ...state,
    timeInCurrentLevel: newTimeInCurrentLevel,
    stats: {
      ...state.stats,
      survivalTime: actualSurvivalTime, // ТОЧНОЕ время
    },
  };
};

export const getRandomCircleIds = (
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

export const activateSurvivalCircles = (
  state: SurvivalGameState,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): SurvivalGameState => {
  const levelConfig = getLevelConfig(state.currentLevel);
  const availableSlots =
    levelConfig.simultaneousCircles - state.activeCircleIds.length;

  if (availableSlots <= 0) return state;

  const selectedIds = getRandomCircleIds(
    state.config.circleCount,
    availableSlots,
    state.activeCircleIds,
  );

  if (selectedIds.length === 0) return state;

  // Determine red circles
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

export const handleSurvivalCircleClick = (
  state: SurvivalGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: SurvivalGameState; result: "correct" | "wrong" | "decoy" } => {
  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    return { newState: state, result: "wrong" };
  }

  // ОБНОВЛЯЕМ время выживания при каждом клике
  const updatedState = updateSurvivalLevel(state, clickTime);

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
  const baseScore = Math.floor(stats.survivalTime / 1000);
  const streakBonus = stats.perfectStreak * 3;
  const levelBonus = Math.floor(level * 15);

  return baseScore + streakBonus + levelBonus;
};

export const getSurvivalDeathCause = (
  stats: SurvivalGameStats,
): SurvivalGameResult["deathCause"] => {
  if (stats.decoyHits > 0) return "decoy_hit";
  if (stats.wrongHits > 0) return "wrong_click";
  if (stats.missedCircles > 0) return "miss";

  return "timeout";
};

export const createSurvivalGameResult = (
  state: SurvivalGameState,
): SurvivalGameResult => {
  // ФИНАЛЬНОЕ обновление времени на момент завершения игры
  const finalState = updateSurvivalLevel(state, Date.now());
  const finalScore = calculateSurvivalScore(finalState.stats, finalState.currentLevel);
  const deathCause = getSurvivalDeathCause(finalState.stats);

  return {
    mode: GameMode.SURVIVAL,
    score: finalScore,
    duration: Math.floor(finalState.stats.survivalTime / 1000),
    survivalTime: finalState.stats.survivalTime, // ТОЧНОЕ время в миллисекундах
    maxLevelReached: finalState.currentLevel,
    perfectStreak: finalState.stats.perfectStreak,
    correctHits: finalState.stats.correctHits,
    deathCause,
    createdAt: new Date().toISOString(),
  };
};

export const cleanupSurvivalGame = (state: SurvivalGameState): void => {
  state.circleTimeouts.forEach((timeout) => clearTimeout(timeout));
  if (state.activationTimeout) {
    clearTimeout(state.activationTimeout);
  }
  if (state.levelUpdateInterval) {
    clearInterval(state.levelUpdateInterval);
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