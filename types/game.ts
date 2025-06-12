// src/types/game.ts

export interface Circle {
  id: number;
  isActive: boolean;
  isAnimating: boolean;
  isDecoy: boolean;
  isMemoryVisible?: boolean; // Для Memory Mode
  sequenceOrder?: number; // Для Sequence Mode
  x?: number;
  y?: number;
  rotationAngle?: number; // Для Tornado эффекта
  shakeOffset?: { x: number; y: number }; // Для Earthquake эффекта
}

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
  // Новая статистика
  maxCombo: number; // Максимальное комбо
  currentCombo: number; // Текущее комбо
  perfectStreak: number; // Идеальная серия (без промахов)
  speedDemons: number; // Количество очень быстрых реакций (<100ms)
  lastShotAccuracy: number; // Точность последних 10 выстрелов
  totalPowerUpsUsed: number; // Использованные power-ups
  memorySequencesCompleted: number; // Завершенные последовательности в Memory Mode
  sequencesCompleted: number; // Завершенные последовательности в Sequence Mode
  averageComboLength: number; // Средняя длина комбо
  lastClickTimings: ClickTiming[]; // Последние клики для анализа
}

export interface GameConfig {
  id: string;
  name: string;
  description: string; // Добавим описание для новых режимов
  circleCount: number;
  minActivationTime: number;
  maxActivationTime: number;
  maxSimultaneousCircles: number;
  circleActiveTime: number;
  decoyProbability: number;
  adaptiveScaling: boolean;
  fastClickThreshold: number;
  // Новые настройки для различных режимов
  gameMode: GameMode;
  gameDuration?: number; // Для Time Attack режимов
  isPrecisionMode?: boolean; // Один промах = конец
  isMemoryMode?: boolean; // Показать и скрыть
  isSequenceMode?: boolean; // Повторить последовательность
  isBlindMode?: boolean; // Быстрое появление/исчезновение
  isReverseMode?: boolean; // Промахи дают очки
  memoryShowTime?: number; // Время показа в Memory Mode
  sequenceLength?: number; // Длина последовательности в Sequence Mode
  blindFlashTime?: number; // Время вспышки в Blind Mode
  effectsEnabled?: GameEffect[]; // Активные эффекты
  powerUpsEnabled?: PowerUpType[]; // Доступные power-ups
}

export enum GameDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  LEGENDARY = "legendary",
  OMG = "omg",
  NIGHTMARE = "nightmare",
  IMPOSSIBLE = "impossible",
}

export enum GameMode {
  // Классические режимы
  CLASSIC = "classic",

  // Time Attack режимы
  TIME_ATTACK_60 = "time_attack_60",
  TIME_ATTACK_90 = "time_attack_90",
  TIME_ATTACK_120 = "time_attack_120",

  // Специальные режимы
  PRECISION = "precision",
  MEMORY = "memory",
  SEQUENCE = "sequence",
  BLIND = "blind",
  REVERSE = "reverse",

  // Хаос режимы (комбинация эффектов)
  EARTHQUAKE = "earthquake",
  TORNADO = "tornado",
  CHAOS = "chaos", // Все эффекты сразу
}

export enum GameEffect {
  EARTHQUAKE = "earthquake", // Круги трясутся
  TORNADO = "tornado", // Круги вращаются
  FADE = "fade", // Круги пульсируют прозрачностью
  SCALE = "scale", // Круги меняют размер
  COLOR_SHIFT = "color_shift", // Круги меняют цвет
  GRAVITY = "gravity", // Круги "падают" вниз
}

export enum PowerUpType {
  DOUBLE_SCORE = "double_score", // Удвоенные очки на 10 секунд
  MAGNET = "magnet", // Автоматически притягивает клики
  SLOW_TIME = "slow_time", // Замедляет время на 5 секунд
  FREEZE = "freeze", // Замораживает круги на 3 секунды
  MULTI_HIT = "multi_hit", // Следующий клик засчитывается как 3
  VISION = "vision", // Показывает будущие круги на 5 секунд
  SHIELD = "shield", // Защищает от одного промаха
  COMBO_BOOST = "combo_boost", // Увеличивает множитель комбо на 10 секунд
}

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  duration: number; // В миллисекундах, 0 = мгновенный эффект
  cooldown: number; // Время до следующего использования
  isActive: boolean;
  remainingTime: number;
  icon: string; // Эмодзи или иконка
}

export interface Achievement {
  id: string;
  icon: string; // Эмодзи иконка
  name: string;
  desc: string;
  category: AchievementCategory;
  condition: (stats: GameStats, result?: GameResult) => boolean;
  isUnlocked?: boolean;
  unlockedAt?: Date;
}

export enum AchievementCategory {
  STREAK = "streak", // За серии
  SPEED = "speed", // За скорость
  PRECISION = "precision", // За точность
  ENDURANCE = "endurance", // За выносливость
  COMBO = "combo", // За комбо
  SPECIAL = "special", // Специальные достижения
  MODE_SPECIFIC = "mode_specific", // Для конкретных режимов
}

export enum GameState {
  NOT_STARTED = "not_started",
  STARTING = "starting",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
  MEMORY_SHOWING = "memory_showing", // Показ кругов в Memory Mode
  MEMORY_RECALL = "memory_recall", // Воспроизведение в Memory Mode
  SEQUENCE_SHOWING = "sequence_showing", // Показ последовательности
  SEQUENCE_INPUT = "sequence_input", // Ввод последовательности
}

export interface GameResult {
  difficulty: GameDifficulty;
  mode: GameMode;
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
  // Новые метрики
  maxCombo: number;
  perfectStreak: number;
  speedDemons: number;
  consistencyRating: number; // Рейтинг стабильности (0-100)
  effectiveness: number; // Эффективность (очки за секунду)
  powerUpsUsed: number;
  memorySequencesCompleted?: number;
  sequencesCompleted?: number;
  achievements: string[]; // ID разблокированных достижений
}

export interface AdaptiveState {
  level: number;
  activationSpeedMultiplier: number;
  simultaneousMultiplier: number;
  activeTimeMultiplier: number;
  // Новые адаптивные параметры
  effectIntensity: number; // Интенсивность эффектов (0-1)
  powerUpFrequency: number; // Частота появления power-ups
  comboRequirement: number; // Требование для комбо
}

export interface ClickTiming {
  circleId: number;
  clickTime: number;
  activationTime: number;
  reactionTime: number;
  wasComboHit?: boolean;
  powerUpActive?: PowerUpType[];
}

export interface MemorySequence {
  circles: number[]; // ID кругов в последовательности
  currentStep: number; // Текущий шаг воспроизведения
  isComplete: boolean;
  startTime: number;
}

export interface GameSession {
  mode: GameMode;
  difficulty: GameDifficulty | GameMode;
  startTime: number;
  activePowerUps: PowerUp[];
  effects: GameEffect[];
  memorySequence?: MemorySequence;
  comboMultiplier: number;
  lastClickTimings: ClickTiming[]; // Последние 10 кликов для анализа
}