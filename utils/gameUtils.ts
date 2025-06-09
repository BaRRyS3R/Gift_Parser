// src/utils/gameUtils.ts

import { GameConfig, GameDifficulty, Circle } from '@/types/game'

export const GAME_CONFIGS: Record<GameDifficulty, GameConfig> = {
    [GameDifficulty.EASY]: {
        id: 'easy',
        name: 'Easy',
        circleCount: 4,
        minActivationTime: 1000,
        maxActivationTime: 3000,
        maxSimultaneousCircles: 1,
        circleActiveTime: 2000
    },
    [GameDifficulty.MEDIUM]: {
        id: 'medium',
        name: 'Medium',
        circleCount: 8,
        minActivationTime: 1000,
        maxActivationTime: 3000,
        maxSimultaneousCircles: 1,
        circleActiveTime: 2000
    },
    [GameDifficulty.HARD]: {
        id: 'hard',
        name: 'Hard',
        circleCount: 12,
        minActivationTime: 500,
        maxActivationTime: 2000,
        maxSimultaneousCircles: 2,
        circleActiveTime: 1500
    },
    [GameDifficulty.LEGENDARY]: {
        id: 'legendary',
        name: 'Legendary',
        circleCount: 16,
        minActivationTime: 200,
        maxActivationTime: 1500,
        maxSimultaneousCircles: 4,
        circleActiveTime: 1000
    }
}

export const getRandomActivationDelay = (config: GameConfig): number => {
    return Math.random() * (config.maxActivationTime - config.minActivationTime) + config.minActivationTime
}

export const createCircleGrid = (count: number): Circle[] => {
    return Array.from({ length: count }, (_, index) => ({
        id: index,
        isActive: false,
        isAnimating: false
    }))
}

export const getRandomCircleIds = (
    totalCircles: number,
    maxCount: number,
    excludeIds: number[] = []
): number[] => {
    const availableIds = Array.from({ length: totalCircles }, (_, i) => i)
        .filter(id => !excludeIds.includes(id))

    const count = Math.min(
        Math.floor(Math.random() * maxCount) + 1,
        availableIds.length
    )

    const selectedIds: number[] = []

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableIds.length)
        const selectedId = availableIds.splice(randomIndex, 1)[0]
        selectedIds.push(selectedId)
    }

    return selectedIds
}

export const getGridDimensions = (circleCount: number) => {
    switch (circleCount) {
        case 4:
            return { cols: 2, rows: 2 }
        case 8:
            return { cols: 4, rows: 2 }
        case 12:
            return { cols: 4, rows: 3 }
        case 16:
            return { cols: 4, rows: 4 }
        default:
            return { cols: 2, rows: 2 }
    }
}

export const calculateAccuracy = (correctHits: number, totalClicks: number): number => {
    if (totalClicks === 0) return 0
    return Math.round((correctHits / totalClicks) * 100)
}

export const formatTime = (seconds: number): string => {
    return seconds.toString().padStart(2, '0')
}