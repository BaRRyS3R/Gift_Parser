// src/game-modes/survival/SurvivalGameManager.tsx - Enhanced with Telegram back button

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Crosshair,
    AlertTriangle,
    Zap,
    Clock,
    Target,
    RotateCcw
} from "lucide-react";
import { useRouter } from "next/navigation";

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
import { userService } from "@/lib/supabase";
import { GameState } from "@/types/game-modes/common";
import {
    SurvivalGameState,
    SurvivalGameResult,
} from "@/types/game-modes/survival";
import GameGrid from "@/components/GameGrid";
import { useT } from "@/contexts/LocalizationContext";

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

const LEVEL_UPDATE_INTERVAL = 100;

export default function SurvivalGameManager() {
    const { saveGameResult, telegramUser } = useUser();
    const router = useRouter();
    const t = useT();
    const [gameState, setGameState] = useState<SurvivalGameState>(
        initializeSurvivalGameState(),
    );
    const [showCircles, setShowCircles] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
    const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
    const [isConsumingAttempt, setIsConsumingAttempt] = useState(false);
    const [hasConsumedInitialAttempt, setHasConsumedInitialAttempt] = useState(false);
    const [isRestartLoading, setIsRestartLoading] = useState(false);

    const gameStateRef = useRef<SurvivalGameState>(gameState);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Setup Telegram WebApp back button
    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                router.push("/game");
            });

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(() => { });
            };
        }
    }, [router]);

    // Consume attempt immediately when component mounts (initial entry only)
    useEffect(() => {
        const consumeInitialAttempt = async () => {
            if (!telegramUser?.id || hasConsumedInitialAttempt) return;

            try {
                setIsConsumingAttempt(true);
                const newStatus = await userService.consumeAttemptWithServerValidation(telegramUser.id);
                setAttemptsRemaining(newStatus.attemptsRemaining);
                setHasConsumedInitialAttempt(true);

                // Auto-start the game after consuming attempt
                setTimeout(() => {
                    startGame();
                }, 500);
            } catch (error) {
                console.error("Error consuming initial attempt:", error);
                setHasConsumedInitialAttempt(true);
                // Still try to start the game even if attempt consumption failed
                setTimeout(() => {
                    startGame();
                }, 500);
            } finally {
                setIsConsumingAttempt(false);
            }
        };

        consumeInitialAttempt();
    }, [telegramUser?.id, hasConsumedInitialAttempt]);

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
                error: error instanceof Error ? error.message : t('errors.saveGameResult'),
            }));
        }
    }, [saveGameResult, t]);

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
                                endGame("miss");
                            } else {
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

        setTimeout(() => {
            setShowCircles(true);
        }, 100);

        setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

            const levelInterval = setInterval(() => {
                setGameState((current) => {
                    if (!current.isActive || current.gameState !== GameState.PLAYING) {
                        clearInterval(levelInterval);
                        return current;
                    }

                    return updateSurvivalLevel(current, LEVEL_UPDATE_INTERVAL);
                });
            }, LEVEL_UPDATE_INTERVAL);

            setTimeout(() => {
                scheduleNextActivation();
            }, 1000);

            setGameState((prev) => ({
                ...prev,
                levelUpdateInterval: levelInterval,
            }));
        }, 800);
    }, [scheduleNextActivation]);

    const restartGame = useCallback(async () => {
        if (!telegramUser?.id || attemptsRemaining <= 0 || isRestartLoading) return;

        try {
            setIsRestartLoading(true);

            const newStatus = await userService.consumeAttemptWithServerValidation(telegramUser.id);
            setAttemptsRemaining(newStatus.attemptsRemaining);

            setShowCircles(false);

            setTimeout(() => {
                startGame();
            }, 200);

        } catch (error) {
            console.error("Error consuming attempt for restart:", error);
        } finally {
            setIsRestartLoading(false);
        }
    }, [telegramUser?.id, attemptsRemaining, startGame, isRestartLoading]);

    useEffect(() => {
        return () => {
            cleanupSurvivalGame(gameStateRef.current);
        };
    }, []);

    const getDeathCauseIcon = (deathCause: string) => {
        switch (deathCause) {
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

    const getDeathCauseMessage = (deathCause: string) => {
        const key = `game.modes.survival.deathCauses.${deathCause}` as any;
        return t(key) || t('game.modes.survival.deathCauses.default');
    };

    if (isConsumingAttempt) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin mx-auto" />
                    <p className="text-red-300">{t('game.general.initializingGame')}</p>
                </div>
            </div>
        );
    }

    if (gameState.gameState === GameState.FINISHED && gameResult) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">💀</div>

                        <h1 className="text-4xl font-bold text-red-400">
                            {t('game.modes.survival.results.title')}
                        </h1>

                        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                {getDeathCauseIcon(gameResult.deathCause)}
                                <span className="text-sm text-red-300">
                                    {getDeathCauseMessage(gameResult.deathCause)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="text-sm text-red-400/60">
                                {t('game.modes.survival.results.survivalTime')}
                            </div>
                            <div className="text-4xl font-bold text-red-400">
                                {formatSurvivalTime(gameResult.survivalTime)}
                            </div>
                            <div className="text-lg text-red-300">
                                {t('common.level')} {gameResult.maxLevelReached}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center space-y-1">
                                <div className="text-xs text-red-400/60">
                                    {t('game.modes.survival.results.finalScore')}
                                </div>
                                <div className="text-xl font-bold text-red-300">
                                    {gameResult.score}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs text-red-400/60">
                                    {t('game.modes.survival.results.attemptsLeft')}
                                </div>
                                <div className="text-xl font-bold text-green-400">
                                    {attemptsRemaining}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs text-red-400/60">
                                    {t('game.modes.survival.results.perfectStreak')}
                                </div>
                                <div className="text-xl font-bold text-green-400">
                                    {gameResult.perfectStreak}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <div className="text-xs text-red-400/60">
                                    {t('game.modes.survival.results.correctHits')}
                                </div>
                                <div className="text-xl font-bold text-green-400">
                                    {gameResult.correctHits}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-red-400/30 pt-4">
                            <div className="text-center space-y-2">
                                <div className="text-xs text-red-400/60 uppercase">
                                    {t('game.modes.survival.results.levelProgress')}
                                </div>
                                <div className="text-xs text-red-400/60">
                                    {gameResult.maxLevelReached}/15 {t('game.modes.survival.results.levelsCompleted')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {(saveStatus.isLoading || saveStatus.error || saveStatus.isSuccess) && (
                        <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                            {saveStatus.isLoading && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-3">
                                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                        <span className="text-sm text-red-300/80">
                                            {saveStatus.showRetryDetails
                                                ? t('save.retrying', { attempt: saveStatus.attempt, max: saveStatus.maxAttempts })
                                                : t('save.recording')
                                            }
                                        </span>
                                    </div>

                                    {saveStatus.showRetryDetails && (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <RotateCcw className="text-red-400/60" size={14} />
                                                <span className="text-xs text-red-400/60">
                                                    {t('save.connectionIssue')}
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
                                        <span className="text-sm text-green-400">
                                            {t('save.recordedSuccessfully')}
                                        </span>
                                    </div>
                                    <div className="text-green-400/60 text-xs">
                                        {saveStatus.attempt > 1
                                            ? t('save.savedAfterRetries', { attempts: saveStatus.attempt })
                                            : t('save.synchronized')
                                        }
                                    </div>
                                </div>
                            )}

                            {saveStatus.error && !saveStatus.isLoading && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <span className="text-red-400 text-sm">
                                            {t('shop.saveFailed', { attempts: saveStatus.maxAttempts })}
                                        </span>
                                    </div>
                                    <div className="text-red-400/60 text-xs mb-3">
                                        {t('shop.recordedLocally')}
                                    </div>
                                    <button
                                        onClick={() => handleSaveGameResult(gameResult)}
                                        className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                                    >
                                        {t('shop.retrySave')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            className="w-full px-6 py-4 bg-transparent border-2 border-red-400/60 text-red-300 rounded-xl text-lg hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saveStatus.isLoading || attemptsRemaining <= 0 || isRestartLoading}
                            onClick={restartGame}
                        >
                            {isRestartLoading
                                ? t('game.modes.survival.results.starting')
                                : attemptsRemaining > 0
                                    ? t('game.modes.survival.results.surviveAgain')
                                    : t('game.general.noAttemptsLeft')
                            }
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col text-white">
            <div className="flex-1 flex items-center justify-center">
                <GameGrid
                    circles={gameState.circles}
                    isGameActive={gameState.gameState === GameState.PLAYING}
                    showCircles={showCircles}
                    onCircleClick={handleCircleClickEvent}
                />
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-red-400/30 safe-area-inset-bottom">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <Zap className="text-orange-400" size={18} />
                            <span className="text-lg font-bold text-orange-400">
                                {t('common.level')} {gameState.currentLevel}
                            </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Clock className="text-white" size={18} />
                            <span className="text-lg font-bold text-white">
                                {formatSurvivalTime(gameState.stats.survivalTime)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-red-400/60">
                                {gameState.currentLevel}/15 {t('common.level')}S
                            </span>
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="text-red-400" size={12} />
                                <span className="text-red-300 uppercase tracking-wider">
                                    {t('game.modes.survival.instructions.oneMistakeDeath')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}