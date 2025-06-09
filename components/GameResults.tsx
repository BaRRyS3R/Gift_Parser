// src/components/GameResults.tsx

'use client'

import { GameResult, GameDifficulty } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy } from '../utils/gameUtils'

interface GameResultsProps {
    result: GameResult
    onPlayAgain: () => void
    onBackToMenu: () => void
}

export default function GameResults({ result, onPlayAgain, onBackToMenu }: GameResultsProps) {
    const config = GAME_CONFIGS[result.difficulty]
    const totalClicks = result.correctHits + result.wrongHits
    const accuracy = calculateAccuracy(result.correctHits, totalClicks)

    const getScoreColor = () => {
        if (result.score >= 20) return 'text-green-400'
        if (result.score >= 10) return 'text-yellow-400'
        if (result.score >= 0) return 'text-white'
        return 'text-red-400'
    }

    const getAccuracyColor = () => {
        if (accuracy >= 90) return 'text-green-400'
        if (accuracy >= 70) return 'text-yellow-400'
        if (accuracy >= 50) return 'text-white'
        return 'text-red-400'
    }

    const getRating = () => {
        const avgScore = (result.score / 30) * 10 // Нормализуем для 30 секунд
        if (avgScore >= 8 && accuracy >= 90) return { text: 'Amazing', color: 'text-green-400' }
        if (avgScore >= 6 && accuracy >= 80) return { text: 'Perfect', color: 'text-yellow-400' }
        if (avgScore >= 4 && accuracy >= 70) return { text: 'Good', color: 'text-blue-400' }
        if (avgScore >= 2 && accuracy >= 50) return { text: 'N0T BAD', color: 'text-white' }
        return { text: 'How about a little practice?', color: 'text-red-400' }
    }

    const rating = getRating()

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                {/* Заголовок */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold font-bpdots text-white">
                        RESULT
                    </h1>
                    <p className="text-lg font-bpdots text-gray-400">
                        Mode: {config.name}
                    </p>
                </div>

                {/* Основная статистика */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-6">
                    {/* Итоговая оценка */}
                    <div className="text-center">
                        <div className={`text-2xl font-bold font-bpdots ${rating.color}`}>
                            {rating.text}
                        </div>
                    </div>

                    {/* Очки */}
                    <div className="text-center space-y-1">
                        <div className="text-sm font-bpdots text-gray-400">SCORE</div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                    </div>

                    {/* Детальная статистика */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">CORRECT</div>
                            <div className="text-xl font-bold font-bpdots text-green-400">
                                {result.correctHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">WRONG</div>
                            <div className="text-xl font-bold font-bpdots text-red-400">
                                {result.wrongHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">MISSED</div>
                            <div className="text-xl font-bold font-bpdots text-orange-400">
                                {result.missedCircles}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">ACCURACY</div>
                            <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                {accuracy}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Кнопки действий */}
                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        AGAIN?
                    </button>

                    <button
                        onClick={onBackToMenu}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        BACK 2 MENU
                    </button>
                </div>
            </div>
        </div>
    )
}