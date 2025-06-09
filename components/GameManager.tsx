// src/components/GameManager.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Circle,
    GameStats,
    GameDifficulty,
    GameState,
    GameResult
} from '@/types/game'
import {
    GAME_CONFIGS,
    createCircleGrid,
    getRandomActivationDelay
} from '@/utils/gameUtils'
import GameGrid from './GameGrid'
import GameTimer from './GameTimer'
import GameResults from './GameResults'

interface GameManagerProps {
    difficulty: GameDifficulty
    onBackToMenu: () => void
}

const GAME_DURATION = 30 // 30 секунд

export default function GameManager({ difficulty, onBackToMenu }: GameManagerProps) {
    const config = GAME_CONFIGS[difficulty]

    const [circles, setCircles] = useState<Circle[]>(() => createCircleGrid(config.circleCount))
    const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED)
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
    const [showCircles, setShowCircles] = useState(false)
    const [activeCircleIds, setActiveCircleIds] = useState<Set<number>>(new Set())

    const [stats, setStats] = useState<GameStats>({
        score: 0,
        correctHits: 0,
        wrongHits: 0,
        missedCircles: 0,
        totalCircles: 0
    })

    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Очистка всех таймеров
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

    // Деактивация кружка
    const deactivateCircle = useCallback((circleId: number) => {
        setActiveCircleIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(circleId)
            return newSet
        })

        setCircles(prev => prev.map(circle =>
            circle.id === circleId
                ? { ...circle, isActive: false, isAnimating: false }
                : circle
        ))

        const timeout = circleTimeoutsRef.current.get(circleId)
        if (timeout) {
            clearTimeout(timeout)
            circleTimeoutsRef.current.delete(circleId)
        }
    }, [])

    // Активация случайных кружков
    const activateRandomCircles = useCallback(() => {
        // Получаем ID неактивных кружков
        const inactiveIds = Array.from({ length: config.circleCount }, (_, i) => i)
            .filter(id => !activeCircleIds.has(id))

        if (inactiveIds.length === 0) {
            activationTimeoutRef.current = setTimeout(
                activateRandomCircles,
                getRandomActivationDelay(config)
            )
            return
        }

        // Определяем количество кружков для активации
        const maxToActivate = Math.min(config.maxSimultaneousCircles, inactiveIds.length)
        const numToActivate = Math.max(1, Math.floor(Math.random() * maxToActivate) + 1)

        // Выбираем случайные кружки
        const shuffled = [...inactiveIds].sort(() => Math.random() - 0.5)
        const selectedIds = shuffled.slice(0, numToActivate)

        console.log('Activating circles:', selectedIds)

        // Обновляем состояние активных кружков
        setActiveCircleIds(prev => {
            const newSet = new Set(prev)
            selectedIds.forEach(id => newSet.add(id))
            return newSet
        })

        // Активируем выбранные кружки
        setCircles(prev => prev.map(circle =>
            selectedIds.includes(circle.id)
                ? { ...circle, isActive: true, isAnimating: false }
                : circle
        ))

        // Обновляем статистику
        setStats(prev => ({
            ...prev,
            totalCircles: prev.totalCircles + selectedIds.length
        }))

        // Устанавливаем таймеры автоматической деактивации
        selectedIds.forEach(circleId => {
            const timeout = setTimeout(() => {
                console.log('Auto-deactivating circle:', circleId)
                setStats(prev => ({
                    ...prev,
                    score: prev.score - 1,
                    missedCircles: prev.missedCircles + 1
                }))
                deactivateCircle(circleId)
            }, config.circleActiveTime)

            circleTimeoutsRef.current.set(circleId, timeout)
        })

        // Планируем следующую активацию
        activationTimeoutRef.current = setTimeout(
            activateRandomCircles,
            getRandomActivationDelay(config)
        )
    }, [config, activeCircleIds, deactivateCircle])

    // Обработка нажатия на кружок
    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING) return

        const circle = circles.find(c => c.id === circleId)
        if (!circle) return

        if (circle.isActive && !circle.isAnimating) {
            console.log('Correct hit on circle:', circleId)
            setStats(prev => ({
                ...prev,
                score: prev.score + 1,
                correctHits: prev.correctHits + 1
            }))

            setCircles(prev => prev.map(c =>
                c.id === circleId ? { ...c, isAnimating: true } : c
            ))

            setTimeout(() => {
                deactivateCircle(circleId)
            }, 300)

        } else if (!circle.isActive && !circle.isAnimating) {
            console.log('Wrong click on circle:', circleId)
            setStats(prev => ({
                ...prev,
                score: prev.score - 1,
                wrongHits: prev.wrongHits + 1
            }))
        }
    }, [gameState, circles, deactivateCircle])

    // Эффект для запуска игры
    useEffect(() => {
        let startTimer: NodeJS.Timeout

        const initializeGame = () => {
            console.log('Initializing game...')
            setGameState(GameState.STARTING)
            setTimeLeft(GAME_DURATION)
            setActiveCircleIds(new Set())
            setStats({
                score: 0,
                correctHits: 0,
                wrongHits: 0,
                missedCircles: 0,
                totalCircles: 0
            })
            setCircles(createCircleGrid(config.circleCount))

            // Показать кружки
            setTimeout(() => {
                setShowCircles(true)
            }, 500)

            // Запустить игру
            setTimeout(() => {
                console.log('Starting game timer and mechanics')
                setGameState(GameState.PLAYING)

                // Запустить основной таймер игры
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

                // Запустить активацию кружков
                activationTimeoutRef.current = setTimeout(() => {
                    console.log('Starting circle activations')
                    activateRandomCircles()
                }, 1000)

            }, 1500)
        }

        startTimer = setTimeout(initializeGame, 100)

        return () => {
            clearTimeout(startTimer)
            clearAllTimeouts()
        }
    }, [config.circleCount, activateRandomCircles, clearAllTimeouts])

    // Эффект для завершения игры
    useEffect(() => {
        if (gameState === GameState.FINISHED) {
            console.log('Game state changed to FINISHED, clearing all timeouts')
            clearAllTimeouts()
        }
    }, [gameState, clearAllTimeouts])

    // Перезапуск игры
    const restartGame = useCallback(() => {
        console.log('Restarting game...')
        clearAllTimeouts()
        setShowCircles(false)
        setGameState(GameState.NOT_STARTED)

        setTimeout(() => {
            setGameState(GameState.STARTING)
            setTimeLeft(GAME_DURATION)
            setActiveCircleIds(new Set())
            setStats({
                score: 0,
                correctHits: 0,
                wrongHits: 0,
                missedCircles: 0,
                totalCircles: 0
            })
            setCircles(createCircleGrid(config.circleCount))

            setTimeout(() => {
                setShowCircles(true)
            }, 500)

            setTimeout(() => {
                console.log('Restart: Starting game mechanics')
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

                activationTimeoutRef.current = setTimeout(() => {
                    activateRandomCircles()
                }, 1000)

            }, 1500)
        }, 300)
    }, [config.circleCount, activateRandomCircles, clearAllTimeouts])

    // Показ результатов
    if (gameState === GameState.FINISHED) {
        const result: GameResult = {
            difficulty,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            accuracy: stats.correctHits + stats.wrongHits > 0
                ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits)) * 100)
                : 0,
            duration: GAME_DURATION
        }

        return (
            <GameResults
                result={result}
                onPlayAgain={restartGame}
                onBackToMenu={onBackToMenu}
            />
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {/* Панель управления */}
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING) && (
                <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
                    <div className={`text-2xl font-bpdots transition-colors duration-300 ${stats.score >= 0 ? 'text-white' : 'text-red-400'
                        }`}>
                        Score: {stats.score >= 0 ? '+' : ''}{stats.score}
                    </div>

                    <GameTimer
                        timeLeft={timeLeft}
                        totalTime={GAME_DURATION}
                        isActive={gameState === GameState.PLAYING}
                    />

                    <button
                        onClick={onBackToMenu}
                        className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
                    >
                        • END
                    </button>
                </div>
            )}

            {/* Игровое поле */}
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