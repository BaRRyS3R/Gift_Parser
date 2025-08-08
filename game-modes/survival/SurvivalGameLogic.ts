// src/game-modes/survival/SurvivalGameLogic.ts - Версия с полным логированием для отладки

import {
  SurvivalGameConfig,
  SurvivalGameStats,
  SurvivalGameResult,
  SurvivalGameState,
  SurvivalLevelConfig,
} from "@/types/game-modes/survival";
import { Circle, GameState, GameMode } from "@/types/game-modes/common";
import {
  GameLogger,
  LogEventType,
  createLogger,
  CircleActivatedEventData,
  PlayerClickEventData,
  CircleDeactivatedEventData,
  CircleTimeoutEventData,
  LevelChangeEventData,
  GameStartEventData,
  GameEndEventData,
  ActivationScheduledEventData,
  ErrorEventData
} from "@/types/game-logging";

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
    simultaneousCircles: 18,
    redCircles: 7,
    activationTimeMin: 500,
    activationTimeMax: 900,
    circleActiveTime: 1100,
    description: "LEGENDARY SKILL",
  },
  {
    level: 13,
    simultaneousCircles: 22,
    redCircles: 8,
    activationTimeMin: 450,
    activationTimeMax: 850,
    circleActiveTime: 1000,
    description: "SUPERHUMAN",
  },
  {
    level: 14,
    simultaneousCircles: 26,
    redCircles: 10,
    activationTimeMin: 400,
    activationTimeMax: 800,
    circleActiveTime: 900,
    description: "BEYOND LIMITS",
  },
  {
    level: 15,
    simultaneousCircles: 30,
    redCircles: 12,
    activationTimeMin: 350,
    activationTimeMax: 750,
    circleActiveTime: 800,
    description: "PERFECT MACHINE",
  },
];

// Расширенный интерфейс состояния игры с логгером
export interface SurvivalGameStateWithLogger extends SurvivalGameState {
  logger: GameLogger;
  circleActivationTimes: Map<number, number>; // Время активации каждого круга
}

export const createSurvivalCircleGrid = (count: number): Circle[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
  }));
};

export const initializeSurvivalGameState = (): SurvivalGameStateWithLogger => {
  const gameStartTime = Date.now();
  const logger = createLogger();

  // Логирование начала игры
  logger.gameStartTime = gameStartTime;
  logger.addEntry(LogEventType.GAME_START, {
    mode: "survival",
    initialLevel: 1,
    circleCount: SURVIVAL_CONFIG.circleCount,
  } as GameStartEventData);

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
    logger,
    circleActivationTimes: new Map(),
  };
};

export const getLevelConfig = (level: number): SurvivalLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, SURVIVAL_LEVELS.length));
  return SURVIVAL_LEVELS[clampedLevel - 1];
};

export const updateSurvivalLevel = (
  state: SurvivalGameStateWithLogger,
  currentTime?: number,
): SurvivalGameStateWithLogger => {
  if (!state.isActive || !state.gameStartTime) return state;

  const now = currentTime || Date.now();
  const actualSurvivalTime = now - state.gameStartTime;
  const newTimeInCurrentLevel =
    actualSurvivalTime -
    (state.currentLevel - 1) * state.config.intensityIncreaseInterval * 1000;

  const shouldIncreaseLevel =
    newTimeInCurrentLevel >= state.config.intensityIncreaseInterval * 1000 &&
    state.currentLevel < state.config.maxIntensityLevel;

  if (shouldIncreaseLevel) {
    // Логирование смены уровня
    state.logger.addEntry(LogEventType.LEVEL_CHANGE, {
      fromLevel: state.currentLevel,
      toLevel: state.currentLevel + 1,
      timeInPreviousLevel: newTimeInCurrentLevel,
      totalSurvivalTime: actualSurvivalTime,
    } as LevelChangeEventData);

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
  state: SurvivalGameStateWithLogger,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): SurvivalGameStateWithLogger => {
  try {
    const levelConfig = getLevelConfig(state.currentLevel);
    const availableSlots = levelConfig.simultaneousCircles - state.activeCircleIds.length;

    if (availableSlots <= 0) {
      // Логируем попытку активации при полной сетке
      state.logger.addEntry(LogEventType.ERROR_OCCURRED, {
        errorType: "ACTIVATION_BLOCKED",
        message: `Cannot activate circles: no available slots (current: ${state.activeCircleIds.length}, max: ${levelConfig.simultaneousCircles})`,
        gameState: {
          level: state.currentLevel,
          activeCircles: state.activeCircleIds.length,
          maxCircles: levelConfig.simultaneousCircles,
        },
      } as ErrorEventData);

      return state;
    }

    const selectedIds = getRandomCircleIds(
      state.config.circleCount,
      availableSlots,
      state.activeCircleIds,
    );

    if (selectedIds.length === 0) {
      state.logger.addEntry(LogEventType.ERROR_OCCURRED, {
        errorType: "NO_CIRCLES_SELECTED",
        message: "No circles could be selected for activation",
        gameState: {
          level: state.currentLevel,
          availableSlots,
          totalCircles: state.config.circleCount,
          activeCircles: state.activeCircleIds,
        },
      } as ErrorEventData);

      return state;
    }

    // Определяем красные круги
    const whiteCirclesNeeded = Math.max(1, selectedIds.length - levelConfig.redCircles);
    const actualRedCircles = Math.min(levelConfig.redCircles, selectedIds.length - whiteCirclesNeeded);
    const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
    const redIds = actualRedCircles > 0 ? shuffledIds.slice(0, actualRedCircles) : [];

    // Генерируем уникальный ID для этой партии кругов
    const batchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activationTime = Date.now();

    // Обновляем активные круги
    const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
    const newCircleTimeouts = new Map(state.circleTimeouts);
    const newCircleActivationTimes = new Map(state.circleActivationTimes);

    // Устанавливаем таймауты для каждого круга
    selectedIds.forEach((circleId) => {
      const isDecoy = redIds.includes(circleId);

      // Сохраняем время активации
      newCircleActivationTimes.set(circleId, activationTime);

      // Логируем активацию круга
      state.logger.addEntry(LogEventType.CIRCLE_ACTIVATED, {
        circleId,
        isDecoy,
        activeTime: levelConfig.circleActiveTime,
        simultaneousCircles: newActiveCircleIds.length,
        currentLevel: state.currentLevel,
        batchId,
      } as CircleActivatedEventData);

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
      circleActivationTimes: newCircleActivationTimes,
    };
  } catch (error) {
    // Логируем любые ошибки в процессе активации
    state.logger.addEntry(LogEventType.ERROR_OCCURRED, {
      errorType: "ACTIVATION_ERROR",
      message: error instanceof Error ? error.message : "Unknown activation error",
      stackTrace: error instanceof Error ? error.stack : undefined,
      gameState: {
        level: state.currentLevel,
        activeCircles: state.activeCircleIds.length,
        circles: state.circles.filter(c => c.isActive).length,
      },
    } as ErrorEventData);

    return state;
  }
};

export const handleSurvivalCircleClick = (
  state: SurvivalGameStateWithLogger,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: SurvivalGameStateWithLogger; result: "correct" | "wrong" | "decoy" } => {
  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    // Логируем клик по несуществующему кругу
    state.logger.addEntry(LogEventType.ERROR_OCCURRED, {
      errorType: "INVALID_CIRCLE_CLICK",
      message: `Click on non-existent circle ID: ${clickedCircleId}`,
      gameState: {
        totalCircles: state.circles.length,
        clickedId: clickedCircleId,
      },
    } as ErrorEventData);

    return { newState: state, result: "wrong" };
  }

  // Вычисляем время реакции для активных кругов
  let reactionTime: number | undefined;
  const activationTime = state.circleActivationTimes.get(clickedCircleId);
  if (activationTime && clickedCircle.isActive) {
    reactionTime = clickTime - activationTime;
  }

  // Логируем клик игрока
  state.logger.addEntry(LogEventType.PLAYER_CLICK, {
    circleId: clickedCircleId,
    result: clickedCircle.isActive
      ? (clickedCircle.isDecoy ? "decoy" : "correct")
      : "wrong",
    reactionTime,
    circleWasActive: clickedCircle.isActive,
    circleWasDecoy: clickedCircle.isDecoy,
  } as PlayerClickEventData);

  const updatedState = updateSurvivalLevel(state, clickTime);

  if (clickedCircle.isActive && !clickedCircle.isAnimating) {
    if (clickedCircle.isDecoy) {
      // Красный круг - конец игры
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
      // Правильный белый круг
      const newStats = {
        ...updatedState.stats,
        correctHits: updatedState.stats.correctHits + 1,
        perfectStreak: updatedState.stats.perfectStreak + 1,
        hitCount: updatedState.stats.hitCount + 1,
        totalReactionTime: reactionTime
          ? updatedState.stats.totalReactionTime + reactionTime
          : updatedState.stats.totalReactionTime,
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
    // Неправильный клик по неактивному кругу
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
  state: SurvivalGameStateWithLogger,
  circleId: number,
  reason: "clicked" | "timeout" | "game_end" = "clicked",
): SurvivalGameStateWithLogger => {
  const circle = state.circles.find(c => c.id === circleId);
  const activationTime = state.circleActivationTimes.get(circleId);
  const lifeTime = activationTime ? Date.now() - activationTime : 0;

  // Логируем деактивацию круга
  state.logger.addEntry(LogEventType.CIRCLE_DEACTIVATED, {
    circleId,
    reason,
    wasDecoy: circle?.isDecoy || false,
    lifeTime,
  } as CircleDeactivatedEventData);

  const newActiveCircleIds = state.activeCircleIds.filter((id) => id !== circleId);
  const newCircleTimeouts = new Map(state.circleTimeouts);
  const newCircleActivationTimes = new Map(state.circleActivationTimes);

  const timeout = newCircleTimeouts.get(circleId);
  if (timeout) {
    clearTimeout(timeout);
    newCircleTimeouts.delete(circleId);
  }

  // Удаляем время активации
  newCircleActivationTimes.delete(circleId);

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
    circleActivationTimes: newCircleActivationTimes,
  };
};

export const handleCircleTimeout = (
  state: SurvivalGameStateWithLogger,
  circleId: number,
  wasDecoy: boolean,
): SurvivalGameStateWithLogger => {
  const activationTime = state.circleActivationTimes.get(circleId);
  const levelConfig = getLevelConfig(state.currentLevel);

  // Логируем таймаут круга
  state.logger.addEntry(LogEventType.CIRCLE_TIMEOUT, {
    circleId,
    wasDecoy,
    scheduledLifeTime: levelConfig.circleActiveTime,
    actualLifeTime: activationTime ? Date.now() - activationTime : 0,
  } as CircleTimeoutEventData);

  return deactivateSurvivalCircle(state, circleId, "timeout");
};

export const scheduleActivation = (
  state: SurvivalGameStateWithLogger,
  delay: number,
): SurvivalGameStateWithLogger => {
  const levelConfig = getLevelConfig(state.currentLevel);
  const nextBatchSize = Math.min(
    levelConfig.simultaneousCircles - state.activeCircleIds.length,
    levelConfig.simultaneousCircles
  );

  // Логируем запланированную активацию
  state.logger.addEntry(LogEventType.ACTIVATION_SCHEDULED, {
    delay,
    currentActiveCircles: state.activeCircleIds.length,
    level: state.currentLevel,
    nextBatchSize,
  } as ActivationScheduledEventData);

  return state;
};

export const calculateSurvivalScore = (
  stats: SurvivalGameStats,
  level: number,
): number => {
  const timeScore = Math.floor(stats.survivalTime / 1000);
  const levelScore = level;
  const clickScore = stats.correctHits;
  return timeScore + levelScore + clickScore;
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
  state: SurvivalGameStateWithLogger,
): SurvivalGameResult => {
  const finalState = updateSurvivalLevel(state, Date.now());
  const finalScore = calculateSurvivalScore(finalState.stats, finalState.currentLevel);
  const deathCause = getSurvivalDeathCause(finalState.stats);

  // Логируем завершение игры
  finalState.logger.addEntry(LogEventType.GAME_END, {
    finalLevel: finalState.currentLevel,
    totalTime: finalState.stats.survivalTime,
    cause: deathCause,
    finalScore,
    correctHits: finalState.stats.correctHits,
    wrongHits: finalState.stats.wrongHits,
    missedCircles: finalState.stats.missedCircles,
    decoyHits: finalState.stats.decoyHits,
  } as GameEndEventData);

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

export const cleanupSurvivalGame = (state: SurvivalGameStateWithLogger): void => {
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