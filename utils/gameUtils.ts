// src/utils/gameUtils.ts - Enhanced version with Precision Mode

import { GameConfig, GameDifficulty, Circle, AdaptiveState, ClickTiming, PrecisionModeState, IntensityLevel } from "@/types/game";

export { GameDifficulty };

export const GAME_CONFIGS: Record<GameDifficulty, GameConfig> = {
  [GameDifficulty.EASY]: {
    id: "easy",
    name: "Easy",
    circleCount: 4,
    minActivationTime: 1000,
    maxActivationTime: 3000,
    maxSimultaneousCircles: 1,
    circleActiveTime: 2000,
    decoyProbability: 0,
    adaptiveScaling: false,
    fastClickThreshold: 300,
  },
  [GameDifficulty.MEDIUM]: {
    id: "medium",
    name: "Medium",
    circleCount: 8,
    minActivationTime: 1000,
    maxActivationTime: 3000,
    maxSimultaneousCircles: 1,
    circleActiveTime: 2000,
    decoyProbability: 0.1,
    adaptiveScaling: false,
    fastClickThreshold: 250,
  },
  [GameDifficulty.HARD]: {
    id: "hard",
    name: "Hard",
    circleCount: 12,
    minActivationTime: 500,
    maxActivationTime: 2000,
    maxSimultaneousCircles: 2,
    circleActiveTime: 1500,
    decoyProbability: 0.15,
    adaptiveScaling: true,
    fastClickThreshold: 200,
  },
  [GameDifficulty.LEGENDARY]: {
    id: "legendary",
    name: "Legendary",
    circleCount: 16,
    minActivationTime: 1000,
    maxActivationTime: 1500,
    maxSimultaneousCircles: 4,
    circleActiveTime: 1500,
    decoyProbability: 0.2,
    adaptiveScaling: true,
    fastClickThreshold: 200,
  },
  [GameDifficulty.OMG]: {
    id: "omg",
    name: "OMG",
    circleCount: 40,
    minActivationTime: 200,
    maxActivationTime: 1500,
    maxSimultaneousCircles: 8,
    circleActiveTime: 2000,
    decoyProbability: 0.25,
    adaptiveScaling: true,
    fastClickThreshold: 150,
  },
  [GameDifficulty.NIGHTMARE]: {
    id: "nightmare",
    name: "NIGHTMARE",
    circleCount: 60,
    minActivationTime: 100,
    maxActivationTime: 800,
    maxSimultaneousCircles: 15,
    circleActiveTime: 600,
    decoyProbability: 0.3,
    adaptiveScaling: true,
    fastClickThreshold: 120,
  },
  [GameDifficulty.IMPOSSIBLE]: {
    id: "impossible",
    name: "IMPOSSIBLE",
    circleCount: 80,
    minActivationTime: 50,
    maxActivationTime: 500,
    maxSimultaneousCircles: 20,
    circleActiveTime: 400,
    decoyProbability: 0.35,
    adaptiveScaling: true,
    fastClickThreshold: 100,
  },
  // New Precision Mode configuration
  [GameDifficulty.PRECISION]: {
    id: "precision",
    name: "PRECISION MODE",
    circleCount: 20,
    minActivationTime: 800,
    maxActivationTime: 1500,
    maxSimultaneousCircles: 2,
    circleActiveTime: 1800,
    decoyProbability: 0.1,
    adaptiveScaling: false, // Custom precision scaling
    fastClickThreshold: 200,
    isPrecisionMode: true,
    intensityIncreaseInterval: 5, // Increase intensity every 5 seconds
    intensityMultiplier: 1.15, // 15% increase per level
    maxIntensityLevel: 20,
  },
} as const;

// Precision Mode intensity levels configuration
export const PRECISION_INTENSITY_LEVELS: IntensityLevel[] = [
  { level: 1, speedMultiplier: 1.0, simultaneousMultiplier: 1.0, activeTimeMultiplier: 1.0, decoyProbabilityMultiplier: 1.0, description: "WARMING UP" },
  { level: 2, speedMultiplier: 0.95, simultaneousMultiplier: 1.0, activeTimeMultiplier: 0.95, decoyProbabilityMultiplier: 1.0, description: "GETTING SERIOUS" },
  { level: 3, speedMultiplier: 0.90, simultaneousMultiplier: 1.1, activeTimeMultiplier: 0.90, decoyProbabilityMultiplier: 1.1, description: "HEATING UP" },
  { level: 4, speedMultiplier: 0.85, simultaneousMultiplier: 1.2, activeTimeMultiplier: 0.85, decoyProbabilityMultiplier: 1.2, description: "INTENSE" },
  { level: 5, speedMultiplier: 0.80, simultaneousMultiplier: 1.3, activeTimeMultiplier: 0.80, decoyProbabilityMultiplier: 1.3, description: "DANGEROUS" },
  { level: 6, speedMultiplier: 0.75, simultaneousMultiplier: 1.4, activeTimeMultiplier: 0.75, decoyProbabilityMultiplier: 1.4, description: "EXTREME" },
  { level: 7, speedMultiplier: 0.70, simultaneousMultiplier: 1.5, activeTimeMultiplier: 0.70, decoyProbabilityMultiplier: 1.5, description: "INSANE" },
  { level: 8, speedMultiplier: 0.65, simultaneousMultiplier: 1.6, activeTimeMultiplier: 0.65, decoyProbabilityMultiplier: 1.6, description: "MADNESS" },
  { level: 9, speedMultiplier: 0.60, simultaneousMultiplier: 1.7, activeTimeMultiplier: 0.60, decoyProbabilityMultiplier: 1.7, description: "CHAOS" },
  { level: 10, speedMultiplier: 0.55, simultaneousMultiplier: 1.8, activeTimeMultiplier: 0.55, decoyProbabilityMultiplier: 1.8, description: "NIGHTMARE" },
  { level: 11, speedMultiplier: 0.50, simultaneousMultiplier: 1.9, activeTimeMultiplier: 0.50, decoyProbabilityMultiplier: 1.9, description: "HELL" },
  { level: 12, speedMultiplier: 0.45, simultaneousMultiplier: 2.0, activeTimeMultiplier: 0.45, decoyProbabilityMultiplier: 2.0, description: "BEYOND LIMITS" },
  { level: 13, speedMultiplier: 0.40, simultaneousMultiplier: 2.1, activeTimeMultiplier: 0.40, decoyProbabilityMultiplier: 2.1, description: "GODLIKE" },
  { level: 14, speedMultiplier: 0.35, simultaneousMultiplier: 2.2, activeTimeMultiplier: 0.35, decoyProbabilityMultiplier: 2.2, description: "TRANSCENDENT" },
  { level: 15, speedMultiplier: 0.30, simultaneousMultiplier: 2.3, activeTimeMultiplier: 0.30, decoyProbabilityMultiplier: 2.3, description: "IMPOSSIBLE" },
  { level: 16, speedMultiplier: 0.28, simultaneousMultiplier: 2.4, activeTimeMultiplier: 0.28, decoyProbabilityMultiplier: 2.4, description: "LEGENDARY" },
  { level: 17, speedMultiplier: 0.26, simultaneousMultiplier: 2.5, activeTimeMultiplier: 0.26, decoyProbabilityMultiplier: 2.5, description: "MYTHICAL" },
  { level: 18, speedMultiplier: 0.24, simultaneousMultiplier: 2.6, activeTimeMultiplier: 0.24, decoyProbabilityMultiplier: 2.6, description: "DIVINE" },
  { level: 19, speedMultiplier: 0.22, simultaneousMultiplier: 2.7, activeTimeMultiplier: 0.22, decoyProbabilityMultiplier: 2.7, description: "COSMIC" },
  { level: 20, speedMultiplier: 0.20, simultaneousMultiplier: 2.8, activeTimeMultiplier: 0.20, decoyProbabilityMultiplier: 2.8, description: "UNIVERSE BREAKING" },
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
    state.intensityLevel < (config.maxIntensityLevel || 20);

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
  const streakBonus = perfectStreak * 2; // 2 points per perfect hit
  const intensityBonus = Math.floor(intensityLevel * 5); // 5 points per intensity level reached

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
    return Math.max(200, baseTime * intensity.activeTimeMultiplier);
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
    return Math.min(0.8, baseProbability * intensity.decoyProbabilityMultiplier);
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
    case 4:
      return { cols: 2, rows: 2 };
    case 8:
      return { cols: 4, rows: 2 };
    case 12:
      return { cols: 4, rows: 3 };
    case 16:
      return { cols: 4, rows: 4 };
    case 20: // Precision Mode
      return { cols: 5, rows: 4 };
    case 40:
      return { cols: 5, rows: 8 };
    case 60:
      return { cols: 6, rows: 10 };
    case 80:
      return { cols: 8, rows: 10 };
    default:
      return { cols: 2, rows: 2 };
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