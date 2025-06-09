// src/app/game/page.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Square {
    id: number
    isActive: boolean
    isAnimating: boolean
}

export default function GamePage() {
    const router = useRouter()
    const [squares, setSquares] = useState<Square[]>([
        { id: 0, isActive: false, isAnimating: false },
        { id: 1, isActive: false, isAnimating: false },
        { id: 2, isActive: false, isAnimating: false },
        { id: 3, isActive: false, isAnimating: false }
    ])
    const [score, setScore] = useState(0)
    const [gameActive, setGameActive] = useState(true)
    const [currentActiveSquare, setCurrentActiveSquare] = useState<number | null>(null)

    const activateRandomSquare = useCallback(() => {
        if (!gameActive) return

        // Deactivate current square if it exists and player missed it
        if (currentActiveSquare !== null) {
            setScore(prev => prev - 1)
            setSquares(prev => prev.map(square => 
                square.id === currentActiveSquare 
                    ? { ...square, isActive: false, isAnimating: false }
                    : square
            ))
        }

        // Activate new random square
        const randomIndex = Math.floor(Math.random() * 4)
        setCurrentActiveSquare(randomIndex)
        
        setSquares(prev => prev.map(square => 
            square.id === randomIndex 
                ? { ...square, isActive: true, isAnimating: false }
                : { ...square, isActive: false, isAnimating: false }
        ))
    }, [gameActive, currentActiveSquare])

    useEffect(() => {
        if (!gameActive) return

        const interval = setInterval(activateRandomSquare, 2000)
        
        // Activate first square immediately
        setTimeout(activateRandomSquare, 500)

        return () => clearInterval(interval)
    }, [gameActive, activateRandomSquare])

    const handleSquareClick = (squareId: number) => {
        const square = squares[squareId]
        
        if (square.isActive && !square.isAnimating) {
            // Player hit the active square
            setScore(prev => prev + 1)
            setCurrentActiveSquare(null)
            
            // Start fade out animation
            setSquares(prev => prev.map(s => 
                s.id === squareId 
                    ? { ...s, isAnimating: true }
                    : s
            ))
            
            // Complete deactivation after animation
            setTimeout(() => {
                setSquares(prev => prev.map(s => 
                    s.id === squareId 
                        ? { ...s, isActive: false, isAnimating: false }
                        : s
                ))
            }, 300)
        }
    }

    const handleEndGame = () => {
        setGameActive(false)
        router.push('/main')
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
            {/* Score Display */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-4 font-bpdots">Reaction Game</h1>
                <div className="text-2xl font-bpdots">
                    Score: <span className={score >= 0 ? 'text-green-400' : 'text-red-400'}>{score}</span>
                </div>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {squares.map((square) => (
                    <button
                        key={square.id}
                        onClick={() => handleSquareClick(square.id)}
                        className={`
                            w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-2 border-white
                            transition-all duration-300 ease-in-out
                            ${square.isActive && !square.isAnimating 
                                ? 'bg-white' 
                                : 'bg-transparent'
                            }
                            ${square.isAnimating 
                                ? 'opacity-0 scale-95' 
                                : 'opacity-100 scale-100'
                            }
                            hover:scale-105 active:scale-95
                        `}
                        disabled={!gameActive}
                    />
                ))}
            </div>

            {/* Instructions */}
            <div className="text-center mb-6 max-w-sm">
                <p className="text-sm text-gray-400 font-bpdots">
                    Click the white squares as fast as you can!
                </p>
                <p className="text-xs text-gray-500 font-bpdots mt-2">
                    +1 for hits, -1 for misses
                </p>
            </div>

            {/* End Game Button */}
            <button
                onClick={handleEndGame}
                className="px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bpdots hover:bg-white/10 transition-colors"
            >
                End Game
            </button>
        </div>
    )
}