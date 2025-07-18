// src/game-modes/tournament/TournamentGameManager.tsx - Обновленная версия без потребления попыток и с API

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Crosshair,
    AlertTriangle,
    Zap,
    Clock,
    Target,
    RotateCcw,
    Trophy,
    Plus,
    Star,
    TrendingUp,
    ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Импорт турнирной игровой логики
import {
    initializeTournamentGameState,
    updateTournamentLevel,
    activateTournamentCircles,
    handleTournamentCircleClick,
    deactivateTournamentCircle,
    createTournamentGameResult,
    cleanupTournamentGame,
    getTournamentLevelConfig,
    formatTournamentTime,
} from "./TournamentGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import {
    SurvivalGameState,
    SurvivalGameResult,
} from "@/types/game-modes/survival";
import type { Tournament, TournamentSaveResponse } from "@/types/tournaments";
import GameGrid from "@/components/GameGrid";
import { useT } from "@/contexts/LocalizationContext";

interface SaveStatus {
    isLoading: boolean;
    attempt: number;
    maxAttempts: number;
    error: string | null;
    isSuccess: boolean;
    showRetryDetails: boolean;
    saveResponse: TournamentSaveResponse | null;
}

const initialSaveStatus: SaveStatus = {
    isLoading: false,
    attempt: 0,
    maxAttempts: 3,
    error: null,
    isSuccess: false,
    showRetryDetails: false,
    saveResponse: null,
};

const LEVEL_UPDATE_INTERVAL = 50; // 20fps для плавного обновления времени

interface TournamentGameManagerProps {
    tournament: Tournament;
}

export default function TournamentGameManager({ tournament }: TournamentGameManagerProps) {
    const { makeAuthenticatedRequest } = useUser();
    const router = useRouter();
    const t = useT();

    const [gameState, setGameState] = useState<SurvivalGameState>(
        initializeTournamentGameState(),
    );
    const [showCircles, setShowCircles] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
    const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);

    const gameStateRef = useRef<SurvivalGameState>(gameState);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Настройка кнопки "Назад" в Telegram WebApp
    useEffect(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                router.push("/tournament");
            });

            return () => {
                tg.BackButton.hide();
                tg.BackButton.offClick(() => { });
            };
        }
    }, [router]);

    // Автоматический запуск игры при монтировании компонента
    useEffect(() => {
        const timer = setTimeout(() => {
            startGame();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const triggerHapticFeedback = useCallback((type: "success" | "error") => {
        if (
            typeof window !== "undefined" &&
            window.Telegram?.WebApp?.HapticFeedback
        ) {
            const haptic = window.Telegram.WebApp.HapticFeedback;
            haptic.notificationOccurred(type);
        }
    }, []);

    const handleSaveTournamentResult = useCallback(
        async (result: SurvivalGameResult) => {
            setSaveStatus((prev) => ({
                ...prev,
                isLoading: true,
                attempt: 1,
                error: null,
                isSuccess: false,
                showRetryDetails: false,
                saveResponse: null,
            }));

            let attemptCount = 1;

            const attemptSave = async (): Promise<void> => {
                setSaveStatus((prev) => ({ ...prev, attempt: attemptCount }));

                if (attemptCount > 1) {
                    setSaveStatus((prev) => ({ ...prev, showRetryDetails: true }));
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                try {
                    const response = await makeAuthenticatedRequest('/api/tournament/save', {
                        method: 'POST',
                        body: JSON.stringify({
                            tournamentId: tournament.id,
                            gameResult: result
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Server error: ${response.status}`);
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error || 'Failed to save tournament result');
                    }

                    const saveResponse: TournamentSaveResponse = responseData.data;

                    setSaveStatus((prev) => ({
                        ...prev,
                        isLoading: false,
                        isSuccess: true,
                        error: null,
                        saveResponse,
                    }));

                    console.log("Tournament result saved with accumulation:", saveResponse);
                } catch (error) {
                    attemptCount++;
                    if (attemptCount <= 3) {
                        setSaveStatus((prev) => ({ ...prev, attempt: attemptCount }));
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                        return attemptSave();
                    } else {
                        throw error;
                    }
                }
            };

            try {
                await attemptSave();
            } catch (error) {
                setSaveStatus((prev) => ({
                    ...prev,
                    isLoading: false,
                    isSuccess: false,
                    error:
                        error instanceof Error ? error.message : "Failed to save tournament result",
                    saveResponse: null,
                }));
            }
        },
        [tournament.id, makeAuthenticatedRequest],
    );

    const endGame = useCallback(
        (cause: "miss" | "wrong_click" | "decoy_hit") => {
            console.log("Tournament game ended:", cause);

            setGameState((prev) => {
                const finalState = updateTournamentLevel(prev, Date.now());

                let updatedStats = { ...finalState.stats };

                switch (cause) {
                    case "miss":
                        updatedStats.missedCircles = finalState.stats.missedCircles + 1;
                        break;
                    case "wrong_click":
                        updatedStats.wrongHits = finalState.stats.wrongHits + 1;
                        break;
                    case "decoy_hit":
                        updatedStats.decoyHits = finalState.stats.decoyHits + 1;
                        break;
                }

                const finalGameState = {
                    ...finalState,
                    gameState: GameState.FINISHED,
                    isActive: false,
                    stats: updatedStats,
                };

                const result = createTournamentGameResult(finalGameState);
                setGameResult(result);
                handleSaveTournamentResult(result);
                cleanupTournamentGame(finalGameState);

                return finalGameState;
            });
        },
        [handleSaveTournamentResult],
    );

    const scheduleNextActivation = useCallback(() => {
        const currentState = gameStateRef.current;

        if (!currentState.isActive || currentState.gameState !== GameState.PLAYING)
            return;

        const levelConfig = getTournamentLevelConfig(currentState.currentLevel);
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
                    const newState = activateTournamentCircles(
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
                                    deactivateTournamentCircle(current, circleId),
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

            console.log("Tournament circle clicked:", circleId);

            const clickTime = Date.now();
            const { newState, result } = handleTournamentCircleClick(
                gameStateRef.current,
                circleId,
                clickTime,
            );

            if (result === "correct") {
                triggerHapticFeedback("success");
                setGameState(newState);

                setTimeout(() => {
                    setGameState((current) =>
                        deactivateTournamentCircle(current, circleId),
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
        console.log("Starting Tournament Game...");

        setGameState(initializeTournamentGameState());
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

                    return updateTournamentLevel(current, Date.now());
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

    const returnToTournament = useCallback(() => {
        router.push("/tournament");
    }, [router]);

    useEffect(() => {
        return () => {
            cleanupTournamentGame(gameStateRef.current);
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
        const causeKeyMapping = {
            "miss": "game.modes.survival.deathCauses.miss",
            "wrong_click": "game.modes.survival.deathCauses.wrongClick",
            "decoy_hit": "game.modes.survival.deathCauses.decoyHit",
            "timeout": "game.modes.survival.deathCauses.default"
        };

        const key = causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
            causeKeyMapping.timeout;

        return t(key as any) || t("game.modes.survival.deathCauses.default");
    };

    if (gameState.gameState === GameState.FINISHED && gameResult) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-6 animate-fade-in">
                    <div className="text-center space-y-3">
                        <div className="text-5xl mb-3">🏆</div>
                        <h1 className="text-3xl font-bold text-white">
                            {t("tournament.tournamentEnd")}
                        </h1>
                        <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                {getDeathCauseIcon(gameResult.deathCause)}
                                <span className="text-sm text-white/80">
                                    {getDeathCauseMessage(gameResult.deathCause)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Информация о накоплении очков */}
                    {saveStatus.saveResponse && (
                        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4">
                            <div className="text-center space-y-2">
                                <div className="flex items-center justify-center space-x-2">
                                    <Plus className="text-yellow-400" size={16} />
                                    <span className="text-sm text-yellow-300 uppercase tracking-wider">
                                        {t("tournament.pointsEarned")}
                                    </span>
                                </div>
                                <div className="text-3xl font-bold text-yellow-400">
                                    +{saveStatus.saveResponse.game_score} pts
                                </div>
                                <div className="text-sm text-yellow-300/80">
                                    {t("tournament.addedToTotal")}
                                </div>
                                <div className="flex items-center justify-center space-x-2 text-sm text-yellow-300/60">
                                    <Star className="text-yellow-400" size={14} />
                                    <span>
                                        {t("tournament.totalPoints")}: {saveStatus.saveResponse.total_score} pts
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Основные результаты игры */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-4">
                        <div className="text-center space-y-2">
                            <div className="text-sm text-white/60 uppercase tracking-wider">
                                {t("tournament.survivalTime")}
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {formatTournamentTime(gameResult.survivalTime)}
                            </div>
                            <div className="text-lg text-white/80">
                                {t("common.level")} {gameResult.maxLevelReached}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-1">
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("tournament.tournamentScore")}
                                </div>
                                <div className="text-xl font-bold text-white">
                                    {gameResult.score}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("tournament.perfectStreak")}
                                </div>
                                <div className="text-xl font-bold text-blue-400">
                                    {gameResult.perfectStreak}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("tournament.correctHits")}
                                </div>
                                <div className="text-xl font-bold text-blue-400">
                                    {gameResult.correctHits}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-white/60 uppercase tracking-wider">
                                    {t("tournament.levelsCompleted")}
                                </div>
                                <div className="text-xl font-bold text-orange-400">
                                    {gameResult.maxLevelReached}/12
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/20 pt-4 text-center">
                            <div className="text-xs text-white/60 uppercase tracking-wider mb-1">
                                {tournament.name}
                            </div>
                            <div className="text-xs text-white/40">
                                {gameResult.maxLevelReached}/12 {t("tournament.levelsCompleted")}
                            </div>
                        </div>
                    </div>

                    {/* Статус сохранения */}
                    {(saveStatus.isLoading || saveStatus.error || saveStatus.isSuccess) && (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                            {saveStatus.isLoading && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-3">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-sm text-white/80">
                                            {saveStatus.showRetryDetails
                                                ? t("tournament.retryingSave", { attempt: saveStatus.attempt, max: saveStatus.maxAttempts })
                                                : t("tournament.savingResult")}
                                        </span>
                                    </div>
                                    {saveStatus.showRetryDetails && (
                                        <div className="text-center">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <RotateCcw className="text-white/60" size={14} />
                                                <span className="text-xs text-white/60">
                                                    {t("tournament.connectionIssue")}
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/20 rounded-full h-1">
                                                <div
                                                    className="bg-white h-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${(saveStatus.attempt / saveStatus.maxAttempts) * 100}%`,
                                                    }}
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
                                            ✓ {t("tournament.resultSaved")}
                                        </span>
                                    </div>
                                    <div className="text-green-400/60 text-xs">
                                        {saveStatus.attempt > 1
                                            ? t("tournament.resultSavedAfterRetries", { attempts: saveStatus.attempt })
                                            : t("tournament.dataSynchronized")}
                                    </div>
                                </div>
                            )}

                            {saveStatus.error && !saveStatus.isLoading && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <span className="text-red-400 text-sm">
                                            ✗ {t("tournament.saveFailedRetries", { attempts: saveStatus.maxAttempts })}
                                        </span>
                                    </div>
                                    <div className="text-red-400/60 text-xs mb-3">
                                        {t("tournament.resultRecordedLocally")}
                                    </div>
                                    <button
                                        className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                                        onClick={() => handleSaveTournamentResult(gameResult)}
                                    >
                                        {t("tournament.retrySave")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white rounded-xl text-lg hover:border-white hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
                            onClick={returnToTournament}
                        >
                            <ArrowLeft size={20} />
                            <span>BACK</span>
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

            <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-white/20 safe-area-inset-bottom">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <Trophy className="text-white" size={18} />
                            <span className="text-lg font-bold text-white">
                                {t("tournament.tournamentMode")}
                            </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Clock className="text-white" size={18} />
                            <span className="text-lg font-bold text-white">
                                {formatTournamentTime(gameState.stats.survivalTime)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">
                                {gameState.currentLevel}/12 {t("common.level")}
                            </span>
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="text-red-400" size={12} />
                                <span className="text-red-300 uppercase tracking-wider">
                                    {t("game.modes.survival.instructions.oneMistakeDeath")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}