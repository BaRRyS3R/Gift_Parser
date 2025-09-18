// src/game-modes/survival/SurvivalGameManager.tsx - Рефакторинг результатов

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Crosshair,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  initializeSurvivalGameState,
  updateSurvivalLevel,
  activateSurvivalCircles,
  handleSurvivalCircleClick,
  deactivateSurvivalCircle,
  createSurvivalGameResult,
  cleanupSurvivalGame,
  getLevelConfig,
  formatSurvivalTime,
} from "./SurvivalGameLogic";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { GameState, GameMode } from "@/types/game-modes/common";
import {
  SurvivalGameState,
  SurvivalGameResult,
} from "@/types/game-modes/survival";
import GameGrid from "@/components/GameGrid";
import { useT } from "@/contexts/LocalizationContext";
import { ShadowSecurityManager } from "@/lib/security/ShadowSecurityManager";
import { GameSaveResult } from "@/hooks/modules/useGame";
import ConfettiExplosion from "react-confetti-explosion";

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

const LEVEL_UPDATE_INTERVAL = 200;

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <div 
    className="border-2 border-white/20 border-t-white rounded-full animate-spin"
    style={{ width: size, height: size }}
  />
);

// Separator Component
const Separator: React.FC = () => (
  <div className="flex justify-center my-6">
    <div className="w-16 h-px bg-white"></div>
  </div>
);

export default function SurvivalGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const { 
    consumeAttemptWithSession, 
    updateAttemptsFromGameSave, 
    preValidateCanPlay,
    fetchAttemptsStatus 
  } = useAttempts(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<SurvivalGameState>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [bestScoreInfo, setBestScoreInfo] = useState<BestScoreInfo | null>(null);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(
    initialPlayAgainError,
  );
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);
  const [canPlayAfterSave, setCanPlayAfterSave] = useState<boolean | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initialSessionStatus);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);

  // Store session ID in a ref to avoid race conditions
  const currentSessionRef = useRef<string | null>(null);

  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<SurvivalGameState>(gameState);
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
          timeRemaining <= 30000 &&
          timeRemaining > 0 &&
          !sessionWarningShown
        ) {
          setSessionWarningShown(true);
          console.warn("Game session expires in 30 seconds");
        }

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
  }, [
    sessionStatus.sessionId,
    sessionStatus.isValid,
    sessionStatus.expiresAt,
    sessionWarningShown,
  ]);

  // App visibility monitoring
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

  const handleSaveGameResult = useCallback(
    async (result: SurvivalGameResult) => {
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
              console.warn("Failed to report suspicious activity");
            }
          }
        } catch (error) {
          console.error("Error processing suspicious activity:", error);
        }
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

          const response = await makeAuthenticatedRequest("/api/game/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gameResult: result,
              sessionId: sessionId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (errorData.sessionError) {
              throw new Error(`SESSION_ERROR: ${errorData.sessionError}`);
            }

            throw new Error(errorData.error || "Failed to save game result");
          }

          const responseData = await response.json();

          if (!responseData.success) {
            if (responseData.sessionError) {
              throw new Error(`SESSION_ERROR: ${responseData.sessionError}`);
            }
            throw new Error(responseData.error || "Failed to save game result");
          }

          // Process Best Score information
          const saveResult = responseData.data as GameSaveResult;
          if (saveResult.bestScoreInfo) {
            setBestScoreInfo(saveResult.bestScoreInfo);
            console.log("[SAVE_GAME] Best score info received:", saveResult.bestScoreInfo);
          }

          if (saveResult.attemptsStatus) {
            console.log("[SAVE_GAME] Attempts status from save:", saveResult.attemptsStatus);
            
            updateAttemptsFromGameSave(saveResult.attemptsStatus);
            setCanPlayAfterSave(saveResult.attemptsStatus.canPlay);
            
            console.log(`[SAVE_GAME] Can play after save: ${saveResult.attemptsStatus.canPlay}, attempts: ${saveResult.attemptsStatus.attemptsRemaining}`);
            
            if (!saveResult.attemptsStatus.canPlay) {
              console.log("[SAVE_GAME] User cannot play again - setting up error message and redirect");
              setPlayAgainError({
                show: true,
                message: t("game.modes.survival.playAgain.noAttempts"),
                redirecting: false,
                isSessionError: false,
              });
            }
          } else {
            console.warn("[SAVE_GAME] No attempts status in save response");
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
          if (
            error instanceof Error &&
            error.message.includes("SESSION_ERROR:")
          ) {
            const sessionError = error.message.replace("SESSION_ERROR: ", "");

            setSaveStatus((prev) => ({
              ...prev,
              isLoading: false,
              sessionError,
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
          error: errorMessage.includes("SESSION_ERROR:") ? null : errorMessage,
          sessionError: errorMessage.includes("SESSION_ERROR:")
            ? errorMessage.replace("SESSION_ERROR: ", "")
            : null,
        }));

        console.error("[SAVE_GAME] Save failed:", error);
      }
    },
    [makeAuthenticatedRequest, t, user, updateAttemptsFromGameSave],
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

        const finalState = updateSurvivalLevel(prev, Date.now());

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

        const result = createSurvivalGameResult(finalGameState);

        if (cause === "app_minimized" || cause === "session_expired") {
          (result as any).deathCause = cause;
        }

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupSurvivalGame(finalGameState);

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

        const newState = activateSurvivalCircles(
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
                deactivateSurvivalCircle(current, circleId),
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
      const { newState, result } = handleSurvivalCircleClick(
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

        const immediatelyDeactivatedState = deactivateSurvivalCircle(
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
      const attemptsResult = await consumeAttemptWithSession(GameMode.SURVIVAL);

      if (!attemptsResult) {
        console.log("[START_GAME] Failed to consume attempt - no result");
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.noAttempts"),
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

      const newGameState = initializeSurvivalGameState();

      shadowSecurityRef.current = new ShadowSecurityManager(
        GameMode.SURVIVAL,
        newGameState.gameStartTime,
        {
          enabled: true,
          sensitivityThreshold: 1.0,
          suspiciousMovementThreshold: 70.0,
          maxCheckInterval: 3000,
          minCheckInterval: 3000,
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
      setInstantlyDeactivatedCircles([]);
      setIsPlayingAgain(false);
      setSessionWarningShown(false);
      setCanPlayAfterSave(null);

      setTimeout(() => {
        setShowCircles(true);
      }, 100);

      setTimeout(() => {
        setGameState((prev) => {
          const updatedState = { ...prev, gameState: GameState.PLAYING };
          return updatedState;
        });

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

            return updateSurvivalLevel(current, Date.now());
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
          ? t("game.modes.survival.playAgain.noAttempts")
          : t("game.modes.survival.playAgain.error"),
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
          message: t("game.modes.survival.playAgain.noAttempts"),
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
          ? t("game.modes.survival.playAgain.noAttempts")
          : t("game.modes.survival.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, startGame, t, preValidateCanPlay]);

  useEffect(() => {
    return () => {
      cleanupSurvivalGame(gameStateRef.current);

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
        return <Crosshair className="text-white" size={20} />;
      case "wrong_click":
        return <AlertTriangle className="text-white" size={20} />;
      case "decoy_hit":
        return <AlertTriangle className="text-white" size={20} />;
      case "app_minimized":
        return <EyeOff className="text-white" size={20} />;
      case "session_expired":
        return <ShieldAlert className="text-white" size={20} />;
      default:
        return <Crosshair className="text-white" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      miss: "game.modes.survival.deathCauses.miss",
      wrong_click: "game.modes.survival.deathCauses.wrongClick",
      decoy_hit: "game.modes.survival.deathCauses.decoyHit",
      timeout: "game.modes.survival.deathCauses.default",
      app_minimized: "game.modes.physics.deathCauses.appMinimized",
      session_expired: "game.modes.survival.deathCauses.sessionExpired",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.survival.deathCauses.default");
  };

  // Get button state and styling
  const getButtonState = () => {
    if (saveStatus.isLoading) {
      return {
        text: "Saving",
        className: "bg-gray-600 text-gray-300 cursor-not-allowed",
        disabled: true,
        showIcon: false
      };
    }
    
    if (playAgainError.show || canPlayAfterSave === false) {
      return {
        text: "No attempts",
        className: "bg-red-600 text-white cursor-not-allowed",
        disabled: true,
        showIcon: false
      };
    }
    
    if (saveStatus.isSuccess && (canPlayAfterSave === true || canPlayAfterSave === null)) {
      return {
        text: "Again",
        className: "bg-green-600 text-white hover:bg-green-700 transition-colors",
        disabled: false,
        showIcon: true
      };
    }
    
    return {
      text: "Saving",
      className: "bg-gray-600 text-gray-300 cursor-not-allowed",
      disabled: true,
      showIcon: false
    };
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const buttonState = getButtonState();

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
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

          {/* Skull */}
          <div className="text-center">
            <div className="text-6xl mb-4">💀</div>
          </div>

          {/* Death Cause */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              {getDeathCauseIcon(gameResult.deathCause)}
              <span className="text-sm text-white">
                {getDeathCauseMessage(gameResult.deathCause)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Game Statistics */}
          <div className="space-y-4 text-center">
            {/* Final Score */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Final score:</span>
              <span className="text-2xl font-bold">{gameResult.score * 2}</span>
            </div>

            {/* Best Score */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Best score:</span>
              <div className="text-right">
                {bestScoreInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestScoreInfo.isBestScore ? (
                  <span className="text-lg font-bold">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl font-bold">{bestScoreInfo.previousBestScore}</span>
                )}
              </div>
            </div>

            {/* Points Needed */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Points needed:</span>
              <div className="text-right">
                {bestScoreInfo === null ? (
                  <LoadingSpinner size={20} />
                ) : bestScoreInfo.isBestScore ? (
                  <span className="text-lg font-bold">🏆 NEW RECORD!</span>
                ) : (
                  <span className="text-xl">
                    {bestScoreInfo.pointsNeeded ? bestScoreInfo.pointsNeeded + 1 : 0}
                  </span>
                )}
              </div>
            </div>

            {/* Hits */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Hits:</span>
              <span className="text-xl font-bold">{gameResult.correctHits}</span>
            </div>

            {/* Survival Time */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Survival time:</span>
              <span className="text-xl font-bold">{formatSurvivalTime(gameResult.survivalTime)}</span>
            </div>

            {/* Levels Complete */}
            <div className="flex justify-between items-center">
              <span className="text-lg">Levels complete:</span>
              <span className="text-xl font-bold">{gameResult.maxLevelReached}</span>
            </div>
          </div>

          <Separator />

          {/* Error Block (above button) */}
          {(saveStatus.error || saveStatus.sessionError) && (
            <div className="text-center space-y-2 mb-4">
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
            </div>
          )}

          {/* Play Again Button */}
          <div>
            <button
              className={`w-full px-6 py-4 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${buttonState.className}`}
              disabled={buttonState.disabled}
              onClick={handlePlayAgain}
            >
              {buttonState.showIcon && <RotateCcw size={20} />}
              <span>{buttonState.text}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white relative">
      {gameState.gameState === GameState.PLAYING && (
        <>
          <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none">
            <div className="flex justify-center pt-8">
              <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold text-white font-mono">
                  {formatSurvivalTime(gameState.stats.survivalTime)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 flex items-center justify-center">
        <GameGrid
          circles={gameState.circles}
          gameMode="survival"
          instantlyDeactivatedCircles={instantlyDeactivatedCircles}
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
        />
      </div>
    </div>
  );
}