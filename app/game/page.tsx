// src/app/game/page.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Circle {
    id: number
    isActive: boolean
    isAnimating: boolean
}

export default function GamePage() {
    const router = useRouter()
    const [circles, setCircles] = useState<Circle[]>([
        { id: 0, isActive: false, isAnimating: false },
        { id: 1, isActive: false, isAnimating: false },
        { id: 2, isActive: false, isAnimating: false },
        { id: 3, isActive: false, isAnimating: false }
    ])
    const [score, setScore] = useState(0)
    const [gameActive, setGameActive] = useState(true)
    const [currentActiveCircle, setCurrentActiveCircle] = useState<number | null>(null)
    const [timeLeft, setTimeLeft] = useState(2)
    const [gameStarted, setGameStarted] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)

    const deactivateCurrentCircle = useCallback(() => {
        if (currentActiveCircle !== null) {
            setCircles(prev => prev.map(circle =>
                circle.id === currentActiveCircle
                    ? { ...circle, isActive: false, isAnimating: false }
                    : circle
            ))
            setCurrentActiveCircle(null)
        }
    }, [currentActiveCircle])

    const activateRandomCircle = useCallback(() => {
        if (!gameActive) return

        // Clear any existing timeouts
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (countdownRef.current) clearTimeout(countdownRef.current)

        // If there's a currently active circle that wasn't clicked, penalize
        if (currentActiveCircle !== null) {
            setScore(prev => prev - 1)
            deactivateCurrentCircle()
        }

        // Activate new random circle
        const randomIndex = Math.floor(Math.random() * 4)
        setCurrentActiveCircle(randomIndex)
        setTimeLeft(2)

        setCircles(prev => prev.map(circle =>
            circle.id === randomIndex
                ? { ...circle, isActive: true, isAnimating: false }
                : { ...circle, isActive: false, isAnimating: false }
        ))

        // Start countdown
        let countdown = 2
        const countdownInterval = setInterval(() => {
            countdown -= 0.1
            setTimeLeft(Math.max(0, countdown))

            if (countdown <= 0) {
                clearInterval(countdownInterval)
            }
        }, 100)
        countdownRef.current = countdownInterval

        // Auto-deactivate after 2 seconds
        timeoutRef.current = setTimeout(() => {
            if (currentActiveCircle === randomIndex) {
                setScore(prev => prev - 1)
                deactivateCurrentCircle()
                // Schedule next circle
                setTimeout(activateRandomCircle, 300)
            }
        }, 2000)
    }, [gameActive, currentActiveCircle, deactivateCurrentCircle])

    useEffect(() => {
        if (!gameActive || !gameStarted) return

        // Start first circle after a brief delay
        const initialTimeout = setTimeout(activateRandomCircle, 1000)

        return () => clearTimeout(initialTimeout)
    }, [gameActive, gameStarted, activateRandomCircle])

    const handleCircleClick = (circleId: number) => {
        const circle = circles[circleId]

        if (circle.isActive && !circle.isAnimating && circleId === currentActiveCircle) {
            // Clear timeouts
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (countdownRef.current) clearTimeout(countdownRef.current)

            // Player hit the active circle
            setScore(prev => prev + 1)

            // Start fade out animation
            setCircles(prev => prev.map(c =>
                c.id === circleId
                    ? { ...c, isAnimating: true }
                    : c
            ))

            // Complete deactivation after animation and start next round
            setTimeout(() => {
                setCircles(prev => prev.map(c =>
                    c.id === circleId
                        ? { ...c, isActive: false, isAnimating: false }
                        : c
                ))
                setCurrentActiveCircle(null)

                // Start next circle
                setTimeout(activateRandomCircle, 500)
            }, 300)
        }
    }

    const handleStartGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentActiveCircle(null)
        setCircles(prev => prev.map(c => ({ ...c, isActive: false, isAnimating: false })))
    }

    const handleEndGame = () => {
        setGameActive(false)
        setGameStarted(false)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (countdownRef.current) clearTimeout(countdownRef.current)
        router.push('/main')
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-white rounded-full"></div>
                <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-white rounded-full"></div>
                <div className="absolute bottom-1/4 left-1/3 w-16 h-16 border border-white rounded-full"></div>
            </div>

            {!gameStarted ? (
                // Start screen
                <div className="text-center z-10 space-y-8 animate-fade-in">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-bold font-bpdots tracking-wider">
                            REACTION
                        </h1>
                        <h2 className="text-2xl font-bpdots text-gray-300">
                            /•GAME•/
                        </h2>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-3">
                            <h3 className="text-lg font-bpdots text-white">HOW TO PLAY</h3>
                            <div className="space-y-2 text-sm font-bpdots text-gray-300">
                                <p>• Click the glowing circles as fast as you can</p>
                                <p>• Each hit gives you +1 point</p>
                                <p>• Each miss costs you -1 point</p>
                                <p>• You have 2 seconds per circle</p>
                            </div>
                        </div>

                        <button
                            onClick={handleStartGame}
                            className="px-12 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bpdots text-xl hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-white/20"
                        >
                            START GAME
                        </button>
                    </div>
                </div>
            ) : (
                // Game screen
                <div className="w-full max-w-md mx-auto z-10">
                    {/* Score Display */}
                    <div className="text-center mb-12">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
                            <h1 className="text-2xl font-bpdots text-gray-300 mb-2">SCORE</h1>
                            <div className={`text-6xl font-bold font-bpdots transition-all duration-300 ${score >= 0 ? 'text-white' : 'text-red-400'
                                }`}>
                                {score >= 0 ? '+' : ''}{score}
                            </div>
                        </div>

                        {/* Timer bar */}
                        {currentActiveCircle !== null && (
                            <div className="w-full bg-white/20 rounded-full h-2 mb-4 overflow-hidden">
                                <div
                                    className="bg-white h-full transition-all duration-100 ease-linear"
                                    style={{ width: `${(timeLeft / 2) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Game Grid */}
                    <div className="grid grid-cols-2 gap-6 mb-12 justify-items-center">
                        {circles.map((circle) => (
                            <button
                                key={circle.id}
                                onClick={() => handleCircleClick(circle.id)}
                                className={`
                                    w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/60
                                    transition-all duration-300 ease-in-out relative
                                    ${circle.isActive && !circle.isAnimating
                                        ? 'bg-white shadow-lg shadow-white/50 border-white scale-110'
                                        : 'bg-transparent hover:border-white hover:scale-105'
                                    }
                                    ${circle.isAnimating
                                        ? 'opacity-0 scale-75'
                                        : 'opacity-100'
                                    }
                                    active:scale-95 hover:shadow-md hover:shadow-white/30
                                `}
                                disabled={!gameActive}
                            >
                                {/* Pulse effect for active circles */}
                                {circle.isActive && !circle.isAnimating && (
                                    <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-50" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Game info */}
                    <div className="text-center space-y-4">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                            <p className="text-sm text-gray-400 font-bpdots">
                                {currentActiveCircle !== null
                                    ? `Time left: ${timeLeft.toFixed(1)}s`
                                    : 'Get ready...'}
                            </p>
                        </div>

                        {/* End Game Button */}
                        <button
                            onClick={handleEndGame}
                            className="px-8 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300"
                        >
                            END GAME
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}