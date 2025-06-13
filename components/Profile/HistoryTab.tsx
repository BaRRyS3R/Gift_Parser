// src/components/Profile/HistoryTab.tsx

'use client'

import { Calendar, Clock, Target, Crosshair } from 'lucide-react'
import { GameDifficulty } from '@/types/game'
import { formatPrecisionTime } from '@/utils/gameUtils'
import type { GameResultDB } from '@/lib/supabase'

interface HistoryTabProps {
    gameHistory: GameResultDB[]
}

export default function HistoryTab({ gameHistory }: HistoryTabProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    const getGameModeIcon = (difficulty: string) => {
        if (difficulty === 'precision') return Crosshair
        return Target
    }

    const getGameModeColor = (difficulty: string) => {
        if (difficulty === 'precision') return 'text-red-400'
        return 'text-blue-400'
    }

    return (
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
                            const Icon = getGameModeIcon(game.difficulty)
                            const colorClass = getGameModeColor(game.difficulty)
                            const isPrecision = game.difficulty === 'precision'

                            return (
                                <div
                                    key={game.id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${isPrecision
                                            ? 'bg-red-500/20 border border-red-400/30'
                                            : 'bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Icon size={16} className={colorClass} />
                                        <div>
                                            <div className="font-bpdots font-bold text-white text-sm">
                                                {getDifficultyDisplayName(game.difficulty as GameDifficulty)}
                                            </div>
                                            <div className="text-xs text-white/60 font-bpdots">
                                                {formatDate(game.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bpdots font-bold text-sm ${colorClass}`}>
                                            {game.score >= 0 ? '+' : ''}{game.score}
                                        </div>
                                        {isPrecision && game.survival_time ? (
                                            <div className="text-xs text-red-300/60 font-bpdots">
                                                {formatPrecisionTime(game.survival_time)}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-white/60 font-bpdots">
                                                {game.accuracy}% ACC
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}