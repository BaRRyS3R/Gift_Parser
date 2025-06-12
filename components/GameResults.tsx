// src/components/GameResults.tsx

'use client'

import { GameResult, GameDifficulty, GameMode, SkillLevel } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'
import {
    Trophy,
    Target,
    Zap,
    Clock,
    TrendingUp,
    Star,
    Award,
    RotateCcw,
    Crosshair,
    AlertTriangle,
    Sparkles,
    CheckCircle,
    XCircle,
    Circle,
    TimerIcon,
    Gauge,
    Brain,
    Activity,
    FlameIcon
} from 'lucide-react'

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

    const getGameModeIcon = () => {
        switch (result.gameMode) {
            case GameMode.REVERSE: return RotateCcw
            case GameMode.PRECISION: return Crosshair
            case GameMode.REVERSE_PRECISION: return AlertTriangle
            default: return Target
        }
    }

    const getGameModeColor = () => {
        switch (result.gameMode) {
            case GameMode.REVERSE: return 'text-purple-400'
            case GameMode.PRECISION: return 'text-red-400'
            case GameMode.REVERSE_PRECISION: return 'text-orange-400'
            default: return 'text-white'
        }
    }

    const getGameModeDescription = () => {
        switch (result.gameMode) {
            case GameMode.REVERSE: return 'Reverse Scoring Mode'
            case GameMode.PRECISION: return 'Precision Challenge Mode'
            case GameMode.REVERSE_PRECISION: return 'Ultimate Challenge Mode'
            default: return 'Standard Mode'
        }
    }

    const getSkillLevelIcon = (level: SkillLevel) => {
        switch (level) {
            case SkillLevel.LEGENDARY: return Trophy
            case SkillLevel.MASTER: return Award
            case SkillLevel.EXPERT: return Star
            case SkillLevel.ADVANCED: return TrendingUp
            case SkillLevel.INTERMEDIATE: return Target
            case SkillLevel.NOVICE: return Activity
            default: return Circle
        }
    }

    const getSkillLevelColor = (level: SkillLevel) => {
        switch (level) {
            case SkillLevel.LEGENDARY: return 'text-yellow-400'
            case SkillLevel.MASTER: return 'text-purple-400'
            case SkillLevel.EXPERT: return 'text-blue-400'
            case SkillLevel.ADVANCED: return 'text-green-400'
            case SkillLevel.INTERMEDIATE: return 'text-white'
            case SkillLevel.NOVICE: return 'text-gray-400'
            default: return 'text-gray-500'
        }
    }

    const getPerformanceComment = () => {
        const { gameMode, efficiencyRating, skillLevel, survivalTime } = result

        // Специальные комментарии для Precision Mode
        if (gameMode === GameMode.PRECISION) {
            if (result.precisionMisses > 0) {
                const failureComments = [
                    `Survived ${survivalTime.toFixed(1)} seconds before the inevitable failure! 💥`,
                    `Precision lasted ${survivalTime.toFixed(1)}s... then reality hit! 🎯`,
                    `${survivalTime.toFixed(1)} seconds of perfection, then chaos! ⚡`,
                    `Your precision streak ended at ${survivalTime.toFixed(1)}s. Almost had it! 🔥`,
                    `Made it ${survivalTime.toFixed(1)} seconds in the danger zone! 💀`
                ]
                return failureComments[Math.floor(Math.random() * failureComments.length)]
            } else {
                const successComments = [
                    "Flawless precision execution! You're a legend! 🏆",
                    "Perfect run in Precision Mode! Absolutely incredible! ✨",
                    "Zero mistakes, pure excellence! 🎯",
                    "Precision mastery achieved! Legendary performance! 👑"
                ]
                return successComments[Math.floor(Math.random() * successComments.length)]
            }
        }

        // Специальные комментарии для Reverse Mode
        if (gameMode === GameMode.REVERSE) {
            if (result.score > 20) {
                const highScoreComments = [
                    "Reverse psychology mastered! Your brain is built different! 🧠",
                    "Embrace the chaos! Outstanding reverse performance! 🔄",
                    "You've turned failure into success! Brilliant! ⚡",
                    "Reverse mode specialist! The confusion is real! 🌀"
                ]
                return highScoreComments[Math.floor(Math.random() * highScoreComments.length)]
            } else {
                const lowScoreComments = [
                    "Reverse mode got you twisted! That's normal! 🔄",
                    "Your brain is still adjusting to the backwards world! 🧠",
                    "Reverse thinking takes practice! Keep trying! 💪",
                    "The reverse mindset is challenging everyone! 🌀"
                ]
                return lowScoreComments[Math.floor(Math.random() * lowScoreComments.length)]
            }
        }

        // Комментарии по эффективности для обычного режима
        if (efficiencyRating >= 90) {
            return "Godlike efficiency! Are you even human? 🤖"
        } else if (efficiencyRating >= 80) {
            return "Exceptional performance! You're in the top tier! 🏆"
        } else if (efficiencyRating >= 70) {
            return "Solid execution! You're getting really good! 🎯"
        } else if (efficiencyRating >= 60) {
            return "Decent performance! Keep up the practice! 💪"
        } else if (efficiencyRating >= 50) {
            return "Room for improvement, but you're getting there! 📈"
        } else {
            return "Everyone starts somewhere! Keep practicing! 🌱"
        }
    }

    const getPerformanceEmoji = () => {
        const { gameMode, efficiencyRating, precisionMisses } = result

        if (gameMode === GameMode.PRECISION && precisionMisses > 0) return "💥"
        if (gameMode === GameMode.PRECISION && precisionMisses === 0) return "🏆"
        if (gameMode === GameMode.REVERSE && result.score > 20) return "🧠"
        if (gameMode === GameMode.REVERSE) return "🔄"

        if (efficiencyRating >= 90) return "🤖"
        if (efficiencyRating >= 80) return "🏆"
        if (efficiencyRating >= 70) return "🎯"
        if (efficiencyRating >= 60) return "💪"
        if (efficiencyRating >= 50) return "📈"
        return "🌱"
    }

    const getScoreColor = () => {
        if (result.gameMode === GameMode.REVERSE) {
            // В reverse mode больше очков = лучше
            if (result.score >= 30) return 'text-purple-400'
            if (result.score >= 20) return 'text-purple-300'
            if (result.score >= 10) return 'text-white'
            return 'text-gray-400'
        } else {
            // В обычном режиме
            if (result.score >= 30) return 'text-green-400'
            if (result.score >= 20) return 'text-yellow-400'
            if (result.score >= 10) return 'text-blue-400'
            if (result.score >= 0) return 'text-white'
            return 'text-red-400'
        }
    }

    const getAccuracyColor = () => {
        if (result.gameMode === GameMode.REVERSE) {
            // В reverse mode низкая точность = хорошо
            if (accuracy <= 30) return 'text-purple-400'
            if (accuracy <= 50) return 'text-purple-300'
            if (accuracy <= 70) return 'text-white'
            return 'text-gray-400'
        } else {
            // В обычном режиме
            if (accuracy >= 95) return 'text-green-400'
            if (accuracy >= 90) return 'text-yellow-400'
            if (accuracy >= 80) return 'text-blue-400'
            if (accuracy >= 70) return 'text-white'
            return 'text-red-400'
        }
    }

    const getReactionTimeColor = () => {
        if (result.averageReactionTime <= 150) return 'text-green-400'
        if (result.averageReactionTime <= 200) return 'text-yellow-400'
        if (result.averageReactionTime <= 300) return 'text-white'
        return 'text-red-400'
    }

    const performanceComment = getPerformanceComment()
    const performanceEmoji = getPerformanceEmoji()
    const GameModeIcon = getGameModeIcon()
    const SkillIcon = getSkillLevelIcon(result.skillLevel)

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6 animate-fade-in">

                {/* Header Section */}
                <div className="text-center space-y-3">
                    <div className="text-6xl mb-4">{performanceEmoji}</div>
                    <h1 className="text-4xl font-bold font-bpdots text-white">
                        {result.gameMode === GameMode.PRECISION && result.precisionMisses > 0 ? 'PRECISION FAILED' : 'GAME OVER'}
                    </h1>

                    {/* Game Mode Indicator */}
                    <div className={`flex items-center justify-center space-x-2 ${getGameModeColor()}`}>
                        <GameModeIcon size={16} />
                        <span className="text-sm font-bpdots uppercase tracking-wider">
                            {getGameModeDescription()}
                        </span>
                    </div>

                    {/* Skill Level */}
                    <div className={`flex items-center justify-center space-x-2 ${getSkillLevelColor(result.skillLevel)}`}>
                        <SkillIcon size={16} />
                        <span className="text-sm font-bpdots uppercase tracking-wider">
                            {result.skillLevel} LEVEL
                        </span>
                    </div>
                </div>

                {/* Performance Comment */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="text-center">
                        <div className="text-white/80 font-bpdots text-sm italic">
                            "{performanceComment}"
                        </div>
                    </div>
                </div>

                {/* Save Status */}
                {(isSaving || saveError || saveSuccess) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color="white" />
                                <span className="text-white font-bpdots text-sm">
                                    Saving results...
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className="text-green-400 font-bpdots text-sm mb-2">
                                    ✓ Results saved successfully
                                </div>
                            </div>
                        )}

                        {saveError && !isSaving && (
                            <div className="text-center">
                                <div className="text-red-400 font-bpdots text-sm mb-2">
                                    ✗ Failed to save results
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Statistics */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-6">

                    {/* Score Section */}
                    <div className="text-center space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                            <Trophy size={20} className="text-white/60" />
                            <div className="text-sm font-bpdots text-gray-400">FINAL SCORE</div>
                        </div>
                        <div className={`text-4xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                        <div className="flex items-center justify-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                                <Gauge size={14} className="text-white/60" />
                                <span className="text-white/80 font-bpdots">
                                    {result.efficiencyRating}% Efficiency
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Core Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center space-y-1 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-center space-x-1">
                                <CheckCircle size={14} className="text-green-400" />
                                <div className="text-xs font-bpdots text-gray-400">SUCCESS</div>
                            </div>
                            <div className="text-xl font-bold font-bpdots text-green-400">
                                {result.correctHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-center space-x-1">
                                <XCircle size={14} className="text-red-400" />
                                <div className="text-xs font-bpdots text-gray-400">FAILED</div>
                            </div>
                            <div className="text-xl font-bold font-bpdots text-red-400">
                                {result.wrongHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-center space-x-1">
                                <Circle size={14} className="text-orange-400" />
                                <div className="text-xs font-bpdots text-gray-400">MISSED</div>
                            </div>
                            <div className="text-xl font-bold font-bpdots text-orange-400">
                                {result.missedCircles}
                            </div>
                        </div>

                        <div className="text-center space-y-1 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-center space-x-1">
                                <Target size={14} className="text-white/60" />
                                <div className="text-xs font-bpdots text-gray-400">ACCURACY</div>
                            </div>
                            <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                {accuracy}%
                            </div>
                        </div>
                    </div>

                    {/* Extended Statistics */}
                    <div className="border-t border-white/10 pt-4">
                        <div className="text-center mb-3">
                            <div className="text-sm font-bpdots text-gray-400 flex items-center justify-center space-x-2">
                                <Brain size={14} />
                                <span>PERFORMANCE ANALYSIS</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Reaction Time */}
                            {result.averageReactionTime > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <Clock size={12} />
                                        <span>REACTION</span>
                                    </div>
                                    <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                        {result.averageReactionTime}ms
                                    </div>
                                </div>
                            )}

                            {/* Longest Streak */}
                            {result.longestStreak > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <FlameIcon size={12} />
                                        <span>STREAK</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-yellow-400">
                                        {result.longestStreak}
                                    </div>
                                </div>
                            )}

                            {/* Speed Bonus */}
                            {result.fastHits > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <Zap size={12} />
                                        <span>SPEED</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-yellow-400">
                                        {result.fastHits}
                                    </div>
                                </div>
                            )}

                            {/* Perfect Runs */}
                            {result.perfectRuns > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <Sparkles size={12} />
                                        <span>PERFECT</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-green-400">
                                        {result.perfectRuns}
                                    </div>
                                </div>
                            )}

                            {/* Survival Time for Precision Mode */}
                            {result.gameMode === GameMode.PRECISION && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg col-span-2">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <TimerIcon size={12} />
                                        <span>SURVIVAL TIME</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-red-400">
                                        {result.survivalTime.toFixed(1)}s
                                    </div>
                                </div>
                            )}

                            {/* Multi-touch Events */}
                            {result.multiTouchEvents > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <Activity size={12} />
                                        <span>MULTI</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-blue-400">
                                        {result.multiTouchEvents}
                                    </div>
                                </div>
                            )}

                            {/* Decoy Hits */}
                            {result.decoyHits > 0 && (
                                <div className="text-center space-y-1 p-2 bg-white/5 rounded-lg">
                                    <div className="text-xs font-bpdots text-gray-400 flex items-center justify-center space-x-1">
                                        <AlertTriangle size={12} />
                                        <span>DECOYS</span>
                                    </div>
                                    <div className="text-lg font-bold font-bpdots text-red-400">
                                        {result.decoyHits}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Adaptive Level */}
                    {result.adaptiveLevel > 0 && (
                        <div className="border-t border-white/10 pt-4">
                            <div className="text-center">
                                <div className="text-xs font-bpdots text-gray-400 mb-2">ADAPTIVE LEVEL REACHED</div>
                                <div className="text-lg font-bold font-bpdots text-yellow-400">
                                    {getAdaptiveLevelDescription(result.adaptiveLevel)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        PLAY AGAIN
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        BACK TO MENU
                    </button>
                </div>
            </div>
        </div>
    )
}