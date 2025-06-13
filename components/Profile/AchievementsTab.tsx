// src/components/Profile/AchievementsTab.tsx - ИСПРАВЛЕН

'use client'

import { Award, Target, Medal, Star, Trophy, Zap, Crosshair, Clock, AlertTriangle } from 'lucide-react'
import type { User } from '@/lib/supabase'

interface AchievementsTabProps {
    user: User
    rankings: {
        overall: number | null
        precision: number | null
    }
}

interface Achievement {
    icon: React.ComponentType<any> // Исправлен тип для совместимости с Lucide иконками
    name: string
    desc: string
}

export default function AchievementsTab({ user, rankings }: AchievementsTabProps) {
    const getAchievements = (): Achievement[] => {
        const achievements: Achievement[] = []

        // Standard achievements
        if (user.total_games >= 10) achievements.push({ icon: Target, name: 'VETERAN', desc: '10+ GAMES PLAYED' })
        if (user.total_games >= 50) achievements.push({ icon: Medal, name: 'EXPERT', desc: '50+ GAMES PLAYED' })
        if (user.total_games >= 100) achievements.push({ icon: Award, name: 'MASTER', desc: '100+ GAMES PLAYED' })
        if (user.best_score >= 25) achievements.push({ icon: Star, name: 'HIGH SCORER', desc: '25+ BEST SCORE' })
        if (user.best_accuracy >= 90) achievements.push({ icon: Zap, name: 'SHARPSHOOTER', desc: '90%+ ACCURACY' })
        if (rankings.overall && rankings.overall <= 10) achievements.push({ icon: Trophy, name: 'TOP 10', desc: 'TOP 10 PLAYER' })

        // Precision Mode achievements
        if (user.precision_games >= 1) achievements.push({ icon: Crosshair, name: 'PRECISION INITIATE', desc: 'SURVIVED PRECISION MODE' })
        if (user.precision_games >= 10) achievements.push({ icon: AlertTriangle, name: 'PRECISION VETERAN', desc: '10+ PRECISION ATTEMPTS' })
        if ((user.precision_best_survival_time || 0) >= 30000) achievements.push({ icon: Clock, name: 'ENDURANCE MASTER', desc: '30+ SECONDS SURVIVAL' })
        if ((user.precision_best_survival_time || 0) >= 60000) achievements.push({ icon: Medal, name: 'PRECISION LEGEND', desc: '1+ MINUTE SURVIVAL' })
        if ((user.precision_max_intensity || 0) >= 10) achievements.push({ icon: Zap, name: 'INTENSITY SURVIVOR', desc: 'REACHED LEVEL 10+' })
        if ((user.precision_best_streak || 0) >= 50) achievements.push({ icon: Target, name: 'STREAK MASTER', desc: '50+ PERFECT HITS' })
        if (rankings.precision && rankings.precision <= 5) achievements.push({ icon: Trophy, name: 'PRECISION ELITE', desc: 'TOP 5 PRECISION PLAYER' })

        return achievements
    }

    const achievements = getAchievements()

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Award size={16} className="text-white/80" />
                    <h3 className="text-sm font-bpdots text-white font-bold">ACHIEVEMENTS</h3>
                </div>
                <div className="space-y-2">
                    {achievements.map((achievement, index) => {
                        const Icon = achievement.icon
                        const isPrecisionAchievement = achievement.name.includes('PRECISION') ||
                            achievement.name.includes('ENDURANCE') ||
                            achievement.name.includes('INTENSITY') ||
                            achievement.name.includes('STREAK')

                        return (
                            <div
                                key={index}
                                className={`flex items-center space-x-3 p-2 rounded-lg ${isPrecisionAchievement
                                        ? 'bg-red-500/20 border border-red-400/30'
                                        : 'bg-white/10'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPrecisionAchievement ? 'bg-red-500/30' : 'bg-white/20'
                                    }`}>
                                    <Icon size={16} className={isPrecisionAchievement ? 'text-red-300' : 'text-white'} />
                                </div>
                                <div className="flex-1">
                                    <div className={`font-bpdots font-bold text-sm ${isPrecisionAchievement ? 'text-red-300' : 'text-white'
                                        }`}>
                                        {achievement.name}
                                    </div>
                                    <div className={`text-xs font-bpdots ${isPrecisionAchievement ? 'text-red-400/60' : 'text-white/60'
                                        }`}>
                                        {achievement.desc}
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isPrecisionAchievement ? 'bg-red-500/30' : 'bg-white/20'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${isPrecisionAchievement ? 'bg-red-300' : 'bg-white'
                                        }`}></div>
                                </div>
                            </div>
                        )
                    })}
                    {achievements.length === 0 && (
                        <div className="text-center py-6">
                            <Star size={24} className="text-white/40 mx-auto mb-2" />
                            <p className="text-white/60 font-bpdots text-sm">NO ACHIEVEMENTS UNLOCKED</p>
                            <p className="text-white/40 font-bpdots text-xs mt-1">PLAY MORE GAMES TO UNLOCK ACHIEVEMENTS!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}