// src/game-modes/reaction/ReactionGameManager.tsx - Refactored with new UI design

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
import { Divider } from "@nextui-org/react";
import { motion } from "framer-motion";
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

interface BestTimeInfo {
  previousBestTime: number;
  currentTime: number;
  newBestTime: number;
  isBestTime: boolean;
  timeNeeded?: number;
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

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <div 
    className="border-2 border-white/20 border-t-white rounded-full animate-spin"
    style={{ width: size, height: size }}
  />
);

export default function ReactionGameManager() {
  const { makeAuthenticatedRequest } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttemptWithSession, updateAttemptsFromGameSave, preValidateCanPlay } = useAttempts(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [bestTimeInfo, setBestTimeInfo] = useState<BestTimeInfo | null>(null);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(
    initialPlayAgainError,
  );
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);
  const [canPlayAfterSave, setCanPlayAfterSave] = useState<boolean | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initialSessionStatus);

  // Store session ID in a ref to avoid race conditions
  const currentSessionRef = useRef<string | null>(null);

  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);

  const gameStateRef = useRef<ReactionGameState>(gameState);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Local session timer
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

  // Handle auto-redirect when cannot play again
  useEffect(() => {
    if (playAgainError.show && !playAgainError.redirecting) {
      const timer = setTimeout(() => {
        setPlayAgainError((prev) => ({ ...prev, redirecting: true }));
        setTimeout(() => {
          router.push("/game");
        }, 500);
      }, 5000);

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

  // Enhanced save game result with proper attempts status handling
  const handleSaveGameResult = useCallback(
    async (result: ReactionGameResult) => {
      if (result.missed || result.reactionTime <= 0) {
        console.log("[SAVE_GAME] Skipping save for missed attempt");
        setSaveStatus((prev) => ({
          ...prev,
          skipped: true,
          isLoading: false,
          isSuccess: false,
          error: null,
          sessionError: null,
        }));
        
        setCanPlayAfterSave(true);
        return;
      }

      const sessionId = currentSessionRef.current;

      if (!sessionId) {
        console.error("[SAVE_GAME] No session ID available for game save");
        setSaveStatus((prev) => ({
          ...prev,
          sessionError: "No valid session found",
          isLoading: false,
        }));
        return;
      }

      console.log("[SAVE_GAME] Starting save process with session ID:", sessionId);

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

          // Process Best Time information from API response
          if (response.bestScoreInfo) {
            const bestTimeInfo: BestTimeInfo = {
              previousBestTime: response.bestScoreInfo.previousBestScore,
              currentTime: result.reactionTime,
              newBestTime: response.bestScoreInfo.newBestScore,
              isBestTime: response.bestScoreInfo.isBestScore,
              timeNeeded: response.bestScoreInfo.pointsNeeded,
            };
            setBestTimeInfo(bestTimeInfo);
            console.log("[SAVE_GAME] Best time info received:", bestTimeInfo);
          }

          // Process attempts status from API response
          if (response.attemptsStatus) {
            console.log("[SAVE_GAME] Attempts status received:", response.attemptsStatus);
            
            updateAttemptsFromGameSave(response.attemptsStatus);
            setCanPlayAfterSave(response.attemptsStatus.canPlay);
            
            if (!response.attemptsStatus.canPlay) {
              console.log("[SAVE_GAME] User cannot play again - setting up redirect");
              setPlayAgainError({
                show: true,
                message: t("game.modes.reaction.playAgain.noAttempts"),
                redirecting: false,
                isSessionError: false,
              });
            }
          } else {
            console.warn("[SAVE_GAME] No attempts status received from game save response");
            setCanPlayAfterSave(null);
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

        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.error"),
          redirecting: false,
          isSessionError: false,
        });
      }
    },
    [saveGameResult, t, updateAttemptsFromGameSave],
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
    console.log("[START_GAME] Starting game initialization");

    try {
      const attemptsResult = await consumeAttemptWithSession(GameMode.REACTION);

      if (!attemptsResult) {
        console.log("[START_GAME] Failed to consume attempt - no result");
        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });
        return;
      }

      console.log("[START_GAME] Attempt consumed successfully:", attemptsResult);

      if (attemptsResult.sessionId && attemptsResult.sessionExpiresAt) {
        console.log("[START_GAME] Session created:", attemptsResult.sessionId);

        currentSessionRef.current = attemptsResult.sessionId;

        setSessionStatus({
          sessionId: attemptsResult.sessionId,
          expiresAt: attemptsResult.sessionExpiresAt,
          isValid: true,
          timeRemaining: attemptsResult.sessionExpiresAt.getTime() - Date.now(),
        });
      } else {
        console.error("[START_GAME] No session data received from consume attempt");
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
      setBestTimeInfo(null);
      setSaveStatus(initialSaveStatus);
      setPlayAgainError(initialPlayAgainError);
      setActivatedCircles([]);
      setLastActivationTimestamp(0);
      setIsPlayingAgain(false);
      setCanPlayAfterSave(null);

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
      console.error("[START_GAME] Failed to start game:", error);
      
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

  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) {
      console.log("[PLAY_AGAIN] Already in progress, ignoring");
      return;
    }

    console.log("[PLAY_AGAIN] Starting play again process");
    setIsPlayingAgain(true);

    try {
      console.log("[PLAY_AGAIN] Doing fresh pre-validation...");
      
      const preValidation = await preValidateCanPlay();
      console.log("[PLAY_AGAIN] Pre-validation result:", preValidation);

      if (!preValidation.canPlay) {
        console.log("[PLAY_AGAIN] Pre-validation failed - cannot play");
        setPlayAgainError({
          show: true,
          message: t("game.modes.reaction.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      console.log("[PLAY_AGAIN] Pre-validation passed, starting game...");
      await startGame();
      
    } catch (error) {
      console.error("[PLAY_AGAIN] Error during play again:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isAttemptsError = errorMessage.includes("attempts") || 
                            errorMessage.includes("No attempts") ||
                            errorMessage.includes("Locked");
      
      setPlayAgainError({
        show: true,
        message: isAttemptsError 
          ? t("game.modes.reaction.playAgain.noAttempts")
          : t("game.modes.reaction.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, startGame, t, preValidateCanPlay]);

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

  // Get button state and styling
  const getButtonState = () => {
    if (isPlayingAgain) {
      return {
        text: "Starting",
        className: "bg-blue-900/30 text-blue-300 cursor-not-allowed border-blue-600/50 shadow-blue-600/20",
        disabled: true,
        showIcon: false,
        showSpinner: true
      };
    }
    
    if (saveStatus.isLoading) {
      return {
        text: "Saving",
        className: "bg-gray-800/50 text-gray-300 cursor-not-allowed border-gray-600/50 shadow-gray-600/20",
        disabled: true,
        showIcon: false,
        showSpinner: true
      };
    }
    
    if (playAgainError.show || canPlayAfterSave === false) {
      return {
        text: "No attempts",
        className: "bg-red-900/30 text-red-300 cursor-not-allowed border-red-600/50 shadow-red-600/20",
        disabled: true,
        showIcon: false,
        showSpinner: false
      };
    }
    
    if (saveStatus.isSuccess && (canPlayAfterSave === true || canPlayAfterSave === null)) {
      return {
        text: "Again",
        className: "bg-green-900/30 text-green-300 hover:bg-green-800/40 hover:shadow-green-400/20 border-green-600/50 shadow-green-600/20 hover:border-green-400/70 transition-all",
        disabled: false,
        showIcon: true,
        showSpinner: false
      };
    }
    
    return {
      text: "Saving",
      className: "bg-gray-800/50 text-gray-300 cursor-not-allowed border-gray-600/50 shadow-gray-600/20",
      disabled: true,
      showIcon: false,
      showSpinner: true
    };
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const buttonState = getButtonState();

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white relative overflow-hidden">
        <motion.div 
          className="w-full max-w-md space-y-8 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Confetti for new records */}
          {bestTimeInfo?.isBestTime && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <ConfettiExplosion
                force={0.6}
                duration={2500}
                particleCount={100}
                width={800}
                colors={['#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0']}
              />
            </div>
          )}

          {/* Icon */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-6xl mb-4">⚡</div>
          </motion.div>

          {/* Result Status */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-white">
                {gameResult.missed ? "Missed target!" : "Target hit!"}
              </span>
            </div>
          </motion.div>

          <Divider className="bg-white/30" />

          {/* Game Statistics */}
          <motion.div 
            className="space-y-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Final Score */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <span className="text-lg">Final score:</span>
              <span className="text-2xl font-bold">{gameResult.score}</span>
            </motion.div>

            {/* Best Time */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <span className="text-lg">Best time:</span>
              <div className="text-right">
                {bestTimeInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestTimeInfo.isBestTime ? (
                  <span className="text-lg font-bold text-green-400">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl font-bold">{bestTimeInfo.previousBestTime} ms</span>
                )}
              </div>
            </motion.div>

            {/* Time Needed */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <span className="text-lg">Time needed:</span>
              <div className="text-right">
                {bestTimeInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestTimeInfo.isBestTime ? (
                  <span className="text-lg font-bold text-green-400">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl">
                    {bestTimeInfo.timeNeeded && bestTimeInfo.timeNeeded > 1 ? `${bestTimeInfo.timeNeeded - 1} ms` : "0 ms"}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Reaction Time */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              <span className="text-lg">Reaction time:</span>
              <span className="text-xl font-bold">
                {gameResult.missed ? "Missed" : `${gameResult.reactionTime} ms`}
              </span>
            </motion.div>

            {/* Rating */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              <span className="text-lg">Rating:</span>
              <span className="text-xl font-bold">{gameResult.rating}</span>
            </motion.div>

            {/* Attempts (placeholder to match other modes) */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
            >
              <span className="text-lg">Status:</span>
              <span className="text-xl font-bold">{gameResult.missed ? "Failed" : "Success"}</span>
            </motion.div>
          </motion.div>

          <Divider className="bg-white/30" />

          {/* Error Block (above button) */}
          {(saveStatus.error || saveStatus.sessionError) && (
            <motion.div 
              className="text-center space-y-2 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.1 }}
            >
              {saveStatus.sessionError && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ShieldAlert className="text-white" size={16} />
                    <span className="text-sm text-white">Session Security Error</span>
                  </div>
                  <div className="text-white/60 text-xs">{saveStatus.sessionError}</div>
                </div>
              )}
              
              {saveStatus.error && (
                <div className="text-center">
                  <div className="text-white text-sm mb-2">
                    Save failed after {saveStatus.maxAttempts} attempts
                  </div>
                  <div className="text-white/60 text-xs mb-3">
                    Game recorded locally
                  </div>
                  <button
                    className="px-3 py-1 bg-white/20 border border-white/30 text-white rounded text-xs hover:bg-white/30 transition-colors"
                    onClick={() => gameResult && handleSaveGameResult(gameResult)}
                  >
                    Retry Save
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Play Again Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <button
              className={`w-full px-6 py-4 text-lg rounded-lg border-2 shadow-lg transition-all duration-300 flex items-center justify-center space-x-3 font-medium tracking-wide ${buttonState.className}`}
              disabled={buttonState.disabled}
              onClick={handlePlayAgain}
            >
              {buttonState.showSpinner && <LoadingSpinner size={18} />}
              {buttonState.showIcon && !buttonState.showSpinner && <RotateCcw size={20} />}
              <span>{buttonState.text}</span>
            </button>
          </motion.div>
        </motion.div>
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