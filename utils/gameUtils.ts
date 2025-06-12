// src/utils/gameUtils.ts

import {
  GameConfig,
  GameDifficulty,
  GameMode,
  Circle,
  AdaptiveState,
  ClickTiming,
  PowerUp,
  PowerUpType,
  GameEffect,
  Achievement,
  AchievementCategory,
  GameStats,
  GameResult,
  MemorySequence
} from "@/types/game";

export { GameDifficulty, GameMode };

// Базовые конфигурации сложности
const BASE_DIFFICULTY_CONFIGS = {
  [GameDifficulty.EASY]: {
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
    circleCount: 80,
    minActivationTime: 50,
    maxActivationTime: 500,
    maxSimultaneousCircles: 20,
    circleActiveTime: 400,
    decoyProbability: 0.35,
    adaptiveScaling: true,
    fastClickThreshold: 100,
  },
};

// Полные конфигурации игровых режимов
export const GAME_CONFIGS: Record<string, GameConfig> = {
  // Классические режимы (старые)
  [GameDifficulty.EASY]: {
    id: "easy",
    name: "NOOB",
    description: "Perfect for beginners",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.EASY],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.MEDIUM]: {
    id: "medium",
    name: "CASUAL",
    description: "Moderate challenge",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.MEDIUM],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.HARD]: {
    id: "hard",
    name: "PRO",
    description: "Advanced mechanics",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.HARD],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.LEGENDARY]: {
    id: "legendary",
    name: "LEGEND",
    description: "Expert-level play",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.LEGENDARY],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.OMG]: {
    id: "omg",
    name: "OMG",
    description: "Extreme intensity",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.OMG],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.NIGHTMARE]: {
    id: "nightmare",
    name: "NIGHTMARE",
    description: "Maximum complexity",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.NIGHTMARE],
    gameMode: GameMode.CLASSIC,
  },
  [GameDifficulty.IMPOSSIBLE]: {
    id: "impossible",
    name: "RAGE MODE",
    description: "Ultimate challenge",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.IMPOSSIBLE],
    gameMode: GameMode.CLASSIC,
  },

  // Time Attack режимы
  [GameMode.TIME_ATTACK_60]: {
    id: "time_attack_60",
    name: "BLITZ",
    description: "Maximum points in 60 seconds",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.MEDIUM],
    gameMode: GameMode.TIME_ATTACK_60,
    gameDuration: 60,
    powerUpsEnabled: [PowerUpType.DOUBLE_SCORE, PowerUpType.MAGNET, PowerUpType.COMBO_BOOST],
  },
  [GameMode.TIME_ATTACK_90]: {
    id: "time_attack_90",
    name: "RUSH",
    description: "Maximum points in 90 seconds",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.HARD],
    gameMode: GameMode.TIME_ATTACK_90,
    gameDuration: 90,
    powerUpsEnabled: [PowerUpType.DOUBLE_SCORE, PowerUpType.MAGNET, PowerUpType.COMBO_BOOST],
  },
  [GameMode.TIME_ATTACK_120]: {
    id: "time_attack_120",
    name: "MARATHON",
    description: "Maximum points in 2 minutes",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.LEGENDARY],
    gameMode: GameMode.TIME_ATTACK_120,
    gameDuration: 120,
    powerUpsEnabled: [PowerUpType.DOUBLE_SCORE, PowerUpType.MAGNET, PowerUpType.COMBO_BOOST, PowerUpType.SHIELD],
  },

  // Специальные режимы
  [GameMode.PRECISION]: {
    id: "precision",
    name: "PRECISION",
    description: "One miss = game over",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.MEDIUM],
    gameMode: GameMode.PRECISION,
    isPrecisionMode: true,
    circleActiveTime: 3000, // Дольше показываем круги
    powerUpsEnabled: [PowerUpType.SHIELD, PowerUpType.SLOW_TIME, PowerUpType.VISION],
  },
  [GameMode.MEMORY]: {
    id: "memory",
    name: "MEMORY",
    description: "Remember the positions",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.EASY],
    gameMode: GameMode.MEMORY,
    isMemoryMode: true,
    memoryShowTime: 2000,
    circleCount: 6,
    maxSimultaneousCircles: 3,
  },
  [GameMode.SEQUENCE]: {
    id: "sequence",
    name: "SEQUENCE",
    description: "Repeat the pattern",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.EASY],
    gameMode: GameMode.SEQUENCE,
    isSequenceMode: true,
    sequenceLength: 3,
    circleCount: 8,
  },
  [GameMode.BLIND]: {
    id: "blind",
    name: "BLIND",
    description: "Blink and you miss",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.HARD],
    gameMode: GameMode.BLIND,
    isBlindMode: true,
    blindFlashTime: 200,
    circleActiveTime: 200,
  },
  [GameMode.REVERSE]: {
    id: "reverse",
    name: "REVERSE",
    description: "Misses give points, hits lose points",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.MEDIUM],
    gameMode: GameMode.REVERSE,
    isReverseMode: true,
    decoyProbability: 0,
  },

  // Хаос режимы
  [GameMode.EARTHQUAKE]: {
    id: "earthquake",
    name: "EARTHQUAKE",
    description: "Circles shake constantly",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.HARD],
    gameMode: GameMode.EARTHQUAKE,
    effectsEnabled: [GameEffect.EARTHQUAKE],
  },
  [GameMode.TORNADO]: {
    id: "tornado",
    name: "TORNADO",
    description: "Spinning circles everywhere",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.HARD],
    gameMode: GameMode.TORNADO,
    effectsEnabled: [GameEffect.TORNADO],
  },
  [GameMode.CHAOS]: {
    id: "chaos",
    name: "CHAOS",
    description: "All effects active",
    ...BASE_DIFFICULTY_CONFIGS[GameDifficulty.LEGENDARY],
    gameMode: GameMode.CHAOS,
    effectsEnabled: [GameEffect.EARTHQUAKE, GameEffect.TORNADO, GameEffect.FADE, GameEffect.SCALE],
    powerUpsEnabled: [PowerUpType.SHIELD, PowerUpType.SLOW_TIME, PowerUpType.FREEZE],
  },
};

// Power-up конфигурации
export const POWER_UP_CONFIGS: Record<PowerUpType, Omit<PowerUp, 'isActive' | 'remainingTime'>> = {
  [PowerUpType.DOUBLE_SCORE]: {
    type: PowerUpType.DOUBLE_SCORE,
    name: "DOUBLE SCORE",
    description: "2x points for 10 seconds",
    duration: 10000,
    cooldown: 30000,
    icon: "⚡",
  },
  [PowerUpType.MAGNET]: {
    type: PowerUpType.MAGNET,
    name: "MAGNET",
    description: "Auto-aim to nearest circle",
    duration: 8000,
    cooldown: 25000,
    icon: "🧲",
  },
  [PowerUpType.SLOW_TIME]: {
    type: PowerUpType.SLOW_TIME,
    name: "SLOW TIME",
    description: "Everything moves slower",
    duration: 5000,
    cooldown: 35000,
    icon: "⏰",
  },
  [PowerUpType.FREEZE]: {
    type: PowerUpType.FREEZE,
    name: "FREEZE",
    description: "Stop all circles for 3 seconds",
    duration: 3000,
    cooldown: 40000,
    icon: "❄️",
  },
  [PowerUpType.MULTI_HIT]: {
    type: PowerUpType.MULTI_HIT,
    name: "MULTI HIT",
    description: "Next hit counts as 3",
    duration: 0, // Мгновенный эффект
    cooldown: 20000,
    icon: "💥",
  },
  [PowerUpType.VISION]: {
    type: PowerUpType.VISION,
    name: "VISION",
    description: "See future circles",
    duration: 5000,
    cooldown: 30000,
    icon: "👁️",
  },
  [PowerUpType.SHIELD]: {
    type: PowerUpType.SHIELD,
    name: "SHIELD",
    description: "Protect from one miss",
    duration: 0, // Длится до использования
    cooldown: 45000,
    icon: "🛡️",
  },
  [PowerUpType.COMBO_BOOST]: {
    type: PowerUpType.COMBO_BOOST,
    name: "COMBO BOOST",
    description: "Higher combo multiplier",
    duration: 10000,
    cooldown: 35000,
    icon: "🔥",
  },
};

// Достижения
export const ACHIEVEMENTS: Achievement[] = [
  // Streak достижения
  {
    id: "streak_10",
    icon: "🎯",
    name: "SHARPSHOOTER",
    desc: "10 hits in a row",
    category: AchievementCategory.STREAK,
    condition: (stats) => stats.consecutiveHits >= 10,
  },
  {
    id: "streak_25",
    icon: "🏹",
    name: "MARKSMAN",
    desc: "25 hits in a row",
    category: AchievementCategory.STREAK,
    condition: (stats) => stats.consecutiveHits >= 25,
  },
  {
    id: "streak_50",
    icon: "🎖️",
    name: "SNIPER",
    desc: "50 hits in a row",
    category: AchievementCategory.STREAK,
    condition: (stats) => stats.consecutiveHits >= 50,
  },

  // Speed достижения
  {
    id: "speed_demon",
    icon: "⚡",
    name: "SPEED DEMON",
    desc: "10 reactions under 100ms",
    category: AchievementCategory.SPEED,
    condition: (stats) => stats.speedDemons >= 10,
  },
  {
    id: "lightning_fast",
    icon: "🌩️",
    name: "LIGHTNING FAST",
    desc: "Average reaction under 150ms",
    category: AchievementCategory.SPEED,
    condition: (stats) => stats.averageReactionTime > 0 && stats.averageReactionTime < 150,
  },

  // Combo достижения
  {
    id: "combo_king",
    icon: "👑",
    name: "COMBO KING",
    desc: "Achieve 20x combo",
    category: AchievementCategory.COMBO,
    condition: (stats) => stats.maxCombo >= 20,
  },
  {
    id: "combo_master",
    icon: "🔥",
    name: "COMBO MASTER",
    desc: "Achieve 50x combo",
    category: AchievementCategory.COMBO,
    condition: (stats) => stats.maxCombo >= 50,
  },

  // Precision достижения
  {
    id: "perfectionist",
    icon: "💎",
    name: "PERFECTIONIST",
    desc: "100% accuracy in a game",
    category: AchievementCategory.PRECISION,
    condition: (stats, result) => result ? result.accuracy === 100 && result.correctHits >= 10 : false,
  },
  {
    id: "consistency_king",
    icon: "📊",
    name: "CONSISTENCY KING",
    desc: "95%+ accuracy in 5 consecutive games",
    category: AchievementCategory.PRECISION,
    condition: (stats) => stats.lastShotAccuracy >= 95,
  },

  // Special достижения
  {
    id: "power_user",
    icon: "⚡",
    name: "POWER USER",
    desc: "Use 50 power-ups",
    category: AchievementCategory.SPECIAL,
    condition: (stats) => stats.totalPowerUpsUsed >= 50,
  },
  {
    id: "memory_master",
    icon: "🧠",
    name: "MEMORY MASTER",
    desc: "Complete 10 memory sequences",
    category: AchievementCategory.MODE_SPECIFIC,
    condition: (stats) => (stats.memorySequencesCompleted || 0) >= 10,
  },
];

// Utility функции

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
    rotationAngle: 0,
    shakeOffset: { x: 0, y: 0 },
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

// Combo система
export const calculateComboMultiplier = (comboCount: number, hasComboBoost: boolean = false): number => {
  const baseMultiplier = Math.min(1 + (comboCount * 0.1), 5); // Максимум x5
  return hasComboBoost ? baseMultiplier * 1.5 : baseMultiplier;
};

export const calculateComboScore = (baseScore: number, comboCount: number, hasComboBoost: boolean = false): number => {
  const multiplier = calculateComboMultiplier(comboCount, hasComboBoost);
  return Math.floor(baseScore * multiplier);
};

// Power-up логика
export const createPowerUp = (type: PowerUpType): PowerUp => {
  const config = POWER_UP_CONFIGS[type];
  return {
    ...config,
    isActive: false,
    remainingTime: 0,
  };
};

export const shouldSpawnPowerUp = (gameTime: number, lastPowerUpTime: number, frequency: number = 15000): boolean => {
  return gameTime - lastPowerUpTime > frequency && Math.random() < 0.3;
};

// Эффекты
export const applyEarthquakeEffect = (circles: Circle[], intensity: number = 1): Circle[] => {
  return circles.map(circle => ({
    ...circle,
    shakeOffset: {
      x: (Math.random() - 0.5) * 10 * intensity,
      y: (Math.random() - 0.5) * 10 * intensity,
    },
  }));
};

export const applyTornadoEffect = (circles: Circle[], gameTime: number, intensity: number = 1): Circle[] => {
  return circles.map(circle => ({
    ...circle,
    rotationAngle: (gameTime * 0.002 * intensity + circle.id * 0.5) % (Math.PI * 2),
  }));
};

// Memory Mode
export const createMemorySequence = (circleCount: number, sequenceLength: number): MemorySequence => {
  const circles: number[] = [];
  for (let i = 0; i < sequenceLength; i++) {
    circles.push(Math.floor(Math.random() * circleCount));
  }

  return {
    circles,
    currentStep: 0,
    isComplete: false,
    startTime: Date.now(),
  };
};

export const validateMemoryStep = (sequence: MemorySequence, clickedCircleId: number): boolean => {
  return sequence.circles[sequence.currentStep] === clickedCircleId;
};

// Точность и консистентность
export const calculateConsistencyRating = (clickTimings: ClickTiming[]): number => {
  if (clickTimings.length < 5) return 0;

  const reactionTimes = clickTimings.map(t => t.reactionTime);
  const average = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
  const variance = reactionTimes.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / reactionTimes.length;
  const standardDeviation = Math.sqrt(variance);

  // Чем меньше отклонение, тем выше консистентность
  return Math.max(0, Math.min(100, 100 - (standardDeviation / average) * 100));
};

export const updateLastShotAccuracy = (clickTimings: ClickTiming[]): number => {
  const recent = clickTimings.slice(-10);
  if (recent.length === 0) return 0;

  const hits = recent.filter(timing => timing.reactionTime > 0).length;
  return Math.round((hits / recent.length) * 100);
};

// Прочие вспомогательные функции
export const calculateAccuracy = (correctHits: number, totalClicks: number): number => {
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
    effectIntensity: Math.min(1, levelRatio * 1.2),
    powerUpFrequency: Math.max(0.5, 1 - levelRatio * 0.5),
    comboRequirement: Math.max(3, 5 - Math.floor(levelRatio * 2)),
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

// Проверка достижений
export const checkAchievements = (stats: GameStats, result?: GameResult): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement =>
    !achievement.isUnlocked && achievement.condition(stats, result)
  );
};