// src/game-modes/physics/PhysicsGameLogic.ts - Optimized with caching and improved algorithms

import * as Matter from "matter-js";

import {
  PhysicsGameConfig,
  PhysicsGameStats,
  PhysicsGameResult,
  PhysicsGameState,
  PhysicsConfig,
  ImpulseConfig,
} from "@/types/game-modes/physics";
import { PhysicsCircle, GameState, GameMode } from "@/types/game-modes/common";

export interface PhysicsLevelConfig {
  level: number;
  maxSimultaneousCircles: number;
  activationTimeMin: number;
  activationTimeMax: number;
  description: string;
}

export const PHYSICS_LEVELS: PhysicsLevelConfig[] = [
  {
    level: 1,
    maxSimultaneousCircles: 1,
    activationTimeMin: 2000,
    activationTimeMax: 3500,
    description: "НАЧАЛЬНЫЙ",
  },
  {
    level: 2,
    maxSimultaneousCircles: 2,
    activationTimeMin: 1800,
    activationTimeMax: 3200,
    description: "ЛЕГКИЙ",
  },
  {
    level: 3,
    maxSimultaneousCircles: 3,
    activationTimeMin: 1600,
    activationTimeMax: 3000,
    description: "СРЕДНИЙ",
  },
  {
    level: 4,
    maxSimultaneousCircles: 4,
    activationTimeMin: 1400,
    activationTimeMax: 2800,
    description: "СЛОЖНЫЙ",
  },
  {
    level: 5,
    maxSimultaneousCircles: 5,
    activationTimeMin: 1200,
    activationTimeMax: 2600,
    description: "ЭКСТРЕМАЛЬНЫЙ",
  },
  {
    level: 6,
    maxSimultaneousCircles: 6,
    activationTimeMin: 1000,
    activationTimeMax: 2400,
    description: "МАСТЕР",
  },
  {
    level: 7,
    maxSimultaneousCircles: 7,
    activationTimeMin: 900,
    activationTimeMax: 2200,
    description: "ЭКСПЕРТ",
  },
  {
    level: 8,
    maxSimultaneousCircles: 8,
    activationTimeMin: 800,
    activationTimeMax: 2000,
    description: "ЛЕГЕНДА",
  },
];

// Cache for level configuration to avoid repeated calculations
const levelConfigCache = new Map<number, PhysicsLevelConfig>();

export const getPhysicsLevelConfig = (gameTime: number): PhysicsLevelConfig => {
  const levelIndex = Math.min(
    Math.floor(gameTime / 5000),
    PHYSICS_LEVELS.length - 1,
  );

  if (!levelConfigCache.has(levelIndex)) {
    levelConfigCache.set(levelIndex, PHYSICS_LEVELS[levelIndex]);
  }

  return levelConfigCache.get(levelIndex)!;
};

export const createAdaptivePhysicsConfig = (): PhysicsGameConfig => {
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 350;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 500;

  // Calculate container dimensions to end at info panel top
  const infoBarHeight = 140; // Height of bottom info panel
  const containerWidth = screenWidth;
  const containerHeight = screenHeight - infoBarHeight; // Stop at info panel top

  return {
    id: "physics",
    name: "PHYSICS MODE",
    circleCount: 40,
    circleRadius: Math.max(26, Math.min(36, containerWidth / 18)),
    containerWidth,
    containerHeight,
    initialActivationTimeMin: 2000,
    initialActivationTimeMax: 3500,
    circleActiveTime: 3000,
    impulseForce: 0.08,
    maxMistakes: 5, // Maximum 5 mistakes
    levelDuration: 360, // 3 minutes
  };
};

export const PHYSICS_ENGINE_CONFIG: PhysicsConfig = {
  containerWidth: 350, // Will be overridden by adaptive config
  containerHeight: 500, // Will be overridden by adaptive config
  wallThickness: 20, // Increased thickness for screen boundaries
  gravity: { x: 0, y: 0.3 },
  restitution: 0.8,
  friction: 0.005,
  frictionAir: 0.025,
};

export const IMPULSE_CONFIG: ImpulseConfig = {
  force: 0.08,
  radius: 150,
  falloff: 0.3,
};

export const createPhysicsEngine = (): Matter.Engine => {
  const engine = Matter.Engine.create();

  engine.world.gravity.x = PHYSICS_ENGINE_CONFIG.gravity.x;
  engine.world.gravity.y = PHYSICS_ENGINE_CONFIG.gravity.y;
  engine.timing.timeScale = 1;

  return engine;
};

// Improved circle placement algorithm with better spatial distribution
export const createPhysicsCircles = (
  count: number,
  containerWidth: number,
  containerHeight: number,
  radius: number,
  engine: Matter.Engine,
): PhysicsCircle[] => {
  const circles: PhysicsCircle[] = [];
  const margin = radius + 15;
  const maxAttempts = 50; // Reduced from 100 for better performance

  // Pre-calculate grid for faster collision detection during placement
  const gridSize = radius * 2.5;
  const gridWidth = Math.ceil(containerWidth / gridSize);
  const gridHeight = Math.ceil(containerHeight / gridSize);
  const occupiedGrid = new Set<string>();

  // Cache body references for faster lookup
  const bodyCache = new Map<number, Matter.Body>();

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    let validPosition = false;

    do {
      x = margin + Math.random() * (containerWidth - 2 * margin);
      y = margin + Math.random() * (containerHeight - 2 * margin);

      // Quick grid-based collision check
      const gridX = Math.floor(x / gridSize);
      const gridY = Math.floor(y / gridSize);
      const gridKey = `${gridX},${gridY}`;

      if (!occupiedGrid.has(gridKey)) {
        // Detailed collision check only if grid cell is free
        validPosition = true;

        for (const existingCircle of circles) {
          const distance = Math.sqrt(
            Math.pow(x - existingCircle.x, 2) + Math.pow(y - existingCircle.y, 2),
          );

          if (distance < radius * 2.2) {
            validPosition = false;
            break;
          }
        }

        if (validPosition) {
          occupiedGrid.add(gridKey);
        }
      } else {
        validPosition = false;
      }

      attempts++;
    } while (!validPosition && attempts < maxAttempts);

    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: PHYSICS_ENGINE_CONFIG.restitution,
      friction: PHYSICS_ENGINE_CONFIG.friction,
      frictionAir: PHYSICS_ENGINE_CONFIG.frictionAir,
      density: 0.002,
      label: `circle_${i}`,
    });

    Matter.World.add(engine.world, body);

    // Cache body reference for faster lookup
    bodyCache.set(i, body);

    const circle: PhysicsCircle = {
      id: i,
      x,
      y,
      radius,
      isActive: false,
      isAnimating: false,
      isDecoy: false,
      matterBodyId: body.id,
      vx: 0,
      vy: 0,
    };

    circles.push(circle);
  }

  return circles;
};

// Create invisible boundary walls at screen edges and info panel top
export const createBoundaryWalls = (
  containerWidth: number,
  containerHeight: number,
  thickness: number,
  engine: Matter.Engine,
) => {
  const walls = {
    top: Matter.Bodies.rectangle(
      containerWidth / 2,
      -thickness / 2,
      containerWidth + thickness * 2,
      thickness,
      {
        isStatic: true,
        label: "wall_top",
        render: { visible: false }, // Invisible wall
      },
    ),
    bottom: Matter.Bodies.rectangle(
      containerWidth / 2,
      containerHeight + thickness / 2,
      containerWidth + thickness * 2,
      thickness,
      {
        isStatic: true,
        label: "wall_bottom",
        render: { visible: false }, // Wall at info panel top
      },
    ),
    left: Matter.Bodies.rectangle(
      -thickness / 2,
      containerHeight / 2,
      thickness,
      containerHeight + thickness * 2,
      {
        isStatic: true,
        label: "wall_left",
        render: { visible: false },
      },
    ),
    right: Matter.Bodies.rectangle(
      containerWidth + thickness / 2,
      containerHeight / 2,
      thickness,
      containerHeight + thickness * 2,
      {
        isStatic: true,
        label: "wall_right",
        render: { visible: false },
      },
    ),
  };

  Matter.World.add(engine.world, [
    walls.top,
    walls.bottom,
    walls.left,
    walls.right,
  ]);

  return walls;
};

export const initializePhysicsGameState = (): PhysicsGameState => {
  const gameStartTime = Date.now();
  const engine = createPhysicsEngine();
  const config = createAdaptivePhysicsConfig();

  const circles = createPhysicsCircles(
    config.circleCount,
    config.containerWidth,
    config.containerHeight,
    config.circleRadius,
    engine,
  );

  const wallBodies = createBoundaryWalls(
    config.containerWidth,
    config.containerHeight,
    PHYSICS_ENGINE_CONFIG.wallThickness,
    engine,
  );

  return {
    config,
    gameState: GameState.NOT_STARTED,
    stats: {
      correctHits: 0,
      wrongHits: 0,
      missedCircles: 0,
      decoyHits: 0,
      gameTime: 0,
      currentMistakes: 0,
      totalScore: 0,
      gameStartTime,
      currentLevel: 1,
    },
    circles,
    boundaries: {
      top: true,
      left: true,
      right: true,
      bottom: true,
    },
    activeCircleIds: [],
    circleTimeouts: new Map(),
    activationTimeout: null,
    isActive: true,
    gameStartTime,
    engine,
    world: engine.world,
    wallBodies,
  };
};

// Optimized physics position update with body caching
let bodyLookupCache = new Map<number, Matter.Body>();
let cacheBuilt = false;

const buildBodyCache = (engine: Matter.Engine) => {
  if (cacheBuilt) return;

  bodyLookupCache.clear();
  engine.world.bodies.forEach(body => {
    if (body.label.startsWith('circle_')) {
      const circleId = parseInt(body.label.split('_')[1]);
      bodyLookupCache.set(circleId, body);
    }
  });
  cacheBuilt = true;
};

export const updatePhysicsPositions = (
  state: PhysicsGameState,
): PhysicsGameState => {
  // Build cache on first run
  buildBodyCache(state.engine);

  let hasChanges = false;
  const updatedCircles = state.circles.map((circle) => {
    const body = bodyLookupCache.get(circle.id);

    if (body) {
      const currentVx = circle.vx ?? 0;
      const currentVy = circle.vy ?? 0;

      const positionChanged = Math.abs(body.position.x - circle.x) > 0.1 ||
        Math.abs(body.position.y - circle.y) > 0.1;
      const velocityChanged = Math.abs(body.velocity.x - currentVx) > 0.1 ||
        Math.abs(body.velocity.y - currentVy) > 0.1;

      if (positionChanged || velocityChanged) {
        hasChanges = true;
        return {
          ...circle,
          x: body.position.x,
          y: body.position.y,
          vx: body.velocity.x,
          vy: body.velocity.y,
        };
      }
    }

    return circle;
  });

  // Only return new state if there are actual changes
  if (hasChanges) {
    return {
      ...state,
      circles: updatedCircles,
    };
  }

  return state;
};

// Cached level update to avoid unnecessary calculations
let lastLevelUpdate = 0;
let cachedLevelConfig: PhysicsLevelConfig | null = null;

export const updatePhysicsLevel = (
  state: PhysicsGameState,
): PhysicsGameState => {
  const currentTime = Date.now();

  // Update level only every 500ms to reduce calculations
  if (currentTime - lastLevelUpdate < 500) {
    return state;
  }

  const gameTime = currentTime - (state.gameStartTime || currentTime);
  const levelConfig = getPhysicsLevelConfig(gameTime);

  // Only update state if level actually changed
  if (!cachedLevelConfig || cachedLevelConfig.level !== levelConfig.level) {
    cachedLevelConfig = levelConfig;
    lastLevelUpdate = currentTime;

    return {
      ...state,
      stats: {
        ...state.stats,
        gameTime,
        currentLevel: levelConfig.level,
      },
    };
  }

  // Just update game time without creating new state
  return {
    ...state,
    stats: {
      ...state.stats,
      gameTime,
    },
  };
};

export const activateRandomCircles = (
  state: PhysicsGameState,
  onCirclesActivated: (circleIds: number[], decoyIds: number[]) => void,
  onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): PhysicsGameState => {
  const gameTime = Date.now() - (state.gameStartTime || Date.now());
  const levelConfig = getPhysicsLevelConfig(gameTime);

  const availableSlots =
    levelConfig.maxSimultaneousCircles - state.activeCircleIds.length;

  if (availableSlots <= 0) return state;

  // Filter circles within visible area only
  const visibleCircles = state.circles.filter(
    (circle) =>
      !circle.isActive &&
      !circle.isAnimating &&
      circle.x >= 0 &&
      circle.x <= state.config.containerWidth &&
      circle.y >= 0 &&
      circle.y <= state.config.containerHeight,
  );

  if (visibleCircles.length === 0) return state;

  const circleCount = Math.min(availableSlots, visibleCircles.length);
  const selectedCircles = [];

  // Use Fisher-Yates shuffle for better randomization
  const shuffledCircles = [...visibleCircles];
  for (let i = shuffledCircles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCircles[i], shuffledCircles[j]] = [shuffledCircles[j], shuffledCircles[i]];
  }

  for (let i = 0; i < circleCount; i++) {
    selectedCircles.push(shuffledCircles[i]);
  }

  // 25% chance for decoy circles
  const decoyCount = Math.min(1, Math.floor(selectedCircles.length * 0.25));
  const decoyIds = selectedCircles.slice(0, decoyCount).map((c) => c.id);
  const selectedIds = selectedCircles.map((c) => c.id);

  const newActiveCircleIds = [...state.activeCircleIds, ...selectedIds];
  const newCircleTimeouts = new Map(state.circleTimeouts);

  selectedCircles.forEach((circle) => {
    const isDecoy = decoyIds.includes(circle.id);
    const timeout = setTimeout(() => {
      onCircleTimeout(circle.id, isDecoy);
    }, state.config.circleActiveTime);

    newCircleTimeouts.set(circle.id, timeout);
  });

  const updatedCircles = state.circles.map((circle) => {
    if (selectedIds.includes(circle.id)) {
      return {
        ...circle,
        isActive: true,
        isDecoy: decoyIds.includes(circle.id),
      };
    }

    return circle;
  });

  onCirclesActivated(selectedIds, decoyIds);

  return {
    ...state,
    activeCircleIds: newActiveCircleIds,
    circleTimeouts: newCircleTimeouts,
    circles: updatedCircles,
  };
};

export const applyImpulse = (
  state: PhysicsGameState,
  clickedCircleId: number,
): PhysicsGameState => {
  const clickedBody = bodyLookupCache.get(clickedCircleId);
  if (!clickedBody) return state;

  let affectedCount = 0;

  // Use cached body references for better performance
  state.circles.forEach((circle) => {
    if (circle.id === clickedCircleId) return;

    const body = bodyLookupCache.get(circle.id);
    if (!body) return;

    const dx = body.position.x - clickedBody.position.x;
    const dy = body.position.y - clickedBody.position.y;
    const distanceSquared = dx * dx + dy * dy; // Avoid Math.sqrt for performance

    const radiusSquared = IMPULSE_CONFIG.radius * IMPULSE_CONFIG.radius;

    if (distanceSquared <= radiusSquared && distanceSquared > 0) {
      const distance = Math.sqrt(distanceSquared);
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;

      const distanceRatio = Math.max(0.1, 1 - distance / IMPULSE_CONFIG.radius);
      const forceMagnitude =
        IMPULSE_CONFIG.force * Math.pow(distanceRatio, 0.5) * 2;

      Matter.Body.applyForce(body, body.position, {
        x: normalizedX * forceMagnitude,
        y: normalizedY * forceMagnitude,
      });

      affectedCount++;
    }
  });

  return updatePhysicsPositions(state);
};

export const handlePhysicsCircleClick = (
  state: PhysicsGameState,
  clickedCircleId: number,
  clickTime: number = Date.now(),
): { newState: PhysicsGameState; result: "correct" | "wrong" | "decoy" } => {
  const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

  if (!clickedCircle) {
    return { newState: state, result: "wrong" };
  }

  const updatedState = updatePhysicsPositions(state);

  if (clickedCircle.isActive && !clickedCircle.isAnimating) {
    if (clickedCircle.isDecoy) {
      // Hit decoy circle - count as mistake and mark for immediate deactivation
      const newCircles = updatedState.circles.map((c) =>
        c.id === clickedCircleId ? { ...c, isAnimating: true } : c,
      );

      return {
        newState: {
          ...updatedState,
          circles: newCircles,
          stats: {
            ...updatedState.stats,
            decoyHits: updatedState.stats.decoyHits + 1,
            currentMistakes: updatedState.stats.currentMistakes + 1,
          },
        },
        result: "decoy",
      };
    } else {
      // Hit correct circle - apply impulse, add score, and mark for immediate deactivation
      const stateWithImpulse = applyImpulse(updatedState, clickedCircleId);

      const newStats = {
        ...stateWithImpulse.stats,
        correctHits: stateWithImpulse.stats.correctHits + 1,
        totalScore: Math.round(stateWithImpulse.stats.totalScore + 100),
        lastHitTime: clickTime,
      };

      const newCircles = stateWithImpulse.circles.map((c) =>
        c.id === clickedCircleId ? { ...c, isAnimating: true } : c,
      );

      return {
        newState: {
          ...stateWithImpulse,
          stats: newStats,
          circles: newCircles,
        },
        result: "correct",
      };
    }
  } else {
    // Hit inactive circle - count as mistake and mark for immediate deactivation if it was active
    const newCircles = updatedState.circles.map((c) =>
      c.id === clickedCircleId && c.isActive ? { ...c, isAnimating: true } : c,
    );

    return {
      newState: {
        ...updatedState,
        circles: newCircles,
        stats: {
          ...updatedState.stats,
          wrongHits: updatedState.stats.wrongHits + 1,
          currentMistakes: updatedState.stats.currentMistakes + 1,
        },
      },
      result: "wrong",
    };
  }
};

export const deactivatePhysicsCircle = (
  state: PhysicsGameState,
  circleId: number,
): PhysicsGameState => {
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

export const calculatePhysicsScore = (stats: PhysicsGameStats): number => {
  const baseScore = stats.correctHits * 100;
  const timeBonus = Math.max(0, Math.floor(stats.gameTime / 1000)) * 5;
  const mistakePenalty = stats.currentMistakes * 50;

  return Math.max(0, Math.round(baseScore + timeBonus - mistakePenalty));
};

export const createPhysicsGameResult = (
  state: PhysicsGameState,
  deathCause: PhysicsGameResult["deathCause"],
): PhysicsGameResult => {
  const finalState = updatePhysicsPositions(state);
  const finalScore = calculatePhysicsScore(finalState.stats);

  return {
    mode: GameMode.PHYSICS,
    score: Math.round(finalScore),
    duration: Math.floor(finalState.stats.gameTime / 1000),
    gameTime: Math.round(finalState.stats.gameTime),
    totalHits: finalState.stats.correctHits,
    mistakesMade: finalState.stats.currentMistakes,
    finalScore: Math.round(finalScore),
    survivalTime: Math.round(finalState.stats.gameTime),
    deathCause,
    createdAt: new Date().toISOString(),
  };
};

export const cleanupPhysicsGame = (state: PhysicsGameState): void => {
  state.circleTimeouts.forEach((timeout) => clearTimeout(timeout));
  if (state.activationTimeout) {
    clearTimeout(state.activationTimeout);
  }

  if (state.engine) {
    Matter.Engine.clear(state.engine);
    if (state.render) {
      Matter.Render.stop(state.render);
    }
  }

  // Clear caches
  bodyLookupCache.clear();
  levelConfigCache.clear();
  cacheBuilt = false;
  cachedLevelConfig = null;
  lastLevelUpdate = 0;
};

export const formatPhysicsTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }

  return `${seconds}.${ms.toString().padStart(3, "0")}s`;
};