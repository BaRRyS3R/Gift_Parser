// src/types/game-modes/survival.ts - Обновленные типы с системой временного исключения

import { Circle, GameState, GameMode } from "./common";

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
  circleReactivationCooldown: number; // ДОБАВЛЕНО: время блокировки повторной активации
  maxHistoryRetention: number; // ДОБАВЛЕНО: максимальное время хранения истории
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
  recentlyUsedCircles: Map<number, number>; // ДОБАВЛЕНО: история активации кругов (circleId -> timestamp)
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
}