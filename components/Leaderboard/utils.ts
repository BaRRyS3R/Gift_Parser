// src/components/Leaderboard/utils.ts

import { GameDifficulty } from '@/types/game'

export type LeaderboardType = 'overall' | 'precision' | GameDifficulty

export const formatLastPlayed = (dateString?: string) => {
    if (!dateString) return 'NEVER'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'NOW'
    if (diffInHours < 24) return `${diffInHours}h`
    return `${Math.floor(diffInHours / 24)}d`
}

export const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
        case GameDifficulty.EASY: return 'NOOB'
        case GameDifficulty.MEDIUM: return 'CASUAL'
        case GameDifficulty.HARD: return 'PRO'
        case GameDifficulty.LEGENDARY: return 'LEGEND'
        case GameDifficulty.OMG: return 'OMG'
        case GameDifficulty.NIGHTMARE: return 'NIGHTMARE'
        case GameDifficulty.IMPOSSIBLE: return 'RAGE MODE'
        case GameDifficulty.PRECISION: return 'PRECISION'
    }
}