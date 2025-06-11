// src/app/profile/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Trophy, Target, Zap, Clock, TrendingUp, Star, Medal, Award, User } from 'lucide-react'
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
            console.log('Profile Page - Starting to load data')
            console.log('Telegram User:', telegramUser)
            console.log('User from context:', user)
            console.log('User Loading state:', userLoading)

            if (!telegramUser?.id) {
                console.log('No Telegram User ID available')
                return
            }

            try {
                setIsLoadingData(true)
                console.log('Fetching game history for user:', telegramUser.id)

                // Загружаем историю игр
                const history = await userService.getGameHistory(telegramUser.id, 20)
                console.log('Game history loaded:', history)
                setGameHistory(history)

                console.log('Fetching rankings for user:', telegramUser.id)
                // Загружаем рейтинги
                const [overallRank, easyRank, mediumRank, hardRank, legendaryRank, omgRank] = await Promise.all([
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserDifficultyRanking(telegramUser.id, 'easy'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'medium'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'hard'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'legendary'),
                    userService.getUserDifficultyRanking(telegramUser.id, 'omg'),
                ])

                console.log('Rankings loaded:', {
                    overall: overallRank,
                    easy: easyRank,
                    medium: mediumRank,
                    hard: hardRank,
                    legendary: legendaryRank,
                    omg: omgRank
                })

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
                console.log('Profile data loading completed')
            }
        }

        if (telegramUser && !userLoading) {
            console.log('Profile Page - Effect triggered with telegramUser and !userLoading')
            loadProfileData()
        } else {
            console.log('Profile Page - Effect not triggered because:', {
                hasTelegramUser: !!telegramUser,
                userLoading
            })
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

        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'Veteran', desc: '10+ games played' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'Expert', desc: '50+ games played' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'Master', desc: '100+ games played' })
        if (user.best_score >= 25) achievements.push({ icon: Star, name: 'High Scorer', desc: '25+ best score' })
        if (user.best_accuracy >= 90) achievements.push({ icon: Zap, name: 'Sharpshooter', desc: '90%+ accuracy' })
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'Top 10', desc: 'Top 10 player' })

        return achievements
    }

    if (userLoading || isLoadingData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Spinner size="lg" color="white" />
                    <p className="text-white font-bpdots">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (!user || !telegramUser) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-white font-bpdots">Profile not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="pt-16 pb-8 px-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-4 animate-fade-in">
                    {/* User Info */}
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                            <User size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-bpdots">
                                {user.first_name} {user.last_name || ''}
                            </h1>
                            {user.username && (
                                <p className="text-white/60 font-bpdots">@{user.username}</p>
                            )}
                            {user.is_premium && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bpdots mt-1">
                                    <Star size={12} className="mr-1" />
                                    PREMIUM
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold font-bpdots text-white">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-white/60">GAMES</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold font-bpdots text-green-400">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-white/60">BEST</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold font-bpdots text-blue-400">{user.best_accuracy}%</div>
                            <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                        </div>
                    </div>

                    {/* Overall Ranking */}
                    {rankings.overall && (
                        <div className="text-center pt-2 border-t border-white/10">
                            <div className="text-lg font-bpdots text-yellow-400">
                                #{rankings.overall} GLOBAL RANK
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-6">
                <div className="flex bg-white/5 rounded-xl p-1">
                    {(['stats', 'history', 'achievements'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                flex-1 py-2 px-4 rounded-lg font-bpdots text-sm transition-all duration-300
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

            {/* Tab Content */}
            <div className="px-6 space-y-4">
                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Overall Stats */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                            <h3 className="text-lg font-bpdots text-white mb-4">OVERALL STATISTICS</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Total Score</span>
                                        <span className="text-white font-bpdots">{user.total_score}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Correct Hits</span>
                                        <span className="text-green-400 font-bpdots">{user.total_correct_hits}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Wrong Hits</span>
                                        <span className="text-red-400 font-bpdots">{user.total_wrong_hits}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Missed</span>
                                        <span className="text-orange-400 font-bpdots">{user.total_missed_circles}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Avg Score</span>
                                        <span className="text-blue-400 font-bpdots">
                                            {user.total_games > 0 ? Math.round(user.total_score / user.total_games) : 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60 font-bpdots text-sm">Last Played</span>
                                        <span className="text-white/80 font-bpdots text-xs">
                                            {user.last_played_at ? formatDate(user.last_played_at) : 'Never'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Stats */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                            <h3 className="text-lg font-bpdots text-white mb-4">DIFFICULTY BREAKDOWN</h3>
                            <div className="space-y-3">
                                {Object.values(GameDifficulty).map((difficulty) => {
                                    const gamesCount = (user as any)[`${difficulty}_games`]
                                    const bestScore = (user as any)[`${difficulty}_best_score`]
                                    const ranking = rankings[difficulty.toLowerCase() as keyof UserRankings]

                                    if (gamesCount === 0) return null

                                    return (
                                        <div key={difficulty} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                            <div>
                                                <div className={`font-bpdots ${getDifficultyColor(difficulty)}`}>
                                                    {GAME_CONFIGS[difficulty].name}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {gamesCount} games
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bpdots">Best: {bestScore}</div>
                                                {ranking && (
                                                    <div className="text-xs text-yellow-400 font-bpdots">
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
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                            <h3 className="text-lg font-bpdots text-white mb-4">RECENT GAMES</h3>
                            {gameHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-white/60 font-bpdots">No games played yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {gameHistory.map((game) => (
                                        <div key={game.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                            <div>
                                                <div className={`font-bpdots ${getDifficultyColor(game.difficulty as GameDifficulty)}`}>
                                                    {GAME_CONFIGS[game.difficulty as GameDifficulty]?.name || game.difficulty}
                                                </div>
                                                <div className="text-xs text-white/60 font-bpdots">
                                                    {formatDate(game.created_at)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bpdots ${game.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                            <h3 className="text-lg font-bpdots text-white mb-4">ACHIEVEMENTS</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {getAchievements().map((achievement, index) => {
                                    const Icon = achievement.icon
                                    return (
                                        <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                                            <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                                                <Icon size={20} className="text-yellow-400" />
                                            </div>
                                            <div>
                                                <div className="font-bpdots text-white">{achievement.name}</div>
                                                <div className="text-xs text-white/60 font-bpdots">{achievement.desc}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {getAchievements().length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-white/60 font-bpdots">Play more games to unlock achievements!</p>
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