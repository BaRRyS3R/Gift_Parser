// src/game-modes/rotation/RotationGameLogic.ts - Enhanced with comprehensive logging and bug fixes

import {
  RotationGameConfig,
  RotationGameStats,
  RotationGameResult,
  RotationGameState,
  RotationLevelConfig,
  RotationCircle,
  CircleActivationLog,
  CircleClickLog,
  CircleDeactivationLog,
  LevelTransitionLog,
  GameEventLog,
  GameDebugLog,
} from "@/types/game-modes/rotation";
import { GameState, GameMode } from "@/types/game-modes/common";

export const ROTATION_CONFIG: RotationGameConfig = {
  id: "rotation",
  name: "ROTATION MODE",
  circleCount: 8, // Reduced from 14 to 8 for larger circles
  radius: 140, // Increased radius to accommodate larger circles
  initialRotationSpeed: 0.02,
  initialActivationTimeMin: 1500,
  initialActivationTimeMax: 2500,
  initialCircleActiveTime: 2500,
  intensityIncreaseInterval: 10, // seconds
  maxIntensityLevel: 10,
  simultaneousCirclesMin: 1,
  simultaneousCirclesMax: 2, // Reduced max simultaneous circles from 3 to 2
};

export const ROTATION_LEVELS: RotationLevelConfig[] = [
  {
    level: 1,
    simultaneousCircles: 1,
    redCircles: 0,
    activationTimeMin: 1800,
    activationTimeMax: 2800,
    circleActiveTime: 3000,
    rotationSpeed: 0.015,
    description: "GENTLE SPIN",
  },
  {
    level: 2,
    simultaneousCircles: 2,
    redCircles: 0,
    activationTimeMin: 1600,
    activationTimeMax: 2600,
    circleActiveTime: 2800,
    rotationSpeed: 0.02,
    description: "STEADY ROTATION",
  },
  {
    level: 3,
    simultaneousCircles: 2,
    redCircles: 1,
    activationTimeMin: 1400,
    activationTimeMax: 2400,
    circleActiveTime: 2600,
    rotationSpeed: 0.025,
    description: "PICKING UP SPEED",
  },
  {
    level: 4,
    simultaneousCircles: 3,
    redCircles: 1,
    activationTimeMin: 1200,
    activationTimeMax: 2200,
    circleActiveTime: 2400,
    rotationSpeed: 0.03,
    description: "FASTER SPIN",
  },
  {
    level: 5,
    simultaneousCircles: 3,
    redCircles: 2,
    activationTimeMin: 1100,
    activationTimeMax: 2000,
    circleActiveTime: 2200,
    rotationSpeed: 0.035,
    description: "RAPID ROTATION",
  },
  {
    level: 6,
    simultaneousCircles: 4,
    redCircles: 2,
    activationTimeMin: 1000,
    activationTimeMax: 1800,
    circleActiveTime: 2000,
    rotationSpeed: 0.04,
    description: "MULTI TARGETS",
  },
  {
    level: 7,
    simultaneousCircles: 3,
    redCircles: 3,
    activationTimeMin: 900,
    activationTimeMax: 1600,
    circleActiveTime: 1800,
    rotationSpeed: 0.045,
    description: "DANGER ZONE",
  },
  {
    level: 8,
    simultaneousCircles: 4,
    redCircles: 3,
    activationTimeMin: 800,
    activationTimeMax: 1400,
    circleActiveTime: 1600,
    rotationSpeed: 0.05,
    description: "HIGH VELOCITY",
  },
  {
    level: 9,
    simultaneousCircles: 5,
    redCircles: 2,
    activationTimeMin: 700,
    activationTimeMax: 1200,
    circleActiveTime: 1400,
    rotationSpeed: 0.055,
    description: "EXTREME SPIN",
  },
  {
    level: 10,
    simultaneousCircles: 4,
    redCircles: 4,
    activationTimeMin: 600,
    activationTimeMax: 1000,
    circleActiveTime: 1200,
    rotationSpeed: 0.06,
    description: "MAXIMUM ROTATION",
  },
];

// Logging system implementation
const createEmptyDebugLog = (): GameDebugLog => ({
  activations: [],
  clicks: [],
  deactivations: [],
  levelTransitions: [],
  events: [],
  errors: [],
});

const logError = (debugLog: GameDebugLog, error: string, context: any): void => {
  debugLog.errors.push({
    timestamp: Date.now(),
    error,
    context,
  });
  console.error(`[RotationGame] ${error}`, context);
};

const logEvent = (
  debugLog: GameDebugLog,
  type: GameEventLog["type"],
  level: number,
  data: any,
  gameStartTime: number
): void => {
  const timestamp = Date.now();
  debugLog.events.push({
    type,
    timestamp,
    gameTime: timestamp - gameStartTime,
    level,
    data,
  });
  console.log(`[RotationGame] ${type}`, { level, gameTime: timestamp - gameStartTime, data });
};

const logCircleActivation = (
  debugLog: GameDebugLog,
  circleId: number,
  level: number,
  isDecoy: boolean,
  activeTime: number,
  position: { x: number; y: number },
  gameStartTime: number
): void => {
  const timestamp = Date.now();
  const activationLog: CircleActivationLog = {
    circleId,
    timestamp,
    level,
    isDecoy,
    scheduledDeactivationTime: timestamp + activeTime,
    position,
    gameTime: timestamp - gameStartTime,
  };
  
  debugLog.activations.push(activationLog);
  console.log(`[RotationGame] Circle ${circleId} activated`, activationLog);
};

const logCircleClick = (
  debugLog: GameDebugLog,
  circleId: number,
  level: number,
  clickResult: CircleClickLog["clickResult"],
  circleState: {
    isActive: boolean;
    isDecoy: boolean;
    isAnimating: boolean;
  },
  position: { x: number; y: number },
  gameStartTime: number,
  debounceBlocked: boolean = false
): void => {
  const timestamp = Date.now();
  
  // Find activation time for this circle
  const activationEntry = debugLog.activations
    .filter(a => a.circleId === circleId)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  
  const reactionTime = activationEntry ? timestamp - activationEntry.timestamp : undefined;
  
  const clickLog: CircleClickLog = {
    circleId,
    timestamp,
    level,
    gameTime: timestamp - gameStartTime,
    clickResult,
    circleWasActive: circleState.isActive,
    circleWasDecoy: circleState.isDecoy,
    circleWasAnimating: circleState.isAnimating,
    activationTime: activationEntry?.timestamp,
    reactionTime,
    position,
    debounceBlocked,
  };
  
  debugLog.clicks.push(clickLog);
  console.log(`[RotationGame] Circle ${circleId} clicked`, clickLog);
};

const logCircleDeactivation = (
  debugLog: GameDebugLog,
  circleId: number,
  level: number,
  reason: CircleDeactivationLog["reason"],
  circleState: { isActive: boolean; isDecoy: boolean },
  gameStartTime: number
): void => {
  const timestamp = Date.now();
  const deactivationLog: CircleDeactivationLog = {
    circleId,
    timestamp,
    level,
    reason,
    gameTime: timestamp - gameStartTime,
    wasActive: circleState.isActive,
    wasDecoy: circleState.isDecoy,
  };
  
  debugLog.deactivations.push(deactivationLog);
  console.log(`[RotationGame] Circle ${circleId} deactivated`, deactivationLog);
};

const logLevelTransition = (
  debugLog: GameDebugLog,
  fromLevel: number,
  toLevel: number,
  activeCircles: number[],
  gameStartTime: number
): void => {
  const timestamp = Date.now();
  const transitionLog: LevelTransitionLog = {
    fromLevel,
    toLevel,
    timestamp,
    gameTime: timestamp - gameStartTime,
    activeCirclesAtTransition: [...activeCircles],
  };
  
  debugLog.levelTransitions.push(transitionLog);
  console.log(`[RotationGame] Level transition`, transitionLog);
};

export const createRotationCircleSet = (
  count: number,
  radius: number,
): RotationCircle[] => {
  const angleStep = (2 * Math.PI) / count;

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    isActive: false,
    isAnimating: false,
    isDecoy: false,
    angle: index * angleStep,
  }));
};

export const initializeRotationGameState = (): RotationGameState => {
  const gameStartTime = Date.now();
  const debugLog = createEmptyDebugLog();

  logEvent(debugLog, "game_start", 1, { timestamp: gameStartTime }, gameStartTime);

  return {
    config: ROTATION_CONFIG,
    gameState: GameState.NOT_STARTED,
    stats: {
      correctHits: 0,
      wrongHits: 0,
      missedCircles: 0,
      decoyHits: 0,
      survivalTime: 0,
      currentLevel: 1,
      perfectStreak: 0,
      totalReactionTime: 0,
      hitCount: 0,
      gameStartTime,
      debugLog,
    },
    circles: createRotationCircleSet(
      ROTATION_CONFIG.circleCount,
      ROTATION_CONFIG.radius,
    ),
    currentLevel: 1,
    timeInCurrentLevel: 0,
    activeCircleIds: [],
    circleTimeouts: new Map(),
    activationTimeout: null,
    levelUpdateInterval: null,
    rotationAnimationFrame: null,
    isActive: true,
    gameStartTime,
    currentRotationSpeed: ROTATION_LEVELS[0].rotationSpeed,
  };
};

export const getLevelConfig = (level: number): RotationLevelConfig => {
  const clampedLevel = Math.max(1, Math.min(level, ROTATION_LEVELS.length));
  return ROTATION_LEVELS[clampedLevel - 1];
};

// Enhanced level update with logging
export const updateRotationLevel = (
  state: RotationGameState,
  currentTime?: number,
): RotationGameState => {
  if (!state.isActive || !state.gameStartTime) return state;

  const now = currentTime || Date.now();
  const actualSurvivalTime = now - state.gameStartTime;
  const newTimeInCurrentLevel =
    actualSurvivalTime -
    (state.currentLevel - 1) * state.config.intensityIncreaseInterval * 1000;

  const shouldIncreaseLevel =
    newTimeInCurrentLevel >= state.config.intensityIncreaseInterval * 1000 &&
    state.currentLevel < state.config.maxIntensityLevel;

  if (shouldIncreaseLevel) {
    const newLevel = state.currentLevel + 1;
    const levelConfig = getLevelConfig(newLevel);

    // Log level transition
    logLevelTransition(
      state.stats.debugLog,
      state.currentLevel,
      newLevel,
      state.activeCircleIds,
      state.gameStartTime
    );

    logEvent(
      state.stats.debugLog,
      "level_transition",
      newLevel,
      { from: state.currentLevel, to: newLevel, activeCircles: state.activeCircleIds.length },
      state.gameStartTime
    );

    // Preserve active circles and their states during level transition
    const preservedCircles = state.circles.map((circle) => ({
      ...circle,
      // Keep existing active state and position - DO NOT reset
    }));

    return {
      ...state,
      currentLevel: newLevel,
      timeInCurrentLevel: 0,
      currentRotationSpeed: levelConfig.rotationSpeed,
      circles: preservedCircles,
      stats: {
        ...state.stats,
        survivalTime: actualSurvivalTime,
        currentLevel: newLevel,
      },
      // Keep existing active circle IDs and timeouts
      activeCircleIds: state.activeCircleIds,
      circleTimeouts: state.circleTimeouts,
    };
  }

  return {
    ...state,
    timeInCurrentLevel: newTimeInCurrentLevel,
    stats: {
      ...state.stats,
      survivalTime: actualSurvivalTime,
    },
  };
};

export const getRandomCircleIds = (
  totalCircles: number,
  targetCount: number,
  excludeIds: number[] = [],
): number[] => {
  const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
    (id) => !excludeIds.includes(id),
  );

  const count = Math.min(targetCount, availableIds.length);
  const selectedIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    const selectedId = availableIds.splice(randomIndex, 1)[0];
    selectedIds.push(selectedId);
  }

  return selectedIds;
};

// Enhanced circle activation with comprehensive logging
let isActivatingCircles = false;

export const activateRotationCircles = (
  state: RotationGameState,
  onCirclesActivated: (circleIds: number[], redCircleIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): RotationGameState => {
  // Prevent concurrent activations
  if (isActivatingCircles) {
    logError(state.stats.debugLog, "Prevented concurrent circle activation", {
      activeCircles: state.activeCircleIds.length,
      currentLevel: state.currentLevel,
    });
    return state;
  }

  const levelConfig = getLevelConfig(state.currentLevel);
  const availableSlots = levelConfig.simultaneousCircles - state.activeCircleIds.length;

  if (availableSlots <= 0) {
    logError(state.stats.debugLog, "No available slots for circle activation", {
      simultaneousCircles: levelConfig.simultaneousCircles,
      activeCircles: state.activeCircleIds.length,
    });
    return state;
  }

  isActivatingCircles = true;

  const selectedIds = getRandomCircleIds(
    state.config.circleCount,
    availableSlots,
    state.activeCircleIds,
  );

  if (selectedIds.length === 0) {
    isActivatingCircles = false;
    logError(state.stats.debugLog, "No circles selected for activation", {
      availableSlots,
      excludedIds: state.activeCircleIds,
    });
    return state;
  }

  // Determine red circles
  const whiteCirclesNeeded = Math.max(1, selectedIds.length - levelConfig.redCircles);
  const actualRedCircles = Math.min(levelConfig.redCircles, selectedIds.length - whiteCirclesNeeded);

  const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
  const redIds = actualRedCircles > 0 ? shuffledIds.slice(0, actualRedCircles) : [];

  // Update active circles
  const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
  const newCircleTimeouts = new Map(state.circleTimeouts);

  // Set timeouts for each circle and log activations
  selectedIds.forEach((circleId) => {
    const isDecoy = redIds.includes(circleId);
    const timeout = setTimeout(() => {
      onCircleTimeout(circleId, isDecoy);
    }, levelConfig.circleActiveTime);

    newCircleTimeouts.set(circleId, timeout);

    // Calculate circle position for logging
    const circle = state.circles.find(c => c.id === circleId);
    const position = circle ? {
      x: Math.cos(circle.angle) * state.config.radius,
      y: Math.sin(circle.angle) * state.config.radius,
    } : { x: 0, y: 0 };

    // Log circle activation
    logCircleActivation(
      state.stats.debugLog,
      circleId,
      state.currentLevel,
      isDecoy,
      levelConfig.circleActiveTime,
      position,
      state.gameStartTime!
    );
  });

  const newCircles = state.circles.map((circle) => {
    if (selectedIds.includes(circle.id)) {
      return {
        ...circle,
        isActive: true,
        isDecoy: redIds.includes(circle.id),
        isAnimating: false, // Ensure no animation interference
      };
    }
    return circle;
  });

  // Log event
  logEvent(
    state.stats.debugLog,
    "circle_activation",
    state.currentLevel,
    {
      selectedIds,
      redIds,
      availableSlots,
      levelConfig: {
        simultaneousCircles: levelConfig.simultaneousCircles,
        redCircles: levelConfig.redCircles,
        circleActiveTime: levelConfig.circleActiveTime,
      },
    },
    state.gameStartTime!
  );

  // Call callback AFTER state is updated
  setTimeout(() => {
    onCirclesActivated(selectedIds, redIds);
    isActivatingCircles = false;
  }, 50);

  return {
    ...state,
    activeCircleIds: newActiveCircleIds,
    circleTimeouts: newCircleTimeouts,
    circles: newCircles,
  };
};

// Enhanced click handling with comprehensive logging and bug fixes
const clickDebounceMap = new Map<number, number>();
const CLICK_DEBOUNCE_TIME = 100; // milliseconds

export const handleRotationCircleClick = (
  state: RotationGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: RotationGameState; result: "correct" | "wrong" | "decoy" } => {
  // Debounce rapid clicks on the same circle
  const lastClickTime = clickDebounceMap.get(clickedCircleId) || 0;
  const timeSinceLastClick = clickTime - lastClickTime;

  if (timeSinceLastClick < CLICK_DEBOUNCE_TIME) {
    const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);
    const circleState = {
      isActive: clickedCircle?.isActive || false,
      isDecoy: clickedCircle?.isDecoy || false,
      isAnimating: clickedCircle?.isAnimating || false,
    };

    logCircleClick(
      state.stats.debugLog,
      clickedCircleId,
      state.currentLevel,
      "wrong",
      circleState,
      { x: 0, y: 0 },
      state.gameStartTime!,
      true // debounceBlocked = true
    );

    logError(state.stats.debugLog, "Click debounced", {
      circleId: clickedCircleId,
      timeSinceLastClick,
      debounceTime: CLICK_DEBOUNCE_TIME,
    });

    return { newState: state, result: "wrong" };
  }

  clickDebounceMap.set(clickedCircleId, clickTime);

  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    logError(state.stats.debugLog, "Circle not found for click", {
      clickedCircleId,
      availableCircles: state.circles.map(c => c.id),
    });
    return { newState: state, result: "wrong" };
  }

  // Calculate position for logging
  const position = {
    x: Math.cos(clickedCircle.angle) * state.config.radius,
    y: Math.sin(clickedCircle.angle) * state.config.radius,
  };

  const circleState = {
    isActive: clickedCircle.isActive,
    isDecoy: clickedCircle.isDecoy,
    isAnimating: clickedCircle.isAnimating,
  };

  const updatedState = updateRotationLevel(state, clickTime);

  // Enhanced logging for debugging the "inactive circle" bug
  const isCircleInActiveList = state.activeCircleIds.includes(clickedCircleId);
  const hasTimeout = state.circleTimeouts.has(clickedCircleId);

  logEvent(
    updatedState.stats.debugLog,
    "circle_click",
    updatedState.currentLevel,
    {
      circleId: clickedCircleId,
      circleState,
      isCircleInActiveList,
      hasTimeout,
      activeCircleIds: [...state.activeCircleIds],
      timeouts: Array.from(state.circleTimeouts.keys()),
    },
    state.gameStartTime!
  );

  if (clickedCircle.isActive && !clickedCircle.isAnimating) {
    if (clickedCircle.isDecoy) {
      // Red circle clicked - game over
      logCircleClick(
        updatedState.stats.debugLog,
        clickedCircleId,
        updatedState.currentLevel,
        "decoy",
        circleState,
        position,
        state.gameStartTime!
      );

      return {
        newState: {
          ...updatedState,
          gameState: GameState.FINISHED,
          isActive: false,
          stats: {
            ...updatedState.stats,
            decoyHits: updatedState.stats.decoyHits + 1,
          },
        },
        result: "decoy",
      };
    } else {
      // Correct white circle click
      const reactionTime = state.stats.debugLog.activations
        .filter(a => a.circleId === clickedCircleId)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const actualReactionTime = reactionTime ? clickTime - reactionTime.timestamp : 0;

      const newStats = {
        ...updatedState.stats,
        correctHits: updatedState.stats.correctHits + 1,
        perfectStreak: updatedState.stats.perfectStreak + 1,
        hitCount: updatedState.stats.hitCount + 1,
        totalReactionTime: updatedState.stats.totalReactionTime + actualReactionTime,
      };

      // Immediate visual feedback - set isAnimating immediately for instant deactivation
      const newCircles = updatedState.circles.map((c) =>
        c.id === clickedCircleId ? { ...c, isAnimating: true, isActive: false } : c,
      );

      logCircleClick(
        newStats.debugLog,
        clickedCircleId,
        updatedState.currentLevel,
        "correct",
        circleState,
        position,
        state.gameStartTime!
      );

      return {
        newState: {
          ...updatedState,
          stats: newStats,
          circles: newCircles,
        },
        result: "correct",
      };
    }
  } else {
    // Enhanced logging for inactive circle clicks
    logCircleClick(
      updatedState.stats.debugLog,
      clickedCircleId,
      updatedState.currentLevel,
      clickedCircle.isActive ? "wrong" : "inactive",
      circleState,
      position,
      state.gameStartTime!
    );

    logError(updatedState.stats.debugLog, "Click on inactive or animating circle", {
      circleId: clickedCircleId,
      isActive: clickedCircle.isActive,
      isAnimating: clickedCircle.isAnimating,
      isDecoy: clickedCircle.isDecoy,
      isCircleInActiveList,
      hasTimeout,
      activeCircleIds: [...state.activeCircleIds],
    });

    // Wrong click on inactive circle - game over
    return {
      newState: {
        ...updatedState,
        gameState: GameState.FINISHED,
        isActive: false,
        stats: {
          ...updatedState.stats,
          wrongHits: updatedState.stats.wrongHits + 1,
        },
      },
      result: "wrong",
    };
  }
};

export const deactivateRotationCircle = (
  state: RotationGameState,
  circleId: number,
  reason: CircleDeactivationLog["reason"] = "timeout",
): RotationGameState => {
  const circle = state.circles.find(c => c.id === circleId);
  const circleState = {
    isActive: circle?.isActive || false,
    isDecoy: circle?.isDecoy || false,
  };

  // Log deactivation
  logCircleDeactivation(
    state.stats.debugLog,
    circleId,
    state.currentLevel,
    reason,
    circleState,
    state.gameStartTime!
  );

  const newActiveCircleIds = state.activeCircleIds.filter(
    (id) => id !== circleId,
  );

  const newCircleTimeouts = new Map(state.circleTimeouts);
  const timeout = newCircleTimeouts.get(circleId);

  if (timeout) {
    clearTimeout(timeout);
    newCircleTimeouts.delete(circleId);
  }

  const newCircles = state.circles.map((circle) =>
    circle.id === circleId
      ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
      : circle,
  );

  return {
    ...state,
    activeCircleIds: newActiveCircleIds,
    circleTimeouts: newCircleTimeouts,
    circles: newCircles,
  };
};

export const calculateRotationScore = (
  stats: RotationGameStats,
  level: number,
): number => {
  const baseScore = Math.floor(stats.survivalTime / 1000);
  const streakBonus = stats.perfectStreak * 4;
  const levelBonus = Math.floor(level * 20);

  return baseScore + streakBonus + levelBonus;
};

export const getRotationDeathCause = (
  stats: RotationGameStats,
): RotationGameResult["deathCause"] => {
  if (stats.decoyHits > 0) return "decoy_hit";
  if (stats.wrongHits > 0) return "wrong_click";
  if (stats.missedCircles > 0) return "miss";
  return "timeout";
};

export const createRotationGameResult = (
  state: RotationGameState,
): RotationGameResult => {
  const timeScore = Math.floor(state.stats.survivalTime / 1000);
  const levelScore = state.currentLevel;
  const hitsScore = state.stats.correctHits;

  const finalScore = timeScore + levelScore + hitsScore;
  const deathCause = getRotationDeathCause(state.stats);
  
  const averageReactionTime = state.stats.hitCount > 0 
    ? state.stats.totalReactionTime / state.stats.hitCount 
    : 0;

  // Log game end
  logEvent(
    state.stats.debugLog,
    "game_end",
    state.currentLevel,
    {
      finalScore,
      deathCause,
      survivalTime: state.stats.survivalTime,
      correctHits: state.stats.correctHits,
      averageReactionTime,
    },
    state.gameStartTime!
  );

  return {
    mode: GameMode.ROTATION,
    score: finalScore,
    duration: Math.floor(state.stats.survivalTime / 1000),
    survivalTime: state.stats.survivalTime,
    maxLevelReached: state.currentLevel,
    perfectStreak: state.stats.perfectStreak,
    correctHits: state.stats.correctHits,
    deathCause,
    debugLog: state.stats.debugLog,
    averageReactionTime,
    totalActivations: state.stats.debugLog.activations.length,
    totalClicks: state.stats.debugLog.clicks.length,
    createdAt: new Date().toISOString(),
  };
};

// Enhanced cleanup with proper logging
export const cleanupRotationGame = (state: RotationGameState): void => {
  logEvent(
    state.stats.debugLog,
    "game_end",
    state.currentLevel,
    {
      reason: "cleanup",
      activeCircles: state.activeCircleIds.length,
      pendingTimeouts: state.circleTimeouts.size,
    },
    state.gameStartTime!
  );

  // Clear all timeouts atomically
  state.circleTimeouts.forEach((timeout) => {
    if (timeout) clearTimeout(timeout);
  });
  state.circleTimeouts.clear();

  if (state.activationTimeout) {
    clearTimeout(state.activationTimeout);
  }
  if (state.levelUpdateInterval) {
    clearInterval(state.levelUpdateInterval);
  }
  if (state.rotationAnimationFrame) {
    cancelAnimationFrame(state.rotationAnimationFrame);
  }

  // Reset activation mutex
  isActivatingCircles = false;

  // Clear click debounce map
  clickDebounceMap.clear();
};

export const formatRotationTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};