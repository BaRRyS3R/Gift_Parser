// src/components/Leaderboard/LeaderboardContent.tsx

'use client'

import { TrendingUp, AlertTriangle, Users, Crown, Target, Activity, Crosshair } from 'lucide-react'
import { StandardLeaderboardEntry, PrecisionLeaderboardEntry } from './'
import type { LeaderboardEntry, PrecisionLeaderboard, DifficultyLeaderboard, User } from '@/lib/supabase'

interface LeaderboardContentProps {
    currentLeaderboard: (LeaderboardEntry | PrecisionLeaderboard | DifficultyLeaderboard)[]
    isPrecisionTab: boolean
    activeTab: string
    user?: User | null
}

export default function LeaderboardContent({
    currentLeaderboard,
    isPrecisionTab,
    activeTab,
    user
}: LeaderboardContentProps) {
    if (currentLeaderboard.length === 0) {
        return (
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
        )
    }

    const renderLeaderboardEntry = (entry: any, position: number) => {
        return isPrecisionTab
            ? <PrecisionLeaderboardEntry
                key={entry.id}
                entry={entry as PrecisionLeaderboard}
                position={position}
                currentUserId={user?.telegram_id}
            />
            : <StandardLeaderboardEntry
                key={entry.id}
                entry={entry as LeaderboardEntry | DifficultyLeaderboard}
                position={position}
                isOverall={activeTab === 'overall'}
                currentUserId={user?.telegram_id}
            />
    }

    const renderUserPosition = () => {
        if (!user || currentLeaderboard.length <= 10) return null

        const userPosition = currentLeaderboard.findIndex(entry =>
            entry.telegram_id === user.telegram_id
        )

        if (userPosition === -1 || userPosition < 10) return null

        const userEntry = currentLeaderboard[userPosition]

        return (
            <div className={`backdrop-blur-xl border rounded-lg p-4 ${isPrecisionTab
                    ? 'bg-red-500/15 border-red-400/40'
                    : 'bg-white/15 border-white/25'
                }`}>
                <h4 className={`text-sm font-bpdots font-bold mb-3 text-center flex items-center justify-center space-x-2 ${isPrecisionTab ? 'text-red-300' : 'text-white'
                    }`}>
                    <Target size={14} />
                    <span>YOUR POSITION</span>
                </h4>
                {renderLeaderboardEntry(userEntry, userPosition + 1)}
            </div>
        )
    }

    const renderNoUserPosition = () => {
        if (!user) return null

        const userPosition = currentLeaderboard.findIndex(entry =>
            entry.telegram_id === user.telegram_id
        )

        if (userPosition !== -1) return null

        return (
            <div className={`backdrop-blur-xl border rounded-lg p-4 ${isPrecisionTab
                    ? 'bg-red-500/15 border-red-400/40'
                    : 'bg-white/15 border-white/25'
                }`}>
                <h4 className={`text-sm font-bpdots font-bold mb-3 text-center flex items-center justify-center space-x-2 ${isPrecisionTab ? 'text-red-300' : 'text-white'
                    }`}>
                    <Target size={14} />
                    <span>YOUR POSITION</span>
                </h4>
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
            </div>
        )
    }

    return (
        <div className="space-y-3 animate-fade-in">
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
                            renderLeaderboardEntry(entry, index + 1)
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
                            renderLeaderboardEntry(entry, index + 4)
                        )}
                    </div>
                </div>
            )}

            {/* User Position Section */}
            {renderUserPosition()}
            {renderNoUserPosition()}
        </div>
    )
}