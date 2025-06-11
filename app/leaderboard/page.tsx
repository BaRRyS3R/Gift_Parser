// src/app/leaderboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Crown, Medal, Award, Star, Trophy, TrendingUp } from 'lucide-react'
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
            case 1: return <Crown size={20} className="text-yellow-400" />
            case 2: return <Medal size={20} className="text-gray-300" />
            case 3: return <Award size={20} className="text-orange-400" />
            default: return <span className="text-white/60 font-bpdots text-sm">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-yellow-400/40'
            case 2: return 'bg-gradient-to-r from-gray-300/20 to-gray-500/20 border-gray-300/40'
            case 3: return 'bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-orange-400/40'
            default: return 'bg-white/5 border-white/10'
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
          flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300
          ${getRankBg(position)}
          ${isCurrentUser(entry.telegram_id)
                        ? 'ring-2 ring-blue-400/50 bg-blue-400/10'
                        : 'hover:bg-white/10'
                    }
        `}
            >
                {/* Rank */}
                <div className="flex items-center justify-center w-10">
                    {getRankIcon(position)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className={`font-bpdots font-semibold truncate ${isCurrentUser(entry.telegram_id) ? 'text-blue-400' : 'text-white'
                            }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <Star size={14} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-blue-400/20 text-blue-400 px-2 py-0.5 rounded-full font-bpdots">
                                YOU
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/60 font-bpdots">@{entry.username}</p>
                    )}
                </div>

                {/* Stats */}
                <div className="text-right space-y-1">
                    <div className={`text-lg font-bold font-bpdots ${score >= 25 ? 'text-green-400' :
                        score >= 15 ? 'text-yellow-400' :
                            score >= 0 ? 'text-white' : 'text-red-400'
                        }`}>
                        {score >= 0 ? '+' : ''}{score}
                    </div>
                    <div className="text-xs text-white/60 font-bpdots">
                        {games} games
                    </div>
                    {accuracy !== null && (
                        <div className="text-xs text-white/60 font-bpdots">
                            {accuracy}% acc
                        </div>
                    )}
                    <div className="text-xs text-white/40 font-bpdots">
                        {formatLastPlayed(entry.last_played_at)}
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Spinner size="lg" color="white" />
                    <p className="text-white font-bpdots">Loading leaderboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-red-400 font-bpdots">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg font-bpdots hover:bg-white/20"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const currentLeaderboard = activeTab === 'overall'
        ? overallLeaderboard
        : difficultyLeaderboards[activeTab] || []

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="pt-16 pb-6 px-6">
                <div className="text-center space-y-2 animate-fade-in">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Trophy size={24} className="text-yellow-400" />
                        <h1 className="text-3xl font-bold font-bpdots">LEADERBOARD</h1>
                    </div>
                    <p className="text-white/60 font-bpdots text-sm">
                        Compete with players worldwide
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-1">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('overall')}
                            className={`
                flex-shrink-0 px-4 py-2 rounded-lg font-bpdots text-sm transition-all duration-300
                ${activeTab === 'overall'
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/60 hover:text-white/80'
                                }
              `}
                        >
                            OVERALL
                        </button>
                        {Object.values(GameDifficulty).map((difficulty) => (
                            <button
                                key={difficulty}
                                onClick={() => setActiveTab(difficulty)}
                                className={`
                  flex-shrink-0 px-4 py-2 rounded-lg font-bpdots text-sm transition-all duration-300
                  ${activeTab === difficulty
                                        ? `bg-white/20 ${getDifficultyColor(difficulty)}`
                                        : `${getDifficultyColor(difficulty)}/60 hover:${getDifficultyColor(difficulty)}/80`
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
                    <div className="text-center py-12 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl">
                        <TrendingUp size={48} className="text-white/40 mx-auto mb-4" />
                        <p className="text-white/60 font-bpdots text-lg mb-2">No players yet</p>
                        <p className="text-white/40 font-bpdots text-sm">
                            Be the first to play and claim the top spot!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 animate-fade-in">
                        {/* Top 3 Highlight */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-6">
                                <h3 className="text-lg font-bpdots text-white mb-4 text-center">TOP PERFORMERS</h3>
                                <div className="space-y-3">
                                    {currentLeaderboard.slice(0, 3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 1, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rest of the leaderboard */}
                        {currentLeaderboard.length > 3 && (
                            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                                <h3 className="text-lg font-bpdots text-white mb-4">ALL PLAYERS</h3>
                                <div className="space-y-2">
                                    {currentLeaderboard.slice(3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 4, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User's position if not in top visible */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className="mt-6 bg-blue-400/10 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4">
                                <h4 className="text-sm font-bpdots text-blue-400 mb-3 text-center">YOUR POSITION</h4>
                                {(() => {
                                    const userPosition = currentLeaderboard.findIndex(entry =>
                                        entry.telegram_id === user.telegram_id
                                    )
                                    if (userPosition !== -1 && userPosition >= 10) {
                                        const userEntry = currentLeaderboard[userPosition]
                                        return renderLeaderboardEntry(userEntry, userPosition + 1, activeTab === 'overall')
                                    }
                                    return (
                                        <div className="text-center py-4">
                                            <p className="text-white/60 font-bpdots">
                                                Play some games to see your ranking!
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