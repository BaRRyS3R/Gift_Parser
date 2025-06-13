// src/app/leaderboard/page.tsx - Refactored with Components

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { 
    userService, 
    type LeaderboardEntry, 
    type DifficultyLeaderboard, 
    type PrecisionLeaderboard 
} from '@/lib/supabase'
import { GameDifficulty } from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import { 
    LeaderboardHeader, 
    LeaderboardTabs, 
    LeaderboardContent 
} from '@/components/Leaderboard'
import { LeaderboardType } from '@/components/Leaderboard/utils'

export default function LeaderboardPage() {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState<LeaderboardType>('overall')
    const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
    const [precisionLeaderboard, setPrecisionLeaderboard] = useState<PrecisionLeaderboard[]>([])
    const [difficultyLeaderboards, setDifficultyLeaderboards] = useState<{
        [key in GameDifficulty]?: DifficultyLeaderboard[]
    }>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadLeaderboards = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const [overall, precision] = await Promise.all([
                    userService.getLeaderboard(50),
                    userService.getPrecisionLeaderboard(50)
                ])

                setOverallLeaderboard(overall)
                setPrecisionLeaderboard(precision)

                const standardDifficulties = Object.values(GameDifficulty).filter(d => d !== GameDifficulty.PRECISION)
                const difficultyBoards = await Promise.all(
                    standardDifficulties.map(difficulty =>
                        userService.getDifficultyLeaderboard(difficulty, 30)
                    )
                )

                const difficultyLeaderboardsObj: { [key in GameDifficulty]?: DifficultyLeaderboard[] } = {}
                standardDifficulties.forEach((difficulty, index) => {
                    difficultyLeaderboardsObj[difficulty] = difficultyBoards[index]
                })

                setDifficultyLeaderboards(difficultyLeaderboardsObj)
            } catch (err) {
                console.error('Error loading leaderboards:', err)
                setError('FAILED TO LOAD RANKING DATA')
            } finally {
                setIsLoading(false)
            }
        }

        loadLeaderboards()
    }, [])

    const getCurrentLeaderboard = (): (LeaderboardEntry | PrecisionLeaderboard | DifficultyLeaderboard)[] => {
        if (activeTab === 'overall') return overallLeaderboard
        if (activeTab === 'precision') return precisionLeaderboard
        return difficultyLeaderboards[activeTab] || []
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-bpdots">LOADING RANKING DATA...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <TrendingUp size={32} className="text-white/60 mx-auto" />
                    <p className="text-white/80 font-bpdots">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/20 text-white rounded-lg font-bpdots hover:bg-white/30 transition-colors"
                    >
                        RETRY
                    </button>
                </div>
            </div>
        )
    }

    const currentLeaderboard = getCurrentLeaderboard()
    const isPrecisionTab = activeTab === 'precision'

    return (
        <div className="min-h-screen bg-black text-white pb-20 px-4 pt-12">
            <LeaderboardHeader 
                isPrecisionTab={isPrecisionTab}
                currentLeaderboard={currentLeaderboard}
                activeTab={activeTab}
            />

            <LeaderboardTabs 
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <LeaderboardContent 
                currentLeaderboard={currentLeaderboard}
                isPrecisionTab={isPrecisionTab}
                activeTab={activeTab}
                user={user}
            />
        </div>
    )
}