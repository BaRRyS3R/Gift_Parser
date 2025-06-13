// src/components/Profile/StatsTab.tsx

'use client'

import { BarChart3, Trophy } from 'lucide-react'
import { GameDifficulty } from '@/types/game'
import type { User } from '@/lib/supabase'

interface StatsTabProps {
    user: User
    rankings: {
        overall: number | null
        easy: number | null
        medium: number | null
        hard: number | null
        legendary: number | null
        omg: number | null
        nightmare: number | null
        impossible: number | null
        precision: number | null
    }
}

export default function StatsTab({ user, rankings }: StatsTabProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
        switch (difficulty) {
            case GameDifficulty.EASY: return 'NOOB'
            case GameDifficulty.MEDIUM: return 'CASUAL'
            case GameDifficulty.HARD: return 'PRO'
            case GameDifficulty.LEGENDARY: return 'LEGEND'
            case GameDifficulty.OMG: return 'OMG'
            case GameDifficulty.NIGHTMARE: return 'NIGHTMARE'
            case GameDifficulty.IMPOSSIBLE: return 'RAGE MODE'
            case GameDifficulty.PRECISION: return 'PRECISION'
        }
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Overall Statistics */}
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
                                {user.last_played_at ? formatDate(user.last_played_at) : 'NEVER'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Standard Difficulty Breakdown */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Trophy size={16} className="text-white/80" />
                    <h3 className="text-sm font-bpdots text-white font-bold">DIFFICULTY BREAKDOWN</h3>
                </div>
                <div className="space-y-2">
                    {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => {
                        const gamesCount = (user as any)[`${difficulty}_games`]
                        const bestScore = (user as any)[`${difficulty}_best_score`]
                        const ranking = rankings[difficulty.toLowerCase() as keyof typeof rankings]

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
    )
}