// src/components/Game/ScoreSystem/useScoreSystem.ts

'use client'

import { useCallback } from 'react'
import { GameStats, GameConfig, AdaptiveState, PrecisionModeState } from '@/types/game'
import {
    calculateProgressiveWrongPenalty,
    calculateDecoyPenalty,
    calculateFastClickBonus,
    updateAdaptiveState,
    calculateScoreMultiplier
} from '@/utils/gameUtils'

interface UseScoreSystemProps {
    config: GameConfig
    isPrecisionMode: boolean
    adaptiveState: AdaptiveState
    setAdaptiveState: (state: AdaptiveState) => void
    onStatsUpdate: (callback: (prev: GameStats) => GameStats) => void
    onEndGame: (cause: 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout') => void
}

export default function useScoreSystem({
    config,
    isPrecisionMode,
    adaptiveState,
    setAdaptiveState,
    onStatsUpdate,
    onEndGame
}: UseScoreSystemProps) {
    const handleCorrectHit = useCallback((reactionTime: number) => {
        const fastBonus = calculateFastClickBonus(reactionTime, config.fastClickThreshold)

        onStatsUpdate(prev => {
            let baseScore: number
            let newStats: GameStats

            if (isPrecisionMode) {
                // Precision Mode scoring
                const newPerfectStreak = (prev.perfectStreak || 0) + 1
                baseScore = 10 + (newPerfectStreak * 2) + fastBonus

                newStats = {
                    ...prev,
                    score: prev.score + baseScore,
                    correctHits: prev.correctHits + 1,
                    consecutiveHits: prev.consecutiveHits + 1,
                    consecutiveMisses: 0,
                    fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                    totalReactionTime: prev.totalReactionTime + reactionTime,
                    hitCount: prev.hitCount + 1,
                    perfectStreak: newPerfectStreak
                }
            } else {
                // Standard mode scoring
                const scoreMultiplier = calculateScoreMultiplier(prev.consecutiveHits + 1)
                baseScore = Math.floor(1 * scoreMultiplier) + fastBonus

                const newAdaptive = updateAdaptiveState(
                    adaptiveState,
                    prev.consecutiveHits + 1,
                    0
                )
                setAdaptiveState(newAdaptive)

                newStats = {
                    ...prev,
                    score: prev.score + baseScore,
                    correctHits: prev.correctHits + 1,
                    consecutiveHits: prev.consecutiveHits + 1,
                    consecutiveMisses: 0,
                    fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                    totalReactionTime: prev.totalReactionTime + reactionTime,
                    hitCount: prev.hitCount + 1
                }
            }

            return newStats
        })
    }, [config, isPrecisionMode, adaptiveState, setAdaptiveState, onStatsUpdate])

    const handleDecoyHit = useCallback(() => {
        if (isPrecisionMode) {
            onStatsUpdate(prev => ({ ...prev, decoyHits: prev.decoyHits + 1 }))
            onEndGame('decoy_hit')
            return
        }

        // Standard mode penalty
        onStatsUpdate(prev => {
            const penalty = calculateDecoyPenalty(prev.consecutiveMisses)
            const newAdaptive = updateAdaptiveState(
                adaptiveState,
                0,
                prev.consecutiveMisses + 1
            )
            setAdaptiveState(newAdaptive)

            return {
                ...prev,
                score: prev.score - penalty,
                decoyHits: prev.decoyHits + 1,
                consecutiveHits: 0,
                consecutiveMisses: prev.consecutiveMisses + 1
            }
        })
    }, [isPrecisionMode, adaptiveState, setAdaptiveState, onStatsUpdate, onEndGame])

    const handleWrongClick = useCallback(() => {
        if (isPrecisionMode) {
            onStatsUpdate(prev => ({ ...prev, wrongHits: prev.wrongHits + 1 }))
            onEndGame('wrong_click')
            return
        }

        // Standard mode penalty
        onStatsUpdate(prev => {
            const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
            const newAdaptive = updateAdaptiveState(
                adaptiveState,
                0,
                prev.consecutiveMisses + 1
            )
            setAdaptiveState(newAdaptive)

            return {
                ...prev,
                score: prev.score - penalty,
                wrongHits: prev.wrongHits + 1,
                consecutiveHits: 0,
                consecutiveMisses: prev.consecutiveMisses + 1
            }
        })
    }, [isPrecisionMode, adaptiveState, setAdaptiveState, onStatsUpdate, onEndGame])

    const handleMissedCircle = useCallback(() => {
        if (isPrecisionMode) {
            onEndGame('miss')
            return
        }

        // Standard mode penalty
        onStatsUpdate(prev => {
            const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
            const newAdaptive = updateAdaptiveState(
                adaptiveState,
                0,
                prev.consecutiveMisses + 1
            )
            setAdaptiveState(newAdaptive)

            return {
                ...prev,
                score: prev.score - penalty,
                missedCircles: prev.missedCircles + 1,
                consecutiveHits: 0,
                consecutiveMisses: prev.consecutiveMisses + 1
            }
        })
    }, [isPrecisionMode, adaptiveState, setAdaptiveState, onStatsUpdate, onEndGame])

    return {
        handleCorrectHit,
        handleDecoyHit,
        handleWrongClick,
        handleMissedCircle
    }
}