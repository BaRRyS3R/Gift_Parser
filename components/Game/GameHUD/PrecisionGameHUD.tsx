// src/components/Game/GameHUD/PrecisionGameHUD.tsx

'use client'

import { formatPrecisionTime, getPrecisionModeIntensity } from '@/utils/gameUtils'
import { PrecisionModeState } from '@/types/game'

interface PrecisionGameHUDProps {
    score: number
    perfectStreak: number
    precisionState: PrecisionModeState
    onBackToMenu: () => void
}

export default function PrecisionGameHUD({
    score,
    perfectStreak,
    precisionState,
    onBackToMenu
}: PrecisionGameHUDProps) {
    const intensity = getPrecisionModeIntensity(precisionState.intensityLevel)

    return (
        <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
            <div className="flex flex-col items-center">
                <div className="text-2xl font-bpdots text-red-400 font-bold">
                    Score: {score}
                </div>
                <div className="text-xs font-bpdots text-red-300">
                    Streak: {perfectStreak || 0}
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="text-xl font-bpdots text-white font-bold">
                    {formatPrecisionTime(precisionState.survivalTime)}
                </div>
                <div className="text-sm font-bpdots text-red-400">
                    Level {precisionState.intensityLevel}
                </div>
                <div className="text-xs font-bpdots text-red-300">
                    {intensity.description}
                </div>
            </div>

            <button
                onClick={onBackToMenu}
                className="text-red-400/80 font-bpdots text-lg hover:text-red-400 transition-colors duration-300"
            >
                • QUIT
            </button>
        </div>
    )
}