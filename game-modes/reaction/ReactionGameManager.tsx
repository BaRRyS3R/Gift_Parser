// src/game-modes/reaction/ReactionGameManager.tsx - Fixed session management with Best Score display and attempt consumption bug fix

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
import ConfettiExplosion from "react-confetti-explosion";

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
  sessionError: string | null;
  isSuccess: boolean;
  showRetryDetails: boolean;
  skipped: boolean;
}

interface PlayAgainError {
  show: boolean;
  message: string;
  redirecting: boolean;
  isSessionError: boolean;
}

interface SessionStatus {
  sessionId: string | null;
  expiresAt: Date | null;
  isValid: boolean;
  timeRemaining: number | null;
}

// Best Score information from API response (for reaction mode - by time)
interface BestScoreInfo {
  previousBestScore: number; // Previous best time in ms
  currentScore: number;      // Current time in ms
  newBestScore: number;      // New best time in ms
  isBestScore: boolean;      // Is new record (lower time = better)
  pointsNeeded?: number;     // How many ms needed to beat the record
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

// Best Score Display Component for reaction mode
interface BestScoreDisplayProps {
  bestScoreInfo: BestScoreInfo;
}

const BestScoreDisplay: React.FC<BestScoreDisplayProps> = ({ bestScoreInfo }) => {
  const t = useT();
  const { isBestScore, previousBestScore, pointsNeeded } = bestScoreInfo;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isBestScore) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isBestScore]);

  if (isBestScore) {
    return (
      <div className="text-center relative">
        {showConfetti && (
          <ConfettiExplosion
            force={0.6}
            duration={2500}
            particleCount={100}
            width={800}
            colors={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']}
          />
        )}
        <div className="text-green-400 text-lg font-bold animate-pulse">
          🏆 {t("game.modes.reaction.bestScore.newRecord")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-500/10 border border-gray-400/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {t("game.modes.reaction.bestScore.yourBest")}
        </span>
        <span className="text-sm text-white font-bold">
          {previousBestScore} ms
        </span>
      </div>
      {pointsNeeded && pointsNeeded > 0 && (
        <div className="text-center">
          <span className="text-xs text-gray-500">
            {t("game.modes.reaction.bestScore.timeNeeded", { time: pointsNeeded - 1 })}
          </span>
        </div>
      )}
    </div>
  );
};

export default function ReactionGameManager() {
  const { makeAuthenticatedRequest } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttemptWithSession } = useAttempts(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [bestScoreInfo, setBestScoreInfo] = useState<BestScoreInfo | null>(null);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(
    initialPlayAgainError,
  );
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>(initialSessionStatus);

  // CRITICAL FIX: Store session ID in a ref to avoid race conditions
  const currentSessionRef = useRef<string | null>(null);

  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  const gameStateRef = useRef<ReactionGameState>(gameState);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Local session timer (no visual display)
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

        if (
          timeRemaining <= 0 &&
          gameStateRef.current.gameState === GameState.PLAYING
        ) {
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

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      const handleBackButton = () => {
        router.push("/game");
      };

      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButton);

      return () => {
        tg.BackButton.offClick(handleBackButton);
        tg.BackButton.hide();
      };
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startGame();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // FIXED: Changed timer from 3 seconds to 5 seconds
  useEffect(() => {
    if (playAgainError.show && !playAgainError.redirecting) {
      const timer = setTimeout(() => {
        setPlayAgainError((prev) => ({ ...prev, redirecting: true }));
        setTimeout(() => {
          router.push("/game");
        }, 500);
      }, 5000); // Changed from 3000 to 5000

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

  // Enhanced save game result with proper session management and Best Score handling
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

      const sessionId = currentSessionRef.current;

      if (!sessionId) {
        console.error("No session ID available for game save");
        setSaveStatus((prev) => ({
          ...prev,
          sessionError: "No valid session found",
          isLoading: false,
        }));
        return;
      }

      console.log("Saving game with session ID:", sessionId);

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
          const response = await saveGameResult(result, sessionId);

          // Process Best Score information from API response
          if (response.bestScoreInfo) {
            setBestScoreInfo(response.bestScoreInfo);
            console.log("Best score info received:", response.bestScoreInfo);
          }

          setSaveStatus((prev) => ({
            ...prev,
            isLoading: false,
            isSuccess: true,
            error: null,
            sessionError: null,
          }));
        } catch (error) {
          if (error instanceof Error && error.message.includes("session")) {
            setSaveStatus((prev) => ({
              ...prev,
              isLoading: false,
              sessionError: error.message,
              error: null,
            }));
            return;
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
    [saveGameResult, t],
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

  // FIXED: Corrected startGame logic to prevent false "no attempts" errors
  const startGame = useCallback(async () => {
    try {
      const attemptsResult = await consumeAttemptWithSession(GameMode.REACTION);

      // FIXED: Only check if result exists, not canPlay status
      if (!attemptsResult) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });
        return;
      }

      if (attemptsResult.sessionId && attemptsResult.sessionExpiresAt) {
        console.log("Session created:", attemptsResult.sessionId);

        currentSessionRef.current = attemptsResult.sessionId;

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
      setBestScoreInfo(null);
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
      
      // FIXED: Improved error handling to distinguish attempts errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isAttemptsError = errorMessage.includes("attempts") || errorMessage.includes("No attempts");
      
      setPlayAgainError({
        show: true,
        message: isAttemptsError 
          ? t("game.modes.reaction.playAgain.noAttempts")
          : t("game.modes.reaction.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
    }
  }, [handleCircleActivated, handleGameTimeout, consumeAttemptWithSession, t]);

  // FIXED: Simplified handlePlayAgain - removed redundant fetchAttemptsStatus check
  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) return;

    setIsPlayingAgain(true);

    try {
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
  }, [isPlayingAgain, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupReactionGame(gameStateRef.current);

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }

      currentSessionRef.current = null;
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

            {bestScoreInfo && !gameResult.missed && (
              <BestScoreDisplay bestScoreInfo={bestScoreInfo} />
            )}

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
                    className={`text-sm font-bold ${playAgainError.isSessionError
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
              className={`w-full px-6 py-4 bg-transparent border-2 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${isPlayingAgain || playAgainError.show || saveStatus.isLoading
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
          </div>
        </div>
      </div>
    </div>
  );
}