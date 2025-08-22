// src/game-modes/reaction/ReactionGameLogic.ts - Updated with localized rating descriptions

import type { TranslationFunction } from "@/types/localization";

import {
  ReactionGameConfig,
  ReactionGameResult,
  ReactionGameState,
} from "@/types/game-modes/reaction";
import { Circle, GameState, GameMode } from "@/types/game-modes/common";

export const REACTION_CONFIG: ReactionGameConfig = {
  id: "reaction",
  name: "REACTION SPEED",
  minDelayMs: 2000,
  maxDelayMs: 5000,
  circleActiveTimeMs: 10000, // 10 seconds to click after appearance
  gridSize: 1, // Single circle mode for focused reaction testing
};

export const createCircleGrid = (count: number): Circle[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
  }));
};

export const getRandomCircleId = (totalCircles: number): number => {
  return Math.floor(Math.random() * totalCircles);
};

export const getRandomDelay = (config: ReactionGameConfig): number => {
  return (
    Math.random() * (config.maxDelayMs - config.minDelayMs) + config.minDelayMs
  );
};

export const initializeReactionGameState = (): ReactionGameState => {
  return {
    config: REACTION_CONFIG,
    gameState: GameState.NOT_STARTED,
    stats: {
      reactionTime: null,
      clicked: false,
      startTime: null,
      clickTime: null,
      missedTarget: false,
    },
    circles: createCircleGrid(REACTION_CONFIG.gridSize),
    activeCircleId: null,
    startDelayTimeout: null,
    gameTimeout: null,
  };
};

export const activateRandomCircle = (
  state: ReactionGameState,
  onCircleActivated: (circleId: number) => void,
  onGameTimeout: () => void,
): ReactionGameState => {
  const circleId = getRandomCircleId(state.config.gridSize);
  const activationTime = Date.now();

  const newState = {
    ...state,
    activeCircleId: circleId,
    stats: {
      ...state.stats,
      startTime: activationTime,
    },
    circles: state.circles.map((circle) =>
      circle.id === circleId ? { ...circle, isActive: true } : circle,
    ),
  };

  onCircleActivated(circleId);

  // Set timeout for game ending if no click
  const gameTimeout = setTimeout(() => {
    onGameTimeout();
  }, state.config.circleActiveTimeMs);

  return {
    ...newState,
    gameTimeout,
  };
};

export const handleCircleClick = (
  state: ReactionGameState,
  clickedCircleId: number,
): ReactionGameState => {
  const clickTime = Date.now();

  if (state.activeCircleId === clickedCircleId && state.stats.startTime) {
    // Correct click
    const reactionTime = clickTime - state.stats.startTime;

    return {
      ...state,
      gameState: GameState.FINISHED,
      stats: {
        ...state.stats,
        clicked: true,
        clickTime,
        reactionTime,
        missedTarget: false,
      },
      circles: state.circles.map((circle) =>
        circle.id === clickedCircleId
          ? { ...circle, isAnimating: true }
          : circle,
      ),
    };
  } else {
    // Wrong click - mark as missed
    return {
      ...state,
      gameState: GameState.FINISHED,
      stats: {
        ...state.stats,
        clicked: true,
        clickTime,
        reactionTime: null,
        missedTarget: true,
      },
    };
  }
};

// Handle background clicks (clicks outside circles)
export const handleBackgroundClick = (
  state: ReactionGameState,
): ReactionGameState => {
  const clickTime = Date.now();

  // Background click always results in a miss
  return {
    ...state,
    gameState: GameState.FINISHED,
    stats: {
      ...state.stats,
      clicked: true,
      clickTime,
      reactionTime: null,
      missedTarget: true,
    },
  };
};

export const calculateReactionRating = (
  reactionTime: number | null,
  missed: boolean,
): ReactionGameResult["rating"] => {
  if (missed || reactionTime === null) {
    return "MISSED";
  }

  if (reactionTime <= 50) return "LIGHTNING";
  if (reactionTime <= 150) return "EXCELLENT";
  if (reactionTime <= 250) return "GOOD";
  if (reactionTime <= 400) return "AVERAGE";

  return "SLOW";
};

export const calculateReactionScore = (
  reactionTime: number | null,
  missed: boolean,
): number => {
  if (missed || reactionTime === null) {
    return 0;
  }

  if (reactionTime < 50) return 50;
  if (reactionTime <= 150) return 40;
  if (reactionTime <= 250) return 30;
  if (reactionTime <= 400) return 20;

  return 10;
};

export const createReactionGameResult = (
  state: ReactionGameState,
): ReactionGameResult => {
  const missed = state.stats.missedTarget || !state.stats.clicked;
  const reactionTime = state.stats.reactionTime;
  const rating = calculateReactionRating(reactionTime, missed);
  const score = calculateReactionScore(reactionTime, missed);

  return {
    mode: GameMode.REACTION,
    score,
    duration: reactionTime || 0,
    reactionTime: reactionTime || 0,
    missed,
    rating,
    createdAt: new Date().toISOString(),
  };
};

export const cleanupReactionGame = (state: ReactionGameState): void => {
  if (state.startDelayTimeout) {
    clearTimeout(state.startDelayTimeout);
  }
  if (state.gameTimeout) {
    clearTimeout(state.gameTimeout);
  }
};

// Updated function to use localization
export const getReactionRatingDescription = (
  rating: ReactionGameResult["rating"],
  t: TranslationFunction,
): string => {
  switch (rating) {
    case "LIGHTNING":
      return t("game.modes.reaction.ratingDescriptions.lightning");
    case "EXCELLENT":
      return t("game.modes.reaction.ratingDescriptions.excellent");
    case "GOOD":
      return t("game.modes.reaction.ratingDescriptions.good");
    case "AVERAGE":
      return t("game.modes.reaction.ratingDescriptions.average");
    case "SLOW":
      return t("game.modes.reaction.ratingDescriptions.slow");
    case "MISSED":
      return t("game.modes.reaction.ratingDescriptions.missed");
  }
};

export const getReactionRatingColor = (
  rating: ReactionGameResult["rating"],
): string => {
  switch (rating) {
    case "LIGHTNING":
      return "text-white"; // Changed from text-yellow-400 to monochrome
    case "EXCELLENT":
      return "text-green-400"; // Keep green for positive result
    case "GOOD":
      return "text-blue-400"; // Keep blue for good result
    case "AVERAGE":
      return "text-white"; // Monochrome
    case "SLOW":
      return "text-orange-400"; // Keep orange for warning
    case "MISSED":
      return "text-red-400"; // Keep red for error
  }
};
