// src/game-modes/physics/PhysicsGameLogic.ts - Complete corrected physics logic with proper Matter.js integration

import * as Matter from "matter-js";
import {
    PhysicsGameConfig,
    PhysicsGameStats,
    PhysicsGameResult,
    PhysicsGameState,
    PhysicsConfig,
    ImpulseConfig,
} from "@/types/game-modes/physics";
import { PhysicsCircle, GameState, GameMode, BoundaryState } from "@/types/game-modes/common";

export const PHYSICS_CONFIG: PhysicsGameConfig = {
    id: "physics",
    name: "PHYSICS MODE",
    circleCount: 20,
    circleRadius: 25,
    containerWidth: 350,
    containerHeight: 500,
    initialActivationTimeMin: 1500,
    initialActivationTimeMax: 3000,
    circleActiveTime: 2500,
    impulseForce: 0.08, // Increased for better visual feedback
    maxMistakes: 4,
    levelDuration: 120, // 2 minutes
};

export const PHYSICS_ENGINE_CONFIG: PhysicsConfig = {
    containerWidth: PHYSICS_CONFIG.containerWidth,
    containerHeight: PHYSICS_CONFIG.containerHeight,
    wallThickness: 10,
    gravity: { x: 0, y: 0.4 }, // Slight gravity for natural movement
    restitution: 0.8, // Bounce factor
    friction: 0.01, // Surface friction
    frictionAir: 0.015, // Air resistance
};

export const IMPULSE_CONFIG: ImpulseConfig = {
    force: 0.1, // Увеличена сила для лучшего эффекта
    radius: 60, // Увеличен радиус действия
    falloff: 0.4, // Уменьшено затухание для большего эффекта
};

export const createPhysicsEngine = (): Matter.Engine => {
    const engine = Matter.Engine.create();
    engine.gravity.x = PHYSICS_ENGINE_CONFIG.gravity.x;
    engine.gravity.y = PHYSICS_ENGINE_CONFIG.gravity.y;

    // Configure engine timing for consistent physics
    engine.timing.timeScale = 1;

    return engine;
};

export const createPhysicsCircles = (
    count: number,
    containerWidth: number,
    containerHeight: number,
    radius: number,
    engine: Matter.Engine
): PhysicsCircle[] => {
    const circles: PhysicsCircle[] = [];
    const margin = radius + 15; // Increased margin for better spacing
    const maxAttempts = 100; // Prevent infinite loops

    for (let i = 0; i < count; i++) {
        let x: number, y: number;
        let attempts = 0;
        let validPosition = false;

        // Find non-overlapping position for each circle
        do {
            x = margin + Math.random() * (containerWidth - 2 * margin);
            y = margin + Math.random() * (containerHeight - 2 * margin);

            validPosition = true;

            // Check collision with existing circles
            for (const existingCircle of circles) {
                const distance = Math.sqrt(
                    Math.pow(x - existingCircle.x, 2) + Math.pow(y - existingCircle.y, 2)
                );

                // Ensure minimum distance between circle centers
                if (distance < radius * 2.2) { // 2.2x radius for proper spacing
                    validPosition = false;
                    break;
                }
            }

            attempts++;
        } while (!validPosition && attempts < maxAttempts);

        // Create physics body with collision detection
        const body = Matter.Bodies.circle(x, y, radius, {
            restitution: PHYSICS_ENGINE_CONFIG.restitution,
            friction: PHYSICS_ENGINE_CONFIG.friction,
            frictionAir: PHYSICS_ENGINE_CONFIG.frictionAir,
            density: 0.002, // Increased for better collision response
            label: `circle_${i}`, // Label for identification
        });

        // Add body to physics world
        Matter.World.add(engine.world, body);

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

export const createBoundaryWalls = (
    containerWidth: number,
    containerHeight: number,
    thickness: number,
    engine: Matter.Engine
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
                render: { fillStyle: "#ffffff40" }
            }
        ),
        bottom: Matter.Bodies.rectangle(
            containerWidth / 2,
            containerHeight + thickness / 2,
            containerWidth + thickness * 2,
            thickness,
            {
                isStatic: true,
                label: "wall_bottom",
                render: { fillStyle: "#ffffff40" }
            }
        ),
        left: Matter.Bodies.rectangle(
            -thickness / 2,
            containerHeight / 2,
            thickness,
            containerHeight + thickness * 2,
            {
                isStatic: true,
                label: "wall_left",
                render: { fillStyle: "#ffffff40" }
            }
        ),
        right: Matter.Bodies.rectangle(
            containerWidth + thickness / 2,
            containerHeight / 2,
            thickness,
            containerHeight + thickness * 2,
            {
                isStatic: true,
                label: "wall_right",
                render: { fillStyle: "#ffffff40" }
            }
        ),
    };

    // Add all walls to physics world
    Matter.World.add(engine.world, [walls.top, walls.bottom, walls.left, walls.right]);

    return walls;
};

export const initializePhysicsGameState = (): PhysicsGameState => {
    const gameStartTime = Date.now();
    const engine = createPhysicsEngine();

    const circles = createPhysicsCircles(
        PHYSICS_CONFIG.circleCount,
        PHYSICS_CONFIG.containerWidth,
        PHYSICS_CONFIG.containerHeight,
        PHYSICS_CONFIG.circleRadius,
        engine
    );

    const wallBodies = createBoundaryWalls(
        PHYSICS_CONFIG.containerWidth,
        PHYSICS_CONFIG.containerHeight,
        PHYSICS_ENGINE_CONFIG.wallThickness,
        engine
    );

    return {
        config: PHYSICS_CONFIG,
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

export const updatePhysicsPositions = (state: PhysicsGameState): PhysicsGameState => {
    // Synchronize circle positions with Matter.js physics bodies
    const updatedCircles = state.circles.map((circle) => {
        const body = state.engine.world.bodies.find(b => b.id === circle.matterBodyId);
        if (body) {
            return {
                ...circle,
                x: body.position.x,
                y: body.position.y,
                vx: body.velocity.x,
                vy: body.velocity.y,
            };
        }
        return circle;
    });

    return {
        ...state,
        circles: updatedCircles,
    };
};

export const activateRandomCircle = (
    state: PhysicsGameState,
    onCircleActivated: (circleId: number, isDecoy: boolean) => void,
    onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): PhysicsGameState => {
    if (state.activeCircleIds.length > 0) return state; // Only one active circle at a time

    // Select available circles for activation
    const availableCircles = state.circles.filter(c => !c.isActive && !c.isAnimating);
    if (availableCircles.length === 0) return state;

    const randomCircle = availableCircles[Math.floor(Math.random() * availableCircles.length)];

    // 25% chance for trap circle (red)
    const isDecoy = Math.random() < 0.25;

    const newActiveCircleIds = [...state.activeCircleIds, randomCircle.id];

    // Set timeout for circle deactivation
    const timeout = setTimeout(() => {
        onCircleTimeout(randomCircle.id, isDecoy);
    }, state.config.circleActiveTime);

    const newTimeouts = new Map(state.circleTimeouts);
    newTimeouts.set(randomCircle.id, timeout);

    const updatedCircles = state.circles.map((circle) =>
        circle.id === randomCircle.id
            ? { ...circle, isActive: true, isDecoy }
            : circle,
    );

    onCircleActivated(randomCircle.id, isDecoy);

    return {
        ...state,
        activeCircleIds: newActiveCircleIds,
        circleTimeouts: newTimeouts,
        circles: updatedCircles,
    };
};

export const applyImpulse = (
    state: PhysicsGameState,
    clickedCircleId: number,
): PhysicsGameState => {
    const clickedCircle = state.circles.find(c => c.id === clickedCircleId);
    if (!clickedCircle) return state;

    const clickedBody = state.engine.world.bodies.find(b => b.id === clickedCircle.matterBodyId);
    if (!clickedBody) return state;

    console.log(`Применяем импульс от круга ${clickedCircleId} в позиции:`, clickedBody.position);

    let affectedCircles = 0;

    // Применяем импульс ко всем другим кругам в радиусе действия
    state.circles.forEach((circle) => {
        if (circle.id === clickedCircleId) return;

        const body = state.engine.world.bodies.find(b => b.id === circle.matterBodyId);
        if (!body) return;

        const dx = body.position.x - clickedBody.position.x;
        const dy = body.position.y - clickedBody.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= IMPULSE_CONFIG.radius && distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            // ИСПРАВЛЕНИЕ: Увеличена сила импульса для лучшего визуального эффекта
            const distanceRatio = Math.max(0.1, 1 - (distance / IMPULSE_CONFIG.radius));
            const forceMagnitude = IMPULSE_CONFIG.force * Math.pow(distanceRatio, 0.5) * 2; // Увеличен множитель

            // Применяем силу к телу
            Matter.Body.applyForce(body, body.position, {
                x: normalizedX * forceMagnitude,
                y: normalizedY * forceMagnitude,
            });

            affectedCircles++;
        }
    });

    console.log(`Импульс затронул ${affectedCircles} кругов`);

    // Обновляем позиции после применения импульса
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
            // Red circle clicked - mistake
            return {
                newState: {
                    ...updatedState,
                    stats: {
                        ...updatedState.stats,
                        decoyHits: updatedState.stats.decoyHits + 1,
                        currentMistakes: updatedState.stats.currentMistakes + 1,
                    },
                },
                result: "decoy",
            };
        } else {
            // Correct white circle click - apply impulse and award points
            const stateWithImpulse = applyImpulse(updatedState, clickedCircleId);

            const newStats = {
                ...stateWithImpulse.stats,
                correctHits: stateWithImpulse.stats.correctHits + 1,
                totalScore: stateWithImpulse.stats.totalScore + 100,
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
        // Click on inactive circle - mistake
        return {
            newState: {
                ...updatedState,
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

export const removeWall = (state: PhysicsGameState, mistakeCount: number): PhysicsGameState => {
    const newBoundaries = { ...state.boundaries };
    let wallToRemove: keyof typeof state.wallBodies | null = null;

    // ИСПРАВЛЕНИЕ: Правильный порядок удаления стен (сначала верхняя)
    switch (mistakeCount) {
        case 1:
            if (newBoundaries.top && state.wallBodies.top) {
                newBoundaries.top = false;
                wallToRemove = "top";
            }
            break;
        case 2:
            if (newBoundaries.bottom && state.wallBodies.bottom) {
                newBoundaries.bottom = false;
                wallToRemove = "bottom";
            }
            break;
        case 3:
            if (newBoundaries.left && state.wallBodies.left) {
                newBoundaries.left = false;
                wallToRemove = "left";
            }
            break;
        case 4:
            if (newBoundaries.right && state.wallBodies.right) {
                newBoundaries.right = false;
                wallToRemove = "right";
            }
            break;
    }

    if (wallToRemove && state.wallBodies[wallToRemove]) {
        console.log(`Удаляем стену: ${wallToRemove} из-за ошибки ${mistakeCount}`);

        // Удаляем стену из физического мира
        Matter.World.remove(state.world, state.wallBodies[wallToRemove]!);

        const newWallBodies = { ...state.wallBodies };
        delete newWallBodies[wallToRemove];

        return {
            ...state,
            boundaries: newBoundaries,
            wallBodies: newWallBodies,
        };
    }

    return {
        ...state,
        boundaries: newBoundaries,
    };
};

export const deactivatePhysicsCircle = (
    state: PhysicsGameState,
    circleId: number,
): PhysicsGameState => {
    const newActiveCircleIds = state.activeCircleIds.filter((id) => id !== circleId);

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

export const checkCirclesEscaped = (state: PhysicsGameState): boolean => {
    const containerWidth = state.config.containerWidth;
    const containerHeight = state.config.containerHeight;
    const margin = 100; // Увеличенная граница для определения ухода

    let escapedCount = 0;

    state.circles.forEach((circle) => {
        if (
            circle.x < -margin ||
            circle.x > containerWidth + margin ||
            circle.y < -margin ||
            circle.y > containerHeight + margin
        ) {
            escapedCount++;
        }
    });

    // ИСПРАВЛЕНИЕ: Игра заканчивается когда ВСЕ круги ушли за экран
    return escapedCount >= state.circles.length;
};

export const calculatePhysicsScore = (stats: PhysicsGameStats): number => {
    const baseScore = stats.correctHits * 100;
    const timeBonus = Math.max(0, stats.gameTime / 1000) * 5; // 5 points per second
    const mistakePenalty = stats.currentMistakes * 50;

    return Math.max(0, baseScore + timeBonus - mistakePenalty);
};

export const createPhysicsGameResult = (
    state: PhysicsGameState,
    deathCause: PhysicsGameResult["deathCause"],
): PhysicsGameResult => {
    const finalState = updatePhysicsPositions(state);
    const finalScore = calculatePhysicsScore(finalState.stats);

    return {
        mode: GameMode.PHYSICS,
        score: finalScore,
        duration: Math.floor(finalState.stats.gameTime / 1000),
        gameTime: finalState.stats.gameTime,
        totalHits: finalState.stats.correctHits,
        mistakesMade: finalState.stats.currentMistakes,
        finalScore,
        survivalTime: finalState.stats.gameTime,
        deathCause,
        createdAt: new Date().toISOString(),
    };
};

export const cleanupPhysicsGame = (state: PhysicsGameState): void => {
    // Clear all timeouts
    state.circleTimeouts.forEach((timeout) => clearTimeout(timeout));
    if (state.activationTimeout) {
        clearTimeout(state.activationTimeout);
    }

    // Clear Matter.js engine
    if (state.engine) {
        Matter.Engine.clear(state.engine);
        if (state.render) {
            Matter.Render.stop(state.render);
        }
    }
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