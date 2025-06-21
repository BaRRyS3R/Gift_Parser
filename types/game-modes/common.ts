// src/types/game-modes/common.ts - Обновлено с добавлением физического режима

export interface Circle {
  id: number;
  isActive: boolean;
  isAnimating: boolean;
  isDecoy: boolean;
  x?: number;
  y?: number;
}

export interface PhysicsCircle extends Circle {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius: number;
  matterBodyId?: number; // ID тела в Matter.js
}

export enum GameState {
  NOT_STARTED = "not_started",
  STARTING = "starting",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
}

export enum GameMode {
  REACTION = "reaction",
  SURVIVAL = "survival",
  PHYSICS = "physics",
}

export interface BaseGameResult {
  mode: GameMode;
  score: number;
  duration: number; // в миллисекундах
  createdAt: string;
}

// Базовый интерфейс для конфигурации игры
export interface BaseGameConfig {
  id: string;
  name: string;
}

// Базовая статистика игры
export interface BaseGameStats {
  score: number;
  correctHits: number;
  wrongHits: number;
  missedCircles: number;
}

// Утилитарные типы
export type GameDifficulty = "easy" | "medium" | "hard" | "extreme";

export interface GridDimensions {
  cols: number;
  rows: number;
}

// Boundaries для физического режима
export interface BoundaryState {
  top: boolean;
  left: boolean;
  right: boolean;
  bottom: boolean;
}