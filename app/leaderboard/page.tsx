// src/app/leaderboard/page.tsx - Enhanced with Updated Difficulty System

'use client'

import { useState, useEffect } from 'react'
import { Crown, Medal, Award, Star, Trophy, TrendingUp, Users, Zap, Target, Activity, Clock, Crosshair, AlertTriangle, UserCheck, Flame, Skull } from 'lucide-react'
import { userService, type LeaderboardEntry, type DifficultyLeaderboard, type PrecisionLeaderboard } from '@/lib/supabase'
import { GameDifficulty, GAME_CONFIGS } from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import { Spinner } from '@nextui-org/react'
import { formatPrecisionTime } from '@/utils/gameUtils'

type LeaderboardType = 'overall' | 'precision' | GameDifficulty

export default function LeaderboardPage() {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState<LeaderboardType>('overall')
    const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
    const [precisionLeaderboard, setPrecisionLeaderboard] = useState<PrecisionLeaderboard[]>([])
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

                const [overall, precision] = await Promise.all([
                    userService.getLeaderboard(50),
                    userService.getPrecisionLeaderboard(50)
                ])

                setOverallLeaderboard(overall)
                setPrecisionLeaderboard(precision)

                const standardDifficulties = Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION)
                const difficultyBoards = await Promise.all(
                    standardDifficulties.map(difficulty =>
                        userService.getDifficultyLeaderboard(difficulty, 30)
                    )
                )

                const difficultyLeaderboardsObj: { [key in GameDifficulty]?: DifficultyLeaderboard[] } = {}
                standardDifficulties.forEach((difficulty, index) => {
                    difficultyLeaderboardsObj[difficulty] = difficultyBoards[index]
                })

                setDifficultyLeaderboards(difficultyLeaderboardsObj)
            } catch (err) {
                console.error('Error loading leaderboards:', err)
                setError('FAILED TO LOAD RANKING DATA')
            } finally {
                setIsLoading(false)
            }
        }

        loadLeaderboards()
    }, [])

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown size={18} className="text-yellow-400" />
            case 2: return <Medal size={18} className="text-gray-300" />
            case 3: return <Award size={18} className="text-amber-600" />
            default: return <span className="text-white/60 font-bpdots text-sm font-bold">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-yellow-500/20 border-yellow-400/40'
            case 2: return 'bg-gray-400/20 border-gray-300/40'
            case 3: return 'bg-amber-600/20 border-amber-500/40'
            default: return 'bg-white/5 border-white/20'
        }
    }

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId
    }

    const formatLastPlayed = (dateString?: string) => {
        if (!dateString) return 'NEVER'
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'NOW'
        if (diffInHours < 24) return `${diffInHours}h`
        return `${Math.floor(diffInHours / 24)}d`
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

    const getDifficultyIcon = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return Award     // VETERAN
            case GameDifficulty.OMG: return Flame          // MANIAC
            case GameDifficulty.NIGHTMARE: return Skull    // DEMON
            case GameDifficulty.IMPOSSIBLE: return Crown   // GODLIKE
            case GameDifficulty.PRECISION: return Crosshair
            default: return Target
        }
    }

    const getDifficultyColor = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return 'text-blue-400'  // VETERAN
            case GameDifficulty.OMG: return 'text-orange-400'      // MANIAC
            case GameDifficulty.NIGHTMARE: return 'text-purple-400' // DEMON
            case GameDifficulty.IMPOSSIBLE: return 'text-yellow-400' // GODLIKE
            case GameDifficulty.PRECISION: return 'text-red-400'
            default: return 'text-white'
        }
    }

    const getDifficultyTabColors = (difficulty: GameDifficulty, isActive: boolean) => {
        const baseColors = {
            [GameDifficulty.LEGENDARY]: {
                active: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
                inactive: 'text-blue-400/60 hover:text-blue-400/80'
            },
            [GameDifficulty.OMG]: {
                active: 'bg-orange-500/20 text-orange-300 border border-orange-400/30',
                inactive: 'text-orange-400/60 hover:text-orange-400/80'
            },
            [GameDifficulty.NIGHTMARE]: {
                active: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
                inactive: 'text-purple-400/60 hover:text-purple-400/80'
            },
            [GameDifficulty.IMPOSSIBLE]: {
                active: 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30',
                inactive: 'text-yellow-400/60 hover:text-yellow-400/80'
            },
            [GameDifficulty.PRECISION]: {
                active: 'bg-red-500/20 text-red-300 border border-red-400/30',
                inactive: 'text-red-400/60 hover:text-red-400/80'
            }
        }

        return isActive ? baseColors[difficulty].active : baseColors[difficulty].inactive
    }

    const renderStandardLeaderboardEntry = (
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
                            <Star size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bpdots">
                                YOU
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

    const renderPrecisionLeaderboardEntry = (entry: PrecisionLeaderboard, position: number) => {
        return (
            <div
                key={entry.id}
                className={`
                    flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
                    ${position <= 3
                        ? 'bg-red-500/20 border-red-400/40'
                        : 'bg-red-500/10 border-red-400/30'
                    }
                    ${isCurrentUser(entry.telegram_id)
                        ? 'ring-1 ring-red-400/60 bg-red-500/25'
                        : 'hover:bg-red-500/15'
                    }
                `}
            >
                <div className="flex items-center justify-center w-8">
                    {position <= 3 ? getRankIcon(position) : (
                        <span className="text-red-300/80 font-bpdots text-sm font-bold">#{position}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className={`font-bpdots font-bold truncate text-sm ${isCurrentUser(entry.telegram_id) ? 'text-red-200' : 'text-red-300'
                            }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <Star size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-red-500/30 text-red-200 px-2 py-0.5 rounded font-bpdots border border-red-400/30">
                                YOU
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-red-300/60 font-bpdots truncate">@{entry.username}</p>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-lg font-bold font-bpdots text-red-300">
                        {formatPrecisionTime(entry.best_survival_time)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-red-400/80 font-bpdots">
                        <div className="flex items-center space-x-1">
                            <Zap size={10} />
                            <span>L{entry.max_intensity}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Target size={10} />
                            <span>{entry.best_streak}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Activity size={10} />
                            <span>{entry.total_precision_games}</span>
                        </div>
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
                    <p className="text-white font-bpdots">LOADING RANKING DATA...</p>
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
                        RETRY
                    </button>
                </div>
            </div>
        )
    }

    const getCurrentLeaderboard = () => {
        if (activeTab === 'overall') return overallLeaderboard
        if (activeTab === 'precision') return precisionLeaderboard
        return difficultyLeaderboards[activeTab] || []
    }

    const currentLeaderboard = getCurrentLeaderboard()
    const isPrecisionTab = activeTab === 'precision'

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            {/* Header */}
            <div className="mb-4">
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPrecisionTab ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/20'
                            }`}>
                            {isPrecisionTab ? (
                                <Crosshair size={20} className="text-red-400" />
                            ) : (
                                <Trophy size={20} className="text-white" />
                            )}
                        </div>
                        <h1 className={`text-2xl font-bold font-bpdots ${isPrecisionTab ? 'text-red-300' : 'text-white'
                            }`}>
                            {isPrecisionTab ? 'PRECISION RANKINGS' : 'RANKING SYSTEM'}
                        </h1>
                    </div>

                    {currentLeaderboard.length > 0 && (
                        <div className={`flex items-center justify-center space-x-4 backdrop-blur-xl border rounded-lg p-2 text-sm ${isPrecisionTab
                                ? 'bg-red-500/10 border-red-400/30'
                                : 'bg-white/10 border-white/20'
                            }`}>
                            <div className="flex items-center space-x-1">
                                <Users size={14} className={isPrecisionTab ? 'text-red-400/80' : 'text-white/60'} />
                                <span className={`font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'}`}>
                                    {currentLeaderboard.length}
                                </span>
                                <span className={`font-bpdots ${isPrecisionTab ? 'text-red-400/80' : 'text-white/60'}`}>
                                    USERS
                                </span>
                            </div>
                            <div className={`w-px h-4 ${isPrecisionTab ? 'bg-red-400/30' : 'bg-white/20'}`}></div>
                            <div className="flex items-center space-x-1">
                                {isPrecisionTab ? (
                                    <Clock size={14} className="text-red-400/80" />
                                ) : (
                                    <Zap size={14} className="text-white/60" />
                                )}
                                <span className={`font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'}`}>
                                    {currentLeaderboard[0] ? (
                                        isPrecisionTab
                                            ? formatPrecisionTime((currentLeaderboard[0] as PrecisionLeaderboard).best_survival_time)
                                            : (activeTab === 'overall'
                                                ? (currentLeaderboard[0] as LeaderboardEntry).best_score
                                                : (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score)
                                    ) : '0'}
                                </span>
                                <span className={`font-bpdots ${isPrecisionTab ? 'text-red-400/80' : 'text-white/60'}`}>
                                    {isPrecisionTab ? 'BEST' : 'TOP'}
                                </span>
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
                                <span>OVERALL</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('precision')}
                            className={`
                                flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                                ${getDifficultyTabColors(GameDifficulty.PRECISION, activeTab === 'precision')}
                            `}
                        >
                            <div className="flex items-center space-x-1">
                                <Crosshair size={12} />
                                <span>PRECISION</span>
                            </div>
                        </button>

                        {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => {
                            const Icon = getDifficultyIcon(difficulty)

                            return (
                                <button
                                    key={difficulty}
                                    onClick={() => setActiveTab(difficulty)}
                                    className={`
                                        flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                                        ${getDifficultyTabColors(difficulty, activeTab === difficulty)}
                                    `}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Icon size={12} />
                                        <span>{getDifficultyDisplayName(difficulty)}</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Leaderboard Content */}
            <div className="space-y-3">
                {currentLeaderboard.length === 0 ? (
                    <div className={`text-center py-8 backdrop-blur-xl border rounded-lg ${isPrecisionTab
                            ? 'bg-red-500/10 border-red-400/30'
                            : 'bg-white/10 border-white/20'
                        }`}>
                        {isPrecisionTab ? (
                            <AlertTriangle size={32} className="text-red-400/60 mx-auto mb-3" />
                        ) : (
                            <TrendingUp size={32} className="text-white/40 mx-auto mb-3" />
                        )}
                        <p className={`font-bpdots font-bold ${isPrecisionTab ? 'text-red-300/80' : 'text-white/60'}`}>
                            {isPrecisionTab ? 'NO PRECISION WARRIORS YET' : 'NO PLAYERS YET'}
                        </p>
                        <p className={`font-bpdots text-sm mt-1 ${isPrecisionTab ? 'text-red-400/60' : 'text-white/40'}`}>
                            {isPrecisionTab ? 'DARE TO BE THE FIRST!' : 'BE THE FIRST TO PLAY!'}
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Top 3 Section */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 mb-3 ${isPrecisionTab
                                    ? 'bg-red-500/10 border-red-400/30'
                                    : 'bg-white/10 border-white/20'
                                }`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <Crown size={16} className={isPrecisionTab ? 'text-red-400' : 'text-white/80'} />
                                    <h3 className={`text-sm font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'
                                        }`}>
                                        {isPrecisionTab ? 'PRECISION ELITE' : 'TOP PLAYERS'}
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {currentLeaderboard.slice(0, 3).map((entry, index) =>
                                        isPrecisionTab
                                            ? renderPrecisionLeaderboardEntry(entry as PrecisionLeaderboard, index + 1)
                                            : renderStandardLeaderboardEntry(entry as LeaderboardEntry, index + 1, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* All Players Section */}
                        {currentLeaderboard.length > 3 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 ${isPrecisionTab
                                    ? 'bg-red-500/10 border-red-400/30'
                                    : 'bg-white/10 border-white/20'
                                }`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <Users size={16} className={isPrecisionTab ? 'text-red-400' : 'text-white/80'} />
                                    <h3 className={`text-sm font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'
                                        }`}>
                                        {isPrecisionTab ? 'ALL PRECISION PLAYERS' : 'ALL PLAYERS'}
                                    </h3>
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {currentLeaderboard.slice(3).map((entry, index) =>
                                        isPrecisionTab
                                            ? renderPrecisionLeaderboardEntry(entry as PrecisionLeaderboard, index + 4)
                                            : renderStandardLeaderboardEntry(entry as LeaderboardEntry, index + 4, activeTab === 'overall')
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Position Section */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 ${isPrecisionTab
                                    ? 'bg-red-500/15 border-red-400/40'
                                    : 'bg-white/15 border-white/25'
                                }`}>
                                <h4 className={`text-sm font-bpdots font-bold mb-3 text-center flex items-center justify-center space-x-2 ${isPrecisionTab ? 'text-red-300' : 'text-white'
                                    }`}>
                                    <Target size={14} />
                                    <span>YOUR POSITION</span>
                                </h4>
                                {(() => {
                                    const userPosition = currentLeaderboard.findIndex(entry =>
                                        entry.telegram_id === user.telegram_id
                                    )
                                    if (userPosition !== -1 && userPosition >= 10) {
                                        const userEntry = currentLeaderboard[userPosition]
                                        return isPrecisionTab
                                            ? renderPrecisionLeaderboardEntry(userEntry as PrecisionLeaderboard, userPosition + 1)
                                            : renderStandardLeaderboardEntry(userEntry as LeaderboardEntry, userPosition + 1, activeTab === 'overall')
                                    }
                                    return (
                                        <div className="text-center py-4">
                                            {isPrecisionTab ? (
                                                <Crosshair size={20} className="text-red-400/60 mx-auto mb-2" />
                                            ) : (
                                                <Activity size={20} className="text-white/60 mx-auto mb-2" />
                                            )}
                                            <p className={`font-bpdots text-sm font-bold ${isPrecisionTab ? 'text-red-300/80' : 'text-white/60'
                                                }`}>
                                                {isPrecisionTab
                                                    ? 'SURVIVE PRECISION MODE TO SEE YOUR RANKING!'
                                                    : 'PLAY GAMES TO SEE YOUR RANKING!'
                                                }
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