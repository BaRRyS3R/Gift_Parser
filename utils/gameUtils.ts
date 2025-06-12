// src/utils/gameUtils.ts

import {
  GameConfig,
  GameDifficulty,
  GameMode,
  Circle,
  AdaptiveState,
  ClickTiming,
  GameStats,
  SkillLevel,
  HitAccuracy
} from "@/types/game";

export { GameDifficulty, GameMode };

export const GAME_CONFIGS: Record<GameDifficulty, GameConfig> = {
  // Обычные режимы
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
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
    gameMode: GameMode.NORMAL,
    isPrecisionMode: false,
    isReverseMode: false,
    precisionLives: 0,
    reverseScoreMultiplier: 1
  },

  // Reverse Mode (промахи дают очки, попадания отнимают)
  [GameDifficulty.REVERSE_EASY]: {
    id: "reverse_easy",
    name: "Reverse Easy",
    circleCount: 6,
    minActivationTime: 1500,
    maxActivationTime: 3000,
    maxSimultaneousCircles: 1,
    circleActiveTime: 2500,
    decoyProbability: 0.2, // Больше ловушек в reverse mode
    adaptiveScaling: false,
    fastClickThreshold: 300,
    gameMode: GameMode.REVERSE,
    isPrecisionMode: false,
    isReverseMode: true,
    precisionLives: 0,
    reverseScoreMultiplier: 1.5
  },
  [GameDifficulty.REVERSE_MEDIUM]: {
    id: "reverse_medium",
    name: "Reverse Medium",
    circleCount: 10,
    minActivationTime: 1000,
    maxActivationTime: 2500,
    maxSimultaneousCircles: 2,
    circleActiveTime: 2000,
    decoyProbability: 0.3,
    adaptiveScaling: true,
    fastClickThreshold: 250,
    gameMode: GameMode.REVERSE,
    isPrecisionMode: false,
    isReverseMode: true,
    precisionLives: 0,
    reverseScoreMultiplier: 2
  },
  [GameDifficulty.REVERSE_HARD]: {
    id: "reverse_hard",
    name: "Reverse Hard",
    circleCount: 16,
    minActivationTime: 500,
    maxActivationTime: 2000,
    maxSimultaneousCircles: 3,
    circleActiveTime: 1500,
    decoyProbability: 0.4,
    adaptiveScaling: true,
    fastClickThreshold: 200,
    gameMode: GameMode.REVERSE,
    isPrecisionMode: false,
    isReverseMode: true,
    precisionLives: 0,
    reverseScoreMultiplier: 2.5
  },
  [GameDifficulty.CHAOS_REVERSE]: {
    id: "chaos_reverse",
    name: "Chaos Reverse",
    circleCount: 24,
    minActivationTime: 200,
    maxActivationTime: 1000,
    maxSimultaneousCircles: 6,
    circleActiveTime: 800,
    decoyProbability: 0.5,
    adaptiveScaling: true,
    fastClickThreshold: 150,
    gameMode: GameMode.REVERSE,
    isPrecisionMode: false,
    isReverseMode: true,
    precisionLives: 0,
    reverseScoreMultiplier: 3
  },

  // Precision Mode (один промах = конец игры)
  [GameDifficulty.PRECISION_EASY]: {
    id: "precision_easy",
    name: "Precision Easy",
    circleCount: 8,
    minActivationTime: 1500,
    maxActivationTime: 3000,
    maxSimultaneousCircles: 1,
    circleActiveTime: 2500,
    decoyProbability: 0.1,
    adaptiveScaling: false,
    fastClickThreshold: 300,
    gameMode: GameMode.PRECISION,
    isPrecisionMode: true,
    isReverseMode: false,
    precisionLives: 1,
    reverseScoreMultiplier: 1
  },
  [GameDifficulty.PRECISION_MEDIUM]: {
    id: "precision_medium",
    name: "Precision Medium",
    circleCount: 12,
    minActivationTime: 1000,
    maxActivationTime: 2500,
    maxSimultaneousCircles: 1,
    circleActiveTime: 2000,
    decoyProbability: 0.15,
    adaptiveScaling: true,
    fastClickThreshold: 250,
    gameMode: GameMode.PRECISION,
    isPrecisionMode: true,
    isReverseMode: false,
    precisionLives: 1,
    reverseScoreMultiplier: 1
  },
  [GameDifficulty.PRECISION_HARD]: {
    id: "precision_hard",
    name: "Precision Hard",
    circleCount: 16,
    minActivationTime: 800,
    maxActivationTime: 2000,
    maxSimultaneousCircles: 2,
    circleActiveTime: 1500,
    decoyProbability: 0.2,
    adaptiveScaling: true,
    fastClickThreshold: 200,
    gameMode: GameMode.PRECISION,
    isPrecisionMode: true,
    isReverseMode: false,
    precisionLives: 1,
    reverseScoreMultiplier: 1
  },
  [GameDifficulty.ULTIMATE_PRECISION]: {
    id: "ultimate_precision",
    name: "Ultimate Precision",
    circleCount: 20,
    minActivationTime: 400,
    maxActivationTime: 1200,
    maxSimultaneousCircles: 3,
    circleActiveTime: 1000,
    decoyProbability: 0.25,
    adaptiveScaling: true,
    fastClickThreshold: 150,
    gameMode: GameMode.PRECISION,
    isPrecisionMode: true,
    isReverseMode: false,
    precisionLives: 1,
    reverseScoreMultiplier: 1
  }
} as const;

// Вспомогательные функции для новых режимов
export const calculateReverseScore = (
  wasHit: boolean,
  wasDecoy: boolean,
  consecutiveMisses: number,
  config: GameConfig
): number => {
  if (!config.isReverseMode) return 0;

  if (wasHit && !wasDecoy) {
    // В reverse mode попадания отнимают очки
    return -Math.floor(2 * config.reverseScoreMultiplier);
  } else if (!wasHit) {
    // Промахи дают очки, больше за последовательные промахи
    const baseScore = 1;
    const consecutiveBonus = Math.min(consecutiveMisses * 0.5, 5);
    return Math.floor((baseScore + consecutiveBonus) * config.reverseScoreMultiplier);
  }

  return 0;
};

export const calculatePrecisionPenalty = (config: GameConfig): boolean => {
  // В precision mode любой промах заканчивает игру
  return config.isPrecisionMode;
};

export const calculateSkillLevel = (stats: GameStats, gameMode: GameMode): SkillLevel => {
  const accuracy = stats.hitCount > 0 ? (stats.correctHits / stats.hitCount) * 100 : 0;
  const avgReactionTime = stats.hitCount > 0 ? stats.totalReactionTime / stats.hitCount : 1000;
  const consistencyScore = stats.longestStreak / Math.max(stats.hitCount, 1);

  // Комплексная оценка навыков
  let skillScore = 0;

  // Точность (40% от общей оценки)
  if (accuracy >= 95) skillScore += 40;
  else if (accuracy >= 90) skillScore += 35;
  else if (accuracy >= 85) skillScore += 30;
  else if (accuracy >= 80) skillScore += 25;
  else if (accuracy >= 70) skillScore += 20;
  else if (accuracy >= 60) skillScore += 15;
  else skillScore += 10;

  // Скорость реакции (30% от общей оценки)
  if (avgReactionTime <= 150) skillScore += 30;
  else if (avgReactionTime <= 200) skillScore += 25;
  else if (avgReactionTime <= 250) skillScore += 20;
  else if (avgReactionTime <= 300) skillScore += 15;
  else if (avgReactionTime <= 400) skillScore += 10;
  else skillScore += 5;

  // Постоянство (20% от общей оценки)
  if (consistencyScore >= 0.8) skillScore += 20;
  else if (consistencyScore >= 0.6) skillScore += 15;
  else if (consistencyScore >= 0.4) skillScore += 10;
  else skillScore += 5;

  // Специальные бонусы (10% от общей оценки)
  if (stats.perfectRuns > 0) skillScore += 5;
  if (stats.fastHits > stats.hitCount * 0.5) skillScore += 5;

  // Определяем уровень навыка
  if (skillScore >= 90) return SkillLevel.LEGENDARY;
  if (skillScore >= 80) return SkillLevel.MASTER;
  if (skillScore >= 70) return SkillLevel.EXPERT;
  if (skillScore >= 60) return SkillLevel.ADVANCED;
  if (skillScore >= 50) return SkillLevel.INTERMEDIATE;
  if (skillScore >= 35) return SkillLevel.NOVICE;
  return SkillLevel.BEGINNER;
};

export const calculateEfficiencyRating = (stats: GameStats, duration: number): number => {
  const totalActions = stats.correctHits + stats.wrongHits + stats.missedCircles;
  if (totalActions === 0) return 0;

  const accuracy = (stats.correctHits / totalActions) * 100;
  const speed = totalActions / (duration / 1000); // действий в секунду
  const consistency = stats.longestStreak / Math.max(stats.correctHits, 1);

  // Взвешенная оценка эффективности
  const efficiencyScore = (accuracy * 0.5) + (Math.min(speed * 10, 50) * 0.3) + (consistency * 100 * 0.2);

  return Math.min(Math.round(efficiencyScore), 100);
};

export const analyzeHitAccuracy = (
  clickX: number,
  clickY: number,
  circleX: number,
  circleY: number,
  circleRadius: number
): HitAccuracy => {
  const distance = Math.sqrt(Math.pow(clickX - circleX, 2) + Math.pow(clickY - circleY, 2));

  if (distance <= circleRadius * 0.3) return HitAccuracy.PERFECT;
  if (distance <= circleRadius * 0.6) return HitAccuracy.GOOD;
  if (distance <= circleRadius) return HitAccuracy.OKAY;
  if (distance <= circleRadius * 1.5) return HitAccuracy.NEAR_MISS;
  return HitAccuracy.MISS;
};

export const updateExtendedStats = (
  currentStats: GameStats,
  action: 'hit' | 'miss' | 'decoy' | 'multitouch',
  additionalData?: any
): GameStats => {
  const newStats = { ...currentStats };

  switch (action) {
    case 'hit':
      // Обновляем серии попаданий
      newStats.consecutiveHits++;
      newStats.consecutiveMisses = 0;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.consecutiveHits);

      // Проверяем идеальные серии
      if (newStats.consecutiveHits >= 5 && newStats.consecutiveHits % 5 === 0) {
        newStats.perfectRuns++;
      }
      break;

    case 'miss':
      newStats.consecutiveMisses++;
      newStats.consecutiveHits = 0;
      break;

    case 'multitouch':
      newStats.multiTouchEvents++;
      break;
  }

  return newStats;
};

// Существующие функции (оставляем без изменений)
export const getRandomActivationDelay = (config: GameConfig, adaptiveState?: AdaptiveState): number => {
  let baseDelay = Math.random() * (config.maxActivationTime - config.minActivationTime) + config.minActivationTime;

  if (adaptiveState && config.adaptiveScaling) {
    baseDelay = baseDelay * adaptiveState.activationSpeedMultiplier;
  }

  return Math.max(50, baseDelay);
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
    case 6:
      return { cols: 3, rows: 2 };
    case 8:
      return { cols: 4, rows: 2 };
    case 10:
      return { cols: 5, rows: 2 };
    case 12:
      return { cols: 4, rows: 3 };
    case 16:
      return { cols: 4, rows: 4 };
    case 20:
      return { cols: 5, rows: 4 };
    case 24:
      return { cols: 6, rows: 4 };
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