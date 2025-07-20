// src/types/game-modes/index.ts - Export all game mode types

// Common types
export * from "./common";

// Reaction mode
export * from "./reaction";

// Survival mode
export * from "./survival";

// Physics mode
export * from "./physics";

// Rotation mode (NEW)
export * from "./rotation";

// Type guards for game results
import type { ReactionGameResult } from "./reaction";
import type { SurvivalGameResult } from "./survival";
import type { PhysicsGameResult } from "./physics";
import type { RotationGameResult } from "./rotation";

import { GameMode } from "./common";

export type AnyGameResult =
  | ReactionGameResult
  | SurvivalGameResult
  | PhysicsGameResult
  | RotationGameResult;

export function isReactionResult(
  result: AnyGameResult,
): result is ReactionGameResult {
  return result.mode === GameMode.REACTION;
}

export function isSurvivalResult(
  result: AnyGameResult,
): result is SurvivalGameResult {
  return result.mode === GameMode.SURVIVAL;
}

export function isPhysicsResult(
  result: AnyGameResult,
): result is PhysicsGameResult {
  return result.mode === GameMode.PHYSICS;
}

export function isRotationResult(
  result: AnyGameResult,
): result is RotationGameResult {
  return result.mode === GameMode.ROTATION;
}

// Utility function to get mode name
export function getGameModeName(mode: GameMode): string {
  switch (mode) {
    case GameMode.REACTION:
      return "Reaction";
    case GameMode.SURVIVAL:
      return "Survival";
    case GameMode.PHYSICS:
      return "Physics";
    case GameMode.ROTATION:
      return "Rotation";
    default:
      return "Unknown";
  }
}

// Utility function to get mode icon name (for UI)
export function getGameModeIcon(mode: GameMode): string {
  switch (mode) {
    case GameMode.REACTION:
      return "Zap";
    case GameMode.SURVIVAL:
      return "Crosshair";
    case GameMode.PHYSICS:
      return "Atom";
    case GameMode.ROTATION:
      return "RotateCw";
    default:
      return "Gamepad2";
  }
}

// Utility function to get mode color theme
export function getGameModeColors(mode: GameMode) {
  switch (mode) {
    case GameMode.REACTION:
      return {
        primary: "text-white",
        secondary: "text-white/90",
        accent: "text-white/80",
        background: "bg-white/5",
        border: "border-white/20",
      };
    case GameMode.SURVIVAL:
      return {
        primary: "text-red-400",
        secondary: "text-red-300",
        accent: "text-red-200",
        background: "bg-red-500/5",
        border: "border-red-400/20",
      };
    case GameMode.PHYSICS:
      return {
        primary: "text-purple-400",
        secondary: "text-purple-300",
        accent: "text-purple-200",
        background: "bg-purple-500/5",
        border: "border-purple-400/20",
      };
    case GameMode.ROTATION:
      return {
        primary: "text-orange-400",
        secondary: "text-orange-300",
        accent: "text-orange-200",
        background: "bg-orange-500/5",
        border: "border-orange-400/20",
      };
    default:
      return {
        primary: "text-white",
        secondary: "text-white/90",
        accent: "text-white/80",
        background: "bg-white/5",
        border: "border-white/20",
      };
  }
}
