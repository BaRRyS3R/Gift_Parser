// src/components/Game/GameManager.tsx - ИСПРАВЛЕН

'use client'

import { useState, useEffect, useCallback } from 'react'
import { GameDifficulty, GameState, Circle } from '@/types/game'
import { GAME_CONFIGS, createCircleGrid } from '@/utils/gameUtils'
import { GameResults } from '@/components'
import { triggerHapticFeedback } from './utils/hapticFeedback'

// Import custom hooks
import useGameLogic from './GameLogic/useGameLogic'
import useGameEngine from './GameEngine/useGameEngine'
import useScoreSystem from './ScoreSystem/useScoreSystem'
import useGameControls from './GameControls/useGameControls'
import useGameTimers from './GameTimers/useGameTimers'
import useGameSave from './GameSave/useGameSave'

// Import components
import StandardGameHUD from './GameHUD/StandardGameHUD'
import PrecisionGameHUD from './GameHUD/PrecisionGameHUD'
import GameContainer from './GameContainer/GameContainer'

interface GameManagerProps {
    difficulty: GameDifficulty
    onBackToMenu: () => void
}

export default function GameManager({ difficulty, onBackToMenu }: GameManagerProps) {
    const config = GAME_CONFIGS[difficulty]
    const isPrecisionMode = config.isPrecisionMode || false

    // Local state
    const [circles, setCircles] = useState<Circle[]>(() => createCircleGrid(config.circleCount))
    const [showCircles, setShowCircles] = useState(false)

    // Initialize stats based on mode
    const initialStats = {
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
    }

    // Custom hooks
    const {
        gameState,
        setGameState,
        stats,
        updateStats,
        adaptiveState,
        setAdaptiveState,
        precisionState,
        setPrecisionState,
        resetGame,
        endGameWithCause
    } = useGameLogic({ isPrecisionMode, initialStats })

    const {
        handleCorrectHit,
        handleDecoyHit,
        handleWrongClick,
        handleMissedCircle
    } = useScoreSystem({
        config,
        isPrecisionMode,
        adaptiveState,
        setAdaptiveState,
        onStatsUpdate: updateStats,
        onEndGame: endGameWithCause
    })

    const handleCircleTimeout = useCallback((circleId: number, isDecoy: boolean) => {
        if (!isDecoy) {
            handleMissedCircle()
        }

        setCircles(prev => prev.map(circle =>
            circle.id === circleId
                ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
                : circle
        ))
    }, [handleMissedCircle])

    const {
        clearAllTimeouts,
        deactivateCircle,
        activateRandomCircles,
        circleActivationTimesRef
    } = useGameEngine({
        config,
        isPrecisionMode,
        adaptiveState,
        precisionState,
        onCircleTimeout: handleCircleTimeout,
        onUpdateStats: updateStats,
        onEndGame: endGameWithCause
    })

    const { handleCircleClick } = useGameControls({
        circles,
        gameState,
        circleActivationTimes: circleActivationTimesRef,
        onCorrectHit: handleCorrectHit,
        onDecoyHit: handleDecoyHit,
        onWrongClick: handleWrongClick,
        onDeactivateCircle: deactivateCircle,
        onSetCircles: setCircles,
        triggerHapticFeedback
    })

    const [timeLeft, setTimeLeft] = useState(30)

    const { clearTimers } = useGameTimers({
        gameState,
        isPrecisionMode,
        precisionState,
        config,
        onTimeUpdate: setTimeLeft,
        onPrecisionUpdate: setPrecisionState,
        onGameEnd: () => setGameState(GameState.FINISHED),
        onStatsUpdate: updateStats
    })

    const { saveGame, isSavingResult, saveError, saveSuccess } = useGameSave({
        difficulty,
        isPrecisionMode
    })

    // Game initialization
    const startGame = useCallback(() => {
        console.log('Starting game...', isPrecisionMode ? 'Precision Mode' : 'Standard Mode')
        clearAllTimeouts()
        resetGame()

        setGameState(GameState.STARTING)
        setCircles(createCircleGrid(config.circleCount))

        setTimeout(() => {
            setShowCircles(true)
        }, 50)

        setTimeout(() => {
            console.log('Starting game mechanics')
            setGameState(GameState.PLAYING)

            setTimeout(() => {
                console.log('Starting circle activations')
                const { selectedIds, activationResults } = activateRandomCircles()

                if (selectedIds.length > 0) {
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
                }
            }, 500)
        }, 1500)
    }, [config.circleCount, clearAllTimeouts, resetGame, activateRandomCircles, isPrecisionMode])

    // Game finish effect
    useEffect(() => {
        if (gameState === GameState.FINISHED) {
            console.log('Game finished, saving result...')
            clearAllTimeouts()
            clearTimers()

            saveGame(stats, adaptiveState, precisionState)
                .catch(error => {
                    console.error('Failed to save game:', error)
                })
        }
    }, [gameState, clearAllTimeouts, clearTimers, saveGame, stats, adaptiveState, precisionState])

    // Initialize game on mount
    useEffect(() => {
        startGame()
        return () => {
            clearAllTimeouts()
            clearTimers()
        }
    }, [startGame, clearAllTimeouts, clearTimers])

    const restartGame = useCallback(() => {
        console.log('Restarting game...')
        setShowCircles(false)
        setTimeout(() => {
            startGame()
        }, 300)
    }, [startGame])

    // Render game results
    if (gameState === GameState.FINISHED) {
        // Create result object for display
        let result = {
            difficulty,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy: stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                ? Math.round((stats.correctHits / (stats.correctHits + stats.wrongHits + stats.decoyHits)) * 100)
                : 0,
            duration: isPrecisionMode ? Math.floor((precisionState?.survivalTime || 0) / 1000) : 30,
            fastHits: stats.fastHits,
            averageReactionTime: stats.hitCount > 0 ? Math.round(stats.totalReactionTime / stats.hitCount) : 0,
            adaptiveLevel: adaptiveState.level,
            survivalTime: precisionState?.survivalTime,
            maxIntensityReached: precisionState?.intensityLevel,
            perfectStreak: stats.perfectStreak,
            deathCause: isPrecisionMode ? 'miss' as const : undefined
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

    // Render game HUD
    const renderGameHUD = () => {
        if (isPrecisionMode && precisionState) {
            return (
                <PrecisionGameHUD
                    score={stats.score}
                    perfectStreak={stats.perfectStreak || 0}
                    precisionState={precisionState}
                    onBackToMenu={onBackToMenu}
                />
            )
        }

        return (
            <StandardGameHUD
                score={stats.score}
                consecutiveHits={stats.consecutiveHits}
                timeLeft={timeLeft}
                totalTime={30}
                isGameActive={gameState === GameState.PLAYING}
                adaptiveState={adaptiveState}
                config={config}
                onBackToMenu={onBackToMenu}
            />
        )
    }

    // Render main game
    return (
        <GameContainer
            circles={circles}
            gameState={gameState}
            showCircles={showCircles}
            onCircleClick={handleCircleClick}
        >
            {(gameState === GameState.STARTING || gameState === GameState.PLAYING) && renderGameHUD()}
        </GameContainer>
    )
}