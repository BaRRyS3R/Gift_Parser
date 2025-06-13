// src/components/Profile/PrecisionTab.tsx

'use client'

import { Crosshair, Clock, Zap, Target, Activity, AlertTriangle, Trophy } from 'lucide-react'
import { formatPrecisionTime } from '@/utils/gameUtils'
import type { User } from '@/lib/supabase'

interface PrecisionTabProps {
    user: User
    precisionRanking: number | null
}

export default function PrecisionTab({ user, precisionRanking }: PrecisionTabProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Precision Mode Statistics */}
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Crosshair size={16} className="text-red-400" />
                    <h3 className="text-sm font-bpdots text-red-300 font-bold">PRECISION MODE STATS</h3>
                </div>

                {user.precision_games === 0 ? (
                    <div className="text-center py-6">
                        <AlertTriangle size={24} className="text-red-400/60 mx-auto mb-2" />
                        <p className="text-red-300/60 font-bpdots text-sm">NO PRECISION ATTEMPTS YET</p>
                        <p className="text-red-400/40 font-bpdots text-xs mt-1">DARE TO ENTER THE PRECISION ZONE?</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Key Precision Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                <Clock size={16} className="text-red-300 mx-auto mb-1" />
                                <div className="text-lg font-bold font-bpdots text-red-300">
                                    {formatPrecisionTime(user.precision_best_survival_time || 0)}
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">BEST SURVIVAL</div>
                            </div>
                            <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                <Zap size={16} className="text-orange-300 mx-auto mb-1" />
                                <div className="text-lg font-bold font-bpdots text-orange-300">
                                    {user.precision_max_intensity || 0}
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">MAX INTENSITY</div>
                            </div>
                            <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                <Target size={16} className="text-green-300 mx-auto mb-1" />
                                <div className="text-lg font-bold font-bpdots text-green-300">
                                    {user.precision_best_streak || 0}
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">BEST STREAK</div>
                            </div>
                            <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                <Activity size={16} className="text-red-300 mx-auto mb-1" />
                                <div className="text-lg font-bold font-bpdots text-red-300">
                                    {user.precision_games}
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">ATTEMPTS</div>
                            </div>
                        </div>

                        {/* Precision Ranking */}
                        {precisionRanking && (
                            <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                <Trophy size={16} className="text-yellow-300 mx-auto mb-1" />
                                <div className="text-lg font-bold font-bpdots text-yellow-300">
                                    #{precisionRanking}
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">PRECISION RANKING</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}