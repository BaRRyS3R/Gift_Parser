// src/types/game-modes/physics.ts - Типы для физического режима

import { BaseGameResult, GameState, GameMode, PhysicsCircle, BoundaryState } from "./common";
import * as Matter from "matter-js";

export interface PhysicsGameConfig {
    id: string;
    name: string;
    circleCount: number; // 20 кругов
    circleRadius: number; // Радиус кругов
    containerWidth: number; // Ширина контейнера
    containerHeight: number; // Высота контейнера
    initialActivationTimeMin: number; // Минимальное время активации
    initialActivationTimeMax: number; // Максимальное время активации
    circleActiveTime: number; // Время активности круга
    impulseForce: number; // Сила импульса при правильном клике
    maxMistakes: number; // Максимум ошибок (4 - по количеству стен)
    levelDuration: number; // Длительность уровня в секундах
}

export interface PhysicsGameStats {
    correctHits: number;
    wrongHits: number;
    missedCircles: number;
    decoyHits: number;
    gameTime: number;
    currentMistakes: number;
    totalScore: number;
    gameStartTime?: number;
    lastHitTime?: number;
}

export interface PhysicsGameResult extends BaseGameResult {
    mode: GameMode.PHYSICS;
    gameTime: number;
    totalHits: number;
    mistakesMade: number;
    finalScore: number;
    survivalTime: number;
    deathCause: "mistakes" | "escaped_circles" | "timeout";
}

export interface PhysicsGameState {
    config: PhysicsGameConfig;
    gameState: GameState;
    stats: PhysicsGameStats;
    circles: PhysicsCircle[];
    boundaries: BoundaryState;
    activeCircleIds: number[];
    circleTimeouts: Map<number, NodeJS.Timeout>;
    activationTimeout: NodeJS.Timeout | null;
    isActive: boolean;
    gameStartTime?: number;

    // Matter.js физический движок
    engine: Matter.Engine;
    render?: Matter.Render;
    world: Matter.World;

    // Физические тела
    wallBodies: {
        top?: Matter.Body;
        left?: Matter.Body;
        right?: Matter.Body;
        bottom?: Matter.Body;
    };

    // Canvas элемент
    canvasRef?: HTMLCanvasElement;
}

export interface PhysicsConfig {
    containerWidth: number;
    containerHeight: number;
    wallThickness: number;
    gravity: { x: number; y: number };
    restitution: number; // Упругость
    friction: number;
    frictionAir: number;
}

export interface ImpulseConfig {
    force: number;
    radius: number; // Радиус действия импульса
    falloff: number; // Коэффициент ослабления силы с расстоянием
}