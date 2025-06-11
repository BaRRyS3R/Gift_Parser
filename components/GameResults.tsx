// src/components/GameResults.tsx

'use client'

import { GameResult, GameDifficulty } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'

interface GameResultsProps {
    result: GameResult
    onPlayAgain: () => void
    onBackToMenu: () => void
    isSaving?: boolean
    saveError?: string | null
    saveSuccess?: boolean
}

export default function GameResults({
    result,
    onPlayAgain,
    onBackToMenu,
    isSaving = false,
    saveError = null,
    saveSuccess = false
}: GameResultsProps) {
    const config = GAME_CONFIGS[result.difficulty]
    const totalClicks = result.correctHits + result.wrongHits + result.decoyHits
    const accuracy = calculateAccuracy(result.correctHits, totalClicks)

    const getScoreColor = () => {
        if (result.score >= 30) return 'text-green-400'
        if (result.score >= 20) return 'text-yellow-400'
        if (result.score >= 10) return 'text-blue-400'
        if (result.score >= 0) return 'text-white'
        return 'text-red-400'
    }

    const getAccuracyColor = () => {
        if (accuracy >= 95) return 'text-green-400'
        if (accuracy >= 90) return 'text-yellow-400'
        if (accuracy >= 80) return 'text-blue-400'
        if (accuracy >= 70) return 'text-white'
        return 'text-red-400'
    }

    const getRating = () => {
        const scorePerSecond = result.score / 30
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) {
            return { text: 'LEGENDARY PERFORMANCE', color: 'text-yellow-400' }
        }
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) {
            return { text: 'EXCEPTIONAL SKILL', color: 'text-green-400' }
        }
        if (scorePerSecond >= 0.8 && accuracy >= 75) {
            return { text: 'STRONG EXECUTION', color: 'text-blue-400' }
        }
        if (scorePerSecond >= 0.5 && accuracy >= 60) {
            return { text: 'SOLID PERFORMANCE', color: 'text-white' }
        }
        if (scorePerSecond >= 0.2) {
            return { text: 'DEVELOPING SKILLS', color: 'text-orange-400' }
        }
        return { text: 'PRACTICE RECOMMENDED', color: 'text-red-400' }
    }

    const getReactionTimeColor = () => {
        if (result.averageReactionTime <= 150) return 'text-green-400'
        if (result.averageReactionTime <= 200) return 'text-yellow-400'
        if (result.averageReactionTime <= 300) return 'text-white'
        return 'text-red-400'
    }

    const rating = getRating()

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold font-bpdots text-white">
                        PERFORMANCE ANALYSIS
                    </h1>
                    <p className="text-lg font-bpdots text-gray-400">
                        {config.name} Difficulty Mode
                    </p>
                    {result.adaptiveLevel > 0 && (
                        <p className="text-sm font-bpdots text-yellow-400">
                            Adaptive Level: {getAdaptiveLevelDescription(result.adaptiveLevel)}
                        </p>
                    )}
                </div>

                {(isSaving || saveError || saveSuccess) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color="white" />
                                <span className="text-white font-bpdots text-sm">
                                    Processing result submission to database system
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className="text-green-400 font-bpdots text-sm mb-2">
                                    ✓ Performance data successfully recorded in database
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Statistical metrics have been updated accordingly
                                </div>
                            </div>
                        )}

                        {saveError && !isSaving && (
                            <div className="text-center">
                                <div className="text-red-400 font-bpdots text-sm mb-2">
                                    ✗ {saveError}
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Session data was not persisted to database
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-6">
                    <div className="text-center">
                        <div className={`text-2xl font-bold font-bpdots ${rating.color}`}>
                            {rating.text}
                        </div>
                    </div>

                    <div className="text-center space-y-1">
                        <div className="text-sm font-bpdots text-gray-400">FINAL SCORE</div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">SUCCESSFUL</div>
                            <div className="text-xl font-bold font-bpdots text-green-400">
                                {result.correctHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">INCORRECT</div>
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
                            <div className="text-xs font-bpdots text-gray-400">PRECISION</div>
                            <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                {accuracy}%
                            </div>
                        </div>
                    </div>

                    {(result.decoyHits > 0 || result.fastHits > 0 || result.averageReactionTime > 0) && (
                        <div className="border-t border-white/10 pt-4">
                            <div className="text-center mb-3">
                                <div className="text-sm font-bpdots text-gray-400">ADVANCED METRICS</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {result.decoyHits > 0 && (
                                    <div className="text-center space-y-1">
                                        <div className="text-xs font-bpdots text-gray-400">DECOY HITS</div>
                                        <div className="text-lg font-bold font-bpdots text-red-400">
                                            {result.decoyHits}
                                        </div>
                                    </div>
                                )}

                                {result.fastHits > 0 && (
                                    <div className="text-center space-y-1">
                                        <div className="text-xs font-bpdots text-gray-400">FAST BONUS</div>
                                        <div className="text-lg font-bold font-bpdots text-yellow-400">
                                            {result.fastHits}
                                        </div>
                                    </div>
                                )}

                                {result.averageReactionTime > 0 && (
                                    <div className="text-center space-y-1 col-span-2">
                                        <div className="text-xs font-bpdots text-gray-400">AVG RESPONSE TIME</div>
                                        <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                            {result.averageReactionTime}ms
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        RETRY SESSION
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        RETURN TO MENU
                    </button>
                </div>
            </div>
        </div>
    )
}