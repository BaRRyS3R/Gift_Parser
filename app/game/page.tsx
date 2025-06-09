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
    const [gameStarted, setGameStarted] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    const scheduleNextCircle = useCallback(() => {
        if (!gameActive) return

        setTimeout(() => {
            activateRandomCircle()
        }, 500)
    }, [gameActive])

    const activateRandomCircle = useCallback(() => {
        if (!gameActive) return

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }

        // Activate new random circle
        const randomIndex = Math.floor(Math.random() * 4)
        setCurrentActiveCircle(randomIndex)

        setCircles(prev => prev.map(circle =>
            circle.id === randomIndex
                ? { ...circle, isActive: true, isAnimating: false }
                : { ...circle, isActive: false, isAnimating: false }
        ))

        // Set timeout for auto-deactivation after 2 seconds
        timeoutRef.current = setTimeout(() => {
            // Circle timed out - penalize player
            setScore(prev => prev - 1)

            // Deactivate the circle
            setCircles(prev => prev.map(circle =>
                circle.id === randomIndex
                    ? { ...circle, isActive: false, isAnimating: false }
                    : circle
            ))
            setCurrentActiveCircle(null)

            // Schedule next circle
            scheduleNextCircle()
        }, 2000)
    }, [gameActive, scheduleNextCircle])

    useEffect(() => {
        if (!gameActive || !gameStarted) return

        // Start first circle after a brief delay
        const initialTimeout = setTimeout(() => {
            activateRandomCircle()
        }, 1000)

        return () => {
            clearTimeout(initialTimeout)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [gameActive, gameStarted, activateRandomCircle])

    const handleCircleClick = (circleId: number) => {
        const circle = circles[circleId]

        if (circle.isActive && !circle.isAnimating && circleId === currentActiveCircle) {
            // Clear the timeout since player clicked in time
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }

            // Player hit the active circle - award point
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

                // Schedule next circle
                scheduleNextCircle()
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
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        router.push('/main')
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-white rounded-full"></div>
                <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-white rounded-full"></div>
                <div className="absolute bottom-1/4 left-1/3 w-16 h-16 border border-white rounded-full"></div>
            </div>

            {!gameStarted ? (
                // Start screen
                <div className="flex-1 flex items-center justify-center p-8">
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
                </div>
            ) : (
                // Game screen
                <>
                    {/* Top bar with score and end game button */}
                    <div className="flex items-center justify-between px-6 py-4 pt-12 z-10">
                        <div className={`text-2xl font-bpdots transition-colors duration-300 ${score >= 0 ? 'text-white' : 'text-red-400'
                            }`}>
                            Score: {score >= 0 ? '+' : ''}{score}
                        </div>

                        <div className="text-white/40 text-2xl font-bpdots">|</div>

                        <button
                            onClick={handleEndGame}
                            className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
                        >
                            END GAME
                        </button>
                    </div>

                    {/* Game area */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="w-full max-w-md mx-auto z-10">
                            {/* Game Grid */}
                            <div className="grid grid-cols-2 gap-8 justify-items-center">
                                {circles.map((circle) => (
                                    <button
                                        key={circle.id}
                                        onClick={() => handleCircleClick(circle.id)}
                                        className={`
                                            w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-white/60
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
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}