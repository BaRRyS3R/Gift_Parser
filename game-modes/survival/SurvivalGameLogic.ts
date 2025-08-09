// src/game-modes/survival/SurvivalGameLogic.ts - Модифицированная версия с интеграцией анти-чит системы

import {
  SurvivalGameConfig,
  SurvivalGameStats,
  SurvivalGameResult,
  SurvivalGameState,
  SurvivalLevelConfig,
} from "@/types/game-modes/survival";
import { Circle, GameState, GameMode } from "@/types/game-modes/common";

// Расширенное состояние игры с поддержкой анти-чит системы
export interface SurvivalGameStateWithAntiCheat extends SurvivalGameState {
  antiCheat: {
    circleActivationTimes: Map<number, number>;
    isEnabled: boolean;
  };
}

// Расширенный результат клика с информацией о времени реакции
export interface SurvivalClickResult {
  newState: SurvivalGameStateWithAntiCheat;
  result: "correct" | "wrong" | "decoy";
  reactionTime?: number;
  activationTime?: number;
}

// Утилитарная функция для проверки наличия анти-чит данных
export function hasAntiCheatData(state: SurvivalGameState): state is SurvivalGameStateWithAntiCheat {
  return 'antiCheat' in state && state.antiCheat !== undefined;
}

// Утилитарная функция для создания состояния с анти-чит данными
export function ensureAntiCheatState(state: SurvivalGameState): SurvivalGameStateWithAntiCheat {
  if (hasAntiCheatData(state)) {
    return state;
  }

  return {
    ...state,
    antiCheat: {
      circleActivationTimes: new Map<number, number>(),
      isEnabled: SURVIVAL_ANTICHEAT_CONFIG.ENABLE_TRACKING,
    },
  };
}

// Конфигурация анти-чит системы для Survival режима
export const SURVIVAL_ANTICHEAT_CONFIG = {
  SUSPICIOUS_REACTION_TIME_MS: 600, // пороговое значение для тестирования
  ENABLE_TRACKING: true,
  LOG_SUSPICIOUS_CLICKS: false, // отключено для production
} as const;

// Все существующие константы остаются без изменений
export const SURVIVAL_CONFIG: SurvivalGameConfig = {
  id: "survival",
  name: "SURVIVAL MODE",
  circleCount: 25,
  initialActivationTimeMin: 1000,
  initialActivationTimeMax: 1800,
  initialCircleActiveTime: 2000,
  intensityIncreaseInterval: 8,
  maxIntensityLevel: 15,
  simultaneousCirclesMin: 1,
  simultaneousCirclesMax: 4,
  circleReactivationCooldown: 2000,
  maxHistoryRetention: 5000,
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

// Существующие функции остаются без изменений
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
  maxAge: number = SURVIVAL_CONFIG.maxHistoryRetention
): Map<number, number> => {
  const currentTime = Date.now();
  const cleanedMap = new Map<number, number>();

  recentlyUsedCircles.forEach((timestamp, circleId) => {
    if ((currentTime - timestamp) < maxAge) {
      cleanedMap.set(circleId, timestamp);
    }
  });

  return cleanedMap;
};

// Модифицированная функция инициализации с поддержкой анти-чит
export const initializeSurvivalGameState = (): SurvivalGameStateWithAntiCheat => {
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
    antiCheat: {
      circleActivationTimes: new Map<number, number>(),
      isEnabled: SURVIVAL_ANTICHEAT_CONFIG.ENABLE_TRACKING,
    },
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
): SurvivalGameStateWithAntiCheat => {
  const stateWithAntiCheat = ensureAntiCheatState(state);

  if (!stateWithAntiCheat.isActive || !stateWithAntiCheat.gameStartTime || stateWithAntiCheat.isGameEnding) {
    return stateWithAntiCheat;
  }

  const now = currentTime || Date.now();
  const actualSurvivalTime = now - stateWithAntiCheat.gameStartTime;
  const newTimeInCurrentLevel =
    actualSurvivalTime -
    (stateWithAntiCheat.currentLevel - 1) * stateWithAntiCheat.config.intensityIncreaseInterval * 1000;

  const shouldIncreaseLevel =
    newTimeInCurrentLevel >= stateWithAntiCheat.config.intensityIncreaseInterval * 1000 &&
    stateWithAntiCheat.currentLevel < stateWithAntiCheat.config.maxIntensityLevel;

  const cleanedRecentlyUsed = cleanupOldEntries(stateWithAntiCheat.recentlyUsedCircles);

  if (shouldIncreaseLevel) {
    const newLevel = stateWithAntiCheat.currentLevel + 1;
    const levelConfig = getLevelConfig(newLevel);

    return {
      ...stateWithAntiCheat,
      currentLevel: newLevel,
      timeInCurrentLevel: 0,
      recentlyUsedCircles: cleanedRecentlyUsed,
      stats: {
        ...stateWithAntiCheat.stats,
        survivalTime: actualSurvivalTime,
        currentLevel: newLevel,
      },
    };
  }

  return {
    ...stateWithAntiCheat,
    timeInCurrentLevel: newTimeInCurrentLevel,
    recentlyUsedCircles: cleanedRecentlyUsed,
    stats: {
      ...stateWithAntiCheat.stats,
      survivalTime: actualSurvivalTime,
    },
  };
};

const getAvailableCircleIds = (
  totalCircles: number,
  excludeIds: number[],
  recentlyUsedCircles: Map<number, number>,
  cooldownMs: number = SURVIVAL_CONFIG.circleReactivationCooldown
): number[] => {
  const currentTime = Date.now();

  return Array.from({ length: totalCircles }, (_, i) => i).filter(id => {
    if (excludeIds.includes(id)) return false;

    const lastUsedTime = recentlyUsedCircles.get(id);
    if (lastUsedTime && (currentTime - lastUsedTime) < cooldownMs) {
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
    cooldownMs
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

// Модифицированная функция активации кругов с записью времени активации
export const activateSurvivalCircles = (
  state: SurvivalGameState,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): SurvivalGameStateWithAntiCheat => {
  const stateWithAntiCheat = ensureAntiCheatState(state);

  if (!stateWithAntiCheat.isActive || stateWithAntiCheat.gameState !== GameState.PLAYING || stateWithAntiCheat.isGameEnding) {
    return stateWithAntiCheat;
  }

  const levelConfig = getLevelConfig(stateWithAntiCheat.currentLevel);
  const availableSlots = levelConfig.simultaneousCircles - stateWithAntiCheat.activeCircleIds.length;

  if (availableSlots <= 0) {
    return stateWithAntiCheat;
  }

  const selectedIds = getRandomCircleIds(
    stateWithAntiCheat.config.circleCount,
    availableSlots,
    stateWithAntiCheat.activeCircleIds,
    stateWithAntiCheat.recentlyUsedCircles,
    stateWithAntiCheat.config.circleReactivationCooldown,
  );

  if (selectedIds.length === 0) {
    return stateWithAntiCheat;
  }

  const currentTime = Date.now();
  const updatedRecentlyUsed = new Map(stateWithAntiCheat.recentlyUsedCircles);
  selectedIds.forEach(id => {
    updatedRecentlyUsed.set(id, currentTime);
  });

  const whiteCirclesNeeded = Math.max(1, selectedIds.length - levelConfig.redCircles);
  const actualRedCircles = Math.min(
    levelConfig.redCircles,
    selectedIds.length - whiteCirclesNeeded,
  );

  const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
  const redIds = actualRedCircles > 0 ? shuffledIds.slice(0, actualRedCircles) : [];
  const whiteIds = selectedIds.filter(id => !redIds.includes(id));

  const newActiveCircleIds = [...stateWithAntiCheat.activeCircleIds, ...selectedIds];
  const newCircleTimeouts = new Map(stateWithAntiCheat.circleTimeouts);

  // Обновляем анти-чит данные - записываем время активации для белых кругов
  const updatedAntiCheat = { ...stateWithAntiCheat.antiCheat };
  if (stateWithAntiCheat.antiCheat.isEnabled) {
    whiteIds.forEach(circleId => {
      updatedAntiCheat.circleActivationTimes.set(circleId, currentTime);
    });
  }

  selectedIds.forEach((circleId) => {
    const isDecoy = redIds.includes(circleId);

    const timeout = setTimeout(() => {
      if (!stateWithAntiCheat.isActive || stateWithAntiCheat.isGameEnding) {
        return;
      }
      onCircleTimeout(circleId, isDecoy);
    }, levelConfig.circleActiveTime);

    newCircleTimeouts.set(circleId, timeout);
  });

  const newCircles = stateWithAntiCheat.circles.map((circle) => {
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
    ...stateWithAntiCheat,
    activeCircleIds: newActiveCircleIds,
    circleTimeouts: newCircleTimeouts,
    circles: newCircles,
    recentlyUsedCircles: updatedRecentlyUsed,
    antiCheat: updatedAntiCheat,
  };
};

// Модифицированная функция обработки кликов с расчетом времени реакции
export const handleSurvivalCircleClick = (
  state: SurvivalGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): SurvivalClickResult => {
  const stateWithAntiCheat = ensureAntiCheatState(state);
  const clickedCircle = stateWithAntiCheat.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    return {
      newState: stateWithAntiCheat,
      result: "wrong",
      reactionTime: undefined,
      activationTime: undefined,
    };
  }

  if (stateWithAntiCheat.isGameEnding) {
    return {
      newState: stateWithAntiCheat,
      result: "wrong",
      reactionTime: undefined,
      activationTime: undefined,
    };
  }

  const updatedState = updateSurvivalLevel(stateWithAntiCheat, clickTime);

  // Получаем время активации для анти-чит анализа
  let reactionTime: number | undefined;
  let activationTime: number | undefined;

  if (updatedState.antiCheat.isEnabled && clickedCircle.isActive && !clickedCircle.isDecoy) {
    activationTime = updatedState.antiCheat.circleActivationTimes.get(clickedCircleId);
    if (activationTime) {
      reactionTime = clickTime - activationTime;
    }
  }

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
        reactionTime,
        activationTime,
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
        reactionTime,
        activationTime,
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
      reactionTime,
      activationTime,
    };
  }
};

// Модифицированная функция деактивации с очисткой анти-чит данных
export const deactivateSurvivalCircle = (
  state: SurvivalGameState,
  circleId: number,
): SurvivalGameStateWithAntiCheat => {
  const stateWithAntiCheat = ensureAntiCheatState(state);
  const newActiveCircleIds = stateWithAntiCheat.activeCircleIds.filter((id) => id !== circleId);
  const newCircleTimeouts = new Map(stateWithAntiCheat.circleTimeouts);
  const timeout = newCircleTimeouts.get(circleId);

  if (timeout) {
    clearTimeout(timeout);
    newCircleTimeouts.delete(circleId);
  }

  // Очищаем анти-чит данные для деактивируемого круга
  const updatedAntiCheat = { ...stateWithAntiCheat.antiCheat };
  if (stateWithAntiCheat.antiCheat.isEnabled) {
    updatedAntiCheat.circleActivationTimes.delete(circleId);
  }

  const newCircles = stateWithAntiCheat.circles.map((circle) =>
    circle.id === circleId
      ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
      : circle,
  );

  return {
    ...stateWithAntiCheat,
    activeCircleIds: newActiveCircleIds,
    circleTimeouts: newCircleTimeouts,
    circles: newCircles,
    antiCheat: updatedAntiCheat,
  };
};

// Остальные функции остаются без изменений
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
  const stateWithAntiCheat = ensureAntiCheatState(state);
  const finalState = updateSurvivalLevel(stateWithAntiCheat, Date.now());
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

// Модифицированная функция очистки с очисткой анти-чит данных
export const cleanupSurvivalGame = (state: SurvivalGameState): void => {
  const stateWithAntiCheat = ensureAntiCheatState(state);
  stateWithAntiCheat.isGameEnding = true;

  stateWithAntiCheat.circleTimeouts.forEach((timeout) => {
    clearTimeout(timeout);
  });
  stateWithAntiCheat.circleTimeouts.clear();

  if (stateWithAntiCheat.activationTimeout) {
    clearTimeout(stateWithAntiCheat.activationTimeout);
    stateWithAntiCheat.activationTimeout = null;
  }

  if (stateWithAntiCheat.levelUpdateInterval) {
    clearInterval(stateWithAntiCheat.levelUpdateInterval);
    stateWithAntiCheat.levelUpdateInterval = null;
  }

  if (stateWithAntiCheat.pendingActivationTimeouts) {
    stateWithAntiCheat.pendingActivationTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    stateWithAntiCheat.pendingActivationTimeouts.clear();
  }

  // Очищаем анти-чит данные
  if (hasAntiCheatData(stateWithAntiCheat) && stateWithAntiCheat.antiCheat.isEnabled) {
    stateWithAntiCheat.antiCheat.circleActivationTimes.clear();
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