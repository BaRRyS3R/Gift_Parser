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
    ClickTiming,
    GameMode,
    SkillLevel
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
    calculateReverseScore,
    calculatePrecisionPenalty,
    calculateSkillLevel,
    calculateEfficiencyRating,
    updateExtendedStats
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
        hitCount: 0,
        // Расширенная статистика
        perfectRuns: 0,
        nearMisses: 0,
        doubleHits: 0,
        speedBonusTotal: 0,
        longestStreak: 0,
        averageTimeBetweenHits: 0,
        earlyClicks: 0,
        lateClicks: 0,
        multiTouchEvents: 0,
        precisionMisses: 0
    })

    const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
        level: 0,
        activationSpeedMultiplier: 1,
        simultaneousMultiplier: 1,
        activeTimeMultiplier: 1
    })

    // Состояния для precision mode
    const [precisionLives, setPrecisionLives] = useState(config.precisionLives)
    const [survivalTime, setSurvivalTime] = useState(0)

    const [isSavingResult, setIsSavingResult] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const survivalTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())
    const circleActivationTimesRef = useRef<Map<number, number>>(new Map())
    const lastHitTimeRef = useRef<number>(0)
    const gameSavedRef = useRef<boolean>(false)
    const gameStartTimeRef = useRef<number>(0)

    const clearAllTimeouts = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }
        if (survivalTimerRef.current) {
            clearInterval(survivalTimerRef.current)
            survivalTimerRef.current = null
        }
        if (activationTimeoutRef.current) {
            clearTimeout(activationTimeoutRef.current)
            activationTimeoutRef.current = null
        }
        circleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
        circleTimeoutsRef.current.clear()
    }, [])

    const triggerHapticFeedback = useCallback((type: 'success' | 'error' | 'impact' | 'warning') => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            const haptic = window.Telegram.WebApp.HapticFeedback

            switch (type) {
                case 'success':
                    haptic.notificationOccurred('success')
                    break
                case 'error':
                    haptic.notificationOccurred('error')
                    break
                case 'warning':
                    haptic.notificationOccurred('warning')
                    break
                case 'impact':
                    haptic.impactOccurred('light')
                    break
            }
        }
    }, [])

    const endGameWithReason = useCallback((reason: 'time' | 'precision_fail') => {
        console.log(`Game ended with reason: ${reason}`)
        clearAllTimeouts()

        if (reason === 'precision_fail') {
            setGameState(GameState.PRECISION_FAILED)
        } else {
            setGameState(GameState.FINISHED)
        }
    }, [clearAllTimeouts])

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
                if (!circleResult?.isDecoy) {
                    setStats(prev => {
                        let newStats = { ...prev }

                        if (config.isReverseMode) {
                            // В reverse mode пропущенные круги дают очки
                            const reverseBonus = calculateReverseScore(false, false, prev.consecutiveMisses, config)
                            newStats.score += reverseBonus
                            newStats.consecutiveHits = 0
                            newStats.consecutiveMisses += 1
                        } else {
                            // В обычном режиме штрафуем за пропуски
                            const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
                            newStats.score -= penalty
                            newStats.consecutiveHits = 0
                            newStats.consecutiveMisses += 1

                            // В precision mode пропуск = конец игры
                            if (config.isPrecisionMode) {
                                newStats.precisionMisses += 1
                                setPrecisionLives(prev => {
                                    const newLives = prev - 1
                                    if (newLives <= 0) {
                                        setTimeout(() => endGameWithReason('precision_fail'), 100)
                                    }
                                    return newLives
                                })
                            }
                        }

                        newStats.missedCircles += 1
                        newStats = updateExtendedStats(newStats, 'miss')

                        const newAdaptive = updateAdaptiveState(adaptiveState, 0, newStats.consecutiveMisses)
                        setAdaptiveState(newAdaptive)

                        return newStats
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
    }, [config, deactivateCircle, gameState, adaptiveState, endGameWithReason])

    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING) return

        const circle = circles.find(c => c.id === circleId)
        if (!circle) return

        const clickTime = Date.now()
        const activationTime = circleActivationTimesRef.current.get(circleId)

        // Обрабатываем мультитач события
        setStats(prev => updateExtendedStats(prev, 'multitouch'))

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                console.log('Decoy hit on circle:', circleId)
                triggerHapticFeedback('error')

                setStats(prev => {
                    let newStats = { ...prev }

                    if (config.isReverseMode) {
                        // В reverse mode decoy дает еще больше очков
                        const reverseBonus = calculateReverseScore(true, true, prev.consecutiveMisses, config)
                        newStats.score += Math.abs(reverseBonus) * 2 // Двойной бонус за decoy в reverse mode
                        newStats.consecutiveHits += 1
                        newStats.consecutiveMisses = 0
                    } else {
                        // В обычном режиме decoy штрафует
                        const penalty = calculateDecoyPenalty(prev.consecutiveMisses)
                        newStats.score -= penalty
                        newStats.consecutiveHits = 0
                        newStats.consecutiveMisses += 1

                        // В precision mode decoy = конец игры
                        if (config.isPrecisionMode) {
                            newStats.precisionMisses += 1
                            setPrecisionLives(prev => {
                                const newLives = prev - 1
                                if (newLives <= 0) {
                                    setTimeout(() => endGameWithReason('precision_fail'), 100)
                                }
                                return newLives
                            })
                        }
                    }

                    newStats.decoyHits += 1
                    newStats = updateExtendedStats(newStats, 'hit')

                    const newAdaptive = updateAdaptiveState(
                        adaptiveState,
                        config.isReverseMode ? newStats.consecutiveHits : 0,
                        config.isReverseMode ? 0 : newStats.consecutiveMisses
                    )
                    setAdaptiveState(newAdaptive)

                    return newStats
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

                // Обновляем время между попаданиями
                const timeBetweenHits = lastHitTimeRef.current > 0 ? clickTime - lastHitTimeRef.current : 0
                lastHitTimeRef.current = clickTime

                setStats(prev => {
                    let newStats = { ...prev }

                    if (config.isReverseMode) {
                        // В reverse mode попадания отнимают очки
                        const reversePenalty = calculateReverseScore(true, false, prev.consecutiveMisses, config)
                        newStats.score += reversePenalty
                        newStats.consecutiveHits = 0
                        newStats.consecutiveMisses += 1
                    } else {
                        // В обычном режиме попадания дают очки
                        const scoreMultiplier = calculateScoreMultiplier(prev.consecutiveHits + 1)
                        const baseScore = Math.floor(1 * scoreMultiplier) + fastBonus
                        newStats.score += baseScore
                        newStats.consecutiveHits += 1
                        newStats.consecutiveMisses = 0
                        newStats.speedBonusTotal += fastBonus
                    }

                    newStats.correctHits += 1
                    newStats.fastHits += (fastBonus > 0 ? 1 : 0)
                    newStats.totalReactionTime += reactionTime
                    newStats.hitCount += 1
                    newStats.longestStreak = Math.max(newStats.longestStreak, newStats.consecutiveHits)

                    // Обновляем среднее время между попаданиями
                    if (timeBetweenHits > 0) {
                        const currentAverage = newStats.averageTimeBetweenHits || 0
                        const hitCount = newStats.hitCount
                        newStats.averageTimeBetweenHits = ((currentAverage * (hitCount - 1)) + timeBetweenHits) / hitCount
                    }

                    // Проверяем идеальные серии
                    if (newStats.consecutiveHits >= 5 && newStats.consecutiveHits % 5 === 0) {
                        newStats.perfectRuns += 1
                    }

                    newStats = updateExtendedStats(newStats, 'hit')

                    const newAdaptive = updateAdaptiveState(
                        adaptiveState,
                        config.isReverseMode ? 0 : newStats.consecutiveHits,
                        config.isReverseMode ? newStats.consecutiveMisses : 0
                    )
                    setAdaptiveState(newAdaptive)

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

            setStats(prev => {
                let newStats = { ...prev }

                if (config.isReverseMode) {
                    // В reverse mode промахи дают очки
                    const reverseBonus = calculateReverseScore(false, false, prev.consecutiveMisses, config)
                    newStats.score += reverseBonus
                    newStats.consecutiveHits = 0
                    newStats.consecutiveMisses += 1
                } else {
                    // В обычном режиме промахи штрафуют
                    const penalty = calculateProgressiveWrongPenalty(prev.consecutiveMisses)
                    newStats.score -= penalty
                    newStats.consecutiveHits = 0
                    newStats.consecutiveMisses += 1

                    // В precision mode промах = конец игры
                    if (config.isPrecisionMode) {
                        newStats.precisionMisses += 1
                        setPrecisionLives(prev => {
                            const newLives = prev - 1
                            if (newLives <= 0) {
                                setTimeout(() => endGameWithReason('precision_fail'), 100)
                            }
                            return newLives
                        })
                    }
                }

                newStats.wrongHits += 1
                newStats = updateExtendedStats(newStats, 'miss')

                const newAdaptive = updateAdaptiveState(
                    adaptiveState,
                    config.isReverseMode ? 0 : newStats.consecutiveHits,
                    config.isReverseMode ? newStats.consecutiveMisses : 0
                )
                setAdaptiveState(newAdaptive)

                return newStats
            })
        }
    }, [gameState, circles, deactivateCircle, triggerHapticFeedback, config, adaptiveState, endGameWithReason])

    const startGame = useCallback(() => {
        console.log('Starting game...')
        clearAllTimeouts()
        activeCirclesRef.current.clear()
        circleActivationTimesRef.current.clear()
        gameSavedRef.current = false
        gameStartTimeRef.current = Date.now()
        lastHitTimeRef.current = 0

        setGameState(GameState.STARTING)
        setTimeLeft(GAME_DURATION)
        setSurvivalTime(0)
        setPrecisionLives(config.precisionLives)
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
            perfectRuns: 0,
            nearMisses: 0,
            doubleHits: 0,
            speedBonusTotal: 0,
            longestStreak: 0,
            averageTimeBetweenHits: 0,
            earlyClicks: 0,
            lateClicks: 0,
            multiTouchEvents: 0,
            precisionMisses: 0
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

            // Основной таймер игры
            gameTimerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        console.log('Game finished by timer')
                        endGameWithReason('time')
                        return 0
                    }
                    return prevTime - 1
                })
            }, 1000)

            // Таймер выживания для precision mode
            if (config.isPrecisionMode) {
                survivalTimerRef.current = setInterval(() => {
                    setSurvivalTime(prev => prev + 0.1)
                }, 100)
            }

            setTimeout(() => {
                console.log('Starting circle activations')
                activateRandomCircles()
            }, 500)

        }, 1500)
    }, [config, clearAllTimeouts, activateRandomCircles, endGameWithReason])

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
        } else if (gameState === GameState.FINISHED || gameState === GameState.PRECISION_FAILED) {
            console.log('Game finished, clearing all timeouts')
            clearAllTimeouts()

            if (!gameSavedRef.current) {
                gameSavedRef.current = true
                setIsSavingResult(true)
                setSaveError(null)
                setSaveSuccess(false)

                const gameEndTime = Date.now()
                const actualDuration = config.isPrecisionMode ?
                    Math.floor(survivalTime * 1000) :
                    (GAME_DURATION - timeLeft) * 1000

                const averageReactionTime = stats.hitCount > 0
                    ? Math.round(stats.totalReactionTime / stats.hitCount)
                    : 0

                const accuracy = stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                    ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                    : 0

                const efficiencyRating = calculateEfficiencyRating(stats, actualDuration)
                const skillLevel = calculateSkillLevel(stats, config.gameMode)

                const result: GameResult = {
                    difficulty,
                    gameMode: config.gameMode,
                    score: stats.score,
                    correctHits: stats.correctHits,
                    wrongHits: stats.wrongHits,
                    missedCircles: stats.missedCircles,
                    decoyHits: stats.decoyHits,
                    accuracy,
                    duration: Math.floor(actualDuration / 1000),
                    fastHits: stats.fastHits,
                    averageReactionTime,
                    adaptiveLevel: adaptiveState.level,
                    // Новые поля
                    perfectRuns: stats.perfectRuns,
                    longestStreak: stats.longestStreak,
                    speedBonusTotal: stats.speedBonusTotal,
                    multiTouchEvents: stats.multiTouchEvents,
                    precisionMisses: stats.precisionMisses,
                    survivalTime: config.isPrecisionMode ? survivalTime : GAME_DURATION - timeLeft,
                    efficiencyRating,
                    skillLevel
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

    if (gameState === GameState.FINISHED || gameState === GameState.PRECISION_FAILED) {
        const actualDuration = config.isPrecisionMode ?
            Math.floor(survivalTime * 1000) :
            (GAME_DURATION - timeLeft) * 1000

        const averageReactionTime = stats.hitCount > 0
            ? Math.round(stats.totalReactionTime / stats.hitCount)
            : 0

        const accuracy = stats.correctHits + stats.wrongHits + stats.decoyHits > 0
            ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
            : 0

        const efficiencyRating = calculateEfficiencyRating(stats, actualDuration)
        const skillLevel = calculateSkillLevel(stats, config.gameMode)

        const result: GameResult = {
            difficulty,
            gameMode: config.gameMode,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy,
            duration: Math.floor(actualDuration / 1000),
            fastHits: stats.fastHits,
            averageReactionTime,
            adaptiveLevel: adaptiveState.level,
            perfectRuns: stats.perfectRuns,
            longestStreak: stats.longestStreak,
            speedBonusTotal: stats.speedBonusTotal,
            multiTouchEvents: stats.multiTouchEvents,
            precisionMisses: stats.precisionMisses,
            survivalTime: config.isPrecisionMode ? survivalTime : GAME_DURATION - timeLeft,
            efficiencyRating,
            skillLevel
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

    const getGameModeIndicator = () => {
        if (config.isReverseMode) {
            return (
                <div className="flex items-center space-x-2 text-purple-400">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bpdots">REVERSE MODE</span>
                </div>
            )
        }
        if (config.isPrecisionMode) {
            return (
                <div className="flex items-center space-x-2 text-red-400">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bpdots">PRECISION MODE</span>
                    <span className="text-xs font-bpdots">LIVES: {precisionLives}</span>
                </div>
            )
        }
        return null
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
                        {getGameModeIndicator()}
                    </div>

                    <div className="flex flex-col items-center">
                        <GameTimer
                            timeLeft={timeLeft}
                            totalTime={GAME_DURATION}
                            isActive={gameState === GameState.PLAYING}
                        />
                        {config.isPrecisionMode && (
                            <div className="text-xs font-bpdots text-orange-400 mt-1">
                                Survival: {survivalTime.toFixed(1)}s
                            </div>
                        )}
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