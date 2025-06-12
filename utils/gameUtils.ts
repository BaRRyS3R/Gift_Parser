// src/utils/gameUtils.ts

import { GameConfig, GameDifficulty, Circle, AdaptiveState, ClickTiming } from "@/types/game";

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
    decoyProbability: 0, // Нет обманных кругов на лёгком уровне
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
    decoyProbability: 0.1, // 10% шанс обманного круга
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
} as const;

export const getRandomActivationDelay = (config: GameConfig, adaptiveState?: AdaptiveState): number => {
  let baseDelay = Math.random() * (config.maxActivationTime - config.minActivationTime) + config.minActivationTime;

  if (adaptiveState && config.adaptiveScaling) {
    baseDelay = baseDelay * adaptiveState.activationSpeedMultiplier;
  }

  return Math.max(50, baseDelay); // Минимум 50ms
};

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
): number[] => {
  const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
    (id) => !excludeIds.includes(id),
  );

  let adjustedMaxCount = maxCount;
  if (adaptiveState) {
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

// Новые функции для расширенной игровой механики

export const calculateProgressiveWrongPenalty = (consecutiveMisses: number): number => {
  // Прогрессивный штраф: 1, 2, 3, 5, 8, 12... (растёт экспоненциально)
  if (consecutiveMisses <= 0) return 1;
  if (consecutiveMisses === 1) return 1;
  if (consecutiveMisses === 2) return 2;
  if (consecutiveMisses === 3) return 3;
  if (consecutiveMisses === 4) return 5;
  return Math.min(15, Math.floor(consecutiveMisses * 1.5)); // Максимум 15 очков штрафа
};

export const calculateDecoyPenalty = (consecutiveMisses: number): number => {
  // Штраф за клик по обманному кругу всегда больше обычного промаха
  const basePenalty = 3;
  const progressivePenalty = calculateProgressiveWrongPenalty(consecutiveMisses);
  return basePenalty + progressivePenalty;
};

export const calculateFastClickBonus = (reactionTime: number, threshold: number): number => {
  if (reactionTime <= threshold) {
    // Бонус зависит от скорости: чем быстрее, тем больше
    const speedRatio = threshold / Math.max(reactionTime, 1);
    return Math.floor(speedRatio); // от 1 до threshold раз
  }
  return 0;
};

export const updateAdaptiveState = (
  currentState: AdaptiveState,
  consecutiveHits: number,
  consecutiveMisses: number,
): AdaptiveState => {
  let newLevel = currentState.level;

  // Увеличиваем сложность при успехах
  if (consecutiveHits >= 5 && consecutiveHits % 3 === 0) {
    newLevel = Math.min(10, newLevel + 1);
  }

  // Снижаем сложность при неудачах
  if (consecutiveMisses >= 4) {
    newLevel = Math.max(0, newLevel - 1);
  }

  // Расчёт множителей на основе уровня адаптивности
  const levelRatio = newLevel / 10;

  return {
    level: newLevel,
    activationSpeedMultiplier: Math.max(0.3, 1 - levelRatio * 0.7), // От 1.0 до 0.3
    simultaneousMultiplier: 1 + levelRatio * 1.5, // От 1.0 до 2.5
    activeTimeMultiplier: Math.max(0.4, 1 - levelRatio * 0.6), // От 1.0 до 0.4
  };
};

export const shouldCreateDecoy = (probability: number): boolean => {
  return Math.random() < probability;
};

export const getAdjustedCircleActiveTime = (
  baseTime: number,
  adaptiveState?: AdaptiveState,
): number => {
  if (adaptiveState) {
    return Math.max(200, baseTime * adaptiveState.activeTimeMultiplier);
  }
  return baseTime;
};

export const calculateScoreMultiplier = (consecutiveHits: number): number => {
  // Множитель очков за последовательные попадания
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