// src/types/game.ts - Updated game types for new difficulty system

export interface Circle {
  id: number;
  isActive: boolean;
  isAnimating: boolean;
  isDecoy: boolean;
  x?: number;
  y?: number;
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
  // Precision Mode specific stats
  currentIntensityLevel?: number;
  survivalTime?: number;
  perfectStreak?: number;
}

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
  // Precision Mode specific config
  isPrecisionMode?: boolean;
  intensityIncreaseInterval?: number; // seconds
  intensityMultiplier?: number;
  maxIntensityLevel?: number;
}

// Updated difficulty enum with streamlined progression
export enum GameDifficulty {
  LEGENDARY = "legendary", // BEGINNER - 5x5 grid (25 circles)
  OMG = "omg", // INTERMEDIATE - 5x5 grid (25 circles)
  NIGHTMARE = "nightmare", // ADVANCED - 6x6 grid (36 circles)
  IMPOSSIBLE = "impossible", // EXPERT - 7x7 grid (49 circles)
  PRECISION = "precision", // SURVIVAL - 7x7 grid (49 circles)
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
  decoyHits: number;
  accuracy: number;
  duration: number;
  fastHits: number;
  averageReactionTime: number;
  adaptiveLevel: number;
  // Precision Mode specific results
  survivalTime?: number;
  maxIntensityReached?: number;
  perfectStreak?: number;
  deathCause?: "miss" | "wrong_click" | "decoy_hit" | "timeout";
}

export interface Achievement {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  desc: string;
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
}

// Precision Mode specific interfaces
export interface PrecisionModeState {
  intensityLevel: number;
  timeInCurrentLevel: number;
  survivalTime: number;
  perfectStreak: number;
  isActive: boolean;
}

export interface PrecisionLevelConfig {
  level: number;
  simultaneousCircles: number; // Total number of circles to activate simultaneously
  redCircles: number; // Number of red trap circles in each activation
  activationTimeMin: number; // Minimum time between activations (ms)
  activationTimeMax: number; // Maximum time between activations (ms)
  circleActiveTime: number; // How long circles stay active (ms)
  description: string; // Level description
}

export interface IntensityLevel {
  level: number;
  speedMultiplier: number;
  simultaneousMultiplier: number;
  activeTimeMultiplier: number;
  decoyProbabilityMultiplier: number;
  description: string;
}
