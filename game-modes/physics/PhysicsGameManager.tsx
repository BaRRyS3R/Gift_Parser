// src/game-modes/physics/PhysicsGameManager.tsx - Enhanced with auto-end on visibility loss

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Crosshair,
  AlertTriangle,
  Zap,
  Clock,
  RotateCcw,
  TrendingDown,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as Matter from "matter-js";

import {
  initializePhysicsGameState,
  updatePhysicsPositions,
  updatePhysicsLevel,
  activateRandomCircles,
  handlePhysicsCircleClick,
  deactivatePhysicsCircle,
  createPhysicsGameResult,
  cleanupPhysicsGame,
  formatPhysicsTime,
  applyImpulse,
  getPhysicsLevelConfig,
} from "./PhysicsGameLogic";
import PhysicsGameCanvas from "./PhysicsGameCanvas";

import { useUser } from "@/hooks/useUser";
import { useAttempts } from "@/hooks/modules/useAttempts";
import { useGame } from "@/hooks/modules/useGame";
import { GameState, GameMode } from "@/types/game-modes/common";
import {
  PhysicsGameState,
  PhysicsGameResult,
} from "@/types/game-modes/physics";
import { useT } from "@/contexts/LocalizationContext";
import { ShadowSecurityManager } from "@/lib/security/ShadowSecurityManager";

interface SaveStatus {
  isLoading: boolean;
  attempt: number;
  maxAttempts: number;
  error: string | null;
  isSuccess: boolean;
  showRetryDetails: boolean;
}

interface PlayAgainError {
  show: boolean;
  message: string;
  redirecting: boolean;
}

const initialSaveStatus: SaveStatus = {
  isLoading: false,
  attempt: 0,
  maxAttempts: 3,
  error: null,
  isSuccess: false,
  showRetryDetails: false,
};

const initialPlayAgainError: PlayAgainError = {
  show: false,
  message: "",
  redirecting: false,
};

export default function PhysicsGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const { saveGameResult } = useGame(makeAuthenticatedRequest);
  const { consumeAttempt, fetchAttemptsStatus } = useAttempts(
    makeAuthenticatedRequest,
  );
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<PhysicsGameState>(
    initializePhysicsGameState(),
  );
  const [showCanvas, setShowCanvas] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<PhysicsGameResult | null>(null);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(
    initialPlayAgainError,
  );
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<PhysicsGameState>(gameState);
  const engineUpdateRef = useRef<number>();
  const shadowSecurityRef = useRef<ShadowSecurityManager | null>(null);
  const lastVisibilityState = useRef<boolean>(true);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Обработка событий видимости приложения
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      
      // Если приложение стало невидимым и игра активна
      if (!isVisible && lastVisibilityState.current && 
          gameStateRef.current.gameState === GameState.PLAYING && 
          !isGameEndingRef.current) {
        
        endGame("app_minimized");
      }
      
      lastVisibilityState.current = isVisible;
    };

    const handleBlur = () => {
      // Дополнительная проверка при потере фокуса окна
      if (gameStateRef.current.gameState === GameState.PLAYING && 
          !isGameEndingRef.current) {
        endGame("app_minimized");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Завершение игры при попытке закрыть/обновить страницу
      if (gameStateRef.current.gameState === GameState.PLAYING && 
          !isGameEndingRef.current) {
        endGame("app_minimized");
      }
    };

    // Специфичная обработка для Telegram Web App
    const handleTelegramEvents = () => {
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Обработка событий Telegram
        tg.onEvent("viewportChanged", (params: any) => {
          if (params.isStateStable === false && 
              gameStateRef.current.gameState === GameState.PLAYING) {
            endGame("app_minimized");
          }
        });

        tg.onEvent("themeChanged", () => {
          // При смене темы также может означать сворачивание
          if (gameStateRef.current.gameState === GameState.PLAYING && 
              document.visibilityState !== "visible") {
            endGame("app_minimized");
          }
        });
      }
    };

    // Подписка на события
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    // Инициализация Telegram событий
    handleTelegramEvents();

    // Дополнительная проверка для мобильных устройств
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // Обработка событий блокировки экрана на мобильных устройствах
      window.addEventListener("pagehide", () => {
        if (gameStateRef.current.gameState === GameState.PLAYING) {
          endGame("app_minimized");
        }
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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

  const handleSaveGameResult = useCallback(
    async (result: PhysicsGameResult) => {
      setSaveStatus((prev) => ({
        ...prev,
        isLoading: true,
        attempt: 1,
        error: null,
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
        } catch (error) {}
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
    [saveGameResult, t, makeAuthenticatedRequest, user],
  );

  const updatePhysicsEngine = useCallback(() => {
    const currentState = gameStateRef.current;

    if (
      !currentState.isActive ||
      currentState.gameState !== GameState.PLAYING
    ) {
      if (engineUpdateRef.current) {
        cancelAnimationFrame(engineUpdateRef.current);
        engineUpdateRef.current = undefined;
      }

      return;
    }

    Matter.Engine.update(currentState.engine, 16.67);

    setGameState((prev) => {
      const updatedState = updatePhysicsPositions(prev);
      const levelUpdatedState = updatePhysicsLevel(updatedState);

      const tooManyMistakes =
        levelUpdatedState.stats.currentMistakes >=
        levelUpdatedState.config.maxMistakes;
      const timeUp =
        levelUpdatedState.stats.gameTime >=
        levelUpdatedState.config.levelDuration * 1000;

      if (tooManyMistakes || timeUp) {
        const deathCause = tooManyMistakes ? "mistakes" : "timeout";

        endGame(deathCause);

        return {
          ...levelUpdatedState,
          gameState: GameState.FINISHED,
          isActive: false,
        };
      }

      return levelUpdatedState;
    });

    engineUpdateRef.current = requestAnimationFrame(updatePhysicsEngine);
  }, []);

  const endGame = useCallback(
    (cause: "mistakes" | "escaped_circles" | "timeout" | "app_minimized") => {
      if (isGameEndingRef.current) {
        return;
      }

      isGameEndingRef.current = true;

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanupAllPendingActivations();
      }

      setGameState((prev) => {
        const finalState = updatePhysicsPositions(prev);
        const result = createPhysicsGameResult(finalState, cause as any);

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupPhysicsGame(finalState);

        return {
          ...finalState,
          gameState: GameState.FINISHED,
          isActive: false,
        };
      });
    },
    [handleSaveGameResult],
  );

  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    if (!currentState.isActive || currentState.gameState !== GameState.PLAYING)
      return;

    const gameTime = Date.now() - (currentState.gameStartTime || Date.now());
    const levelConfig = getPhysicsLevelConfig(gameTime);

    const delay =
      levelConfig.activationTimeMin +
      Math.random() *
        (levelConfig.activationTimeMax - levelConfig.activationTimeMin);

    const timeout = setTimeout(() => {
      if (
        gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING
      ) {
        setGameState((prev) => {
          const updatedState = updatePhysicsLevel(prev);
          const newState = activateRandomCircles(
            updatedState,
            (circleIds, decoyIds) => {
              if (shadowSecurityRef.current) {
                const timestamp = Date.now();

                circleIds.forEach((circleId) => {
                  const isWhiteCircle = !decoyIds.includes(circleId);

                  if (isWhiteCircle) {
                    shadowSecurityRef.current!.recordCircleActivation(
                      circleId,
                      timestamp,
                    );
                  }
                });
              }
            },
            (circleId, wasDecoy) => {
              if (shadowSecurityRef.current) {
                shadowSecurityRef.current.cleanupCircleActivation(circleId);
              }

              if (!wasDecoy) {
                setGameState((current) => {
                  const updatedStats = {
                    ...current.stats,
                    missedCircles: current.stats.missedCircles + 1,
                    currentMistakes: current.stats.currentMistakes + 1,
                  };

                  const newState = {
                    ...current,
                    stats: updatedStats,
                  };

                  return deactivatePhysicsCircle(newState, circleId);
                });
              } else {
                setGameState((current) =>
                  deactivatePhysicsCircle(current, circleId),
                );
              }

              scheduleNextActivation();
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

      const clickTime = Date.now();
      const { newState, result } = handlePhysicsCircleClick(
        gameStateRef.current,
        circleId,
        clickTime,
      );

      if (result === "correct") {
        if (shadowSecurityRef.current) {
          const clickedCircle = gameStateRef.current.circles.find(
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

        const stateWithImpulse = applyImpulse(gameStateRef.current, circleId);

        const finalState = deactivatePhysicsCircle(
          {
            ...newState,
            circles: stateWithImpulse.circles,
          },
          circleId,
        );

        setGameState(finalState);
      } else if (result === "decoy" || result === "wrong") {
        triggerHapticFeedback("error");

        const finalState = deactivatePhysicsCircle(newState, circleId);

        setGameState(finalState);
      }
    },
    [triggerHapticFeedback],
  );

  const startGame = useCallback(() => {
    isGameEndingRef.current = false;
    const initialState = initializePhysicsGameState();

    shadowSecurityRef.current = new ShadowSecurityManager(
      GameMode.PHYSICS,
      initialState.gameStartTime || Date.now(),
      {
        enabled: true,
        sensitivityThreshold: 1.0,
        suspiciousMovementThreshold: 70.0,
        maxCheckInterval: 3000,
        minCheckInterval: 3000,
        requirePermissionCheck: false,
      },
    );

    setGameState(initialState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setPlayAgainError(initialPlayAgainError);
    setIsPlayingAgain(false);

    setTimeout(() => {
      setShowCanvas(true);
    }, 100);

    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

      setTimeout(() => {
        updatePhysicsEngine();
      }, 100);

      setTimeout(() => {
        scheduleNextActivation();
      }, 1000);
    }, 800);
  }, [scheduleNextActivation, updatePhysicsEngine]);

  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) return;

    setIsPlayingAgain(true);

    try {
      const currentAttemptsStatus = await fetchAttemptsStatus(true);

      if (!currentAttemptsStatus || !currentAttemptsStatus.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.physics.playAgain.noAttempts"),
          redirecting: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      const consumeResult = await consumeAttempt();

      if (!consumeResult) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.physics.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      if (consumeResult.attemptsRemaining < 0) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.physics.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      startGame();
    } catch (error) {
      setPlayAgainError({
        show: true,
        message: t("game.modes.physics.playAgain.error"),
        redirecting: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, consumeAttempt, fetchAttemptsStatus, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupPhysicsGame(gameStateRef.current);
      if (engineUpdateRef.current) {
        cancelAnimationFrame(engineUpdateRef.current);
      }

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanup();
      }
    };
  }, []);

  const getDeathCauseIcon = (deathCause: string) => {
    switch (deathCause) {
      case "mistakes":
        return <AlertTriangle className="text-red-400" size={20} />;
      case "escaped_circles":
        return <TrendingDown className="text-orange-400" size={20} />;
      case "timeout":
        return <Clock className="text-yellow-400" size={20} />;
      case "app_minimized":
        return <EyeOff className="text-gray-400" size={20} />;
      default:
        return <Crosshair className="text-red-400" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      mistakes: "game.modes.physics.deathCauses.mistakes",
      escaped_circles: "game.modes.physics.deathCauses.escapedCircles",
      timeout: "game.modes.physics.deathCauses.timeout",
      app_minimized: "game.modes.physics.deathCauses.appMinimized",
    };

    const key = causeKeyMapping[deathCause as keyof typeof causeKeyMapping];

    return key ? t(key as any) : t("game.modes.physics.deathCauses.default");
  };

  const getCurrentLevelInfo = () => {
    const gameTime = gameState.stats.gameTime;
    const levelConfig = getPhysicsLevelConfig(gameTime);

    return {
      level: levelConfig.level,
      description: levelConfig.description,
      maxCircles: levelConfig.maxSimultaneousCircles,
      activeCircles: gameState.activeCircleIds.length,
    };
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚗️</div>

            <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2">
                {getDeathCauseIcon(gameResult.deathCause)}
                <span className="text-sm text-purple-300">
                  {getDeathCauseMessage(gameResult.deathCause)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-purple-400/60">
                {t("game.modes.physics.results.finalScore")}
              </div>
              <div className="text-6xl font-bold text-green-400">
                {Math.round(gameResult.finalScore)}
              </div>
              <div className="text-lg text-purple-300/80">
                {Math.round(gameResult.finalScore * 4)} (×4)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  {t("game.modes.physics.results.totalHits")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {gameResult.totalHits}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-purple-400/60">
                  {t("game.modes.physics.results.survivalTime")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatPhysicsTime(gameResult.survivalTime)}
                </div>
              </div>
            </div>

            <div className="text-center space-y-1 border-t border-purple-400/30 pt-4">
              <div className="text-xs text-purple-400/60">
                {t("game.modes.physics.results.levelsCompleted")}
              </div>
              <div className="text-xl font-bold text-yellow-400">
                {gameResult.maxLevelReached}/8
              </div>
            </div>
          </div>

          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess) && (
            <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-400/30 rounded-xl p-4">
              {saveStatus.isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-sm text-purple-300/80">
                      {saveStatus.showRetryDetails
                        ? t("save.retrying", {
                            attempt: saveStatus.attempt,
                            max: saveStatus.maxAttempts,
                          })
                        : t("save.recordingPhysics")}
                    </span>
                  </div>

                  {saveStatus.showRetryDetails && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <RotateCcw className="text-purple-400/60" size={14} />
                        <span className="text-xs text-purple-400/60">
                          {t("save.connectionIssue")}
                        </span>
                      </div>
                      <div className="w-full bg-purple-400/20 rounded-full h-1">
                        <div
                          className="bg-purple-400 h-1 rounded-full transition-all duration-300"
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
                      {t("save.physicsRecordedSuccessfully")}
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

          {playAgainError.show && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <AlertTriangle className="text-red-400" size={16} />
                  <span className="text-red-400 text-sm font-bold">
                    {t("game.modes.physics.playAgain.cannotPlay")}
                  </span>
                </div>
                <div className="text-red-300/80 text-xs mb-3">
                  {playAgainError.message}
                </div>
                {playAgainError.redirecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-xs">
                      {t("game.modes.physics.playAgain.redirecting")}
                    </span>
                  </div>
                ) : (
                  <div className="text-white/60 text-xs">
                    {t("game.modes.physics.playAgain.autoRedirect")}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              className={`w-full px-6 py-4 bg-transparent border-2 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                isPlayingAgain || playAgainError.show
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-purple-400/60 text-purple-300 hover:border-purple-400 hover:bg-purple-500/10 hover:scale-105 active:scale-95"
              }`}
              disabled={isPlayingAgain || playAgainError.show}
              onClick={handlePlayAgain}
            >
              {isPlayingAgain ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  <span>{t("game.modes.physics.playAgain.starting")}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  <span>{t("game.modes.physics.playAgain.button")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const levelInfo = getCurrentLevelInfo();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div
        className="flex-1 flex items-start justify-center"
        style={{ height: `calc(100vh - 140px)` }}
      >
        <PhysicsGameCanvas
          gameState={gameState}
          isGameActive={gameState.gameState === GameState.PLAYING}
          showCanvas={showCanvas}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-10 bg-black/95 backdrop-blur-sm border-t border-purple-400/30 safe-area-inset-bottom"
        style={{ height: "140px" }}
      >
        <div className="px-6 py-4 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="text-purple-400" size={18} />
              <span className="text-lg font-bold text-purple-400">
                {t("common.level")} {levelInfo.level}/8
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">
                {formatPhysicsTime(gameState.stats.gameTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}