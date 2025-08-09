// src/game-modes/survival/SurvivalGameManager.tsx - Updated with play again functionality

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  Crosshair,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
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
import { GameState } from "@/types/game-modes/common";
import {
  SurvivalGameState,
  SurvivalGameResult,
} from "@/types/game-modes/survival";
import GameGrid from "@/components/GameGrid";
import { useT } from "@/contexts/LocalizationContext";

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

const LEVEL_UPDATE_INTERVAL = 100; // Reduced from 16ms to 100ms for better performance

export default function SurvivalGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const {
    consumeAttempt,
    fetchAttemptsStatus,
  } = useAttempts(makeAuthenticatedRequest);
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<SurvivalGameState>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);
  const [playAgainError, setPlayAgainError] = useState<PlayAgainError>(initialPlayAgainError);
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  // State for instant deactivation tracking
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  // Refs for direct DOM text updates without React re-rendering
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const levelDisplayRef = useRef<HTMLSpanElement>(null);

  // Protection against multiple simultaneous operations
  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<SurvivalGameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Function to update display text directly in DOM without React re-rendering
  const updateDisplayText = useCallback((time: number, level: number) => {
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = formatSurvivalTime(time);
    }
    if (levelDisplayRef.current) {
      levelDisplayRef.current.textContent = `${t("common.level")} ${level}/15`;
    }
  }, [t]);

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
        setPlayAgainError(prev => ({ ...prev, redirecting: true }));
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

  const checkForNewBestScore = useCallback(
    (newScore: number) => {
      if (user && user.survival_best_score !== undefined) {
        const previousBest = user.survival_best_score || 0;
        const isNewBest = newScore > previousBest;

        setIsNewBestScore(isNewBest);
      }
    },
    [user],
  );

  const handleSaveGameResult = useCallback(
    async (result: SurvivalGameResult) => {
      setSaveStatus((prev) => ({
        ...prev,
        isLoading: true,
        attempt: 1,
        error: null,
        isSuccess: false,
        showRetryDetails: false,
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

  // Enhanced protected endGame function with multiple call prevention
  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      // Prevent multiple calls to endGame
      if (isGameEndingRef.current) {
        return;
      }

      isGameEndingRef.current = true;

      setGameState((prev) => {
        // Double-check that game isn't already ending
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
        }

        const finalGameState = {
          ...finalState,
          gameState: GameState.FINISHED,
          isActive: false,
          isGameEnding: true,
          stats: updatedStats,
        };

        const result = createSurvivalGameResult(finalGameState);

        checkForNewBestScore(result.score);

        setGameResult(result);
        handleSaveGameResult(result);
        cleanupSurvivalGame(finalGameState);

        return finalGameState;
      });
    },
    [handleSaveGameResult, checkForNewBestScore],
  );

  // Enhanced protected scheduleNextActivation with race condition prevention
  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    // Prevent multiple simultaneous scheduling calls
    if (isSchedulingActivationRef.current) {
      return;
    }

    // Enhanced state validation
    if (!currentState.isActive ||
      currentState.gameState !== GameState.PLAYING ||
      currentState.isGameEnding ||
      isGameEndingRef.current) {
      return;
    }

    isSchedulingActivationRef.current = true;

    const levelConfig = getLevelConfig(currentState.currentLevel);
    const delay =
      Math.random() *
      (levelConfig.activationTimeMax - levelConfig.activationTimeMin) +
      levelConfig.activationTimeMin;

    const timeout = setTimeout(() => {
      // Reset scheduling flag when timeout executes
      isSchedulingActivationRef.current = false;

      // Double-check game state when timeout fires
      if (!gameStateRef.current.isActive ||
        gameStateRef.current.gameState !== GameState.PLAYING ||
        gameStateRef.current.isGameEnding ||
        isGameEndingRef.current) {
        return;
      }

      setGameState((prev) => {
        // Triple-check state inside setState
        if (!prev.isActive || prev.gameState !== GameState.PLAYING || prev.isGameEnding) {
          return prev;
        }

        const newState = activateSurvivalCircles(
          prev,
          (circleIds, redCircleIds) => {
            const timestamp = Date.now();

            setActivatedCircles(circleIds);
            setLastActivationTimestamp(timestamp);

            setTimeout(() => {
              setActivatedCircles([]);
            }, 450);
          },
          (circleId, wasDecoy) => {
            // Check if game is ending before processing timeout
            if (isGameEndingRef.current || prev.isGameEnding) {
              return;
            }

            if (!wasDecoy) {
              endGame("miss");
            } else {
              setGameState((current) =>
                deactivateSurvivalCircle(current, circleId),
              );
              // Only schedule next activation if game is still active
              if (!isGameEndingRef.current && !gameStateRef.current.isGameEnding) {
                scheduleNextActivation();
              }
            }
          },
        );

        return newState;
      });

      // Schedule next activation only if game is still active
      if (gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING &&
        !gameStateRef.current.isGameEnding &&
        !isGameEndingRef.current) {
        scheduleNextActivation();
      }
    }, delay);

    setGameState((prev) => ({
      ...prev,
      activationTimeout: timeout,
    }));

    // Reset scheduling flag after timeout is set
    setTimeout(() => {
      isSchedulingActivationRef.current = false;
    }, 50);
  }, [endGame]);

  const handleCircleClickEvent = useCallback(
    (circleId: number) => {
      const currentState = gameStateRef.current;

      if (currentState.gameState !== GameState.PLAYING || isGameEndingRef.current) {
        return;
      }

      const clickTime = Date.now();
      const { newState, result } = handleSurvivalCircleClick(
        currentState,
        circleId,
        clickTime,
      );

      if (result === "correct") {
        triggerHapticFeedback("success");

        // Add circle to instant deactivation list
        setInstantlyDeactivatedCircles((prev) => [...prev, circleId]);

        // Immediately clear timeout and deactivate circle without animation
        const immediatelyDeactivatedState = deactivateSurvivalCircle(newState, circleId);
        setGameState(immediatelyDeactivatedState);

        // Remove from instant deactivation list after short delay
        setTimeout(() => {
          setInstantlyDeactivatedCircles((prev) => prev.filter(id => id !== circleId));
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

  const startGame = useCallback(() => {
    // Reset protection flags
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

    const newGameState = initializeSurvivalGameState();

    setGameState(newGameState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setPlayAgainError(initialPlayAgainError);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);
    setIsNewBestScore(false);
    setInstantlyDeactivatedCircles([]);
    setIsPlayingAgain(false);

    // Initialize display text
    updateDisplayText(0, 1);

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
          if (!current.isActive ||
            current.gameState !== GameState.PLAYING ||
            current.isGameEnding ||
            isGameEndingRef.current) {
            clearInterval(levelInterval);
            return current;
          }

          const updatedState = updateSurvivalLevel(current, Date.now());

          // Update display text directly without re-rendering React components
          updateDisplayText(updatedState.stats.survivalTime, updatedState.currentLevel);

          return updatedState;
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
  }, [scheduleNextActivation, updateDisplayText]);

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
          message: t("game.modes.survival.playAgain.noAttempts"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      // Consume attempt and verify the operation succeeded
      const consumeResult = await consumeAttempt();

      // Verify that the consume operation was successful
      if (!consumeResult) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      // Additional safety check: verify we have valid remaining attempts
      if (consumeResult.attemptsRemaining < 0) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      // All checks passed - start new game
      startGame();
    } catch (error) {
      console.error("Error starting new survival game:", error);
      setPlayAgainError({
        show: true,
        message: t("game.modes.survival.playAgain.error"),
        redirecting: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, consumeAttempt, fetchAttemptsStatus, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupSurvivalGame(gameStateRef.current);
    };
  }, []);

  const getDeathCauseIcon = (deathCause: string) => {
    switch (deathCause) {
      case "miss":
        return <Crosshair className="text-red-400" size={20} />;
      case "wrong_click":
        return <AlertTriangle className="text-red-400" size={20} />;
      case "decoy_hit":
        return <AlertTriangle className="text-red-400" size={20} />;
      default:
        return <Crosshair className="text-red-400" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      miss: "game.modes.survival.deathCauses.miss",
      wrong_click: "game.modes.survival.deathCauses.wrongClick",
      decoy_hit: "game.modes.survival.deathCauses.decoyHit",
      timeout: "game.modes.survival.deathCauses.default",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.survival.deathCauses.default");
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">💀</div>

            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2">
                {getDeathCauseIcon(gameResult.deathCause)}
                <span className="text-sm text-red-300">
                  {getDeathCauseMessage(gameResult.deathCause)}
                </span>
              </div>
            </div>

            {isNewBestScore && (
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 animate-pulse">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🏆</span>
                  <span className="text-sm text-green-300 font-bold">
                    {t("game.modes.newBestScore")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-red-400/60">
                {t("game.modes.survival.results.finalScore")}
              </div>
              <div className="text-6xl font-bold text-green-400">
                {gameResult.score}
              </div>
              <div className="text-lg text-red-300/80">
                {gameResult.score * 2} (×2)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-red-400/60">
                  {t("game.modes.survival.results.correctHits")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {gameResult.correctHits}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-red-400/60">
                  {t("game.modes.survival.results.survivalTime")}
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatSurvivalTime(gameResult.survivalTime)}
                </div>
              </div>
            </div>

            <div className="text-center space-y-1 border-t border-red-400/30 pt-4">
              <div className="text-xs text-red-400/60">
                {t("game.modes.survival.results.levelsCompleted")}
              </div>
              <div className="text-xl font-bold text-yellow-400">
                {gameResult.maxLevelReached}/15
              </div>
            </div>
          </div>

          {/* Save Status Display */}
          {(saveStatus.isLoading ||
            saveStatus.error ||
            saveStatus.isSuccess) && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                {saveStatus.isLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      <span className="text-sm text-red-300/80">
                        {saveStatus.showRetryDetails
                          ? t("save.retrying", {
                            attempt: saveStatus.attempt,
                            max: saveStatus.maxAttempts,
                          })
                          : t("save.recording")}
                      </span>
                    </div>

                    {saveStatus.showRetryDetails && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <RotateCcw className="text-red-400/60" size={14} />
                          <span className="text-xs text-red-400/60">
                            {t("save.connectionIssue")}
                          </span>
                        </div>
                        <div className="w-full bg-red-400/20 rounded-full h-1">
                          <div
                            className="bg-red-400 h-1 rounded-full transition-all duration-300"
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
                        {t("save.recordedSuccessfully")}
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

          {/* Play Again Error Display */}
          {playAgainError.show && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <AlertTriangle className="text-red-400" size={16} />
                  <span className="text-red-400 text-sm font-bold">
                    {t("game.modes.survival.playAgain.cannotPlay")}
                  </span>
                </div>
                <div className="text-red-300/80 text-xs mb-3">
                  {playAgainError.message}
                </div>
                {playAgainError.redirecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-xs">
                      {t("game.modes.survival.playAgain.redirecting")}
                    </span>
                  </div>
                ) : (
                  <div className="text-white/60 text-xs">
                    {t("game.modes.survival.playAgain.autoRedirect")}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              className={`w-full px-6 py-4 bg-transparent border-2 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${isPlayingAgain || playAgainError.show
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-red-400/60 text-red-300 hover:border-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95"
                }`}
              disabled={isPlayingAgain || playAgainError.show}
              onClick={handlePlayAgain}
            >
              {isPlayingAgain ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  <span>{t("game.modes.survival.playAgain.starting")}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  <span>{t("game.modes.survival.playAgain.button")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white relative">
      {/* Game area - full screen with proper container structure */}
      <div className="flex-1 flex items-center justify-center relative">
        <GameGrid
          circles={gameState.circles}
          gameMode="survival"
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
          instantlyDeactivatedCircles={instantlyDeactivatedCircles}
        />
      </div>

      {/* Fixed bottom overlay container with improved positioning */}
      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-50">
        <div className="flex justify-between items-end p-6 pb-8">
          {/* Level display - bottom left */}
          <div className="pointer-events-none flex-shrink-0">
            <span
              ref={levelDisplayRef}
              className="inline-block text-lg font-bold text-orange-400 drop-shadow-lg bg-black/20 px-2 py-1 rounded"
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                minWidth: '110px', // немного больше, чем было
                textAlign: 'left',
                display: 'inline-block',
              }}
            >
              {t("common.level")} 1/15
            </span>
          </div>

          {/* Time display - bottom right */}
          <div className="pointer-events-none flex-shrink-0">
            <span
              ref={timeDisplayRef}
              className="inline-block text-lg font-bold text-white drop-shadow-lg bg-black/20 px-2 py-1 rounded"
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                minWidth: '130px', // увеличено для самой длинной строки, например "59:59.999"
                textAlign: 'right',
                display: 'inline-block',
              }}
            >
              0.000s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}