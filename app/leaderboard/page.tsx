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

                const overall = await userService.getLeaderboard(50)
                setOverallLeaderboard(overall)

                const difficulties = Object.values(GameDifficulty)
                const difficultyBoards = await Promise.all(
                    difficulties.map(difficulty =>
                        userService.getDifficultyLeaderboard(difficulty, 30)
                    )
                )

                const difficultyLeaderboardsObj: { [key in GameDifficulty]?: DifficultyLeaderboard[] } = {}
                difficulties.forEach((difficulty, index) => {
                    difficultyLeaderboardsObj[difficulty] = difficultyBoards[index]
                })

                setDifficultyLeaderboards(difficultyLeaderboardsObj)
            } catch (err) {
                console.error('Error loading leaderboards:', err)
                setError('ERR0R: F41LED T0 L0AD RANK1NG D4TA')
            } finally {
                setIsLoading(false)
            }
        }

        loadLeaderboards()
    }, [])

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown size={18} className="text-white" />
            case 2: return <Medal size={18} className="text-white/80" />
            case 3: return <Award size={18} className="text-white/60" />
            default: return <span className="text-white/60 font-bpdots text-sm font-bold">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-white/20 border-white/40'
            case 2: return 'bg-white/15 border-white/30'
            case 3: return 'bg-white/10 border-white/25'
            default: return 'bg-white/5 border-white/20'
        }
    }

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId
    }

    const formatLastPlayed = (dateString?: string) => {
        if (!dateString) return 'N3V3R'
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'N0W'
        if (diffInHours < 24) return `${diffInHours}h`
        return `${Math.floor(diffInHours / 24)}d`
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'N00B'
            case GameDifficulty.MEDIUM: return 'C4SU4L'
            case GameDifficulty.HARD: return 'PR0'
            case GameDifficulty.LEGENDARY: return 'L3G3ND'
            case GameDifficulty.OMG: return '0MG'
            case GameDifficulty.NIGHTMARE: return 'N1GHT|M4RE'
            case GameDifficulty.IMPOSSIBLE: return 'R4GE M0DE'
        }
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
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
          ${getRankBg(position)}
          ${isCurrentUser(entry.telegram_id)
                        ? 'ring-1 ring-white/40 bg-white/15'
                        : 'hover:bg-white/10'
                    }
        `}
            >
                <div className="flex items-center justify-center w-8">
                    {getRankIcon(position)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className={`font-bpdots font-bold truncate text-sm ${isCurrentUser(entry.telegram_id) ? 'text-white' : 'text-white/90'
                            }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <Star size={12} className="text-white/60 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bpdots">
                                Y0U
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/50 font-bpdots truncate">@{entry.username}</p>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-lg font-bold font-bpdots text-white">
                        {score >= 0 ? '+' : ''}{score}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-white/60 font-bpdots">
                        <div className="flex items-center space-x-1">
                            <Activity size={10} />
                            <span>{games}</span>
                        </div>
                        {accuracy !== null && (
                            <div className="flex items-center space-x-1">
                                <Target size={10} />
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-bpdots">L0AD1NG RANK1NG D4TA...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <TrendingUp size={32} className="text-white/60 mx-auto" />
                    <p className="text-white/80 font-bpdots">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/20 text-white rounded-lg font-bpdots hover:bg-white/30 transition-colors"
                    >
                        R3TRY
                    </button>
                </div>
            </div>
        )
    }

    const currentLeaderboard = activeTab === 'overall'
        ? overallLeaderboard
        : difficultyLeaderboards[activeTab] || []

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            {/* Header */}
            <div className="mb-4">
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Trophy size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold font-bpdots text-white">RANK1NG SY5T3M</h1>
                    </div>

                    {currentLeaderboard.length > 0 && (
                        <div className="flex items-center justify-center space-x-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-sm">
                            <div className="flex items-center space-x-1">
                                <Users size={14} className="text-white/60" />
                                <span className="text-white font-bpdots font-bold">{currentLeaderboard.length}</span>
                                <span className="text-white/60 font-bpdots">US3RS</span>
                            </div>
                            <div className="w-px h-4 bg-white/20"></div>
                            <div className="flex items-center space-x-1">
                                <Zap size={14} className="text-white/60" />
                                <span className="text-white font-bpdots font-bold">
                                    {currentLeaderboard[0] ? (activeTab === 'overall'
                                        ? (currentLeaderboard[0] as LeaderboardEntry).best_score
                                        : (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score)
                                        : '0'}
                                </span>
                                <span className="text-white/60 font-bpdots">T0P</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-1">
                    <div className="flex overflow-x-auto scrollbar-hide space-x-1">
                        <button
                            onClick={() => setActiveTab('overall')}
                            className={`
                flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                ${activeTab === 'overall'
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/60 hover:text-white/80'
                                }
              `}
                        >
                            <div className="flex items-center space-x-1">
                                <Trophy size={12} />
                                <span>0V3R4LL</span>
                            </div>
                        </button>
                        {Object.values(GameDifficulty).map((difficulty) => (
                            <button
                                key={difficulty}
                                onClick={() => setActiveTab(difficulty)}
                                className={`
                  flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                  ${activeTab === difficulty
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white/80'
                                    }
                `}
                            >
                                {getDifficultyDisplayName(difficulty)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leaderboard Content */}
            <div className="space-y-3">
                {currentLeaderboard.length === 0 ? (
                    <div className="text-center py-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg">
                        <TrendingUp size={32} className="text-white/40 mx-auto mb-3" />
                        <p className="text-white/60 font-bpdots font-bold">N0 PL4Y3RS Y3T</p>
                        <p className="text-white/40 font-bpdots text-sm mt-1">
                            B3 TH3 F1RST T0 PL4Y!
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Top 3 */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-4 mb-3">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Crown size={16} className="text-white/80" />
                                    <h3 className="text-sm font-bpdots text-white font-bold">T0P PL4Y3RS</h3>
                                </div>
                                <div className="space-y-2">
                                    {currentLeaderboard.slice(0, 3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 1, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* All Players */}
                        {currentLeaderboard.length > 3 && (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Users size={16} className="text-white/80" />
                                    <h3 className="text-sm font-bpdots text-white font-bold">4LL PL4Y3RS</h3>
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {currentLeaderboard.slice(3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 4, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Position */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-lg p-4">
                                <h4 className="text-sm font-bpdots text-white mb-3 text-center font-bold flex items-center justify-center space-x-2">
                                    <Target size={14} />
                                    <span>Y0UR P0S1T10N</span>
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
                                        <div className="text-center py-4">
                                            <Activity size={20} className="text-white/60 mx-auto mb-2" />
                                            <p className="text-white/60 font-bpdots text-sm font-bold">
                                                PL4Y G4M3S T0 S33 Y0UR R4NK1NG!
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