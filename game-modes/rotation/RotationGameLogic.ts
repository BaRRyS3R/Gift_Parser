// src/game-modes/rotation/RotationGameLogic.ts - Cleaned version without debug logging

import {
  RotationGameConfig,
  RotationGameStats,
  RotationGameResult,
  RotationGameState,
  RotationLevelConfig,
  RotationCircle,
} from "@/types/game-modes/rotation";
import { GameState, GameMode } from "@/types/game-modes/common";

export const ROTATION_CONFIG: RotationGameConfig = {
  id: "rotation",
  name: "ROTATION MODE",
  circleCount: 8,
  radius: 140,
  initialRotationSpeed: 0.02,
  initialActivationTimeMin: 1500,
  initialActivationTimeMax: 2500,
  initialCircleActiveTime: 2500,
  intensityIncreaseInterval: 10,
  maxIntensityLevel: 10,
  simultaneousCirclesMin: 1,
  simultaneousCirclesMax: 2,
};

export const ROTATION_LEVELS: RotationLevelConfig[] = [
  {
    level: 1,
    simultaneousCircles: 1,
    redCircles: 0,
    activationTimeMin: 1800,
    activationTimeMax: 2800,
    circleActiveTime: 3000,
    rotationSpeed: 0.015,
    description: "GENTLE SPIN",
  },
  {
    level: 2,
    simultaneousCircles: 2,
    redCircles: 1,
    activationTimeMin: 1500,
    activationTimeMax: 2500,
    circleActiveTime: 2800,
    rotationSpeed: 0.03,
    description: "STEADY ROTATION",
  },
  {
    level: 3,
    simultaneousCircles: 2,
    redCircles: 2,
    activationTimeMin: 1400,
    activationTimeMax: 2400,
    circleActiveTime: 2600,
    rotationSpeed: 0.035,
    description: "PICKING UP SPEED",
  },
  {
    level: 4,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 1200,
    activationTimeMax: 2200,
    circleActiveTime: 2400,
    rotationSpeed: 0.045,
    description: "FASTER SPIN",
  },
  {
    level: 5,
    simultaneousCircles: 3,
    redCircles: 2,
    activationTimeMin: 1100,
    activationTimeMax: 2000,
    circleActiveTime: 2200,
    rotationSpeed: 0.055,
    description: "RAPID ROTATION",
  },
  {
    level: 6,
    simultaneousCircles: 4,
    redCircles: 2,
    activationTimeMin: 1000,
    activationTimeMax: 1800,
    circleActiveTime: 2000,
    rotationSpeed: 0.065,
    description: "MULTI TARGETS",
  },
  {
    level: 7,
    simultaneousCircles: 3,
    redCircles: 3,
    activationTimeMin: 900,
    activationTimeMax: 1600,
    circleActiveTime: 1800,
    rotationSpeed: 0.075,
    description: "DANGER ZONE",
  },
  {
    level: 8,
    simultaneousCircles: 4,
    redCircles: 3,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1600,
    rotationSpeed: 0.085,
    description: "HIGH VELOCITY",
  },
  {
    level: 9,
    simultaneousCircles: 5,
    redCircles: 2,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1400,
    rotationSpeed: 0.095,
    description: "EXTREME SPIN",
  },
  {
    level: 10,
    simultaneousCircles: 4,
    redCircles: 4,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1200,
    rotationSpeed: 0.1,
    description: "MAXIMUM ROTATION",
  },
];

export const createRotationCircleSet = (
  count: number,
  radius: number,
): RotationCircle[] => {
  const angleStep = (2 * Math.PI) / count;

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
    angle: index * angleStep,
  }));
};

export const initializeRotationGameState = (): RotationGameState => {
  const gameStartTime = Date.now();

  return {
    config: ROTATION_CONFIG,
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
    circles: createRotationCircleSet(
      ROTATION_CONFIG.circleCount,
      ROTATION_CONFIG.radius,
    ),
    currentLevel: 1,
    timeInCurrentLevel: 0,
    activeCircleIds: [],
    circleTimeouts: new Map(),
    activationTimeout: null,
    levelUpdateInterval: null,
    rotationAnimationFrame: null,
    isActive: true,
    gameStartTime,
    currentRotationSpeed: ROTATION_LEVELS[0].rotationSpeed,
    isGameEnding: false,
    pendingActivationTimeouts: new Set(),
    circleActivationTimes: new Map(),
  };
};

export const getLevelConfig = (level: number): RotationLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, ROTATION_LEVELS.length));

  return ROTATION_LEVELS[clampedLevel - 1];
};

export const updateRotationLevel = (
  state: RotationGameState,
  currentTime?: number,
): RotationGameState => {
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

  if (shouldIncreaseLevel) {
    const newLevel = state.currentLevel + 1;
    const levelConfig = getLevelConfig(newLevel);

    const preservedCircles = state.circles.map((circle) => ({
      ...circle,
    }));

    return {
      ...state,
      currentLevel: newLevel,
      timeInCurrentLevel: 0,
      currentRotationSpeed: levelConfig.rotationSpeed,
      circles: preservedCircles,
      stats: {
        ...state.stats,
        survivalTime: actualSurvivalTime,
        currentLevel: newLevel,
      },
      activeCircleIds: state.activeCircleIds,
      circleTimeouts: state.circleTimeouts,
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

export const activateRotationCircles = (
  state: RotationGameState,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): RotationGameState => {
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
  );

  if (selectedIds.length === 0) {
    return state;
  }

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

  const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
  const newCircleTimeouts = new Map(state.circleTimeouts);
  const newPendingTimeouts = new Set(state.pendingActivationTimeouts);
  const newActivationTimes = new Map(state.circleActivationTimes);

  const currentTime = Date.now();

  selectedIds.forEach((circleId) => {
    const isDecoy = redIds.includes(circleId);

    // Store activation time for reaction time calculation
    if (!isDecoy) {
      newActivationTimes.set(circleId, currentTime);
    }

    const timeout = setTimeout(() => {
      if (!state.isActive || state.isGameEnding) {
        return;
      }
      onCircleTimeout(circleId, isDecoy);
    }, levelConfig.circleActiveTime);

    newCircleTimeouts.set(circleId, timeout);
    newPendingTimeouts.add(timeout);
  });

  const newCircles = state.circles.map((circle) => {
    if (selectedIds.includes(circle.id)) {
      return {
        ...circle,
        isActive: true,
        isDecoy: redIds.includes(circle.id),
        isAnimating: false,
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
    pendingActivationTimeouts: newPendingTimeouts,
    circleActivationTimes: newActivationTimes,
  };
};

export const handleRotationCircleClick = (
  state: RotationGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: RotationGameState; result: "correct" | "wrong" | "decoy" } => {
  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    return { newState: state, result: "wrong" };
  }

  if (state.isGameEnding) {
    return { newState: state, result: "wrong" };
  }

  const updatedState = updateRotationLevel(state, clickTime);

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
      // Calculate reaction time
      const activationTime =
        updatedState.circleActivationTimes.get(clickedCircleId);
      const actualReactionTime = activationTime
        ? clickTime - activationTime
        : 0;

      const newStats = {
        ...updatedState.stats,
        correctHits: updatedState.stats.correctHits + 1,
        perfectStreak: updatedState.stats.perfectStreak + 1,
        hitCount: updatedState.stats.hitCount + 1,
        totalReactionTime:
          updatedState.stats.totalReactionTime + actualReactionTime,
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

export const deactivateRotationCircle = (
  state: RotationGameState,
  circleId: number,
): RotationGameState => {
  const newActiveCircleIds = state.activeCircleIds.filter(
    (id) => id !== circleId,
  );

  const newCircleTimeouts = new Map(state.circleTimeouts);
  const timeout = newCircleTimeouts.get(circleId);

  if (timeout) {
    clearTimeout(timeout);
    newCircleTimeouts.delete(circleId);
  }

  // Clean up activation time
  const newActivationTimes = new Map(state.circleActivationTimes);

  newActivationTimes.delete(circleId);

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
    circleActivationTimes: newActivationTimes,
  };
};

export const calculateRotationScore = (
  stats: RotationGameStats,
  level: number,
): number => {
  const baseScore = Math.floor(stats.survivalTime / 1000);
  const streakBonus = stats.perfectStreak * 4;
  const levelBonus = level;

  return baseScore + streakBonus + levelBonus;
};

export const getRotationDeathCause = (
  stats: RotationGameStats,
): RotationGameResult["deathCause"] => {
  if (stats.decoyHits > 0) return "decoy_hit";
  if (stats.wrongHits > 0) return "wrong_click";
  if (stats.missedCircles > 0) return "miss";

  return "timeout";
};

export const createRotationGameResult = (
  state: RotationGameState,
): RotationGameResult => {
  const timeScore = Math.floor(state.stats.survivalTime / 1000);
  const levelScore = state.currentLevel;
  const hitsScore = state.stats.correctHits;

  const finalScore = timeScore + levelScore + hitsScore;
  const deathCause = getRotationDeathCause(state.stats);

  const averageReactionTime =
    state.stats.hitCount > 0
      ? state.stats.totalReactionTime / state.stats.hitCount
      : 0;

  return {
    mode: GameMode.ROTATION,
    score: finalScore,
    duration: Math.floor(state.stats.survivalTime / 1000),
    survivalTime: state.stats.survivalTime,
    maxLevelReached: state.currentLevel,
    perfectStreak: state.stats.perfectStreak,
    correctHits: state.stats.correctHits,
    deathCause,
    averageReactionTime,
    createdAt: new Date().toISOString(),
  };
};

export const cleanupRotationGame = (state: RotationGameState): void => {
  state.isGameEnding = true;

  state.circleTimeouts.forEach((timeout) => {
    if (timeout) clearTimeout(timeout);
  });
  state.circleTimeouts.clear();

  if (state.pendingActivationTimeouts) {
    state.pendingActivationTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    state.pendingActivationTimeouts.clear();
  }

  if (state.activationTimeout) {
    clearTimeout(state.activationTimeout);
    state.activationTimeout = null;
  }
  if (state.levelUpdateInterval) {
    clearInterval(state.levelUpdateInterval);
    state.levelUpdateInterval = null;
  }
  if (state.rotationAnimationFrame) {
    cancelAnimationFrame(state.rotationAnimationFrame);
  }

  state.circleActivationTimes.clear(); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
};

export const formatRotationTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};
