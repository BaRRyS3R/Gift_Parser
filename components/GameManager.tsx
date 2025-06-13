// src/components/GameManager.tsx - Fixed Precision Mode Scaling

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
    getPrecisionLevelConfig,
    getPrecisionSimultaneousCircles,
    getPrecisionRedCircles,
    getPrecisionActivationDelay,
    getPrecisionCircleActiveTime,
    getPrecisionDescription,
    calculatePrecisionModeScore,
    isPrecisionModeGameOver,
    getPrecisionModeDeathCause,
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
        const wasActive = activeCirclesRef.current.has(circleId)
        activeCirclesRef.current.delete(circleId)
        circleActivationTimesRef.current.delete(circleId)

        if (wasActive) {
            console.log(`Deactivating circle ${circleId}, remaining active: ${activeCirclesRef.current.size}`)
        }

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

    // Fixed function to get random circle IDs with proper precision scaling
    const getRandomCircleIds = useCallback((
        totalCircles: number,
        requestedCount: number,
        excludeIds: number[] = []
    ): number[] => {
        const availableIds = Array.from({ length: totalCircles }, (_, i) => i).filter(
            (id) => !excludeIds.includes(id),
        );

        let targetCount = requestedCount;
        if (isPrecisionMode && precisionState) {
            // Используем конфигурацию уровня для определения количества кругов
            const levelConfig = getPrecisionLevelConfig(precisionState.intensityLevel);
            targetCount = Math.min(levelConfig.simultaneousCircles, availableIds.length);
            console.log(`Precision Mode: Level ${precisionState.intensityLevel}, activating ${targetCount} circles`);
        } else {
            targetCount = Math.min(
                Math.floor(Math.random() * requestedCount) + 1,
                availableIds.length,
            );
        }

        const selectedIds: number[] = [];
        for (let i = 0; i < targetCount; i++) {
            const randomIndex = Math.floor(Math.random() * availableIds.length);
            const selectedId = availableIds.splice(randomIndex, 1)[0];
            selectedIds.push(selectedId);
        }

        return selectedIds;
    }, [precisionState, isPrecisionMode]);

    const activateRandomCircles = useCallback(() => {
        if (gameState !== GameState.PLAYING) return

        // Проверяем precisionState в начале функции
        if (isPrecisionMode && !precisionState) {
            console.error('Precision mode is active but precisionState is null')
            return
        }

        const currentActiveIds = activeCirclesRef.current
        const currentActiveCount = currentActiveIds.size

        // Get max simultaneous circles
        let maxSimultaneous = config.maxSimultaneousCircles
        let targetRedCircles = 0
        let activeTime = config.circleActiveTime

        if (isPrecisionMode && precisionState) {
            // Получаем конфигурацию текущего уровня
            const levelConfig = getPrecisionLevelConfig(precisionState.intensityLevel)
            maxSimultaneous = levelConfig.simultaneousCircles
            targetRedCircles = levelConfig.redCircles
            activeTime = levelConfig.circleActiveTime

            console.log(`🎯 PRECISION LEVEL ${precisionState.intensityLevel}:`)
            console.log(`   Max simultaneous: ${maxSimultaneous}`)
            console.log(`   Target red circles: ${targetRedCircles}`)
            console.log(`   Currently active: ${currentActiveCount}`)
            console.log(`   Description: ${levelConfig.description}`)
        } else if (config.adaptiveScaling) {
            maxSimultaneous = Math.ceil(maxSimultaneous * adaptiveState.simultaneousMultiplier)
        }

        const availableSlots = maxSimultaneous - currentActiveCount

        console.log(`📊 Available slots: ${availableSlots}`)

        if (availableSlots <= 0) {
            console.log(`⏳ No slots available, scheduling next activation`)
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return
        }

        const inactiveIds = Array.from({ length: config.circleCount }, (_, i) => i)
            .filter(id => !currentActiveIds.has(id))

        if (inactiveIds.length === 0) {
            console.log(`⚠️ No inactive circles available`)
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config, adaptiveState, precisionState)
            )
            return
        }

        // For precision mode, always try to fill all available slots
        let targetCircleCount = availableSlots
        if (isPrecisionMode && precisionState) {
            // В precision mode активируем все доступные слоты
            targetCircleCount = Math.min(availableSlots, inactiveIds.length)
            console.log(`🎯 PRECISION: Activating ${targetCircleCount} circles (level ${precisionState.intensityLevel})`)
        } else {
            // For standard mode, use some randomness
            targetCircleCount = Math.min(
                Math.floor(Math.random() * availableSlots) + 1,
                inactiveIds.length,
            )
        }

        // Select the circles to activate
        const selectedIds: number[] = []
        const availableIdsCopy = [...inactiveIds]

        // Активируем все выбранные круги одновременно
        for (let i = 0; i < targetCircleCount; i++) {
            if (availableIdsCopy.length === 0) break
            const randomIndex = Math.floor(Math.random() * availableIdsCopy.length)
            const selectedId = availableIdsCopy.splice(randomIndex, 1)[0]
            selectedIds.push(selectedId)
        }

        console.log(`🚀 ACTIVATING ${selectedIds.length} circles: [${selectedIds.join(', ')}]`)

        // Активируем все круги одновременно
        selectedIds.forEach(id => {
            activeCirclesRef.current.add(id)
            circleActivationTimesRef.current.set(id, Date.now())
        })

        // Determine which circles should be red
        let activationResults: { id: number; isDecoy: boolean }[]

        if (isPrecisionMode && precisionState && targetRedCircles > 0) {
            // Simple precision mode: specific number of red circles
            const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5)
            const redIds = shuffledIds.slice(0, Math.min(targetRedCircles, selectedIds.length))

            activationResults = selectedIds.map(id => ({
                id,
                isDecoy: redIds.includes(id)
            }))

            console.log(`🔴 Red circles: [${redIds.join(', ')}] (${redIds.length}/${targetRedCircles})`)
        } else {
            // Standard mode: use probability
            const decoyProbability = config.decoyProbability
            activationResults = selectedIds.map(id => ({
                id,
                isDecoy: shouldCreateDecoy(decoyProbability)
            }))
        }

        // Обновляем состояние всех кругов одновременно
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
        const decoyCircles = activationResults.filter(result => result.isDecoy)

        console.log(`✅ Activated: ${regularCircles.length} regular + ${decoyCircles.length} red circles`)

        setStats(prev => ({
            ...prev,
            totalCircles: prev.totalCircles + regularCircles.length
        }))

        // Устанавливаем таймеры для всех кругов
        selectedIds.forEach(circleId => {
            const circleResult = activationResults.find(result => result.id === circleId)
            const timeout = setTimeout(() => {
                console.log(`⚰️ Auto-deactivating circle: ${circleId}`)

                if (!circleResult?.isDecoy) {
                    if (isPrecisionMode) {
                        console.log(`💀 PRECISION MODE: Game over due to missed circle ${circleId}`)
                        endGameWithCause('miss')
                        return
                    } else {
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

        // Schedule next activation
        const nextActivationDelay = getRandomActivationDelay(config, adaptiveState, precisionState)
        if (isPrecisionMode && precisionState) {
            console.log(`⏱️ Next activation in ${nextActivationDelay}ms (level ${precisionState.intensityLevel})`)
        }

        activationTimeoutRef.current = setTimeout(
            () => activateRandomCircles(),
            nextActivationDelay
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
        console.log('Starting game mechanics')
        setGameState(GameState.PLAYING)
        setShowCircles(true)

        // Clear any existing timeouts
        clearAllTimeouts()

        // Start game timer for standard mode
        if (!isPrecisionMode) {
            gameTimerRef.current = setInterval(() => {
                setTimeLeft((prev: number): number => {
                    if (prev <= 1) {
                        clearAllTimeouts()
                        setGameState(GameState.FINISHED)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            // Start precision mode update interval
            precisionUpdateRef.current = setInterval(() => {
                setPrecisionState(prev => {
                    if (!prev) return null

                    const updated = updatePrecisionModeState(prev, PRECISION_MODE_UPDATE_INTERVAL, config)

                    // Если уровень изменился, обновляем конфигурацию
                    if (updated.intensityLevel !== prev.intensityLevel) {
                        const levelConfig = getPrecisionLevelConfig(updated.intensityLevel)
                        console.log(`🔥 PRECISION MODE: LEVEL UP! 🔥`)
                        console.log(`Level: ${prev.intensityLevel} → ${updated.intensityLevel}`)
                        console.log(`New config: simultaneous=${levelConfig.simultaneousCircles}, red=${levelConfig.redCircles}, active=${levelConfig.circleActiveTime}ms`)
                        console.log(`Description: ${levelConfig.description}`)

                        // Обновляем конфигурацию игры
                        config.maxSimultaneousCircles = levelConfig.simultaneousCircles
                        config.circleActiveTime = levelConfig.circleActiveTime
                        config.minActivationTime = levelConfig.activationTimeMin
                        config.maxActivationTime = levelConfig.activationTimeMax
                    }

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

    }, [config, clearAllTimeouts, activateRandomCircles, isPrecisionMode])

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
            const levelConfig = getPrecisionLevelConfig(precisionState.intensityLevel)

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
                            {levelConfig.description}
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