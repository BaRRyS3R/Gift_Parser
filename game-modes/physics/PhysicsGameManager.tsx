// src/game-modes/physics/PhysicsGameManager.tsx - Refactored version without attempts logic

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Crosshair,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Activity,
  ArrowLeft,
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
import PhysicsGameCanvas from "./PhysicsGameCanvas";

import { useUser } from "@/hooks/useUser";
import { useGame } from "@/hooks/modules/useGame";
import { GameState } from "@/types/game-modes/common";
import {
  PhysicsGameState,
  PhysicsGameResult,
} from "@/types/game-modes/physics";
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
  const { makeAuthenticatedRequest } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<PhysicsGameState>(
    initializePhysicsGameState(),
  );
  const [showCanvas, setShowCanvas] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<PhysicsGameResult | null>(null);

  const gameStateRef = useRef<PhysicsGameState>(gameState);
  const engineUpdateRef = useRef<number>();

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
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  // Auto-start game on component mount
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

  const handleSaveGameResult = useCallback(
    async (result: PhysicsGameResult) => {
      setSaveStatus((prev) => ({
        ...prev,
        isLoading: true,
        attempt: 1,
        error: null,
        isSuccess: false,
        showRetryDetails: false,
      }));

      let attemptCount = 1;

      const attemptSave = async (): Promise<void> => {
        setSaveStatus((prev) => ({ ...prev, attempt: attemptCount }));

        if (attemptCount > 1) {
          setSaveStatus((prev) => ({ ...prev, showRetryDetails: true }));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          await saveGameResult(result);
          setSaveStatus((prev) => ({
            ...prev,
            isLoading: false,
            isSuccess: true,
            error: null,
          }));
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
            error instanceof Error ? error.message : t("errors.saveGameResult"),
        }));
      }
    },
    [saveGameResult, t],
  );

  // Physics engine update loop with level progression
  const updatePhysicsEngine = useCallback(() => {
    const currentState = gameStateRef.current;

    if (
      !currentState.isActive ||
      currentState.gameState !== GameState.PLAYING
    ) {
      if (engineUpdateRef.current) {
        cancelAnimationFrame(engineUpdateRef.current);
        engineUpdateRef.current = undefined;
      }

      return;
    }

    // Update Matter.js engine
    Matter.Engine.update(currentState.engine, 16.67);

    // Update game state with physics and level progression
    setGameState((prev) => {
      const updatedState = updatePhysicsPositions(prev);
      const levelUpdatedState = updatePhysicsLevel(updatedState);

      // Check win/loss conditions - mistakes first priority
      const tooManyMistakes =
        levelUpdatedState.stats.currentMistakes >=
        levelUpdatedState.config.maxMistakes;
      const escapedCircles = checkCirclesEscaped(levelUpdatedState);
      const timeUp =
        levelUpdatedState.stats.gameTime >=
        levelUpdatedState.config.levelDuration * 1000;

      if (tooManyMistakes || escapedCircles || timeUp) {
        const deathCause = tooManyMistakes
          ? "mistakes"
          : escapedCircles
            ? "escaped_circles"
            : "timeout";

        endGame(deathCause);

        return {
          ...levelUpdatedState,
          gameState: GameState.FINISHED,
          isActive: false,
        };
      }

      return levelUpdatedState;
    });

    engineUpdateRef.current = requestAnimationFrame(updatePhysicsEngine);
  }, []);

  const endGame = useCallback(
    (cause: "mistakes" | "escaped_circles" | "timeout") => {
      console.log("Physics game ended:", cause);

      setGameState((prev) => {
        const finalState = updatePhysicsPositions(prev);

        const result = createPhysicsGameResult(finalState, cause);

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupPhysicsGame(finalState);

        return {
          ...finalState,
          gameState: GameState.FINISHED,
          isActive: false,
        };
      });
    },
    [handleSaveGameResult],
  );

  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    if (!currentState.isActive || currentState.gameState !== GameState.PLAYING)
      return;

    const gameTime = Date.now() - (currentState.gameStartTime || Date.now());
    const levelConfig = getPhysicsLevelConfig(gameTime);

    const delay =
      levelConfig.activationTimeMin +
      Math.random() *
        (levelConfig.activationTimeMax - levelConfig.activationTimeMin);

    const timeout = setTimeout(() => {
      if (
        gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING
      ) {
        setGameState((prev) => {
          const updatedState = updatePhysicsLevel(prev);
          const newState = activateRandomCircles(
            updatedState,
            (circleIds, decoyIds) => {
              console.log(
                `Activated circles: ${circleIds.join(", ")}, Decoys: ${decoyIds.join(", ")}`,
              );
            },
            (circleId, wasDecoy) => {
              console.log(`Circle ${circleId} timed out (decoy: ${wasDecoy})`);

              if (!wasDecoy) {
                // Missed white circle - count as mistake
                setGameState((current) => {
                  const updatedStats = {
                    ...current.stats,
                    missedCircles: current.stats.missedCircles + 1,
                    currentMistakes: current.stats.currentMistakes + 1,
                  };

                  const newState = {
                    ...current,
                    stats: updatedStats,
                  };

                  return deactivatePhysicsCircle(newState, circleId);
                });
              } else {
                // Decoy timed out - just deactivate without penalty
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

        // Apply impulse effect immediately after correct click
        const stateWithImpulse = applyImpulse(gameStateRef.current, circleId);

        // Combine updated stats with impulse effects and immediately deactivate
        const finalState = deactivatePhysicsCircle(
          {
            ...newState,
            circles: stateWithImpulse.circles,
          },
          circleId,
        );

        setGameState(finalState);
      } else if (result === "decoy" || result === "wrong") {
        triggerHapticFeedback("error");

        // Update state with mistake count and immediately deactivate
        const finalState = deactivatePhysicsCircle(newState, circleId);

        setGameState(finalState);
      }
    },
    [triggerHapticFeedback],
  );

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

      // Start physics engine update loop immediately
      setTimeout(() => {
        updatePhysicsEngine();
      }, 100);

      // Schedule first circle activation
      setTimeout(() => {
        scheduleNextActivation();
      }, 1000);
    }, 800);
  }, [scheduleNextActivation, updatePhysicsEngine]);

  const handleBackToGames = useCallback(() => {
    router.push("/game");
  }, [router]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupPhysicsGame(gameStateRef.current);
      if (engineUpdateRef.current) {
        cancelAnimationFrame(engineUpdateRef.current);
      }
    };
  }, []);

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

  const getDeathCauseMessage = (deathCause: string) => {
    const messages = {
      mistakes: "Слишком много ошибок - лимит превышен",
      escaped_circles: "Круги сбежали из игровой области",
      timeout: "Время вышло",
      default: "Физический эксперимент завершён",
    };

    return messages[deathCause as keyof typeof messages] || messages.default;
  };

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

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚗️</div>

            <h1 className="text-4xl font-bold text-purple-400">
              {t("game.modes.physics.results.title")}
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

          <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-purple-400/60">
                {t("game.modes.physics.results.gameTime")}
              </div>
              <div className="text-4xl font-bold text-purple-400">
                {formatPhysicsTime(gameResult.gameTime)}
              </div>
              <div className="text-lg text-purple-300">
                {t("game.modes.physics.results.finalScore")}:{" "}
                {Math.round(gameResult.finalScore)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  {t("game.modes.physics.results.totalHits")}
                </div>
                <div className="text-xl font-bold text-green-400">
                  {gameResult.totalHits}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  {t("game.modes.physics.results.mistakesMade")}
                </div>
                <div className="text-xl font-bold text-red-400">
                  {gameResult.mistakesMade}/5
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  {t("common.score")}
                </div>
                <div className="text-xl font-bold text-purple-400">
                  {Math.round(gameResult.finalScore)}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  Время выживания
                </div>
                <div className="text-xl font-bold text-purple-400">
                  {formatPhysicsTime(gameResult.survivalTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Save Status Display */}
          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess) && (
            <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-400/30 rounded-xl p-4">
              {saveStatus.isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-sm text-purple-300/80">
                      {saveStatus.showRetryDetails
                        ? t("save.retrying", {
                            attempt: saveStatus.attempt,
                            max: saveStatus.maxAttempts,
                          })
                        : t("save.recordingPhysics")}
                    </span>
                  </div>

                  {saveStatus.showRetryDetails && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <RotateCcw className="text-purple-400/60" size={14} />
                        <span className="text-xs text-purple-400/60">
                          {t("save.connectionIssue")}
                        </span>
                      </div>
                      <div className="w-full bg-purple-400/20 rounded-full h-1">
                        <div
                          className="bg-purple-400 h-1 rounded-full transition-all duration-300"
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
                      {t("save.physicsRecordedSuccessfully")}
                    </span>
                  </div>
                  <div className="text-green-400/60 text-xs">
                    {saveStatus.attempt > 1
                      ? t("save.savedAfterRetries", {
                          attempts: saveStatus.attempt,
                        })
                      : t("save.synchronized")}
                  </div>
                </div>
              )}

              {saveStatus.error && !saveStatus.isLoading && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-red-400 text-sm">
                      Не удалось сохранить после {saveStatus.maxAttempts}{" "}
                      попыток
                    </span>
                  </div>
                  <div className="text-red-400/60 text-xs mb-3">
                    Результат записан локально
                  </div>
                  <button
                    className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                    onClick={() => handleSaveGameResult(gameResult)}
                  >
                    Повторить сохранение
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-purple-400/60 text-purple-300 rounded-xl text-lg hover:border-purple-400 hover:bg-purple-500/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
              onClick={handleBackToGames}
            >
              <ArrowLeft size={20} />
              <span>BACK НАЗАД</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const levelInfo = getCurrentLevelInfo();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Game area - fills screen minus info panel */}
      <div
        className="flex-1 flex items-start justify-center"
        style={{ height: `calc(100vh - 140px)` }}
      >
        <PhysicsGameCanvas
          gameState={gameState}
          isGameActive={gameState.gameState === GameState.PLAYING}
          showCanvas={showCanvas}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      {/* Fixed info panel - exactly 140px height */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10 bg-black/95 backdrop-blur-sm border-t border-purple-400/30 safe-area-inset-bottom"
        style={{ height: "140px" }}
      >
        <div className="px-6 py-4 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="text-purple-400" size={18} />
              <span className="text-lg font-bold text-purple-400">
                {formatPhysicsTime(gameState.stats.gameTime)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Target className="text-white" size={18} />
              <span className="text-lg font-bold text-white">
                {Math.round(gameState.stats.totalScore)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <TrendingUp className="text-purple-400" size={12} />
                <span className="text-purple-400/80">
                  Lv.{levelInfo.level} {levelInfo.description}
                </span>
              </div>
              <span className="text-purple-400/60">
                Активно: {levelInfo.activeCircles}/{levelInfo.maxCircles}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Activity className="text-red-400" size={12} />
                <span className="text-red-300">
                  Ошибки: {gameState.stats.currentMistakes}/
                  {gameState.config.maxMistakes}
                </span>
              </div>
              <span className="text-red-300 uppercase tracking-wider text-xs">
                5 ОШИБОК = КОНЕЦ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
