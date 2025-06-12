// src/components/GameResults.tsx - Enhanced with Precision Mode Support

'use client'

import { GameResult, GameDifficulty } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription, formatPrecisionTime } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'
import { Clock, Target, Zap, AlertTriangle, Trophy, Skull, Activity } from 'lucide-react'

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
            case 'miss': return 'Target escaped your grasp'
            case 'wrong_click': return 'Clicked an inactive target'
            case 'decoy_hit': return 'Fell for the decoy trap'
            case 'timeout': return 'Time ran out'
            default: return 'Unknown cause of failure'
        }
    }

    const getPrecisionComment = () => {
        const survivalTime = result.survivalTime || 0
        const intensityReached = result.maxIntensityReached || 1
        const streak = result.perfectStreak || 0

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
        const hasSlowReaction = result.averageReactionTime >= 400
        const hasTerribleAccuracy = accuracy < 40
        const hasManyDecoys = result.decoyHits >= 5
        const hasManyMisses = result.missedCircles >= 10

        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) {
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

        if (scorePerSecond >= 1.2 && hasGoodAccuracy) {
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

        if (scorePerSecond >= 0.8 && accuracy >= 75) {
            const good = [
                "Pretty solid! You're getting the hang of it! 👍",
                "Nice work! Your brain cells are functioning! 🧠",
                "Respectable performance, human! 🎯",
                "You're like a decent Wi-Fi connection - reliable! 📡",
                "Not terrible! Progress is progress! 📈",
                "Your reflexes are officially above potato level! 🥔➡️🚀"
            ]
            return good[Math.floor(Math.random() * good.length)]
        }

        if (scorePerSecond >= 0.5 && accuracy >= 60) {
            const average = [
                "Meh... it's something, I guess? 🤷‍♂️",
                "You're perfectly average! Congratulations? 📊",
                "Your performance is as exciting as watching paint dry 🎨",
                "Well, at least you tried... sort of 💪",
                "You're the human equivalent of room temperature 🌡️",
                "Achievement unlocked: 'Participated' 🏅",
                "Your reflexes are... existing. That's good! ✅"
            ]
            return average[Math.floor(Math.random() * average.length)]
        }

        if (hasManyDecoys) {
            const decoyComments = [
                "Stop clicking the red ones! They're not your friends! ❌",
                "Red = bad. It's not rocket science! 🚫",
                "Are you colorblind or just rebellious? 🌈",
                "The red circles are laughing at you! 😂",
                "Decoy circles: 1, You: 0 🎭",
                "Maybe try glasses? The red ones are obvious! 👓"
            ]
            return decoyComments[Math.floor(Math.random() * decoyComments.length)]
        }

        if (hasTerribleAccuracy) {
            const accuracyComments = [
                "Are you playing blindfolded? 😵",
                "Your accuracy is lower than my expectations! 📉",
                "Did you forget how clicking works? 🖱️❓",
                "Maybe try aiming... just a suggestion! 🎯",
                "Your accuracy makes stormtroopers look skilled! 🎭",
                "Are you clicking with your elbows? 💪❓",
                "I've seen better aim from a drunk penguin! 🐧🍺"
            ]
            return accuracyComments[Math.floor(Math.random() * accuracyComments.length)]
        }

        if (hasSlowReaction) {
            const slowComments = [
                "Are you reacting or just thinking really hard? 🤔💭",
                "Your reaction time suggests you're part sloth! 🦥",
                "Did you pause for a coffee break between clicks? ☕",
                "Faster reactions have been observed in glaciers! 🧊",
                "Are you using Internet Explorer to click? 🌐💤",
                "Your reflexes are sponsored by 'Loading...' ⏳",
                "I've seen paint dry faster than your reactions! 🎨"
            ]
            return slowComments[Math.floor(Math.random() * slowComments.length)]
        }

        if (hasManyMisses) {
            const missComments = [
                "The circles were right there! RIGHT THERE! 👆",
                "You missed more circles than a drunk dart player! 🎯🍺",
                "Were you playing peek-a-boo with the targets? 👻",
                "The circles are filing a missing persons report! 📋",
                "You let more circles escape than a broken zoo! 🦁💨",
                "Missing circles is not the objective! Just saying... 🤦‍♂️"
            ]
            return missComments[Math.floor(Math.random() * missComments.length)]
        }

        if (scorePerSecond >= 0.2) {
            const poor = [
                "Well... that happened. Moving on! 🚶‍♂️",
                "Your performance is questionable at best! 🤨",
                "Are you sure you're awake? 😴",
                "Maybe stick to slower games... like chess? ♟️",
                "Your reflexes need a vacation... or training! 🏋️‍♂️",
                "Did you forget you were playing a game? 🎮❓",
                "Your mouse is probably confused! 🖱️😵",
                "Practice makes perfect... you need a LOT of practice! 📚"
            ]
            return poor[Math.floor(Math.random() * poor.length)]
        }

        const terrible = [
            "Oof... just... oof. 😬",
            "Did you even try? Like, at all? 🤷‍♂️",
            "Your performance is so bad, it's almost artistic! 🎨💔",
            "I'm not angry, just... disappointed. 😞",
            "Maybe gaming isn't your calling? 🎮❌",
            "Your reflexes are in witness protection! 🕵️‍♂️",
            "Even my grandmother would do better! (She's 90) 👵",
            "Are you playing with your feet? 🦶",
            "This is painful to watch... for me! 😵",
            "Have you considered a career in... literally anything else? 💼",
            "Your performance broke my scoring system! 💻💥",
            "I've seen better coordination from a headless chicken! 🐔",
            "This is why aliens don't visit us... 👽🛸"
        ]
        return terrible[Math.floor(Math.random() * terrible.length)]
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
            return 'text-red-400'
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

    const rating = getRating()
    const sarcasticComment = isPrecisionMode ? getPrecisionComment() : getStandardComment()
    const performanceEmoji = getPerformanceEmoji()

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">{performanceEmoji}</div>
                    <h1 className={`text-4xl font-bold font-bpdots ${isPrecisionMode ? 'text-red-400' : 'text-white'}`}>
                        {isPrecisionMode ? 'PRECISION FAILED' : 'GAME OVER'}
                    </h1>
                    <p className="text-lg font-bpdots text-gray-400">
                        {config.name} {isPrecisionMode ? 'Mode' : 'Difficulty Mode'}
                    </p>
                    {isPrecisionMode && result.deathCause && (
                        <div className="flex items-center justify-center space-x-2 bg-red-500/20 border border-red-400/30 rounded-lg p-2">
                            {getDeathCauseIcon(result.deathCause)}
                            <span className="text-red-300 font-bpdots text-sm">
                                {getDeathCauseMessage(result.deathCause)}
                            </span>
                        </div>
                    )}
                    {!isPrecisionMode && result.adaptiveLevel > 0 && (
                        <p className="text-sm font-bpdots text-yellow-400">
                            Adaptive Level: {getAdaptiveLevelDescription(result.adaptiveLevel)}
                        </p>
                    )}
                </div>

                {/* Comment Section */}
                <div className={`backdrop-blur-sm border rounded-xl p-4 ${isPrecisionMode
                        ? 'bg-red-500/10 border-red-400/30'
                        : 'bg-white/5 border-white/20'
                    }`}>
                    <div className="text-center">
                        <div className={`text-xl font-bold font-bpdots ${rating.color} mb-2`}>
                            {rating.text}
                        </div>
                        <div className="text-white/80 font-bpdots text-sm italic">
                            &ldquo;{sarcasticComment}&rdquo;
                        </div>
                    </div>
                </div>

                {/* Save Status */}
                {(isSaving || saveError || saveSuccess) && (
                    <div className={`backdrop-blur-sm border rounded-xl p-4 ${isPrecisionMode
                            ? 'bg-red-500/10 border-red-400/30'
                            : 'bg-white/5 border-white/20'
                        }`}>
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color={isPrecisionMode ? "danger" : "white"} />
                                <span className="text-white font-bpdots text-sm">
                                    {isPrecisionMode
                                        ? "Recording your precision failure..."
                                        : "Uploading your shame to the database..."
                                    }
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className="text-green-400 font-bpdots text-sm mb-2">
                                    ✓ Results successfully saved {isPrecisionMode ? "(ouch)" : "(unfortunately)"}
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Your performance is now permanently recorded
                                </div>
                            </div>
                        )}

                        {saveError && !isSaving && (
                            <div className="text-center">
                                <div className="text-red-400 font-bpdots text-sm mb-2">
                                    ✗ Database refused to save these results
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Even the database has standards
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Section */}
                <div className={`backdrop-blur-sm border rounded-xl p-6 space-y-6 ${isPrecisionMode
                        ? 'bg-red-500/10 border-red-400/30'
                        : 'bg-white/5 border-white/20'
                    }`}>
                    <div className="text-center space-y-1">
                        <div className="text-sm font-bpdots text-gray-400">FINAL SCORE</div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                    </div>

                    {isPrecisionMode ? (
                        /* Precision Mode Stats */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">SURVIVAL TIME</div>
                                    <div className="text-xl font-bold font-bpdots text-red-400">
                                        {formatPrecisionTime(result.survivalTime || 0)}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">MAX INTENSITY</div>
                                    <div className="text-xl font-bold font-bpdots text-orange-400">
                                        Level {result.maxIntensityReached || 1}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">PERFECT STREAK</div>
                                    <div className="text-xl font-bold font-bpdots text-green-400">
                                        {result.perfectStreak || 0}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">SUCCESSFUL</div>
                                    <div className="text-xl font-bold font-bpdots text-green-400">
                                        {result.correctHits}
                                    </div>
                                </div>
                            </div>

                            {result.averageReactionTime > 0 && (
                                <div className="border-t border-red-400/20 pt-4">
                                    <div className="text-center space-y-1">
                                        <div className="text-xs font-bpdots text-gray-400">REACTION TIME</div>
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
                                    <div className="text-xs font-bpdots text-gray-400">SUCCESSFUL</div>
                                    <div className="text-xl font-bold font-bpdots text-green-400">
                                        {result.correctHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">FAILED</div>
                                    <div className="text-xl font-bold font-bpdots text-red-400">
                                        {result.wrongHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-xs font-bpdots text-gray-400">IGNORED</div>
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

                            {(result.decoyHits > 0 || result.fastHits > 0 || result.averageReactionTime > 0) && (
                                <div className="border-t border-white/10 pt-4">
                                    <div className="text-center mb-3">
                                        <div className="text-sm font-bpdots text-gray-400">DETAILED ANALYSIS</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {result.decoyHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className="text-xs font-bpdots text-gray-400">FELL FOR DECOYS</div>
                                                <div className="text-lg font-bold font-bpdots text-red-400">
                                                    {result.decoyHits}
                                                </div>
                                            </div>
                                        )}

                                        {result.fastHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className="text-xs font-bpdots text-gray-400">SPEED BONUS</div>
                                                <div className="text-lg font-bold font-bpdots text-yellow-400">
                                                    {result.fastHits}
                                                </div>
                                            </div>
                                        )}

                                        {result.averageReactionTime > 0 && (
                                            <div className="text-center space-y-1 col-span-2">
                                                <div className="text-xs font-bpdots text-gray-400">REACTION TIME</div>
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
                        className={`w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isPrecisionMode
                                ? 'border-red-400 text-red-300 hover:bg-red-500/10'
                                : 'border-white text-white hover:bg-white/10'
                            }`}
                    >
                        {isPrecisionMode ? 'ATTEMPT PRECISION AGAIN' : 'TRY TO REDEEM YOURSELF'}
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className={`w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isPrecisionMode
                                ? 'border-red-400/60 text-red-300/80 hover:bg-red-500/5 hover:border-red-400 hover:text-red-300'
                                : 'border-white/60 text-white/80 hover:bg-white/5 hover:border-white hover:text-white'
                            }`}
                    >
                        {isPrecisionMode ? 'ESCAPE TO MENU' : 'RETREAT TO MENU'}
                    </button>
                </div>
            </div>
        </div>
    )
}