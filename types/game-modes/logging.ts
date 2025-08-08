// src/types/game-modes/logging.ts - Game event logging system

export interface GameLogEntry {
  id: string;
  timestamp: number;
  relativeTime: number; // Time since game start
  type: GameLogType;
  data: GameLogData;
}

export enum GameLogType {
  GAME_START = "GAME_START",
  GAME_END = "GAME_END",
  LEVEL_UP = "LEVEL_UP",
  CIRCLE_ACTIVATION = "CIRCLE_ACTIVATION",
  CIRCLE_DEACTIVATION = "CIRCLE_DEACTIVATION",
  CIRCLE_TIMEOUT = "CIRCLE_TIMEOUT",
  CIRCLE_CLICK = "CIRCLE_CLICK",
  GAME_STATE_CHANGE = "GAME_STATE_CHANGE",
  ERROR = "ERROR",
}

export type GameLogData = 
  | GameStartLogData
  | GameEndLogData
  | LevelUpLogData
  | CircleActivationLogData
  | CircleDeactivationLogData
  | CircleTimeoutLogData
  | CircleClickLogData
  | GameStateChangeLogData
  | ErrorLogData;

export interface GameStartLogData {
  gameMode: string;
  config: any;
}

export interface GameEndLogData {
  cause: string;
  finalStats: any;
}

export interface LevelUpLogData {
  newLevel: number;
  previousLevel: number;
  survivalTime: number;
}

export interface CircleActivationLogData {
  circleIds: number[];
  redCircleIds: number[];
  activeCircleCount: number;
  levelConfig: any;
  recentlyUsedCircles: Record<number, number>;
}

export interface CircleDeactivationLogData {
  circleId: number;
  reason: "click" | "timeout" | "manual";
  wasDecoy: boolean;
  activeTime: number; // How long the circle was active
}

export interface CircleTimeoutLogData {
  circleId: number;
  wasDecoy: boolean;
  scheduledDuration: number;
}

export interface CircleClickLogData {
  circleId: number;
  clickTime: number;
  circleState: {
    isActive: boolean;
    isAnimating: boolean;
    isDecoy: boolean;
  };
  gameState: string;
  activeCircleIds: number[];
  result: "correct" | "wrong" | "decoy";
  reactionTime?: number;
}

export interface GameStateChangeLogData {
  from: string;
  to: string;
  reason?: string;
}

export interface ErrorLogData {
  message: string;
  context: any;
  stack?: string;
}

export interface GameLogger {
  entries: GameLogEntry[];
  gameStartTime: number;
  addEntry: (type: GameLogType, data: GameLogData) => void;
  getFormattedLog: () => string;
  clear: () => void;
}