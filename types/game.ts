// src/types/game.ts

export interface Circle {
    id: number
    isActive: boolean
    isAnimating: boolean
    x?: number
    y?: number
}

export interface GameStats {
    score: number
    correctHits: number
    wrongHits: number
    missedCircles: number
    totalCircles: number
}

export interface GameConfig {
    id: string
    name: string
    circleCount: number
    minActivationTime: number
    maxActivationTime: number
    maxSimultaneousCircles: number
    circleActiveTime: number
}

export enum GameDifficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard',
    LEGENDARY = 'legendary',
    OMG = 'omg'
}

export enum GameState {
    NOT_STARTED = 'not_started',
    STARTING = 'starting',
    PLAYING = 'playing',
    PAUSED = 'paused',
    FINISHED = 'finished'
}

export interface GameResult {
    difficulty: GameDifficulty
    score: number
    correctHits: number
    wrongHits: number
    missedCircles: number
    accuracy: number
    duration: number
}