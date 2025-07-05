// src/game-modes/physics/PhysicsGameManager.tsx - Модифицированный для правил с 3 ошибками

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Crosshair,
    AlertTriangle,
    Zap,
    Clock,
    Target,
    RotateCcw,
    Shield,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as Matter from "matter-js";

import {
    initializePhysicsGameState,
    updatePhysicsPositions,
    updatePhysicsLevel,
    activateRandomCircles,
    handlePhysicsCircleClick,
    deactivatePhysicsCircle,
    createPhysicsGameResult,
    cleanupPhysicsGame,
    checkCirclesEscaped,
    formatPhysicsTime,
    applyImpulse,
    getPhysicsLevelConfig,
} from "./PhysicsGameLogic";

import { useUser } from "@/hooks/useUser";
import { userService } from "@/lib/supabase";
import { GameState } from "@/types/game-modes/common";
import {
    PhysicsGameState,
    PhysicsGameResult,
} from "@/types/game-modes/physics";
import PhysicsGameCanvas from "./PhysicsGameCanvas";
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

export default function PhysicsGameManager() {
    const { saveGameResult, telegramUser } = useUser();
    const router = useRouter();
    const t = useT();
    const [gameState, setGameState] = useState<PhysicsGameState>(
        initializePhysicsGameState(),
    );
    const [showCanvas, setShowCanvas] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
    const [gameResult, setGameResult] = useState<PhysicsGameResult | null>(null);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
    const [isConsumingAttempt, setIsConsumingAttempt] = useState(false);
    const [isRestartLoading, setIsRestartLoading] = useState(false);

    const gameStateRef = useRef<PhysicsGameState>(gameState);
    const engineUpdateRef = useRef<number>();

    // Заглушка для haptic feedback
    const triggerHapticFeedback = useCallback((type: "success" | "error") => {
        // Реализация haptic feedback если требуется
        console.log(`Haptic feedback: ${type}`);
    }, []);

    // Обновление ссылки на состояние игры
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Инициализация попыток при загрузке
    useEffect(() => {
        const initializeAttempts = async () => {
            if (!telegramUser?.id) return;

            try {
                setIsConsumingAttempt(true);
                const status = await userService.consumeAttemptWithServerValidation(
                    telegramUser.id,
                );
                setAttemptsRemaining(status.attemptsRemaining);
            } catch (error) {
                console.error("Error initializing attempts:", error);
                router.push("/main");
            } finally {
                setIsConsumingAttempt(false);
            }
        };

        initializeAttempts();
    }, [telegramUser?.id, router]);

    // Обработка сохранения результата игры
    const handleSaveGameResult = useCallback(
        async (result: PhysicsGameResult) => {
            if (!telegramUser?.id) return;

            setSaveStatus((prev) => ({
                ...prev,
                isLoading: true,
                attempt: 1,
                error: null,
            }));

            try {
                await saveGameResult(result);
                setSaveStatus((prev) => ({
                    ...prev,
                    isLoading: false,
                    isSuccess: true,
                }));
            } catch (error) {
                console.error("Failed to save physics game result:", error);
                setSaveStatus((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : t("errors.saveGameResult"),
                }));
            }
        },
        [saveGameResult, telegramUser?.id, t],
    );

    // Завершение игры
    const endGame = useCallback(
        (cause: "mistakes" | "escaped_circles" | "timeout") => {
            console.log("Physics game ended:", cause);

            setGameState((prev) => {
                const finalState = updatePhysicsLevel(prev, Date.now());

                const finalGameState = {
                    ...finalState,
                    gameState: GameState.FINISHED,
                    isActive: false,
                };

                const result = createPhysicsGameResult(finalGameState, cause);
                setGameResult(result);
                handleSaveGameResult(result);
                cleanupPhysicsGame(finalGameState);

                return finalGameState;
            });
        },
        [handleSaveGameResult],
    );

    // Планирование следующей активации кругов
    const scheduleNextActivation = useCallback(() => {
        const currentState = gameStateRef.current;

        if (!currentState.isActive || currentState.gameState !== GameState.PLAYING) {
            return;
        }

        const levelConfig = getPhysicsLevelConfig(currentState.stats.gameTime);
        const delay = levelConfig.activationFrequency;

        const timeout = setTimeout(() => {
            if (
                gameStateRef.current.isActive &&
                gameStateRef.current.gameState === GameState.PLAYING
            ) {
                setGameState((prev) => {
                    const newState = activateRandomCircles(
                        prev,
                        (circleIds, decoyIds) => {
                            console.log(
                                `Activated physics circles: ${circleIds.join(", ")}, Decoys: ${decoyIds.join(", ")}`,
                            );
                        },
                        (circleId, isDecoy) => {
                            console.log(`Physics circle ${circleId} timed out (decoy: ${isDecoy})`);

                            if (!isDecoy) {
                                setGameState((current) => {
                                    const updatedState = {
                                        ...current,
                                        stats: {
                                            ...current.stats,
                                            missedCircles: current.stats.missedCircles + 1,
                                        },
                                    };
                                    return deactivatePhysicsCircle(updatedState, circleId);
                                });
                            } else {
                                setGameState((current) =>
                                    deactivatePhysicsCircle(current, circleId),
                                );
                            }

                            scheduleNextActivation();
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
    }, []);

    // МОДИФИЦИРОВАННАЯ обработка кликов по кругам
    const handleCircleClickEvent = useCallback(
        (circleId: number) => {
            if (gameStateRef.current.gameState !== GameState.PLAYING) return;

            console.log("Physics circle clicked:", circleId);

            const clickTime = Date.now();
            const { newState, result } = handlePhysicsCircleClick(
                gameStateRef.current,
                circleId,
                clickTime,
            );

            if (result === "correct") {
                triggerHapticFeedback("success");

                // Применяем импульсный эффект сразу после правильного клика
                const stateWithImpulse = applyImpulse(gameStateRef.current, circleId);

                // Объединяем обновленную статистику с эффектами импульса
                setGameState({
                    ...newState,
                    circles: stateWithImpulse.circles,
                });

                setTimeout(() => {
                    setGameState((current) =>
                        deactivatePhysicsCircle(current, circleId),
                    );
                }, 300);
            } else if (result === "decoy" || result === "wrong") {
                triggerHapticFeedback("error");

                // ИЗМЕНЕНО: Проверяем условие поражения при достижении 3 ошибок
                if (newState.stats.currentMistakes >= 3) {
                    const gameResult = createPhysicsGameResult(newState, "mistakes");
                    setGameResult(gameResult);
                    handleSaveGameResult(gameResult);
                    cleanupPhysicsGame(newState);
                    return;
                }

                // Если ошибок меньше 3, продолжаем игру без удаления стен
                setGameState(newState);

                setTimeout(() => {
                    setGameState((current) =>
                        deactivatePhysicsCircle(current, circleId),
                    );
                }, 300);
            }
        },
        [triggerHapticFeedback, handleSaveGameResult],
    );

    // Запуск игры
    const startGame = useCallback(() => {
        console.log("Starting Physics Game...");

        setGameState(initializePhysicsGameState());
        setGameResult(null);
        setSaveStatus(initialSaveStatus);

        setTimeout(() => {
            setShowCanvas(true);
        }, 100);

        setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));
            scheduleNextActivation();
        }, 500);
    }, [scheduleNextActivation]);

    // Основной игровой цикл обновления физики
    useEffect(() => {
        if (gameState.gameState === GameState.PLAYING && gameState.isActive) {
            const updateLoop = () => {
                setGameState((prev) => {
                    if (!prev.isActive || prev.gameState !== GameState.PLAYING) {
                        return prev;
                    }

                    // Обновление физического движка
                    Matter.Engine.update(prev.engine, 16);

                    // Обновление позиций кругов
                    const positionUpdatedState = updatePhysicsPositions(prev);

                    // Обновление времени игры
                    const timeUpdatedState = updatePhysicsLevel(positionUpdatedState);

                    // Проверка условий завершения игры
                    if (checkCirclesEscaped(timeUpdatedState)) {
                        endGame("escaped_circles");
                        return timeUpdatedState;
                    }

                    if (timeUpdatedState.stats.gameTime >= timeUpdatedState.config.levelDuration) {
                        endGame("timeout");
                        return timeUpdatedState;
                    }

                    return timeUpdatedState;
                });

                if (gameStateRef.current.gameState === GameState.PLAYING) {
                    engineUpdateRef.current = requestAnimationFrame(updateLoop);
                }
            };

            updateLoop();
        }

        return () => {
            if (engineUpdateRef.current) {
                cancelAnimationFrame(engineUpdateRef.current);
            }
        };
    }, [gameState.gameState, gameState.isActive, endGame]);

    // Перезапуск игры
    const restartGame = useCallback(async () => {
        if (!telegramUser?.id || attemptsRemaining <= 0 || isRestartLoading) return;

        try {
            setIsRestartLoading(true);

            const newStatus = await userService.consumeAttemptWithServerValidation(
                telegramUser.id,
            );

            setAttemptsRemaining(newStatus.attemptsRemaining);

            setShowCanvas(false);

            setTimeout(() => {
                startGame();
            }, 200);
        } catch (error) {
            console.error("Error consuming attempt for restart:", error);
        } finally {
            setIsRestartLoading(false);
        }
    }, [telegramUser?.id, attemptsRemaining, startGame, isRestartLoading]);

    // Очистка при размонтировании компонента
    useEffect(() => {
        return () => {
            cleanupPhysicsGame(gameStateRef.current);
            if (engineUpdateRef.current) {
                cancelAnimationFrame(engineUpdateRef.current);
            }
        };
    }, []);

    // Получение иконки причины смерти
    const getDeathCauseIcon = (deathCause: string) => {
        switch (deathCause) {
            case "mistakes":
                return <AlertTriangle className="text-red-400" size={20} />;
            case "escaped_circles":
                return <TrendingDown className="text-orange-400" size={20} />;
            case "timeout":
                return <Clock className="text-yellow-400" size={20} />;
            default:
                return <Crosshair className="text-red-400" size={20} />;
        }
    };

    // Получение сообщения о причине смерти
    const getDeathCauseMessage = (deathCause: string) => {
        const messages = {
            "mistakes": "Достигнут лимит ошибок (3)",
            "escaped_circles": "Круги сбежали из контейнера",
            "timeout": "Время вышло",
            "default": "Физический эксперимент завершён"
        };
        return messages[deathCause as keyof typeof messages] || messages.default;
    };

    // Получение информации о текущем уровне
    const getCurrentLevelInfo = () => {
        const gameTime = gameState.stats.gameTime;
        const levelConfig = getPhysicsLevelConfig(gameTime);

        return {
            level: levelConfig.level,
            description: levelConfig.description,
            maxCircles: levelConfig.maxSimultaneousCircles,
            activeCircles: gameState.activeCircleIds.length,
        };
    };

    if (isConsumingAttempt) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin mx-auto" />
                    <p className="text-purple-300">{t("game.general.initializingGame")}</p>
                </div>
            </div>
        );
    }

    if (gameState.gameState === GameState.FINISHED && gameResult) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">⚗️</div>

                        <h1 className="text-4xl font-bold text-purple-400">
                            ФИЗИЧЕСКИЙ РЕЖИМ
                        </h1>

                        <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-2">
                                {getDeathCauseIcon(gameResult.deathCause)}
                                <span className="text-sm text-purple-300">
                                    {getDeathCauseMessage(gameResult.deathCause)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Статистика игры */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                    {formatPhysicsTime(gameResult.gameTime)}
                                </div>
                                <div className="text-xs text-white/60">
                                    {t("game.modes.physics.results.gameTime")}
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                    {gameResult.finalScore}
                                </div>
                                <div className="text-xs text-white/60">
                                    {t("game.modes.physics.results.finalScore")}
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                    {gameResult.totalHits}
                                </div>
                                <div className="text-xs text-white/60">
                                    {t("game.modes.physics.results.totalHits")}
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                    {gameResult.mistakesMade}/3
                                </div>
                                <div className="text-xs text-white/60">
                                    {t("game.modes.physics.results.mistakesMade")}
                                </div>
                            </div>
                        </div>

                        {/* Статус сохранения */}
                        {saveStatus.isLoading && (
                            <div className="text-center text-purple-300 text-sm">
                                {t("save.recordingPhysics")}
                            </div>
                        )}

                        {saveStatus.isSuccess && (
                            <div className="text-center text-green-400 text-sm">
                                {t("save.physicsRecordedSuccessfully")}
                            </div>
                        )}

                        {saveStatus.error && (
                            <div className="text-center text-red-400 text-sm">
                                Ошибка сохранения: {saveStatus.error}
                            </div>
                        )}
                    </div>

                    {/* Кнопки действий */}
                    <div className="space-y-3">
                        {attemptsRemaining > 0 ? (
                            <button
                                onClick={restartGame}
                                disabled={isRestartLoading}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                            >
                                {isRestartLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <RotateCcw size={20} />
                                )}
                                <span>
                                    {isRestartLoading ? "ЗАГРУЗКА..." : t("game.modes.physics.results.playAgain")}
                                </span>
                            </button>
                        ) : (
                            <div className="text-center text-white/60 text-sm">
                                {t("game.general.noAttemptsLeft")}
                            </div>
                        )}

                        <button
                            onClick={() => router.push("/main")}
                            className="w-full bg-black/40 hover:bg-black/60 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                        >
                            {t("game.modes.physics.results.backToMenu")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-purple-400/30">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl">⚗️</div>
                    <div>
                        <h1 className="text-lg font-bold text-white">ФИЗИКА</h1>
                        <div className="text-xs text-white/60">
                            Попыток: {attemptsRemaining}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-lg font-bold text-white">
                        {formatPhysicsTime(gameState.stats.gameTime)}
                    </div>
                    <div className="text-xs text-white/60">
                        Ошибки: {gameState.stats.currentMistakes}/3
                    </div>
                </div>
            </div>

            {/* Информация об уровне */}
            <div className="p-4 bg-purple-500/10 border-b border-purple-400/20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-purple-300">
                            Уровень {getCurrentLevelInfo().level}
                        </div>
                        <div className="text-xs text-white/60">
                            {getCurrentLevelInfo().description}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-white">
                            Счёт: {gameState.stats.totalScore}
                        </div>
                        <div className="text-xs text-white/60">
                            Активно: {getCurrentLevelInfo().activeCircles}/{getCurrentLevelInfo().maxCircles}
                        </div>
                    </div>
                </div>
            </div>

            {/* Игровая область */}
            <div className="flex-1 flex items-center justify-center p-4">
                {showCanvas && gameState.gameState === GameState.PLAYING ? (
                    <PhysicsGameCanvas
                        gameState={gameState}
                        onCircleClick={handleCircleClickEvent}
                        width={gameState.config.containerWidth}
                        height={gameState.config.containerHeight}
                    />
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-8 h-8 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin mx-auto" />
                        <p className="text-purple-300">ПОДГОТОВКА ЭКСПЕРИМЕНТА...</p>
                    </div>
                )}
            </div>
        </div>
    );
}