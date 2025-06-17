// src/game-modes/reaction/ReactionGameManager.tsx - Fixed with smooth restart without visual bugs

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, RotateCcw, Target, Clock } from "lucide-react";

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
import { useI18n } from "@/lib/i18n";
import { userService } from "@/lib/supabase";
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

export default function ReactionGameManager({
  onBackToMenu,
}: ReactionGameManagerProps) {
  const { saveGameResult, telegramUser } = useUser();
  const { t, formatDate, formatNumber } = useI18n();
  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [showCircles, setShowCircles] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
  const [isConsumingAttempt, setIsConsumingAttempt] = useState(false);
  const [hasConsumedInitialAttempt, setHasConsumedInitialAttempt] =
    useState(false);
  const [isRestartLoading, setIsRestartLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);

  const gameStateRef = useRef<ReactionGameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Consume attempt immediately when component mounts (initial entry only)
  useEffect(() => {
    const consumeInitialAttempt = async () => {
      if (!telegramUser?.id || hasConsumedInitialAttempt) return;

      try {
        setIsConsumingAttempt(true);
        const newStatus = await userService.consumeAttemptWithServerValidation(
          telegramUser.id,
        );

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

  const handleSaveGameResult = useCallback(
    async (result: ReactionGameResult) => {
      if (!telegramUser?.id) return;

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
            error instanceof Error
              ? error.message
              : "Failed to save result after 3 attempts",
        }));
      }
    },
    [saveGameResult, telegramUser?.id],
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
      triggerHapticFeedback("success");
    },
    [triggerHapticFeedback],
  );

  const handleCircleClickEvent = useCallback(
    (circleId: number) => {
      if (gameState.gameState !== GameState.PLAYING) return;

      const newState = handleCircleClick(gameState, circleId);

      setGameState(newState);

      if (newState.gameState === GameState.FINISHED) {
        const result = createReactionGameResult(newState);

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupReactionGame(newState);
      }
    },
    [gameState],
  );

  const startGame = useCallback(() => {
    const initialState = initializeReactionGameState();

    setGameState(initialState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setShowCircles(true);

    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));
      const delay = getRandomDelay(initialState.config);
      const timeout = setTimeout(() => {
        if (gameStateRef.current.gameState === GameState.PLAYING) {
          setGameState((current) =>
            activateRandomCircle(
              current,
              (circleId) => console.log(`Circle ${circleId} activated`),
              () => console.log("Game timed out"),
            ),
          );
        }
      }, delay);

      setGameState((prev) => ({ ...prev, startDelayTimeout: timeout }));
    }, 100);
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, gameState: GameState.PAUSED }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));
  }, []);

  const restartGame = useCallback(async () => {
    if (!telegramUser?.id || attemptsRemaining <= 0 || isRestartLoading) return;

    try {
      setIsRestartLoading(true);
      const newStatus = await userService.consumeAttemptWithServerValidation(
        telegramUser.id,
      );

      setAttemptsRemaining(newStatus.attemptsRemaining);
      cleanupReactionGame(gameState);
      startGame();
    } catch (error) {
      console.error("Error consuming attempt for restart:", error);
    } finally {
      setIsRestartLoading(false);
    }
  }, [
    telegramUser?.id,
    attemptsRemaining,
    gameState,
    startGame,
    isRestartLoading,
  ]);

  useEffect(() => {
    return () => {
      cleanupReactionGame(gameStateRef.current);
    };
  }, []);

  const getInstructionText = () => {
    switch (gameState.gameState) {
      case GameState.NOT_STARTED:
        return t("game.modes.reaction.instructions");
      case GameState.PLAYING:
        return t("game.modes.reaction.instructions");
      case GameState.FINISHED:
        return gameState.stats.missedTarget
          ? t("game.modes.reaction.gameOver")
          : t("game.modes.reaction.newRecord");
      default:
        return t("game.modes.reaction.instructions");
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

  const getButtonText = () => {
    switch (gameState.gameState) {
      case GameState.NOT_STARTED:
        return t("game.modes.reaction.start");
      case GameState.PLAYING:
        return t("game.common.pause");
      case GameState.PAUSED:
        return t("game.modes.reaction.resume");
      case GameState.FINISHED:
        return t("game.modes.reaction.restart");
      default:
        return t("game.modes.reaction.start");
    }
  };

  const getStatusText = () => {
    if (
      gameState.gameState === GameState.FINISHED &&
      !gameState.stats.missedTarget
    ) {
      return `${t("game.modes.reaction.score")}: ${gameState.stats.reactionTime}ms`;
    }

    return "";
  };

  const handleGameAction = useCallback(() => {
    switch (gameState.gameState) {
      case GameState.NOT_STARTED:
        startGame();
        break;
      case GameState.PLAYING:
        pauseGame();
        break;
      case GameState.PAUSED:
        resumeGame();
        break;
      case GameState.FINISHED:
        restartGame();
        break;
    }
  }, [gameState.gameState]);

  if (isConsumingAttempt) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white font-bpdots">INITIALIZING GAME...</p>
        </div>
      </div>
    );
  }

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const rating = gameResult.rating;
    const ratingColor = getReactionRatingColor(rating);
    const ratingDescription = getReactionRatingDescription(rating);

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚡</div>

            <h1 className="text-4xl font-bold font-bpdots text-white">
              REACTION TEST
            </h1>

            <div className="flex items-center justify-center space-x-2">
              <Zap className="text-white" size={20} />
              <p className="text-lg font-bpdots text-white/80">
                Speed Test Complete
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm font-bpdots text-white/60">
                REACTION TIME
              </div>
              {gameResult.missed ? (
                <div className="text-4xl font-bold font-bpdots text-red-400">
                  MISSED
                </div>
              ) : (
                <div className="text-4xl font-bold font-bpdots text-white">
                  {gameResult.reactionTime}ms
                </div>
              )}
              <div className={`text-lg font-bpdots ${ratingColor}`}>
                {rating}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-white/60">SCORE</div>
                <div className="text-xl font-bold font-bpdots text-white">
                  {gameResult.score}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-white/60">
                  ATTEMPTS LEFT
                </div>
                <div className="text-xl font-bold font-bpdots text-green-400">
                  {attemptsRemaining}
                </div>
              </div>
            </div>

            <div className="border-t border-white/30 pt-4">
              <div className="text-center">
                <div className="text-sm font-bpdots text-white/80 mb-2">
                  {ratingDescription}
                </div>
                {!gameResult.missed && (
                  <div className="text-xs font-bpdots text-white/60">
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

          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess ||
            saveStatus.skipped) && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-4">
              {saveStatus.isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="font-bpdots text-sm text-white/80">
                      {saveStatus.showRetryDetails
                        ? `Retrying save (${saveStatus.attempt}/${saveStatus.maxAttempts})...`
                        : "Recording reaction time..."}
                    </span>
                  </div>

                  {saveStatus.showRetryDetails && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <RotateCcw className="text-white/60" size={14} />
                        <span className="text-xs font-bpdots text-white/60">
                          Connection issue - retrying automatically
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
                    <span className="font-bpdots text-sm text-green-400">
                      ✓ Result saved successfully
                    </span>
                  </div>
                  <div className="text-green-400/60 font-bpdots text-xs">
                    {saveStatus.attempt > 1
                      ? `Saved after ${saveStatus.attempt} attempts`
                      : "Data synchronized with leaderboard"}
                  </div>
                </div>
              )}

              {saveStatus.skipped && !saveStatus.isLoading && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-orange-400 font-bpdots text-sm">
                      ⚠ Attempt not recorded
                    </span>
                  </div>
                  <div className="text-orange-400/60 font-bpdots text-xs">
                    Only successful reaction times are saved to leaderboard
                  </div>
                </div>
              )}

              {saveStatus.error && !saveStatus.isLoading && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-red-400 font-bpdots text-sm">
                      ✗ Save failed after {saveStatus.maxAttempts} attempts
                    </span>
                  </div>
                  <div className="text-red-400/60 font-bpdots text-xs mb-3">
                    Your time was recorded locally but not synchronized
                  </div>
                  <button
                    className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded font-bpdots text-xs hover:bg-red-400/30 transition-colors"
                    onClick={() => handleSaveGameResult(gameResult)}
                  >
                    RETRY SAVE
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/60 text-white rounded-xl font-bpdots text-lg hover:border-white hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                saveStatus.isLoading ||
                attemptsRemaining <= 0 ||
                isRestartLoading
              }
              onClick={restartGame}
            >
              {isRestartLoading
                ? "STARTING..."
                : attemptsRemaining > 0
                  ? "TEST AGAIN"
                  : "NO ATTEMPTS LEFT"}
            </button>

            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saveStatus.isLoading || isRestartLoading}
              onClick={onBackToMenu}
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {t("reaction.title", "game")}
            </h1>
            <button
              className="text-gray-600 hover:text-gray-800"
              onClick={onBackToMenu}
            >
              {t("common.back", "common")}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">{t("reaction.description", "game")}</p>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {t("reaction.score", "game", {
                  score: gameState.stats.clicked ? 1 : 0,
                })}
              </span>
              <span className="text-gray-700">
                {t("reaction.time", "game", {
                  time: gameState.stats.reactionTime || 0,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-700">
                {t("reaction.attempts", "game", {
                  attempts: attemptsRemaining,
                })}
              </span>
              {gameState.stats.reactionTime !== null &&
                gameState.stats.reactionTime > 0 && (
                  <span className="text-gray-700">
                    {t("reaction.bestTime", "game", {
                      time: gameState.stats.reactionTime,
                    })}
                  </span>
                )}
            </div>
          </div>

          <GameGrid
            circles={gameState.circles}
            isGameActive={gameState.gameState === GameState.PLAYING}
            showCircles={showCircles}
            onCircleClick={(circleId) => handleCircleClick(gameState, circleId)}
          />

          <div className="mt-4 flex justify-center">
            {gameState.gameState === GameState.NOT_STARTED && (
              <button
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                disabled={isConsumingAttempt || attemptsRemaining <= 0}
                onClick={startGame}
              >
                {isConsumingAttempt
                  ? t("common.loading", "common")
                  : t("reaction.start", "game")}
              </button>
            )}

            {gameState.gameState === GameState.PLAYING && (
              <button
                className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600"
                onClick={pauseGame}
              >
                {t("reaction.pause", "game")}
              </button>
            )}

            {gameState.gameState === GameState.PAUSED && (
              <button
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                onClick={resumeGame}
              >
                {t("reaction.resume", "game")}
              </button>
            )}

            {gameState.gameState === GameState.FINISHED && (
              <button
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                disabled={attemptsRemaining <= 0 || isRestartLoading}
                onClick={restartGame}
              >
                {isRestartLoading
                  ? t("common.loading", "common")
                  : t("reaction.restart", "game")}
              </button>
            )}
          </div>

          {gameResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {t("common.gameOver", "game")}
              </h2>
              <div className="space-y-2">
                <p className="text-gray-700">
                  {t("reaction.score", "game", { score: gameResult.score })}
                </p>
                <p className="text-gray-700">
                  {t("reaction.time", "game", {
                    time: gameResult.reactionTime,
                  })}
                </p>
                <p className="text-gray-700">
                  {t(
                    "reaction.rating." + gameResult.rating.toLowerCase(),
                    "game",
                  )}
                </p>
              </div>
            </div>
          )}

          {saveStatus.isLoading && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800">{t("common.loading", "common")}</p>
            </div>
          )}

          {saveStatus.error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-800">
                {t("errors.serverError", "common")}
              </p>
              {saveStatus.showRetryDetails && (
                <p className="text-red-600 text-sm mt-1">
                  {t("common.retry", "common")} {saveStatus.attempt}/
                  {saveStatus.maxAttempts}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
