// src/app/profile/page.tsx - Updated for new game modes

'use client'

import { useState, useEffect } from 'react'
import { Zap, Crosshair, Target, Clock, TrendingUp, Star, Medal, Award, User, Activity, Calendar, BarChart3, Trophy } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { userService, type GameResultDB } from '@/lib/supabase'
import { GameMode } from '@/types/game-modes/common'
import { formatSurvivalTime } from '@/game-modes/survival/SurvivalGameLogic'

interface UserRankings {
    overall: number | null
    reaction: number | null
    survival: number | null
}

export default function ProfilePage() {
    const { user, telegramUser, isLoading: userLoading } = useUser()
    const [gameHistory, setGameHistory] = useState<GameResultDB[]>([])
    const [rankings, setRankings] = useState<UserRankings>({
        overall: null,
        reaction: null,
        survival: null
    })
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'achievements'>('stats')

    useEffect(() => {
        const loadProfileData = async () => {
            if (!telegramUser?.id) return

            try {
                setIsLoadingData(true)

                const [
                    history,
                    overallRank,
                    reactionRank,
                    survivalRank
                ] = await Promise.all([
                    userService.getGameHistory(telegramUser.id, 20),
                    userService.getUserRanking(telegramUser.id),
                    userService.getUserReactionRanking(telegramUser.id),
                    userService.getUserSurvivalRanking(telegramUser.id),
                ])

                setGameHistory(history)
                setRankings({
                    overall: overallRank,
                    reaction: reactionRank,
                    survival: survivalRank
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

        // General achievements
        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'ACTIVE PLAYER', desc: '10+ GAMES PLAYED', color: 'text-blue-400' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'DEDICATED GAMER', desc: '50+ GAMES PLAYED', color: 'text-purple-400' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'GAME MASTER', desc: '100+ GAMES PLAYED', color: 'text-yellow-400' })

        // Reaction Mode achievements
        if (user.reaction_games >= 1) achievements.push({ icon: Zap, name: 'SPEED TESTER', desc: 'TESTED REACTION SPEED', color: 'text-yellow-400' })
        if (user.reaction_games >= 10) achievements.push({ icon: Zap, name: 'QUICK REFLEXES', desc: '10+ REACTION TESTS', color: 'text-yellow-400' })
        if ((user.reaction_best_time || 0) <= 200) achievements.push({ icon: Zap, name: 'LIGHTNING FAST', desc: 'SUB-200MS REACTION', color: 'text-yellow-400' })
        if ((user.reaction_best_time || 0) <= 150) achievements.push({ icon: Zap, name: 'SUPERHUMAN SPEED', desc: 'SUB-150MS REACTION', color: 'text-yellow-400' })
        if (rankings.reaction && rankings.reaction <= 10) achievements.push({ icon: Trophy, name: 'SPEED DEMON', desc: 'TOP 10 REACTION TIME', color: 'text-yellow-400' })

        // Survival Mode achievements
        if (user.survival_games >= 1) achievements.push({ icon: Crosshair, name: 'SURVIVOR', desc: 'ENTERED SURVIVAL MODE', color: 'text-red-400' })
        if (user.survival_games >= 10) achievements.push({ icon: Crosshair, name: 'PERSISTENT SURVIVOR', desc: '10+ SURVIVAL ATTEMPTS', color: 'text-red-400' })
        if ((user.survival_best_time || 0) >= 30000) achievements.push({ icon: Clock, name: 'ENDURANCE MASTER', desc: '30+ SECONDS SURVIVAL', color: 'text-red-400' })
        if ((user.survival_best_time || 0) >= 60000) achievements.push({ icon: Clock, name: 'SURVIVAL LEGEND', desc: '1+ MINUTE SURVIVAL', color: 'text-red-400' })
        if ((user.survival_max_level || 0) >= 5) achievements.push({ icon: TrendingUp, name: 'LEVEL CLIMBER', desc: 'REACHED LEVEL 5+', color: 'text-red-400' })
        if ((user.survival_max_level || 0) >= 10) achievements.push({ icon: TrendingUp, name: 'ELITE SURVIVOR', desc: 'REACHED LEVEL 10+', color: 'text-red-400' })
        if ((user.survival_best_streak || 0) >= 50) achievements.push({ icon: Target, name: 'STREAK MASTER', desc: '50+ PERFECT HITS', color: 'text-red-400' })
        if (rankings.survival && rankings.survival <= 5) achievements.push({ icon: Trophy, name: 'SURVIVAL ELITE', desc: 'TOP 5 SURVIVOR', color: 'text-red-400' })

        // Overall rankings
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'TOP PLAYER', desc: 'TOP 10 OVERALL', color: 'text-yellow-400' })

        return achievements
    }

    const getProfileLevel = () => {
        const totalGames = user?.total_games || 0
        const survivalGames = user?.survival_games || 0
        const reactionGames = user?.reaction_games || 0

        // Factor in different game modes for level calculation
        const adjustedTotal = totalGames + (survivalGames * 2) + (reactionGames * 1.5)

        if (adjustedTotal >= 100) return { level: 'LEGEND', color: 'text-yellow-400' }
        if (adjustedTotal >= 50) return { level: 'EXPERT', color: 'text-purple-400' }
        if (adjustedTotal >= 20) return { level: 'SKILLED', color: 'text-blue-400' }
        if (adjustedTotal >= 10) return { level: 'ACTIVE', color: 'text-green-400' }
        return { level: 'ROOKIE', color: 'text-white' }
    }

    const getGameModeIcon = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION: return Zap
            case GameMode.SURVIVAL: return Crosshair
            default: return Target
        }
    }

    const getGameModeColor = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION: return 'text-yellow-400'
            case GameMode.SURVIVAL: return 'text-red-400'
            default: return 'text-white'
        }
    }

    const getGameModeName = (mode: string) => {
        switch (mode) {
            case GameMode.REACTION: return 'REACTION'
            case GameMode.SURVIVAL: return 'SURVIVAL'
            default: return 'UNKNOWN'
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
                            <div className={`absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-xs font-bpdots font-bold ${profileLevel.color} bg-black/60`}>
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
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Activity size={12} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.total_games}</div>
                            <div className="text-xs font-bpdots text-white/60">TOTAL</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                            <Zap size={12} className="text-yellow-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-yellow-400">{user.reaction_games || 0}</div>
                            <div className="text-xs font-bpdots text-yellow-300/60">REACTION</div>
                        </div>
                        <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                            <Crosshair size={12} className="text-red-400 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-red-400">{user.survival_games || 0}</div>
                            <div className="text-xs font-bpdots text-red-300/60">SURVIVAL</div>
                        </div>
                        <div className="text-center p-2 bg-white/10 rounded-lg">
                            <Trophy size={12} className="text-white/60 mx-auto mb-1" />
                            <div className="text-lg font-bold font-bpdots text-white">{user.best_score}</div>
                            <div className="text-xs font-bpdots text-white/60">BEST</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <div className="flex">
                        {(['stats', 'history', 'achievements'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 py-2 px-3 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
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
                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Reaction Mode Statistics */}
                        <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Zap size={16} className="text-yellow-400" />
                                <h3 className="text-sm font-bpdots text-yellow-300 font-bold">REACTION MODE STATS</h3>
                            </div>

                            {(user.reaction_games || 0) === 0 ? (
                                <div className="text-center py-4">
                                    <Zap size={24} className="text-yellow-400/60 mx-auto mb-2" />
                                    <p className="text-yellow-300/60 font-bpdots text-sm">NO REACTION TESTS YET</p>
                                    <p className="text-yellow-400/40 font-bpdots text-xs mt-1">TEST YOUR LIGHTNING REFLEXES!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                        <Clock size={16} className="text-yellow-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-yellow-300">
                                            {user.reaction_best_time || 0}ms
                                        </div>
                                        <div className="text-xs font-bpdots text-yellow-400/60">BEST TIME</div>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                        <Target size={16} className="text-yellow-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-yellow-300">
                                            {user.reaction_best_score || 0}
                                        </div>
                                        <div className="text-xs font-bpdots text-yellow-400/60">BEST SCORE</div>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                        <TrendingUp size={16} className="text-yellow-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-yellow-300">
                                            {user.reaction_average_time || 0}ms
                                        </div>
                                        <div className="text-xs font-bpdots text-yellow-400/60">AVERAGE TIME</div>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                        <Trophy size={16} className="text-yellow-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-yellow-300">
                                            #{rankings.reaction || 'N/A'}
                                        </div>
                                        <div className="text-xs font-bpdots text-yellow-400/60">RANKING</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Survival Mode Statistics */}
                        <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Crosshair size={16} className="text-red-400" />
                                <h3 className="text-sm font-bpdots text-red-300 font-bold">SURVIVAL MODE STATS</h3>
                            </div>

                            {(user.survival_games || 0) === 0 ? (
                                <div className="text-center py-4">
                                    <Crosshair size={24} className="text-red-400/60 mx-auto mb-2" />
                                    <p className="text-red-300/60 font-bpdots text-sm">NO SURVIVAL ATTEMPTS YET</p>
                                    <p className="text-red-400/40 font-bpdots text-xs mt-1">ENTER THE SURVIVAL CHALLENGE!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Clock size={16} className="text-red-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-red-300">
                                            {formatSurvivalTime(user.survival_best_time || 0)}
                                        </div>
                                        <div className="text-xs font-bpdots text-red-400/60">BEST TIME</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <TrendingUp size={16} className="text-orange-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-orange-300">
                                            {user.survival_max_level || 0}
                                        </div>
                                        <div className="text-xs font-bpdots text-red-400/60">MAX LEVEL</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Target size={16} className="text-green-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-green-300">
                                            {user.survival_best_streak || 0}
                                        </div>
                                        <div className="text-xs font-bpdots text-red-400/60">BEST STREAK</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <Trophy size={16} className="text-red-300 mx-auto mb-1" />
                                        <div className="text-lg font-bold font-bpdots text-red-300">
                                            #{rankings.survival || 'N/A'}
                                        </div>
                                        <div className="text-xs font-bpdots text-red-400/60">RANKING</div>
                                    </div>
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
                                        const Icon = getGameModeIcon(game.game_mode)
                                        const colorClass = getGameModeColor(game.game_mode)
                                        const isReaction = game.game_mode === GameMode.REACTION
                                        const isSurvival = game.game_mode === GameMode.SURVIVAL

                                        return (
                                            <div key={game.id} className={`flex items-center justify-between p-2 rounded-lg ${isReaction ? 'bg-yellow-500/20 border border-yellow-400/30' :
                                                isSurvival ? 'bg-red-500/20 border border-red-400/30' :
                                                    'bg-white/10'
                                                }`}>
                                                <div className="flex items-center space-x-2">
                                                    <Icon size={16} className={colorClass} />
                                                    <div>
                                                        <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                            {getGameModeName(game.game_mode)}
                                                        </div>
                                                        <div className="text-xs text-white/60 font-bpdots">
                                                            {formatDate(game.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                                        {game.score}
                                                    </div>
                                                    {isReaction && game.reaction_time ? (
                                                        <div className="text-xs text-yellow-300/60 font-bpdots">
                                                            {game.reaction_time}ms
                                                        </div>
                                                    ) : isSurvival && game.survival_time ? (
                                                        <div className="text-xs text-red-300/60 font-bpdots">
                                                            {formatSurvivalTime(game.survival_time)}
                                                        </div>
                                                    ) : null}
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
                                    const isReactionAchievement = achievement.color === 'text-yellow-400'
                                    const isSurvivalAchievement = achievement.color === 'text-red-400'

                                    return (
                                        <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${isReactionAchievement ? 'bg-yellow-500/20 border border-yellow-400/30' :
                                            isSurvivalAchievement ? 'bg-red-500/20 border border-red-400/30' :
                                                'bg-white/10'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReactionAchievement ? 'bg-yellow-500/30' :
                                                isSurvivalAchievement ? 'bg-red-500/30' :
                                                    'bg-white/20'
                                                }`}>
                                                <Icon size={16} className={achievement.color} />
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-bpdots font-bold text-sm ${achievement.color}`}>
                                                    {achievement.name}
                                                </div>
                                                <div className={`text-xs font-bpdots ${isReactionAchievement ? 'text-yellow-400/60' :
                                                    isSurvivalAchievement ? 'text-red-400/60' :
                                                        'text-white/60'
                                                    }`}>
                                                    {achievement.desc}
                                                </div>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isReactionAchievement ? 'bg-yellow-500/30' :
                                                isSurvivalAchievement ? 'bg-red-500/30' :
                                                    'bg-white/20'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${achievement.color.replace('text-', 'bg-')}`}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {getAchievements().length === 0 && (
                                    <div className="text-center py-6">
                                        <Star size={24} className="text-white/40 mx-auto mb-2" />
                                        <p className="text-white/60 font-bpdots text-sm">NO ACHIEVEMENTS UNLOCKED</p>
                                        <p className="text-white/40 font-bpdots text-xs mt-1">PLAY GAMES TO UNLOCK ACHIEVEMENTS!</p>
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