// src/game-modes/rotation/RotationGameManager.tsx - Refactored with new UI design

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  Target,
  RotateCw,
  EyeOff,
  ShieldAlert,
} from "lucide-react";
import { Divider } from "@nextui-org/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ConfettiExplosion from "react-confetti-explosion";

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
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useGame } from "@/hooks/modules/useGame";
import { GameState, GameMode } from "@/types/game-modes/common";
import {
  RotationGameState,
  RotationGameResult,
} from "@/types/game-modes/rotation";
import RotatingCircleGrid from "@/components/RotatingCircleGrid";
import { useT } from "@/contexts/LocalizationContext";
import { ShadowSecurityManager } from "@/lib/security/ShadowSecurityManager";

interface SaveStatus {
  isLoading: boolean;
  attempt: number;
  maxAttempts: number;
  error: string | null;
  sessionError: string | null;
  isSuccess: boolean;
  showRetryDetails: boolean;
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

interface BestScoreInfo {
  previousBestScore: number;
  currentScore: number;
  newBestScore: number;
  isBestScore: boolean;
  pointsNeeded?: number;
}

const initialSaveStatus: SaveStatus = {
  isLoading: false,
  attempt: 0,
  maxAttempts: 3,
  error: null,
  sessionError: null,
  isSuccess: false,
  showRetryDetails: false,
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

const LEVEL_UPDATE_INTERVAL = 100;

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <div 
    className="border-2 border-white/20 border-t-white rounded-full animate-spin"
    style={{ width: size, height: size }}
  />
);

export default function RotationGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttemptWithSession, updateAttemptsFromGameSave, preValidateCanPlay } = useAttempts(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<RotationGameState>(
    initializeRotationGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<RotationGameResult | null>(null);
  const [bestScoreInfo, setBestScoreInfo] = useState<BestScoreInfo | null>(null);
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
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<RotationGameState>(gameState);
  const shadowSecurityRef = useRef<ShadowSecurityManager | null>(null);
  const lastVisibilityState = useRef<boolean>(true);
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
          endGame("session_expired");
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
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";

      if (
        !isVisible &&
        lastVisibilityState.current &&
        gameStateRef.current.gameState === GameState.PLAYING &&
        !isGameEndingRef.current
      ) {
        endGame("app_minimized");
      }

      lastVisibilityState.current = isVisible;
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (
          document.visibilityState !== "visible" &&
          gameStateRef.current.gameState === GameState.PLAYING &&
          !isGameEndingRef.current
        ) {
          endGame("app_minimized");
        }
      }, 100);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        gameStateRef.current.gameState === GameState.PLAYING &&
        !isGameEndingRef.current
      ) {
        endGame("app_minimized");
      }
    };

    const handlePageHide = () => {
      if (
        gameStateRef.current.gameState === GameState.PLAYING &&
        !isGameEndingRef.current
      ) {
        endGame("app_minimized");
      }
    };

    const setupTelegramHandlers = () => {
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;

        const handleViewportChanged = (params: any) => {
          if (
            params.isStateStable === false &&
            gameStateRef.current.gameState === GameState.PLAYING &&
            !isGameEndingRef.current
          ) {
            endGame("app_minimized");
          }
        };

        const handleThemeChanged = () => {
          if (
            gameStateRef.current.gameState === GameState.PLAYING &&
            document.visibilityState !== "visible" &&
            !isGameEndingRef.current
          ) {
            endGame("app_minimized");
          }
        };

        tg.onEvent("viewportChanged", handleViewportChanged);
        tg.onEvent("themeChanged", handleThemeChanged);

        return () => {
          tg.offEvent("viewportChanged", handleViewportChanged);
          tg.offEvent("themeChanged", handleThemeChanged);
        };
      }

      return () => { };
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    const cleanupTelegram = setupTelegramHandlers();

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const handleOrientationChange = () => {
        setTimeout(() => {
          if (
            document.visibilityState !== "visible" &&
            gameStateRef.current.gameState === GameState.PLAYING &&
            !isGameEndingRef.current
          ) {
            endGame("app_minimized");
          }
        }, 300);
      };

      window.addEventListener("orientationchange", handleOrientationChange);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener("orientationchange", handleOrientationChange);
        cleanupTelegram();
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      cleanupTelegram();
    };
  }, []);

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
    async (result: RotationGameResult) => {
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
      }));

      const processSuspiciousActivity = async () => {
        if (!shadowSecurityRef.current || !user) {
          return;
        }

        try {
          const suspiciousActivityData =
            shadowSecurityRef.current.generateSuspiciousActivityData(
              user.telegram_id,
              Date.now(),
            );

          if (suspiciousActivityData) {
            const suspiciousActivityResponse = await makeAuthenticatedRequest(
              "/api/security/suspicious-activity",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  suspiciousActivity: suspiciousActivityData,
                }),
              },
            );

            if (!suspiciousActivityResponse.ok) {
              const errorData = await suspiciousActivityResponse
                .json()
                .catch(() => ({}));
            }
          }
        } catch (error) { }
      };

      let attemptCount = 1;

      const attemptSave = async (): Promise<void> => {
        setSaveStatus((prev) => ({ ...prev, attempt: attemptCount }));

        if (attemptCount > 1) {
          setSaveStatus((prev) => ({ ...prev, showRetryDetails: true }));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          if (attemptCount === 1) {
            await processSuspiciousActivity();
          }

          const response = await saveGameResult(result, sessionId);

          // Process Best Score information from API response
          if (response.bestScoreInfo) {
            setBestScoreInfo(response.bestScoreInfo);
            console.log("[SAVE_GAME] Best score info received:", response.bestScoreInfo);
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
                message: t("game.modes.rotation.playAgain.noAttempts"),
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
          message: t("game.modes.rotation.playAgain.error"),
          redirecting: false,
          isSessionError: false,
        });
      }
    },
    [makeAuthenticatedRequest, t, user, saveGameResult, updateAttemptsFromGameSave],
  );

  const endGame = useCallback(
    (
      cause:
        | "miss"
        | "wrong_click"
        | "decoy_hit"
        | "app_minimized"
        | "session_expired",
    ) => {
      if (isGameEndingRef.current) {
        return;
      }
      isGameEndingRef.current = true;

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanupAllPendingActivations();
      }

      setGameState((prev) => {
        if (prev.isGameEnding) {
          return prev;
        }

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
          case "app_minimized":
            break;
          case "session_expired":
            break;
        }

        const finalGameState = {
          ...finalState,
          gameState: GameState.FINISHED,
          isActive: false,
          isGameEnding: true,
          stats: updatedStats,
        };

        const result = createRotationGameResult(finalGameState);

        if (cause === "app_minimized" || cause === "session_expired") {
          (result as any).deathCause = cause;
        }

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

    if (isSchedulingActivationRef.current) {
      return;
    }

    if (
      !currentState.isActive ||
      currentState.gameState !== GameState.PLAYING ||
      currentState.isGameEnding ||
      isGameEndingRef.current
    ) {
      return;
    }

    isSchedulingActivationRef.current = true;

    const levelConfig = getLevelConfig(currentState.currentLevel);
    const delay =
      Math.random() *
      (levelConfig.activationTimeMax - levelConfig.activationTimeMin) +
      levelConfig.activationTimeMin;

    const timeout = setTimeout(() => {
      isSchedulingActivationRef.current = false;

      if (
        !gameStateRef.current.isActive ||
        gameStateRef.current.gameState !== GameState.PLAYING ||
        gameStateRef.current.isGameEnding ||
        isGameEndingRef.current
      ) {
        return;
      }

      setGameState((prev) => {
        if (
          !prev.isActive ||
          prev.gameState !== GameState.PLAYING ||
          prev.isGameEnding
        ) {
          return prev;
        }

        const newState = activateRotationCircles(
          prev,
          (circleIds, redCircleIds) => {
            const timestamp = Date.now();

            if (shadowSecurityRef.current) {
              circleIds.forEach((circleId) => {
                const isWhiteCircle = !redCircleIds.includes(circleId);

                if (isWhiteCircle) {
                  shadowSecurityRef.current!.recordCircleActivation(
                    circleId,
                    timestamp,
                  );
                }
              });
            }

            setActivatedCircles(circleIds);
            setLastActivationTimestamp(timestamp);

            setTimeout(() => {
              setActivatedCircles([]);
            }, 450);
          },
          (circleId, wasDecoy) => {
            if (isGameEndingRef.current || prev.isGameEnding) {
              return;
            }

            if (shadowSecurityRef.current) {
              shadowSecurityRef.current.cleanupCircleActivation(circleId);
            }

            if (!wasDecoy) {
              endGame("miss");
            } else {
              setGameState((current) =>
                deactivateRotationCircle(current, circleId),
              );
              if (
                !isGameEndingRef.current &&
                !gameStateRef.current.isGameEnding
              ) {
                scheduleNextActivation();
              }
            }
          },
        );

        return newState;
      });

      if (
        gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING &&
        !gameStateRef.current.isGameEnding &&
        !isGameEndingRef.current
      ) {
        scheduleNextActivation();
      }
    }, delay);

    setGameState((prev) => ({
      ...prev,
      activationTimeout: timeout,
    }));

    setTimeout(() => {
      isSchedulingActivationRef.current = false;
    }, 50);
  }, [endGame]);

  const handleCircleClickEvent = useCallback(
    (circleId: number) => {
      const currentState = gameStateRef.current;

      if (
        currentState.gameState !== GameState.PLAYING ||
        isGameEndingRef.current
      ) {
        return;
      }

      const clickTime = Date.now();
      const { newState, result } = handleRotationCircleClick(
        currentState,
        circleId,
        clickTime,
      );

      if (result === "correct") {
        if (shadowSecurityRef.current) {
          const clickedCircle = currentState.circles.find(
            (c) => c.id === circleId,
          );

          if (
            clickedCircle &&
            clickedCircle.isActive &&
            !clickedCircle.isDecoy
          ) {
            shadowSecurityRef.current.recordCircleClick(circleId, clickTime);
          }
        }

        triggerHapticFeedback("success");

        setInstantlyDeactivatedCircles((prev) => [...prev, circleId]);

        const immediatelyDeactivatedState = deactivateRotationCircle(
          newState,
          circleId,
        );

        setGameState(immediatelyDeactivatedState);

        setTimeout(() => {
          setInstantlyDeactivatedCircles((prev) =>
            prev.filter((id) => id !== circleId),
          );
        }, 100);
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

  const startGame = useCallback(async () => {
    console.log("[START_GAME] Starting game initialization");
    
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

    try {
      const attemptsResult = await consumeAttemptWithSession(GameMode.ROTATION);

      if (!attemptsResult) {
        console.log("[START_GAME] Failed to consume attempt - no result");
        setPlayAgainError({
          show: true,
          message: t("game.modes.rotation.playAgain.noAttempts"),
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

      const newGameState = initializeRotationGameState();

      shadowSecurityRef.current = new ShadowSecurityManager(
        GameMode.ROTATION,
        newGameState.gameStartTime || Date.now(),
        {
          enabled: true,
          sensitivityThreshold: 1.0,
          suspiciousMovementThreshold: 70.0,
          maxCheckInterval: 5000,
          minCheckInterval: 5000,
          requirePermissionCheck: false,
        },
      );

      setGameState(newGameState);
      setGameResult(null);
      setBestScoreInfo(null);
      setSaveStatus(initialSaveStatus);
      setPlayAgainError(initialPlayAgainError);
      setActivatedCircles([]);
      setLastActivationTimestamp(0);
      setIsPlayingAgain(false);
      setInstantlyDeactivatedCircles([]);
      setCanPlayAfterSave(null);

      setTimeout(() => {
        setShowCircles(true);
      }, 100);

      setTimeout(() => {
        setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

        const levelInterval = setInterval(() => {
          setGameState((current) => {
            if (
              !current.isActive ||
              current.gameState !== GameState.PLAYING ||
              current.isGameEnding ||
              isGameEndingRef.current
            ) {
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
    } catch (error) {
      console.error("[START_GAME] Failed to start game:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isAttemptsError = errorMessage.includes("attempts") || errorMessage.includes("No attempts");
      
      setPlayAgainError({
        show: true,
        message: isAttemptsError 
          ? t("game.modes.rotation.playAgain.noAttempts")
          : t("game.modes.rotation.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
    }
  }, [scheduleNextActivation, consumeAttemptWithSession, t]);

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
          message: t("game.modes.rotation.playAgain.noAttempts"),
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
          ? t("game.modes.rotation.playAgain.noAttempts")
          : t("game.modes.rotation.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, startGame, t, preValidateCanPlay]);

  useEffect(() => {
    return () => {
      cleanupRotationGame(gameStateRef.current);

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanup();
      }

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }

      currentSessionRef.current = null;
    };
  }, []);

  const getDeathCauseIcon = (deathCause: string) => {
    switch (deathCause) {
      case "miss":
        return <Clock className="text-white" size={20} />;
      case "wrong_click":
        return <Target className="text-white" size={20} />;
      case "decoy_hit":
        return <AlertTriangle className="text-white" size={20} />;
      case "app_minimized":
        return <EyeOff className="text-white" size={20} />;
      case "session_expired":
        return <ShieldAlert className="text-white" size={20} />;
      default:
        return <RotateCw className="text-white" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      miss: "game.modes.rotation.deathCauses.miss",
      wrong_click: "game.modes.rotation.deathCauses.wrongClick",
      decoy_hit: "game.modes.rotation.deathCauses.decoyHit",
      timeout: "game.modes.rotation.deathCauses.default",
      app_minimized: "game.modes.physics.deathCauses.appMinimized",
      session_expired: "game.modes.rotation.deathCauses.sessionExpired",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.rotation.deathCauses.default");
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
          {bestScoreInfo?.isBestScore && (
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
            <div className="text-6xl mb-4">🌀</div>
          </motion.div>

          {/* Death Cause */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-center space-x-2">
              {getDeathCauseIcon(gameResult.deathCause)}
              <span className="text-sm text-white">
                {getDeathCauseMessage(gameResult.deathCause)}
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
              <span className="text-2xl font-bold">{gameResult.score * 3}</span>
            </motion.div>

            {/* Best Score */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <span className="text-lg">Best score:</span>
              <div className="text-right">
                {bestScoreInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestScoreInfo.isBestScore ? (
                  <span className="text-lg font-bold text-green-400">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl font-bold">{bestScoreInfo.previousBestScore}</span>
                )}
              </div>
            </motion.div>

            {/* Points Needed */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <span className="text-lg">Points needed:</span>
              <div className="text-right">
                {bestScoreInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestScoreInfo.isBestScore ? (
                  <span className="text-lg font-bold text-green-400">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl">
                    {bestScoreInfo.pointsNeeded ? bestScoreInfo.pointsNeeded + 1 : 0}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Hits */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              <span className="text-lg">Hits:</span>
              <span className="text-xl font-bold">{gameResult.correctHits}</span>
            </motion.div>

            {/* Survival Time */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              <span className="text-lg">Survival time:</span>
              <span className="text-xl font-bold">{formatRotationTime(gameResult.survivalTime)}</span>
            </motion.div>

            {/* Levels Complete */}
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
            >
              <span className="text-lg">Levels complete:</span>
              <span className="text-xl font-bold">{gameResult.maxLevelReached}</span>
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
      <div className="flex-1 flex items-center justify-center">
        <RotatingCircleGrid
          circles={gameState.circles}
          instantlyDeactivatedCircles={instantlyDeactivatedCircles}
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          radius={gameState.config.radius}
          rotationSpeed={gameState.currentRotationSpeed}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-white/30 safe-area-inset-bottom">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">
                {formatRotationTime(gameState.stats.survivalTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}