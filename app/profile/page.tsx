// src/app/profile/page.tsx

'use client'

import { useState, useEffect } from 'react'
import {
    Trophy, Target, Zap, Clock, TrendingUp, Star, Medal, Award, User, Activity,
    Calendar, BarChart3, Brain, Crosshair, RotateCcw, FlameIcon, Sparkles,
    TimerIcon, Gauge, CheckCircle, AlertTriangle, Layers, TrendingDown
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { userService, type GameResultDB } from '@/lib/supabase'
import { GameDifficulty, GameMode, SkillLevel } from '@/types/game'
import { GAME_CONFIGS } from '@/utils/gameUtils'
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
}

interface UserAnalytics {
    strengthAreas: Array<{
        name: string
        rating: number
        trend: 'improving' | 'stable' | 'declining'
        description: string
    }>
    weaknessAreas: Array<{
        name: string
        rating: number
        trend: 'improving' | 'stable' | 'declining'
        description: string
    }>
    consistencyRating: number
    adaptabilityRating: number
    recommendedModes: GameDifficulty[]
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
        impossible: null
    })
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null)
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'history' | 'achievements' | 'analytics'>('overview')

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return

            try {
                setIsLoadingData(true)

                const [history, overallRank, userAnalytics, ...difficultyRanks] = await Promise.all([
                    userService.getGameHistory(telegramUser.id, 20),
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserAnalytics(telegramUser.id),
                    userService.getUserDifficultyRanking(telegramUser.id, 'easy'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'medium'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'hard'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'legendary'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'omg'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'nightmare'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'impossible'),
                ])

                setGameHistory(history)
                setAnalytics(userAnalytics)
                setRankings({
                    overall: overallRank,
                    easy: difficultyRanks[0],
                    medium: difficultyRanks[1],
                    hard: difficultyRanks[2],
                    legendary: difficultyRanks[3],
                    omg: difficultyRanks[4],
                    nightmare: difficultyRanks[5],
                    impossible: difficultyRanks[6]
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

    const getSkillLevelColor = (level?: SkillLevel) => {
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

    const getGameModeIcon = (mode: GameMode) => {
        switch (mode) {
            case GameMode.REVERSE: return RotateCcw
            case GameMode.PRECISION: return Crosshair
            case GameMode.REVERSE_PRECISION: return AlertTriangle
            default: return Target
        }
    }

    const getGameModeColor = (mode: GameMode) => {
        switch (mode) {
            case GameMode.REVERSE: return 'text-purple-400'
            case GameMode.PRECISION: return 'text-red-400'
            case GameMode.REVERSE_PRECISION: return 'text-orange-400'
            default: return 'text-white'
        }
    }

    const getAchievements = () => {
        if (!user) return []

        const achievements = []

        // Базовые достижения
        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'VETERAN', desc: '10+ GAMES PLAYED', rarity: 'common' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'EXPERT', desc: '50+ GAMES PLAYED', rarity: 'rare' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'MASTER', desc: '100+ GAMES PLAYED', rarity: 'epic' })

        // Достижения по очкам
        if (user.best_score >= 25) achievements.push({ icon: Star, name: 'HIGH SCORER', desc: '25+ BEST SCORE', rarity: 'rare' })
        if (user.best_score >= 50) achievements.push({ icon: Trophy, name: 'LEGENDARY SCORER', desc: '50+ BEST SCORE', rarity: 'legendary' })

        // Достижения по точности
        if (user.best_accuracy >= 90) achievements.push({ icon: Zap, name: 'SHARPSHOOTER', desc: '90%+ ACCURACY', rarity: 'rare' })
        if (user.best_accuracy >= 95) achievements.push({ icon: Crosshair, name: 'PRECISION MASTER', desc: '95%+ ACCURACY', rarity: 'epic' })

        // Достижения по рейтингу
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'TOP 10', desc: 'TOP 10 PLAYER', rarity: 'legendary' })
        if (rankings.overall && rankings.overall <= 50) achievements.push({ icon: Medal, name: 'TOP 50', desc: 'TOP 50 PLAYER', rarity: 'epic' })

        // Специальные достижения
        if (user.total_perfect_runs && user.total_perfect_runs >= 5) achievements.push({ icon: Sparkles, name: 'PERFECTIONIST', desc: '5+ PERFECT RUNS', rarity: 'rare' })
        if (user.best_reaction_time && user.best_reaction_time <= 150) achievements.push({ icon: FlameIcon, name: 'LIGHTNING REFLEXES', desc: 'SUB-150MS REACTION', rarity: 'epic' })
        if (user.reverse_mode_games >= 10) achievements.push({ icon: RotateCcw, name: 'REVERSE SPECIALIST', desc: '10+ REVERSE GAMES', rarity: 'rare' })
        if (user.precision_mode_games >= 5) achievements.push({ icon: Crosshair, name: 'PRECISION WARRIOR', desc: '5+ PRECISION GAMES', rarity: 'epic' })
        if (user.best_survival_time && user.best_survival_time >= 10) achievements.push({ icon: TimerIcon, name: 'SURVIVOR', desc: '10+ SECONDS SURVIVAL', rarity: 'legendary' })

        return achievements
    }

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0
        if (totalGames >= 100) return { level: 'MASTER', color: 'text-white' }
        if (totalGames >= 50) return { level: 'EXPERT', color: 'text-white' }
        if (totalGames >= 20) return { level: 'VETERAN', color: 'text-white' }
        if (totalGames >= 10) return { level: 'SKILLED', color: 'text-white' }
        return { level: 'ROOKIE', color: 'text-white/60' }
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'EASY'
            case GameDifficulty.MEDIUM: return 'MEDIUM'
            case GameDifficulty.HARD: return 'HARD'
            case GameDifficulty.LEGENDARY: return 'LEGENDARY'
            case GameDifficulty.OMG: return 'OMG'
            case GameDifficulty.NIGHTMARE: return 'NIGHTMARE'
            case GameDifficulty.IMPOSSIBLE: return 'IMPOSSIBLE'
            case GameDifficulty.REVERSE_EASY: return 'REVERSE EASY'
            case GameDifficulty.REVERSE_MEDIUM: return 'REVERSE MEDIUM'
            case GameDifficulty.REVERSE_HARD: return 'REVERSE HARD'
            case GameDifficulty.CHAOS_REVERSE: return 'CHAOS REVERSE'
            case GameDifficulty.PRECISION_EASY: return 'PRECISION EASY'
            case GameDifficulty.PRECISION_MEDIUM: return 'PRECISION MEDIUM'
            case GameDifficulty.PRECISION_HARD: return 'PRECISION HARD'
            case GameDifficulty.ULTIMATE_PRECISION: return 'ULTIMATE PRECISION'
        }
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
    const achievements = getAchievements()

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">

            {/* Profile Header */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                <User size={24} className="text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white/20 px-2 py-1 rounded-lg text-xs font-bpdots font-bold">
                                {profileLevel.level}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold font-bpdots text-white">
                                {user.first_name} {user.last_name || ''}
                            </h1>
                            {user.username && (
                                <p className="text-white/60 font-bpdots text-sm">@{user.username}</p>
                            )}
                            <div className="flex items-center space-x-3 mt-2">
                                {user.is_premium && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-white/20 text-white text-xs font-bpdots">
                                        <Star size={12} className="mr-1" />
                                        PREMIUM
                                    </span>
                                )}
                                {rankings.overall && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-white/20 text-white text-xs font-bpdots">
                                        <Trophy size={12} className="mr-1" />
                                        #{rankings.overall}
                                    </span>
                                )}
                                {user.highest_skill_level && (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg bg-white/20 text-xs font-bpdots ${getSkillLevelColor(user.highest_skill_level)}`}>
                                        <Brain size={12} className="mr-1" />
                                        {user.highest_skill_level.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-white/10 rounded-lg">
                            <Activity size={16} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-white/60">GAMES</div>
                        </div>
                        <div className="text-center p-3 bg-white/10 rounded-lg">
                            <Target size={16} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-white/60">BEST</div>
                        </div>
                        <div className="text-center p-3 bg-white/10 rounded-lg">
                            <Zap size={16} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_accuracy}%</div>
                            <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                        </div>
                        <div className="text-center p-3 bg-white/10 rounded-lg">
                            <Gauge size={16} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_efficiency_rating || 0}</div>
                            <div className="text-xs font-bpdots text-white/60">EFFICIENCY</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex overflow-x-auto scrollbar-hide space-x-1">
                        {(['overview', 'stats', 'history', 'achievements', 'analytics'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-shrink-0 py-2 px-4 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
                                    ${activeTab === tab
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white/80'
                                    }
                                `}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-4 animate-fade-in">

                        {/* Game Mode Statistics */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Layers size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">GAME MODE BREAKDOWN</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {/* Normal Mode */}
                                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Target size={16} className="text-white" />
                                        <div>
                                            <div className="font-bpdots font-bold text-white text-sm">STANDARD MODE</div>
                                            <div className="text-xs text-white/60 font-bpdots">{user.normal_mode_games} games</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-bpdots font-bold text-sm">
                                            {Math.round((user.normal_mode_games / user.total_games) * 100)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Reverse Mode */}
                                {user.reverse_mode_games > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-purple-500/20 rounded-lg border border-purple-400/30">
                                        <div className="flex items-center space-x-3">
                                            <RotateCcw size={16} className="text-purple-400" />
                                            <div>
                                                <div className="font-bpdots font-bold text-white text-sm">REVERSE MODE</div>
                                                <div className="text-xs text-purple-200/60 font-bpdots">{user.reverse_mode_games} games</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-purple-200 font-bpdots font-bold text-sm">
                                                {Math.round((user.reverse_mode_games / user.total_games) * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Precision Mode */}
                                {user.precision_mode_games > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <div className="flex items-center space-x-3">
                                            <Crosshair size={16} className="text-red-400" />
                                            <div>
                                                <div className="font-bpdots font-bold text-white text-sm">PRECISION MODE</div>
                                                <div className="text-xs text-red-200/60 font-bpdots">
                                                    {user.precision_mode_games} games • {user.total_precision_failures || 0} failures
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-red-200 font-bpdots font-bold text-sm">
                                                {Math.round((user.precision_mode_games / user.total_games) * 100)}%
                                            </div>
                                            {user.best_survival_time && (
                                                <div className="text-xs text-red-200/60 font-bpdots">
                                                    Best: {user.best_survival_time.toFixed(1)}s
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extended Metrics */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Brain size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">ADVANCED METRICS</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {user.best_reaction_time && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            BEST REACTION
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.best_reaction_time}ms
                                        </span>
                                    </div>
                                )}

                                {user.longest_overall_streak && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <FlameIcon size={12} className="mr-1" />
                                            LONGEST STREAK
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.longest_overall_streak}
                                        </span>
                                    </div>
                                )}

                                {user.total_perfect_runs && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <Sparkles size={12} className="mr-1" />
                                            PERFECT RUNS
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.total_perfect_runs}
                                        </span>
                                    </div>
                                )}

                                {user.total_multitouch_events && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <Activity size={12} className="mr-1" />
                                            MULTITOUCH
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.total_multitouch_events}
                                        </span>
                                    </div>
                                )}

                                {user.total_fast_hits && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <Zap size={12} className="mr-1" />
                                            SPEED HITS
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.total_fast_hits}
                                        </span>
                                    </div>
                                )}

                                {user.max_adaptive_level && (
                                    <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-white/80 font-bpdots text-xs flex items-center">
                                            <TrendingUp size={12} className="mr-1" />
                                            MAX ADAPTIVE
                                        </span>
                                        <span className="text-white font-bpdots text-sm font-bold">
                                            {user.max_adaptive_level}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
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

                        {/* Difficulty Breakdown */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Trophy size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">DIFFICULTY BREAKDOWN</h3>
                            </div>
                            <div className="space-y-2">
                                {Object.values(GameDifficulty).map((difficulty) => {
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

                {/* History Tab */}
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
                                        const GameModeIcon = getGameModeIcon(game.game_mode)
                                        return (
                                            <div key={game.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <GameModeIcon size={16} className={getGameModeColor(game.game_mode)} />
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
                                                    <div className="font-bpdots font-bold text-sm text-white">
                                                        {game.score >= 0 ? '+' : ''}{game.score}
                                                    </div>
                                                    <div className="text-xs text-white/60 font-bpdots">
                                                        {game.accuracy}% • {game.efficiency_rating || 0}E
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Achievements Tab */}
                {activeTab === 'achievements' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Award size={16} className="text-white/80" />
                                <h3 className="text-sm font-bpdots text-white font-bold">ACHIEVEMENTS ({achievements.length})</h3>
                            </div>
                            <div className="space-y-2">
                                {achievements.map((achievement, index) => {
                                    const Icon = achievement.icon
                                    const rarityColors = {
                                        common: 'bg-gray-500/20 border-gray-400/30',
                                        rare: 'bg-blue-500/20 border-blue-400/30',
                                        epic: 'bg-purple-500/20 border-purple-400/30',
                                        legendary: 'bg-yellow-500/20 border-yellow-400/30'
                                    }
                                    return (
                                        <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg border ${rarityColors[achievement.rarity as keyof typeof rarityColors] || rarityColors.common}`}>
                                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                                <Icon size={18} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bpdots text-white font-bold text-sm flex items-center space-x-2">
                                                    <span>{achievement.name}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/80">
                                                        {achievement.rarity.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">{achievement.desc}</div>
                                            </div>
                                            <CheckCircle size={16} className="text-green-400" />
                                        </div>
                                    )
                                })}
                                {achievements.length === 0 && (
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

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-4 animate-fade-in">
                        {analytics ? (
                            <>
                                {/* Strengths & Weaknesses */}
                                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Brain size={16} className="text-white/80" />
                                        <h3 className="text-sm font-bpdots text-white font-bold">SKILL ANALYSIS</h3>
                                    </div>

                                    {/* Strengths */}
                                    {analytics.strengthAreas.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bpdots text-green-400 mb-2 flex items-center">
                                                <TrendingUp size={12} className="mr-1" />
                                                STRENGTHS
                                            </h4>
                                            <div className="space-y-2">
                                                {analytics.strengthAreas.map((area, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-green-500/20 rounded-lg border border-green-400/30">
                                                        <div>
                                                            <div className="font-bpdots text-white text-sm font-bold">{area.name}</div>
                                                            <div className="text-xs text-green-200/80 font-bpdots">{area.description}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-green-400 font-bpdots text-sm font-bold">{area.rating}</div>
                                                            <div className="text-xs text-green-300/60 font-bpdots">{area.trend}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Weaknesses */}
                                    {analytics.weaknessAreas.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bpdots text-red-400 mb-2 flex items-center">
                                                <TrendingDown size={12} className="mr-1" />
                                                AREAS FOR IMPROVEMENT
                                            </h4>
                                            <div className="space-y-2">
                                                {analytics.weaknessAreas.map((area, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                                                        <div>
                                                            <div className="font-bpdots text-white text-sm font-bold">{area.name}</div>
                                                            <div className="text-xs text-red-200/80 font-bpdots">{area.description}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-red-400 font-bpdots text-sm font-bold">{area.rating}</div>
                                                            <div className="text-xs text-red-300/60 font-bpdots">{area.trend}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Consistency Rating */}
                                    <div className="p-3 bg-white/10 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Activity size={14} className="text-white/60" />
                                                <span className="font-bpdots text-white text-sm">CONSISTENCY RATING</span>
                                            </div>
                                            <div className="text-white font-bpdots text-lg font-bold">
                                                {Math.round(analytics.consistencyRating)}%
                                            </div>
                                        </div>
                                        <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                                            <div
                                                className="bg-white h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${analytics.consistencyRating}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                                <div className="text-center py-6">
                                    <Brain size={32} className="text-white/40 mx-auto mb-3" />
                                    <p className="text-white/60 font-bpdots font-bold">INSUFFICIENT DATA</p>
                                    <p className="text-white/40 font-bpdots text-sm mt-1">
                                        Play more games to unlock detailed analytics!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}