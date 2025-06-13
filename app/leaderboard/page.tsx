// src/app/leaderboard/page.tsx - Maximum Sarcasm Leaderboard Edition

'use client'

import { useState, useEffect } from 'react'
import { Crown, Medal, Award, Star, Trophy, TrendingUp, Users, Zap, Target, Activity, Clock, Crosshair, AlertTriangle, UserCheck, Flame, Skull, ThumbsDown, Laugh, TrendingDown } from 'lucide-react'
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
                setError('FAILED TO LOAD HALL OF SHAME')
            } finally {
                setIsLoading(false)
            }
        }

        loadLeaderboards()
    }, [])

    // Саркастичные иконки и комментарии для рангов
    const getRankIcon = (position: number) => {
        switch (position) {
            case 1: return <Crown size={18} className="text-yellow-400" />
            case 2: return <Medal size={18} className="text-gray-300" />
            case 3: return <Award size={18} className="text-amber-600" />
            default: 
                if (position <= 10) return <span className="text-white/60 font-bpdots text-sm font-bold">#{position}</span>
                if (position <= 50) return <span className="text-orange-400/60 font-bpdots text-sm font-bold">#{position}</span>
                return <span className="text-red-400/60 font-bpdots text-sm font-bold">#{position}</span>
        }
    }

    const getRankBg = (position: number) => {
        switch (position) {
            case 1: return 'bg-yellow-500/20 border-yellow-400/40'
            case 2: return 'bg-gray-400/20 border-gray-300/40'
            case 3: return 'bg-amber-600/20 border-amber-500/40'
            default: 
                if (position <= 10) return 'bg-white/10 border-white/20'
                if (position <= 50) return 'bg-orange-500/10 border-orange-400/20'
                return 'bg-red-500/10 border-red-400/20'
        }
    }

    // Саркастичные титулы для позиций
    const getRankTitle = (position: number, isPrecision: boolean = false) => {
        if (isPrecision) {
            switch (position) {
                case 1: return 'PRECISION GOD (or cheater?)'
                case 2: return 'ALMOST PERFECT (so close!)'
                case 3: return 'BRONZE SURVIVOR'
                default:
                    if (position <= 10) return 'ELITE SUFFERER'
                    if (position <= 20) return 'VETERAN VICTIM'
                    return 'PRECISION CASUALTY'
            }
        }
        
        switch (position) {
            case 1: return 'LEAST EMBARRASSING'
            case 2: return 'RUNNER-UP LOSER'
            case 3: return 'BRONZE DISAPPOINTMENT'
            default:
                if (position <= 10) return 'TOP 10 FAILURE'
                if (position <= 50) return 'MEDIOCRE PERFORMER'
                return 'BOTTOM DWELLER'
        }
    }

    const isCurrentUser = (telegramId: number) => {
        return user?.telegram_id === telegramId
    }

    const formatLastPlayed = (dateString?: string) => {
        if (!dateString) return 'NEVER (WISE)'
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'JUST NOW'
        if (diffInHours < 24) return `${diffInHours}h AGO`
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d AGO`
        return 'LONG AGO (SMART)'
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return 'VETERANS'
            case GameDifficulty.OMG: return 'MANIACS'
            case GameDifficulty.NIGHTMARE: return 'DEMONS'
            case GameDifficulty.IMPOSSIBLE: return 'GODS'
            case GameDifficulty.PRECISION: return 'MASOCHISTS'
        }
    }

    const getDifficultyIcon = (difficulty: GameDifficulty) => {
        switch (difficulty) {
            case GameDifficulty.LEGENDARY: return Award
            case GameDifficulty.OMG: return Flame
            case GameDifficulty.NIGHTMARE: return Skull
            case GameDifficulty.IMPOSSIBLE: return Crown
            case GameDifficulty.PRECISION: return Crosshair
            default: return Target
        }
    }

    const getSarcasticComment = (entry: any, position: number, isPrecision: boolean = false) => {
        if (isPrecision) {
            const survivalTime = entry.best_survival_time || 0
            if (position === 1) return "Somehow survived the longest. Suspicious... 🤔"
            if (survivalTime < 10000) return "Died faster than loading screen 💀"
            if (survivalTime < 30000) return "Brief encounter with precision torture ⚡"
            return "Impressive pain tolerance 🏥"
        }

        const score = entry.best_score || entry.difficulty_best_score || 0
        const accuracy = entry.best_accuracy || 0

        if (position === 1) return "Least terrible player (congratulations?) 🏆"
        if (position <= 3) return "Made it to podium of shame 🥉"
        if (score <= 0) return "Negative score? That's talent! 📉"
        if (accuracy < 50) return "Worse than random chance ✨"
        if (position > 50) return "At least you're not last... yet 🏃‍♂️"
        return "Perfectly mediocre performance 📊"
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
                        <h3 className={`font-bpdots font-bold truncate text-sm ${
                            isCurrentUser(entry.telegram_id) ? 'text-white' : 'text-white/90'
                        }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <Star size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bpdots">
                                YOU (UNFORTUNATELY)
                            </span>
                        )}
                        {position <= 3 && (
                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-bpdots border border-orange-400/30">
                                {getRankTitle(position)}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-white/50 font-bpdots truncate">@{entry.username}</p>
                    )}
                    
                    {/* Sarcastic comment */}
                    <p className="text-xs text-white/40 font-bpdots italic mt-1">
                        {getSarcasticComment(entry, position)}
                    </p>
                </div>

                <div className="text-right space-y-1">
                    <div className={`text-lg font-bold font-bpdots ${
                        score >= 50 ? 'text-green-400' :
                        score >= 25 ? 'text-yellow-400' :
                        score >= 10 ? 'text-white' :
                        score >= 0 ? 'text-orange-400' : 'text-red-400'
                    }`}>
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
                        <div className="text-xs text-white/40">
                            {formatLastPlayed(entry.last_played_at)}
                        </div>
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
                        <h3 className={`font-bpdots font-bold truncate text-sm ${
                            isCurrentUser(entry.telegram_id) ? 'text-red-200' : 'text-red-300'
                        }`}>
                            {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.is_premium && (
                            <Star size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {isCurrentUser(entry.telegram_id) && (
                            <span className="text-xs bg-red-500/30 text-red-200 px-2 py-0.5 rounded font-bpdots border border-red-400/30">
                                YOU (MASOCHIST)
                            </span>
                        )}
                        {position <= 3 && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bpdots border border-red-400/30">
                                {getRankTitle(position, true)}
                            </span>
                        )}
                    </div>
                    {entry.username && (
                        <p className="text-xs text-red-300/60 font-bpdots truncate">@{entry.username}</p>
                    )}
                    
                    {/* Precision-specific sarcastic comment */}
                    <p className="text-xs text-red-400/60 font-bpdots italic mt-1">
                        {getSarcasticComment(entry, position, true)}
                    </p>
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
                    <div className="text-xs text-red-400/40">
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
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-bpdots">LOADING HALL OF SHAME...</p>
                    <p className="text-white/60 font-bpdots text-sm">Compiling embarrassing statistics... 📊💀</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <TrendingDown size={32} className="text-red-400 mx-auto" />
                    <p className="text-red-400 font-bpdots">{error}</p>
                    <p className="text-red-400/60 font-bpdots text-sm">Even our servers are disappointed! 💻😔</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg font-bpdots hover:bg-red-500/30 transition-colors border border-red-400/30"
                    >
                        TRY TO LOAD SHAME AGAIN
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
            {/* Header with sarcastic titles */}
            <div className="mb-4">
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isPrecisionTab ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/20'
                        }`}>
                            {isPrecisionTab ? (
                                <Crosshair size={20} className="text-red-400" />
                            ) : (
                                <Trophy size={20} className="text-white" />
                            )}
                        </div>
                        <h1 className={`text-2xl font-bold font-bpdots ${
                            isPrecisionTab ? 'text-red-300' : 'text-white'
                        }`}>
                            {isPrecisionTab ? 'HALL OF PAIN' : 'HIERARCHY OF FAILURE'}
                        </h1>
                    </div>

                    <p className={`font-bpdots text-sm ${
                        isPrecisionTab ? 'text-red-400/80' : 'text-white/60'
                    }`}>
                        {isPrecisionTab 
                            ? 'Where precision dreams go to die 💀' 
                            : 'Ranking disappointments since inception 📉'
                        }
                    </p>

                    {currentLeaderboard.length > 0 && (
                        <div className={`flex items-center justify-center space-x-4 backdrop-blur-xl border rounded-lg p-2 text-sm ${
                            isPrecisionTab
                                ? 'bg-red-500/10 border-red-400/30'
                                : 'bg-white/10 border-white/20'
                        }`}>
                            <div className="flex items-center space-x-1">
                                <Users size={14} className={isPrecisionTab ? 'text-red-400/80' : 'text-white/60'} />
                                <span className={`font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'}`}>
                                    {currentLeaderboard.length}
                                </span>
                                <span className={`font-bpdots ${isPrecisionTab ? 'text-red-400/80' : 'text-white/60'}`}>
                                    VICTIMS
                                </span>
                            </div>
                            <div className={`w-px h-4 ${isPrecisionTab ? 'bg-red-400/30' : 'bg-white/20'}`}></div>
                            <div className="flex items-center space-x-1">
                                {isPrecisionTab ? (
                                    <Clock size={14} className="text-red-400/80" />
                                ) : (
                                    <TrendingDown size={14} className="text-white/60" />
                                )}
                                <span className={`font-bpdots font-bold ${isPrecisionTab ? 'text-red-300' : 'text-white'}`}>
                                    {currentLeaderboard[0] ? (
                                        isPrecisionTab
                                            ? formatPrecisionTime((currentLeaderboard[0] as PrecisionLeaderboard).best_survival_time)
                                            : `${(activeTab === 'overall'
                                                ? (currentLeaderboard[0] as LeaderboardEntry).best_score
                                                : (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score)}`
                                    ) : '0'}
                                </span>
                                <span className={`font-bpdots ${isPrecisionTab ? 'text-red-400/80' : 'text-white/60'}`}>
                                    {isPrecisionTab ? 'BEST AGONY' : 'PEAK DISAPPOINTMENT'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs with sarcastic labels */}
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
                                <span>GENERAL FAILURES</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('precision')}
                            className={`
                                flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                                ${activeTab === 'precision'
                                    ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                    : 'text-red-400/60 hover:text-red-400/80'
                                }
                            `}
                        >
                            <div className="flex items-center space-x-1">
                                <Crosshair size={12} />
                                <span>PRECISION MARTYRS</span>
                            </div>
                        </button>

                        {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => {
                            const Icon = getDifficultyIcon(difficulty)
                            const isActive = activeTab === difficulty

                            return (
                                <button
                                    key={difficulty}
                                    onClick={() => setActiveTab(difficulty)}
                                    className={`
                                        flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                                        ${isActive
                                            ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                                            : 'text-orange-400/60 hover:text-orange-400/80'
                                        }
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
                    <div className={`text-center py-8 backdrop-blur-xl border rounded-lg ${
                        isPrecisionTab
                            ? 'bg-red-500/10 border-red-400/30'
                            : 'bg-white/10 border-white/20'
                    }`}>
                        {isPrecisionTab ? (
                            <AlertTriangle size={32} className="text-red-400/60 mx-auto mb-3" />
                        ) : (
                            <Laugh size={32} className="text-white/40 mx-auto mb-3" />
                        )}
                        <p className={`font-bpdots font-bold ${
                            isPrecisionTab ? 'text-red-300/80' : 'text-white/60'
                        }`}>
                            {isPrecisionTab ? 'NO BRAVE SOULS YET' : 'NO VICTIMS... YET'}
                        </p>
                        <p className={`font-bpdots text-sm mt-1 ${
                            isPrecisionTab ? 'text-red-400/60' : 'text-white/40'
                        }`}>
                            {isPrecisionTab 
                                ? 'Be the first to sacrifice your sanity! 🎯💀' 
                                : 'Someone has to be first to embarrass themselves! 🎪'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Top 3 Hall of Fame/Shame */}
                        {currentLeaderboard.slice(0, 3).length > 0 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 mb-3 ${
                                isPrecisionTab
                                    ? 'bg-red-500/10 border-red-400/30'
                                    : 'bg-white/10 border-white/20'
                            }`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <Crown size={16} className={isPrecisionTab ? 'text-red-400' : 'text-white/80'} />
                                    <h3 className={`text-sm font-bpdots font-bold ${
                                        isPrecisionTab ? 'text-red-300' : 'text-white'
                                    }`}>
                                        {isPrecisionTab ? 'PRECISION ELITE (OR LUNATICS)' : 'PODIUM OF SHAME'}
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

                        {/* Everyone Else (The Masses) */}
                        {currentLeaderboard.length > 3 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 ${
                                isPrecisionTab
                                    ? 'bg-red-500/10 border-red-400/30'
                                    : 'bg-white/10 border-white/20'
                            }`}>
                                <div className="flex items-center space-x-2 mb-3">
                                    <Users size={16} className={isPrecisionTab ? 'text-red-400' : 'text-white/80'} />
                                    <h3 className={`text-sm font-bpdots font-bold ${
                                        isPrecisionTab ? 'text-red-300' : 'text-white'
                                    }`}>
                                        {isPrecisionTab ? 'THE REMAINING MASOCHISTS' : 'THE LESS DISTINGUISHED'}
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

                        {/* User Position (If Not Visible) */}
                        {user && currentLeaderboard.length > 10 && (
                            <div className={`backdrop-blur-xl border rounded-lg p-4 ${
                                isPrecisionTab
                                    ? 'bg-red-500/15 border-red-400/40'
                                    : 'bg-white/15 border-white/25'
                            }`}>
                                <h4 className={`text-sm font-bpdots font-bold mb-3 text-center flex items-center justify-center space-x-2 ${
                                    isPrecisionTab ? 'text-red-300' : 'text-white'
                                }`}>
                                    <Target size={14} />
                                    <span>YOUR POSITION IN THE SHAME HIERARCHY</span>
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
                                                <ThumbsDown size={20} className="text-white/60 mx-auto mb-2" />
                                            )}
                                            <p className={`font-bpdots text-sm font-bold ${
                                                isPrecisionTab ? 'text-red-300/80' : 'text-white/60'
                                            }`}>
                                                {isPrecisionTab
                                                    ? 'DARE TO ENTER PRECISION MODE TO JOIN THE SUFFERING!'
                                                    : 'PLAY MORE TO EARN YOUR PLACE IN THE HALL OF SHAME!'
                                                }
                                            </p>
                                            <p className={`font-bpdots text-xs mt-1 ${
                                                isPrecisionTab ? 'text-red-400/60' : 'text-white/40'
                                            }`}>
                                                {isPrecisionTab
                                                    ? '(Your sanity is not guaranteed to survive) 💀'
                                                    : '(Everyone needs their moment of disappointment) 🎭'
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

            {/* Footer disclaimer */}
            <div className="mt-6 text-center">
                <p className="text-white/20 font-bpdots text-xs italic">
                    * Rankings updated in real-time to maximize embarrassment 📊💀
                </p>
            </div>
        </div>
    )
}