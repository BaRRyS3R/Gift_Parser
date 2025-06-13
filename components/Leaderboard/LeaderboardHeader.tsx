// src/components/Leaderboard/LeaderboardHeader.tsx

'use client'

import { Trophy, Crosshair, Users, Clock, Zap } from 'lucide-react'
import { formatPrecisionTime } from '@/utils/gameUtils'
import type { LeaderboardEntry, PrecisionLeaderboard, DifficultyLeaderboard } from '@/lib/supabase'

interface LeaderboardHeaderProps {
    isPrecisionTab: boolean
    currentLeaderboard: (LeaderboardEntry | PrecisionLeaderboard | DifficultyLeaderboard)[]
    activeTab: string
}

export default function LeaderboardHeader({
    isPrecisionTab,
    currentLeaderboard,
    activeTab
}: LeaderboardHeaderProps) {
    const getTopScore = () => {
        if (currentLeaderboard.length === 0) return '0'

        if (isPrecisionTab) {
            return formatPrecisionTime((currentLeaderboard[0] as PrecisionLeaderboard).best_survival_time)
        }

        if (activeTab === 'overall') {
            return (currentLeaderboard[0] as LeaderboardEntry).best_score.toString()
        }

        return (currentLeaderboard[0] as DifficultyLeaderboard).difficulty_best_score.toString()
    }

    return (
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
                                {getTopScore()}
                            </span>
                            <span className={`font-bpdots ${isPrecisionTab ? 'text-red-400/80' : 'text-white/60'}`}>
                                {isPrecisionTab ? 'BEST' : 'TOP'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}