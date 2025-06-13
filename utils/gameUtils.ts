// src/utils/gameUtils.ts - Updated for 48 circles in Precision Mode

import { GameConfig, GameDifficulty, Circle, AdaptiveState, ClickTiming, PrecisionModeState, IntensityLevel, PrecisionLevelConfig } from "@/types/game";

export { GameDifficulty };

export const GAME_CONFIGS: Record<GameDifficulty, GameConfig> = {
  [GameDifficulty.HARD]: {
    id: "hard",
    name: "ROOKIE",
    circleCount: 16,
    minActivationTime: 800,
    maxActivationTime: 2000,
    maxSimultaneousCircles: 2,
    circleActiveTime: 1800,
    decoyProbability: 0.1,
    adaptiveScaling: true,
    fastClickThreshold: 250,
  },
  [GameDifficulty.LEGENDARY]: {
    id: "legendary",
    name: "VETERAN",
    circleCount: 25,
    minActivationTime: 600,
    maxActivationTime: 1500,
    maxSimultaneousCircles: 4,
    circleActiveTime: 1500,
    decoyProbability: 0.15,
    adaptiveScaling: true,
    fastClickThreshold: 200,
  },
  [GameDifficulty.OMG]: {
    id: "omg",
    name: "MANIAC",
    circleCount: 50,
    minActivationTime: 400,
    maxActivationTime: 1200,
    maxSimultaneousCircles: 8,
    circleActiveTime: 1200,
    decoyProbability: 0.25,
    adaptiveScaling: true,
    fastClickThreshold: 150,
  },
  [GameDifficulty.NIGHTMARE]: {
    id: "nightmare",
    name: "DEMON",
    circleCount: 70,
    minActivationTime: 200,
    maxActivationTime: 800,
    maxSimultaneousCircles: 12,
    circleActiveTime: 800,
    decoyProbability: 0.3,
    adaptiveScaling: true,
    fastClickThreshold: 120,
  },
  [GameDifficulty.IMPOSSIBLE]: {
    id: "impossible",
    name: "GODLIKE",
    circleCount: 60,
    minActivationTime: 300,
    maxActivationTime: 700,
    maxSimultaneousCircles: 8,
    circleActiveTime: 600,
    decoyProbability: 0.25,
    adaptiveScaling: true,
    fastClickThreshold: 100,
  },
  // Enhanced Precision Mode - 48 circles (6x8 grid)
  [GameDifficulty.PRECISION]: {
    id: "precision",
    name: "PRECISION MODE",
    circleCount: 48, // Увеличено до 48 для сетки 6x8
    minActivationTime: 1000,
    maxActivationTime: 1800,
    maxSimultaneousCircles: 4,
    circleActiveTime: 2000,
    decoyProbability: 0.05,
    adaptiveScaling: false,
    fastClickThreshold: 200,
    isPrecisionMode: true,
    intensityIncreaseInterval: 8, // 8 seconds per level
    intensityMultiplier: 2.0,
    maxIntensityLevel: 15,
  },
} as const;

// Precision Mode level configurations - Redesigned progression for 48 circles
export const PRECISION_LEVELS: PrecisionLevelConfig[] = [
  // Level 1 - Single white circle
  {
    level: 1,
    simultaneousCircles: 1,
    redCircles: 0,
    activationTimeMin: 1200,
    activationTimeMax: 2000,
    circleActiveTime: 2500,
    description: "WARMING UP"
  },
  // Level 2 - Two white circles
  {
    level: 2,
    simultaneousCircles: 2,
    redCircles: 0,
    activationTimeMin: 1000,
    activationTimeMax: 1800,
    circleActiveTime: 2200,
    description: "GETTING STARTED"
  },
  // Level 3 - 3 circles total: 2 white + 1 red
  {
    level: 3,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 900,
    activationTimeMax: 1600,
    circleActiveTime: 2000,
    description: "AVOID THE RED"
  },
  // Level 4 - 4 circles total: 3 white + 1 red
  {
    level: 4,
    simultaneousCircles: 4,
    redCircles: 1,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1800,
    description: "MULTI-TASKING"
  },
  // Level 5 - 6 circles total: 4 white + 2 red
  {
    level: 5,
    simultaneousCircles: 6,
    redCircles: 2,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1600,
    description: "BALANCED CHAOS"
  },
  // Level 6 - 8 circles total: 5 white + 3 red
  {
    level: 6,
    simultaneousCircles: 8,
    redCircles: 3,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1500,
    description: "TARGET FOCUS"
  },
  // Level 7 - 10 circles total: 6 white + 4 red
  {
    level: 7,
    simultaneousCircles: 10,
    redCircles: 4,
    activationTimeMin: 550,
    activationTimeMax: 900,
    circleActiveTime: 1400,
    description: "PRECISION REQUIRED"
  },
  // Level 8 - 12 circles total: 7 white + 5 red
  {
    level: 8,
    simultaneousCircles: 12,
    redCircles: 5,
    activationTimeMin: 500,
    activationTimeMax: 800,
    circleActiveTime: 1300,
    description: "OVERWHELMING"
  },
  // Level 9 - 16 circles total: 9 white + 7 red
  {
    level: 9,
    simultaneousCircles: 16,
    redCircles: 7,
    activationTimeMin: 450,
    activationTimeMax: 750,
    circleActiveTime: 1200,
    description: "MAXIMUM CHAOS"
  },
  // Level 10 - 20 circles total: 11 white + 9 red
  {
    level: 10,
    simultaneousCircles: 20,
    redCircles: 9,
    activationTimeMin: 400,
    activationTimeMax: 700,
    circleActiveTime: 1100,
    description: "INSANITY BEGINS"
  },
  // Level 11 - 24 circles total: 13 white + 11 red
  {
    level: 11,
    simultaneousCircles: 24,
    redCircles: 11,
    activationTimeMin: 350,
    activationTimeMax: 650,
    circleActiveTime: 1000,
    description: "BEYOND HUMAN"
  },
  // Level 12 - 28 circles total: 15 white + 13 red
  {
    level: 12,
    simultaneousCircles: 28,
    redCircles: 13,
    activationTimeMin: 300,
    activationTimeMax: 600,
    circleActiveTime: 900,
    description: "GODLIKE FOCUS"
  },
  // Level 13 - 32 circles total: 17 white + 15 red
  {
    level: 13,
    simultaneousCircles: 32,
    redCircles: 15,
    activationTimeMin: 280,
    activationTimeMax: 550,
    circleActiveTime: 800,
    description: "TRANSCENDENT"
  },
  // Level 14 - 36 circles total: 19 white + 17 red
  {
    level: 14,
    simultaneousCircles: 36,
    redCircles: 17,
    activationTimeMin: 250,
    activationTimeMax: 500,
    circleActiveTime: 700,
    description: "IMPOSSIBLE REALM"
  },
  // Level 15 - 40 circles total: 21 white + 19 red
  {
    level: 15,
    simultaneousCircles: 40,
    redCircles: 19,
    activationTimeMin: 200,
    activationTimeMax: 450,
    circleActiveTime: 600,
    description: "PERFECT MACHINE"
  }
];

// Precision Mode utility functions
export const initializePrecisionModeState = (): PrecisionModeState => ({
  intensityLevel: 1,
  timeInCurrentLevel: 0,
  survivalTime: 0,
  perfectStreak: 0,
  isActive: true,
});

export const updatePrecisionModeState = (
  state: PrecisionModeState,
  deltaTime: number,
  config: GameConfig
): PrecisionModeState => {
  if (!state.isActive || !config.isPrecisionMode) return state;

  const newSurvivalTime = state.survivalTime + deltaTime;
  const newTimeInCurrentLevel = state.timeInCurrentLevel + deltaTime;

  const shouldIncreaseIntensity =
    newTimeInCurrentLevel >= (config.intensityIncreaseInterval! * 1000) &&
    state.intensityLevel < (config.maxIntensityLevel || 15);

  if (shouldIncreaseIntensity) {
    return {
      ...state,
      intensityLevel: state.intensityLevel + 1,
      timeInCurrentLevel: 0,
      survivalTime: newSurvivalTime,
    };
  }

  return {
    ...state,
    timeInCurrentLevel: newTimeInCurrentLevel,
    survivalTime: newSurvivalTime,
  };
};

export const getPrecisionLevelConfig = (level: number): PrecisionLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, PRECISION_LEVELS.length));
  return PRECISION_LEVELS[clampedLevel - 1];
};

// Simple functions that get values directly from level config
export const getPrecisionSimultaneousCircles = (level: number): number => {
  const levelConfig = getPrecisionLevelConfig(level);
  return levelConfig.simultaneousCircles;
};

export const getPrecisionRedCircles = (level: number): number => {
  const levelConfig = getPrecisionLevelConfig(level);
  return levelConfig.redCircles;
};

export const getPrecisionActivationDelay = (level: number): number => {
  const levelConfig = getPrecisionLevelConfig(level);
  const min = levelConfig.activationTimeMin;
  const max = levelConfig.activationTimeMax;
  return Math.random() * (max - min) + min;
};

export const getPrecisionCircleActiveTime = (level: number): number => {
  const levelConfig = getPrecisionLevelConfig(level);
  return levelConfig.circleActiveTime;
};

export const getPrecisionDescription = (level: number): string => {
  const levelConfig = getPrecisionLevelConfig(level);
  return levelConfig.description;
};

export const calculatePrecisionModeScore = (
  survivalTime: number,
  perfectStreak: number,
  intensityLevel: number
): number => {
  const baseScore = Math.floor(survivalTime / 1000); // 1 point per second survived
  const streakBonus = perfectStreak * 3; // 3 points per perfect hit
  const intensityBonus = Math.floor(intensityLevel * 15); // 15 points per intensity level reached

  return baseScore + streakBonus + intensityBonus;
};

export const isPrecisionModeGameOver = (
  wrongHits: number,
  missedCircles: number,
  decoyHits: number
): boolean => {
  return wrongHits > 0 || missedCircles > 0 || decoyHits > 0;
};

export const getPrecisionModeDeathCause = (
  wrongHits: number,
  missedCircles: number,
  decoyHits: number
): 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout' => {
  if (decoyHits > 0) return 'decoy_hit';
  if (wrongHits > 0) return 'wrong_click';
  if (missedCircles > 0) return 'miss';
  return 'timeout';
};

// Enhanced existing functions to support Precision Mode
export const getRandomActivationDelay = (
  config: GameConfig,
  adaptiveState?: AdaptiveState,
  precisionState?: PrecisionModeState | null
): number => {
  let baseDelay = Math.random() * (config.maxActivationTime - config.minActivationTime) + config.minActivationTime;

  if (config.isPrecisionMode && precisionState) {
    baseDelay = getPrecisionActivationDelay(precisionState.intensityLevel);
  } else if (adaptiveState && config.adaptiveScaling) {
    baseDelay = baseDelay * adaptiveState.activationSpeedMultiplier;
  }

  return Math.max(50, baseDelay);
};

export const getAdjustedCircleActiveTime = (
  baseTime: number,
  adaptiveState?: AdaptiveState,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number => {
  if (config?.isPrecisionMode && precisionState) {
    return getPrecisionCircleActiveTime(precisionState.intensityLevel);
  }

  if (adaptiveState) {
    return Math.max(200, baseTime * adaptiveState.activeTimeMultiplier);
  }

  return baseTime;
};

export const getAdjustedSimultaneousCircles = (
  baseCount: number,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number => {
  if (config?.isPrecisionMode && precisionState) {
    return getPrecisionSimultaneousCircles(precisionState.intensityLevel);
  }

  return baseCount;
};

export const getAdjustedDecoyProbability = (
  baseProbability: number,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number => {
  return baseProbability;
};

// Existing utility functions
export const createCircleGrid = (count: number): Circle[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
  }));
};

export const getRandomCircleIds = (
  totalCircles: number,
  maxCount: number,
  excludeIds: number[] = [],
  adaptiveState?: AdaptiveState,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number[] => {
  const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
    (id) => !excludeIds.includes(id),
  );

  let adjustedMaxCount = maxCount;

  if (config?.isPrecisionMode && precisionState) {
    adjustedMaxCount = getAdjustedSimultaneousCircles(maxCount, precisionState, config);
  } else if (adaptiveState) {
    adjustedMaxCount = Math.ceil(maxCount * adaptiveState.simultaneousMultiplier);
  }

  const count = Math.min(
    Math.floor(Math.random() * adjustedMaxCount) + 1,
    availableIds.length,
  );

  const selectedIds: number[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    const selectedId = availableIds.splice(randomIndex, 1)[0];
    selectedIds.push(selectedId);
  }

  return selectedIds;
};

export const getGridDimensions = (circleCount: number) => {
  switch (circleCount) {
    case 16:
      return { cols: 4, rows: 4 };
    case 25:
      return { cols: 5, rows: 5 };
    case 40:
      return { cols: 8, rows: 5 }; // Старая конфигурация для 40 кружков
    case 48: // Новая конфигурация для Precision Mode
      return { cols: 5, rows: 8 }; // Изменено на 5x8
    case 50:
      return { cols: 5, rows: 10 };
    case 60:
      return { cols: 6, rows: 10 };
    case 70:
      return { cols: 7, rows: 10 };
    default:
      return { cols: 4, rows: 4 };
  }
};

export const calculateAccuracy = (
  correctHits: number,
  totalClicks: number,
): number => {
  if (totalClicks === 0) return 0;
  return Math.round((correctHits / totalClicks) * 100);
};

export const formatTime = (seconds: number): string => {
  return seconds.toString().padStart(2, "0");
};

export const formatPrecisionTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${ms.toString().padStart(2, '0')}s`;
};

// Enhanced existing functions
export const calculateProgressiveWrongPenalty = (consecutiveMisses: number): number => {
  if (consecutiveMisses <= 0) return 1;
  if (consecutiveMisses === 1) return 1;
  if (consecutiveMisses === 2) return 2;
  if (consecutiveMisses === 3) return 3;
  if (consecutiveMisses === 4) return 5;
  return Math.min(15, Math.floor(consecutiveMisses * 1.5));
};

export const calculateDecoyPenalty = (consecutiveMisses: number): number => {
  const basePenalty = 3;
  const progressivePenalty = calculateProgressiveWrongPenalty(consecutiveMisses);
  return basePenalty + progressivePenalty;
};

export const calculateFastClickBonus = (reactionTime: number, threshold: number): number => {
  if (reactionTime <= threshold) {
    const speedRatio = threshold / Math.max(reactionTime, 1);
    return Math.floor(speedRatio);
  }
  return 0;
};

export const updateAdaptiveState = (
  currentState: AdaptiveState,
  consecutiveHits: number,
  consecutiveMisses: number,
): AdaptiveState => {
  let newLevel = currentState.level;

  if (consecutiveHits >= 5 && consecutiveHits % 3 === 0) {
    newLevel = Math.min(10, newLevel + 1);
  }

  if (consecutiveMisses >= 4) {
    newLevel = Math.max(0, newLevel - 1);
  }

  const levelRatio = newLevel / 10;

  return {
    level: newLevel,
    activationSpeedMultiplier: Math.max(0.3, 1 - levelRatio * 0.7),
    simultaneousMultiplier: 1 + levelRatio * 1.5,
    activeTimeMultiplier: Math.max(0.4, 1 - levelRatio * 0.6),
  };
};

export const shouldCreateDecoy = (probability: number): boolean => {
  return Math.random() < probability;
};

export const calculateScoreMultiplier = (consecutiveHits: number): number => {
  if (consecutiveHits >= 15) return 3;
  if (consecutiveHits >= 10) return 2.5;
  if (consecutiveHits >= 7) return 2;
  if (consecutiveHits >= 5) return 1.5;
  return 1;
};

export const getAdaptiveLevelDescription = (level: number): string => {
  if (level === 0) return "STANDARD";
  if (level <= 2) return "HEATED";
  if (level <= 4) return "INTENSE";
  if (level <= 6) return "EXTREME";
  if (level <= 8) return "INSANE";
  return "GODLIKE";
};

export const calculateAverageReactionTime = (
  totalReactionTime: number,
  hitCount: number,
): number => {
  if (hitCount === 0) return 0;
  return Math.round(totalReactionTime / hitCount);
};