// src/app/profile/page.tsx - Complete Ultra Sarcastic Profile Page

'use client'

import { useState, useEffect } from 'react'
import { Trophy, Target, Zap, Clock, TrendingUp, Star, Medal, Award, User, Activity, Calendar, BarChart3, Crosshair, AlertTriangle, UserCheck, Crown, Flame, Skull, ThumbsDown, Frown, Laugh, Coffee, Brain, Heart, Bomb, Shield, Siren, TrendingDown, BookOpen, MessageCircle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { userService, type GameResultDB } from '@/lib/supabase'
import { GameDifficulty } from '@/types/game'
import { GAME_CONFIGS, formatPrecisionTime } from '@/utils/gameUtils'
import { Spinner } from '@nextui-org/react'

interface UserRankings {
    overall: number | null
    legendary: number | null
    omg: number | null
    nightmare: number | null
    impossible: number | null
    precision: number | null
}

export default function ProfilePage() {
    const { user, telegramUser, isLoading: userLoading } = useUser()
    const [gameHistory, setGameHistory] = useState<GameResultDB[]>([])
    const [rankings, setRankings] = useState<UserRankings>({
        overall: null,
        legendary: null,
        omg: null,
        nightmare: null,
        impossible: null,
        precision: null
    })
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'achievements' | 'precision' | 'roast'>('stats')

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return

            try {
                setIsLoadingData(true)

                const [
                    history,
                    overallRank,
                    legendaryRank,
                    omgRank,
                    nightmareRank,
                    impossibleRank,
                    precisionRank
                ] = await Promise.all([
                    userService.getGameHistory(telegramUser.id, 15),
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserDifficultyRanking(telegramUser.id, 'legendary'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'omg'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'nightmare'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'impossible'),
                    userService.getUserPrecisionRanking(telegramUser.id),
                ])

                setGameHistory(history)
                setRankings({
                    overall: overallRank,
                    legendary: legendaryRank,
                    omg: omgRank,
                    nightmare: nightmareRank,
                    impossible: impossibleRank,
                    precision: precisionRank
                })
            } catch (error) {
                console.error('Error loading profile data:', error)
            } finally {
                setIsLoadingData(false)
            }
        }

        if (telegramUser && !userLoading) {
            loadProfileData()
        }
    }, [telegramUser, userLoading])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // МАКСИМАЛЬНО САРКАСТИЧНЫЕ ДОСТИЖЕНИЯ
    const getSarcasticAchievements = () => {
        if (!user) return []

        const achievements = []

        // Базовые "достижения"
        if (user.total_games >= 1) achievements.push({
            icon: Target,
            name: 'ROOKIE MISTAKE',
            desc: 'PLAYED YOUR FIRST GAME (QUESTIONABLE DECISION)',
            sarcasm: 'Congratulations! You\'ve officially entered the digital colosseum of disappointment! 🎉',
            isNegative: true
        })

        if (user.total_games >= 5) achievements.push({
            icon: Frown,
            name: 'GLUTTON FOR PUNISHMENT',
            desc: 'PLAYED 5+ GAMES (CLEARLY A MASOCHIST)',
            sarcasm: 'Some people learn from their mistakes. You... collect them! 🗂️',
            isNegative: true
        })

        if (user.total_games >= 10) achievements.push({
            icon: ThumbsDown,
            name: 'CERTIFIED MASOCHIST',
            desc: '10+ GAMES OF VOLUNTARY SUFFERING',
            sarcasm: 'At this point, we\'re genuinely concerned about your mental health... 😰',
            isNegative: true
        })

        if (user.total_games >= 25) achievements.push({
            icon: Skull,
            name: 'HOPELESS OPTIMIST',
            desc: '25+ ATTEMPTS AT THE IMPOSSIBLE',
            sarcasm: 'Your persistence is either admirable or a sign of serious delusion! 🤔',
            isNegative: true
        })

        if (user.total_games >= 50) achievements.push({
            icon: Crown,
            name: 'EMPEROR OF FAILURE',
            desc: '50+ GAMES OF QUESTIONABLE LIFE CHOICES',
            sarcasm: 'You\'ve achieved legendary status in the art of digital self-torture! 👑💀',
            isNegative: true
        })

        if (user.total_games >= 100) achievements.push({
            icon: Heart,
            name: 'STOCKHOLM SYNDROME',
            desc: '100+ GAMES (YOU ACTUALLY LOVE THIS PAIN)',
            sarcasm: 'You\'ve formed an emotional bond with your own failure. That\'s... concerning! ❤️‍🩹',
            isNegative: true
        })

        // Статистические "достижения"
        if (user.best_score <= 0) achievements.push({
            icon: TrendingDown,
            name: 'GRAVITY DEFYER',
            desc: 'BEST SCORE IS NEGATIVE (IMPRESSIVE!)',
            sarcasm: 'You\'ve achieved what scientists thought impossible: negative competence! 📉🔬',
            isNegative: true
        })

        if (user.best_accuracy < 30) achievements.push({
            icon: Target,
            name: 'STORM TROOPER ACADEMY GRADUATE',
            desc: 'ACCURACY WORSE THAN STAR WARS VILLAINS',
            sarcasm: 'Fun fact: Random clicking achieves 33% accuracy. You\'re... unique! ⭐🎯',
            isNegative: true
        })

        if (user.best_accuracy >= 90) achievements.push({
            icon: Brain,
            name: 'SUSPICIOUSLY COMPETENT',
            desc: '90%+ ACCURACY (ARE YOU HUMAN?)',
            sarcasm: 'Either you\'re genuinely skilled, or you\'ve discovered cheat codes for reality! 🤖',
            isNegative: false
        })

        if (user.total_wrong_hits > user.total_correct_hits && user.total_games > 5) {
            achievements.push({
                icon: Bomb,
                name: 'CHAOS INCARNATE',
                desc: 'MORE WRONG CLICKS THAN RIGHT',
                sarcasm: 'You click wrong more than right. That\'s not just bad luck, that\'s talent! 🎨💥',
                isNegative: true
            })
        }

        if (user.total_decoy_hits && user.total_decoy_hits > user.total_correct_hits) {
            achievements.push({
                icon: AlertTriangle,
                name: 'TRAP ENTHUSIAST',
                desc: 'FELL FOR MORE TRAPS THAN SUCCESSFUL HITS',
                sarcasm: 'Red circles must look very appealing to you. Are you colorblind? 🔴👀',
                isNegative: true
            })
        }

        // Precision Mode "достижения"
        if (user.precision_games >= 1) achievements.push({
            icon: Crosshair,
            name: 'PRECISION VICTIM #1',
            desc: 'ATTEMPTED PRECISION MODE (BAD IDEA)',
            sarcasm: 'You tried Precision Mode! How did that emotional trauma work out for you? 💀',
            isPrecision: true
        })

        if (user.precision_games >= 5) achievements.push({
            icon: Heart,
            name: 'PRECISION ADDICT',
            desc: '5+ PRECISION ATTEMPTS (SEEK HELP)',
            sarcasm: 'Still coming back for more precision punishment? Stockholm Syndrome confirmed! 🔄❤️‍🩹',
            isPrecision: true
        })

        if ((user.precision_best_survival_time || 0) < 10000) {
            achievements.push({
                icon: Clock,
                name: 'SPEED RUN CHAMPION',
                desc: 'DIED IN UNDER 10 SECONDS (IMPRESSIVE FAILURE)',
                sarcasm: 'That was faster than a Windows Blue Screen! New world record in disappointment! ⚡💙',
                isPrecision: true
            })
        }

        if ((user.precision_best_survival_time || 0) >= 60000) {
            achievements.push({
                icon: Trophy,
                name: 'PRECISION SURVIVOR',
                desc: 'SURVIVED 1+ MINUTE IN HELL',
                sarcasm: 'You survived a whole minute! Either you\'re good, or the game felt sorry for you! 🏆😇',
                isPrecision: false
            })
        }

        // Ранговые "достижения"
        if (rankings.overall && rankings.overall > 100) {
            achievements.push({
                icon: TrendingDown,
                name: 'BOTTOM FEEDER',
                desc: 'RANKED BELOW 100TH PLACE',
                sarcasm: 'You\'re part of an exclusive club... the "How did they even manage this?" club! 📊⬇️',
                isNegative: true
            })
        }

        if (rankings.overall && rankings.overall <= 3) {
            achievements.push({
                icon: Crown,
                name: 'SUSPICIOUS EXCELLENCE',
                desc: 'TOP 3 PLAYER (INVESTIGATION PENDING)',
                sarcasm: 'Either you\'re actually good, or you\'ve mastered the ancient art of luck! 🏆🔍',
                isNegative: false
            })
        }

        // Временные "достижения"
        const lastPlayed = user.last_played_at
        if (lastPlayed) {
            const daysSince = Math.floor((Date.now() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60 * 24))
            if (daysSince > 30) {
                achievements.push({
                    icon: Shield,
                    name: 'TACTICAL RETREAT',
                    desc: 'AVOIDED GAME FOR 30+ DAYS (SMART!)',
                    sarcasm: 'You took a break! That was the wisest decision you\'ve made! 🧠🛡️',
                    isNegative: false
                })
            }
            if (daysSince > 90) {
                achievements.push({
                    icon: BookOpen,
                    name: 'DIGITAL HERMIT',
                    desc: 'ESCAPED FOR 90+ DAYS (LIVING YOUR BEST LIFE)',
                    sarcasm: 'Three months free! You discovered there\'s a world outside this nightmare! 🌍✨',
                    isNegative: false
                })
            }
        }

        // Особые достижения на основе комбинаций
        if (user.total_games > 20 && user.best_score < 10) {
            achievements.push({
                icon: MessageCircle,
                name: 'DEFINITION OF INSANITY',
                desc: '20+ GAMES, STILL TERRIBLE',
                sarcasm: 'Einstein said insanity is doing the same thing and expecting different results. You\'re a case study! 🔬🤪',
                isNegative: true
            })
        }

        if (user.best_accuracy >= 95 && user.total_games >= 10) {
            achievements.push({
                icon: Star,
                name: 'ACCURACY DEMON',
                desc: '95%+ ACCURACY ACROSS MULTIPLE GAMES',
                sarcasm: 'Your accuracy is so high, it\'s making other players question their life choices! ⭐🎯',
                isNegative: false
            })
        }

        return achievements
    }

    // Функция для получения саркастичного комментария к статистике
    const getSarcasticStatComment = (statName: string, value: number, context?: any) => {
        switch (statName) {
            case 'total_games':
                if (value === 0) return "Smart choice! You've avoided the digital colosseum entirely! 🧠"
                if (value < 5) return "Just dipping your toes in the ocean of disappointment! 🌊"
                if (value < 20) return "Building up that tolerance to digital humiliation! 💪"
                if (value < 50) return "Clearly you enjoy the sweet taste of virtual defeat! 🍯💀"
                if (value < 100) return "You're approaching dangerous levels of addiction! 🚨"
                return "At this point, it's a clinical condition requiring professional intervention! 🏥"

            case 'best_score':
                if (value <= 0) return "Negative scores! You've transcended failure and entered a new dimension! 🌌"
                if (value < 5) return "Hey, at least it's not negative... wait, is it? 📊"
                if (value < 10) return "Single digits! Like your chances of improvement! 🔢"
                if (value < 25) return "Not terrible! (We're setting the bar very, very low) 📏"
                if (value < 50) return "Decent! You might actually have functioning neurons! 🧠"
                return "Show off! Leave some competence for the rest of us mere mortals! ✨"

            case 'best_accuracy':
                if (value < 20) return "Worse than random chance! That's mathematically impressive! 🎲"
                if (value < 30) return "Storm Troopers from Star Wars are jealous of your aim! ⭐"
                if (value < 50) return "Still worse than flipping a coin, but you're trying! 🪙"
                if (value < 70) return "Getting there... slowly... very, very slowly... 🐌"
                if (value < 85) return "Not bad! You're approaching human-level competence! 👤"
                if (value < 95) return "Pretty good! Are you secretly a robot? 🤖"
                return "Either you're a god or you found the cheat menu! Choose your answer wisely! 👨‍💻"

            case 'total_correct_hits':
                if (value === 0) return "Perfect record of missing everything! That takes dedication! 🎪"
                if (value < 10) return "Every successful hit is a Christmas miracle! 🎄"
                if (value < 50) return "Look at you, occasionally hitting things! Progress! 🎯"
                if (value < 100) return "You're starting to figure out this whole 'clicking' concept! 💡"
                return "Hit machine detected! Someone's been practicing! 🎰"

            case 'total_wrong_hits':
                if (value === 0) return "Either you're very careful or you don't play much! 🤔"
                if (value > (context?.total_correct_hits || 0)) return "You hit wrong more than right! That's performance art! 🎨"
                if (value > 50) return "Impressive collection of mistakes! Do you keep them in albums? 📸"
                return "Practice makes... well, more creative mistakes apparently! 📈"

            case 'total_missed_circles':
                if (value === 0) return "No missed circles! Either you're amazing or you've never played! 🏆"
                if (value > 100) return "You've ignored more circles than most people see in a lifetime! 👁️"
                return "Those poor circles, waiting for clicks that never came... 💔"

            default:
                return "Numbers don't lie... unfortunately for your ego! 📊"
        }
    }

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0
        const precisionGames = user?.precision_games || 0
        const bestScore = user?.best_score || 0

        const adjustedTotal = totalGames + (precisionGames * 2)

        if (adjustedTotal >= 100) return {
            level: 'DIGITAL MASOCHIST',
            color: 'text-red-500',
            description: 'Requires immediate psychological intervention'
        }
        if (adjustedTotal >= 50) return {
            level: 'CHRONIC SUFFERER',
            color: 'text-orange-500',
            description: 'Professional disappointment collector'
        }
        if (adjustedTotal >= 20) return {
            level: 'REPEAT OFFENDER',
            color: 'text-yellow-500',
            description: 'Never learns from obvious mistakes'
        }
        if (adjustedTotal >= 10) return {
            level: 'FREQUENT VICTIM',
            color: 'text-blue-400',
            description: 'Developing Stockholm syndrome'
        }
        if (totalGames > 0) return {
            level: 'INNOCENT LAMB',
            color: 'text-green-400',
            description: 'Hasn\'t suffered enough... yet'
        }
        return {
            level: 'WISELY ABSENT',
            color: 'text-purple-400',
            description: 'Smart enough to stay away from this chaos'
        }
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return 'VETERAN'
            case GameDifficulty.OMG: return 'MANIAC'
            case GameDifficulty.NIGHTMARE: return 'DEMON'
            case GameDifficulty.IMPOSSIBLE: return 'GODLIKE'
            case GameDifficulty.PRECISION: return 'PRECISION'
        }
    }

    const getGameModeIcon = (difficulty: string) => {
        switch (difficulty) {
            case 'legendary': return Award
            case 'omg': return Flame
            case 'nightmare': return Skull
            case 'impossible': return Crown
            case 'precision': return Crosshair
            default: return Target
        }
    }

    const getGameModeColor = (difficulty: string) => {
        switch (difficulty) {
            case 'legendary': return 'text-blue-400'
            case 'omg': return 'text-orange-400'
            case 'nightmare': return 'text-purple-400'
            case 'impossible': return 'text-yellow-400'
            case 'precision': return 'text-red-400'
            default: return 'text-white'
        }
    }

    if (userLoading || isLoadingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-bpdots">LOADING YOUR DIGITAL SHAME...</p>
                    <p className="text-white/60 font-bpdots text-sm">This might take a while... there&apos;s a lot of disappointment to process</p>
                </div>
            </div>
        )
    }

    if (!user || !telegramUser) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <User size={32} className="text-white/60 mx-auto" />
                    <p className="text-white font-bpdots">PROFILE NOT FOUND</p>
                    <p className="text-white/60 font-bpdots text-sm">Even your profile gave up on you! 💀</p>
                </div>
            </div>
        )
    }

    const profileLevel = getProfileLevel()
    const sarcasticAchievements = getSarcasticAchievements()

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            {/* Profile Header with maximum sarcasm */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-xs font-bpdots font-bold ${profileLevel.color} bg-black/60`}>
                                💀
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold font-bpdots text-white">
                                {user.first_name} {user.last_name || ''} &quot;The Digital Martyr&quot;
                            </h1>
                            {user.username && (
                                <p className="text-white/60 font-bpdots text-xs">@{user.username} (aka &quot;The Eternal Victim&quot;)</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bpdots ${profileLevel.color} bg-black/30`}>
                                    {profileLevel.level}
                                </span>
                                {user.is_premium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs font-bpdots border border-yellow-400/30">
                                        <Star size={10} className="mr-1" />
                                        PREMIUM VICTIM
                                    </span>
                                )}
                                {rankings.overall && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs font-bpdots">
                                        #{rankings.overall} IN FAILURE HIERARCHY
                                    </span>
                                )}
                            </div>
                            <p className="text-white/40 font-bpdots text-xs mt-1 italic">
                                &quot;{profileLevel.description}&quot;
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                            <Activity size={12} className="text-red-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-red-300">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-red-400/60">POOR DECISIONS</div>
                        </div>
                        <div className="text-center p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
                            <Target size={12} className="text-orange-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-orange-300">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-orange-400/60">PEAK PERFORMANCE</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                            <Zap size={12} className="text-yellow-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-yellow-300">{user.best_accuracy}%</div>
                            <div className="text-xs font-bpdots text-yellow-400/60">HIT RATE</div>
                        </div>
                        <div className="text-center p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
                            <Crosshair size={12} className="text-purple-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-purple-300">{user.precision_games || 0}</div>
                            <div className="text-xs font-bpdots text-purple-400/60">MASOCHIST ATTEMPTS</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs with maximum sarcasm */}
            <div className="mb-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {(['stats', 'roast', 'precision', 'history', 'achievements'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 py-2 px-3 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
                                    ${activeTab === tab
                                        ? tab === 'precision'
                                            ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                            : tab === 'roast'
                                                ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                                                : 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white/80'
                                    }
                                `}
                            >
                                {tab === 'stats' ? 'DAMAGE REPORT' :
                                    tab === 'history' ? 'PAIN DIARY' :
                                        tab === 'achievements' ? 'SHAME COLLECTION' :
                                            tab === 'roast' ? 'BRUTAL REALITY CHECK' :
                                                'PRECISION TORTURE LOG'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === 'roast' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Personal Roast Section */}
                        <div className="bg-orange-500/10 backdrop-blur-xl border border-orange-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Laugh size={16} className="text-orange-400" />
                                <h3 className="text-sm font-bpdots text-orange-300 font-bold">UNFILTERED ANALYSIS</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                                    <h4 className="font-bpdots text-orange-300 font-bold mb-2">📊 Performance Evaluation:</h4>
                                    <p className="text-orange-200 font-bpdots text-sm">
                                        {getSarcasticStatComment('total_games', user.total_games)}
                                    </p>
                                </div>
                                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                                    <h4 className="font-bpdots text-orange-300 font-bold mb-2">🎯 Skill Assessment:</h4>
                                    <p className="text-orange-200 font-bpdots text-sm">
                                        {getSarcasticStatComment('best_score', user.best_score)}
                                    </p>
                                </div>
                                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                                    <h4 className="font-bpdots text-orange-300 font-bold mb-2">🔍 Accuracy Roast:</h4>
                                    <p className="text-orange-200 font-bpdots text-sm">
                                        {getSarcasticStatComment('best_accuracy', user.best_accuracy)}
                                    </p>
                                </div>
                                {user.total_wrong_hits > user.total_correct_hits && user.total_games > 3 && (
                                    <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                                        <h4 className="font-bpdots text-red-300 font-bold mb-2">🏆 Special Recognition:</h4>
                                        <p className="text-red-200 font-bpdots text-sm">
                                            You click wrong more than right! That&apos;s not just bad luck, that&apos;s a legitimate talent!
                                            Have you considered a career in reverse psychology? 🎯💀
                                        </p>
                                    </div>
                                )}
                                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                                    <h4 className="font-bpdots text-blue-300 font-bold mb-2">💡 Life Advice:</h4>
                                    <p className="text-blue-200 font-bpdots text-sm">
                                        {user.total_games > 50
                                            ? "Maybe it's time to discover hobbies that don't involve clicking things? 🌱"
                                            : user.best_score < 0
                                                ? "Consider a different game. Maybe chess? At least there you can't get negative points! ♟️"
                                                : "You're doing... well, you're doing something! Keep up the... effort! 💪"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Award size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">HALL OF SHAME CERTIFICATES</h3>
                            </div>
                            <div className="space-y-2">
                                {sarcasticAchievements.map((achievement, index) => {
                                    const Icon = achievement.icon
                                    const isPrecisionAchievement = achievement.isPrecision
                                    const isNegativeAchievement = achievement.isNegative

                                    return (
                                        <div key={index} className={`p-3 rounded-lg border transition-all duration-300 ${isPrecisionAchievement
                                                ? 'bg-red-500/20 border-red-400/30'
                                                : isNegativeAchievement
                                                    ? 'bg-orange-500/20 border-orange-400/30'
                                                    : 'bg-green-500/20 border-green-400/30'
                                            }`}>
                                            <div className="flex items-start space-x-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrecisionAchievement
                                                        ? 'bg-red-500/30'
                                                        : isNegativeAchievement
                                                            ? 'bg-orange-500/30'
                                                            : 'bg-green-500/30'
                                                    }`}>
                                                    <Icon size={18} className={
                                                        isPrecisionAchievement
                                                            ? 'text-red-300'
                                                            : isNegativeAchievement
                                                                ? 'text-orange-300'
                                                                : 'text-green-300'
                                                    } />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bpdots font-bold text-sm ${isPrecisionAchievement
                                                            ? 'text-red-300'
                                                            : isNegativeAchievement
                                                                ? 'text-orange-300'
                                                                : 'text-green-300'
                                                        }`}>
                                                        {achievement.name}
                                                    </div>
                                                    <div className={`text-xs font-bpdots ${isPrecisionAchievement
                                                            ? 'text-red-400/60'
                                                            : isNegativeAchievement
                                                                ? 'text-orange-400/60'
                                                                : 'text-green-400/60'
                                                        }`}>
                                                        {achievement.desc}
                                                    </div>
                                                    {achievement.sarcasm && (
                                                        <div className="mt-2 text-xs font-bpdots italic text-white/80 bg-black/30 rounded p-2">
                                                            💭 {achievement.sarcasm}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {sarcasticAchievements.length === 0 && (
                                    <div className="text-center py-6">
                                        <Skull size={24} className="text-white/40 mx-auto mb-2" />
                                        <p className="text-white/60 font-bpdots text-sm">NO ACHIEVEMENTS UNLOCKED</p>
                                        <p className="text-white/40 font-bpdots text-xs mt-1">You haven&apos;t even failed enough to get failure achievements! That&apos;s... impressive? 💀</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <BarChart3 size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">COMPREHENSIVE DAMAGE ASSESSMENT</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">TOTAL SUFFERING</span>
                                        <span className="text-white font-bpdots text-sm font-bold">{user.total_score}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-green-500/20 rounded-lg border border-green-400/30">
                                        <span className="text-green-300 font-bpdots text-xs">LUCKY SHOTS</span>
                                        <span className="text-green-300 font-bpdots text-sm font-bold">{user.total_correct_hits}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <span className="text-red-300 font-bpdots text-xs">EPIC DISASTERS</span>
                                        <span className="text-red-300 font-bpdots text-sm font-bold">{user.total_wrong_hits}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
                                        <span className="text-orange-300 font-bpdots text-xs">IGNORED PLEAS</span>
                                        <span className="text-orange-300 font-bpdots text-sm font-bold">{user.total_missed_circles}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">AVG DISAPPOINTMENT</span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.total_games > 0 ? Math.round(user.total_score / user.total_games) : 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">LAST SPOTTED</span>
                                        <span className="text-white/80 font-bpdots text-xs">
                                            {user.last_played_at ? formatDate(user.last_played_at).split(',')[0] : 'NEVER (WISE CHOICE)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Sarcastic commentary */}
                            <div className="mt-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                                <p className="text-yellow-300 font-bpdots text-xs italic">
                                    💡 Professional Opinion: {getSarcasticStatComment('total_games', user.total_games)}
                                </p>
                            </div>
                        </div>

                        {/* Difficulty Breakdown with extra sarcasm */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Trophy size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">DIFFICULTY TRAUMA BREAKDOWN</h3>
                            </div>
                            <div className="space-y-2">
                                {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => {
                                    const gamesCount = (user as any)[`${difficulty}_games`]
                                    const bestScore = (user as any)[`${difficulty}_best_score`]
                                    const ranking = rankings[difficulty.toLowerCase() as keyof UserRankings]

                                    if (gamesCount === 0) return null

                                    const Icon = getGameModeIcon(difficulty)
                                    const colorClass = getGameModeColor(difficulty)

                                    return (
                                        <div key={difficulty} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <Icon size={16} className={colorClass} />
                                                <div>
                                                    <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                        {getDifficultyDisplayName(difficulty)}
                                                    </div>
                                                    <div className="text-xs text-white/60 font-bpdots">
                                                        {gamesCount} TRAUMA SESSIONS
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                    PEAK: {bestScore}
                                                    {bestScore < 0 && " (HOW?)"}
                                                    {bestScore > 50 && " (SUSPICIOUS)"}
                                                </div>
                                                {ranking && (
                                                    <div className="text-xs text-white/60 font-bpdots">
                                                        #{ranking} IN FAILURE RANKING
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'precision' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Crosshair size={16} className="text-red-400" />
                                <h3 className="text-sm font-bpdots text-red-300 font-bold">PRECISION MODE PSYCHOLOGICAL PROFILE</h3>
                            </div>

                            {user.precision_games === 0 ? (
                                <div className="text-center py-6">
                                    <Shield size={24} className="text-green-400 mx-auto mb-2" />
                                    <p className="text-green-300 font-bpdots text-sm">SMART HUMAN DETECTED</p>
                                    <p className="text-green-400/60 font-bpdots text-xs mt-1">
                                        You&apos;ve wisely avoided the precision torture chamber!
                                        Your mental health thanks you! 🧠💚
                                    </p>
                                    <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 mt-4">
                                        <p className="text-green-300/80 font-bpdots text-xs italic">
                                            💡 Life Tip: Keep avoiding it. There&apos;s nothing good waiting for you there.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Clock size={16} className="text-red-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-red-300">
                                                {formatPrecisionTime(user.precision_best_survival_time || 0)}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">LONGEST AGONY</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Zap size={16} className="text-orange-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-orange-300">
                                                {user.precision_max_intensity || 0}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">PAIN THRESHOLD</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Target size={16} className="text-green-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-green-300">
                                                {user.precision_best_streak || 0}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">LUCKY STREAK</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Activity size={16} className="text-red-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-red-300">
                                                {user.precision_games}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">MASOCHIST SESSIONS</div>
                                        </div>
                                    </div>

                                    {/* Precision Roasting */}
                                    <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                                        <h4 className="font-bpdots text-red-300 font-bold mb-2">🔥 Precision Mode Analysis:</h4>
                                        <p className="text-red-200 font-bpdots text-sm">
                                            {(user.precision_best_survival_time || 0) < 10000
                                                ? "You lasted less than 10 seconds! That's faster than microwaving leftovers! ⚡🍕"
                                                : (user.precision_best_survival_time || 0) < 30000
                                                    ? "You survived for a while! Either you're getting good, or the game felt sorry for you! 🎭"
                                                    : (user.precision_best_survival_time || 0) >= 60000
                                                        ? "A WHOLE MINUTE?! Are you secretly a precision android sent from the future? 🤖"
                                                        : "Respectable attempt! You're developing immunity to digital disappointment! 💉"
                                            }
                                        </p>
                                    </div>

                                    {rankings.precision && (
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Trophy size={16} className="text-yellow-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-yellow-300">
                                                #{rankings.precision}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">MASOCHIST RANKING</div>
                                            <p className="text-red-400/80 font-bpdots text-xs mt-1">
                                                {rankings.precision <= 10
                                                    ? "Elite precision sufferer! 🏆💀"
                                                    : "You're in the precision support group! 🫂"
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Calendar size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">DIGITAL TRAUMA DIARY</h3>
                            </div>
                            {gameHistory.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock size={24} className="text-white/40 mx-auto mb-2" />
                                    <p className="text-white/60 font-bpdots text-sm">NO GAMES RECORDED</p>
                                    <p className="text-white/40 font-bpdots text-xs mt-1">
                                        Either you&apos;re smart enough to avoid this, or we lost your data!
                                        (Probably the former) 📊
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {gameHistory.map((game) => {
                                        const Icon = getGameModeIcon(game.difficulty)
                                        const colorClass = getGameModeColor(game.difficulty)
                                        const isPrecision = game.difficulty === 'precision'

                                        return (
                                            <div key={game.id} className={`flex items-center justify-between p-2 rounded-lg ${isPrecision ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'
                                                }`}>
                                                <div className="flex items-center space-x-2">
                                                    <Icon size={16} className={colorClass} />
                                                    <div>
                                                        <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                            {getDifficultyDisplayName(game.difficulty as GameDifficulty)}
                                                        </div>
                                                        <div className="text-xs text-white/60 font-bpdots">
                                                            {formatDate(game.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                        {game.score >= 0 ? '+' : ''}{game.score}
                                                        {game.score < 0 && " (OOF)"}
                                                        {game.score > 50 && " (WOW)"}
                                                    </div>
                                                    {isPrecision && game.survival_time ? (
                                                        <div className="text-xs text-red-300/60 font-bpdots">
                                                            {formatPrecisionTime(game.survival_time)}
                                                            {game.survival_time < 10000 && " (BRIEF)"}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-white/60 font-bpdots">
                                                            {game.accuracy}% accuracy
                                                            {game.accuracy < 50 && " (YIKES)"}
                                                            {game.accuracy >= 90 && " (NICE)"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}