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
    getRandomActivationDelay,
    getRandomCircleIds
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

    const [stats, setStats] = useState<GameStats>({
        score: 0,
        correctHits: 0,
        wrongHits: 0,
        missedCircles: 0,
        totalCircles: 0
    })

    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const nextCircleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const gameStateRef = useRef<GameState>(GameState.NOT_STARTED)

    // Обновляем ref при изменении gameState
    useEffect(() => {
        gameStateRef.current = gameState
    }, [gameState])

    // Очистка всех таймеров
    const clearAllTimeouts = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }

        if (nextCircleTimeoutRef.current) {
            clearTimeout(nextCircleTimeoutRef.current)
            nextCircleTimeoutRef.current = null
        }

        circleTimeoutRefs.current.forEach(timeout => clearTimeout(timeout))
        circleTimeoutRefs.current.clear()
    }, [])

    // Деактивация кружка
    const deactivateCircle = useCallback((circleId: number) => {
        setCircles(prev => prev.map(circle =>
            circle.id === circleId
                ? { ...circle, isActive: false, isAnimating: false }
                : circle
        ))

        // Очищаем таймер для этого кружка
        const timeout = circleTimeoutRefs.current.get(circleId)
        if (timeout) {
            clearTimeout(timeout)
            circleTimeoutRefs.current.delete(circleId)
        }
    }, [])

    // Активация случайных кружков
    const activateRandomCircles = useCallback(() => {
        // Проверяем текущее состояние игры через ref
        if (gameStateRef.current !== GameState.PLAYING) {
            return
        }

        // Получаем текущее состояние кружков
        setCircles(currentCircles => {
            // Находим неактивные кружки
            const inactiveCircles = currentCircles.filter(circle => !circle.isActive)

            if (inactiveCircles.length === 0) {
                // Если нет доступных кружков, планируем следующую попытку
                nextCircleTimeoutRef.current = setTimeout(() => {
                    activateRandomCircles()
                }, getRandomActivationDelay(config))
                return currentCircles
            }

            // Определяем количество кружков для активации
            const maxToActivate = Math.min(config.maxSimultaneousCircles, inactiveCircles.length)
            const numToActivate = Math.floor(Math.random() * maxToActivate) + 1

            // Выбираем случайные кружки
            const selectedCircles = [...inactiveCircles]
                .sort(() => Math.random() - 0.5)
                .slice(0, numToActivate)

            const selectedIds = selectedCircles.map(circle => circle.id)

            // Обновляем статистику
            setStats(prev => ({
                ...prev,
                totalCircles: prev.totalCircles + selectedIds.length
            }))

            // Устанавливаем таймеры для автоматической деактивации
            selectedIds.forEach(circleId => {
                const timeout = setTimeout(() => {
                    // Кружок не был нажат - засчитываем промах
                    setStats(prev => ({
                        ...prev,
                        score: prev.score - 1,
                        missedCircles: prev.missedCircles + 1
                    }))
                    deactivateCircle(circleId)
                }, config.circleActiveTime)

                circleTimeoutRefs.current.set(circleId, timeout)
            })

            // Планируем следующую активацию
            nextCircleTimeoutRef.current = setTimeout(() => {
                activateRandomCircles()
            }, getRandomActivationDelay(config))

            // Возвращаем обновленное состояние кружков
            return currentCircles.map(circle =>
                selectedIds.includes(circle.id)
                    ? { ...circle, isActive: true, isAnimating: false }
                    : circle
            )
        })
    }, [config, deactivateCircle])

    // Обработка нажатия на кружок
    const handleCircleClick = useCallback((circleId: number) => {
        if (gameState !== GameState.PLAYING) return

        setCircles(prevCircles => {
            const circle = prevCircles.find(c => c.id === circleId)
            if (!circle) return prevCircles

            if (circle.isActive && !circle.isAnimating) {
                // Правильное нажатие
                setStats(prev => ({
                    ...prev,
                    score: prev.score + 1,
                    correctHits: prev.correctHits + 1
                }))

                // Запускаем анимацию исчезновения
                setTimeout(() => {
                    deactivateCircle(circleId)
                }, 300)

                return prevCircles.map(c =>
                    c.id === circleId
                        ? { ...c, isAnimating: true }
                        : c
                )
            } else if (!circle.isActive && !circle.isAnimating) {
                // Неправильное нажатие - штраф
                setStats(prev => ({
                    ...prev,
                    score: prev.score - 1,
                    wrongHits: prev.wrongHits + 1
                }))
            }

            return prevCircles
        })
    }, [gameState, deactivateCircle])

    // Запуск игры
    const startGame = useCallback(() => {
        console.log('Starting game...')
        setGameState(GameState.STARTING)
        setTimeLeft(GAME_DURATION)
        setStats({
            score: 0,
            correctHits: 0,
            wrongHits: 0,
            missedCircles: 0,
            totalCircles: 0
        })
        setCircles(createCircleGrid(config.circleCount))

        // Анимация появления кружков
        setTimeout(() => {
            setShowCircles(true)
        }, 500)

        // Запуск игрового процесса
        setTimeout(() => {
            console.log('Game starting - setting state to PLAYING')
            setGameState(GameState.PLAYING)

            // Запуск таймера игры
            gameTimerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGameState(GameState.FINISHED)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            // Запуск активации кружков
            console.log('Starting circle activation...')
            setTimeout(() => {
                activateRandomCircles()
            }, 500)
        }, 1500)
    }, [config.circleCount, activateRandomCircles])

    // Перезапуск игры
    const restartGame = useCallback(() => {
        clearAllTimeouts()
        setShowCircles(false)
        setTimeout(() => {
            startGame()
        }, 300)
    }, [startGame, clearAllTimeouts])

    // Завершение игры
    useEffect(() => {
        if (gameState === GameState.FINISHED) {
            console.log('Game finished, clearing timeouts')
            clearAllTimeouts()
        }
    }, [gameState, clearAllTimeouts])

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            clearAllTimeouts()
        }
    }, [clearAllTimeouts])

    // Автоматический запуск игры
    useEffect(() => {
        const timer = setTimeout(() => {
            startGame()
        }, 100)

        return () => clearTimeout(timer)
    }, [startGame])

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
            {/* Верхняя панель */}
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING) && (
                <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
                    <div className={`text-2xl font-bpdots transition-colors duration-300 ${stats.score >= 0 ? 'text-white' : 'text-red-400'}`}>
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