// src/components/Profile/ProfileHeader.tsx

'use client'

import { User, Star, Activity, Target, Zap, Crosshair } from 'lucide-react'
import type { User as UserType } from '@/lib/supabase'

interface ProfileHeaderProps {
    user: UserType
    overallRanking: number | null
    precisionRanking: number | null
    profileLevel: {
        level: string
        color: string
    }
}

export default function ProfileHeader({ 
    user, 
    overallRanking, 
    precisionRanking, 
    profileLevel 
}: ProfileHeaderProps) {
    return (
        <div className="mb-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <User size={20} className="text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white/20 px-1 py-0.5 rounded text-xs font-bpdots font-bold">
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
                            {overallRanking && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-white text-xs font-bpdots">
                                    #{overallRanking}
                                </span>
                            )}
                            {precisionRanking && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-bpdots border border-red-400/30">
                                    <Crosshair size={10} className="mr-1" />
                                    P#{precisionRanking}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-white/10 rounded-lg">
                        <Activity size={12} className="text-white/60 mx-auto mb-1" />
                        <div className="text-lg font-bold font-bpdots text-white">{user.total_games}</div>
                        <div className="text-xs font-bpdots text-white/60">GAMES</div>
                    </div>
                    <div className="text-center p-2 bg-white/10 rounded-lg">
                        <Target size={12} className="text-white/60 mx-auto mb-1" />
                        <div className="text-lg font-bold font-bpdots text-white">{user.best_score}</div>
                        <div className="text-xs font-bpdots text-white/60">BEST</div>
                    </div>
                    <div className="text-center p-2 bg-white/10 rounded-lg">
                        <Zap size={12} className="text-white/60 mx-auto mb-1" />
                        <div className="text-lg font-bold font-bpdots text-white">{user.best_accuracy}%</div>
                        <div className="text-xs font-bpdots text-white/60">ACCURACY</div>
                    </div>
                    <div className="text-center p-2 bg-red-500/20 rounded-lg border border-red-400/30">
                        <Crosshair size={12} className="text-red-400 mx-auto mb-1" />
                        <div className="text-lg font-bold font-bpdots text-red-400">{(user.precision_games || 0)}</div>
                        <div className="text-xs font-bpdots text-red-300/60">PRECISION</div>
                    </div>
                </div>
            </div>
        </div>
    )
}