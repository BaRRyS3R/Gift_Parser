// src/components/GameResults.tsx

'use client'

import { GameResult, GameDifficulty, GameMode } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'
import {
    Target,
    Zap,
    Clock,
    TrendingUp,
    Award,
    Flame,
    Shield,
    Brain,
    Eye,
    RotateCcw,
    Timer,
    Crosshair,
    Activity,
    Star,
    Trophy,
    Crown,
    Medal
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
    const config = GAME_CONFIGS[result.difficulty] || GAME_CONFIGS[result.mode]
    const totalClicks = result.correctHits + result.wrongHits + result.decoyHits
    const accuracy = calculateAccuracy(result.correctHits, totalClicks)

    const getModeIcon = () => {
        switch (result.mode) {
            case GameMode.TIME_ATTACK_60:
            case GameMode.TIME_ATTACK_90:
            case GameMode.TIME_ATTACK_120:
                return Timer
            case GameMode.PRECISION:
                return Crosshair
            case GameMode.MEMORY:
                return Brain
            case GameMode.SEQUENCE:
                return Target
            case GameMode.BLIND:
                return Eye
            case GameMode.REVERSE:
                return RotateCcw
            case GameMode.EARTHQUAKE:
            case GameMode.TORNADO:
            case GameMode.CHAOS:
                return Activity
            default:
                return Target
        }
    }

    const getSarcasticComment = () => {
        const scorePerSecond = result.effectivenesss || (result.score / result.duration)
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200
        const hasSlowReaction = result.averageReactionTime >= 400
        const hasTerribleAccuracy = accuracy < 40
        const hasManyDecoys = result.decoyHits >= 5
        const hasManyMisses = result.missedCircles >= 10
        const hasGoodCombo = result.maxCombo >= 20
        const hasSpeedDemons = result.speedDemons >= 5

        // Legendary performance
        if (scorePerSecond >= 2 && hasGoodAccuracy && hasFastReaction && hasGoodCombo) {
            const legendary = [
                "🤖 ERROR: Human performance detected! Please report to authorities.",
                "☕ Someone's been mainlining espresso! Absolutely insane!",
                "🚀 Did you just break the space-time continuum with those reflexes?",
                "🦾 Cybernetic enhancement confirmed! This is not humanly possible!",
                "📶 Your reflexes are faster than my internet connection!",
                "🛰️ NASA called, they want to study your brain!",
                "👽 Alien invasion confirmed. No human should be this good!"
            ]
            return legendary[Math.floor(Math.random() * legendary.length)]
        }

        // Time Attack specific
        if (result.mode.includes('time_attack')) {
            if (scorePerSecond >= 1.5) {
                return "⏰ Time Attack mastery! You made every second count!"
            }
            if (scorePerSecond >= 1) {
                return "🏃‍♂️ Solid time management! Racing against the clock like a pro!"
            }
            return "🐌 Were you playing in slow motion? Time waits for no one!"
        }

        // Precision mode specific
        if (result.mode === GameMode.PRECISION) {
            if (accuracy === 100) {
                return "🎯 PERFECTION! Not a single mistake. Are you even human?"
            }
            return "💀 One mistake and it's over! That's what precision means!"
        }

        // Memory mode specific
        if (result.mode === GameMode.MEMORY) {
            if (result.memorySequencesCompleted && result.memorySequencesCompleted >= 5) {
                return "🧠 Your memory is sharper than an elephant's! Impressive!"
            }
            if (result.memorySequencesCompleted && result.memorySequencesCompleted >= 3) {
                return "🐘 Good memory! Almost as good as an elephant!"
            }
            return "🐟 Goldfish memory detected! 3 seconds and it's gone!"
        }

        // Sequence mode specific
        if (result.mode === GameMode.SEQUENCE) {
            if (result.sequencesCompleted && result.sequencesCompleted >= 5) {
                return "🎼 Perfect rhythm! You could conduct an orchestra!"
            }
            return "🥁 Your timing needs work! This isn't jazz improvisation!"
        }

        // Reverse mode specific
        if (result.mode === GameMode.REVERSE) {
            if (result.score > 0) {
                return "🔄 Reverse psychology mastery! You understood the assignment!"
            }
            return "😵‍💫 Did you forget this was reverse mode? Read the instructions!"
        }

        // Blind mode specific
        if (result.mode === GameMode.BLIND) {
            if (hasGoodAccuracy) {
                return "👁️ Eagle eyes! You caught those lightning-fast circles!"
            }
            return "👓 Blink and you miss! Maybe get your eyes checked?"
        }

        // Chaos modes
        if ([GameMode.EARTHQUAKE, GameMode.TORNADO, GameMode.CHAOS].includes(result.mode)) {
            if (hasGoodAccuracy) {
                return "🌪️ You navigated the chaos like a zen master!"
            }
            return "💫 The chaos consumed you! Maybe try easier modes first?"
        }

        // Speed demons achievement
        if (hasSpeedDemons) {
            const speedComments = [
                "⚡ SPEED DEMON! Your fingers are faster than light!",
                "🏎️ Formula 1 reflexes! You're breaking the sound barrier!",
                "🦅 Hawk-like precision and speed! Absolutely incredible!",
                "💨 Sonic boom detected! Those were some fast clicks!"
            ]
            return speedComments[Math.floor(Math.random() * speedComments.length)]
        }

        // Combo achievements
        if (hasGoodCombo) {
            const comboComments = [
                "🔥 COMBO MASTER! You're on fire! Literally unstoppable!",
                "🎯 Consistency is key and you nailed it! Combo king!",
                "⚡ Lightning strikes twice... and again... and again!",
                "🎪 Juggling perfection! You kept those combos flowing!"
            ]
            return comboComments[Math.floor(Math.random() * comboComments.length)]
        }

        // Excellent performance
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) {
            const excellent = [
                "🥷 Ninja reflexes detected! Your fingers have been training!",
                "😏 Someone's been practicing... or using performance enhancers?",
                "⚡ Your reactions are sharper than my wit!",
                "👏 Not bad, not bad... I'm actually impressed!",
                "😈 Did you make a deal with the devil for these reflexes?",
                "🖱️💦 Your mouse is crying from all the clicking!"
            ]
            return excellent[Math.floor(Math.random() * excellent.length)]
        }

        // Good performance
        if (scorePerSecond >= 0.8 && accuracy >= 75) {
            const good = [
                "👍 Solid performance! Your brain cells are cooperating!",
                "🧠 Nice work! Neural networks firing properly!",
                "🎯 Respectable shooting! You're getting the hang of it!",
                "📡 You're like reliable Wi-Fi - consistent and dependable!",
                "📈 Progress is progress! Keep climbing that mountain!",
                "🥔➡️🚀 Upgraded from potato to rocket! Nice evolution!"
            ]
            return good[Math.floor(Math.random() * good.length)]
        }

        // Specific failure cases
        if (hasManyDecoys) {
            const decoyComments = [
                "❌ Red means STOP! This isn't a traffic light simulation!",
                "🚫 Decoys are not your friends! They're the enemy!",
                "🌈 Color blindness test failed! Red ≠ Green!",
                "😂 The decoy circles are having a party at your expense!",
                "🎭 You fell for more tricks than a stage magician's audience!",
                "👓 Glasses recommended! Those red circles were obvious!"
            ]
            return decoyComments[Math.floor(Math.random() * decoyComments.length)]
        }

        if (hasTerribleAccuracy) {
            const accuracyComments = [
                "😵 Playing blindfolded? Your aim needs GPS guidance!",
                "📉 Your accuracy graph looks like a cliff dive!",
                "🖱️❓ Remember: click = good, miss = bad. Basic concepts!",
                "🎯 A dartboard would be safer with you around!",
                "⭐ Stormtroopers called - they want training tips from you!",
                "💪❓ Are you clicking with your elbows? That would explain it!",
                "🐧🍺 Drunk penguins have better coordination!"
            ]
            return accuracyComments[Math.floor(Math.random() * accuracyComments.length)]
        }

        if (hasSlowReaction) {
            const slowComments = [
                "🤔💭 Thinking or reacting? There's a difference!",
                "🦥 Sloth-speed reflexes detected! Evolution in reverse!",
                "☕ Coffee break between clicks? This isn't a leisure activity!",
                "🧊 Glacier movement is faster than your reactions!",
                "🌐💤 Internet Explorer called - even they're faster!",
                "⏳ Loading... still loading... reaction.exe has stopped working!",
                "🎨 Paint drying speed > your reflexes. Scientific fact!"
            ]
            return slowComments[Math.floor(Math.random() * slowComments.length)]
        }

        if (hasManyMisses) {
            const missComments = [
                "👆 The circles were RIGHT THERE! How did you miss?!",
                "🎯🍺 Drunk dart throwing has better accuracy!",
                "👻 Playing peek-a-boo with the targets? They're not shy!",
                "📋 Missing persons report filed for all those circles!",
                "🦁💨 You released more circles than a broken zoo!",
                "🤦‍♂️ Missing is NOT the objective! Pro tip right there!"
            ]
            return missComments[Math.floor(Math.random() * missComments.length)]
        }

        // Average performance
        if (scorePerSecond >= 0.4) {
            const average = [
                "🤷‍♂️ Meh... it's something, I suppose? Participation trophy?",
                "📊 Perfectly average! Congratulations on being... normal?",
                "🎨 As exciting as watching paint dry in slow motion!",
                "💪 Well, at least you tried... kind of... maybe?",
                "🌡️ Room temperature performance! Not hot, not cold!",
                "🏅 Achievement unlocked: 'Showed Up and Clicked Things'!",
                "✅ Your reflexes are... present. That's... good?"
            ]
            return average[Math.floor(Math.random() * average.length)]
        }

        // Terrible performance
        const terrible = [
            "😬 Oof... just... oof. No words can describe this.",
            "🤷‍♂️ Did you even try? Like, at all? Genuinely curious.",
            "🎨💔 Your performance is so bad, it's abstract art!",
            "😞 I'm not angry, just... profoundly disappointed.",
            "🎮❌ Maybe gaming isn't your calling? Try gardening?",
            "🕵️‍♂️ Your reflexes are in witness protection!",
            "👵 My 90-year-old grandmother plays better! (She's 95)",
            "🦶 Confirmed: you're playing with your feet!",
            "😵 This is painful to watch... for everyone involved!",
            "💼 Career suggestions: anything not requiring hand-eye coordination!",
            "💻💥 Your performance broke my scoring algorithm!",
            "🐔 Headless chickens show better coordination!",
            "👽🛸 This is why aliens don't visit us anymore!"
        ]
        return terrible[Math.floor(Math.random() * terrible.length)]
    }

    const getPerformanceEmoji = () => {
        const scorePerSecond = result.effectivenesss || (result.score / result.duration)
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        if (scorePerSecond >= 2 && hasGoodAccuracy && hasFastReaction) return "🏆"
        if (scorePerSecond >= 1.5 && hasGoodAccuracy) return "🥇"
        if (scorePerSecond >= 1.2 && accuracy >= 80) return "🥈"
        if (scorePerSecond >= 0.8 && accuracy >= 70) return "🥉"
        if (scorePerSecond >= 0.5) return "💩"
        return "🗑️"
    }

    const getScoreColor = () => {
        if (result.score >= 50) return 'text-green-400'
        if (result.score >= 30) return 'text-yellow-400'
        if (result.score >= 15) return 'text-blue-400'
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

    const getComboColor = () => {
        if (result.maxCombo >= 50) return 'text-green-400'
        if (result.maxCombo >= 25) return 'text-yellow-400'
        if (result.maxCombo >= 10) return 'text-blue-400'
        return 'text-white'
    }

    const getRating = () => {
        const scorePerSecond = result.effectivenesss || (result.score / result.duration)
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200
        const hasGoodCombo = result.maxCombo >= 15

        if (scorePerSecond >= 2 && hasGoodAccuracy && hasFastReaction && hasGoodCombo) {
            return { text: 'GODLIKE PERFORMANCE', color: 'text-yellow-400' }
        }
        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) {
            return { text: 'LEGENDARY SKILL', color: 'text-purple-400' }
        }
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) {
            return { text: 'EXCEPTIONAL EXECUTION', color: 'text-green-400' }
        }
        if (scorePerSecond >= 0.8 && accuracy >= 75) {
            return { text: 'STRONG PERFORMANCE', color: 'text-blue-400' }
        }
        if (scorePerSecond >= 0.5 && accuracy >= 60) {
            return { text: 'ADEQUATE EFFORT', color: 'text-white' }
        }
        if (scorePerSecond >= 0.2) {
            return { text: 'NEEDS IMPROVEMENT', color: 'text-orange-400' }
        }
        return { text: 'CATASTROPHIC FAILURE', color: 'text-red-400' }
    }

    const getAchievements = () => {
        const achievements = []

        if (accuracy === 100 && result.correctHits >= 10) {
            achievements.push({ icon: "💎", name: "PERFECTIONIST", desc: "100% Accuracy" })
        }
        if (result.maxCombo >= 50) {
            achievements.push({ icon: "🔥", name: "COMBO MASTER", desc: "50+ Combo" })
        }
        if (result.speedDemons >= 10) {
            achievements.push({ icon: "⚡", name: "SPEED DEMON", desc: "10+ Ultra-Fast Hits" })
        }
        if (result.consistencyRating >= 95) {
            achievements.push({ icon: "📊", name: "CONSISTENCY KING", desc: "95%+ Consistency" })
        }
        if (result.powerUpsUsed >= 5) {
            achievements.push({ icon: "⚡", name: "POWER USER", desc: "5+ Power-ups Used" })
        }
        if (result.mode === GameMode.PRECISION && result.score > 0) {
            achievements.push({ icon: "🎯", name: "PRECISION MASTER", desc: "Survived Precision Mode" })
        }
        if (result.memorySequencesCompleted && result.memorySequencesCompleted >= 5) {
            achievements.push({ icon: "🧠", name: "MEMORY MASTER", desc: "5+ Memory Sequences" })
        }
        if (result.sequencesCompleted && result.sequencesCompleted >= 5) {
            achievements.push({ icon: "🎼", name: "SEQUENCE MASTER", desc: "5+ Sequences Completed" })
        }

        return achievements
    }

    const rating = getRating()
    const sarcasticComment = getSarcasticComment()
    const performanceEmoji = getPerformanceEmoji()
    const ModeIcon = getModeIcon()
    const achievements = getAchievements()

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">{performanceEmoji}</div>
                    <h1 className="text-4xl font-bold font-bpdots text-white">
                        RESULTS
                    </h1>
                    <div className="flex items-center justify-center space-x-2">
                        <ModeIcon size={20} className="text-white/80" />
                        <p className="text-lg font-bpdots text-gray-400">
                            {config?.name || 'Unknown Mode'}
                        </p>
                    </div>
                    {result.adaptiveLevel > 0 && (
                        <p className="text-sm font-bpdots text-yellow-400">
                            Adaptive Level: {getAdaptiveLevelDescription(result.adaptiveLevel)}
                        </p>
                    )}
                </div>

                {/* Sarcastic Comment */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="text-center">
                        <div className={`text-xl font-bold font-bpdots ${rating.color} mb-2`}>
                            {rating.text}
                        </div>
                        <div className="text-white/80 font-bpdots text-sm italic">
                            &ldquo;{sarcasticComment}&rdquo;
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                {achievements.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <Award size={16} className="text-white/80" />
                            <h3 className="text-sm font-bpdots text-white font-bold">ACHIEVEMENTS UNLOCKED</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {achievements.map((achievement, index) => (
                                <div key={index} className="flex items-center space-x-3 p-2 bg-white/10 rounded-lg">
                                    <span className="text-lg">{achievement.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-bpdots text-white font-bold text-sm">{achievement.name}</div>
                                        <div className="text-xs text-white/60 font-bpdots">{achievement.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Save Status */}
                {(isSaving || saveError || saveSuccess) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color="white" />
                                <span className="text-white font-bpdots text-sm">
                                    Uploading your performance data...
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className="text-green-400 font-bpdots text-sm mb-2">
                                    ✓ Results saved successfully!
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
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
                                    Your performance was too epic for the database
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Stats */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-6">
                    <div className="text-center space-y-1">
                        <div className="text-sm font-bpdots text-gray-400">FINAL SCORE</div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                        <div className="text-xs font-bpdots text-white/60">
                            {(result.effectivenesss || (result.score / result.duration)).toFixed(1)} pts/sec
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">HITS</div>
                            <div className="text-xl font-bold font-bpdots text-green-400">
                                {result.correctHits}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">MISSES</div>
                            <div className="text-xl font-bold font-bpdots text-red-400">
                                {result.wrongHits + result.missedCircles}
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">ACCURACY</div>
                            <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                {accuracy}%
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">MAX COMBO</div>
                            <div className={`text-xl font-bold font-bpdots ${getComboColor()}`}>
                                {result.maxCombo}x
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Stats */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="text-center mb-3">
                        <div className="text-sm font-bpdots text-gray-400">DETAILED ANALYSIS</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {result.averageReactionTime > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">REACTION</div>
                                <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                    {result.averageReactionTime}ms
                                </div>
                            </div>
                        )}

                        {result.speedDemons > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">SPEED DEMONS</div>
                                <div className="text-lg font-bold font-bpdots text-yellow-400">
                                    {result.speedDemons}
                                </div>
                            </div>
                        )}

                        {result.fastHits > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">FAST HITS</div>
                                <div className="text-lg font-bold font-bpdots text-green-400">
                                    {result.fastHits}
                                </div>
                            </div>
                        )}

                        {result.powerUpsUsed > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">POWER-UPS</div>
                                <div className="text-lg font-bold font-bpdots text-purple-400">
                                    {result.powerUpsUsed}
                                </div>
                            </div>
                        )}

                        {result.decoyHits > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">DECOY HITS</div>
                                <div className="text-lg font-bold font-bpdots text-red-400">
                                    {result.decoyHits}
                                </div>
                            </div>
                        )}

                        <div className="text-center space-y-1">
                            <div className="text-xs font-bpdots text-gray-400">CONSISTENCY</div>
                            <div className="text-lg font-bold font-bpdots text-blue-400">
                                {result.consistencyRating.toFixed(0)}%
                            </div>
                        </div>

                        {result.memorySequencesCompleted !== undefined && result.memorySequencesCompleted > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">MEMORY</div>
                                <div className="text-lg font-bold font-bpdots text-purple-400">
                                    {result.memorySequencesCompleted}
                                </div>
                            </div>
                        )}

                        {result.sequencesCompleted !== undefined && result.sequencesCompleted > 0 && (
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-gray-400">SEQUENCES</div>
                                <div className="text-lg font-bold font-bpdots text-blue-400">
                                    {result.sequencesCompleted}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        CHALLENGE ACCEPTED
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        RETURN TO BASE
                    </button>
                </div>
            </div>
        </div>
    )
}