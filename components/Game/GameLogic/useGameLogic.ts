// src/components/Game/GameLogic/useGameLogic.ts

'use client'

import { useState, useRef, useCallback } from 'react'
import { GameStats, GameState, AdaptiveState, PrecisionModeState } from '@/types/game'
import { initializePrecisionModeState } from '@/utils/gameUtils'

interface UseGameLogicProps {
    isPrecisionMode: boolean
    initialStats: GameStats
}

export default function useGameLogic({ isPrecisionMode, initialStats }: UseGameLogicProps) {
    const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED)
    const [stats, setStats] = useState<GameStats>(initialStats)
    const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
        level: 0,
        activationSpeedMultiplier: 1,
        simultaneousMultiplier: 1,
        activeTimeMultiplier: 1
    })
    const [precisionState, setPrecisionState] = useState<PrecisionModeState | null>(
        isPrecisionMode ? initializePrecisionModeState() : null
    )

    const gameStartTimeRef = useRef<number>(0)
    const gameSavedRef = useRef<boolean>(false)

    const resetGame = useCallback(() => {
        setStats(initialStats)
        setAdaptiveState({
            level: 0,
            activationSpeedMultiplier: 1,
            simultaneousMultiplier: 1,
            activeTimeMultiplier: 1
        })
        if (isPrecisionMode) {
            setPrecisionState(initializePrecisionModeState())
        }
        gameSavedRef.current = false
        gameStartTimeRef.current = Date.now()
    }, [initialStats, isPrecisionMode])

    const updateStats = useCallback((callback: (prev: GameStats) => GameStats) => {
        setStats(callback)
    }, [])

    const endGameWithCause = useCallback((cause: 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout') => {
        console.log(`Game ended due to ${cause}`)
        setGameState(GameState.FINISHED)

        if (precisionState) {
            setPrecisionState(prev => prev ? { ...prev, isActive: false } : null)
        }
    }, [precisionState])

    return {
        gameState,
        setGameState,
        stats,
        setStats,
        updateStats,
        adaptiveState,
        setAdaptiveState,
        precisionState,
        setPrecisionState,
        gameStartTimeRef,
        gameSavedRef,
        resetGame,
        endGameWithCause
    }
}