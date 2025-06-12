// src/app/profile/page.tsx - Enhanced with Precision Mode Support

'use client'

import { useState, useEffect } from 'react'
import { Trophy, Target, Zap, Clock, TrendingUp, Star, Medal, Award, User, Activity, Calendar, BarChart3, Crosshair, AlertTriangle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { userService, type GameResultDB } from '@/lib/supabase'
import { GameDifficulty } from '@/types/game'
import { GAME_CONFIGS, formatPrecisionTime } from '@/utils/gameUtils'
import { Spinner } from '@nextui-org/react'

interface UserRankings {
    overall: number | null
    easy: number | null
    medium: number | null
    hard: number | null
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
        easy: null,
        medium: null,
        hard: null,
        legendary: null,
        omg: null,
        nightmare: null,
        impossible: null,
        precision: null
    })
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'achievements' | 'precision'>('stats')

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return

            try {
                setIsLoadingData(true)

                const [
                    history,
                    overallRank,
                    easyRank,
                    mediumRank,
                    hardRank,
                    legendaryRank,
                    omgRank,
                    nightmareRank,
                    impossibleRank,
                    precisionRank
                ] = await Promise.all([
                    userService.getGameHistory(telegramUser.id, 15),
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserDifficultyRanking(telegramUser.id, 'easy'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'medium'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'hard'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'legendary'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'omg'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'nightmare'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'impossible'),
                    userService.getUserPrecisionRanking(telegramUser.id),
                ])

                setGameHistory(history)
                setRankings({
                    overall: overallRank,
                    easy: easyRank,
                    medium: mediumRank,
                    hard: hardRank,
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

    const getAchievements = () => {
        if (!user) return []

        const achievements = []

        // Standard achievements
        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'VETERAN', desc: '10+ GAMES PLAYED' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'EXPERT', desc: '50+ GAMES PLAYED' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'MASTER', desc: '100+ GAMES PLAYED' })
        if (user.best_score >= 25) achievements.push({ icon: Star, name: 'HIGH SCORER', desc: '25+ BEST SCORE' })
        if (user.best_accuracy >= 90) achievements.push({ icon: Zap, name: 'SHARPSHOOTER', desc: '90%+ ACCURACY' })
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'TOP 10', desc: 'TOP 10 PLAYER' })

        // Precision Mode achievements
        if (user.precision_games >= 1) achievements.push({ icon: Crosshair, name: 'PRECISION INITIATE', desc: 'SURVIVED PRECISION MODE' })
        if (user.precision_games >= 10) achievements.push({ icon: AlertTriangle, name: 'PRECISION VETERAN', desc: '10+ PRECISION ATTEMPTS' })
        if ((user.precision_best_survival_time || 0) >= 30000) achievements.push({ icon: Clock, name: 'ENDURANCE MASTER', desc: '30+ SECONDS SURVIVAL' })
        if ((user.precision_best_survival_time || 0) >= 60000) achievements.push({ icon: Medal, name: 'PRECISION LEGEND', desc: '1+ MINUTE SURVIVAL' })
        if ((user.precision_max_intensity || 0) >= 10) achievements.push({ icon: Zap, name: 'INTENSITY SURVIVOR', desc: 'REACHED LEVEL 10+' })
        if ((user.precision_best_streak || 0) >= 50) achievements.push({ icon: Target, name: 'STREAK MASTER', desc: '50+ PERFECT HITS' })
        if (rankings.precision && rankings.precision <= 5) achievements.push({ icon: Trophy, name: 'PRECISION ELITE', desc: 'TOP 5 PRECISION PLAYER' })

        return achievements
    }

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0
        const precisionGames = user?.precision_games || 0

        // Factor in precision mode achievements for level calculation
        const adjustedTotal = totalGames + (precisionGames * 2) // Precision games count double

        if (adjustedTotal >= 100) return { level: 'MASTER', color: 'text-white' }
        if (adjustedTotal >= 50) return { level: 'EXPERT', color: 'text-white' }
        if (adjustedTotal >= 20) return { level: 'VETERAN', color: 'text-white' }
        if (adjustedTotal >= 10) return { level: 'SKILLED', color: 'text-white' }
        return { level: 'ROOKIE', color: 'text-white/60' }
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'NOOB'
            case GameDifficulty.MEDIUM: return 'CASUAL'
            case GameDifficulty.HARD: return 'PRO'
            case GameDifficulty.LEGENDARY: return 'LEGEND'
            case GameDifficulty.OMG: return 'OMG'
            case GameDifficulty.NIGHTMARE: return 'NIGHTMARE'
            case GameDifficulty.IMPOSSIBLE: return 'RAGE MODE'
            case GameDifficulty.PRECISION: return 'PRECISION'
        }
    }

    const getGameModeIcon = (difficulty: string) => {
        if (difficulty === 'precision') return Crosshair
        return Target
    }

    const getGameModeColor = (difficulty: string) => {
        if (difficulty === 'precision') return 'text-red-400'
        return 'text-blue-400'
    }

    if (userLoading || isLoadingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-bpdots">LOADING PROFILE...</p>
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
                </div>
            </div>
        )
    }

    const profileLevel = getProfileLevel()

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            {/* Profile Header */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white/20 px-1 py-0.5 rounded text-xs font-bpdots font-bold">
                                {profileLevel.level}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold font-bpdots text-white">
                                {user.first_name} {user.last_name || ''}
                            </h1>
                            {user.username && (
                                <p className="text-white/60 font-bpdots text-xs">@{user.username}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                                {user.is_premium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs font-bpdots">
                                        <Star size={10} className="mr-1" />
                                        PREMIUM
                                    </span>
                                )}
                                {rankings.overall && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs font-bpdots">
                                        #{rankings.overall}
                                    </span>
                                )}
                                {rankings.precision && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-bpdots border border-red-400/30">
                                        <Crosshair size={10} className="mr-1" />
                                        P#{rankings.precision}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Activity size={12} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-white/60">GAMES</div>
                        </div>
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Target size={12} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-white/60">BEST</div>
                        </div>
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Zap size={12} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_accuracy}%</div>
                            <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                        </div>
                        <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                            <Crosshair size={12} className="text-red-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-red-400">{(user.precision_games || 0)}</div>
                            <div className="text-xs font-bpdots text-red-300/60">PRECISION</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex">
                        {(['stats', 'precision', 'history', 'achievements'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 py-2 px-3 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
                                    ${activeTab === tab
                                        ? tab === 'precision'
                                            ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                            : 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white/80'
                                    }
                                `}
                            >
                                {tab === 'stats' ? 'STATS' :
                                    tab === 'history' ? 'HISTORY' :
                                        tab === 'achievements' ? 'ACHIEVEMENTS' :
                                            'PRECISION'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Overall Statistics */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <BarChart3 size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">OVERALL STATISTICS</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">TOTAL SCORE</span>
                                        <span className="text-white font-bpdots text-sm font-bold">{user.total_score}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">CORRECT</span>
                                        <span className="text-white font-bpdots text-sm font-bold">{user.total_correct_hits}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">WRONG</span>
                                        <span className="text-white font-bpdots text-sm font-bold">{user.total_wrong_hits}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">MISSED</span>
                                        <span className="text-white font-bpdots text-sm font-bold">{user.total_missed_circles}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">AVG SCORE</span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.total_games > 0 ? Math.round(user.total_score / user.total_games) : 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs">LAST PLAYED</span>
                                        <span className="text-white/80 font-bpdots text-xs">
                                            {user.last_played_at ? formatDate(user.last_played_at).split(',')[0] : 'NEVER'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Standard Difficulty Breakdown */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Trophy size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">DIFFICULTY BREAKDOWN</h3>
                            </div>
                            <div className="space-y-2">
                                {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => {
                                    const gamesCount = (user as any)[`${difficulty}_games`]
                                    const bestScore = (user as any)[`${difficulty}_best_score`]
                                    const ranking = rankings[difficulty.toLowerCase() as keyof UserRankings]

                                    if (gamesCount === 0) return null

                                    return (
                                        <div key={difficulty} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                                            <div>
                                                <div className="font-bpdots font-bold text-white text-sm">
                                                    {getDifficultyDisplayName(difficulty)}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {gamesCount} GAMES
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bpdots font-bold text-sm">BEST: {bestScore}</div>
                                                {ranking && (
                                                    <div className="text-xs text-white/60 font-bpdots">
                                                        RANK #{ranking}
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
                        {/* Precision Mode Statistics */}
                        <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Crosshair size={16} className="text-red-400" />
                                <h3 className="text-sm font-bpdots text-red-300 font-bold">PRECISION MODE STATS</h3>
                            </div>

                            {user.precision_games === 0 ? (
                                <div className="text-center py-6">
                                    <AlertTriangle size={24} className="text-red-400/60 mx-auto mb-2" />
                                    <p className="text-red-300/60 font-bpdots text-sm">NO PRECISION ATTEMPTS YET</p>
                                    <p className="text-red-400/40 font-bpdots text-xs mt-1">DARE TO ENTER THE PRECISION ZONE?</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Key Precision Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Clock size={16} className="text-red-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-red-300">
                                                {formatPrecisionTime(user.precision_best_survival_time || 0)}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">BEST SURVIVAL</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Zap size={16} className="text-orange-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-orange-300">
                                                {user.precision_max_intensity || 0}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">MAX INTENSITY</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Target size={16} className="text-green-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-green-300">
                                                {user.precision_best_streak || 0}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">BEST STREAK</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Activity size={16} className="text-red-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-red-300">
                                                {user.precision_games}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">ATTEMPTS</div>
                                        </div>
                                    </div>

                                    {/* Precision Ranking */}
                                    {rankings.precision && (
                                        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                            <Trophy size={16} className="text-yellow-300 mx-auto mb-1" />
                                            <div className="text-lg font-bold font-bpdots text-yellow-300">
                                                #{rankings.precision}
                                            </div>
                                            <div className="text-xs font-bpdots text-red-400/60">PRECISION RANKING</div>
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
                                <h3 className="text-sm font-bpdots text-white font-bold">RECENT GAMES</h3>
                            </div>
                            {gameHistory.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock size={24} className="text-white/40 mx-auto mb-2" />
                                    <p className="text-white/60 font-bpdots text-sm">NO GAMES PLAYED YET</p>
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
                                                        <div className="font-bpdots font-bold text-white text-sm">
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
                                                    </div>
                                                    {isPrecision && game.survival_time ? (
                                                        <div className="text-xs text-red-300/60 font-bpdots">
                                                            {formatPrecisionTime(game.survival_time)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-white/60 font-bpdots">
                                                            {game.accuracy}% ACC
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

                {activeTab === 'achievements' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Award size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">ACHIEVEMENTS</h3>
                            </div>
                            <div className="space-y-2">
                                {getAchievements().map((achievement, index) => {
                                    const Icon = achievement.icon
                                    const isPrecisionAchievement = achievement.name.includes('PRECISION') ||
                                        achievement.name.includes('ENDURANCE') ||
                                        achievement.name.includes('INTENSITY') ||
                                        achievement.name.includes('STREAK')

                                    return (
                                        <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${isPrecisionAchievement ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPrecisionAchievement ? 'bg-red-500/30' : 'bg-white/20'
                                                }`}>
                                                <Icon size={16} className={isPrecisionAchievement ? 'text-red-300' : 'text-white'} />
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-bpdots font-bold text-sm ${isPrecisionAchievement ? 'text-red-300' : 'text-white'
                                                    }`}>
                                                    {achievement.name}
                                                </div>
                                                <div className={`text-xs font-bpdots ${isPrecisionAchievement ? 'text-red-400/60' : 'text-white/60'
                                                    }`}>
                                                    {achievement.desc}
                                                </div>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isPrecisionAchievement ? 'bg-red-500/30' : 'bg-white/20'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${isPrecisionAchievement ? 'bg-red-300' : 'bg-white'
                                                    }`}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {getAchievements().length === 0 && (
                                    <div className="text-center py-6">
                                        <Star size={24} className="text-white/40 mx-auto mb-2" />
                                        <p className="text-white/60 font-bpdots text-sm">NO ACHIEVEMENTS UNLOCKED</p>
                                        <p className="text-white/40 font-bpdots text-xs mt-1">PLAY MORE GAMES TO UNLOCK ACHIEVEMENTS!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}