// src/game-modes/reaction/ReactionGameManager.tsx - Refactored version without attempts logic

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, RotateCcw, Target, Clock, ArrowLeft } from "lucide-react";
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
  const { makeAuthenticatedRequest } = useUser();
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

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
          const response = await makeAuthenticatedRequest("/api/game/save", {
            method: "POST",
            body: JSON.stringify({ gameResult: result }),
          });

          if (!response.ok) {
            throw new Error("Failed to save game result");
          }

          const responseData = await response.json();

          if (!responseData.success) {
            throw new Error(responseData.error || "Failed to save game result");
          }

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
    [makeAuthenticatedRequest, t],
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

      // Trigger activation pulse effect
      const timestamp = Date.now();

      setActivatedCircles([circleId]);
      setLastActivationTimestamp(timestamp);

      // Clear activation state after pulse animation completes
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

  // Handle clicks on background (outside circles)
  const handleBackgroundClickEvent = useCallback(
    (event: React.MouseEvent) => {
      if (gameStateRef.current.gameState !== GameState.PLAYING) return;

      // Check if the click was on a circle element
      const target = event.target as HTMLElement;
      const isCircleClick = target.closest("[data-circle-id]");

      if (isCircleClick) {
        // This click will be handled by handleCircleClickEvent
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
    console.log("Starting Reaction Game...");

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

  const handleBackToGames = useCallback(() => {
    router.push("/game");
  }, [router]);

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

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                <Target className="text-white mx-auto mb-1" size={16} />
                <div className="text-xl font-bold text-white">
                  {gameResult.score}
                </div>
                <div className="text-xs text-white/60">{t("common.score")}</div>
              </div>
              <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
                <Zap className="text-green-400 mx-auto mb-1" size={16} />
                <div className={`text-xl font-bold ${ratingColor}`}>
                  {rating}
                </div>
              </div>
            </div>

            <div className="border-t border-white/30 pt-4">
              <div className="text-center">
                <div className="text-sm text-white/80 mb-2">
                  {getReactionRatingDescription(rating, t)}
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
                      {t("save.attemptNotRecorded")}
                    </span>
                  </div>
                  <div className="text-orange-400/60 text-xs">
                    {t("save.onlySuccessful")}
                  </div>
                </div>
              )}

              {saveStatus.error && !saveStatus.isLoading && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-red-400 text-sm">
                      {t("save.saveFailed", {
                        attempts: saveStatus.maxAttempts,
                      })}
                    </span>
                  </div>
                  <div className="text-red-400/60 text-xs mb-3">
                    {t("save.recordedLocally")}
                  </div>
                  <button
                    className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                    onClick={() => handleSaveGameResult(gameResult)}
                  >
                    {t("save.retrySave")}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white rounded-xl text-lg hover:border-white hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
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
                className={`text-lg font-bold transition-colors duration-300 ${
                  gameState.activeCircleId !== null
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
          </div>
        </div>
      </div>
    </div>
  );
}
