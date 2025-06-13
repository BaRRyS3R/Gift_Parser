// src/components/Leaderboard/LeaderboardTabs.tsx

'use client'

import { Trophy, Crosshair } from 'lucide-react'
import { GameDifficulty } from '@/types/game'

type LeaderboardType = 'overall' | 'precision' | GameDifficulty

interface LeaderboardTabsProps {
    activeTab: LeaderboardType
    onTabChange: (tab: LeaderboardType) => void
}

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
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
        <div className="mb-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-1">
                <div className="flex overflow-x-auto scrollbar-hide space-x-1">
                    <button
                        onClick={() => onTabChange('overall')}
                        className={`
                            flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                            ${activeTab === 'overall'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }
                        `}
                    >
                        <div className="flex items-center space-x-1">
                            <Trophy size={12} />
                            <span>OVERALL</span>
                        </div>
                    </button>

                    <button
                        onClick={() => onTabChange('precision')}
                        className={`
                            flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                            ${activeTab === 'precision'
                                ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                : 'text-red-400/60 hover:text-red-400/80'
                            }
                        `}
                    >
                        <div className="flex items-center space-x-1">
                            <Crosshair size={12} />
                            <span>PRECISION</span>
                        </div>
                    </button>

                    {Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION).map((difficulty) => (
                        <button
                            key={difficulty}
                            onClick={() => onTabChange(difficulty)}
                            className={`
                                flex-shrink-0 px-3 py-2 rounded-lg font-bpdots text-xs font-bold transition-all duration-300
                                ${activeTab === difficulty
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/60 hover:text-white/80'
                                }
                            `}
                        >
                            {getDifficultyDisplayName(difficulty)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}