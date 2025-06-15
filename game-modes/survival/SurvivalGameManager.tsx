// src/game-modes/survival/SurvivalGameManager.tsx - Fixed progress bar calculation

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Crosshair,
    AlertTriangle,
    Zap,
    Clock,
    Target,
    CheckCircle,
    AlertCircle,
    RotateCcw
} from "lucide-react";

import {
    initializeSurvivalGameState,
    updateSurvivalLevel,
    activateSurvivalCircles,
    handleSurvivalCircleClick,
    deactivateSurvivalCircle,
    createSurvivalGameResult,
    cleanupSurvivalGame,
    getLevelConfig,
    formatSurvivalTime,
} from "./SurvivalGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import {
    SurvivalGameState,
    SurvivalGameResult,
} from "@/types/game-modes/survival";
import GameGrid from "@/components/GameGrid";

interface SurvivalGameManagerProps {
    onBackToMenu: () => void;
}

interface SaveStatus {
    isLoading: boolean;
    attempt: number;
    maxAttempts: number;
    error: string | null;
    isSuccess: boolean;
    showRetryDetails: boolean;
}

const initialSaveStatus: SaveStatus = {
    isLoading: false,
    attempt: 0,
    maxAttempts: 3,
    error: null,
    isSuccess: false,
    showRetryDetails: false,
};

const LEVEL_UPDATE_INTERVAL = 100; // 100ms for smooth updates

export default function SurvivalGameManager({
    onBackToMenu,
}: SurvivalGameManagerProps) {
    const { saveGameResult } = useUser();
    const [gameState, setGameState] = useState<SurvivalGameState>(
        initializeSurvivalGameState(),
    );
    const [showCircles, setShowCircles] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
    const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
    const gameStateRef = useRef<SurvivalGameState>(gameState);

    // Update ref when state changes
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const triggerHapticFeedback = useCallback((type: "success" | "error") => {
        if (
            typeof window !== "undefined" &&
            window.Telegram?.WebApp?.HapticFeedback
        ) {
            const haptic = window.Telegram.WebApp.HapticFeedback;
            haptic.notificationOccurred(type);
        }
    }, []);

    const handleSaveGameResult = useCallback(async (result: SurvivalGameResult) => {
        setSaveStatus(prev => ({
            ...prev,
            isLoading: true,
            attempt: 1,
            error: null,
            isSuccess: false,
            showRetryDetails: false,
        }));

        let attemptCount = 1;

        const attemptSave = async (): Promise<void> => {
            setSaveStatus(prev => ({ ...prev, attempt: attemptCount }));

            if (attemptCount > 1) {
                setSaveStatus(prev => ({ ...prev, showRetryDetails: true }));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            try {
                await saveGameResult(result);
                setSaveStatus(prev => ({
                    ...prev,
                    isLoading: false,
                    isSuccess: true,
                    error: null,
                }));
            } catch (error) {
                attemptCount++;
                if (attemptCount <= 3) {
                    setSaveStatus(prev => ({ ...prev, attempt: attemptCount }));
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return attemptSave();
                } else {
                    throw error;
                }
            }
        };

        try {
            await attemptSave();
        } catch (error) {
            setSaveStatus(prev => ({
                ...prev,
                isLoading: false,
                isSuccess: false,
                error: error instanceof Error ? error.message : "Failed to save result after 3 attempts",
            }));
        }
    }, [saveGameResult]);

    const endGame = useCallback(
        (cause: "miss" | "wrong_click" | "decoy_hit") => {
            console.log("Survival game ended:", cause);

            setGameState((prev) => {
                const finalState = {
                    ...prev,
                    gameState: GameState.FINISHED,
                    isActive: false,
                };

                const result = createSurvivalGameResult(finalState);
                setGameResult(result);
                handleSaveGameResult(result);
                cleanupSurvivalGame(finalState);

                return finalState;
            });
        },
        [handleSaveGameResult],
    );

    const scheduleNextActivation = useCallback(() => {
        const currentState = gameStateRef.current;

        if (!currentState.isActive || currentState.gameState !== GameState.PLAYING)
            return;

        const levelConfig = getLevelConfig(currentState.currentLevel);
        const delay =
            Math.random() *
            (levelConfig.activationTimeMax - levelConfig.activationTimeMin) +
            levelConfig.activationTimeMin;

        const timeout = setTimeout(() => {
            if (
                gameStateRef.current.isActive &&
                gameStateRef.current.gameState === GameState.PLAYING
            ) {
                setGameState((prev) => {
                    const newState = activateSurvivalCircles(
                        prev,
                        (circleIds, redCircleIds) => {
                            console.log(
                                `Activated circles: ${circleIds.join(", ")}, Red: ${redCircleIds.join(", ")}`,
                            );
                        },
                        (circleId, wasDecoy) => {
                            console.log(`Circle ${circleId} timed out (decoy: ${wasDecoy})`);

                            if (!wasDecoy) {
                                // White circle timeout - game over
                                endGame("miss");
                            } else {
                                // Red circle timeout - continue game
                                setGameState((current) =>
                                    deactivateSurvivalCircle(current, circleId),
                                );
                                scheduleNextActivation();
                            }
                        },
                    );

                    return newState;
                });
                scheduleNextActivation();
            }
        }, delay);

        setGameState((prev) => ({
            ...prev,
            activationTimeout: timeout,
        }));
    }, [endGame]);

    const handleCircleClickEvent = useCallback(
        (circleId: number) => {
            if (gameStateRef.current.gameState !== GameState.PLAYING) return;

            console.log("Survival circle clicked:", circleId);

            const { newState, result } = handleSurvivalCircleClick(
                gameStateRef.current,
                circleId,
            );

            if (result === "correct") {
                triggerHapticFeedback("success");
                setGameState(newState);

                // Deactivate the clicked circle after animation
                setTimeout(() => {
                    setGameState((current) =>
                        deactivateSurvivalCircle(current, circleId),
                    );
                }, 300);
            } else if (result === "decoy") {
                triggerHapticFeedback("error");
                endGame("decoy_hit");
            } else {
                triggerHapticFeedback("error");
                endGame("wrong_click");
            }
        },
        [triggerHapticFeedback, endGame],
    );

    const startGame = useCallback(() => {
        console.log("Starting Survival Game...");
        setGameState(initializeSurvivalGameState());
        setGameResult(null);
        setSaveStatus(initialSaveStatus);

        // Show circles
        setTimeout(() => {
            setShowCircles(true);
        }, 100);

        // Start game mechanics
        setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

            // Start level update interval
            const levelInterval = setInterval(() => {
                setGameState((current) => {
                    if (!current.isActive || current.gameState !== GameState.PLAYING) {
                        clearInterval(levelInterval);
                        return current;
                    }

                    return updateSurvivalLevel(current, LEVEL_UPDATE_INTERVAL);
                });
            }, LEVEL_UPDATE_INTERVAL);

            // Start first activation
            setTimeout(() => {
                scheduleNextActivation();
            }, 1000);

            setGameState((prev) => ({
                ...prev,
                levelUpdateInterval: levelInterval,
            }));
        }, 800);
    }, [scheduleNextActivation]);

    const restartGame = useCallback(() => {
        setShowCircles(false);
        setTimeout(() => {
            startGame();
        }, 300);
    }, [startGame]);

    // Start game on component mount
    useEffect(() => {
        startGame();

        return () => {
            cleanupSurvivalGame(gameStateRef.current);
        };
    }, []);

    // FIXED: Calculate progress percentage for the current level
    const getProgressPercentage = () => {
        const maxLevels = 15;
        const currentLevel = gameState.currentLevel;

        // Simple linear progress: each level is 1/15 of total progress
        const progress = Math.min((currentLevel / maxLevels) * 100, 100);

        console.log(`Progress calculation: Level ${currentLevel}/${maxLevels} = ${progress}%`);

        return progress;
    };

    // Get the current progress value
    const currentProgress = getProgressPercentage();

    // Render game results
    if (gameState.gameState === GameState.FINISHED && gameResult) {
        const getDeathCauseIcon = () => {
            switch (gameResult.deathCause) {
                case "miss":
                    return <Clock className="text-red-400" size={20} />;
                case "wrong_click":
                    return <Target className="text-red-400" size={20} />;
                case "decoy_hit":
                    return <AlertTriangle className="text-red-400" size={20} />;
                default:
                    return <Crosshair className="text-red-400" size={20} />;
            }
        };

        const getDeathCauseMessage = () => {
            switch (gameResult.deathCause) {
                case "miss":
                    return "Failed to hit a white target in time";
                case "wrong_click":
                    return "Clicked an inactive target";
                case "decoy_hit":
                    return "Clicked a red trap circle";
                default:
                    return "Survival ended";
            }
        };

        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">💀</div>

                        <h1 className="text-4xl font-bold font-bpdots text-red-400">
                            SURVIVAL END
                        </h1>

                        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                {getDeathCauseIcon()}
                                <span className="font-bpdots text-sm text-red-300">
                                    {getDeathCauseMessage()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="text-sm font-bpdots text-red-400/60">
                                SURVIVAL TIME
                            </div>
                            <div className="text-4xl font-bold font-bpdots text-red-400">
                                {formatSurvivalTime(gameResult.survivalTime)}
                            </div>
                            <div className="text-lg font-bpdots text-red-300">
                                LEVEL {gameResult.maxLevelReached}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-red-400/60">
                                    FINAL SCORE
                                </div>
                                <div className="text-xl font-bold font-bpdots text-red-300">
                                    {gameResult.score}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-red-400/60">
                                    PERFECT STREAK
                                </div>
                                <div className="text-xl font-bold font-bpdots text-green-400">
                                    {gameResult.perfectStreak}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-red-400/60">
                                    CORRECT HITS
                                </div>
                                <div className="text-xl font-bold font-bpdots text-green-400">
                                    {gameResult.correctHits}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-red-400/60">
                                    MAX LEVEL
                                </div>
                                <div className="text-xl font-bold font-bpdots text-orange-400">
                                    {gameResult.maxLevelReached}/15
                                </div>
                            </div>
                        </div>

                        {/* Level Progress */}
                        <div className="border-t border-red-400/30 pt-4">
                            <div className="text-center space-y-2">
                                <div className="text-xs font-bpdots text-red-400/60 uppercase">
                                    Level Progress
                                </div>
                                <div className="text-xs font-bpdots text-red-400/60">
                                    {gameResult.maxLevelReached}/15 LEVELS COMPLETED
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Save Status */}
                    {(saveStatus.isLoading || saveStatus.error || saveStatus.isSuccess) && (
                        <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                            {saveStatus.isLoading && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-3">
                                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                        <span className="font-bpdots text-sm text-red-300/80">
                                            {saveStatus.showRetryDetails
                                                ? `Retrying save (${saveStatus.attempt}/${saveStatus.maxAttempts})...`
                                                : "Recording survival data..."
                                            }
                                        </span>
                                    </div>

                                    {saveStatus.showRetryDetails && (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <RotateCcw className="text-red-400/60" size={14} />
                                                <span className="text-xs font-bpdots text-red-400/60">
                                                    Connection issue - retrying automatically
                                                </span>
                                            </div>
                                            <div className="w-full bg-red-400/20 rounded-full h-1">
                                                <div
                                                    className="bg-red-400 h-1 rounded-full transition-all duration-300"
                                                    style={{ width: `${(saveStatus.attempt / saveStatus.maxAttempts) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {saveStatus.isSuccess && !saveStatus.isLoading && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <CheckCircle className="text-green-400" size={16} />
                                        <span className="font-bpdots text-sm text-green-400">
                                            ✓ Survival record saved successfully
                                        </span>
                                    </div>
                                    <div className="text-green-400/60 font-bpdots text-xs">
                                        {saveStatus.attempt > 1
                                            ? `Saved after ${saveStatus.attempt} attempts`
                                            : "Data synchronized with leaderboard"
                                        }
                                    </div>
                                </div>
                            )}

                            {saveStatus.error && !saveStatus.isLoading && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <AlertCircle className="text-red-400" size={16} />
                                        <span className="text-red-400 font-bpdots text-sm">
                                            ✗ Save failed after {saveStatus.maxAttempts} attempts
                                        </span>
                                    </div>
                                    <div className="text-red-400/60 font-bpdots text-xs mb-3">
                                        Your survival time was recorded locally but not synchronized
                                    </div>
                                    <button
                                        onClick={() => handleSaveGameResult(gameResult)}
                                        className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded font-bpdots text-xs hover:bg-red-400/30 transition-colors"
                                    >
                                        RETRY SAVE
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <button
                            className="w-full px-6 py-4 bg-transparent border-2 border-red-400/60 text-red-300 rounded-xl font-bpdots text-lg hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saveStatus.isLoading}
                            onClick={restartGame}
                        >
                            SURVIVE AGAIN
                        </button>

                        <button
                            className="w-full px-6 py-4 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saveStatus.isLoading}
                            onClick={onBackToMenu}
                        >
                            ESCAPE TO MENU
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render game interface - NO HEADER, redesigned bottom panel
    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {/* Game Grid - takes up most of the screen */}
            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={gameState.circles}
                    isGameActive={gameState.gameState === GameState.PLAYING}
                    showCircles={showCircles}
                    onCircleClick={handleCircleClickEvent}
                />
            </div>

            {/* Bottom Panel - Redesigned layout: LVL X | TIMER | QUIT + Progress Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-red-400/30 safe-area-inset-bottom">
                <div className="px-6 py-4">
                    {/* Top row: LVL X | TIMER | QUIT */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Level */}
                        <div className="flex items-center space-x-2">
                            <Zap className="text-orange-400" size={18} />
                            <span className="text-lg font-bold font-bpdots text-orange-400">
                                LVL {gameState.currentLevel}
                            </span>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center space-x-2">
                            <Clock className="text-white" size={18} />
                            <span className="text-lg font-bold font-bpdots text-white">
                                {formatSurvivalTime(gameState.stats.survivalTime)}
                            </span>
                        </div>

                        {/* Quit Button */}
                        <button
                            className="font-bpdots text-lg font-bold text-red-400/80 hover:text-red-400 transition-colors duration-300 px-3 py-1"
                            onClick={onBackToMenu}
                        >
                            QUIT
                        </button>
                    </div>

                    {/* Progress Bar - FIXED */}
                    <div className="space-y-2">
                        {/* Progress info */}
                        <div className="flex items-center justify-between text-xs font-bpdots">
                            <span className="text-red-400/60">
                                {gameState.currentLevel}/15 LEVELS
                            </span>
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="text-red-400" size={12} />
                                <span className="text-red-300 uppercase tracking-wider">
                                    ONE MISTAKE = DEATH
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}