// src/game-modes/reaction/ReactionGameManager.tsx - Enhanced with session management

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Zap,
  RotateCcw,
  Target,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
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
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useGame } from "@/hooks/modules/useGame";
import { GameState, GameMode } from "@/types/game-modes/common";
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
  sessionError: string | null; // NEW: Session-specific errors
  isSuccess: boolean;
  showRetryDetails: boolean;
  skipped: boolean;
}

interface PlayAgainError {
  show: boolean;
  message: string;
  redirecting: boolean;
  isSessionError: boolean; // NEW: Flag for session-related errors
}

interface SessionStatus {
  sessionId: string | null;
  expiresAt: Date | null;
  isValid: boolean;
  timeRemaining: number | null; // milliseconds until expiry
}

const initialSaveStatus: SaveStatus = {
  isLoading: false,
  attempt: 0,
  maxAttempts: 3,
  error: null,
  sessionError: null,
  isSuccess: false,
  showRetryDetails: false,
  skipped: false,
};

const initialPlayAgainError: PlayAgainError = {
  show: false,
  message: "",
  redirecting: false,
  isSessionError: false,
};

const initialSessionStatus: SessionStatus = {
  sessionId: null,
  expiresAt: null,
  isValid: false,
  timeRemaining: null,
};

export default function ReactionGameManager() {
  const { makeAuthenticatedRequest } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttemptWithSession, fetchAttemptsStatus } = useAttempts(
    makeAuthenticatedRequest,
  );
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(
    initialPlayAgainError,
  );
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  // NEW: Session management state
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>(initialSessionStatus);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  const gameStateRef = useRef<ReactionGameState>(gameState);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // NEW: Local session timer (no visual display)
  useEffect(() => {
    if (
      sessionStatus.sessionId &&
      sessionStatus.isValid &&
      sessionStatus.expiresAt
    ) {
      sessionTimerRef.current = setInterval(() => {
        const now = Date.now();
        const timeRemaining = sessionStatus.expiresAt!.getTime() - now;

        setSessionStatus((prev) => ({
          ...prev,
          timeRemaining,
          isValid: timeRemaining > 0,
        }));

        // End game when session expires
        if (
          timeRemaining <= 0 &&
          gameStateRef.current.gameState === GameState.PLAYING
        ) {
          // For reaction mode, we treat session expiry as a miss
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

            (result as any).deathCause = "session_expired";

            setGameResult(result);
            handleSaveGameResult(result);
            cleanupReactionGame(finalState);

            return finalState;
          });
        }
      }, 1000);

      return () => {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
        }
      };
    }
  }, [sessionStatus.sessionId, sessionStatus.isValid, sessionStatus.expiresAt]);

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

  // Handle play again error auto-redirect
  useEffect(() => {
    if (playAgainError.show && !playAgainError.redirecting) {
      const timer = setTimeout(() => {
        setPlayAgainError((prev) => ({ ...prev, redirecting: true }));
        setTimeout(() => {
          router.push("/game");
        }, 500);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [playAgainError.show, playAgainError.redirecting, router]);

  const triggerHapticFeedback = useCallback((type: "success" | "error") => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.HapticFeedback
    ) {
      const haptic = window.Telegram.WebApp.HapticFeedback;

      haptic.notificationOccurred(type);
    }
  }, []);

  // Enhanced save game result with session validation
  const handleSaveGameResult = useCallback(
    async (result: ReactionGameResult) => {
      if (result.missed || result.reactionTime <= 0) {
        setSaveStatus((prev) => ({
          ...prev,
          skipped: true,
          isLoading: false,
          isSuccess: false,
          error: null,
          sessionError: null,
        }));

        return;
      }

      if (!sessionStatus.sessionId) {
        setSaveStatus((prev) => ({
          ...prev,
          sessionError: "No valid session found",
          isLoading: false,
        }));

        return;
      }

      setSaveStatus((prev) => ({
        ...prev,
        isLoading: true,
        attempt: 1,
        error: null,
        sessionError: null,
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
          await saveGameResult(result, sessionStatus.sessionId!);

          setSaveStatus((prev) => ({
            ...prev,
            isLoading: false,
            isSuccess: true,
            error: null,
            sessionError: null,
          }));
        } catch (error) {
          // Handle session errors specially (don't retry)
          if (error instanceof Error && error.message.includes("session")) {
            setSaveStatus((prev) => ({
              ...prev,
              isLoading: false,
              sessionError: error.message,
              error: null,
            }));

            return; // Don't retry session errors
          }

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
        const errorMessage =
          error instanceof Error ? error.message : t("errors.saveGameResult");

        setSaveStatus((prev) => ({
          ...prev,
          isLoading: false,
          isSuccess: false,
          error: errorMessage.includes("session") ? null : errorMessage,
          sessionError: errorMessage.includes("session") ? errorMessage : null,
        }));
      }
    },
    [saveGameResult, t, sessionStatus.sessionId],
  );

  const handleGameTimeout = useCallback(() => {
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

  const startGame = useCallback(async () => {
    try {
      // NEW: Consume attempt with session creation
      const attemptsResult = await consumeAttemptWithSession(GameMode.REACTION);

      if (!attemptsResult || !attemptsResult.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });

        return;
      }

      // Set up session status
      if (attemptsResult.sessionId && attemptsResult.sessionExpiresAt) {
        setSessionStatus({
          sessionId: attemptsResult.sessionId,
          expiresAt: attemptsResult.sessionExpiresAt,
          isValid: true,
          timeRemaining: attemptsResult.sessionExpiresAt.getTime() - Date.now(),
        });
      } else {
        console.error("No session data received from consume attempt");
        setPlayAgainError({
          show: true,
          message: "Failed to create game session",
          redirecting: false,
          isSessionError: true,
        });

        return;
      }

      setGameState(initializeReactionGameState());
      setGameResult(null);
      setSaveStatus(initialSaveStatus);
      setPlayAgainError(initialPlayAgainError);
      setActivatedCircles([]);
      setLastActivationTimestamp(0);
      setIsPlayingAgain(false);

      setTimeout(() => {
        setShowCircles(true);
      }, 100);

      setTimeout(() => {
        setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

        const delay = getRandomDelay(gameStateRef.current.config);

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
    } catch (error) {
      console.error("Failed to start game:", error);
      setPlayAgainError({
        show: true,
        message: t("game.modes.reaction.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
    }
  }, [handleCircleActivated, handleGameTimeout, consumeAttemptWithSession, t]);

  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) return;

    setIsPlayingAgain(true);

    try {
      // Get current attempts status directly from server
      const currentAttemptsStatus = await fetchAttemptsStatus(true);

      // Use the fresh data from the fetch result, not the hook state
      if (!currentAttemptsStatus || !currentAttemptsStatus.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      // All checks passed - start new game
      await startGame();
    } catch (error) {
      console.error("Error starting new game:", error);
      setPlayAgainError({
        show: true,
        message: t("game.modes.reaction.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, fetchAttemptsStatus, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupReactionGame(gameStateRef.current);

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
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
              <div className="text-2xl font-bold text-green-400 mt-2">
                {gameResult.score} {t("common.points")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/20 rounded-lg border border-white/30">
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

          {/* Enhanced save status with session error handling */}
          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.sessionError ||
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

              {/* Session error display */}
              {saveStatus.sessionError && !saveStatus.isLoading && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ShieldAlert className="text-orange-400" size={16} />
                    <span className="text-sm text-orange-400">
                      Session Security Error
                    </span>
                  </div>
                  <div className="text-orange-400/60 text-xs mb-3">
                    {saveStatus.sessionError}
                  </div>
                  <div className="text-white/60 text-xs">
                    Game may not be saved due to session validation failure
                  </div>
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
                    onClick={() =>
                      gameResult && handleSaveGameResult(gameResult)
                    }
                  >
                    {t("save.retrySave")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Play Again Error Display */}
          {playAgainError.show && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {playAgainError.isSessionError ? (
                    <ShieldAlert className="text-orange-400" size={16} />
                  ) : (
                    <AlertTriangle className="text-red-400" size={16} />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      playAgainError.isSessionError
                        ? "text-orange-400"
                        : "text-red-400"
                    }`}
                  >
                    {t("game.modes.reaction.playAgain.cannotPlay")}
                  </span>
                </div>
                <div className="text-red-300/80 text-xs mb-3">
                  {playAgainError.message}
                </div>
                {playAgainError.redirecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-xs">
                      {t("game.modes.reaction.playAgain.redirecting")}
                    </span>
                  </div>
                ) : (
                  <div className="text-white/60 text-xs">
                    {t("game.modes.reaction.playAgain.autoRedirect")}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              className={`w-full px-6 py-4 bg-transparent border-2 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                isPlayingAgain || playAgainError.show || saveStatus.isLoading
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-red-400/60 text-red-300 hover:border-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95"
              }`}
              disabled={
                isPlayingAgain || playAgainError.show || saveStatus.isLoading
              }
              onClick={handlePlayAgain}
            >
              {isPlayingAgain ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("game.modes.reaction.playAgain.starting")}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  <span>{t("game.modes.reaction.playAgain.button")}</span>
                </>
              )}
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
