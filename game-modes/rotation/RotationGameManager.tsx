// src/game-modes/rotation/RotationGameManager.tsx - Simplified without JS position updates

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  Target,
  RotateCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  initializeRotationGameState,
  updateRotationLevel,
  activateRotationCircles,
  handleRotationCircleClick,
  deactivateRotationCircle,
  createRotationGameResult,
  cleanupRotationGame,
  getLevelConfig,
  formatRotationTime,
} from "./RotationGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import {
  RotationGameState,
  RotationGameResult,
} from "@/types/game-modes/rotation";
import RotatingCircleGrid from "@/components/RotatingCircleGrid";
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

const LEVEL_UPDATE_INTERVAL = 100; // Update level/time every 100ms

export default function RotationGameManager() {
  const { saveGameResult, telegramUser, consumeAttemptForGame } = useUser();
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<RotationGameState>(
    initializeRotationGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<RotationGameResult | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
  const [isConsumingAttempt, setIsConsumingAttempt] = useState(false);
  const [hasConsumedInitialAttempt, setHasConsumedInitialAttempt] =
    useState(false);
  const [isRestartLoading, setIsRestartLoading] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  const gameStateRef = useRef<RotationGameState>(gameState);

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

  // Consume attempt immediately when component mounts
  useEffect(() => {
    const consumeInitialAttempt = async () => {
      if (!telegramUser?.id || hasConsumedInitialAttempt) return;

      try {
        setIsConsumingAttempt(true);
        console.log("Consuming initial attempt for rotation game");

        const newStatus = await consumeAttemptForGame();

        setAttemptsRemaining(newStatus.attemptsRemaining);
        setHasConsumedInitialAttempt(true);

        // Auto-start the game after consuming attempt
        setTimeout(() => {
          startGame();
        }, 500);
      } catch (error) {
        console.error("Error consuming initial attempt:", error);
        setHasConsumedInitialAttempt(true);
        router.push("/game");
      } finally {
        setIsConsumingAttempt(false);
      }
    };

    consumeInitialAttempt();
  }, [
    telegramUser?.id,
    hasConsumedInitialAttempt,
    consumeAttemptForGame,
    router,
  ]);

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
    async (result: RotationGameResult) => {
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

  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      console.log("Rotation game ended:", cause);

      setGameState((prev) => {
        const finalState = updateRotationLevel(prev, Date.now());

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

        const result = createRotationGameResult(finalGameState);

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupRotationGame(finalGameState);

        return finalGameState;
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
          const newState = activateRotationCircles(
            prev,
            (circleIds, redCircleIds) => {
              console.log(
                `Activated circles: ${circleIds.join(", ")}, Red: ${redCircleIds.join(", ")}`,
              );

              const timestamp = Date.now();

              setActivatedCircles(circleIds);
              setLastActivationTimestamp(timestamp);

              setTimeout(() => {
                setActivatedCircles([]);
              }, 450);
            },
            (circleId, wasDecoy) => {
              console.log(`Circle ${circleId} timed out (decoy: ${wasDecoy})`);

              if (!wasDecoy) {
                endGame("miss");
              } else {
                setGameState((current) =>
                  deactivateRotationCircle(current, circleId),
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

      console.log("Rotation circle clicked:", circleId);

      const clickTime = Date.now();
      const { newState, result } = handleRotationCircleClick(
        gameStateRef.current,
        circleId,
        clickTime,
      );

      if (result === "correct") {
        triggerHapticFeedback("success");
        setGameState(newState);

        setTimeout(() => {
          setGameState((current) =>
            deactivateRotationCircle(current, circleId),
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
    console.log("Starting Rotation Game...");

    const initialState = initializeRotationGameState();

    setGameState(initialState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);

    setTimeout(() => {
      setShowCircles(true);
    }, 100);

    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

      // Start level update interval (for time tracking and level progression)
      const levelInterval = setInterval(() => {
        setGameState((current) => {
          if (!current.isActive || current.gameState !== GameState.PLAYING) {
            clearInterval(levelInterval);

            return current;
          }

          return updateRotationLevel(current, Date.now());
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

    setIsRestartLoading(true);

    try {
      console.log("Consuming attempt on server for restart");

      const newStatus = await consumeAttemptForGame();

      setAttemptsRemaining(newStatus.attemptsRemaining);

      setShowCircles(false);
      setTimeout(() => {
        startGame();
      }, 200);
    } catch (error) {
      console.error("Error consuming attempt for restart:", error);
      router.push("/game");
    } finally {
      setIsRestartLoading(false);
    }
  }, [
    telegramUser?.id,
    attemptsRemaining,
    startGame,
    isRestartLoading,
    consumeAttemptForGame,
    router,
  ]);

  useEffect(() => {
    return () => {
      cleanupRotationGame(gameStateRef.current);
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
        return <RotateCw className="text-red-400" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      miss: "game.modes.rotation.deathCauses.miss",
      wrong_click: "game.modes.rotation.deathCauses.wrongClick",
      decoy_hit: "game.modes.rotation.deathCauses.decoyHit",
      timeout: "game.modes.rotation.deathCauses.default",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.rotation.deathCauses.default");
  };

  if (isConsumingAttempt) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-orange-400/20 border-t-orange-400 rounded-full animate-spin mx-auto" />
          <p className="text-orange-300">
            {t("game.general.initializingGame")}
          </p>
        </div>
      </div>
    );
  }

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🌀</div>

            <h1 className="text-4xl font-bold text-orange-400">
              {t("game.modes.rotation.results.title")}
            </h1>

            <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2">
                {getDeathCauseIcon(gameResult.deathCause)}
                <span className="text-sm text-orange-300">
                  {getDeathCauseMessage(gameResult.deathCause)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-orange-400/60">
                {t("game.modes.rotation.results.survivalTime")}
              </div>
              <div className="text-4xl font-bold text-orange-400">
                {formatRotationTime(gameResult.survivalTime)}
              </div>
              <div className="text-lg text-orange-300">
                {t("common.level")} {gameResult.maxLevelReached}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.finalScore")}
                </div>
                <div className="text-xl font-bold text-orange-300">
                  {gameResult.score}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.attemptsLeft")}
                </div>
                <div className="text-xl font-bold text-green-400">
                  {attemptsRemaining}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.perfectStreak")}
                </div>
                <div className="text-xl font-bold text-green-400">
                  {gameResult.perfectStreak}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.correctHits")}
                </div>
                <div className="text-xl font-bold text-green-400">
                  {gameResult.correctHits}
                </div>
              </div>
            </div>
          </div>

          {/* Save Status Display */}
          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess) && (
            <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-400/30 rounded-xl p-4">
              {saveStatus.isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                    <span className="text-sm text-orange-300/80">
                      {saveStatus.showRetryDetails
                        ? t("save.retrying", {
                            attempt: saveStatus.attempt,
                            max: saveStatus.maxAttempts,
                          })
                        : t("save.recordingRotation")}
                    </span>
                  </div>

                  {saveStatus.showRetryDetails && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <RotateCcw className="text-orange-400/60" size={14} />
                        <span className="text-xs text-orange-400/60">
                          {t("save.connectionIssue")}
                        </span>
                      </div>
                      <div className="w-full bg-orange-400/20 rounded-full h-1">
                        <div
                          className="bg-orange-400 h-1 rounded-full transition-all duration-300"
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
                      {t("save.rotationRecordedSuccessfully")}
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
                    <span className="text-orange-400 text-sm">
                      Save failed after {saveStatus.maxAttempts} attempts
                    </span>
                  </div>
                  <button
                    className="px-3 py-1 bg-orange-400/20 border border-orange-400/30 text-orange-300 rounded text-xs hover:bg-orange-400/30 transition-colors"
                    onClick={() => handleSaveGameResult(gameResult)}
                  >
                    Retry Save
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-orange-400/60 text-orange-300 rounded-xl text-lg hover:border-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                saveStatus.isLoading ||
                attemptsRemaining <= 0 ||
                isRestartLoading
              }
              onClick={restartGame}
            >
              {isRestartLoading
                ? t("game.modes.rotation.results.starting")
                : attemptsRemaining > 0
                  ? t("game.modes.rotation.results.spinAgain")
                  : t("game.general.noAttemptsLeft")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      <div className="flex-1 flex items-center justify-center">
        <RotatingCircleGrid
          circles={gameState.circles}
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          radius={gameState.config.radius}
          rotationSpeed={gameState.currentRotationSpeed}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-orange-400/30 safe-area-inset-bottom">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <RotateCw className="text-orange-400" size={18} />
              <span className="text-lg font-bold text-orange-400">
                {t("common.level")} {gameState.currentLevel}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="text-white" size={18} />
              <span className="text-lg font-bold text-white">
                {formatRotationTime(gameState.stats.survivalTime)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-400/60">
                {gameState.currentLevel}/10 {t("common.level")}
              </span>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-orange-400" size={12} />
                <span className="text-orange-300 uppercase tracking-wider">
                  {t("game.modes.rotation.instructions.oneMistakeDeath")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
