// src/game-modes/rotation/RotationGameManager.tsx - Fixed session management

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

export default function RotationGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttemptWithSession, fetchAttemptsStatus } = useAttempts(
    makeAuthenticatedRequest,
  );
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<RotationGameState>(
    initializeRotationGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<RotationGameResult | null>(null);
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
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] =
    useState<number[]>([]);

  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<RotationGameState>(gameState);
  const shadowSecurityRef = useRef<ShadowSecurityManager | null>(null);
  const lastVisibilityState = useRef<boolean>(true);
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
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange,
        );
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

      // Store the handler function reference
      const handleBackButton = () => {
        router.push("/game");
      };

      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButton);

      return () => {
        // Use the same handler reference for cleanup
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

  // FIXED: Enhanced save game result with proper session management
  const handleSaveGameResult = useCallback(
    async (result: RotationGameResult) => {
      // CRITICAL FIX: Use ref instead of state to avoid race condition
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

          // FIXED: Use sessionId from ref, not state
          await saveGameResult(result, sessionId);

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
    [makeAuthenticatedRequest, t, user, saveGameResult], // Removed sessionStatus dependency
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
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

    try {
      const attemptsResult = await consumeAttemptWithSession(GameMode.ROTATION);

      if (!attemptsResult || !attemptsResult.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.rotation.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });

        return;
      }

      // CRITICAL FIX: Store session ID in ref immediately after getting it
      if (attemptsResult.sessionId && attemptsResult.sessionExpiresAt) {
        console.log("Session created:", attemptsResult.sessionId);

        // Store in ref for immediate access
        currentSessionRef.current = attemptsResult.sessionId;

        // Also set state for UI purposes
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
      setSaveStatus(initialSaveStatus);
      setPlayAgainError(initialPlayAgainError);
      setActivatedCircles([]);
      setLastActivationTimestamp(0);
      setIsPlayingAgain(false);
      setInstantlyDeactivatedCircles([]);

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
      console.error("Failed to start game:", error);
      setPlayAgainError({
        show: true,
        message: t("game.modes.rotation.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
    }
  }, [scheduleNextActivation, consumeAttemptWithSession, t]);

  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) return;

    setIsPlayingAgain(true);

    try {
      const currentAttemptsStatus = await fetchAttemptsStatus(true);

      if (!currentAttemptsStatus || !currentAttemptsStatus.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.rotation.playAgain.noAttempts"),
          redirecting: false,
          isSessionError: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      await startGame();
    } catch (error) {
      setPlayAgainError({
        show: true,
        message: t("game.modes.rotation.playAgain.error"),
        redirecting: false,
        isSessionError: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, fetchAttemptsStatus, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupRotationGame(gameStateRef.current);

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanup();
      }

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }

      // ADDED: Cleanup session ref
      currentSessionRef.current = null;
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
      case "app_minimized":
        return <EyeOff className="text-gray-400" size={20} />;
      case "session_expired":
        return <ShieldAlert className="text-orange-400" size={20} />;
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
      app_minimized: "game.modes.physics.deathCauses.appMinimized",
      session_expired: "game.modes.rotation.deathCauses.sessionExpired",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.rotation.deathCauses.default");
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🌀</div>

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
                {t("game.modes.rotation.results.finalScore")}
              </div>
              <div className="text-6xl font-bold text-green-400">
                {gameResult.score}
              </div>
              <div className="text-lg text-orange-300/80">
                {gameResult.score * 3} (×3)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.correctHits")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {gameResult.correctHits}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-orange-400/60">
                  {t("game.modes.rotation.results.survivalTime")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatRotationTime(gameResult.survivalTime)}
                </div>
              </div>
            </div>

            <div className="text-center space-y-1 border-t border-orange-400/30 pt-4">
              <div className="text-xs text-orange-400/60">
                {t("game.modes.rotation.results.levelsCompleted")}
              </div>
              <div className="text-xl font-bold text-yellow-400">
                {gameResult.maxLevelReached}/10
              </div>
            </div>
          </div>

          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.sessionError ||
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
                        {t("save.saveFailed", {
                          attempts: saveStatus.maxAttempts,
                        })}
                      </span>
                    </div>
                    <button
                      className="px-3 py-1 bg-orange-400/20 border border-orange-400/30 text-orange-300 rounded text-xs hover:bg-orange-400/30 transition-colors"
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
                    {t("game.modes.rotation.playAgain.cannotPlay")}
                  </span>
                </div>
                <div className="text-red-300/80 text-xs mb-3">
                  {playAgainError.message}
                </div>
                {playAgainError.redirecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-xs">
                      {t("game.modes.rotation.playAgain.redirecting")}
                    </span>
                  </div>
                ) : (
                  <div className="text-white/60 text-xs">
                    {t("game.modes.rotation.playAgain.autoRedirect")}
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
                  <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                  <span>{t("game.modes.rotation.playAgain.starting")}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  <span>{t("game.modes.rotation.playAgain.button")}</span>
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

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-orange-400/30 safe-area-inset-bottom">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <RotateCw className="text-orange-400" size={18} />
              <span className="text-lg font-bold text-orange-400">
                {t("common.level")} {gameState.currentLevel}/10
              </span>
            </div>

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