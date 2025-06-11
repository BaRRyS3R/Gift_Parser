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
import { useUser } from '@/hooks/useUser'
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
        totalCircles: 0
    })

    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeCirclesRef = useRef<Set<number>>(new Set())

    // ЕДИНСТВЕННОЕ ДОБАВЛЕНИЕ - флаг для предотвращения множественного сохранения
    const gameSavedRef = useRef<boolean>(false)

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
        activeCirclesRef.current.delete(circleId)

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
        if (gameState !== GameState.PLAYING) return

        // Получаем текущие активные круги из ref
        const currentActiveIds = activeCirclesRef.current
        const currentActiveCount = currentActiveIds.size

        // Проверяем, есть ли свободные слоты для активации
        const availableSlots = config.maxSimultaneousCircles - currentActiveCount

        if (availableSlots <= 0) {
            // Все слоты заняты, планируем следующую попытку
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config)
            )
            return
        }

        // Получаем ID неактивных кружков
        const inactiveIds = Array.from({ length: config.circleCount }, (_, i) => i)
            .filter(id => !currentActiveIds.has(id))

        if (inactiveIds.length === 0) {
            // Если все круги активны, планируем следующую попытку
            activationTimeoutRef.current = setTimeout(
                () => activateRandomCircles(),
                getRandomActivationDelay(config)
            )
            return
        }

        // Определяем количество кружков для активации (не больше доступных слотов)
        const maxToActivate = Math.min(availableSlots, inactiveIds.length)
        const numToActivate = Math.min(maxToActivate, Math.max(1, Math.floor(Math.random() * maxToActivate) + 1))

        // Выбираем случайные кружки
        const shuffled = [...inactiveIds].sort(() => Math.random() - 0.5)
        const selectedIds = shuffled.slice(0, numToActivate)

        console.log('Activating circles:', selectedIds)

        // Добавляем в активные
        selectedIds.forEach(id => activeCirclesRef.current.add(id))

        // Активируем выбранные кружки в UI
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
            () => activateRandomCircles(),
            getRandomActivationDelay(config)
        )
    }, [config, deactivateCircle, gameState])

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

    // Запуск игры
    const startGame = useCallback(() => {
        console.log('Starting game...')
        clearAllTimeouts()
        activeCirclesRef.current.clear()
        gameSavedRef.current = false // ДОБАВЛЕНО: сброс флага сохранения

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

        // Показать кружки
        setTimeout(() => {
            setShowCircles(true)
        }, 50)

        // Запустить игру
        setTimeout(() => {
            console.log('Starting game mechanics')
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

            // Запустить активацию кружков с небольшой задержкой
            setTimeout(() => {
                console.log('Starting circle activations')
                activateRandomCircles()
            }, 500)

        }, 1500)
    }, [config.circleCount, clearAllTimeouts, activateRandomCircles])

    // Инициализация игры при монтировании
    useEffect(() => {
        startGame()

        return () => {
            clearAllTimeouts()
        }
    }, []) // ВАЖНО: пустой массив зависимостей!

    // Эффект для отслеживания изменения gameState
    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            // Убеждаемся, что активация запущена
            if (!activationTimeoutRef.current) {
                console.log('Restarting circle activations')
                activateRandomCircles()
            }
        } else if (gameState === GameState.FINISHED) {
            console.log('Game finished, clearing all timeouts')
            clearAllTimeouts()

            // ИЗМЕНЕНО: сохраняем результат только один раз
            if (!gameSavedRef.current) {
                gameSavedRef.current = true

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

                saveGameResult(result).catch(error => {
                    console.error('Error saving game result:', error)
                })
            }
        }
    }, [gameState]) // ИСПРАВЛЕНО: убраны лишние зависимости

    // Перезапуск игры
    const restartGame = useCallback(() => {
        console.log('Restarting game...')
        setShowCircles(false)
        setTimeout(() => {
            startGame()
        }, 300)
    }, [startGame])

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