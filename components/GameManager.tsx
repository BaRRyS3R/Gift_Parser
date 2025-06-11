// src/components/GameManager.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Circle,
    GameStats,
    GameDifficulty,
    GameState,
    GameResult,
    AdaptiveState,
    ClickTiming
} from '@/types/game'
import {
    GAME_CONFIGS,
    createCircleGrid,
    getRandomActivationDelay,
    calculateProgressiveWrongPenalty,
    calculateDecoyPenalty,
    calculateFastClickBonus,
    updateAdaptiveState,
    shouldCreateDecoy,
    getAdjustedCircleActiveTime,
    calculateScoreMultiplier,
    getAdaptiveLevelDescription
} from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import GameGrid from './GameGrid'
import GameTimer from './GameTimer'
import GameResults from './GameResults'

interface GameManagerProps {
    difficulty: GameDifficulty
    onBackToMenu: () => void
}

const GAME_DURATION = 30

export default function GameManager({ difficulty, onBackToMenu }: GameManagerProps) {
    const config = GAME_CONFIGS[difficulty]
    const { saveGameResult } = useUser()

    const [circles, setCircles] = useState<Circle[]>(() => createCircleGrid(config.circleCount))
    const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED)
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
    const [showCircles, setShowCircles] = useState(false)

    const [stats, setStats] = useState<GameStats>({
        score: 0,
        correctHits: 0,
        wrongHits: 0,
        missedCircles: 0,
        totalCircles: 0,
        decoyHits: 0,
        consecutiveHits: 0,
        consecutiveMisses: 0,
        fastHits: 0,
        totalReactionTime: 0,
        hitCount: 0
    })

    const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
        level: 0,
        activationSpeedMultiplier: 1,
        simultaneousMultiplier: 1,
        activeTimeMultiplier: 1
    })

    const [isSavingResult, setIsSavingResult] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())
    const circleActivationTimesRef = useRef<Map<number, number>>(new Map())
    const gameSavedRef = useRef<boolean>(false)

    const clearAllTimeouts = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }
        if (activationTimeoutRef.current) {
            clearTimeout(activationTimeoutRef.current)
            activationTimeoutRef.current = null
        }
        circleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
        circleTimeoutsRef.current.clear()
    }, [])

    const triggerHapticFeedback = useCallback((type: 'success' | 'error' | 'impact') => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            const haptic = window.Telegram.WebApp.HapticFeedback

            switch (type) {
                case 'success':
                    haptic.notificationOccurred('success')
                    break
                case 'error':
                    haptic.notificationOccurred('error')
                    break
                case 'impact':
                    haptic.impactOccurred('light')
                    break
            }
        }
    }, [])

    const deactivateCircle = useCallback((circleId: number) => {
        activeCirclesRef.current.delete(circleId)
        circleActivationTimesRef.current.delete(circleId)

        setCircles(prev => prev.map(circle =>
            circle.id === circleId
                ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
                : circle
        ))

        const timeout = circleTimeoutsRef.current.get(circleId)
        if (timeout) {
            clearTimeout(timeout)
            circleTimeoutsRef.current.delete(circleId)
        }
    }, [])

    const activateRandomCircles = useCallback(() => {
        if (gameState !== GameState.PLAYING) return

        const currentActiveIds = activeCirclesRef.current
        const currentActiveCount = currentActiveIds.size

        let maxSimultaneous = config.maxSimultaneousCircles
        if (config.adaptiveScaling) {
            maxSimultaneous = Math.ceil(maxSimultaneous * adaptiveState.simultaneousMultiplier)
        }

        const availableSlots = maxSimultaneous - currentActiveCount

        if (availableSlots <= 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState)
            )
            return
        }

        const inactiveIds = Array.from({ length: config.circleCount }, (_, i) => i)
            .filter(id => !currentActiveIds.has(id))

        if (inactiveIds.length === 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState)
            )
            return
        }

        const maxToActivate = Math.min(availableSlots, inactiveIds.length)
        const numToActivate = Math.min(maxToActivate, Math.max(1, Math.floor(Math.random() * maxToActivate) + 1))

        const shuffled = [...inactiveIds].sort(() => Math.random() - 0.5)
        const selectedIds = shuffled.slice(0, numToActivate)

        console.log('Activating circles:', selectedIds)

        selectedIds.forEach(id => {
            activeCirclesRef.current.add(id)
            circleActivationTimesRef.current.set(id, Date.now())
        })

        const activationResults = selectedIds.map(id => {
            const isDecoy = shouldCreateDecoy(config.decoyProbability)
            return { id, isDecoy }
        })

        setCircles(prev => prev.map(circle => {
            const activationResult = activationResults.find(result => result.id === circle.id)
            if (activationResult) {
                return {
                    ...circle,
                    isActive: true,
                    isAnimating: false,
                    isDecoy: activationResult.isDecoy
                }
            }
            return circle
        }))

        const regularCircles = activationResults.filter(result => !result.isDecoy)
        setStats(prev => ({
            ...prev,
            totalCircles: prev.totalCircles + regularCircles.length
        }))

        selectedIds.forEach(circleId => {
            const circleResult = activationResults.find(result => result.id === circleId)
            const activeTime = getAdjustedCircleActiveTime(config.circleActiveTime, adaptiveState)

            const timeout = setTimeout(() => {
                console.log('Auto-deactivating circle:', circleId)

                if (!circleResult?.isDecoy) {
                    setStats(prev => {
                        const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
                        const newAdaptive = updateAdaptiveState(
                            adaptiveState,
                            0,
                            prev.consecutiveMisses + 1
                        )

                        setAdaptiveState(newAdaptive)

                        return {
                            ...prev,
                            score: prev.score - penalty,
                            missedCircles: prev.missedCircles + 1,
                            consecutiveHits: 0,
                            consecutiveMisses: prev.consecutiveMisses + 1
                        }
                    })
                }

                deactivateCircle(circleId)
            }, activeTime)

            circleTimeoutsRef.current.set(circleId, timeout)
        })

        activationTimeoutRef.current = setTimeout(
            () => activateRandomCircles(),
            getRandomActivationDelay(config, adaptiveState)
        )
    }, [config, deactivateCircle, gameState, adaptiveState])

    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING) return

        const circle = circles.find(c => c.id === circleId)
        if (!circle) return

        const clickTime = Date.now()
        const activationTime = circleActivationTimesRef.current.get(circleId)

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                console.log('Decoy hit on circle:', circleId)
                triggerHapticFeedback('error')

                setStats(prev => {
                    const penalty = calculateDecoyPenalty(prev.consecutiveMisses)
                    const newAdaptive = updateAdaptiveState(
                        adaptiveState,
                        0,
                        prev.consecutiveMisses + 1
                    )

                    setAdaptiveState(newAdaptive)

                    return {
                        ...prev,
                        score: prev.score - penalty,
                        decoyHits: prev.decoyHits + 1,
                        consecutiveHits: 0,
                        consecutiveMisses: prev.consecutiveMisses + 1
                    }
                })
            } else {
                console.log('Correct hit on circle:', circleId)
                triggerHapticFeedback('success')

                let reactionTime = 0
                let fastBonus = 0

                if (activationTime) {
                    reactionTime = clickTime - activationTime
                    fastBonus = calculateFastClickBonus(reactionTime, config.fastClickThreshold)
                }

                setStats(prev => {
                    const scoreMultiplier = calculateScoreMultiplier(prev.consecutiveHits + 1)
                    const baseScore = Math.floor(1 * scoreMultiplier) + fastBonus

                    const newAdaptive = updateAdaptiveState(
                        adaptiveState,
                        prev.consecutiveHits + 1,
                        0
                    )

                    setAdaptiveState(newAdaptive)

                    return {
                        ...prev,
                        score: prev.score + baseScore,
                        correctHits: prev.correctHits + 1,
                        consecutiveHits: prev.consecutiveHits + 1,
                        consecutiveMisses: 0,
                        fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                        totalReactionTime: prev.totalReactionTime + reactionTime,
                        hitCount: prev.hitCount + 1
                    }
                })
            }

            setCircles(prev => prev.map(c =>
                c.id === circleId ? { ...c, isAnimating: true } : c
            ))

            setTimeout(() => {
                deactivateCircle(circleId)
            }, 300)

        } else if (!circle.isActive && !circle.isAnimating) {
            console.log('Wrong click on circle:', circleId)
            triggerHapticFeedback('error')

            setStats(prev => {
                const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
                const newAdaptive = updateAdaptiveState(
                    adaptiveState,
                    0,
                    prev.consecutiveMisses + 1
                )

                setAdaptiveState(newAdaptive)

                return {
                    ...prev,
                    score: prev.score - penalty,
                    wrongHits: prev.wrongHits + 1,
                    consecutiveHits: 0,
                    consecutiveMisses: prev.consecutiveMisses + 1
                }
            })
        }
    }, [gameState, circles, deactivateCircle, triggerHapticFeedback, config, adaptiveState])

    const startGame = useCallback(() => {
        console.log('Starting game...')
        clearAllTimeouts()
        activeCirclesRef.current.clear()
        circleActivationTimesRef.current.clear()
        gameSavedRef.current = false

        setGameState(GameState.STARTING)
        setTimeLeft(GAME_DURATION)
        setIsSavingResult(false)
        setSaveError(null)
        setSaveSuccess(false)
        setStats({
            score: 0,
            correctHits: 0,
            wrongHits: 0,
            missedCircles: 0,
            totalCircles: 0,
            decoyHits: 0,
            consecutiveHits: 0,
            consecutiveMisses: 0,
            fastHits: 0,
            totalReactionTime: 0,
            hitCount: 0
        })
        setAdaptiveState({
            level: 0,
            activationSpeedMultiplier: 1,
            simultaneousMultiplier: 1,
            activeTimeMultiplier: 1
        })
        setCircles(createCircleGrid(config.circleCount))

        setTimeout(() => {
            setShowCircles(true)
        }, 50)

        setTimeout(() => {
            console.log('Starting game mechanics')
            setGameState(GameState.PLAYING)

            gameTimerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    console.log('Timer tick, time left:', prevTime - 1)
                    if (prevTime <= 1) {
                        console.log('Game finished by timer')
                        setGameState(GameState.FINISHED)
                        return 0
                    }
                    return prevTime - 1
                })
            }, 1000)

            setTimeout(() => {
                console.log('Starting circle activations')
                activateRandomCircles()
            }, 500)

        }, 1500)
    }, [config.circleCount, clearAllTimeouts, activateRandomCircles])

    useEffect(() => {
        startGame()
        return () => {
            clearAllTimeouts()
        }
    }, [])

    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            if (!activationTimeoutRef.current) {
                console.log('Restarting circle activations')
                activateRandomCircles()
            }
        } else if (gameState === GameState.FINISHED) {
            console.log('Game finished, clearing all timeouts')
            clearAllTimeouts()

            if (!gameSavedRef.current) {
                gameSavedRef.current = true
                setIsSavingResult(true)
                setSaveError(null)
                setSaveSuccess(false)

                const averageReactionTime = stats.hitCount > 0
                    ? Math.round(stats.totalReactionTime / stats.hitCount)
                    : 0

                const result: GameResult = {
                    difficulty,
                    score: stats.score,
                    correctHits: stats.correctHits,
                    wrongHits: stats.wrongHits,
                    missedCircles: stats.missedCircles,
                    decoyHits: stats.decoyHits,
                    accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                        ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                        : 0,
                    duration: GAME_DURATION,
                    fastHits: stats.fastHits,
                    averageReactionTime,
                    adaptiveLevel: adaptiveState.level
                }

                saveGameResult(result)
                    .then(() => {
                        console.log('Game result saved successfully')
                        setSaveSuccess(true)
                        setSaveError(null)
                    })
                    .catch(error => {
                        console.error('Error saving game result:', error)
                        setSaveError('Ошибка при сохранении результата в базу данных')
                        setSaveSuccess(false)
                    })
                    .finally(() => {
                        setIsSavingResult(false)
                    })
            }
        }
    }, [gameState])

    const restartGame = useCallback(() => {
        console.log('Restarting game...')
        setShowCircles(false)
        setTimeout(() => {
            startGame()
        }, 300)
    }, [startGame])

    if (gameState === GameState.FINISHED) {
        const averageReactionTime = stats.hitCount > 0
            ? Math.round(stats.totalReactionTime / stats.hitCount)
            : 0

        const result: GameResult = {
            difficulty,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                : 0,
            duration: GAME_DURATION,
            fastHits: stats.fastHits,
            averageReactionTime,
            adaptiveLevel: adaptiveState.level
        }

        return (
            <GameResults
                result={result}
                onPlayAgain={restartGame}
                onBackToMenu={onBackToMenu}
                isSaving={isSavingResult}
                saveError={saveError}
                saveSuccess={saveSuccess}
            />
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING) && (
                <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl font-bpdots transition-colors duration-300 ${stats.score >= 0 ? 'text-white' : 'text-red-400'
                            }`}>
                            Score: {stats.score >= 0 ? '+' : ''}{stats.score}
                        </div>
                        {stats.consecutiveHits > 0 && (
                            <div className="text-xs font-bpdots text-green-400">
                                {stats.consecutiveHits} streak
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center">
                        <GameTimer
                            timeLeft={timeLeft}
                            totalTime={GAME_DURATION}
                            isActive={gameState === GameState.PLAYING}
                        />
                        {config.adaptiveScaling && (
                            <div className="text-xs font-bpdots text-yellow-400 mt-1">
                                {getAdaptiveLevelDescription(adaptiveState.level)}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onBackToMenu}
                        className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
                    >
                        • END
                    </button>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={circles}
                    onCircleClick={handleCircleClick}
                    isGameActive={gameState === GameState.PLAYING}
                    showCircles={showCircles}
                />
            </div>
        </div>
    )
}