// src/components/Game/GameControls/useGameControls.ts

'use client'

import { useCallback } from 'react'
import { Circle, GameState } from '@/types/game'

interface UseGameControlsProps {
    circles: Circle[]
    gameState: GameState
    circleActivationTimes: React.MutableRefObject<Map<number, number>>
    onCorrectHit: (reactionTime: number) => void
    onDecoyHit: () => void
    onWrongClick: () => void
    onDeactivateCircle: (circleId: number) => void
    onSetCircles: (callback: (prev: Circle[]) => Circle[]) => void
    triggerHapticFeedback: (type: 'success' | 'error' | 'impact') => void
}

export default function useGameControls({
    circles,
    gameState,
    circleActivationTimes,
    onCorrectHit,
    onDecoyHit,
    onWrongClick,
    onDeactivateCircle,
    onSetCircles,
    triggerHapticFeedback
}: UseGameControlsProps) {
    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING) return

        const circle = circles.find(c => c.id === circleId)
        if (!circle) return

        const clickTime = Date.now()
        const activationTime = circleActivationTimes.current.get(circleId)

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                console.log('Decoy hit on circle:', circleId)
                triggerHapticFeedback('error')
                onDecoyHit()
            } else {
                console.log('Correct hit on circle:', circleId)
                triggerHapticFeedback('success')

                let reactionTime = 0
                if (activationTime) {
                    reactionTime = clickTime - activationTime
                }

                onCorrectHit(reactionTime)
            }

            // Start deactivation animation
            onSetCircles(prev => prev.map(c =>
                c.id === circleId ? { ...c, isAnimating: true } : c
            ))

            // Deactivate after animation
            setTimeout(() => {
                onDeactivateCircle(circleId)
            }, 300)

        } else if (!circle.isActive && !circle.isAnimating) {
            console.log('Wrong click on circle:', circleId)
            triggerHapticFeedback('error')
            onWrongClick()
        }
    }, [
        gameState,
        circles,
        circleActivationTimes,
        onCorrectHit,
        onDecoyHit,
        onWrongClick,
        onDeactivateCircle,
        onSetCircles,
        triggerHapticFeedback
    ])

    return {
        handleCircleClick
    }
}
