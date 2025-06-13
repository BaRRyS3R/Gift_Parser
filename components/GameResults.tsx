// src/components/GameResults.tsx - Enhanced Precision Mode Display

'use client'

import { GameResult, GameDifficulty } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription, formatPrecisionTime } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'
import { Clock, Target, Zap, AlertTriangle, Trophy, Skull, Activity, Crown, Flame, UserCheck, Award, Crosshair } from 'lucide-react'

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
    const isPrecisionMode = config.isPrecisionMode || false

    const getDeathCauseIcon = (cause?: string) => {
        switch (cause) {
            case 'miss': return <Clock size={20} className="text-red-400" />
            case 'wrong_click': return <Target size={20} className="text-red-400" />
            case 'decoy_hit': return <AlertTriangle size={20} className="text-red-400" />
            case 'timeout': return <Zap size={20} className="text-red-400" />
            default: return <Skull size={20} className="text-red-400" />
        }
    }

    const getDeathCauseMessage = (cause?: string): string => {
        switch (cause) {
            case 'miss': return 'Failed to hit a white target'
            case 'wrong_click': return 'Clicked an inactive target'
            case 'decoy_hit': return 'Clicked a red trap'
            case 'timeout': return 'Time ran out'
            default: return 'Unknown cause of failure'
        }
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.HARD: return 'ROOKIE'
            case GameDifficulty.LEGENDARY: return 'VETERAN'
            case GameDifficulty.OMG: return 'MANIAC'
            case GameDifficulty.NIGHTMARE: return 'DEMON'
            case GameDifficulty.IMPOSSIBLE: return 'GODLIKE'
            case GameDifficulty.PRECISION: return 'PRECISION'
        }
    }

    const getDifficultyIcon = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.HARD: return UserCheck      // ROOKIE
            case GameDifficulty.LEGENDARY: return Award     // VETERAN
            case GameDifficulty.OMG: return Flame          // MANIAC
            case GameDifficulty.NIGHTMARE: return Skull    // DEMON
            case GameDifficulty.IMPOSSIBLE: return Crown   // GODLIKE
            case GameDifficulty.PRECISION: return Crosshair
            default: return Target
        }
    }

    const getDifficultyColors = (difficulty: GameDifficulty) => {
        if (isPrecisionMode) {
            return {
                primary: 'text-red-400',
                secondary: 'text-red-300',
                accent: 'text-red-200',
                background: 'bg-red-500/20',
                border: 'border-red-400/30'
            }
        }

        switch (difficulty) {
            case GameDifficulty.HARD: // ROOKIE
                return {
                    primary: 'text-green-400',
                    secondary: 'text-green-300',
                    accent: 'text-green-200',
                    background: 'bg-green-500/20',
                    border: 'border-green-400/30'
                }
            case GameDifficulty.LEGENDARY: // VETERAN
                return {
                    primary: 'text-blue-400',
                    secondary: 'text-blue-300',
                    accent: 'text-blue-200',
                    background: 'bg-blue-500/20',
                    border: 'border-blue-400/30'
                }
            case GameDifficulty.OMG: // MANIAC
                return {
                    primary: 'text-orange-400',
                    secondary: 'text-orange-300',
                    accent: 'text-orange-200',
                    background: 'bg-orange-500/20',
                    border: 'border-orange-400/30'
                }
            case GameDifficulty.NIGHTMARE: // DEMON
                return {
                    primary: 'text-purple-400',
                    secondary: 'text-purple-300',
                    accent: 'text-purple-200',
                    background: 'bg-purple-500/20',
                    border: 'border-purple-400/30'
                }
            case GameDifficulty.IMPOSSIBLE: // GODLIKE
                return {
                    primary: 'text-yellow-400',
                    secondary: 'text-yellow-300',
                    accent: 'text-yellow-200',
                    background: 'bg-yellow-500/20',
                    border: 'border-yellow-400/30'
                }
            default:
                return {
                    primary: 'text-white',
                    secondary: 'text-white/80',
                    accent: 'text-white/60',
                    background: 'bg-white/10',
                    border: 'border-white/20'
                }
        }
    }

    const colors = getDifficultyColors(result.difficulty)

    const getPrecisionComment = () => {
        const survivalTime = result.survivalTime || 0
        const intensityReached = result.maxIntensityReached || 1

        if (survivalTime >= 120000) { // 2+ minutes
            const legendary = [
                "LEGENDARY ENDURANCE! Your precision is otherworldly! 👑",
                "GODLIKE SURVIVAL! You've transcended human limits! ⚡",
                "IMPOSSIBLE ACHIEVEMENT! Are you actually a machine? 🤖",
                "UNIVERSE-BREAKING PERFORMANCE! Physics doesn't apply to you! 🌌"
            ]
            return legendary[Math.floor(Math.random() * legendary.length)]
        }

        if (survivalTime >= 60000) { // 1+ minute
            const excellent = [
                "INCREDIBLE PRECISION! Your focus is unmatched! 🎯",
                "MASTER-LEVEL PERFORMANCE! You've achieved greatness! 🥇",
                "EXCEPTIONAL SURVIVAL! Your reflexes are legendary! ⚡",
                "FLAWLESS EXECUTION! Perfection in digital form! ✨"
            ]
            return excellent[Math.floor(Math.random() * excellent.length)]
        }

        if (survivalTime >= 30000) { // 30+ seconds
            const good = [
                "SOLID PRECISION! You're getting serious! 🎯",
                "IMPRESSIVE FOCUS! Your training is paying off! 💪",
                "NOTABLE PERFORMANCE! You've got the skills! 🔥",
                "RESPECTABLE SURVIVAL! Keep pushing forward! 📈"
            ]
            return good[Math.floor(Math.random() * good.length)]
        }

        if (survivalTime >= 15000) { // 15+ seconds
            const average = [
                "DECENT ATTEMPT! Room for improvement! 📊",
                "NOT BAD! Practice makes perfect! 🎯",
                "MODERATE PRECISION! Keep working at it! 💪",
                "FAIR PERFORMANCE! You're on the right track! 🛤️"
            ]
            return average[Math.floor(Math.random() * average.length)]
        }

        // Less than 15 seconds
        const poor = [
            "QUICK DEMISE! Precision requires patience! ⏱️",
            "BRIEF ENCOUNTER! The targets won this round! 🎯",
            "RAPID FAILURE! Slow down and focus! 🐌",
            "INSTANT ELIMINATION! Practice your precision! 🎪",
            "SWIFT DEFEAT! Every master was once a beginner! 🎓",
            "HASTY EXIT! Precision mode is unforgiving! ⚡"
        ]
        return poor[Math.floor(Math.random() * poor.length)]
    }

    const getStandardComment = () => {
        const scorePerSecond = result.score / result.duration
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        const difficultyMultiplier = {
            [GameDifficulty.HARD]: 1,
            [GameDifficulty.LEGENDARY]: 1.2,
            [GameDifficulty.OMG]: 1.5,
            [GameDifficulty.NIGHTMARE]: 2,
            [GameDifficulty.IMPOSSIBLE]: 2.5,
            [GameDifficulty.PRECISION]: 1
        }[result.difficulty] || 1

        const adjustedScorePerSecond = scorePerSecond * difficultyMultiplier

        if (adjustedScorePerSecond >= 2.0 && hasGoodAccuracy && hasFastReaction) {
            const legendary = [
                "Holy moly! Are you even human? 🤖",
                "Someone's been drinking their coffee! ☕",
                "Excuse me, this is a reaction test, not a speedrun! 🏃‍♂️",
                "Did you just break the laws of physics? 🚀",
                "Your reflexes are faster than my WiFi! 📶",
                "Are you sure you're not a robot? Suspicious... 🤔",
                "NASA wants to know your location 🛰️"
            ]
            return legendary[Math.floor(Math.random() * legendary.length)]
        }

        if (adjustedScorePerSecond >= 1.5 && hasGoodAccuracy) {
            const excellent = [
                "Impressive! Your fingers have ninja training! 🥷",
                "Someone's been practicing... or using cheats? 😏",
                "Your reactions are sharper than my humor! ⚡",
                "Not bad, not bad... I'm almost impressed! 👏",
                "Did you sell your soul for these reflexes? 😈",
                "Your mouse is probably crying from overwork! 🖱️💦"
            ]
            return excellent[Math.floor(Math.random() * excellent.length)]
        }

        const poor = [
            "Well... that happened. Moving on! 🚶‍♂️",
            "Your performance is questionable at best! 🤨",
            "Are you sure you're awake? 😴",
            "Maybe stick to slower games... like chess? ♟️",
            "Your reflexes need a vacation... or training! 🏋️‍♂️"
        ]
        return poor[Math.floor(Math.random() * poor.length)]
    }

    const getPerformanceEmoji = () => {
        if (isPrecisionMode) {
            const survivalTime = result.survivalTime || 0
            if (survivalTime >= 120000) return "👑"
            if (survivalTime >= 60000) return "🥇"
            if (survivalTime >= 30000) return "🥈"
            if (survivalTime >= 15000) return "🥉"
            return "💀"
        }

        const scorePerSecond = result.score / result.duration
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) return "🏆"
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) return "🥇"
        if (scorePerSecond >= 0.8 && accuracy >= 75) return "🥈"
        if (scorePerSecond >= 0.5 && accuracy >= 60) return "🥉"
        if (scorePerSecond >= 0.2) return "💩"
        return "🗑️"
    }

    const getScoreColor = () => {
        if (isPrecisionMode) {
            return colors.primary
        }
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

    const getReactionTimeColor = () => {
        if (result.averageReactionTime <= 150) return 'text-green-400'
        if (result.averageReactionTime <= 200) return 'text-yellow-400'
        if (result.averageReactionTime <= 300) return 'text-white'
        return 'text-red-400'
    }

    const getRating = () => {
        if (isPrecisionMode) {
            const survivalTime = result.survivalTime || 0
            const intensityReached = result.maxIntensityReached || 1

            if (survivalTime >= 120000) {
                return { text: 'TRANSCENDENT PRECISION', color: 'text-purple-400' }
            }
            if (survivalTime >= 60000) {
                return { text: 'LEGENDARY ENDURANCE', color: 'text-yellow-400' }
            }
            if (survivalTime >= 30000) {
                return { text: 'EXCEPTIONAL FOCUS', color: 'text-green-400' }
            }
            if (survivalTime >= 15000) {
                return { text: 'SOLID PRECISION', color: 'text-blue-400' }
            }
            return { text: 'PRECISION TRAINING NEEDED', color: 'text-red-400' }
        }

        const scorePerSecond = result.score / result.duration
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
            return { text: 'ADEQUATE PERFORMANCE', color: 'text-white' }
        }
        if (scorePerSecond >= 0.2) {
            return { text: 'NEEDS IMPROVEMENT', color: 'text-orange-400' }
        }
        return { text: 'CRITICAL FAILURE', color: 'text-red-400' }
    }

    const getPrecisionLevelDescription = (level: number): string => {
        if (level >= 15) return "PERFECT MACHINE"
        if (level >= 12) return "GODLIKE FOCUS"
        if (level >= 10) return "INSANITY BEGINS"
        if (level >= 8) return "OVERWHELMING"
        if (level >= 6) return "TARGET FOCUS"
        if (level >= 4) return "MULTI-TASKING"
        if (level >= 3) return "AVOID THE RED"
        if (level >= 2) return "GETTING STARTED"
        return "WARMING UP"
    }

    const rating = getRating()
    const sarcasticComment = isPrecisionMode ? getPrecisionComment() : getStandardComment()
    const performanceEmoji = getPerformanceEmoji()
    const DifficultyIcon = getDifficultyIcon(result.difficulty)

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">{performanceEmoji}</div>
                    <h1 className={`text-4xl font-bold font-bpdots ${colors.primary}`}>
                        {isPrecisionMode ? 'PRECISION END' : 'GAME OVER'}
                    </h1>
                    <div className="flex items-center justify-center space-x-2">
                        <DifficultyIcon size={20} className={colors.primary} />
                        <p className={`text-lg font-bpdots ${colors.secondary}`}>
                            {getDifficultyDisplayName(result.difficulty)} {isPrecisionMode ? 'Mode' : 'Difficulty'}
                        </p>
                    </div>
                    {isPrecisionMode && result.deathCause && (
                        <div className={`flex items-center justify-center space-x-2 ${colors.background} border ${colors.border} rounded-lg p-2`}>
                            {getDeathCauseIcon(result.deathCause)}
                            <span className={`font-bpdots text-sm ${colors.secondary}`}>
                                {getDeathCauseMessage(result.deathCause)}
                            </span>
                        </div>
                    )}
                    {!isPrecisionMode && result.adaptiveLevel > 0 && (
                        <p className={`text-sm font-bpdots ${colors.secondary}`}>
                            Adaptive Level: {getAdaptiveLevelDescription(result.adaptiveLevel)}
                        </p>
                    )}
                </div>

                {/* Comment Section */}
                <div className={`backdrop-blur-sm border rounded-xl p-4 ${colors.background} ${colors.border}`}>
                    <div className="text-center">
                        <div className={`text-xl font-bold font-bpdots ${rating.color} mb-2`}>
                            {rating.text}
                        </div>
                        <div className={`font-bpdots text-sm italic ${colors.accent}`}>
                            &ldquo;{sarcasticComment}&rdquo;
                        </div>
                    </div>
                </div>

                {/* Save Status */}
                {(isSaving || saveError || saveSuccess) && (
                    <div className={`backdrop-blur-sm border rounded-xl p-4 ${colors.background} ${colors.border}`}>
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color={isPrecisionMode ? "danger" : "default"} />
                                <span className={`font-bpdots text-sm ${colors.secondary}`}>
                                    {isPrecisionMode
                                        ? "Recording your precision failure..."
                                        : "Uploading your results..."
                                    }
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className={`font-bpdots text-sm mb-2 ${colors.primary}`}>
                                    ✓ Results successfully saved!
                                </div>
                                <div className={`font-bpdots text-xs ${colors.accent}`}>
                                    Your performance is now recorded
                                </div>
                            </div>
                        )}

                        {saveError && !isSaving && (
                            <div className="text-center">
                                <div className="text-red-400 font-bpdots text-sm mb-2">
                                    ✗ Failed to save results
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Please try again
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Section */}
                <div className={`backdrop-blur-sm border rounded-xl p-6 space-y-6 ${colors.background} ${colors.border}`}>
                    <div className="text-center space-y-1">
                        <div className={`text-sm font-bpdots ${colors.accent}`}>FINAL SCORE</div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                    </div>

                    {isPrecisionMode ? (
                        /* Enhanced Precision Mode Stats */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>SURVIVAL TIME</div>
                                    <div className={`text-xl font-bold font-bpdots ${colors.primary}`}>
                                        {formatPrecisionTime(result.survivalTime || 0)}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>MAX LEVEL</div>
                                    <div className={`text-xl font-bold font-bpdots text-orange-400`}>
                                        {result.maxIntensityReached || 1}/15
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>PERFECT STREAK</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.perfectStreak || 0}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>WHITE HITS</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.correctHits}
                                    </div>
                                </div>
                            </div>

                            {/* Level Achievement Display */}
                            {result.maxIntensityReached && result.maxIntensityReached > 1 && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center space-y-2">
                                        <div className={`text-sm font-bpdots ${colors.accent}`}>HIGHEST LEVEL REACHED</div>
                                        <div className={`text-lg font-bold font-bpdots text-orange-400`}>
                                            Level {result.maxIntensityReached}: {getPrecisionLevelDescription(result.maxIntensityReached)}
                                        </div>
                                        <div className="w-full h-2 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600"
                                                style={{ width: `${Math.min(100, ((result.maxIntensityReached || 1) / 15) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result.averageReactionTime > 0 && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center space-y-1">
                                        <div className={`text-xs font-bpdots ${colors.accent}`}>REACTION TIME</div>
                                        <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                            {result.averageReactionTime}ms
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Standard Mode Stats */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>SUCCESSFUL</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.correctHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>FAILED</div>
                                    <div className={`text-xl font-bold font-bpdots text-red-400`}>
                                        {result.wrongHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>IGNORED</div>
                                    <div className={`text-xl font-bold font-bpdots text-orange-400`}>
                                        {result.missedCircles}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>ACCURACY</div>
                                    <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                        {accuracy}%
                                    </div>
                                </div>
                            </div>

                            {(result.decoyHits > 0 || result.fastHits > 0 || result.averageReactionTime > 0) && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center mb-3">
                                        <div className={`text-sm font-bpdots ${colors.accent}`}>DETAILED ANALYSIS</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {result.decoyHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>FELL FOR DECOYS</div>
                                                <div className="text-lg font-bold font-bpdots text-red-400">
                                                    {result.decoyHits}
                                                </div>
                                            </div>
                                        )}

                                        {result.fastHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>SPEED BONUS</div>
                                                <div className="text-lg font-bold font-bpdots text-yellow-400">
                                                    {result.fastHits}
                                                </div>
                                            </div>
                                        )}

                                        {result.averageReactionTime > 0 && (
                                            <div className="text-center space-y-1 col-span-2">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>REACTION TIME</div>
                                                <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                                    {result.averageReactionTime}ms
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        disabled={isSaving}
                        className={`
                            w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            ${colors.border} ${colors.secondary} hover:${colors.background}
                        `}
                    >
                        {isPrecisionMode ? 'ATTEMPT PRECISION AGAIN' : 'TRY AGAIN'}
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className={`
                            w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            border-white/60 text-white/80 hover:bg-white/5 hover:border-white hover:text-white
                        `}
                    >
                        {isPrecisionMode ? 'ESCAPE TO MENU' : 'BACK TO MENU'}
                    </button>
                </div>
            </div>
        </div>
    )
}