// src/components/GameTimer.tsx

'use client'

import { formatTime } from '../utils/gameUtils'

interface GameTimerProps {
    timeLeft: number
    totalTime: number
    isActive: boolean
}

export default function GameTimer({ timeLeft, totalTime, isActive }: GameTimerProps) {
    const progress = ((totalTime - timeLeft) / totalTime) * 100
    const isLowTime = timeLeft <= 10

    return (
        <div className="flex flex-col items-center space-y-2">
            <div className={`
                text-3xl font-bold font-bpdots transition-colors duration-300
                ${isLowTime ? 'text-red-400' : 'text-white'}
                ${isLowTime && isActive ? 'animate-pulse' : ''}
            `}>
                {formatTime(timeLeft)}
            </div>

            {/* Прогресс-бар времени */}
            <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                    className={`
                        h-full transition-all duration-1000 ease-linear
                        ${isLowTime ? 'bg-red-400' : 'bg-white'}
                    `}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}