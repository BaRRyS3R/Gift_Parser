// src/components/Game/GameSave/useGameSave.ts

'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { GameResult, GameDifficulty, AdaptiveState, PrecisionModeState, GameStats } from '@/types/game'
import {
    calculatePrecisionModeScore,
    getPrecisionModeDeathCause
} from '@/utils/gameUtils'

const STANDARD_GAME_DURATION = 30

interface UseGameSaveProps {
    difficulty: GameDifficulty
    isPrecisionMode: boolean
}

export default function useGameSave({ difficulty, isPrecisionMode }: UseGameSaveProps) {
    const { saveGameResult } = useUser()
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const saveGame = useCallback(async (
        stats: GameStats,
        adaptiveState: AdaptiveState,
        precisionState: PrecisionModeState | null
    ) => {
        try {
            setIsSavingResult(true)
            setSaveError(null)
            setSaveSuccess(false)

            let result: GameResult

            if (isPrecisionMode && precisionState) {
                // Precision Mode result
                const finalScore = calculatePrecisionModeScore(
                    precisionState.survivalTime,
                    stats.perfectStreak || 0,
                    precisionState.intensityLevel
                )

                result = {
                    difficulty,
                    score: finalScore,
                    correctHits: stats.correctHits,
                    wrongHits: stats.wrongHits,
                    missedCircles: stats.missedCircles,
                    decoyHits: stats.decoyHits,
                    accuracy: stats.correctHits > 0 ? 100 : 0,
                    duration: Math.floor(precisionState.survivalTime / 1000),
                    fastHits: stats.fastHits,
                    averageReactionTime: stats.hitCount > 0 ? Math.round(stats.totalReactionTime / stats.hitCount) : 0,
                    adaptiveLevel: 0,
                    survivalTime: precisionState.survivalTime,
                    maxIntensityReached: precisionState.intensityLevel,
                    perfectStreak: stats.perfectStreak || 0,
                    deathCause: getPrecisionModeDeathCause(stats.wrongHits, stats.missedCircles, stats.decoyHits)
                }
            } else {
                // Standard mode result
                const averageReactionTime = stats.hitCount > 0
                    ? Math.round(stats.totalReactionTime / stats.hitCount)
                    : 0

                result = {
                    difficulty,
                    score: stats.score,
                    correctHits: stats.correctHits,
                    wrongHits: stats.wrongHits,
                    missedCircles: stats.missedCircles,
                    decoyHits: stats.decoyHits,
                    accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                        ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                        : 0,
                    duration: STANDARD_GAME_DURATION,
                    fastHits: stats.fastHits,
                    averageReactionTime,
                    adaptiveLevel: adaptiveState.level
                }
            }

            await saveGameResult(result)
            console.log('Game result saved successfully')
            setSaveSuccess(true)
            setSaveError(null)

            return result
        } catch (error) {
            console.error('Error saving game result:', error)
            setSaveError('Error saving result to database')
            setSaveSuccess(false)
            throw error
        } finally {
            setIsSavingResult(false)
        }
    }, [difficulty, isPrecisionMode, saveGameResult])

    return {
        saveGame,
        isSavingResult,
        saveError,
        saveSuccess
    }
}