// src/components/GameResults.tsx - Maximum Sarcasm Edition

'use client'

import { GameResult, GameDifficulty } from '../types/game'
import { GAME_CONFIGS, calculateAccuracy, getAdaptiveLevelDescription, formatPrecisionTime } from '../utils/gameUtils'
import { Spinner } from '@nextui-org/react'
import { Clock, Target, Zap, AlertTriangle, Trophy, Skull, Activity, Crown, Flame, UserCheck, Award, Crosshair, ThumbsDown, Laugh, Frown, Coffee, Brain, Heart, Bomb } from 'lucide-react'

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
            case 'decoy_hit': return <Bomb size={20} className="text-red-400" />
            case 'timeout': return <Zap size={20} className="text-red-400" />
            default: return <Skull size={20} className="text-red-400" />
        }
    }

    const getDeathCauseMessage = (cause?: string): string => {
        switch (cause) {
            case 'miss': return 'Ignored a white target (classic mistake)'
            case 'wrong_click': return 'Clicked on nothingness (impressive!)'
            case 'decoy_hit': return 'Fell for the red trap (predictable)'
            case 'timeout': return 'Time ran out (or did you?)'
            default: return 'Mysterious failure (as usual)'
        }
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return 'BEGINNER'
            case GameDifficulty.OMG: return 'INTERMEDIATE'
            case GameDifficulty.NIGHTMARE: return 'ADVANCED'
            case GameDifficulty.IMPOSSIBLE: return 'EXPERT'
            case GameDifficulty.PRECISION: return 'SURVIVAL'
        }
    }

    const getDifficultyIcon = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return Award
            case GameDifficulty.OMG: return Flame
            case GameDifficulty.NIGHTMARE: return Skull
            case GameDifficulty.IMPOSSIBLE: return Crown
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
            case GameDifficulty.LEGENDARY:
                return {
                    primary: 'text-green-400',
                    secondary: 'text-green-300',
                    accent: 'text-green-200',
                    background: 'bg-green-500/20',
                    border: 'border-green-400/30'
                }
            case GameDifficulty.OMG:
                return {
                    primary: 'text-orange-400',
                    secondary: 'text-orange-300',
                    accent: 'text-orange-200',
                    background: 'bg-orange-500/20',
                    border: 'border-orange-400/30'
                }
            case GameDifficulty.NIGHTMARE:
                return {
                    primary: 'text-purple-400',
                    secondary: 'text-purple-300',
                    accent: 'text-purple-200',
                    background: 'bg-purple-500/20',
                    border: 'border-purple-400/30'
                }
            case GameDifficulty.IMPOSSIBLE:
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

    // МАКСИМАЛЬНО САРКАСТИЧНЫЕ КОММЕНТАРИИ
    const getUltraSarcasticComment = () => {
        const survivalTime = result.survivalTime || 0
        const intensityReached = result.maxIntensityReached || 1

        if (isPrecisionMode) {
            if (survivalTime >= 120000) {
                const legendary = [
                    "HOLY MOLY! Did you sell your soul to the devil? Because this is INHUMAN! 👹",
                    "BREAKING NEWS: Local person breaks laws of physics and human limitation! 📰⚡",
                    "CONGRATULATIONS! You've officially made everyone else feel inadequate! Hope you're proud! 🏆😤",
                    "EXCUSE ME?! Are you actually a cyborg? This performance is suspiciously perfect! 🤖👀",
                    "DEAR DIARY: Today I witnessed the impossible. Humans aren't supposed to be this good! 📔🤯",
                    "ATTENTION: This player has clearly discovered cheat codes for reality itself! 🎮✨",
                    "PLOT TWIST: You're not human, are you? This is beyond mortal capability! 👽🛸"
                ]
                return legendary[Math.floor(Math.random() * legendary.length)]
            }

            if (survivalTime >= 60000) {
                const excellent = [
                    "WELL, WELL, WELL... Look who thinks they're hot stuff! (And... you kind of are) 🔥😏",
                    "IMPRESSIVE! Your ego must be the size of a small planet right now! 🪐💫",
                    "NOT BAD, NOT BAD... I guess miracles DO happen sometimes! ✨🙄",
                    "OKAY FINE, you're actually good. But don't let it go to your head! (Too late) 📈🧠",
                    "FANTASTIC! Now everyone else looks like they're playing with their feet! 🦶😅",
                    "BRAVO! Your performance makes the rest of us look like cave people! 🏔️🔥",
                    "OUTSTANDING! Do you accept worship? Asking for a friend... 🙏✨"
                ]
                return excellent[Math.floor(Math.random() * excellent.length)]
            }

            if (survivalTime >= 30000) {
                const decent = [
                    "NOT TERRIBLE! You've achieved 'mediocre' status! Congratulations? 🎉😐",
                    "DECENT ATTEMPT! You've graduated from 'hopeless' to 'mildly disappointing'! 📜📈",
                    "RESPECTABLE! You managed not to completely embarrass yourself! Progress! 👏🎯",
                    "ACCEPTABLE! Your performance doesn't make me physically cringe! Achievement! ✨😌",
                    "MODERATE SUCCESS! You've reached the dizzying heights of 'okay'! 🏔️📊",
                    "FAIR PERFORMANCE! You're officially better than a random number generator! 🎲⬆️",
                    "SOLID EFFORT! You've achieved what we call 'not awful'! Inspiring! 💪😊"
                ]
                return decent[Math.floor(Math.random() * decent.length)]
            }

            if (survivalTime >= 15000) {
                const poor = [
                    "MEDIOCRE! But hey, at least you tried... sort of... maybe? 🤷‍♂️💭",
                    "AVERAGE! You've reached the prestigious rank of 'forgettable'! 📊😴",
                    "MODEST! Your performance is like a participation trophy - it exists! 🏆📦",
                    "BASIC! You've achieved the bare minimum of not being completely hopeless! 📏✨",
                    "ORDINARY! Your skills are as common as... well, common things! 🌱😅",
                    "STANDARD! You've mastered the art of being perfectly unremarkable! 🎨📊",
                    "TYPICAL! Your performance screams 'I exist and that's about it'! 📢💫"
                ]
                return poor[Math.floor(Math.random() * poor.length)]
            }

            // Less than 15 seconds - BRUTAL MODE
            const brutal = [
                "YIKES! That was faster than my last relationship! And just as disappointing! 💔⚡",
                "WOW! You speedran failure! That's a talent... of sorts! 🏃‍♂️💨",
                "INCREDIBLE! You managed to disappoint me in record time! Efficiency! ⏱️💀",
                "AMAZING! You've redefined the concept of 'brief encounter'! 🎭⚡",
                "SPECTACULAR! Your performance was like a shooting star - beautiful and gone too soon! ⭐💫",
                "OUTSTANDING! You've mastered the ancient art of instant regret! 🏺😱",
                "PHENOMENAL! That was quicker than microwaving a burrito! And less satisfying! 🌯⚡",
                "LEGENDARY! You've achieved what scientists call 'immediate catastrophic failure'! 🔬💥",
                "HISTORIC! Future generations will study this level of rapid disappointment! 📚🎓",
                "EPIC! You've turned failure into a high-speed sport! Should we call the Olympics? 🏅🏃‍♂️"
            ]
            return brutal[Math.floor(Math.random() * brutal.length)]
        }

        // Standard mode comments
        const scorePerSecond = result.score / result.duration
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        const difficultyMultiplier = {
            [GameDifficulty.LEGENDARY]: 1.2,
            [GameDifficulty.OMG]: 1.5,
            [GameDifficulty.NIGHTMARE]: 2,
            [GameDifficulty.IMPOSSIBLE]: 2.5,
            [GameDifficulty.PRECISION]: 1
        }[result.difficulty] || 1

        const adjustedScorePerSecond = scorePerSecond * difficultyMultiplier

        if (adjustedScorePerSecond >= 2.0 && hasGoodAccuracy && hasFastReaction) {
            const godTier = [
                "EXCUSE ME?! Are you actually from the future? This is RIDICULOUS! 🚀⚡",
                "WHAT THE HECK?! Did you download your reflexes from the matrix? 💊🔋",
                "SERIOUSLY?! Your fingers must be powered by pure caffeine and determination! ☕⚡",
                "IMPOSSIBLE! You've broken the game! I'm calling customer support! 📞🔧",
                "UNREAL! Your performance is so good it's making my code jealous! 💻😤",
                "INSANE! Are you sure you're not a professional esports player in disguise? 🥸🎮",
                "BONKERS! Your skills are more legendary than unicorns and honest politicians! 🦄🏛️"
            ]
            return godTier[Math.floor(Math.random() * godTier.length)]
        }

        if (adjustedScorePerSecond >= 1.5 && hasGoodAccuracy) {
            const excellent = [
                "WELL, WELL... Someone's been practicing! Or cheating. Probably practicing. Maybe. 🤔💪",
                "IMPRESSIVE! Your skills are almost as sharp as my wit! (That's saying something) ⚔️🧠",
                "FANTASTIC! You've officially graduated from 'hopeless' to 'surprisingly competent'! 🎓📈",
                "MARVELOUS! Your performance is better than most people's driving! (Low bar, but still) 🚗📊",
                "EXCELLENT! You've achieved what we call 'actually not embarrassing'! 🏆✨",
                "SUPERB! Your reflexes are faster than my Wi-Fi! (Also saying something) 📶⚡",
                "BRILLIANT! You've mastered the ancient art of 'clicking things correctly'! 🎯🏛️"
            ]
            return excellent[Math.floor(Math.random() * excellent.length)]
        }

        if (adjustedScorePerSecond >= 1.0 && accuracy >= 70) {
            const decent = [
                "NOT BAD! You've achieved the prestigious rank of 'mildly acceptable'! 📊😊",
                "DECENT! Your performance doesn't make me want to uninstall myself! 💻✨",
                "REASONABLE! You've reached the dizzying heights of 'satisfactory'! 🏔️📈",
                "ACCEPTABLE! You've proven that miracles do happen! Sometimes! Maybe! 🎭⭐",
                "TOLERABLE! Your skills are like elevator music - not offensive! 🎵😌",
                "PASSABLE! You've mastered the art of 'not completely terrible'! 🎨📊",
                "ADEQUATE! Your performance is like a reliable pencil - functional! ✏️💼"
            ]
            return decent[Math.floor(Math.random() * decent.length)]
        }

        if (adjustedScorePerSecond >= 0.5 && accuracy >= 50) {
            const mediocre = [
                "MEDIOCRE! But hey, participation trophies exist for a reason! 🏆📦",
                "AVERAGE! You've achieved what scientists call 'perfectly forgettable'! 🔬😴",
                "ORDINARY! Your performance is like vanilla ice cream - it's... there! 🍦📊",
                "BASIC! You've mastered the ancient art of existing! Congratulations! 🏛️✨",
                "STANDARD! Your skills are as common as people who don't read terms of service! 📜👥",
                "REGULAR! You've achieved the rank of 'background character'! 🎭📊",
                "TYPICAL! Your performance screams 'I am a human being'! 📢👤"
            ]
            return mediocre[Math.floor(Math.random() * mediocre.length)]
        }

        if (adjustedScorePerSecond >= 0.2 || accuracy >= 30) {
            const poor = [
                "YIKES! That was... an experience. For both of us. Mostly traumatic. 😱💭",
                "OH NO! Your performance is like a horror movie - hard to watch! 🎬😰",
                "OUCH! That hurt to witness. My pixels are crying! 💧📱",
                "DEAR ME! Your skills need more help than a Windows update! 💻🔧",
                "GOODNESS! That was rougher than sandpaper on a sunburn! 🏖️😵",
                "MERCY! Your performance needs emergency medical attention! 🚑🏥",
                "GRACIOUS! That was harder to watch than reality TV! 📺🙈"
            ]
            return poor[Math.floor(Math.random() * poor.length)]
        }

        // Bottom tier - MAXIMUM BRUTALITY
        const terrible = [
            "CATASTROPHIC! That was more painful than stepping on LEGO barefoot! 🦶🧱",
            "DISASTROUS! Your performance broke my calculator! (It displays only question marks now) 🧮❓",
            "APOCALYPTIC! That was worse than pineapple on pizza! (And that's REALLY bad) 🍕💀",
            "TRAGIC! Your skills make me question the meaning of existence! 🎭🤔",
            "DEVASTATING! That performance was a crime against humanity! 👮‍♂️⚖️",
            "HORRENDOUS! You've managed to disappoint pixels! That takes talent! 📱💔",
            "ABYSMAL! Your performance just asked for a refund! And therapy! 💸🛋️",
            "NIGHTMARISH! That was scarier than checking your bank account! 💳😱",
            "LEGENDARY! In all the wrong ways! Congratulations on achieving negative skill! 📈📉",
            "HISTORIC! You've redefined rock bottom! Scientists want to study you! 🔬🕳️"
        ]
        return terrible[Math.floor(Math.random() * terrible.length)]
    }

    const getPerformanceEmoji = () => {
        if (isPrecisionMode) {
            const survivalTime = result.survivalTime || 0
            if (survivalTime >= 120000) return "👑"  // God tier
            if (survivalTime >= 60000) return "🏆"   // Excellent  
            if (survivalTime >= 30000) return "🥇"   // Good
            if (survivalTime >= 15000) return "🥈"   // Okay
            if (survivalTime >= 10000) return "🥉"   // Poor
            if (survivalTime >= 5000) return "😅"    // Bad
            return "💀"                               // Terrible
        }

        const scorePerSecond = result.score / result.duration
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) return "🚀"  // God tier
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) return "🏆"                      // Excellent
        if (scorePerSecond >= 0.8 && accuracy >= 75) return "🥇"                       // Good
        if (scorePerSecond >= 0.5 && accuracy >= 60) return "😊"                       // Okay
        if (scorePerSecond >= 0.2 || accuracy >= 30) return "😐"                       // Poor
        if (result.score < 0) return "💩"                                             // Negative score
        return "🗑️"                                                                   // Terrible
    }

    const getScoreColor = () => {
        if (isPrecisionMode) return colors.primary

        if (result.score >= 50) return 'text-green-400'
        if (result.score >= 30) return 'text-yellow-400'
        if (result.score >= 15) return 'text-blue-400'
        if (result.score >= 5) return 'text-white'
        if (result.score >= 0) return 'text-orange-400'
        return 'text-red-400'
    }

    const getAccuracyColor = () => {
        if (accuracy >= 95) return 'text-green-400'
        if (accuracy >= 85) return 'text-yellow-400'
        if (accuracy >= 70) return 'text-blue-400'
        if (accuracy >= 50) return 'text-white'
        if (accuracy >= 30) return 'text-orange-400'
        return 'text-red-400'
    }

    const getReactionTimeColor = () => {
        if (result.averageReactionTime <= 150) return 'text-green-400'
        if (result.averageReactionTime <= 200) return 'text-yellow-400'
        if (result.averageReactionTime <= 300) return 'text-white'
        if (result.averageReactionTime <= 400) return 'text-orange-400'
        return 'text-red-400'
    }

    const getRating = () => {
        if (isPrecisionMode) {
            const survivalTime = result.survivalTime || 0

            if (survivalTime >= 120000) {
                return { text: 'GODLIKE PRECISION', color: 'text-purple-400' }
            }
            if (survivalTime >= 60000) {
                return { text: 'LEGENDARY ENDURANCE', color: 'text-yellow-400' }
            }
            if (survivalTime >= 30000) {
                return { text: 'IMPRESSIVE FOCUS', color: 'text-green-400' }
            }
            if (survivalTime >= 15000) {
                return { text: 'DECENT ATTEMPT', color: 'text-blue-400' }
            }
            if (survivalTime >= 10000) {
                return { text: 'BRIEF ENCOUNTER', color: 'text-white' }
            }
            if (survivalTime >= 5000) {
                return { text: 'QUICK DEMISE', color: 'text-orange-400' }
            }
            return { text: 'INSTANT FAILURE', color: 'text-red-400' }
        }

        const scorePerSecond = result.score / result.duration
        const hasGoodAccuracy = accuracy >= 85
        const hasFastReaction = result.averageReactionTime <= 200

        if (scorePerSecond >= 1.5 && hasGoodAccuracy && hasFastReaction) {
            return { text: 'SUSPICIOUSLY GOOD', color: 'text-yellow-400' }
        }
        if (scorePerSecond >= 1.2 && hasGoodAccuracy) {
            return { text: 'SURPRISINGLY COMPETENT', color: 'text-green-400' }
        }
        if (scorePerSecond >= 0.8 && accuracy >= 75) {
            return { text: 'ACCEPTABLY MEDIOCRE', color: 'text-blue-400' }
        }
        if (scorePerSecond >= 0.5 && accuracy >= 60) {
            return { text: 'BARELY ADEQUATE', color: 'text-white' }
        }
        if (scorePerSecond >= 0.2 || accuracy >= 30) {
            return { text: 'NEEDS SIGNIFICANT HELP', color: 'text-orange-400' }
        }
        return { text: 'HOPELESS CASE', color: 'text-red-400' }
    }

    const getPrecisionLevelDescription = (level: number): string => {
        if (level >= 15) return "PERFECT MACHINE"
        if (level >= 12) return "GODLIKE FOCUS"
        if (level >= 10) return "INSANITY LEVEL"
        if (level >= 8) return "OVERWHELMING CHAOS"
        if (level >= 6) return "SERIOUS BUSINESS"
        if (level >= 4) return "GETTING SPICY"
        if (level >= 3) return "INTRODUCTION TO PAIN"
        if (level >= 2) return "BABY STEPS"
        return "TUTORIAL MODE"
    }

    const rating = getRating()
    const ultraSarcasticComment = getUltraSarcasticComment()
    const performanceEmoji = getPerformanceEmoji()
    const DifficultyIcon = getDifficultyIcon(result.difficulty)

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                {/* Header with extra dramatic flair */}
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">{performanceEmoji}</div>
                    <h1 className={`text-4xl font-bold font-bpdots ${colors.primary}`}>
                        {isPrecisionMode ? 'PRECISION OVER' : 'MISSION FAILED'}
                    </h1>
                    <div className="flex items-center justify-center space-x-2">
                        <DifficultyIcon size={20} className={colors.primary} />
                        <p className={`text-lg font-bpdots ${colors.secondary}`}>
                            {getDifficultyDisplayName(result.difficulty)}
                            {isPrecisionMode ? ' Torture' : ' Disappointment'}
                        </p>
                    </div>

                    {/* Death cause for precision mode */}
                    {isPrecisionMode && result.deathCause && (
                        <div className={`flex items-center justify-center space-x-2 ${colors.background} border ${colors.border} rounded-lg p-2`}>
                            {getDeathCauseIcon(result.deathCause)}
                            <span className={`font-bpdots text-sm ${colors.secondary}`}>
                                {getDeathCauseMessage(result.deathCause)}
                            </span>
                        </div>
                    )}

                    {/* Adaptive level for standard mode */}
                    {!isPrecisionMode && result.adaptiveLevel > 0 && (
                        <p className={`text-sm font-bpdots ${colors.secondary}`}>
                            Adaptive Difficulty: {getAdaptiveLevelDescription(result.adaptiveLevel)}
                            {result.adaptiveLevel >= 8 && " (Show off!)"}
                        </p>
                    )}
                </div>

                {/* Ultra Sarcastic Comment Section */}
                <div className={`backdrop-blur-sm border rounded-xl p-4 ${colors.background} ${colors.border}`}>
                    <div className="text-center">
                        <div className={`text-xl font-bold font-bpdots ${rating.color} mb-2`}>
                            {rating.text}
                        </div>
                        <div className={`font-bpdots text-sm italic ${colors.accent}`}>
                            &ldquo;{ultraSarcasticComment}&rdquo;
                        </div>
                    </div>
                </div>

                {/* Extra sassy save status */}
                {(isSaving || saveError || saveSuccess) && (
                    <div className={`backdrop-blur-sm border rounded-xl p-4 ${colors.background} ${colors.border}`}>
                        {isSaving && (
                            <div className="flex items-center justify-center space-x-3">
                                <Spinner size="sm" color={isPrecisionMode ? "danger" : "default"} />
                                <span className={`font-bpdots text-sm ${colors.secondary}`}>
                                    {isPrecisionMode
                                        ? "Documenting your precision disaster..."
                                        : "Uploading your shameful performance..."}
                                </span>
                            </div>
                        )}

                        {saveSuccess && !isSaving && (
                            <div className="text-center">
                                <div className={`font-bpdots text-sm mb-2 ${colors.primary}`}>
                                    ✓ Results immortalized in the hall of shame!
                                </div>
                                <div className={`font-bpdots text-xs ${colors.accent}`}>
                                    Your disappointment is now permanently recorded
                                </div>
                            </div>
                        )}

                        {saveError && !isSaving && (
                            <div className="text-center">
                                <div className="text-red-400 font-bpdots text-sm mb-2">
                                    ✗ Failed to save your failure
                                </div>
                                <div className="text-gray-400 font-bpdots text-xs">
                                    Even our database is embarrassed!
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results with sarcastic labels */}
                <div className={`backdrop-blur-sm border rounded-xl p-6 space-y-6 ${colors.background} ${colors.border}`}>
                    <div className="text-center space-y-1">
                        <div className={`text-sm font-bpdots ${colors.accent}`}>
                            {isPrecisionMode ? 'SURVIVAL SCORE' : 'DAMAGE ASSESSMENT'}
                        </div>
                        <div className={`text-3xl font-bold font-bpdots ${getScoreColor()}`}>
                            {result.score >= 0 ? '+' : ''}{result.score}
                        </div>
                    </div>

                    {isPrecisionMode ? (
                        /* Enhanced Precision Mode Stats with sarcasm */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>AGONY DURATION</div>
                                    <div className={`text-xl font-bold font-bpdots ${colors.primary}`}>
                                        {formatPrecisionTime(result.survivalTime || 0)}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>PEAK TORTURE LEVEL</div>
                                    <div className={`text-xl font-bold font-bpdots text-orange-400`}>
                                        {result.maxIntensityReached || 1}/15
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>LUCKY STREAK</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.perfectStreak || 0}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>SUCCESSFUL CLICKS</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.correctHits}
                                    </div>
                                </div>
                            </div>

                            {/* Level Achievement with sarcasm */}
                            {result.maxIntensityReached && result.maxIntensityReached > 1 && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center space-y-2">
                                        <div className={`text-sm font-bpdots ${colors.accent}`}>
                                            FURTHEST INTO THE ABYSS
                                        </div>
                                        <div className={`text-lg font-bold font-bpdots text-orange-400`}>
                                            Level {result.maxIntensityReached}: {getPrecisionLevelDescription(result.maxIntensityReached)}
                                        </div>
                                        <div className="w-full h-2 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600"
                                                style={{ width: `${Math.min(100, ((result.maxIntensityReached || 1) / 15) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs font-bpdots text-red-400/60 italic">
                                            {result.maxIntensityReached >= 10
                                                ? "Impressive pain tolerance!"
                                                : "Room for more suffering!"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {result.averageReactionTime > 0 && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center space-y-1">
                                        <div className={`text-xs font-bpdots ${colors.accent}`}>REACTION SPEED</div>
                                        <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                            {result.averageReactionTime}ms
                                        </div>
                                        <p className="text-xs font-bpdots text-white/40 italic">
                                            {result.averageReactionTime <= 200
                                                ? "Lightning fast!"
                                                : result.averageReactionTime <= 300
                                                    ? "Not terrible!"
                                                    : "Are you awake?"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Standard Mode Stats with extra sarcasm */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>LUCKY HITS</div>
                                    <div className={`text-xl font-bold font-bpdots text-green-400`}>
                                        {result.correctHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>EPIC FAILS</div>
                                    <div className={`text-xl font-bold font-bpdots text-red-400`}>
                                        {result.wrongHits}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>IGNORED TARGETS</div>
                                    <div className={`text-xl font-bold font-bpdots text-orange-400`}>
                                        {result.missedCircles}
                                    </div>
                                </div>

                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-bpdots ${colors.accent}`}>HIT RATE</div>
                                    <div className={`text-xl font-bold font-bpdots ${getAccuracyColor()}`}>
                                        {accuracy}%
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Analysis with sarcastic commentary */}
                            {(result.decoyHits > 0 || result.fastHits > 0 || result.averageReactionTime > 0) && (
                                <div className={`border-t ${colors.border} pt-4`}>
                                    <div className="text-center mb-3">
                                        <div className={`text-sm font-bpdots ${colors.accent}`}>DETAILED ROAST</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {result.decoyHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>FELL FOR TRAPS</div>
                                                <div className="text-lg font-bold font-bpdots text-red-400">
                                                    {result.decoyHits}
                                                </div>
                                                <p className="text-xs font-bpdots text-red-400/60 italic">
                                                    {result.decoyHits > 3 ? "Easily fooled!" : "Classic mistake!"}
                                                </p>
                                            </div>
                                        )}

                                        {result.fastHits > 0 && (
                                            <div className="text-center space-y-1">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>SPEED BONUSES</div>
                                                <div className="text-lg font-bold font-bpdots text-yellow-400">
                                                    {result.fastHits}
                                                </div>
                                                <p className="text-xs font-bpdots text-yellow-400/60 italic">
                                                    {result.fastHits > 5 ? "Caffeine much?" : "Not bad!"}
                                                </p>
                                            </div>
                                        )}

                                        {result.averageReactionTime > 0 && (
                                            <div className="text-center space-y-1 col-span-2">
                                                <div className={`text-xs font-bpdots ${colors.accent}`}>AVERAGE REACTION</div>
                                                <div className={`text-lg font-bold font-bpdots ${getReactionTimeColor()}`}>
                                                    {result.averageReactionTime}ms
                                                </div>
                                                <p className="text-xs font-bpdots text-white/40 italic">
                                                    {result.averageReactionTime <= 150
                                                        ? "Suspiciously fast! 🤔"
                                                        : result.averageReactionTime <= 250
                                                            ? "Pretty decent!"
                                                            : result.averageReactionTime <= 350
                                                                ? "Could be worse..."
                                                                : "Are you asleep? 😴"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons with sarcastic text */}
                <div className="space-y-4">
                    <button
                        onClick={onPlayAgain}
                        disabled={isSaving}
                        className={`
                            w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            ${colors.border} ${colors.secondary} hover:${colors.background}
                        `}
                    >
                        {isPrecisionMode
                            ? 'MASOCHIST MODE: REACTIVATE'
                            : result.score < 0
                                ? 'TRY NOT TO FAIL THIS TIME'
                                : accuracy < 50
                                    ? 'MAYBE AIM BETTER?'
                                    : 'DARE TO DISAPPOINT AGAIN'
                        }
                    </button>

                    <button
                        onClick={onBackToMenu}
                        disabled={isSaving}
                        className={`
                            w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bpdots text-lg hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            border-white/60 text-white/80 hover:bg-white/5 hover:border-white hover:text-white
                        `}
                    >
                        {isPrecisionMode
                            ? 'ESCAPE TO SAFETY'
                            : result.score < 0
                                ? 'RETREAT IN SHAME'
                                : 'BACK TO COMFORT ZONE'
                        }
                    </button>
                </div>

                {/* Hidden easter egg */}
                <div className="text-center">
                    <p className="text-white/10 font-bpdots text-xs italic">
                        * No feelings were considered during the making of these comments
                    </p>
                </div>
            </div>
        </div>
    )
}