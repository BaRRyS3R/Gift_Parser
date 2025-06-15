// src/types/game-modes/reaction.ts - Типы для режима реакции

import { BaseGameResult, GameState, GameMode, Circle } from "./common";

export interface ReactionGameConfig {
  id: string;
  name: string;
  minDelayMs: number; // 3000ms
  maxDelayMs: number; // 5000ms
  circleActiveTimeMs: number; // Время, в течение которого круг остается активным
  gridSize: number; // Размер сетки (например, 3x3 = 9)
}

export interface ReactionGameStats {
  reactionTime: number | null;
  clicked: boolean;
  startTime: number | null;
  clickTime: number | null;
  missedTarget: boolean;
}

export interface ReactionGameResult extends BaseGameResult {
  mode: GameMode.REACTION;
  reactionTime: number;
  missed: boolean;
  rating: "LIGHTNING" | "EXCELLENT" | "GOOD" | "AVERAGE" | "SLOW" | "MISSED";
}

export interface ReactionGameState {
  config: ReactionGameConfig;
  gameState: GameState;
  stats: ReactionGameStats;
  circles: Circle[];
  activeCircleId: number | null;
  startDelayTimeout: NodeJS.Timeout | null;
  gameTimeout: NodeJS.Timeout | null;
}
