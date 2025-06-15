// src/game-modes/reaction/ReactionGameManager.tsx - Enhanced with detailed save status

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Target, Zap, Clock, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";

import {
    initializeReactionGameState,
    activateRandomCircle,
    handleCircleClick,
    createReactionGameResult,
    cleanupReactionGame,
    getRandomDelay,
    getReactionRatingDescription,
    getReactionRatingColor,
} from "./ReactionGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import {
    ReactionGameState,
    ReactionGameResult,
} from "@/types/game-modes/reaction";
import GameGrid from "@/components/GameGrid";

interface ReactionGameManagerProps {
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

export default function ReactionGameManager({
    onBackToMenu,
}: ReactionGameManagerProps) {
    const { saveGameResult } = useUser();
    const [gameState, setGameState] = useState<ReactionGameState>(
        initializeReactionGameState(),
    );
    const [showCircles, setShowCircles] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
    const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
    const [instructionStep, setInstructionStep] = useState(0);
    const gameStateRef = useRef<ReactionGameState>(gameState);

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

    const handleSaveGameResult = useCallback(async (result: ReactionGameResult) => {
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

    const handleGameTimeout = useCallback(() => {
        console.log("Reaction game timed out");

        setGameState((prev) => {
            const finalState = {
                ...prev,
                gameState: GameState.FINISHED,
                stats: {
                    ...prev.stats,
                    missedTarget: true,
                },
            };

            const result = createReactionGameResult(finalState);
            setGameResult(result);
            handleSaveGameResult(result);
            cleanupReactionGame(finalState);

            return finalState;
        });
    }, [handleSaveGameResult]);

    const handleCircleActivated = useCallback(
        (circleId: number) => {
            console.log(`Circle ${circleId} activated, waiting for click...`);
            triggerHapticFeedback("success");
        },
        [triggerHapticFeedback],
    );

    const handleCircleClickEvent = useCallback(
        (circleId: number) => {
            if (gameStateRef.current.gameState !== GameState.PLAYING) return;

            console.log("Reaction circle clicked:", circleId);

            const newState = handleCircleClick(gameStateRef.current, circleId);

            if (newState.gameState === GameState.FINISHED) {
                triggerHapticFeedback(
                    newState.stats.missedTarget ? "error" : "success",
                );

                const result = createReactionGameResult(newState);
                setGameResult(result);
                handleSaveGameResult(result);
                cleanupReactionGame(newState);
            }

            setGameState(newState);
        },
        [triggerHapticFeedback, handleSaveGameResult],
    );

    const startGame = useCallback(() => {
        console.log("Starting Reaction Game...");
        setGameState(initializeReactionGameState());
        setGameResult(null);
        setSaveStatus(initialSaveStatus);

        // Show circles
        setTimeout(() => {
            setShowCircles(true);
        }, 100);

        // Start game mechanics
        setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

            // Schedule circle activation after random delay
            const delay = getRandomDelay(gameStateRef.current.config);

            console.log(`Circle will activate in ${delay}ms`);

            const timeout = setTimeout(() => {
                if (gameStateRef.current.gameState === GameState.PLAYING) {
                    setGameState((current) =>
                        activateRandomCircle(
                            current,
                            handleCircleActivated,
                            handleGameTimeout,
                        ),
                    );
                }
            }, delay);

            setGameState((prev) => ({
                ...prev,
                startDelayTimeout: timeout,
            }));
        }, 800);
    }, [handleCircleActivated, handleGameTimeout]);

    const restartGame = useCallback(() => {
        setShowCircles(false);
        setTimeout(() => {
            startGame();
        }, 300);
    }, [startGame]);

    // Show instructions first
    useEffect(() => {
        const instructionTimer = setTimeout(
            () => {
                if (instructionStep < 2) {
                    setInstructionStep((prev) => prev + 1);
                } else {
                    startGame();
                }
            },
            instructionStep === 0 ? 2000 : 1500,
        );

        return () => clearTimeout(instructionTimer);
    }, [instructionStep, startGame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupReactionGame(gameStateRef.current);
        };
    }, []);

    // Render game results
    if (gameState.gameState === GameState.FINISHED && gameResult) {
        const rating = gameResult.rating;
        const ratingColor = getReactionRatingColor(rating);
        const ratingDescription = getReactionRatingDescription(rating);

        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">⚡</div>

                        <h1 className="text-4xl font-bold font-bpdots text-yellow-400">
                            REACTION TEST
                        </h1>

                        <div className="flex items-center justify-center space-x-2">
                            <Zap className="text-yellow-400" size={20} />
                            <p className="text-lg font-bpdots text-yellow-300">
                                Speed Test Complete
                            </p>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="text-sm font-bpdots text-yellow-400/60">
                                REACTION TIME
                            </div>
                            {gameResult.missed ? (
                                <div className="text-4xl font-bold font-bpdots text-red-400">
                                    MISSED
                                </div>
                            ) : (
                                <div className="text-4xl font-bold font-bpdots text-yellow-400">
                                    {gameResult.reactionTime}ms
                                </div>
                            )}
                            <div className={`text-lg font-bpdots ${ratingColor}`}>
                                {rating}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-yellow-400/60">
                                    SCORE
                                </div>
                                <div className="text-xl font-bold font-bpdots text-yellow-300">
                                    {gameResult.score}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs font-bpdots text-yellow-400/60">
                                    RATING
                                </div>
                                <div className={`text-xl font-bold font-bpdots ${ratingColor}`}>
                                    {rating}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-yellow-400/30 pt-4">
                            <div className="text-center">
                                <div className="text-sm font-bpdots text-yellow-400/80 mb-2">
                                    {ratingDescription}
                                </div>
                                {!gameResult.missed && (
                                    <div className="text-xs font-bpdots text-yellow-400/60">
                                        {gameResult.reactionTime <= 150
                                            ? "Superhuman reflexes!"
                                            : gameResult.reactionTime <= 200
                                                ? "Excellent speed!"
                                                : gameResult.reactionTime <= 300
                                                    ? "Good reaction time!"
                                                    : "Keep practicing!"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Save Status */}
                    {(saveStatus.isLoading || saveStatus.error || saveStatus.isSuccess) && (
                        <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
                            {saveStatus.isLoading && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-3">
                                        <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                                        <span className="font-bpdots text-sm text-yellow-300/80">
                                            {saveStatus.showRetryDetails
                                                ? `Retrying save (${saveStatus.attempt}/${saveStatus.maxAttempts})...`
                                                : "Recording reaction time..."
                                            }
                                        </span>
                                    </div>

                                    {saveStatus.showRetryDetails && (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <RotateCcw className="text-yellow-400/60" size={14} />
                                                <span className="text-xs font-bpdots text-yellow-400/60">
                                                    Connection issue - retrying automatically
                                                </span>
                                            </div>
                                            <div className="w-full bg-yellow-400/20 rounded-full h-1">
                                                <div
                                                    className="bg-yellow-400 h-1 rounded-full transition-all duration-300"
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
                                            ✓ Result saved successfully
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
                                        Your time was recorded locally but not synchronized
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
                            className="w-full px-6 py-4 bg-transparent border-2 border-yellow-400/60 text-yellow-300 rounded-xl font-bpdots text-lg hover:border-yellow-400 hover:bg-yellow-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saveStatus.isLoading}
                            onClick={restartGame}
                        >
                            TEST AGAIN
                        </button>

                        <button
                            className="w-full px-6 py-4 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saveStatus.isLoading}
                            onClick={onBackToMenu}
                        >
                            BACK TO MENU
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render instructions
    if (instructionStep < 3 && gameState.gameState === GameState.NOT_STARTED) {
        const instructions = [
            {
                icon: <Target className="text-yellow-400" size={48} />,
                title: "REACTION SPEED TEST",
                description: "Test your lightning-fast reflexes",
            },
            {
                icon: <Clock className="text-yellow-400" size={48} />,
                title: "WAIT FOR THE SIGNAL",
                description: "A target will appear after 3-5 seconds",
            },
            {
                icon: <Zap className="text-yellow-400" size={48} />,
                title: "CLICK AS FAST AS POSSIBLE",
                description: "Click the target the moment it appears",
            },
        ];

        const currentInstruction = instructions[instructionStep];

        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center space-y-8 animate-fade-in">
                    <div className="space-y-6">
                        <div className="flex justify-center">{currentInstruction.icon}</div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold font-bpdots text-yellow-400">
                                {currentInstruction.title}
                            </h1>
                            <p className="text-lg font-bpdots text-yellow-300/80">
                                {currentInstruction.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-2">
                        {instructions.map((_, index) => (
                            <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index <= instructionStep
                                        ? "bg-yellow-400"
                                        : "bg-yellow-400/30"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Render game interface
    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            {/* Game Header */}
            <div className="flex items-center justify-between px-6 py-4 pt-20 z-10">
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bpdots text-yellow-400">REACTION</div>
                    <div className="text-xs font-bpdots text-yellow-300/60 mt-1">
                        Speed Test
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold font-bpdots text-white">
                        {gameState.gameState === GameState.PLAYING ? "READY..." : "WAITING"}
                    </div>
                    <div className="text-xs font-bpdots text-white/60">
                        {gameState.gameState === GameState.PLAYING
                            ? "Click when target appears"
                            : "Preparing test"}
                    </div>
                </div>

                <button
                    className="text-yellow-400/80 font-bpdots text-lg hover:text-yellow-400 transition-colors duration-300"
                    onClick={onBackToMenu}
                >
                    QUIT
                </button>
            </div>

            {/* Game Grid */}
            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={gameState.circles}
                    isGameActive={gameState.gameState === GameState.PLAYING}
                    showCircles={showCircles}
                    onCircleClick={handleCircleClickEvent}
                />
            </div>

            {/* Bottom instruction */}
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm border-t border-yellow-400/30">
                <div className="px-6 py-4">
                    <div className="text-center">
                        <div className="text-sm font-bpdots text-yellow-300/80 mb-1">
                            {gameState.gameState === GameState.PLAYING
                                ? "Wait for the target to appear, then click it as fast as possible!"
                                : "Get ready... Target will appear in 3-5 seconds"}
                        </div>
                        <div className="text-xs font-bpdots text-yellow-400/60">
                            Test your reaction speed and reflexes
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}