// src/types/game-modes/survival.ts - Updated with game logger integration and enhanced timing system

import { BaseGameResult, GameState, GameMode, Circle } from "./common";
import { GameLogger } from "@/utils/gameLogger";

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
  circleReactivationCooldown: number; // Time to prevent immediate circle reactivation
  maxHistoryRetention: number; // Maximum time to retain activation history
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
  gameStartTime: number; // Precise game start timestamp for accurate timing
}

export interface SurvivalGameResult extends BaseGameResult {
  mode: GameMode.SURVIVAL;
  survivalTime: number;
  maxLevelReached: number;
  perfectStreak: number;
  correctHits: number;
  deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  gameLog?: string; // Comprehensive game log for debugging and analysis
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
  gameStartTime: number; // Precise game start timestamp in main state
  recentlyUsedCircles: Map<number, number>; // Circle activation history for cooldown system
  logger?: GameLogger; // Integrated game logging system
}