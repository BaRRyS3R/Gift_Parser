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
                {!selectedDifficulty ? (
                    <>
                        <DifficultySelector
                            onSelectDifficulty={handleSelectDifficulty}
                            selectedDifficulty={selectedDifficulty}
                        />

                        <div className="flex justify-center">
                            <button
                                onClick={handleBackToMenu}
                                className="px-6 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300"
                            >
                                BACK 2 MENU
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <DifficultySelector
                            onSelectDifficulty={handleSelectDifficulty}
                            selectedDifficulty={selectedDifficulty}
                        />

                        <div className="space-y-4">
                            <button
                                onClick={handleStartGame}
                                className="w-full px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-xl hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
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
                )}
            </div>
        </div>
    )
}