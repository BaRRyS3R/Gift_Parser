// src/types/game-modes/rotation.ts - Game result types for rotation mode with comprehensive logging

import { BaseGameResult, GameState, GameMode, Circle } from "./common";

export interface RotationCircle extends Circle {
  angle: number; // Current angle in radians
  targetAngle?: number; // Target angle for smooth transitions
}

export interface RotationGameConfig {
  id: string;
  name: string;
  circleCount: number; // 14 circles
  radius: number; // Radius of the rotation circle
  initialRotationSpeed: number; // Initial rotation speed (radians per frame)
  initialActivationTimeMin: number; // 1500ms
  initialActivationTimeMax: number; // 2500ms
  initialCircleActiveTime: number; // 2500ms
  intensityIncreaseInterval: number; // 10 seconds
  maxIntensityLevel: number; // 10
  simultaneousCirclesMin: number; // 1
  simultaneousCirclesMax: number; // 3
}

export interface RotationLevelConfig {
  level: number;
  simultaneousCircles: number;
  redCircles: number;
  activationTimeMin: number;
  activationTimeMax: number;
  circleActiveTime: number;
  rotationSpeed: number; // Rotation speed for this level
  description: string;
}

// Comprehensive logging system
export interface CircleActivationLog {
  circleId: number;
  timestamp: number;
  level: number;
  isDecoy: boolean;
  scheduledDeactivationTime: number;
  position: { x: number; y: number };
  gameTime: number;
}

export interface CircleClickLog {
  circleId: number;
  timestamp: number;
  level: number;
  gameTime: number;
  clickResult: "correct" | "wrong" | "decoy" | "inactive";
  circleWasActive: boolean;
  circleWasDecoy: boolean;
  circleWasAnimating: boolean;
  activationTime?: number; // When the circle was activated
  reactionTime?: number; // Time between activation and click
  position: { x: number; y: number };
  debounceBlocked: boolean;
}

export interface CircleDeactivationLog {
  circleId: number;
  timestamp: number;
  level: number;
  reason: "timeout" | "correct_click" | "game_end";
  gameTime: number;
  wasActive: boolean;
  wasDecoy: boolean;
}

export interface LevelTransitionLog {
  fromLevel: number;
  toLevel: number;
  timestamp: number;
  gameTime: number;
  activeCirclesAtTransition: number[];
}

export interface GameEventLog {
  type: "game_start" | "game_end" | "level_transition" | "circle_activation" | "circle_click" | "circle_deactivation" | "error";
  timestamp: number;
  gameTime: number;
  level: number;
  data: any;
}

export interface GameDebugLog {
  activations: CircleActivationLog[];
  clicks: CircleClickLog[];
  deactivations: CircleDeactivationLog[];
  levelTransitions: LevelTransitionLog[];
  events: GameEventLog[];
  errors: Array<{
    timestamp: number;
    error: string;
    context: any;
  }>;
}

export interface RotationGameStats {
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  decoyHits: number;
  survivalTime: number;
  currentLevel: number;
  perfectStreak: number;
  totalReactionTime: number;
  hitCount: number;
  gameStartTime?: number;
  debugLog: GameDebugLog;
}

export interface RotationGameResult extends BaseGameResult {
  mode: GameMode.ROTATION;
  survivalTime: number;
  maxLevelReached: number;
  perfectStreak: number;
  correctHits: number;
  deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  debugLog: GameDebugLog;
  averageReactionTime: number;
  totalActivations: number;
  totalClicks: number;
}

export interface RotationGameState {
  config: RotationGameConfig;
  gameState: GameState;
  stats: RotationGameStats;
  circles: RotationCircle[];
  currentLevel: number;
  timeInCurrentLevel: number;
  activeCircleIds: number[];
  circleTimeouts: Map<number, NodeJS.Timeout>;
  activationTimeout: NodeJS.Timeout | null;
  levelUpdateInterval: NodeJS.Timeout | null;
  rotationAnimationFrame: number | null;
  isActive: boolean;
  gameStartTime?: number;
  currentRotationSpeed: number;
}