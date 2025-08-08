// src/types/game-modes/survival.ts - Updated with logging system

import { Circle, GameState, GameMode } from "./common";
import { GameLogger, GameLogEntry } from "./logging";

export interface SurvivalGameConfig {
  id: string;
  name: string;
  circleCount: number;
  initialActivationTimeMin: number;
  initialActivationTimeMax: number;
  initialCircleActiveTime: number;
  intensityIncreaseInterval: number;
  maxIntensityLevel: number;
  simultaneousCirclesMin: number;
  simultaneousCirclesMax: number;
  circleReactivationCooldown: number;
  maxHistoryRetention: number;
}

export interface SurvivalLevelConfig {
  level: number;
  simultaneousCircles: number;
  redCircles: number;
  activationTimeMin: number;
  activationTimeMax: number;
  circleActiveTime: number;
  description: string;
}

export interface SurvivalGameStats {
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
  decoyHits: number;
  survivalTime: number;
  currentLevel: number;
  perfectStreak: number;
  totalReactionTime: number;
  hitCount: number;
  gameStartTime: number;
}

export interface SurvivalGameState {
  config: SurvivalGameConfig;
  gameState: GameState;
  stats: SurvivalGameStats;
  circles: Circle[];
  currentLevel: number;
  timeInCurrentLevel: number;
  activeCircleIds: number[];
  circleTimeouts: Map<number, NodeJS.Timeout>;
  activationTimeout: NodeJS.Timeout | null;
  levelUpdateInterval: NodeJS.Timeout | null;
  isActive: boolean;
  gameStartTime: number;
  recentlyUsedCircles: Map<number, number>;
  // NEW: Add logging system
  logger: GameLogger;
  circleActivationTimes: Map<number, number>; // Track when each circle was activated
}

export interface SurvivalGameResult {
  mode: GameMode;
  score: number;
  duration: number;
  survivalTime: number;
  maxLevelReached: number;
  perfectStreak: number;
  correctHits: number;
  deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  createdAt: string;
  // NEW: Add game logs
  gameLogs: GameLogEntry[];
}