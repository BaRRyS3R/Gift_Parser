// src/components/Game/GameTimers/useGameTimers.ts

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { GameState, PrecisionModeState, GameConfig } from '@/types/game'
import { updatePrecisionModeState } from '@/utils/gameUtils'

interface UseGameTimersProps {
    gameState: GameState
    isPrecisionMode: boolean
    precisionState: PrecisionModeState | null
    config: GameConfig
    onTimeUpdate: (timeLeft: number) => void
    onPrecisionUpdate: (callback: (prev: PrecisionModeState | null) => PrecisionModeState | null) => void
    onGameEnd: () => void
    onStatsUpdate: (callback: (prev: any) => any) => void
}

const STANDARD_GAME_DURATION = 30
const PRECISION_MODE_UPDATE_INTERVAL = 100

export default function useGameTimers({
    gameState,
    isPrecisionMode,
    precisionState,
    config,
    onTimeUpdate,
    onPrecisionUpdate,
    onGameEnd,
    onStatsUpdate
}: UseGameTimersProps) {
    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const precisionUpdateRef = useRef<NodeJS.Timeout | null>(null)
    const timeLeftRef = useRef<number>(STANDARD_GAME_DURATION)

    const clearTimers = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }
        if (precisionUpdateRef.current) {
            clearInterval(precisionUpdateRef.current)
            precisionUpdateRef.current = null
        }
    }, [])

    const startTimers = useCallback(() => {
        if (!isPrecisionMode) {
            // Standard mode timer
            timeLeftRef.current = STANDARD_GAME_DURATION
            onTimeUpdate(timeLeftRef.current)

            gameTimerRef.current = setInterval(() => {
                timeLeftRef.current -= 1
                onTimeUpdate(timeLeftRef.current)

                if (timeLeftRef.current <= 0) {
                    clearTimers()
                    onGameEnd()
                }
            }, 1000)
        } else {
            // Precision Mode update loop
            precisionUpdateRef.current = setInterval(() => {
                const deltaTime = PRECISION_MODE_UPDATE_INTERVAL

                onPrecisionUpdate(prev => {
                    if (!prev || !prev.isActive) return prev

                    const updated = updatePrecisionModeState(prev, deltaTime, config)

                    // Update stats with current precision state
                    onStatsUpdate(prevStats => ({
                        ...prevStats,
                        currentIntensityLevel: updated.intensityLevel,
                        survivalTime: updated.survivalTime
                    }))

                    return updated
                })
            }, PRECISION_MODE_UPDATE_INTERVAL)
        }
    }, [isPrecisionMode, config, onTimeUpdate, onPrecisionUpdate, onGameEnd, onStatsUpdate, clearTimers])

    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            startTimers()
        } else {
            clearTimers()
        }

        return clearTimers
    }, [gameState, startTimers, clearTimers])

    return {
        clearTimers,
        startTimers,
        timeLeft: timeLeftRef.current
    }
}