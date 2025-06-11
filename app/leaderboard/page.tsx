// src/app/leaderboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Crown, Medal, Award, Star, Trophy, TrendingUp, Users, Zap, Target, Activity } from 'lucide-react'
import { userService, type LeaderboardEntry, type DifficultyLeaderboard } from '@/lib/supabase'
import { GameDifficulty, GAME_CONFIGS } from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import { Spinner } from '@nextui-org/react'

type LeaderboardType = 'overall' | GameDifficulty

export default function LeaderboardPage() {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState<LeaderboardType>('overall')
    const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
    const [difficultyLeaderboards, setDifficultyLeaderboards] = useState<{
        [key in GameDifficulty]?: DifficultyLeaderboard[]
    }>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadLeaderboards = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Загружаем общий лидерборд
                const overall = await userService.getLeaderboard(100)
                setOverallLeaderboard(overall)

                // Загружаем лидерборды по сложности
                const difficulties = Object.values(GameDifficulty)
                const difficultyBoards = await Promise.all(
                    difficulties.map(difficulty =>
                        userService.getDifficultyLeaderboard(difficulty, 50)
                    )
                )

                const difficultyLeaderboardsObj: { [key in GameDifficulty]?: DifficultyLeaderboard[] } = {}
                difficulties.forEach((difficulty, index) => {
                    difficultyLeaderboardsObj[difficulty] = difficultyBoards[index]
                })

                setDifficultyLeaderboards(difficultyLeaderboardsObj)
            } catch (err) {
                console.error('Error loading leaderboards:', err)
                setError('Failed to load leaderboard data')
            } finally {
                setIsLoading(false)
            }
        }

        loadLeaderboards()
    }, [])

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown size={24} className="text-yellow-400" />
            case 2: return <Medal size={24} className="text-gray-300" />
            case 3: return <Award size={24} className="text-orange-400" />
            default: return <span className="text-white/60 font-bpdots text-lg font-bold">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-gradient-to-br from-yellow-400/20 via-yellow-500/15 to-yellow-600/10 border-yellow-400/40 shadow-yellow-400/20'
            case 2: return 'bg-gradient-to-br from-gray-300/20 via-gray-400/15 to-gray-500/10 border-gray-300/40 shadow-gray-300/20'
            case 3: return 'bg-gradient-to-br from-orange-400/20 via-orange-500/15 to-orange-600/10 border-orange-400/40 shadow-orange-400/20'
            default: return 'bg-gradient-to-br from-white/10 to-white/5 border-white/10'
        }
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'text-green-400'
            case GameDifficulty.MEDIUM: return 'text-yellow-400'
            case GameDifficulty.HARD: return 'text-blue-400'
            case GameDifficulty.LEGENDARY: return 'text-orange-400'
            case GameDifficulty.OMG: return 'text-red-400'
            default: return 'text-white'
        }
    }

    const getDifficultyGradient = (difficulty: string) => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'from-green-400/20 to-green-600/10'
            case GameDifficulty.MEDIUM: return 'from-yellow-400/20 to-yellow-600/10'
            case GameDifficulty.HARD: return 'from-blue-400/20 to-blue-600/10'
            case GameDifficulty.LEGENDARY: return 'from-orange-400/20 to-orange-600/10'
            case GameDifficulty.OMG: return 'from-red-400/20 to-red-600/10'
            default: return 'from-white/20 to-white/10'
        }
    }

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId
    }

    const formatLastPlayed = (dateString?: string) => {
        if (!dateString) return 'Never'
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'Just now'
        if (diffInHours < 24) return `${diffInHours}h ago`
        return `${Math.floor(diffInHours / 24)}d ago`
    }

    const renderLeaderboardEntry = (
        entry: LeaderboardEntry | DifficultyLeaderboard,
        position: number,
        isOverall: boolean = true
    ) => {
        const score = isOverall
            ? (entry as LeaderboardEntry).best_score
            : (entry as DifficultyLeaderboard).difficulty_best_score

        const games = isOverall
            ? (entry as LeaderboardEntry).total_games
            : (entry as DifficultyLeaderboard).difficulty_games

        const accuracy = isOverall ? (entry as LeaderboardEntry).best_accuracy : null

        return (
            <div
                key={entry.id}
                className={`
          flex items-center space-x-4 p-5 rounded-2xl border transition-all duration-500 backdrop-blur-xl
          ${getRankBg(position)}
          ${position <= 3 ? 'shadow-2xl' : 'shadow-lg'}
          ${isCurrentUser(entry.telegram_id)
                        ? 'ring-2 ring-blue-400/60 bg-gradient-to-br from-blue-400/20 to-blue-600/10 transform scale-105'
                        : 'hover:bg-white/10 hover:scale-105 hover:shadow-xl'
                    }
        `}
                style={{
                    animationDelay: `${position * 0.05}s`
                }}
            >
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12">
                    {position <= 3 ? (
                        <div className="relative">
                            {getRankIcon(position)}
                            {position === 1 && (
                                <div className="absolute -inset-2 bg-yellow-400/20 rounded-full animate-pulse"></div>
                            )}
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center">
                            <span className="text-white/80 font-bpdots text-sm font-bold">#{position}</span>
                        </div>
                    )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                        <h3 className={`font-bpdots font-bold truncate text-lg ${isCurrentUser(entry.telegram_id)
                            ? 'text-blue-400'
                            : position <= 3
                                ? 'text-white'
                                : 'text-white/90'
                            }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 rounded-lg flex items-center justify-center">
                                    <Star size={14} className="text-yellow-400" />
                                </div>
                            </div>
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-gradient-to-r from-blue-400/30 to-blue-600/20 border border-blue-400/30 text-blue-400 px-3 py-1 rounded-full font-bpdots font-bold">
                                YOU
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/60 font-bpdots mt-1">@{entry.username}</p>
                    )}
                    <div className="text-xs text-white/50 font-bpdots mt-1">
                        {formatLastPlayed(entry.last_played_at)}
                    </div>
                </div>

                {/* Stats */}
                <div className="text-right space-y-2">
                    <div className={`text-2xl font-bold font-bpdots ${score >= 25 ? 'text-green-400' :
                            score >= 15 ? 'text-yellow-400' :
                                score >= 0 ? 'text-white' : 'text-red-400'
                        }`}>
                        {score >= 0 ? '+' : ''}{score}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-white/60 font-bpdots">
                        <div className="flex items-center space-x-1">
                            <Activity size={12} />
                            <span>{games}</span>
                        </div>
                        {accuracy !== null && (
                            <div className="flex items-center space-x-1">
                                <Target size={12} />
                                <span>{accuracy}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-green-500/5"></div>
                <div className="text-center space-y-6 relative z-10">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-yellow-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.1s' }}></div>
                        <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.2s', animationDirection: 'reverse' }}></div>
                    </div>
                    <p className="text-white font-bpdots text-xl">Loading leaderboard...</p>
                    <div className="flex space-x-1 justify-center">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-yellow-500/5"></div>
                <div className="text-center space-y-6 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-400/20 to-red-600/10 rounded-full flex items-center justify-center mx-auto">
                        <TrendingUp size={32} className="text-red-400" />
                    </div>
                    <div>
                        <p className="text-red-400 font-bpdots text-xl font-bold">{error}</p>
                        <p className="text-white/60 font-bpdots text-sm mt-2">Something went wrong while loading the leaderboard</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gradient-to-r from-red-400/20 to-red-600/20 border border-red-400/30 text-red-400 rounded-xl font-bpdots font-bold hover:bg-red-400/30 transition-all duration-300 hover:scale-105"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    const currentLeaderboard = activeTab === 'overall'
        ? overallLeaderboard
        : difficultyLeaderboards[activeTab] || []

    return (
        <div className="min-h-screen bg-black text-white pb-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-green-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-blue-400 to-green-400"></div>

            {/* Header */}
            <div className="relative pt-16 pb-8 px-6">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 rounded-2xl flex items-center justify-center shadow-lg">
                            <Trophy size={32} className="text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold font-bpdots bg-gradient-to-r from-yellow-400 via-white to-yellow-400 bg-clip-text text-transparent">
                                LEADERBOARD
                            </h1>
                            <p className="text-white/60 font-bpdots text-sm mt-1">
                                Compete with players worldwide
                            </p>
                        </div>
                    </div>

                    {currentLeaderboard.length > 0 && (
                        <div className="flex items-center justify-center space-x-6 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
                            <div className="flex items-center space-x-2">
                                <Users size={20} className="text-blue-400" />
                                <span className="text-white font-bpdots font-bold">{currentLeaderboard.length}</span>
                                <span className="text-white/60 font-bpdots text-sm">Players</span>
                            </div>
                            <div className="w-px h-6 bg-white/20"></div>
                            <div className="flex items-center space-x-2">
                                <Zap size={20} className="text-green-400" />
                                <span className="text-white font-bpdots font-bold">
                                    {currentLeaderboard[0] ? (activeTab === 'overall'
                                        ? (currentLeaderboard[0] as LeaderboardEntry).best_score
                                        : (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score)
                                        : '0'}
                                </span>
                                <span className="text-white/60 font-bpdots text-sm">Top Score</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-8">
                <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-2">
                    <div className="flex overflow-x-auto scrollbar-hide space-x-2">
                        <button
                            onClick={() => setActiveTab('overall')}
                            className={`
                flex-shrink-0 px-6 py-3 rounded-xl font-bpdots text-sm font-bold transition-all duration-300
                ${activeTab === 'overall'
                                    ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg transform scale-105'
                                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                                }
              `}
                        >
                            <div className="flex items-center space-x-2">
                                <Trophy size={16} />
                                <span>OVERALL</span>
                            </div>
                        </button>
                        {Object.values(GameDifficulty).map((difficulty) => (
                            <button
                                key={difficulty}
                                onClick={() => setActiveTab(difficulty)}
                                className={`
                  flex-shrink-0 px-4 py-3 rounded-xl font-bpdots text-sm font-bold transition-all duration-300
                  ${activeTab === difficulty
                                        ? `bg-gradient-to-r ${getDifficultyGradient(difficulty)} ${getDifficultyColor(difficulty)} shadow-lg transform scale-105 border border-white/20`
                                        : `${getDifficultyColor(difficulty)}/60 hover:${getDifficultyColor(difficulty)}/80 hover:bg-white/5`
                                    }
                `}
                            >
                                {GAME_CONFIGS[difficulty].name.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leaderboard Content */}
            <div className="px-6">
                {currentLeaderboard.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl">
                        <div className="w-24 h-24 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <TrendingUp size={48} className="text-white/40" />
                        </div>
                        <p className="text-white/60 font-bpdots text-2xl mb-3 font-bold">No players yet</p>
                        <p className="text-white/40 font-bpdots text-sm max-w-md mx-auto">
                            Be the first to play and claim the top spot on the leaderboard!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Top 3 Podium */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-8">
                                <div className="flex items-center space-x-3 mb-8">
                                    <Crown size={28} className="text-yellow-400" />
                                    <h3 className="text-2xl font-bpdots text-white font-bold">TOP CHAMPIONS</h3>
                                </div>
                                <div className="space-y-4">
                                    {currentLeaderboard.slice(0, 3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 1, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rest of the leaderboard */}
                        {currentLeaderboard.length > 3 && (
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
                                <div className="flex items-center space-x-3 mb-8">
                                    <Users size={28} className="text-blue-400" />
                                    <h3 className="text-2xl font-bpdots text-white font-bold">ALL PLAYERS</h3>
                                </div>
                                <div className="space-y-3">
                                    {currentLeaderboard.slice(3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 4, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User's position if not in top visible */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className="bg-gradient-to-br from-blue-400/20 to-blue-600/10 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-8">
                                <h4 className="text-lg font-bpdots text-blue-400 mb-6 text-center font-bold flex items-center justify-center space-x-2">
                                    <Target size={20} />
                                    <span>YOUR POSITION</span>
                                </h4>
                                {(() => {
                                    const userPosition = currentLeaderboard.findIndex(entry =>
                                        entry.telegram_id === user.telegram_id
                                    )
                                    if (userPosition !== -1 && userPosition >= 10) {
                                        const userEntry = currentLeaderboard[userPosition]
                                        return renderLeaderboardEntry(userEntry, userPosition + 1, activeTab === 'overall')
                                    }
                                    return (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400/30 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Activity size={32} className="text-blue-400" />
                                            </div>
                                            <p className="text-white/60 font-bpdots text-lg font-bold">
                                                Play some games to see your ranking!
                                            </p>
                                            <p className="text-white/40 font-bpdots text-sm mt-2">
                                                Start competing and climb the leaderboard
                                            </p>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}