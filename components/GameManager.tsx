// src/components/GameManager.tsx - Enhanced with Precision Mode

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Circle,
    GameStats,
    GameDifficulty,
    GameState,
    GameResult,
    AdaptiveState,
    ClickTiming,
    PrecisionModeState
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
    getAdaptiveLevelDescription,
    // Precision Mode functions
    initializePrecisionModeState,
    updatePrecisionModeState,
    getPrecisionModeIntensity,
    calculatePrecisionModeScore,
    isPrecisionModeGameOver,
    getPrecisionModeDeathCause,
    getAdjustedSimultaneousCircles,
    getAdjustedDecoyProbability,
    getRandomCircleIds,
    formatPrecisionTime
} from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import GameGrid from './GameGrid'
import GameTimer from './GameTimer'
import GameResults from './GameResults'

interface GameManagerProps {
    difficulty: GameDifficulty
    onBackToMenu: () => void
}

const STANDARD_GAME_DURATION = 30
const PRECISION_MODE_UPDATE_INTERVAL = 100 // Update precision mode every 100ms

export default function GameManager({ difficulty, onBackToMenu }: GameManagerProps) {
    const config = GAME_CONFIGS[difficulty]
    const { saveGameResult } = useUser()
    const isPrecisionMode = config.isPrecisionMode || false

    const [circles, setCircles] = useState<Circle[]>(() => createCircleGrid(config.circleCount))
    const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED)
    const [timeLeft, setTimeLeft] = useState(STANDARD_GAME_DURATION)
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
        hitCount: 0,
        // Precision Mode specific
        currentIntensityLevel: isPrecisionMode ? 1 : undefined,
        survivalTime: isPrecisionMode ? 0 : undefined,
        perfectStreak: isPrecisionMode ? 0 : undefined,
    })

    const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
        level: 0,
        activationSpeedMultiplier: 1,
        simultaneousMultiplier: 1,
        activeTimeMultiplier: 1
    })

    // Precision Mode state
    const [precisionState, setPrecisionState] = useState<PrecisionModeState | null>(
        isPrecisionMode ? initializePrecisionModeState() : null
    )

    const [isSavingResult, setIsSavingResult] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Refs for managing timeouts and intervals
    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const precisionUpdateRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())
    const circleActivationTimesRef = useRef<Map<number, number>>(new Map())
    const gameSavedRef = useRef<boolean>(false)
    const gameStartTimeRef = useRef<number>(0)

    const clearAllTimeouts = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }
        if (precisionUpdateRef.current) {
            clearInterval(precisionUpdateRef.current)
            precisionUpdateRef.current = null
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

    const endGameWithCause = useCallback((cause: 'miss' | 'wrong_click' | 'decoy_hit' | 'timeout') => {
        console.log(`Precision Mode: Game ended due to ${cause}`)
        setGameState(GameState.FINISHED)

        if (precisionState) {
            setPrecisionState(prev => prev ? { ...prev, isActive: false } : null)
        }

        clearAllTimeouts()
    }, [precisionState, clearAllTimeouts])

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
        if (isPrecisionMode && precisionState) {
            maxSimultaneous = getAdjustedSimultaneousCircles(maxSimultaneous, precisionState, config)
        } else if (config.adaptiveScaling) {
            maxSimultaneous = Math.ceil(maxSimultaneous * adaptiveState.simultaneousMultiplier)
        }

        const availableSlots = maxSimultaneous - currentActiveCount

        if (availableSlots <= 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return
        }

        const inactiveIds = Array.from({ length: config.circleCount }, (_, i) => i)
            .filter(id => !currentActiveIds.has(id))

        if (inactiveIds.length === 0) {
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return
        }

        const selectedIds = getRandomCircleIds(
            config.circleCount,
            Math.min(availableSlots, inactiveIds.length),
            Array.from(currentActiveIds),
            adaptiveState,
            precisionState,
            config
        )

        console.log('Activating circles:', selectedIds)

        selectedIds.forEach(id => {
            activeCirclesRef.current.add(id)
            circleActivationTimesRef.current.set(id, Date.now())
        })

        let adjustedDecoyProbability = config.decoyProbability
        if (isPrecisionMode && precisionState) {
            adjustedDecoyProbability = getAdjustedDecoyProbability(config.decoyProbability, precisionState, config)
        }

        const activationResults = selectedIds.map(id => {
            const isDecoy = shouldCreateDecoy(adjustedDecoyProbability)
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
            const activeTime = getAdjustedCircleActiveTime(
                config.circleActiveTime,
                adaptiveState,
                precisionState,
                config
            )

            const timeout = setTimeout(() => {
                console.log('Auto-deactivating circle:', circleId)

                if (!circleResult?.isDecoy) {
                    if (isPrecisionMode) {
                        // In Precision Mode, missing a circle ends the game
                        endGameWithCause('miss')
                        return
                    } else {
                        // Standard mode penalty
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
                }

                deactivateCircle(circleId)
            }, activeTime)

            circleTimeoutsRef.current.set(circleId, timeout)
        })

        activationTimeoutRef.current = setTimeout(
            () => activateRandomCircles(),
            getRandomActivationDelay(config, adaptiveState, precisionState)
        )
    }, [config, deactivateCircle, gameState, adaptiveState, precisionState, isPrecisionMode, endGameWithCause])

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

                if (isPrecisionMode) {
                    // In Precision Mode, clicking a decoy ends the game
                    setStats(prev => ({ ...prev, decoyHits: prev.decoyHits + 1 }))
                    endGameWithCause('decoy_hit')
                    return
                } else {
                    // Standard mode penalty
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
                }
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
                    let baseScore: number
                    let newStats: GameStats

                    if (isPrecisionMode) {
                        // Precision Mode scoring
                        const newPerfectStreak = (prev.perfectStreak || 0) + 1
                        baseScore = 10 + (newPerfectStreak * 2) + fastBonus // Higher base score + streak bonus

                        newStats = {
                            ...prev,
                            score: prev.score + baseScore,
                            correctHits: prev.correctHits + 1,
                            consecutiveHits: prev.consecutiveHits + 1,
                            consecutiveMisses: 0,
                            fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                            totalReactionTime: prev.totalReactionTime + reactionTime,
                            hitCount: prev.hitCount + 1,
                            perfectStreak: newPerfectStreak
                        }
                    } else {
                        // Standard mode scoring
                        const scoreMultiplier = calculateScoreMultiplier(prev.consecutiveHits + 1)
                        baseScore = Math.floor(1 * scoreMultiplier) + fastBonus

                        const newAdaptive = updateAdaptiveState(
                            adaptiveState,
                            prev.consecutiveHits + 1,
                            0
                        )
                        setAdaptiveState(newAdaptive)

                        newStats = {
                            ...prev,
                            score: prev.score + baseScore,
                            correctHits: prev.correctHits + 1,
                            consecutiveHits: prev.consecutiveHits + 1,
                            consecutiveMisses: 0,
                            fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                            totalReactionTime: prev.totalReactionTime + reactionTime,
                            hitCount: prev.hitCount + 1
                        }
                    }

                    return newStats
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

            if (isPrecisionMode) {
                // In Precision Mode, wrong clicks end the game
                setStats(prev => ({ ...prev, wrongHits: prev.wrongHits + 1 }))
                endGameWithCause('wrong_click')
                return
            } else {
                // Standard mode penalty
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
        }
    }, [gameState, circles, deactivateCircle, triggerHapticFeedback, config, adaptiveState, isPrecisionMode, endGameWithCause])

    const startGame = useCallback(() => {
        console.log('Starting game...', isPrecisionMode ? 'Precision Mode' : 'Standard Mode')
        clearAllTimeouts()
        activeCirclesRef.current.clear()
        circleActivationTimesRef.current.clear()
        gameSavedRef.current = false
        gameStartTimeRef.current = Date.now()

        setGameState(GameState.STARTING)
        setTimeLeft(STANDARD_GAME_DURATION)
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
            hitCount: 0,
            currentIntensityLevel: isPrecisionMode ? 1 : undefined,
            survivalTime: isPrecisionMode ? 0 : undefined,
            perfectStreak: isPrecisionMode ? 0 : undefined,
        })
        setAdaptiveState({
            level: 0,
            activationSpeedMultiplier: 1,
            simultaneousMultiplier: 1,
            activeTimeMultiplier: 1
        })
        setCircles(createCircleGrid(config.circleCount))

        if (isPrecisionMode) {
            setPrecisionState(initializePrecisionModeState())
        }

        setTimeout(() => {
            setShowCircles(true)
        }, 50)

        setTimeout(() => {
            console.log('Starting game mechanics')
            setGameState(GameState.PLAYING)

            if (!isPrecisionMode) {
                // Standard mode timer
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
            } else {
                // Precision Mode update loop
                precisionUpdateRef.current = setInterval(() => {
                    const currentTime = Date.now()
                    const deltaTime = PRECISION_MODE_UPDATE_INTERVAL

                    setPrecisionState(prev => {
                        if (!prev || !prev.isActive) return prev

                        const updated = updatePrecisionModeState(prev, deltaTime, config)

                        // Update stats with current precision state
                        setStats(prevStats => ({
                            ...prevStats,
                            currentIntensityLevel: updated.intensityLevel,
                            survivalTime: updated.survivalTime
                        }))

                        return updated
                    })
                }, PRECISION_MODE_UPDATE_INTERVAL)
            }

            setTimeout(() => {
                console.log('Starting circle activations')
                activateRandomCircles()
            }, 500)

        }, 1500)
    }, [config.circleCount, clearAllTimeouts, activateRandomCircles, isPrecisionMode, config])

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

                let result: GameResult

                if (isPrecisionMode && precisionState) {
                    // Precision Mode result
                    const finalScore = calculatePrecisionModeScore(
                        precisionState.survivalTime,
                        stats.perfectStreak || 0,
                        precisionState.intensityLevel
                    )

                    result = {
                        difficulty,
                        score: finalScore,
                        correctHits: stats.correctHits,
                        wrongHits: stats.wrongHits,
                        missedCircles: stats.missedCircles,
                        decoyHits: stats.decoyHits,
                        accuracy: stats.correctHits > 0 ? 100 : 0, // Precision mode: perfect or nothing
                        duration: Math.floor(precisionState.survivalTime / 1000),
                        fastHits: stats.fastHits,
                        averageReactionTime: stats.hitCount > 0 ? Math.round(stats.totalReactionTime / stats.hitCount) : 0,
                        adaptiveLevel: 0, // Not used in precision mode
                        survivalTime: precisionState.survivalTime,
                        maxIntensityReached: precisionState.intensityLevel,
                        perfectStreak: stats.perfectStreak || 0,
                        deathCause: getPrecisionModeDeathCause(stats.wrongHits, stats.missedCircles, stats.decoyHits)
                    }
                } else {
                    // Standard mode result
                    const averageReactionTime = stats.hitCount > 0
                        ? Math.round(stats.totalReactionTime / stats.hitCount)
                        : 0

                    result = {
                        difficulty,
                        score: stats.score,
                        correctHits: stats.correctHits,
                        wrongHits: stats.wrongHits,
                        missedCircles: stats.missedCircles,
                        decoyHits: stats.decoyHits,
                        accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                            ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                            : 0,
                        duration: STANDARD_GAME_DURATION,
                        fastHits: stats.fastHits,
                        averageReactionTime,
                        adaptiveLevel: adaptiveState.level
                    }
                }

                saveGameResult(result)
                    .then(() => {
                        console.log('Game result saved successfully')
                        setSaveSuccess(true)
                        setSaveError(null)
                    })
                    .catch(error => {
                        console.error('Error saving game result:', error)
                        setSaveError('Error saving result to database')
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
        let result: GameResult

        if (isPrecisionMode && precisionState) {
            const finalScore = calculatePrecisionModeScore(
                precisionState.survivalTime,
                stats.perfectStreak || 0,
                precisionState.intensityLevel
            )

            result = {
                difficulty,
                score: finalScore,
                correctHits: stats.correctHits,
                wrongHits: stats.wrongHits,
                missedCircles: stats.missedCircles,
                decoyHits: stats.decoyHits,
                accuracy: stats.correctHits > 0 ? 100 : 0,
                duration: Math.floor(precisionState.survivalTime / 1000),
                fastHits: stats.fastHits,
                averageReactionTime: stats.hitCount > 0 ? Math.round(stats.totalReactionTime / stats.hitCount) : 0,
                adaptiveLevel: 0,
                survivalTime: precisionState.survivalTime,
                maxIntensityReached: precisionState.intensityLevel,
                perfectStreak: stats.perfectStreak || 0,
                deathCause: getPrecisionModeDeathCause(stats.wrongHits, stats.missedCircles, stats.decoyHits)
            }
        } else {
            const averageReactionTime = stats.hitCount > 0
                ? Math.round(stats.totalReactionTime / stats.hitCount)
                : 0

            result = {
                difficulty,
                score: stats.score,
                correctHits: stats.correctHits,
                wrongHits: stats.wrongHits,
                missedCircles: stats.missedCircles,
                decoyHits: stats.decoyHits,
                accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                    ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                    : 0,
                duration: STANDARD_GAME_DURATION,
                fastHits: stats.fastHits,
                averageReactionTime,
                adaptiveLevel: adaptiveState.level
            }
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

    const renderGameHUD = () => {
        if (isPrecisionMode && precisionState) {
            const intensity = getPrecisionModeIntensity(precisionState.intensityLevel)

            return (
                <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
                    <div className="flex flex-col items-center">
                        <div className="text-2xl font-bpdots text-red-400 font-bold">
                            Score: {stats.score}
                        </div>
                        <div className="text-xs font-bpdots text-red-300">
                            Streak: {stats.perfectStreak || 0}
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-xl font-bpdots text-white font-bold">
                            {formatPrecisionTime(precisionState.survivalTime)}
                        </div>
                        <div className="text-sm font-bpdots text-red-400">
                            Level {precisionState.intensityLevel}
                        </div>
                        <div className="text-xs font-bpdots text-red-300">
                            {intensity.description}
                        </div>
                    </div>

                    <button
                        onClick={onBackToMenu}
                        className="text-red-400/80 font-bpdots text-lg hover:text-red-400 transition-colors duration-300"
                    >
                        • QUIT
                    </button>
                </div>
            )
        }

        // Standard mode HUD
        return (
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
                        totalTime={STANDARD_GAME_DURATION}
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
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING) && renderGameHUD()}

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