// src/components/Leaderboard/PrecisionLeaderboardEntry.tsx

'use client'

import { Crown, Medal, Award, Star, Zap, Target, Activity } from 'lucide-react'
import { formatPrecisionTime } from '@/utils/gameUtils'
import type { PrecisionLeaderboard } from '@/lib/supabase'

interface PrecisionLeaderboardEntryProps {
    entry: PrecisionLeaderboard
    position: number
    currentUserId?: number
}

export default function PrecisionLeaderboardEntry({
    entry,
    position,
    currentUserId
}: PrecisionLeaderboardEntryProps) {
    const getRankIcon = (position: number) => {
        if (position <= 3) {
            switch (position) {
                case 1: return <Crown size={18} className="text-yellow-400" />
                case 2: return <Medal size={18} className="text-gray-300" />
                case 3: return <Award size={18} className="text-amber-600" />
            }
        }
        return <span className="text-red-300/80 font-bpdots text-sm font-bold">#{position}</span>
    }

    const isCurrentUser = currentUserId === entry.telegram_id

    return (
        <div
            className={`
                flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
                ${position <= 3
                    ? 'bg-red-500/20 border-red-400/40'
                    : 'bg-red-500/10 border-red-400/30'
                }
                ${isCurrentUser
                    ? 'ring-1 ring-red-400/60 bg-red-500/25'
                    : 'hover:bg-red-500/15'
                }
            `}
        >
            <div className="flex items-center justify-center w-8">
                {getRankIcon(position)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                    <h3 className={`font-bpdots font-bold truncate text-sm ${isCurrentUser ? 'text-red-200' : 'text-red-300'
                        }`}>
                        {entry.first_name} {entry.last_name || ''}
                    </h3>
                    {entry.is_premium && (
                        <Star size={12} className="text-yellow-400 flex-shrink-0" />
                    )}
                    {isCurrentUser && (
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