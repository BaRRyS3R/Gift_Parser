// src/utils/gameUtils.ts - Updated game configurations with new difficulty progression

import {
  GameConfig,
  GameDifficulty,
  Circle,
  AdaptiveState,
  PrecisionModeState,
  PrecisionLevelConfig,
} from "@/types/game";

export { GameDifficulty };

export const GAME_CONFIGS: Record<GameDifficulty, GameConfig> = {
  // Updated difficulty progression with 4 main modes + precision
  [GameDifficulty.LEGENDARY]: {
    id: "legendary",
    name: "BEGINNER",
    circleCount: 25, // 5x5 grid - easiest mode
    minActivationTime: 1000,
    maxActivationTime: 2500,
    maxSimultaneousCircles: 2,
    circleActiveTime: 2500,
    decoyProbability: 0.05,
    adaptiveScaling: true,
    fastClickThreshold: 300,
  },
  [GameDifficulty.OMG]: {
    id: "omg",
    name: "INTERMEDIATE",
    circleCount: 25, // 5x5 grid - medium difficulty
    minActivationTime: 700,
    maxActivationTime: 1800,
    maxSimultaneousCircles: 3,
    circleActiveTime: 2000,
    decoyProbability: 0.1,
    adaptiveScaling: true,
    fastClickThreshold: 250,
  },
  [GameDifficulty.NIGHTMARE]: {
    id: "nightmare",
    name: "ADVANCED",
    circleCount: 36, // 6x6 grid - hard difficulty
    minActivationTime: 500,
    maxActivationTime: 1400,
    maxSimultaneousCircles: 5,
    circleActiveTime: 1600,
    decoyProbability: 0.15,
    adaptiveScaling: true,
    fastClickThreshold: 200,
  },
  [GameDifficulty.IMPOSSIBLE]: {
    id: "impossible",
    name: "EXPERT",
    circleCount: 49, // 7x7 grid - hardest standard mode
    minActivationTime: 300,
    maxActivationTime: 1000,
    maxSimultaneousCircles: 8,
    circleActiveTime: 1200,
    decoyProbability: 0.2,
    adaptiveScaling: true,
    fastClickThreshold: 150,
  },
  // Precision Mode - Survival with 7x7 grid
  [GameDifficulty.PRECISION]: {
    id: "precision",
    name: "SURVIVAL",
    circleCount: 49, // 7x7 grid - maximum challenge
    minActivationTime: 1000,
    maxActivationTime: 1800,
    maxSimultaneousCircles: 4,
    circleActiveTime: 2000,
    decoyProbability: 0.05,
    adaptiveScaling: false,
    fastClickThreshold: 200,
    isPrecisionMode: true,
    intensityIncreaseInterval: 8,
    intensityMultiplier: 2.0,
    maxIntensityLevel: 15,
  },
} as const;

// Updated grid dimensions configuration
export const getGridDimensions = (circleCount: number) => {
  switch (circleCount) {
    case 25:
      return { cols: 5, rows: 5 }; // BEGINNER and INTERMEDIATE modes
    case 36:
      return { cols: 6, rows: 6 }; // ADVANCED mode
    case 49:
      return { cols: 7, rows: 7 }; // EXPERT and SURVIVAL modes
    default:
      return { cols: 5, rows: 5 }; // Default fallback
  }
};

// Enhanced Precision Mode level configurations for 7x7 grid (49 circles)
export const PRECISION_LEVELS: PrecisionLevelConfig[] = [
  // Level 1-3: Basic introduction with minimal red circles
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
  // Level 4-6: Medium complexity with balanced white/red ratio
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
    simultaneousCircles: 6,
    redCircles: 2,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1700,
    description: "MULTI-TARGET",
  },
  {
    level: 6,
    simultaneousCircles: 8,
    redCircles: 3,
    activationTimeMin: 750,
    activationTimeMax: 1300,
    circleActiveTime: 1600,
    description: "ENHANCED DIFFICULTY",
  },
  // Level 7-9: High complexity with increased density
  {
    level: 7,
    simultaneousCircles: 10,
    redCircles: 4,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1500,
    description: "INTENSE FOCUS",
  },
  {
    level: 8,
    simultaneousCircles: 12,
    redCircles: 5,
    activationTimeMin: 650,
    activationTimeMax: 1100,
    circleActiveTime: 1400,
    description: "OVERWHELMING",
  },
  {
    level: 9,
    simultaneousCircles: 15,
    redCircles: 7,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1300,
    description: "CHAOS MANAGEMENT",
  },
  // Level 10-12: Expert level with high density
  {
    level: 10,
    simultaneousCircles: 18,
    redCircles: 8,
    activationTimeMin: 550,
    activationTimeMax: 950,
    circleActiveTime: 1200,
    description: "EXPERT PRECISION",
  },
  {
    level: 11,
    simultaneousCircles: 22,
    redCircles: 10,
    activationTimeMin: 500,
    activationTimeMax: 900,
    circleActiveTime: 1100,
    description: "MASTER LEVEL",
  },
  {
    level: 12,
    simultaneousCircles: 26,
    redCircles: 12,
    activationTimeMin: 450,
    activationTimeMax: 850,
    circleActiveTime: 1000,
    description: "LEGENDARY SKILL",
  },
  // Level 13-15: Maximum challenge utilizing full 7x7 grid
  {
    level: 13,
    simultaneousCircles: 30,
    redCircles: 14,
    activationTimeMin: 400,
    activationTimeMax: 800,
    circleActiveTime: 900,
    description: "SUPERHUMAN",
  },
  {
    level: 14,
    simultaneousCircles: 35,
    redCircles: 16,
    activationTimeMin: 350,
    activationTimeMax: 750,
    circleActiveTime: 800,
    description: "BEYOND LIMITS",
  },
  {
    level: 15,
    simultaneousCircles: 40,
    redCircles: 18,
    activationTimeMin: 300,
    activationTimeMax: 700,
    circleActiveTime: 700,
    description: "PERFECT MACHINE",
  },
];

// Precision Mode utility functions (unchanged)
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
  config: GameConfig,
): PrecisionModeState => {
  if (!state.isActive || !config.isPrecisionMode) return state;

  const newSurvivalTime = state.survivalTime + deltaTime;
  const newTimeInCurrentLevel = state.timeInCurrentLevel + deltaTime;

  const shouldIncreaseIntensity =
    newTimeInCurrentLevel >= config.intensityIncreaseInterval! * 1000 &&
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

export const getPrecisionLevelConfig = (
  level: number,
): PrecisionLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, PRECISION_LEVELS.length));

  return PRECISION_LEVELS[clampedLevel - 1];
};

// Precision Mode helper functions (unchanged)
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
  intensityLevel: number,
): number => {
  const baseScore = Math.floor(survivalTime / 1000);
  const streakBonus = perfectStreak * 3;
  const intensityBonus = Math.floor(intensityLevel * 15);

  return baseScore + streakBonus + intensityBonus;
};

export const isPrecisionModeGameOver = (
  wrongHits: number,
  missedCircles: number,
  decoyHits: number,
): boolean => {
  return wrongHits > 0 || missedCircles > 0 || decoyHits > 0;
};

export const getPrecisionModeDeathCause = (
  wrongHits: number,
  missedCircles: number,
  decoyHits: number,
): "miss" | "wrong_click" | "decoy_hit" | "timeout" => {
  if (decoyHits > 0) return "decoy_hit";
  if (wrongHits > 0) return "wrong_click";
  if (missedCircles > 0) return "miss";

  return "timeout";
};

// Enhanced existing functions to support all game modes
export const getRandomActivationDelay = (
  config: GameConfig,
  adaptiveState?: AdaptiveState,
  precisionState?: PrecisionModeState | null,
): number => {
  let baseDelay =
    Math.random() * (config.maxActivationTime - config.minActivationTime) +
    config.minActivationTime;

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
  config?: GameConfig,
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
  config?: GameConfig,
): number => {
  if (config?.isPrecisionMode && precisionState) {
    return getPrecisionSimultaneousCircles(precisionState.intensityLevel);
  }

  return baseCount;
};

export const getAdjustedDecoyProbability = (
  baseProbability: number,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig,
): number => {
  return baseProbability;
};

// Utility functions (unchanged)
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
  config?: GameConfig,
): number[] => {
  const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
    (id) => !excludeIds.includes(id),
  );

  let adjustedMaxCount = maxCount;

  if (config?.isPrecisionMode && precisionState) {
    adjustedMaxCount = getAdjustedSimultaneousCircles(
      maxCount,
      precisionState,
      config,
    );
  } else if (adaptiveState) {
    adjustedMaxCount = Math.ceil(
      maxCount * adaptiveState.simultaneousMultiplier,
    );
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
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(2, "0")}s`;
};

// Scoring and penalty functions (unchanged)
export const calculateProgressiveWrongPenalty = (
  consecutiveMisses: number,
): number => {
  if (consecutiveMisses <= 0) return 1;
  if (consecutiveMisses === 1) return 1;
  if (consecutiveMisses === 2) return 2;
  if (consecutiveMisses === 3) return 3;
  if (consecutiveMisses === 4) return 5;

  return Math.min(15, Math.floor(consecutiveMisses * 1.5));
};

export const calculateDecoyPenalty = (consecutiveMisses: number): number => {
  const basePenalty = 3;
  const progressivePenalty =
    calculateProgressiveWrongPenalty(consecutiveMisses);

  return basePenalty + progressivePenalty;
};

export const calculateFastClickBonus = (
  reactionTime: number,
  threshold: number,
): number => {
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
