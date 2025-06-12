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
    PowerUp,
    PowerUpType,
    GameEffect,
    MemorySequence,
    GameSession
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
    calculateComboMultiplier,
    calculateComboScore,
    createPowerUp,
    shouldSpawnPowerUp,
    applyEarthquakeEffect,
    applyTornadoEffect,
    createMemorySequence,
    validateMemoryStep,
    calculateConsistencyRating,
    updateLastShotAccuracy,
    checkAchievements,
    POWER_UP_CONFIGS
} from '@/utils/gameUtils'
import { useUser } from '@/hooks/useUser'
import GameGrid from './GameGrid'
import GameTimer from './GameTimer'
import GameResults from './GameResults'

interface GameManagerProps {
    difficulty: GameDifficulty | GameMode
    onBackToMenu: () => void
}

const DEFAULT_GAME_DURATION = 30

export default function GameManager({ difficulty, onBackToMenu }: GameManagerProps) {
    const config = GAME_CONFIGS[difficulty]
    const { saveGameResult } = useUser()

    // Basic game state
    const [circles, setCircles] = useState<Circle[]>(() => createCircleGrid(config.circleCount))
    const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED)
    const [timeLeft, setTimeLeft] = useState(config.gameDuration || DEFAULT_GAME_DURATION)
    const [showCircles, setShowCircles] = useState(false)

    // Game statistics
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
        maxCombo: 0,
        currentCombo: 0,
        perfectStreak: 0,
        speedDemons: 0,
        lastShotAccuracy: 0,
        totalPowerUpsUsed: 0,
        memorySequencesCompleted: 0,
        sequencesCompleted: 0,
        averageComboLength: 0
    })

    // Game session data
    const [gameSession, setGameSession] = useState<GameSession>({
        mode: config.gameMode,
        difficulty: difficulty,
        startTime: Date.now(),
        activePowerUps: [],
        effects: config.effectsEnabled || [],
        comboMultiplier: 1,
        lastClickTimings: []
    })

    // Adaptive state
    const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
        level: 0,
        activationSpeedMultiplier: 1,
        simultaneousMultiplier: 1,
        activeTimeMultiplier: 1,
        effectIntensity: 0.5,
        powerUpFrequency: 1,
        comboRequirement: 3
    })

    // Power-ups and effects
    const [availablePowerUps, setAvailablePowerUps] = useState<PowerUp[]>([])
    const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0)
    const [shieldsActive, setShieldsActive] = useState(0)

    // Special mode states
    const [memorySequence, setMemorySequence] = useState<MemorySequence | null>(null)
    const [sequenceToRepeat, setSequenceToRepeat] = useState<number[]>([])
    const [sequenceStep, setSequenceStep] = useState(0)
    const [isShowingSequence, setIsShowingSequence] = useState(false)

    // Save state
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Refs for game management
    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())
    const circleActivationTimesRef = useRef<Map<number, number>>(new Map())
    const gameSavedRef = useRef<boolean>(false)
    const powerUpTimeoutsRef = useRef<Map<PowerUpType, NodeJS.Timeout>>(new Map())
    const effectAnimationRef = useRef<number>(0)

    // Clear all timeouts and intervals
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
        powerUpTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
        powerUpTimeoutsRef.current.clear()
        if (effectAnimationRef.current) {
            cancelAnimationFrame(effectAnimationRef.current)
        }
    }, [])

    // Haptic feedback
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

    // Power-up management
    const activatePowerUp = useCallback((type: PowerUpType) => {
        const powerUpConfig = POWER_UP_CONFIGS[type]

        setGameSession(prev => ({
            ...prev,
            activePowerUps: [...prev.activePowerUps.filter(p => p.type !== type), {
                ...powerUpConfig,
                isActive: true,
                remainingTime: powerUpConfig.duration
            }]
        }))

        setStats(prev => ({
            ...prev,
            totalPowerUpsUsed: prev.totalPowerUpsUsed + 1
        }))

        // Handle immediate effects
        switch (type) {
            case PowerUpType.SHIELD:
                setShieldsActive(prev => prev + 1)
                break
            case PowerUpType.MULTI_HIT:
                // Will be handled in click logic
                break
            case PowerUpType.FREEZE:
                // Pause all circle timeouts
                circleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
                setTimeout(() => {
                    // Resume after freeze duration
                    activeCirclesRef.current.forEach(circleId => {
                        const timeout = setTimeout(() => {
                            deactivateCircle(circleId)
                        }, config.circleActiveTime)
                        circleTimeoutsRef.current.set(circleId, timeout)
                    })
                }, powerUpConfig.duration)
                break
        }

        // Set expiration timeout
        if (powerUpConfig.duration > 0) {
            const timeout = setTimeout(() => {
                setGameSession(prev => ({
                    ...prev,
                    activePowerUps: prev.activePowerUps.filter(p => p.type !== type)
                }))
            }, powerUpConfig.duration)

            powerUpTimeoutsRef.current.set(type, timeout)
        }

        triggerHapticFeedback('success')
    }, [config.circleActiveTime])

    // Check if power-up is active
    const isPowerUpActive = useCallback((type: PowerUpType): boolean => {
        return gameSession.activePowerUps.some(p => p.type === type && p.isActive)
    }, [gameSession.activePowerUps])

    // Apply effects to circles
    const applyEffects = useCallback(() => {
        if (gameSession.effects.length === 0) return

        const gameTime = Date.now() - gameSession.startTime

        setCircles(prev => {
            let newCircles = [...prev]

            gameSession.effects.forEach(effect => {
                switch (effect) {
                    case GameEffect.EARTHQUAKE:
                        newCircles = applyEarthquakeEffect(newCircles, adaptiveState.effectIntensity)
                        break
                    case GameEffect.TORNADO:
                        newCircles = applyTornadoEffect(newCircles, gameTime, adaptiveState.effectIntensity)
                        break
                    case GameEffect.FADE:
                        // Implement fade effect logic
                        break
                    case GameEffect.SCALE:
                        // Implement scale effect logic
                        break
                }
            })

            return newCircles
        })

        if (gameState === GameState.PLAYING) {
            effectAnimationRef.current = requestAnimationFrame(applyEffects)
        }
    }, [gameSession.effects, gameSession.startTime, adaptiveState.effectIntensity, gameState])

    // Deactivate circle
    const deactivateCircle = useCallback((circleId: number) => {
        activeCirclesRef.current.delete(circleId)
        circleActivationTimesRef.current.delete(circleId)

        setCircles(prev => prev.map(circle =>
            circle.id === circleId
                ? {
                    ...circle,
                    isActive: false,
                    isAnimating: false,
                    isDecoy: false,
                    isMemoryVisible: false,
                    sequenceOrder: undefined
                }
                : circle
        ))

        const timeout = circleTimeoutsRef.current.get(circleId)
        if (timeout) {
            clearTimeout(timeout)
            circleTimeoutsRef.current.delete(circleId)
        }
    }, [])

    // Memory mode logic
    const startMemoryPhase = useCallback(() => {
        if (!config.isMemoryMode) return

        const sequence = createMemorySequence(config.circleCount, 3 + Math.floor(stats.memorySequencesCompleted / 3))
        setMemorySequence(sequence)
        setGameState(GameState.MEMORY_SHOWING)

        // Show circles for memory
        const newCircles = circles.map(circle => ({
            ...circle,
            isMemoryVisible: sequence.circles.includes(circle.id)
        }))
        setCircles(newCircles)

        // Hide after show time
        setTimeout(() => {
            setCircles(prev => prev.map(circle => ({
                ...circle,
                isMemoryVisible: false
            })))
            setGameState(GameState.MEMORY_RECALL)
        }, config.memoryShowTime || 2000)
    }, [config, circles, stats.memorySequencesCompleted])

    // Sequence mode logic
    const startSequencePhase = useCallback(() => {
        if (!config.isSequenceMode) return

        const sequenceLength = Math.min(config.sequenceLength || 3, config.circleCount)
        const sequence: number[] = []

        for (let i = 0; i < sequenceLength; i++) {
            let circleId
            do {
                circleId = Math.floor(Math.random() * config.circleCount)
            } while (sequence.includes(circleId))
            sequence.push(circleId)
        }

        setSequenceToRepeat(sequence)
        setSequenceStep(0)
        setIsShowingSequence(true)
        setGameState(GameState.SEQUENCE_SHOWING)

        // Show sequence
        sequence.forEach((circleId, index) => {
            setTimeout(() => {
                setCircles(prev => prev.map(circle => ({
                    ...circle,
                    isActive: circle.id === circleId,
                    sequenceOrder: circle.id === circleId ? index : undefined
                })))

                setTimeout(() => {
                    setCircles(prev => prev.map(circle => ({
                        ...circle,
                        isActive: false,
                        sequenceOrder: undefined
                    })))
                }, 800)
            }, index * 1000)
        })

        // Start input phase
        setTimeout(() => {
            setIsShowingSequence(false)
            setGameState(GameState.SEQUENCE_INPUT)
        }, sequence.length * 1000 + 500)
    }, [config])

    // Activate random circles (main game logic)
    const activateRandomCircles = useCallback(() => {
        if (gameState !== GameState.PLAYING) return

        // Handle special modes
        if (config.isMemoryMode && !memorySequence) {
            startMemoryPhase()
            return
        }

        if (config.isSequenceMode && sequenceToRepeat.length === 0) {
            startSequencePhase()
            return
        }

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
            const baseActiveTime = config.isBlindMode ?
                (config.blindFlashTime || 200) :
                getAdjustedCircleActiveTime(config.circleActiveTime, adaptiveState)

            const activeTime = isPowerUpActive(PowerUpType.SLOW_TIME) ? baseActiveTime * 2 : baseActiveTime

            const timeout = setTimeout(() => {
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
                            consecutiveMisses: prev.consecutiveMisses + 1,
                            currentCombo: 0
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
    }, [config, deactivateCircle, gameState, adaptiveState, memorySequence, sequenceToRepeat, startMemoryPhase, startSequencePhase, isPowerUpActive])

    // Handle circle click
    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING &&
            gameState !== GameState.MEMORY_RECALL &&
            gameState !== GameState.SEQUENCE_INPUT) return

        // Handle sequence mode input
        if (gameState === GameState.SEQUENCE_INPUT) {
            if (sequenceToRepeat[sequenceStep] === circleId) {
                setSequenceStep(prev => prev + 1)
                triggerHapticFeedback('success')

                if (sequenceStep + 1 >= sequenceToRepeat.length) {
                    // Sequence completed
                    setStats(prev => ({ ...prev, sequencesCompleted: prev.sequencesCompleted + 1 }))
                    setSequenceToRepeat([])
                    setSequenceStep(0)
                    setGameState(GameState.PLAYING)

                    // Award bonus points
                    setStats(prev => ({ ...prev, score: prev.score + sequenceToRepeat.length * 5 }))
                }
            } else {
                triggerHapticFeedback('error')
                // Reset sequence
                setSequenceStep(0)
            }
            return
        }

        // Handle memory mode recall
        if (gameState === GameState.MEMORY_RECALL && memorySequence) {
            if (validateMemoryStep(memorySequence, circleId)) {
                const newSequence = {
                    ...memorySequence,
                    currentStep: memorySequence.currentStep + 1
                }

                if (newSequence.currentStep >= memorySequence.circles.length) {
                    // Memory sequence completed
                    newSequence.isComplete = true
                    setStats(prev => ({
                        ...prev,
                        memorySequencesCompleted: prev.memorySequencesCompleted + 1,
                        score: prev.score + memorySequence.circles.length * 3
                    }))
                    setMemorySequence(null)
                    setGameState(GameState.PLAYING)
                    triggerHapticFeedback('success')
                } else {
                    setMemorySequence(newSequence)
                    triggerHapticFeedback('impact')
                }
            } else {
                triggerHapticFeedback('error')
                // Reset memory sequence
                setMemorySequence(null)
                setGameState(GameState.PLAYING)
            }
            return
        }

        const circle = circles.find(c => c.id === circleId)
        if (!circle) return

        const clickTime = Date.now()
        const activationTime = circleActivationTimesRef.current.get(circleId)

        // Handle magnet power-up (auto-aim to nearest active circle)
        let targetCircleId = circleId
        if (isPowerUpActive(PowerUpType.MAGNET) && !circle.isActive) {
            const activeCircles = circles.filter(c => c.isActive && !c.isAnimating)
            if (activeCircles.length > 0) {
                // Find nearest active circle (simplified logic)
                targetCircleId = activeCircles[0].id
                const targetCircle = circles.find(c => c.id === targetCircleId)
                if (targetCircle) {
                    circle.isActive = targetCircle.isActive
                    circle.isDecoy = targetCircle.isDecoy
                }
            }
        }

        if (circle.isActive && !circle.isAnimating) {
            let reactionTime = 0
            let fastBonus = 0

            if (activationTime) {
                reactionTime = clickTime - activationTime
                fastBonus = calculateFastClickBonus(reactionTime, config.fastClickThreshold)
            }

            if (circle.isDecoy) {
                triggerHapticFeedback('error')

                setStats(prev => {
                    const penalty = config.isReverseMode ?
                        -calculateDecoyPenalty(prev.consecutiveMisses) : // Reverse mode: decoy hits give points
                        calculateDecoyPenalty(prev.consecutiveMisses)

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
                        consecutiveMisses: prev.consecutiveMisses + 1,
                        currentCombo: 0
                    }
                })
            } else {
                triggerHapticFeedback('success')

                setStats(prev => {
                    const newCombo = prev.currentCombo + 1
                    const maxCombo = Math.max(prev.maxCombo, newCombo)

                    // Calculate base score
                    let baseScore = config.isReverseMode ? -1 : 1 // Reverse mode: hits lose points

                    // Apply combo multiplier
                    const comboMultiplier = calculateComboMultiplier(newCombo, isPowerUpActive(PowerUpType.COMBO_BOOST))
                    baseScore = calculateComboScore(baseScore, newCombo, isPowerUpActive(PowerUpType.COMBO_BOOST))

                    // Apply other bonuses
                    if (isPowerUpActive(PowerUpType.DOUBLE_SCORE)) {
                        baseScore *= 2
                    }

                    if (isPowerUpActive(PowerUpType.MULTI_HIT)) {
                        baseScore *= 3
                        // Deactivate multi-hit after use
                        setGameSession(prev => ({
                            ...prev,
                            activePowerUps: prev.activePowerUps.filter(p => p.type !== PowerUpType.MULTI_HIT)
                        }))
                    }

                    baseScore += fastBonus

                    // Track speed demons
                    const speedDemons = reactionTime < 100 ? prev.speedDemons + 1 : prev.speedDemons

                    // Update click timings for consistency tracking
                    const newClickTimings = [...prev.lastClickTimings, {
                        circleId,
                        clickTime,
                        activationTime: activationTime || clickTime,
                        reactionTime,
                        wasComboHit: newCombo > adaptiveState.comboRequirement,
                        powerUpActive: gameSession.activePowerUps.map(p => p.type)
                    }].slice(-10)

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
                        hitCount: prev.hitCount + 1,
                        currentCombo: newCombo,
                        maxCombo,
                        speedDemons,
                        lastShotAccuracy: updateLastShotAccuracy(newClickTimings)
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
            triggerHapticFeedback('error')

            // Check if shield protects from miss
            if (shieldsActive > 0) {
                setShieldsActive(prev => prev - 1)
                return // Shield absorbs the miss
            }

            setStats(prev => {
                const penalty = config.isReverseMode ?
                    -calculateProgressiveWrongPenalty(prev.consecutiveMisses) : // Reverse mode: misses give points
                    calculateProgressiveWrongPenalty(prev.consecutiveMisses)

                const newAdaptive = updateAdaptiveState(
                    adaptiveState,
                    0,
                    prev.consecutiveMisses + 1
                )

                setAdaptiveState(newAdaptive)

                // Check for precision mode game over
                if (config.isPrecisionMode) {
                    setGameState(GameState.FINISHED)
                }

                return {
                    ...prev,
                    score: prev.score - penalty,
                    wrongHits: prev.wrongHits + 1,
                    consecutiveHits: 0,
                    consecutiveMisses: prev.consecutiveMisses + 1,
                    currentCombo: 0
                }
            })
        }
    }, [gameState, circles, deactivateCircle, triggerHapticFeedback, config, adaptiveState, memorySequence, sequenceToRepeat, sequenceStep, isPowerUpActive, gameSession.activePowerUps, shieldsActive])

    // Spawn power-ups
    const spawnPowerUp = useCallback(() => {
        if (!config.powerUpsEnabled || config.powerUpsEnabled.length === 0) return

        const gameTime = Date.now() - gameSession.startTime

        if (shouldSpawnPowerUp(gameTime, lastPowerUpSpawn, 15000 / adaptiveState.powerUpFrequency)) {
            const availableTypes = config.powerUpsEnabled.filter(type =>
                !gameSession.activePowerUps.some(p => p.type === type)
            )

            if (availableTypes.length > 0) {
                const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)]
                const powerUp = createPowerUp(randomType)

                setAvailablePowerUps(prev => [...prev, powerUp])
                setLastPowerUpSpawn(gameTime)
            }
        }
    }, [config.powerUpsEnabled, gameSession.startTime, gameSession.activePowerUps, lastPowerUpSpawn, adaptiveState.powerUpFrequency])

    // Start game
    const startGame = useCallback(() => {
        clearAllTimeouts()
        activeCirclesRef.current.clear()
        circleActivationTimesRef.current.clear()
        gameSavedRef.current = false

        setGameState(GameState.STARTING)
        setTimeLeft(config.gameDuration || DEFAULT_GAME_DURATION)
        setIsSavingResult(false)
        setSaveError(null)
        setSaveSuccess(false)
        setShieldsActive(0)
        setMemorySequence(null)
        setSequenceToRepeat([])
        setSequenceStep(0)
        setAvailablePowerUps([])
        setLastPowerUpSpawn(0)

        // Reset stats
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
            maxCombo: 0,
            currentCombo: 0,
            perfectStreak: 0,
            speedDemons: 0,
            lastShotAccuracy: 0,
            totalPowerUpsUsed: 0,
            memorySequencesCompleted: 0,
            sequencesCompleted: 0,
            averageComboLength: 0,
            lastClickTimings: []
        })

        // Reset adaptive state
        setAdaptiveState({
            level: 0,
            activationSpeedMultiplier: 1,
            simultaneousMultiplier: 1,
            activeTimeMultiplier: 1,
            effectIntensity: 0.5,
            powerUpFrequency: 1,
            comboRequirement: 3
        })

        // Reset game session
        setGameSession({
            mode: config.gameMode,
            difficulty: difficulty,
            startTime: Date.now(),
            activePowerUps: [],
            effects: config.effectsEnabled || [],
            comboMultiplier: 1,
            lastClickTimings: []
        })

        setCircles(createCircleGrid(config.circleCount))

        setTimeout(() => {
            setShowCircles(true)
        }, 50)

        setTimeout(() => {
            setGameState(GameState.PLAYING)

            gameTimerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        setGameState(GameState.FINISHED)
                        return 0
                    }
                    return prevTime - 1
                })
            }, 1000)

            setTimeout(() => {
                activateRandomCircles()
            }, 500)
        }, 1500)
    }, [config, difficulty, clearAllTimeouts, activateRandomCircles])

    // Effect for handling game state changes
    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            if (!activationTimeoutRef.current && !config.isMemoryMode && !config.isSequenceMode) {
                activateRandomCircles()
            }

            // Start effect animations
            if (gameSession.effects.length > 0) {
                applyEffects()
            }

            // Start power-up spawning
            const powerUpInterval = setInterval(spawnPowerUp, 2000)
            return () => clearInterval(powerUpInterval)
        } else if (gameState === GameState.FINISHED) {
            clearAllTimeouts()

            if (!gameSavedRef.current) {
                gameSavedRef.current = true
                setIsSavingResult(true)
                setSaveError(null)
                setSaveSuccess(false)

                const averageReactionTime = stats.hitCount > 0
                    ? Math.round(stats.totalReactionTime / stats.hitCount)
                    : 0

                const gameResult: GameResult = {
                    difficulty: difficulty,
                    mode: config.gameMode,
                    score: stats.score,
                    correctHits: stats.correctHits,
                    wrongHits: stats.wrongHits,
                    missedCircles: stats.missedCircles,
                    decoyHits: stats.decoyHits,
                    accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                        ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                        : 0,
                    duration: config.gameDuration || DEFAULT_GAME_DURATION,
                    fastHits: stats.fastHits,
                    averageReactionTime,
                    adaptiveLevel: adaptiveState.level,
                    maxCombo: stats.maxCombo,
                    perfectStreak: stats.perfectStreak,
                    speedDemons: stats.speedDemons,
                    consistencyRating: calculateConsistencyRating(gameSession.lastClickTimings || []),
                    effectivenesss: stats.score / (config.gameDuration || DEFAULT_GAME_DURATION),
                    powerUpsUsed: stats.totalPowerUpsUsed,
                    memorySequencesCompleted: stats.memorySequencesCompleted,
                    sequencesCompleted: stats.sequencesCompleted,
                    achievements: checkAchievements(stats, gameResult).map(a => a.id)
                }

                saveGameResult(gameResult)
                    .then(() => {
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
    }, [gameState, activateRandomCircles, config, difficulty, stats, adaptiveState, gameSession, clearAllTimeouts, applyEffects, spawnPowerUp, saveGameResult, calculateConsistencyRating, checkAchievements])

    // Initialize game
    useEffect(() => {
        startGame()
        return () => {
            clearAllTimeouts()
        }
    }, [])

    // Restart game
    const restartGame = useCallback(() => {
        setShowCircles(false)
        setTimeout(() => {
            startGame()
        }, 300)
    }, [startGame])

    // Render results screen
    if (gameState === GameState.FINISHED) {
        const averageReactionTime = stats.hitCount > 0
            ? Math.round(stats.totalReactionTime / stats.hitCount)
            : 0

        const result: GameResult = {
            difficulty: difficulty,
            mode: config.gameMode,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                : 0,
            duration: config.gameDuration || DEFAULT_GAME_DURATION,
            fastHits: stats.fastHits,
            averageReactionTime,
            adaptiveLevel: adaptiveState.level,
            maxCombo: stats.maxCombo,
            perfectStreak: stats.perfectStreak,
            speedDemons: stats.speedDemons,
            consistencyRating: calculateConsistencyRating(gameSession.lastClickTimings),
            effectivenesss: stats.score / (config.gameDuration || DEFAULT_GAME_DURATION),
            powerUpsUsed: stats.totalPowerUpsUsed,
            memorySequencesCompleted: stats.memorySequencesCompleted,
            sequencesCompleted: stats.sequencesCompleted,
            achievements: checkAchievements(stats, result).map(a => a.id)
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

    // Render main game UI
    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING ||
                gameState === GameState.MEMORY_SHOWING || gameState === GameState.MEMORY_RECALL ||
                gameState === GameState.SEQUENCE_SHOWING || gameState === GameState.SEQUENCE_INPUT) && (
                    <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
                        {/* Score and combo */}
                        <div className="flex flex-col items-center">
                            <div className={`text-2xl font-bpdots transition-colors duration-300 ${stats.score >= 0 ? 'text-white' : 'text-red-400'
                                }`}>
                                Score: {stats.score >= 0 ? '+' : ''}{stats.score}
                            </div>
                            {stats.currentCombo > adaptiveState.comboRequirement && (
                                <div className="text-xs font-bpdots text-green-400">
                                    {stats.currentCombo}x COMBO!
                                </div>
                            )}
                            {shieldsActive > 0 && (
                                <div className="text-xs font-bpdots text-blue-400">
                                    🛡️ {shieldsActive} SHIELD{shieldsActive > 1 ? 'S' : ''}
                                </div>
                            )}
                        </div>

                        {/* Timer and mode info */}
                        <div className="flex flex-col items-center">
                            <GameTimer
                                timeLeft={timeLeft}
                                totalTime={config.gameDuration || DEFAULT_GAME_DURATION}
                                isActive={gameState === GameState.PLAYING}
                            />
                            <div className="text-xs font-bpdots text-white/60 mt-1">
                                {config.name}
                            </div>
                            {config.adaptiveScaling && (
                                <div className="text-xs font-bpdots text-yellow-400">
                                    {getAdaptiveLevelDescription(adaptiveState.level)}
                                </div>
                            )}
                        </div>

                        {/* End button */}
                        <button
                            onClick={onBackToMenu}
                            className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
                        >
                            • END
                        </button>
                    </div>
                )}

            {/* Active power-ups display */}
            {gameSession.activePowerUps.length > 0 && (
                <div className="flex justify-center px-6 pb-2">
                    <div className="flex space-x-2">
                        {gameSession.activePowerUps.map((powerUp) => (
                            <div
                                key={powerUp.type}
                                className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1 flex items-center space-x-2"
                            >
                                <span className="text-lg">{powerUp.icon}</span>
                                <span className="text-xs font-bpdots text-white font-bold">
                                    {powerUp.name}
                                </span>
                                {powerUp.duration > 0 && (
                                    <span className="text-xs font-bpdots text-white/60">
                                        {Math.ceil(powerUp.remainingTime / 1000)}s
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available power-ups */}
            {availablePowerUps.length > 0 && (
                <div className="flex justify-center px-6 pb-2">
                    <div className="flex space-x-2">
                        {availablePowerUps.map((powerUp, index) => (
                            <button
                                key={`${powerUp.type}-${index}`}
                                onClick={() => {
                                    activatePowerUp(powerUp.type)
                                    setAvailablePowerUps(prev => prev.filter((_, i) => i !== index))
                                }}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105"
                            >
                                <div className="flex flex-col items-center space-y-1">
                                    <span className="text-xl">{powerUp.icon}</span>
                                    <span className="text-xs font-bpdots text-white font-bold">
                                        {powerUp.name}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Game state messages */}
            {gameState === GameState.MEMORY_SHOWING && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 text-center">
                        <h2 className="text-2xl font-bpdots text-white font-bold mb-2">MEMORIZE!</h2>
                        <p className="text-white/80 font-bpdots">Remember the highlighted circles</p>
                    </div>
                </div>
            )}

            {gameState === GameState.MEMORY_RECALL && (
                <div className="flex justify-center px-6 pb-2">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
                        <span className="text-sm font-bpdots text-white">
                            CLICK REMEMBERED CIRCLES ({memorySequence?.currentStep || 0}/{memorySequence?.circles.length || 0})
                        </span>
                    </div>
                </div>
            )}

            {gameState === GameState.SEQUENCE_SHOWING && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 text-center">
                        <h2 className="text-2xl font-bpdots text-white font-bold mb-2">WATCH SEQUENCE!</h2>
                        <p className="text-white/80 font-bpdots">Remember the order</p>
                    </div>
                </div>
            )}

            {gameState === GameState.SEQUENCE_INPUT && (
                <div className="flex justify-center px-6 pb-2">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
                        <span className="text-sm font-bpdots text-white">
                            REPEAT SEQUENCE ({sequenceStep}/{sequenceToRepeat.length})
                        </span>
                    </div>
                </div>
            )}

            {/* Game grid */}
            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={circles}
                    onCircleClick={handleCircleClick}
                    isGameActive={gameState === GameState.PLAYING || gameState === GameState.MEMORY_RECALL || gameState === GameState.SEQUENCE_INPUT}
                    showCircles={showCircles}
                />
            </div>
        </div>
    )
}