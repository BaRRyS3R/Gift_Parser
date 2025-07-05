// src/game-modes/physics/PhysicsGameLogic.ts - Модифицированный для использования границ экрана

import { PhysicsGameConfig, PhysicsGameStats, PhysicsGameResult, PhysicsGameState } from "@/types/game-modes/physics";
import { PhysicsCircle, GameState, GameMode, BoundaryState } from "@/types/game-modes/common";
import * as Matter from "matter-js";

// Конфигурация физического движка
export const PHYSICS_ENGINE_CONFIG = {
    gravity: { x: 0, y: 0.3, scale: 0.001 },
    restitution: 0.8,
    friction: 0.005,
    frictionAir: 0.01,
    wallThickness: 20,
};

// Конфигурация импульса
export const IMPULSE_CONFIG = {
    force: 0.05,
    radius: 150,
    falloff: 0.7,
};

// Функция создания адаптивной конфигурации
export const createAdaptivePhysicsConfig = (): PhysicsGameConfig => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

    const containerWidth = Math.min(screenWidth * 0.95, 400);
    const containerHeight = Math.min(screenHeight * 0.7, 500);

    return {
        id: "physics",
        name: "PHYSICS MODE",
        circleCount: 20,
        circleRadius: Math.max(12, Math.min(20, containerWidth / 25)),
        containerWidth,
        containerHeight,
        initialActivationTimeMin: 1000,
        initialActivationTimeMax: 2500,
        circleActiveTime: 3000,
        impulseForce: IMPULSE_CONFIG.force,
        maxMistakes: 3, // Изменено: максимум 3 ошибки вместо 4
        levelDuration: 120,
    };
};

// Создание физического движка
export const createPhysicsEngine = () => {
    const engine = Matter.Engine.create();
    engine.world.gravity = PHYSICS_ENGINE_CONFIG.gravity;
    return engine;
};

// Создание физических кругов
export const createPhysicsCircles = (
    count: number,
    containerWidth: number,
    containerHeight: number,
    radius: number,
    engine: Matter.Engine
): PhysicsCircle[] => {
    const circles: PhysicsCircle[] = [];
    const maxAttempts = 50;

    for (let i = 0; i < count; i++) {
        let x, y;
        let validPosition = false;
        let attempts = 0;

        do {
            x = radius + Math.random() * (containerWidth - radius * 2);
            y = radius + Math.random() * (containerHeight - radius * 2);

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
            density: 0.002,
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

// Создание граничных стен - МОДИФИЦИРОВАНО для невидимых границ экрана
export const createBoundaryWalls = (
    containerWidth: number,
    containerHeight: number,
    thickness: number,
    engine: Matter.Engine
) => {
    const menuHeight = 80; // Высота нижнего меню

    const walls = {
        top: Matter.Bodies.rectangle(
            containerWidth / 2,
            0,
            containerWidth,
            thickness,
            {
                isStatic: true,
                label: "wall_top",
                render: { visible: false } // Невидимая граница
            }
        ),
        bottom: Matter.Bodies.rectangle(
            containerWidth / 2,
            containerHeight - menuHeight,
            containerWidth,
            thickness,
            {
                isStatic: true,
                label: "wall_bottom",
                render: { visible: false } // Невидимая граница
            }
        ),
        left: Matter.Bodies.rectangle(
            0,
            containerHeight / 2,
            thickness,
            containerHeight,
            {
                isStatic: true,
                label: "wall_left",
                render: { visible: false } // Невидимая граница
            }
        ),
        right: Matter.Bodies.rectangle(
            containerWidth,
            containerHeight / 2,
            thickness,
            containerHeight,
            {
                isStatic: true,
                label: "wall_right",
                render: { visible: false } // Невидимая граница
            }
        ),
    };

    Matter.World.add(engine.world, [walls.top, walls.bottom, walls.left, walls.right]);

    return walls;
};

// Инициализация состояния физической игры
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

// Обновление позиций физических объектов
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

// Обновление уровня и времени игры
export const updatePhysicsLevel = (state: PhysicsGameState, currentTime?: number): PhysicsGameState => {
    if (!state.isActive || !state.gameStartTime) return state;

    const now = currentTime || Date.now();
    const gameTime = (now - state.gameStartTime) / 1000;

    return {
        ...state,
        stats: {
            ...state.stats,
            gameTime,
        },
    };
};

// Получение конфигурации уровня
export const getPhysicsLevelConfig = (gameTime: number) => {
    const level = Math.min(Math.floor(gameTime / 15) + 1, 8);
    const descriptions = [
        "НАЧАЛЬНЫЙ ЭКСПЕРИМЕНТ",
        "БАЗОВАЯ ФИЗИКА",
        "УСЛОЖНЁННАЯ ДИНАМИКА",
        "ХАОТИЧЕСКОЕ ДВИЖЕНИЕ",
        "ЭКСТРЕМАЛЬНАЯ ФИЗИКА",
        "МАСТЕРСКИЙ ЭКСПЕРИМЕНТ",
        "ЛЕГЕНДАРНАЯ ФИЗИКА",
        "ИДЕАЛЬНАЯ СИМУЛЯЦИЯ"
    ];

    return {
        level,
        description: descriptions[level - 1] || descriptions[descriptions.length - 1],
        maxSimultaneousCircles: Math.min(2 + Math.floor(gameTime / 20), 5),
        activationFrequency: Math.max(800, 2000 - gameTime * 20),
    };
};

// Активация случайных кругов
export const activateRandomCircles = (
    state: PhysicsGameState,
    onCirclesActivated: (circleIds: number[], decoyIds: number[]) => void,
    onCircleTimeout: (circleId: number, isDecoy: boolean) => void,
): PhysicsGameState => {
    const levelConfig = getPhysicsLevelConfig(state.stats.gameTime);
    const availableSlots = levelConfig.maxSimultaneousCircles - state.activeCircleIds.length;

    if (availableSlots <= 0) return state;

    const availableCircles = state.circles.filter(c =>
        !state.activeCircleIds.includes(c.id) && !c.isActive
    );

    if (availableCircles.length === 0) return state;

    const toActivate = Math.min(availableSlots, availableCircles.length);
    const selectedCircles = availableCircles
        .sort(() => Math.random() - 0.5)
        .slice(0, toActivate);

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

// Применение импульса от клика
export const applyImpulse = (
    state: PhysicsGameState,
    clickedCircleId: number,
): PhysicsGameState => {
    const clickedCircle = state.circles.find(c => c.id === clickedCircleId);
    if (!clickedCircle) return state;

    const clickedBody = state.engine.world.bodies.find(b => b.id === clickedCircle.matterBodyId);
    if (!clickedBody) return state;

    console.log(`Applying impulse from circle ${clickedCircleId} at position:`, clickedBody.position);

    let affectedCircles = 0;

    state.circles.forEach((circle) => {
        if (circle.id === clickedCircleId) return;

        const body = state.engine.world.bodies.find(b => b.id === circle.matterBodyId);
        if (!body) return;

        const dx = body.position.x - clickedBody.position.x;
        const dy = body.position.y - clickedBody.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= IMPULSE_CONFIG.radius && distance > 0) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;

            const forceMagnitude = IMPULSE_CONFIG.force * Math.pow(IMPULSE_CONFIG.falloff, distance / IMPULSE_CONFIG.radius);

            const impulse = {
                x: normalizedDx * forceMagnitude,
                y: normalizedDy * forceMagnitude
            };

            Matter.Body.applyForce(body, body.position, impulse);
            affectedCircles++;

            console.log(`Applied impulse to circle ${circle.id}: force=${forceMagnitude.toFixed(3)}, distance=${distance.toFixed(1)}`);
        }
    });

    console.log(`Total circles affected by impulse: ${affectedCircles}`);

    return state;
};

// Обработка клика по кругу
export const handlePhysicsCircleClick = (
    state: PhysicsGameState,
    clickedCircleId: number,
    clickTime: number = Date.now(),
): { newState: PhysicsGameState; result: "correct" | "wrong" | "decoy" } => {
    const clickedCircle = state.circles.find((c) => c.id === clickedCircleId);

    if (!clickedCircle) {
        return { newState: state, result: "wrong" };
    }

    const updatedState = updatePhysicsLevel(state, clickTime);

    if (clickedCircle.isActive && !clickedCircle.isAnimating) {
        if (clickedCircle.isDecoy) {
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
            const newStats = {
                ...updatedState.stats,
                correctHits: updatedState.stats.correctHits + 1,
                totalScore: updatedState.stats.totalScore + 10,
            };

            const stateWithImpulse = applyImpulse(updatedState, clickedCircleId);

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

// МОДИФИЦИРОВАНО: Удаление стен отключено
export const removeWall = (state: PhysicsGameState, mistakeCount: number): PhysicsGameState => {
    // Стены больше не удаляются при ошибках
    // Возвращаем состояние без изменений границ
    return state;
};

// Деактивация круга
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

// Проверка на выход кругов из контейнера
export const checkCirclesEscaped = (state: PhysicsGameState): boolean => {
    const containerWidth = state.config.containerWidth;
    const containerHeight = state.config.containerHeight;
    const margin = 120;

    let escapedCount = 0;

    state.circles.forEach((circle) => {
        const leftBound = state.boundaries.left ? -margin : -containerWidth;
        const rightBound = state.boundaries.right ? containerWidth + margin : containerWidth * 2;
        const topBound = state.boundaries.top ? -margin : -containerHeight;
        const bottomBound = state.boundaries.bottom ? containerHeight + margin : containerHeight * 2;

        if (circle.x < leftBound || circle.x > rightBound ||
            circle.y < topBound || circle.y > bottomBound) {
            escapedCount++;
        }
    });

    return escapedCount >= 3;
};

// Расчет очков физической игры
export const calculatePhysicsScore = (stats: PhysicsGameStats): number => {
    const baseScore = stats.correctHits * 100;
    const timeBonus = Math.max(0, Math.floor(stats.gameTime)) * 5;
    const mistakePenalty = stats.currentMistakes * 50;

    return Math.max(0, Math.round(baseScore + timeBonus - mistakePenalty));
};

// Создание результата игры
export const createPhysicsGameResult = (
    state: PhysicsGameState,
    deathCause: "mistakes" | "escaped_circles" | "timeout" = "mistakes"
): PhysicsGameResult => {
    const finalState = updatePhysicsPositions(state);
    const finalScore = calculatePhysicsScore(finalState.stats);
    const gameTimeMs = finalState.stats.gameTime * 1000; // Конвертируем в миллисекунды

    return {
        mode: GameMode.PHYSICS,
        score: Math.round(finalScore),
        duration: Math.floor(gameTimeMs), // duration в миллисекундах для BaseGameResult
        createdAt: new Date().toISOString(),
        gameTime: Math.round(finalState.stats.gameTime),
        totalHits: finalState.stats.correctHits,
        mistakesMade: finalState.stats.currentMistakes,
        finalScore: Math.round(finalScore),
        survivalTime: Math.round(finalState.stats.gameTime),
        deathCause,
    };
};

// Очистка игры
export const cleanupPhysicsGame = (state: PhysicsGameState): void => {
    console.log("Cleaning up physics game...");

    state.circleTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
    });

    if (state.activationTimeout) {
        clearTimeout(state.activationTimeout);
    }

    try {
        if (state.engine && state.engine.world) {
            Matter.World.clear(state.world, false);
            Matter.Engine.clear(state.engine);
        }
    } catch (error) {
        console.error("Error during physics cleanup:", error);
    }
};

// Форматирование времени
export const formatPhysicsTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
};