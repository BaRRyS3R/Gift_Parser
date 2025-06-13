// src/components/Game/GameContainer/GameContainer.tsx - ИСПРАВЛЕН

'use client'

import { Circle, GameState } from '@/types/game'
import { GameGrid } from '@/components' // ИСПРАВЛЕНО: было '@/componenents'

interface GameContainerProps {
    circles: Circle[]
    gameState: GameState
    showCircles: boolean
    onCircleClick: (circleId: number) => void
    children: React.ReactNode
}

export default function GameContainer({
    circles,
    gameState,
    showCircles,
    onCircleClick,
    children
}: GameContainerProps) {
    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {children}

            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={circles}
                    onCircleClick={onCircleClick}
                    isGameActive={gameState === GameState.PLAYING}
                    showCircles={showCircles}
                />
            </div>
        </div>
    )
}