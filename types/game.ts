// src/types/game.ts

export interface Circle {
  id: number;
  isActive: boolean;
  isAnimating: boolean;
  isDecoy: boolean; // Новое: обманный круг (красный)
  x?: number;
  y?: number;
}

export interface GameStats {
  score: number;
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  totalCircles: number;
  decoyHits: number; // Новое: попадания по обманным кругам
  consecutiveHits: number; // Новое: последовательные попадания
  consecutiveMisses: number; // Новое: последовательные промахи
  fastHits: number; // Новое: быстрые попадания (бонусные очки)
  totalReactionTime: number; // Новое: общее время реакции
  hitCount: number; // Новое: количество попаданий для расчёта среднего времени
}

export interface GameConfig {
  id: string;
  name: string;
  circleCount: number;
  minActivationTime: number;
  maxActivationTime: number;
  maxSimultaneousCircles: number;
  circleActiveTime: number;
  decoyProbability: number; // Новое: вероятность появления обманного круга (0-1)
  adaptiveScaling: boolean; // Новое: включена ли адаптивная сложность
  fastClickThreshold: number; // Новое: порог для быстрого клика в миллисекундах
}

export enum GameDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  LEGENDARY = "legendary",
  OMG = "omg",
  NIGHTMARE = "nightmare", // Новый уровень
  IMPOSSIBLE = "impossible", // Новый уровень
}

export enum GameState {
  NOT_STARTED = "not_started",
  STARTING = "starting",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
}

export interface GameResult {
  difficulty: GameDifficulty;
  score: number;
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  decoyHits: number; // Новое
  accuracy: number;
  duration: number;
  fastHits: number; // Новое
  averageReactionTime: number; // Новое
  adaptiveLevel: number; // Новое: достигнутый уровень адаптивности
}

export interface Achievement {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  desc: string;
}

export interface AdaptiveState {
  level: number; // Текущий уровень адаптивности (0-10)
  activationSpeedMultiplier: number; // Множитель скорости активации
  simultaneousMultiplier: number; // Множитель одновременных кругов
  activeTimeMultiplier: number; // Множитель времени жизни кругов
}

export interface ClickTiming {
  circleId: number;
  clickTime: number;
  activationTime: number;
  reactionTime: number;
}