// src/utils/gameUtils.ts - Enhanced version with Redesigned Difficulty System

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
  // Enhanced Precision Mode
  [GameDifficulty.PRECISION]: {
    id: "precision",
    name: "PRECISION MODE",
    circleCount: 25,
    minActivationTime: 1000,
    maxActivationTime: 1800,
    maxSimultaneousCircles: 4, // Increased to 4 for even better scaling visibility
    circleActiveTime: 2000,
    decoyProbability: 0.05,
    adaptiveScaling: false, // Custom precision scaling
    fastClickThreshold: 200,
    isPrecisionMode: true,
    intensityIncreaseInterval: 8, // Increase intensity every 8 seconds (reduced for faster testing)
    intensityMultiplier: 2.0, // 2x increase per level (much more aggressive)
    maxIntensityLevel: 15, // Reduced max level due to aggressive scaling
  },
} as const;

// Precision Mode level configurations
export const PRECISION_LEVELS: PrecisionLevelConfig[] = [
  // Level 1 - Warm up
  {
    level: 1,
    simultaneousCircles: 1,
    redCircles: 0,
    activationTimeMin: 1000,
    activationTimeMax: 1800,
    circleActiveTime: 2000,
    description: "WARMING UP"
  },
  // Level 2 - Introduction
  {
    level: 2,
    simultaneousCircles: 2,
    redCircles: 0,
    activationTimeMin: 900,
    activationTimeMax: 1600,
    circleActiveTime: 1800,
    description: "GETTING STARTED"
  },
  // Level 3 - First red circles
  {
    level: 3,
    simultaneousCircles: 2,
    redCircles: 1,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1600,
    description: "AVOID THE RED"
  },
  // Level 4 - More simultaneous
  {
    level: 4,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1500,
    description: "MULTI-TASKING"
  },
  // Level 5 - Faster pace
  {
    level: 5,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1400,
    description: "PICKING UP PACE"
  },
  // Level 6 - More red circles
  {
    level: 6,
    simultaneousCircles: 4,
    redCircles: 2,
    activationTimeMin: 500,
    activationTimeMax: 900,
    circleActiveTime: 1300,
    description: "DANGER ZONE"
  },
  // Level 7 - Intense
  {
    level: 7,
    simultaneousCircles: 4,
    redCircles: 2,
    activationTimeMin: 400,
    activationTimeMax: 800,
    circleActiveTime: 1200,
    description: "INTENSITY RISING"
  },
  // Level 8 - Very challenging
  {
    level: 8,
    simultaneousCircles: 5,
    redCircles: 2,
    activationTimeMin: 350,
    activationTimeMax: 700,
    circleActiveTime: 1100,
    description: "EXTREME FOCUS"
  },
  // Level 9 - Expert level
  {
    level: 9,
    simultaneousCircles: 5,
    redCircles: 3,
    activationTimeMin: 300,
    activationTimeMax: 600,
    circleActiveTime: 1000,
    description: "EXPERT LEVEL"
  },
  // Level 10 - Master level
  {
    level: 10,
    simultaneousCircles: 6,
    redCircles: 3,
    activationTimeMin: 250,
    activationTimeMax: 500,
    circleActiveTime: 900,
    description: "MASTER PRECISION"
  },
  // Level 11 - Insane
  {
    level: 11,
    simultaneousCircles: 6,
    redCircles: 4,
    activationTimeMin: 200,
    activationTimeMax: 450,
    circleActiveTime: 800,
    description: "INSANE MODE"
  },
  // Level 12 - Nightmare
  {
    level: 12,
    simultaneousCircles: 7,
    redCircles: 4,
    activationTimeMin: 180,
    activationTimeMax: 400,
    circleActiveTime: 700,
    description: "NIGHTMARE FUEL"
  },
  // Level 13 - Impossible
  {
    level: 13,
    simultaneousCircles: 7,
    redCircles: 5,
    activationTimeMin: 160,
    activationTimeMax: 350,
    circleActiveTime: 600,
    description: "IMPOSSIBLE ODDS"
  },
  // Level 14 - Godlike
  {
    level: 14,
    simultaneousCircles: 8,
    redCircles: 5,
    activationTimeMin: 140,
    activationTimeMax: 300,
    circleActiveTime: 500,
    description: "GODLIKE REFLEXES"
  },
  // Level 15 - Transcendent
  {
    level: 15,
    simultaneousCircles: 8,
    redCircles: 6,
    activationTimeMin: 120,
    activationTimeMax: 250,
    circleActiveTime: 400,
    description: "TRANSCENDENT"
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
  const streakBonus = perfectStreak * 3; // 3 points per perfect hit (increased from 2)
  const intensityBonus = Math.floor(intensityLevel * 10); // 10 points per intensity level reached (increased from 5)

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
    // Use simple level-based delay for precision mode
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
    // Use simple level-based active time for precision mode
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
    // Use simple level-based simultaneous circles for precision mode
    return getPrecisionSimultaneousCircles(precisionState.intensityLevel);
  }

  return baseCount;
};

export const getAdjustedDecoyProbability = (
  baseProbability: number,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number => {
  // For precision mode, we'll handle red circles differently
  // This function is not used in the new precision mode logic
  return baseProbability;
};

// Existing utility functions (unchanged)
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