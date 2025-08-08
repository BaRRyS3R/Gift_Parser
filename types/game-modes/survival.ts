// src/types/game-modes/survival.ts - Updated with game logger integration

import { BaseGameResult, GameState, GameMode, Circle } from "./common";
import { GameLogger } from "@/utils/gameLogger";

export interface SurvivalGameConfig {
  id: string;
  name: string;
  circleCount: number; // 49 (7x7)
  initialActivationTimeMin: number; // 1000ms
  initialActivationTimeMax: number; // 1800ms
  initialCircleActiveTime: number; // 2000ms
  intensityIncreaseInterval: number; // 8 секунд
  maxIntensityLevel: number; // 15
  simultaneousCirclesMin: number; // 1
  simultaneousCirclesMax: number; // 4 на начальном уровне
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
  gameStartTime?: number; // ДОБАВЛЕНО: время начала игры для точного расчета
}

export interface SurvivalGameResult extends BaseGameResult {
  mode: GameMode.SURVIVAL;
  survivalTime: number;
  maxLevelReached: number;
  perfectStreak: number;
  correctHits: number;
  deathCause: "miss" | "wrong_click" | "decoy_hit" | "timeout";
  gameLog?: string; // ADDED: Game log for debugging
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
  gameStartTime?: number; // ДОБАВЛЕНО: время начала игры в основном состоянии
  logger?: GameLogger; // ADDED: Game logger instance
}