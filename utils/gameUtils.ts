// src/utils/gameUtils.ts - Enhanced version with Redesigned Difficulty System

import { GameConfig, GameDifficulty, Circle, AdaptiveState, ClickTiming, PrecisionModeState, IntensityLevel } from "@/types/game";

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

// Enhanced Precision Mode intensity levels - much more aggressive scaling
export const PRECISION_INTENSITY_LEVELS: IntensityLevel[] = [
  { level: 1, speedMultiplier: 1.0, simultaneousMultiplier: 1.0, activeTimeMultiplier: 1.0, decoyProbabilityMultiplier: 1.0, description: "WARMING UP" },
  { level: 2, speedMultiplier: 0.8, simultaneousMultiplier: 2.0, activeTimeMultiplier: 0.8, decoyProbabilityMultiplier: 3.0, description: "GETTING SERIOUS" },
  { level: 3, speedMultiplier: 0.6, simultaneousMultiplier: 3.0, activeTimeMultiplier: 0.6, decoyProbabilityMultiplier: 5.0, description: "HEATING UP" },
  { level: 4, speedMultiplier: 0.45, simultaneousMultiplier: 4.0, activeTimeMultiplier: 0.45, decoyProbabilityMultiplier: 7.0, description: "INTENSE" },
  { level: 5, speedMultiplier: 0.35, simultaneousMultiplier: 5.0, activeTimeMultiplier: 0.35, decoyProbabilityMultiplier: 9.0, description: "DANGEROUS" },
  { level: 6, speedMultiplier: 0.25, simultaneousMultiplier: 6.0, activeTimeMultiplier: 0.25, decoyProbabilityMultiplier: 11.0, description: "EXTREME" },
  { level: 7, speedMultiplier: 0.20, simultaneousMultiplier: 7.0, activeTimeMultiplier: 0.20, decoyProbabilityMultiplier: 13.0, description: "INSANE" },
  { level: 8, speedMultiplier: 0.15, simultaneousMultiplier: 8.0, activeTimeMultiplier: 0.15, decoyProbabilityMultiplier: 15.0, description: "MADNESS" },
  { level: 9, speedMultiplier: 0.12, simultaneousMultiplier: 9.0, activeTimeMultiplier: 0.12, decoyProbabilityMultiplier: 17.0, description: "CHAOS" },
  { level: 10, speedMultiplier: 0.10, simultaneousMultiplier: 10.0, activeTimeMultiplier: 0.10, decoyProbabilityMultiplier: 20.0, description: "NIGHTMARE" },
  { level: 11, speedMultiplier: 0.08, simultaneousMultiplier: 12.0, activeTimeMultiplier: 0.08, decoyProbabilityMultiplier: 25.0, description: "HELL" },
  { level: 12, speedMultiplier: 0.06, simultaneousMultiplier: 15.0, activeTimeMultiplier: 0.06, decoyProbabilityMultiplier: 30.0, description: "BEYOND LIMITS" },
  { level: 13, speedMultiplier: 0.05, simultaneousMultiplier: 18.0, activeTimeMultiplier: 0.05, decoyProbabilityMultiplier: 35.0, description: "GODLIKE" },
  { level: 14, speedMultiplier: 0.04, simultaneousMultiplier: 20.0, activeTimeMultiplier: 0.04, decoyProbabilityMultiplier: 40.0, description: "TRANSCENDENT" },
  { level: 15, speedMultiplier: 0.03, simultaneousMultiplier: 25.0, activeTimeMultiplier: 0.03, decoyProbabilityMultiplier: 50.0, description: "UNIVERSE BREAKING" },
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

export const getPrecisionModeIntensity = (level: number): IntensityLevel => {
  const clampedLevel = Math.max(1, Math.min(level, PRECISION_INTENSITY_LEVELS.length));
  return PRECISION_INTENSITY_LEVELS[clampedLevel - 1];
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
    const intensity = getPrecisionModeIntensity(precisionState.intensityLevel);
    baseDelay = baseDelay * intensity.speedMultiplier;
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
    const intensity = getPrecisionModeIntensity(precisionState.intensityLevel);
    return Math.max(100, baseTime * intensity.activeTimeMultiplier); // Reduced minimum from 200 to 100
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
    const intensity = getPrecisionModeIntensity(precisionState.intensityLevel);
    return Math.ceil(baseCount * intensity.simultaneousMultiplier);
  }

  return baseCount;
};

export const getAdjustedDecoyProbability = (
  baseProbability: number,
  precisionState?: PrecisionModeState | null,
  config?: GameConfig
): number => {
  if (config?.isPrecisionMode && precisionState) {
    const intensity = getPrecisionModeIntensity(precisionState.intensityLevel);
    return Math.min(0.95, baseProbability * intensity.decoyProbabilityMultiplier); // Increased max from 0.8 to 0.95
  }

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