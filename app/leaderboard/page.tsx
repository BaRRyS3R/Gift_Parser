// src/app/leaderboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import {
    Crown, Medal, Award, Star, Trophy, TrendingUp, Users, Zap, Target, Activity,
    RotateCcw, Crosshair, AlertTriangle, Brain, Gauge, FlameIcon, Clock, Sparkles
} from 'lucide-react'
import { userService, type LeaderboardEntry, type DifficultyLeaderboard, type ModeLeaderboard } from '@/lib/supabase'
import { GameDifficulty, GameMode, SkillLevel } from '@/types/game'
import { GAME_CONFIGS } from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import { Spinner } from '@nextui-org/react'

type LeaderboardType = 'overall' | 'efficiency' | 'skill' | GameDifficulty | GameMode

export default function LeaderboardPage() {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState<LeaderboardType>('overall')
    const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
    const [difficultyLeaderboards, setDifficultyLeaderboards] = useState<{
        [key in GameDifficulty]?: DifficultyLeaderboard[]
    }>({})
    const [modeLeaderboards, setModeLeaderboards] = useState<{
        [key in GameMode]?: ModeLeaderboard[]
    }>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadLeaderboards = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Загружаем общий лидерборд
                const overall = await userService.getLeaderboard(50)
                setOverallLeaderboard(overall)

                // Загружаем лидерборды по сложности
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

                // Загружаем лидерборды по режимам
                const modes = Object.values(GameMode)
                const modeBoards = await Promise.all(
                    modes.map(mode =>
                        userService.getModeLeaderboard(mode, 30)
                    )
                )

                const modeLeaderboardsObj: { [key in GameMode]?: ModeLeaderboard[] } = {}
                modes.forEach((mode, index) => {
                    modeLeaderboardsObj[mode] = modeBoards[index]
                })
                setModeLeaderboards(modeLeaderboardsObj)

            } catch (err) {
                console.error('Error loading leaderboards:', err)
                setError('ERROR: FAILED TO LOAD RANKING DATA')
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
            case 3: return <Award size={18} className="text-orange-400" />
            default: return <span className="text-white/60 font-bpdots text-sm font-bold">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-yellow-500/20 border-yellow-400/40 shadow-lg shadow-yellow-500/20'
            case 2: return 'bg-gray-500/20 border-gray-400/40 shadow-lg shadow-gray-500/20'
            case 3: return 'bg-orange-500/20 border-orange-400/40 shadow-lg shadow-orange-500/20'
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

    const getTabIcon = (tab: LeaderboardType) => {
        switch (tab) {
            case 'overall': return Trophy
            case 'efficiency': return Gauge
            case 'skill': return Brain
            case GameMode.NORMAL: return Target
            case GameMode.REVERSE: return RotateCcw
            case GameMode.PRECISION: return Crosshair
            case GameMode.REVERSE_PRECISION: return AlertTriangle
            default: return Target
        }
    }

    const getTabColor = (tab: LeaderboardType) => {
        switch (tab) {
            case GameMode.REVERSE: return 'text-purple-400'
            case GameMode.PRECISION: return 'text-red-400'
            case GameMode.REVERSE_PRECISION: return 'text-orange-400'
            case 'efficiency': return 'text-green-400'
            case 'skill': return 'text-blue-400'
            default: return 'text-white'
        }
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
            case GameDifficulty.REVERSE_EASY: return 'REV EASY'
            case GameDifficulty.REVERSE_MEDIUM: return 'REV MED'
            case GameDifficulty.REVERSE_HARD: return 'REV HARD'
            case GameDifficulty.CHAOS_REVERSE: return 'CHAOS'
            case GameDifficulty.PRECISION_EASY: return 'PREC EASY'
            case GameDifficulty.PRECISION_MEDIUM: return 'PREC MED'
            case GameDifficulty.PRECISION_HARD: return 'PREC HARD'
            case GameDifficulty.ULTIMATE_PRECISION: return 'ULTIMATE'
        }
    }

    const getModeDisplayName = (mode: GameMode): string => {
        switch (mode) {
            case GameMode.NORMAL: return 'STANDARD'
            case GameMode.REVERSE: return 'REVERSE'
            case GameMode.PRECISION: return 'PRECISION'
            case GameMode.REVERSE_PRECISION: return 'HYBRID'
        }
    }

    const renderLeaderboardEntry = (
        entry: LeaderboardEntry | DifficultyLeaderboard | ModeLeaderboard,
        position: number,
        type: 'overall' | 'difficulty' | 'mode' | 'efficiency' | 'skill' = 'overall'
    ) => {
        let score = 0
        let games = 0
        let accuracy = 0
        let efficiency = 0
        let skillLevel: SkillLevel | undefined

        if (type === 'overall') {
            const e = entry as LeaderboardEntry
            score = e.best_score
            games = e.total_games
            accuracy = e.best_accuracy
            efficiency = e.best_efficiency_rating || 0
            skillLevel = e.highest_skill_level
        } else if (type === 'difficulty') {
            const e = entry as DifficultyLeaderboard
            score = e.difficulty_best_score
            games = e.difficulty_games
        } else if (type === 'mode') {
            const e = entry as ModeLeaderboard
            score = e.mode_best_score
            games = e.mode_games
            efficiency = e.mode_best_efficiency || 0
        } else if (type === 'efficiency') {
            const e = entry as LeaderboardEntry
            score = e.best_efficiency_rating || 0
            games = e.total_games
            accuracy = e.best_accuracy
        } else if (type === 'skill') {
            const e = entry as LeaderboardEntry
            score = e.best_score // For display purposes
            games = e.total_games
            accuracy = e.best_accuracy
            skillLevel = e.highest_skill_level
        }

        return (
            <div
                key={entry.id}
                className={`
                    flex items-center space-x-3 p-4 rounded-xl border transition-all duration-300 backdrop-blur-xl
                    ${getRankBg(position)}
                    ${isCurrentUser(entry.telegram_id)
                        ? 'ring-2 ring-white/40 bg-white/15'
                        : 'hover:bg-white/10'
                    }
                `}
            >
                <div className="flex items-center justify-center w-10">
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
                            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bpdots">
                                YOU
                            </span>
                        )}
                        {skillLevel && (
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/20 font-bpdots ${getSkillLevelColor(skillLevel)}`}>
                                {skillLevel.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/50 font-bpdots truncate">@{entry.username}</p>
                    )}
                </div>

                <div className="text-right space-y-1">
                    <div className="text-lg font-bold font-bpdots text-white">
                        {type === 'efficiency' ? `${score}%` : (score >= 0 ? '+' : '')}{type === 'efficiency' ? '' : score}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-white/60 font-bpdots">
                        <div className="flex items-center space-x-1">
                            <Activity size={10} />
                            <span>{games}</span>
                        </div>
                        {type === 'overall' && accuracy > 0 && (
                            <div className="flex items-center space-x-1">
                                <Target size={10} />
                                <span>{accuracy}%</span>
                            </div>
                        )}
                        {efficiency > 0 && type !== 'efficiency' && (
                            <div className="flex items-center space-x-1">
                                <Gauge size={10} />
                                <span>{efficiency}E</span>
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
        switch (activeTab) {
            case 'overall':
                return overallLeaderboard
            case 'efficiency':
                return [...overallLeaderboard].sort((a, b) => (b.best_efficiency_rating || 0) - (a.best_efficiency_rating || 0))
            case 'skill':
                const skillOrder = {
                    [SkillLevel.LEGENDARY]: 7,
                    [SkillLevel.MASTER]: 6,
                    [SkillLevel.EXPERT]: 5,
                    [SkillLevel.ADVANCED]: 4,
                    [SkillLevel.INTERMEDIATE]: 3,
                    [SkillLevel.NOVICE]: 2,
                    [SkillLevel.BEGINNER]: 1
                }
                return [...overallLeaderboard].sort((a, b) => {
                    const aLevel = skillOrder[a.highest_skill_level as SkillLevel] || 0
                    const bLevel = skillOrder[b.highest_skill_level as SkillLevel] || 0
                    if (aLevel !== bLevel) return bLevel - aLevel
                    return b.best_score - a.best_score
                })
            default:
                if (Object.values(GameDifficulty).includes(activeTab as GameDifficulty)) {
                    return difficultyLeaderboards[activeTab as GameDifficulty] || []
                }
                if (Object.values(GameMode).includes(activeTab as GameMode)) {
                    return modeLeaderboards[activeTab as GameMode] || []
                }
                return []
        }
    }

    const currentLeaderboard = getCurrentLeaderboard()
    const getLeaderboardType = (): 'overall' | 'difficulty' | 'mode' | 'efficiency' | 'skill' => {
        if (activeTab === 'efficiency') return 'efficiency'
        if (activeTab === 'skill') return 'skill'
        if (Object.values(GameDifficulty).includes(activeTab as GameDifficulty)) return 'difficulty'
        if (Object.values(GameMode).includes(activeTab as GameMode)) return 'mode'
        return 'overall'
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            {/* Header */}
            <div className="mb-6">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Trophy size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-bpdots text-white">LEADERBOARDS</h1>
                    </div>

                    {currentLeaderboard.length > 0 && (
                        <div className="flex items-center justify-center space-x-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-sm">
                            <div className="flex items-center space-x-2">
                                <Users size={16} className="text-white/60" />
                                <span className="text-white font-bpdots font-bold">{currentLeaderboard.length}</span>
                                <span className="text-white/60 font-bpdots">PLAYERS</span>
                            </div>
                            <div className="w-px h-4 bg-white/20"></div>
                            <div className="flex items-center space-x-2">
                                <Zap size={16} className="text-white/60" />
                                <span className="text-white font-bpdots font-bold">
                                    {currentLeaderboard[0] ?
                                        (getLeaderboardType() === 'difficulty' ?
                                            (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score :
                                            getLeaderboardType() === 'mode' ?
                                                (currentLeaderboard[0] as ModeLeaderboard).mode_best_score :
                                                getLeaderboardType() === 'efficiency' ?
                                                    `${(currentLeaderboard[0] as LeaderboardEntry).best_efficiency_rating || 0}%` :
                                                    (currentLeaderboard[0] as LeaderboardEntry).best_score)
                                        : '0'}
                                </span>
                                <span className="text-white/60 font-bpdots">TOP SCORE</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex overflow-x-auto scrollbar-hide space-x-1">

                        {/* Main tabs */}
                        {['overall', 'efficiency', 'skill'].map((tab) => {
                            const Icon = getTabIcon(tab as LeaderboardType)
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as LeaderboardType)}
                                    className={`
                                        flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300 flex items-center space-x-1
                                        ${activeTab === tab
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/60 hover:text-white/80'
                                        }
                                    `}
                                >
                                    <Icon size={12} className={getTabColor(tab as LeaderboardType)} />
                                    <span>{tab.toUpperCase()}</span>
                                </button>
                            )
                        })}

                        <div className="flex-shrink-0 w-px h-6 bg-white/20 my-1"></div>

                        {/* Mode tabs */}
                        {Object.values(GameMode).map((mode) => {
                            const Icon = getTabIcon(mode)
                            return (
                                <button
                                    key={mode}
                                    onClick={() => setActiveTab(mode)}
                                    className={`
                                        flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300 flex items-center space-x-1
                                        ${activeTab === mode
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/60 hover:text-white/80'
                                        }
                                    `}
                                >
                                    <Icon size={12} className={getTabColor(mode)} />
                                    <span>{getModeDisplayName(mode)}</span>
                                </button>
                            )
                        })}

                        <div className="flex-shrink-0 w-px h-6 bg-white/20 my-1"></div>

                        {/* Difficulty tabs */}
                        {Object.values(GameDifficulty).slice(0, 7).map((difficulty) => (
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
            <div className="space-y-4">
                {currentLeaderboard.length === 0 ? (
                    <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                        <TrendingUp size={48} className="text-white/40 mx-auto mb-4" />
                        <p className="text-white/60 font-bpdots font-bold text-lg">NO PLAYERS YET</p>
                        <p className="text-white/40 font-bpdots text-sm mt-2">
                            BE THE FIRST TO PLAY THIS MODE!
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Top 3 Podium */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 mb-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Crown size={18} className="text-yellow-400" />
                                    <h3 className="text-lg font-bpdots text-white font-bold">HALL OF FAME</h3>
                                </div>
                                <div className="space-y-3">
                                    {currentLeaderboard.slice(0, 3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 1, getLeaderboardType())
                                    )}
                                </div>
                            </div>
                        )}

                        {/* All Players */}
                        {currentLeaderboard.length > 3 && (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Users size={18} className="text-white/80" />
                                    <h3 className="text-lg font-bpdots text-white font-bold">ALL PLAYERS</h3>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {currentLeaderboard.slice(3).map((entry, index) =>
                                        renderLeaderboardEntry(entry, index + 4, getLeaderboardType())
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Position */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-xl p-6">
                                <h4 className="text-lg font-bpdots text-white mb-4 text-center font-bold flex items-center justify-center space-x-2">
                                    <Target size={16} />
                                    <span>YOUR POSITION</span>
                                </h4>
                                {(() => {
                                    const userPosition = currentLeaderboard.findIndex(entry =>
                                        entry.telegram_id === user.telegram_id
                                    )
                                    if (userPosition !== -1 && userPosition >= 10) {
                                        const userEntry = currentLeaderboard[userPosition]
                                        return renderLeaderboardEntry(userEntry, userPosition + 1, getLeaderboardType())
                                    }
                                    return (
                                        <div className="text-center py-8">
                                            <Activity size={32} className="text-white/60 mx-auto mb-4" />
                                            <p className="text-white/60 font-bpdots text-lg font-bold">
                                                NOT RANKED YET
                                            </p>
                                            <p className="text-white/40 font-bpdots text-sm mt-2">
                                                Play games in this category to see your ranking!
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