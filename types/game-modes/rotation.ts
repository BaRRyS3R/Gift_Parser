// src/types/game-modes/rotation.ts - Cleaned version without debug logging

import { BaseGameResult, GameState, GameMode, Circle } from "./common";

export interface RotationCircle extends Circle {
  angle: number; // Current angle in radians
  targetAngle?: number; // Target angle for smooth transitions
}

export interface RotationGameConfig {
  id: string;
  name: string;
  circleCount: number; // 8 circles
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
}

export interface RotationGameResult extends BaseGameResult {
  mode: GameMode.ROTATION;
  survivalTime: number;
  maxLevelReached: number;
  perfectStreak: number;
  correctHits: number;
  deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  averageReactionTime: number;
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
  // Critical flags for game state management
  isGameEnding: boolean;
  pendingActivationTimeouts: Set<NodeJS.Timeout>;
  // Track activation times for reaction time calculation
  circleActivationTimes: Map<number, number>;
}
