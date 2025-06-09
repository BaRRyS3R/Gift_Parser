// src/app/game/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameDifficulty } from '@/types/game'
import DifficultySelector from '@/components/DifficultySelector'
import GameManager from '@/components/GameManager'

export default function GamePage() {
    const router = useRouter()
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null)
    const [gameStarted, setGameStarted] = useState(false)

    const handleSelectDifficulty = (difficulty: GameDifficulty) => {
        setSelectedDifficulty(difficulty)
    }

    const handleStartGame = () => {
        if (!selectedDifficulty) return
        setGameStarted(true)
    }

    const handleBackToMenu = () => {
        router.push('/main')
    }

    const handleBackToDifficultySelection = () => {
        setGameStarted(false)
        setSelectedDifficulty(null)
    }

    if (gameStarted && selectedDifficulty) {
        return (
            <GameManager
                difficulty={selectedDifficulty}
                onBackToMenu={handleBackToDifficultySelection}
            />
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <DifficultySelector
                    onSelectDifficulty={handleSelectDifficulty}
                    selectedDifficulty={selectedDifficulty}
                />

                <div className="space-y-4">
                    <button
                        onClick={handleStartGame}
                        disabled={!selectedDifficulty}
                        className={`
                            w-full px-8 py-4 border-2 rounded-xl font-bpdots text-xl 
                            transition-all duration-300 
                            ${selectedDifficulty
                                ? 'bg-transparent border-white text-white hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer'
                                : 'bg-transparent border-white/30 text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        /START GAME
                    </button>

                    <button
                        onClick={handleBackToMenu}
                        className="w-full px-6 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300"
                    >
                        BACK 2 MENU
                    </button>
                </div>
            </div>
        </div>
    )
}