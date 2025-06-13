// src/types/game.ts - Enhanced version with Updated Difficulty System

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

export enum GameDifficulty {
  HARD = "hard",           // Now the easiest (was 3rd)
  LEGENDARY = "legendary", // Medium (was 4th)
  OMG = "omg",            // Hard (was 5th)
  NIGHTMARE = "nightmare", // Super hard (was 6th)
  IMPOSSIBLE = "impossible", // Nerfed (was 7th)
  PRECISION = "precision", // Special mode
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
  deathCause?: 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout';
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
  simultaneousCircles: number;
  redCircles: number; // absolute number of red circles to spawn
  activationTimeMin: number; // milliseconds
  activationTimeMax: number; // milliseconds
  circleActiveTime: number; // milliseconds
  description: string;
}

export interface IntensityLevel {
  level: number;
  speedMultiplier: number;
  simultaneousMultiplier: number;
  activeTimeMultiplier: number;
  decoyProbabilityMultiplier: number;
  description: string;
}