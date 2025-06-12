// src/types/game.ts

export interface Circle {
  id: number;
  isActive: boolean;
  isAnimating: boolean;
  isDecoy: boolean;
  x?: number;
  y?: number;
}

// Расширенная статистика игры
export interface GameStats {
  score: number;
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  totalCircles: number;
  decoyHits: number;
  consecutiveHits: number;
  consecutiveMisses: number;
  fastHits: number;
  totalReactionTime: number;
  hitCount: number;

  // Новая расширенная статистика
  perfectRuns: number; // Количество идеальных серий (5+ попаданий подряд без промахов)
  nearMisses: number; // Количество кликов рядом с активными кругами (но не по ним)
  doubleHits: number; // Количество двойных нажатий на один круг
  speedBonusTotal: number; // Общий бонус за скорость
  longestStreak: number; // Самая длинная серия попаданий за игру
  averageTimeBetweenHits: number; // Среднее время между попаданиями
  earlyClicks: number; // Клики до активации круга
  lateClicks: number; // Клики после деактивации круга
  multiTouchEvents: number; // Количество мультитач событий
  precisionMisses: number; // Промахи в precision mode (для статистики)
}

// Расширенная конфигурация игры
export interface GameConfig {
  id: string;
  name: string;
  circleCount: number;
  minActivationTime: number;
  maxActivationTime: number;
  maxSimultaneousCircles: number;
  circleActiveTime: number;
  decoyProbability: number;
  adaptiveScaling: boolean;
  fastClickThreshold: number;

  // Новые параметры для специальных режимов
  gameMode: GameMode;
  isPrecisionMode: boolean; // Один промах = конец игры
  isReverseMode: boolean; // Промахи дают очки, попадания отнимают
  precisionLives: number; // Количество жизней в precision mode
  reverseScoreMultiplier: number; // Множитель очков в reverse mode
}

// Новый enum для игровых режимов
export enum GameMode {
  NORMAL = "normal",
  REVERSE = "reverse",
  PRECISION = "precision",
  REVERSE_PRECISION = "reverse_precision" // Комбинированный режим
}

export enum GameDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  LEGENDARY = "legendary",
  OMG = "omg",
  NIGHTMARE = "nightmare",
  IMPOSSIBLE = "impossible",

  // Новые специальные режимы
  REVERSE_EASY = "reverse_easy",
  REVERSE_MEDIUM = "reverse_medium",
  REVERSE_HARD = "reverse_hard",
  PRECISION_EASY = "precision_easy",
  PRECISION_MEDIUM = "precision_medium",
  PRECISION_HARD = "precision_hard",
  ULTIMATE_PRECISION = "ultimate_precision", // Самый сложный precision режим
  CHAOS_REVERSE = "chaos_reverse" // Самый сложный reverse режим
}

export enum GameState {
  NOT_STARTED = "not_started",
  STARTING = "starting",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
  PRECISION_FAILED = "precision_failed" // Новое состояние для precision mode
}

// Расширенный результат игры
export interface GameResult {
  difficulty: GameDifficulty;
  gameMode: GameMode;
  score: number;
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  decoyHits: number;
  accuracy: number;
  duration: number;
  fastHits: number;
  averageReactionTime: number;
  adaptiveLevel: number;

  // Новые поля результата
  perfectRuns: number;
  longestStreak: number;
  speedBonusTotal: number;
  multiTouchEvents: number;
  precisionMisses: number;
  survivalTime: number; // Время выживания в precision mode
  efficiencyRating: number; // Общий рейтинг эффективности (0-100)
  skillLevel: SkillLevel; // Определенный уровень навыка
}

// Новый enum для уровня навыка
export enum SkillLevel {
  BEGINNER = "beginner",
  NOVICE = "novice",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
  MASTER = "master",
  LEGENDARY = "legendary"
}

export interface Achievement {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  desc: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlockedAt?: string;
}

// Новые enums для достижений
export enum AchievementCategory {
  GENERAL = "general",
  SPEED = "speed",
  ACCURACY = "accuracy",
  ENDURANCE = "endurance",
  SPECIAL = "special",
  PRECISION = "precision",
  REVERSE = "reverse"
}

export enum AchievementRarity {
  COMMON = "common",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary"
}

export interface AdaptiveState {
  level: number;
  activationSpeedMultiplier: number;
  simultaneousMultiplier: number;
  activeTimeMultiplier: number;
}

export interface ClickTiming {
  circleId: number;
  clickTime: number;
  activationTime: number;
  reactionTime: number;
  wasMultiTouch: boolean; // Было ли это мультитач событие
  hitAccuracy: HitAccuracy; // Точность попадания
}

// Новый enum для точности попадания
export enum HitAccuracy {
  PERFECT = "perfect", // Прямо по центру
  GOOD = "good", // Близко к центру
  OKAY = "okay", // В пределах круга
  NEAR_MISS = "near_miss", // Рядом с кругом
  MISS = "miss" // Далеко от круга
}

// Расширенная статистика сессии
export interface SessionStats {
  totalPlayTime: number;
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  totalScore: number;
  overallAccuracy: number;
  favoriteMode: GameMode;
  favoriteDifficulty: GameDifficulty;
  skillProgression: SkillLevel[];
  achievementsUnlocked: number;
}

// Детальная аналитика для профиля
export interface PlayerAnalytics {
  strengthAreas: SkillArea[];
  weaknessAreas: SkillArea[];
  recommendedModes: GameDifficulty[];
  skillGrowthRate: number; // Процент улучшения за последнюю неделю
  consistencyRating: number; // Постоянство результатов (0-100)
  adaptabilityRating: number; // Способность адаптироваться к новым режимам
}

export interface SkillArea {
  name: string;
  rating: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  description: string;
}