// src/components/Leaderboard/StandardLeaderboardEntry.tsx

'use client'

import { Crown, Medal, Award, Star, Activity, Target } from 'lucide-react'
import type { LeaderboardEntry, DifficultyLeaderboard } from '@/lib/supabase'

interface StandardLeaderboardEntryProps {
    entry: LeaderboardEntry | DifficultyLeaderboard
    position: number
    isOverall: boolean
    currentUserId?: number
}

export default function StandardLeaderboardEntry({
    entry,
    position,
    isOverall,
    currentUserId
}: StandardLeaderboardEntryProps) {
    const score = isOverall
        ? (entry as LeaderboardEntry).best_score
        : (entry as DifficultyLeaderboard).difficulty_best_score

    const games = isOverall
        ? (entry as LeaderboardEntry).total_games
        : (entry as DifficultyLeaderboard).difficulty_games

    const accuracy = isOverall ? (entry as LeaderboardEntry).best_accuracy : null

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

    const isCurrentUser = currentUserId === entry.telegram_id

    return (
        <div
            className={`
                flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 backdrop-blur-xl
                ${getRankBg(position)}
                ${isCurrentUser
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
                    <h3 className={`font-bpdots font-bold truncate text-sm ${isCurrentUser ? 'text-white' : 'text-white/90'
                        }`}>
                        {entry.first_name} {entry.last_name || ''}
                    </h3>
                    {entry.is_premium && (
                        <Star size={12} className="text-yellow-400 flex-shrink-0" />
                    )}
                    {isCurrentUser && (
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