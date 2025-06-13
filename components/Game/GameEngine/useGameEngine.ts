// src/components/Game/GameEngine/useGameEngine.ts

'use client'

import { useCallback, useRef } from 'react'
import { Circle, GameConfig, AdaptiveState, PrecisionModeState } from '@/types/game'
import {
    getRandomActivationDelay,
    getAdjustedCircleActiveTime,
    getAdjustedSimultaneousCircles,
    getAdjustedDecoyProbability,
    getRandomCircleIds,
    shouldCreateDecoy,
    updatePrecisionModeState
} from '@/utils/gameUtils'

interface UseGameEngineProps {
    config: GameConfig
    isPrecisionMode: boolean
    adaptiveState: AdaptiveState
    precisionState: PrecisionModeState | null
    onCircleTimeout: (circleId: number, isDecoy: boolean) => void
    onUpdateStats: (callback: (prev: any) => any) => void
    onEndGame: (cause: 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout') => void
}

export default function useGameEngine({
    config,
    isPrecisionMode,
    adaptiveState,
    precisionState,
    onCircleTimeout,
    onUpdateStats,
    onEndGame
}: UseGameEngineProps) {
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())
    const circleActivationTimesRef = useRef<Map<number, number>>(new Map())

    const clearAllTimeouts = useCallback(() => {
        if (activationTimeoutRef.current) {
            clearTimeout(activationTimeoutRef.current)
            activationTimeoutRef.current = null
        }
        circleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
        circleTimeoutsRef.current.clear()
    }, [])

    const deactivateCircle = useCallback((circleId: number) => {
        activeCirclesRef.current.delete(circleId)
        circleActivationTimesRef.current.delete(circleId)

        const timeout = circleTimeoutsRef.current.get(circleId)
        if (timeout) {
            clearTimeout(timeout)
            circleTimeoutsRef.current.delete(circleId)
        }
    }, [])

    const activateRandomCircles = useCallback(() => {
        const currentActiveIds = activeCirclesRef.current
        const currentActiveCount = currentActiveIds.size

        let maxSimultaneous = config.maxSimultaneousCircles
        if (isPrecisionMode && precisionState) {
            maxSimultaneous = getAdjustedSimultaneousCircles(maxSimultaneous, precisionState, config)
        } else if (config.adaptiveScaling) {
            maxSimultaneous = Math.ceil(maxSimultaneous * adaptiveState.simultaneousMultiplier)
        }

        const availableSlots = maxSimultaneous - currentActiveCount

        if (availableSlots <= 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return { selectedIds: [], activationResults: [] }
        }

        const selectedIds = getRandomCircleIds(
            config.circleCount,
            Math.min(availableSlots, config.circleCount - currentActiveCount),
            Array.from(currentActiveIds),
            adaptiveState,
            precisionState,
            config
        )

        if (selectedIds.length === 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return { selectedIds: [], activationResults: [] }
        }

        selectedIds.forEach(id => {
            activeCirclesRef.current.add(id)
            circleActivationTimesRef.current.set(id, Date.now())
        })

        let adjustedDecoyProbability = config.decoyProbability
        if (isPrecisionMode && precisionState) {
            adjustedDecoyProbability = getAdjustedDecoyProbability(config.decoyProbability, precisionState, config)
        }

        const activationResults = selectedIds.map(id => {
            const isDecoy = shouldCreateDecoy(adjustedDecoyProbability)
            return { id, isDecoy }
        })

        // Update stats for regular circles
        const regularCircles = activationResults.filter(result => !result.isDecoy)
        onUpdateStats(prev => ({
            ...prev,
            totalCircles: prev.totalCircles + regularCircles.length
        }))

        // Set timeouts for auto-deactivation
        selectedIds.forEach(circleId => {
            const circleResult = activationResults.find(result => result.id === circleId)
            const activeTime = getAdjustedCircleActiveTime(
                config.circleActiveTime,
                adaptiveState,
                precisionState,
                config
            )

            const timeout = setTimeout(() => {
                if (!circleResult?.isDecoy) {
                    if (isPrecisionMode) {
                        onEndGame('miss')
                        return
                    }
                }
                onCircleTimeout(circleId, circleResult?.isDecoy || false)
            }, activeTime)

            circleTimeoutsRef.current.set(circleId, timeout)
        })

        // Schedule next activation
        activationTimeoutRef.current = setTimeout(
            () => activateRandomCircles(),
            getRandomActivationDelay(config, adaptiveState, precisionState)
        )

        return { selectedIds, activationResults }
    }, [config, adaptiveState, precisionState, isPrecisionMode, onCircleTimeout, onUpdateStats, onEndGame])

    return {
        clearAllTimeouts,
        deactivateCircle,
        activateRandomCircles,
        circleActivationTimesRef,
        activeCirclesRef
    }
}