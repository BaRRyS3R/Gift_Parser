// src/components/Game/GameHUD/StandardGameHUD.tsx - ИСПРАВЛЕН

'use client'

import { GameTimer } from '@/components'
import { AdaptiveState } from '@/types/game'
import { getAdaptiveLevelDescription } from '@/utils/gameUtils'

interface StandardGameHUDProps {
    score: number
    consecutiveHits: number
    timeLeft: number
    totalTime: number
    isGameActive: boolean
    adaptiveState: AdaptiveState
    config: any
    onBackToMenu: () => void
}

export default function StandardGameHUD({
    score,
    consecutiveHits,
    timeLeft,
    totalTime,
    isGameActive,
    adaptiveState,
    config,
    onBackToMenu
}: StandardGameHUDProps) {
    return (
        <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
            <div className="flex flex-col items-center">
                <div className={`text-2xl font-bpdots transition-colors duration-300 ${score >= 0 ? 'text-white' : 'text-red-400'
                    }`}>
                    Score: {score >= 0 ? '+' : ''}{score}
                </div>
                {consecutiveHits > 0 && (
                    <div className="text-xs font-bpdots text-green-400">
                        {consecutiveHits} streak
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center">
                <GameTimer
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                    isActive={isGameActive}
                />
                {config.adaptiveScaling && (
                    <div className="text-xs font-bpdots text-yellow-400 mt-1">
                        {getAdaptiveLevelDescription(adaptiveState.level)}
                    </div>
                )}
            </div>

            <button
                onClick={onBackToMenu}
                className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
            >
                • END
            </button>
        </div>
    )
}