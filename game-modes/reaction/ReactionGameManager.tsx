// src/game-modes/reaction/ReactionGameManager.tsx - Версия без системы попыток для тестирования

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, RotateCcw, Target, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  initializeReactionGameState,
  activateRandomCircle,
  handleCircleClick,
  handleBackgroundClick,
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
import { useT } from "@/contexts/LocalizationContext";

interface SaveStatus {
  isLoading: boolean;
  attempt: number;
  maxAttempts: number;
  error: string | null;
  isSuccess: boolean;
  showRetryDetails: boolean;
  skipped: boolean;
}

const initialSaveStatus: SaveStatus = {
  isLoading: false,
  attempt: 0,
  maxAttempts: 3,
  error: null,
  isSuccess: false,
  showRetryDetails: false,
  skipped: false,
};

export default function ReactionGameManager() {
  const { saveGameResult, telegramUser } = useUser();
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const [isRestartLoading, setIsRestartLoading] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);

  const gameStateRef = useRef<ReactionGameState>(gameState);

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

  // Простая инициализация без потребления попыток
  useEffect(() => {
    if (!telegramUser?.id || isGameInitialized) return;

    console.log("Initializing reaction game without attempts check");
    setIsGameInitialized(true);

    setTimeout(() => {
      startGame();
    }, 500);
  }, [telegramUser?.id, isGameInitialized]);

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
    async (result: ReactionGameResult) => {
      if (result.missed || result.reactionTime <= 0) {
        setSaveStatus((prev) => ({
          ...prev,
          skipped: true,
          isLoading: false,
          isSuccess: false,
          error: null,
        }));
        return;
      }

      setSaveStatus((prev) => ({
        ...prev,
        isLoading: true,
        attempt: 1,
        error: null,
        isSuccess: false,
        showRetryDetails: false,
        skipped: false,
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

      const timestamp = Date.now();
      setActivatedCircles([circleId]);
      setLastActivationTimestamp(timestamp);

      setTimeout(() => {
        setActivatedCircles([]);
      }, 450);

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

  const handleBackgroundClickEvent = useCallback(
    (event: React.MouseEvent) => {
      if (gameStateRef.current.gameState !== GameState.PLAYING) return;

      const target = event.target as HTMLElement;
      const isCircleClick = target.closest("[data-circle-id]");

      if (isCircleClick) {
        return;
      }

      console.log("Background clicked - game over");

      const newState = handleBackgroundClick(gameStateRef.current);

      if (newState.gameState === GameState.FINISHED) {
        triggerHapticFeedback("error");

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
    console.log("Starting Reaction Game without attempts validation...");

    setGameState(initializeReactionGameState());
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);

    setTimeout(() => {
      setShowCircles(true);
    }, 100);

    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

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
    }, 500);
  }, [handleCircleActivated, handleGameTimeout]);

  // Простой рестарт без потребления попыток
  const restartGame = useCallback(() => {
    if (!telegramUser?.id || isRestartLoading) return;

    console.log("Restarting game without attempts check...");
    setIsRestartLoading(true);

    setShowCircles(false);

    setTimeout(() => {
      startGame();
      setIsRestartLoading(false);
    }, 200);
  }, [telegramUser?.id, startGame, isRestartLoading]);

  useEffect(() => {
    return () => {
      cleanupReactionGame(gameStateRef.current);
    };
  }, []);

  const getInstructionText = () => {
    if (gameState.gameState === GameState.PLAYING) {
      if (gameState.activeCircleId !== null) {
        return t("game.modes.reaction.instructions.clickNow");
      } else {
        return t("game.modes.reaction.instructions.waiting");
      }
    } else {
      return t("game.modes.reaction.instructions.ready");
    }
  };

  const getInstructionIcon = () => {
    if (gameState.gameState === GameState.PLAYING) {
      if (gameState.activeCircleId !== null) {
        return <Target className="text-white" size={16} />;
      } else {
        return <Clock className="text-white/60" size={16} />;
      }
    } else {
      return <Zap className="text-white/60" size={16} />;
    }
  };

  const getSubInstructionText = () => {
    if (gameState.gameState === GameState.PLAYING) {
      if (gameState.activeCircleId !== null) {
        return t("game.modes.reaction.instructions.lightningFast");
      } else {
        return t("game.modes.reaction.instructions.targetWillAppear");
      }
    } else {
      return t("game.modes.reaction.instructions.preparing");
    }
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const rating = gameResult.rating;
    const ratingColor = getReactionRatingColor(rating);

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚡</div>

            <h1 className="text-4xl font-bold text-white">
              {t("game.modes.reaction.results.title")}
            </h1>

            <div className="flex items-center justify-center space-x-2">
              <p className="text-lg text-white/80">
                {t("game.modes.reaction.results.subtitle")}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-white/60">
                {t("game.modes.reaction.results.reactionTime")}
              </div>
              {gameResult.missed ? (
                <div className="text-4xl font-bold text-red-400">
                  {t("game.modes.reaction.results.missed")}
                </div>
              ) : (
                <div className="text-4xl font-bold text-white">
                  {t("time.milliseconds", { time: gameResult.reactionTime })}
                </div>
              )}
              <div className={`text-lg ${ratingColor}`}>
                {t(`game.modes.reaction.ratings.${rating.toLowerCase()}`)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                <Target className="text-white mx-auto mb-1" size={16} />
                <div className="text-xl font-bold text-white">
                  {gameResult.score}
                </div>
                <div className="text-xs text-white/60">{t("common.score")}</div>
              </div>
            </div>

            <div className="border-t border-white/30 pt-4">
              <div className="text-center">
                <div className="text-sm text-white/80 mb-2">
                  {getReactionRatingDescription(rating, t)}
                </div>
                <div className="text-xs text-white/60 bg-blue-500/20 px-3 py-2 rounded-lg">
                  🧪 Тестовый режим - без ограничений попыток
                </div>
              </div>
            </div>
          </div>

          {/* Save Status Display */}
          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess ||
            saveStatus.skipped) && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                {saveStatus.isLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm text-white/80">
                        {saveStatus.showRetryDetails
                          ? t("save.retrying", {
                            attempt: saveStatus.attempt,
                            max: saveStatus.maxAttempts,
                          })
                          : t("save.recordingReaction")}
                      </span>
                    </div>

                    {saveStatus.showRetryDetails && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <RotateCcw className="text-white/60" size={14} />
                          <span className="text-xs text-white/60">
                            {t("save.connectionIssue")}
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
                        {t("save.savedSuccessfully")}
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

                {saveStatus.skipped && !saveStatus.isLoading && (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-orange-400 text-sm">
                        {t("shop.attemptNotRecorded")}
                      </span>
                    </div>
                    <div className="text-orange-400/60 text-xs">
                      {t("shop.onlySuccessful")}
                    </div>
                  </div>
                )}

                {saveStatus.error && !saveStatus.isLoading && (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-red-400 text-sm">
                        {t("shop.saveFailed", {
                          attempts: saveStatus.maxAttempts,
                        })}
                      </span>
                    </div>
                    <div className="text-red-400/60 text-xs mb-3">
                      {t("shop.recordedLocally")}
                    </div>
                    <button
                      className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                      onClick={() => handleSaveGameResult(gameResult)}
                    >
                      {t("shop.retrySave")}
                    </button>
                  </div>
                )}
              </div>
            )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white rounded-xl text-lg hover:border-white hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saveStatus.isLoading || isRestartLoading}
              onClick={restartGame}
            >
              {isRestartLoading
                ? t("game.modes.survival.results.starting")
                : t("game.modes.reaction.results.testAgain")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      <div
        className="flex-1 flex items-center justify-center"
        onClick={handleBackgroundClickEvent}
      >
        <GameGrid
          circles={gameState.circles}
          gameMode="reaction"
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-white/30 safe-area-inset-bottom">
        <div className="px-6 py-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {getInstructionIcon()}
              <span
                className={`text-lg font-bold transition-colors duration-300 ${gameState.activeCircleId !== null
                    ? "text-white animate-pulse"
                    : "text-white/80"
                  }`}
              >
                {getInstructionText()}
              </span>
            </div>

            <div className="text-xs text-white/60 uppercase tracking-wider">
              {getSubInstructionText()}
            </div>

            <div className="text-xs text-blue-400 bg-blue-500/20 px-3 py-1 rounded-lg inline-block">
              🧪 Тестовый режим без системы попыток
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}