// src/game-modes/physics/PhysicsGameLogic.ts - Оптимизированная версия для мобильных устройств

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
    { level: 1, maxSimultaneousCircles: 1, activationTimeMin: 2000, activationTimeMax: 3500, description: "НАЧАЛЬНЫЙ" },
    { level: 2, maxSimultaneousCircles: 2, activationTimeMin: 1800, activationTimeMax: 3200, description: "ЛЕГКИЙ" },
    { level: 3, maxSimultaneousCircles: 3, activationTimeMin: 1600, activationTimeMax: 3000, description: "СРЕДНИЙ" },
    { level: 4, maxSimultaneousCircles: 4, activationTimeMin: 1400, activationTimeMax: 2800, description: "СЛОЖНЫЙ" },
    { level: 5, maxSimultaneousCircles: 5, activationTimeMin: 1200, activationTimeMax: 2600, description: "ЭКСТРЕМАЛЬНЫЙ" },
    { level: 6, maxSimultaneousCircles: 6, activationTimeMin: 1000, activationTimeMax: 2400, description: "МАСТЕР" },
    { level: 7, maxSimultaneousCircles: 7, activationTimeMin: 900, activationTimeMax: 2200, description: "ЭКСПЕРТ" },
    { level: 8, maxSimultaneousCircles: 8, activationTimeMin: 800, activationTimeMax: 2000, description: "ЛЕГЕНДА" },
];

export const getPhysicsLevelConfig = (gameTime: number): PhysicsLevelConfig => {
    const levelIndex = Math.min(Math.floor(gameTime / 5000), PHYSICS_LEVELS.length - 1);
    return PHYSICS_LEVELS[levelIndex];
};

// Детекция мобильных устройств
const isMobileDevice = (): boolean => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Детекция слабых устройств
const isLowPerformanceDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;

    // Проверка на основе UserAgent
    const isOldAndroid = /Android [1-6]\./.test(navigator.userAgent);
    const isOldIOS = /OS [1-9]_/.test(navigator.userAgent);

    // Проверка производительности через navigator
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

    return isOldAndroid || isOldIOS || isSlowConnection;
};

export const createAdaptivePhysicsConfig = (): PhysicsGameConfig => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 350;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 500;

    const isMobile = isMobileDevice();
    const isLowPerf = isLowPerformanceDevice();

    // Адаптивные настройки для разных устройств
    const infoBarHeight = 140;
    const containerWidth = screenWidth;
    const containerHeight = screenHeight - infoBarHeight;

    // Уменьшаем количество кругов на слабых устройствах
    let circleCount = 20;
    if (isLowPerf) {
        circleCount = 20;
    } else if (isMobile) {
        circleCount = 20;
    }

    // Адаптивный радиус кругов
    const baseRadius = Math.max(26, Math.min(36, containerWidth / 18));
    const circleRadius = isLowPerf ? Math.max(baseRadius - 4, 22) : baseRadius;

    return {
        id: "physics",
        name: "PHYSICS MODE",
        circleCount,
        circleRadius,
        containerWidth,
        containerHeight,
        initialActivationTimeMin: 2000,
        initialActivationTimeMax: 3500,
        circleActiveTime: 3000,
        impulseForce: 0.08,
        maxMistakes: 5,
        levelDuration: 360,
    };
};

export const PHYSICS_ENGINE_CONFIG: PhysicsConfig = {
    containerWidth: 350,
    containerHeight: 500,
    wallThickness: 20,
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
    const isMobile = isMobileDevice();
    const isLowPerf = isLowPerformanceDevice();

    engine.world.gravity.x = PHYSICS_ENGINE_CONFIG.gravity.x;
    engine.world.gravity.y = PHYSICS_ENGINE_CONFIG.gravity.y;

    // Оптимизация для разных устройств
    if (isLowPerf) {
        // Максимальная оптимизация для слабых устройств
        engine.constraintIterations = 1;
        engine.positionIterations = 2;
        engine.velocityIterations = 1;
        engine.timing.timeScale = 0.7;
    } else if (isMobile) {
        // Умеренная оптимизация для мобильных
        engine.constraintIterations = 2;
        engine.positionIterations = 3;
        engine.velocityIterations = 2;
        engine.timing.timeScale = 0.85;
    } else {
        // Полная производительность для ПК
        engine.constraintIterations = 2;
        engine.positionIterations = 4;
        engine.velocityIterations = 2;
        engine.timing.timeScale = 1;
    }

    // Matter.js создает движок без рендерера по умолчанию
    // Мы используем собственный Canvas для отрисовки

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
    const margin = radius + 15;
    const maxAttempts = 100;
    const isMobile = isMobileDevice();

    // Уменьшаем плотность на мобильных для лучшей производительности
    const density = isMobile ? 0.001 : 0.002;

    for (let i = 0; i < count; i++) {
        let x: number, y: number;
        let attempts = 0;
        let validPosition = false;

        do {
            x = margin + Math.random() * (containerWidth - 2 * margin);
            y = margin + Math.random() * (containerHeight - 2 * margin);

            validPosition = true;

            for (const existingCircle of circles) {
                const distance = Math.sqrt(
                    Math.pow(x - existingCircle.x, 2) + Math.pow(y - existingCircle.y, 2)
                );

                if (distance < radius * 2.2) {
                    validPosition = false;
                    break;
                }
            }

            attempts++;
        } while (!validPosition && attempts < maxAttempts);

        const body = Matter.Bodies.circle(x, y, radius, {
            restitution: PHYSICS_ENGINE_CONFIG.restitution,
            friction: PHYSICS_ENGINE_CONFIG.friction,
            frictionAir: PHYSICS_ENGINE_CONFIG.frictionAir,
            density,
            label: `circle_${i}`,
        });

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
                render: { visible: false }
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
                render: { visible: false }
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
                render: { visible: false }
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
                render: { visible: false }
            }
        ),
    };

    Matter.World.add(engine.world, [walls.top, walls.bottom, walls.left, walls.right]);

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
        engine
    );

    const wallBodies = createBoundaryWalls(
        config.containerWidth,
        config.containerHeight,
        PHYSICS_ENGINE_CONFIG.wallThickness,
        engine
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

export const updatePhysicsPositions = (state: PhysicsGameState): PhysicsGameState => {
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

export const updatePhysicsLevel = (state: PhysicsGameState): PhysicsGameState => {
    const currentTime = Date.now();
    const gameTime = currentTime - (state.gameStartTime || currentTime);
    const levelConfig = getPhysicsLevelConfig(gameTime);

    return {
        ...state,
        stats: {
            ...state.stats,
            gameTime,
            currentLevel: levelConfig.level,
        }
    };
};

export const activateRandomCircles = (
    state: PhysicsGameState,
    onCirclesActivated: (circleIds: number[], decoyIds: number[]) => void,
    onCircleTimeout: (circleId: number, wasDecoy: boolean) => void,
): PhysicsGameState => {
    const gameTime = Date.now() - (state.gameStartTime || Date.now());
    const levelConfig = getPhysicsLevelConfig(gameTime);

    const availableSlots = levelConfig.maxSimultaneousCircles - state.activeCircleIds.length;
    if (availableSlots <= 0) return state;

    const visibleCircles = state.circles.filter(circle =>
        !circle.isActive &&
        !circle.isAnimating &&
        circle.x >= 0 &&
        circle.x <= state.config.containerWidth &&
        circle.y >= 0 &&
        circle.y <= state.config.containerHeight
    );

    if (visibleCircles.length === 0) return state;

    const circleCount = Math.min(availableSlots, visibleCircles.length);
    const selectedCircles = [];

    for (let i = 0; i < circleCount; i++) {
        const randomIndex = Math.floor(Math.random() * visibleCircles.length);
        const selectedCircle = visibleCircles.splice(randomIndex, 1)[0];
        selectedCircles.push(selectedCircle);
    }

    const decoyCount = Math.min(1, Math.floor(selectedCircles.length * 0.25));
    const decoyIds = selectedCircles.slice(0, decoyCount).map(c => c.id);
    const selectedIds = selectedCircles.map(c => c.id);

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
    const clickedCircle = state.circles.find(c => c.id === clickedCircleId);
    if (!clickedCircle) return state;

    const clickedBody = state.engine.world.bodies.find(b => b.id === clickedCircle.matterBodyId);
    if (!clickedBody) return state;

    let affectedCircles = 0;
    const isMobile = isMobileDevice();
    const adjustedForce = isMobile ? IMPULSE_CONFIG.force * 0.8 : IMPULSE_CONFIG.force;

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

            const distanceRatio = Math.max(0.1, 1 - (distance / IMPULSE_CONFIG.radius));
            const forceMagnitude = adjustedForce * Math.pow(distanceRatio, 0.5) * 2;

            Matter.Body.applyForce(body, body.position, {
                x: normalizedX * forceMagnitude,
                y: normalizedY * forceMagnitude,
            });

            affectedCircles++;
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
    const margin = 50;

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

    return escapedCount >= Math.floor(state.circles.length * 0.8);
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