// src/app/profile/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Trophy, Target, Zap, Clock, TrendingUp, Star, Medal, Award, User, Activity, Calendar, BarChart3 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { userService, type GameResultDB } from '@/lib/supabase'
import { GameDifficulty } from '@/types/game'
import { GAME_CONFIGS } from '@/utils/gameUtils'
import { Spinner } from '@nextui-org/react'

interface UserRankings {
    overall: number | null
    easy: number | null
    medium: number | null
    hard: number | null
    legendary: number | null
    omg: number | null
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
        omg: null
    })
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'achievements'>('stats')

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return

            try {
                setIsLoadingData(true)

                const [history, overallRank, easyRank, mediumRank, hardRank, legendaryRank, omgRank] = await Promise.all([
                    userService.getGameHistory(telegramUser.id, 20),
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserDifficultyRanking(telegramUser.id, 'easy'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'medium'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'hard'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'legendary'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'omg'),
                ])

                setGameHistory(history)
                setRankings({
                    overall: overallRank,
                    easy: easyRank,
                    medium: mediumRank,
                    hard: hardRank,
                    legendary: legendaryRank,
                    omg: omgRank
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

    const getDifficultyColor = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'text-green-400'
            case GameDifficulty.MEDIUM: return 'text-yellow-400'
            case GameDifficulty.HARD: return 'text-blue-400'
            case GameDifficulty.LEGENDARY: return 'text-orange-400'
            case GameDifficulty.OMG: return 'text-red-400'
            default: return 'text-white'
        }
    }

    const getDifficultyGradient = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'from-green-400/10 to-green-600/5'
            case GameDifficulty.MEDIUM: return 'from-yellow-400/10 to-yellow-600/5'
            case GameDifficulty.HARD: return 'from-blue-400/10 to-blue-600/5'
            case GameDifficulty.LEGENDARY: return 'from-orange-400/10 to-orange-600/5'
            case GameDifficulty.OMG: return 'from-red-400/10 to-red-600/5'
            default: return 'from-white/10 to-white/5'
        }
    }

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

        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'Veteran', desc: '10+ games played', color: 'text-purple-400' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'Expert', desc: '50+ games played', color: 'text-blue-400' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'Master', desc: '100+ games played', color: 'text-orange-400' })
        if (user.best_score >= 25) achievements.push({ icon: Star, name: 'High Scorer', desc: '25+ best score', color: 'text-yellow-400' })
        if (user.best_accuracy >= 90) achievements.push({ icon: Zap, name: 'Sharpshooter', desc: '90%+ accuracy', color: 'text-green-400' })
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'Top 10', desc: 'Top 10 player', color: 'text-red-400' })

        return achievements
    }

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0
        if (totalGames >= 100) return { level: 'MASTER', color: 'text-red-400', bg: 'bg-red-400/20' }
        if (totalGames >= 50) return { level: 'EXPERT', color: 'text-orange-400', bg: 'bg-orange-400/20' }
        if (totalGames >= 20) return { level: 'VETERAN', color: 'text-blue-400', bg: 'bg-blue-400/20' }
        if (totalGames >= 10) return { level: 'SKILLED', color: 'text-green-400', bg: 'bg-green-400/20' }
        return { level: 'ROOKIE', color: 'text-gray-400', bg: 'bg-gray-400/20' }
    }

    if (userLoading || isLoadingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.1s' }}></div>
                    </div>
                    <p className="text-white font-bpdots text-lg">Loading profile...</p>
                    <div className="flex space-x-1 justify-center">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!user || !telegramUser) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-400/20 to-red-600/10 rounded-full flex items-center justify-center mx-auto">
                        <User size={32} className="text-red-400" />
                    </div>
                    <p className="text-white font-bpdots text-xl">Profile not found</p>
                    <p className="text-white/60 font-bpdots text-sm">Please try again later</p>
                </div>
            </div>
        )
    }

    const profileLevel = getProfileLevel()

    return (
        <div className="min-h-screen bg-black text-white pb-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-green-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400"></div>

            {/* Header */}
            <div className="relative pt-16 pb-8 px-6">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 space-y-6 animate-fade-in shadow-2xl">
                    {/* User Info */}
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-2xl flex items-center justify-center shadow-lg">
                                <User size={32} className="text-white" />
                            </div>
                            <div className={`absolute -bottom-2 -right-2 ${profileLevel.bg} ${profileLevel.color} px-2 py-1 rounded-lg text-xs font-bpdots font-bold`}>
                                {profileLevel.level}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold font-bpdots bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                {user.first_name} {user.last_name || ''}
                            </h1>
                            {user.username && (
                                <p className="text-white/60 font-bpdots text-sm">@{user.username}</p>
                            )}
                            <div className="flex items-center space-x-3 mt-2">
                                {user.is_premium && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400 text-xs font-bpdots font-bold">
                                        <Star size={12} className="mr-1" />
                                        PREMIUM
                                    </span>
                                )}
                                {rankings.overall && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-400/20 to-blue-600/20 border border-blue-400/30 text-blue-400 text-xs font-bpdots font-bold">
                                        <Trophy size={12} className="mr-1" />
                                        #{rankings.overall} GLOBAL
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-center mb-2">
                                <Activity size={16} className="text-white/60" />
                            </div>
                            <div className="text-2xl font-bold font-bpdots text-white">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-white/60">GAMES</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-400/20 to-green-600/10 rounded-xl border border-green-400/20">
                            <div className="flex items-center justify-center mb-2">
                                <Target size={16} className="text-green-400" />
                            </div>
                            <div className="text-2xl font-bold font-bpdots text-green-400">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-white/60">BEST SCORE</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-400/20 to-blue-600/10 rounded-xl border border-blue-400/20">
                            <div className="flex items-center justify-center mb-2">
                                <Zap size={16} className="text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold font-bpdots text-blue-400">{user.best_accuracy}%</div>
                            <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-6">
                <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-2">
                    <div className="flex">
                        {(['stats', 'history', 'achievements'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                  flex-1 py-3 px-4 rounded-xl font-bpdots text-sm font-bold transition-all duration-300
                  ${activeTab === tab
                                        ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg transform scale-105'
                                        : 'text-white/60 hover:text-white/80 hover:bg-white/5'
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
            <div className="px-6 space-y-6">
                {activeTab === 'stats' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Overall Stats */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <BarChart3 size={24} className="text-blue-400" />
                                <h3 className="text-xl font-bpdots text-white font-bold">OVERALL STATISTICS</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                        <span className="text-white/80 font-bpdots text-sm">Total Score</span>
                                        <span className="text-white font-bpdots font-bold">{user.total_score}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-400/10 to-green-600/5 rounded-xl border border-green-400/20">
                                        <span className="text-white/80 font-bpdots text-sm">Correct Hits</span>
                                        <span className="text-green-400 font-bpdots font-bold">{user.total_correct_hits}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-400/10 to-red-600/5 rounded-xl border border-red-400/20">
                                        <span className="text-white/80 font-bpdots text-sm">Wrong Hits</span>
                                        <span className="text-red-400 font-bpdots font-bold">{user.total_wrong_hits}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-400/10 to-orange-600/5 rounded-xl border border-orange-400/20">
                                        <span className="text-white/80 font-bpdots text-sm">Missed</span>
                                        <span className="text-orange-400 font-bpdots font-bold">{user.total_missed_circles}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-400/10 to-purple-600/5 rounded-xl border border-purple-400/20">
                                        <span className="text-white/80 font-bpdots text-sm">Avg Score</span>
                                        <span className="text-purple-400 font-bpdots font-bold">
                                            {user.total_games > 0 ? Math.round(user.total_score / user.total_games) : 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                        <span className="text-white/80 font-bpdots text-sm">Last Played</span>
                                        <span className="text-white/80 font-bpdots text-xs">
                                            {user.last_played_at ? formatDate(user.last_played_at) : 'Never'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Stats */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <Trophy size={24} className="text-yellow-400" />
                                <h3 className="text-xl font-bpdots text-white font-bold">DIFFICULTY BREAKDOWN</h3>
                            </div>
                            <div className="space-y-4">
                                {Object.values(GameDifficulty).map((difficulty) => {
                                    const gamesCount = (user as any)[`${difficulty}_games`]
                                    const bestScore = (user as any)[`${difficulty}_best_score`]
                                    const ranking = rankings[difficulty.toLowerCase() as keyof UserRankings]

                                    if (gamesCount === 0) return null

                                    return (
                                        <div key={difficulty} className={`flex items-center justify-between p-4 bg-gradient-to-r ${getDifficultyGradient(difficulty)} rounded-xl border border-white/10 hover:scale-105 transition-transform duration-300`}>
                                            <div>
                                                <div className={`font-bpdots font-bold ${getDifficultyColor(difficulty)}`}>
                                                    {GAME_CONFIGS[difficulty].name}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {gamesCount} games played
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bpdots font-bold">Best: {bestScore}</div>
                                                {ranking && (
                                                    <div className="text-xs text-yellow-400 font-bpdots font-bold">
                                                        Rank #{ranking}
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

                {activeTab === 'history' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <Calendar size={24} className="text-green-400" />
                                <h3 className="text-xl font-bpdots text-white font-bold">RECENT GAMES</h3>
                            </div>
                            {gameHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock size={48} className="text-white/40 mx-auto mb-4" />
                                    <p className="text-white/60 font-bpdots text-lg">No games played yet</p>
                                    <p className="text-white/40 font-bpdots text-sm mt-2">Start playing to see your game history!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {gameHistory.map((game) => (
                                        <div key={game.id} className={`flex items-center justify-between p-4 bg-gradient-to-r ${getDifficultyGradient(game.difficulty as GameDifficulty)} rounded-xl border border-white/10 hover:scale-105 transition-transform duration-300`}>
                                            <div>
                                                <div className={`font-bpdots font-bold ${getDifficultyColor(game.difficulty as GameDifficulty)}`}>
                                                    {GAME_CONFIGS[game.difficulty as GameDifficulty]?.name || game.difficulty}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {formatDate(game.created_at)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bpdots font-bold ${game.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {game.score >= 0 ? '+' : ''}{game.score}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {game.accuracy}% accuracy
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <Award size={24} className="text-purple-400" />
                                <h3 className="text-xl font-bpdots text-white font-bold">ACHIEVEMENTS</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {getAchievements().map((achievement, index) => {
                                    const Icon = achievement.icon
                                    return (
                                        <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-white/10 to-white/5 rounded-xl border border-white/10 hover:scale-105 transition-transform duration-300">
                                            <div className={`w-12 h-12 bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 rounded-xl flex items-center justify-center ${achievement.color}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bpdots text-white font-bold">{achievement.name}</div>
                                                <div className="text-xs text-white/60 font-bpdots">{achievement.desc}</div>
                                            </div>
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-400/30 to-green-600/20 rounded-full flex items-center justify-center">
                                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {getAchievements().length === 0 && (
                                    <div className="text-center py-12">
                                        <Star size={48} className="text-white/40 mx-auto mb-4" />
                                        <p className="text-white/60 font-bpdots text-lg">No achievements unlocked</p>
                                        <p className="text-white/40 font-bpdots text-sm mt-2">Play more games to unlock achievements!</p>
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