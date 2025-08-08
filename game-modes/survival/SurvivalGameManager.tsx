// src/game-modes/survival/SurvivalGameManager.tsx - Fixed race conditions and multiple activations

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Crosshair,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  RotateCcw,
  ArrowLeft,
  Copy,
  FileText,
  ChevronDown,
  ChevronUp,
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

const initialSaveStatus: SaveStatus = {
  isLoading: false,
  attempt: 0,
  maxAttempts: 3,
  error: null,
  isSuccess: false,
  showRetryDetails: false,
};

const LEVEL_UPDATE_INTERVAL = 16; // ~60fps for smooth time updates

export default function SurvivalGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<SurvivalGameState>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  // State for instant deactivation tracking
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  // State for log export functionality
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [logCopyStatus, setLogCopyStatus] = useState<"idle" | "copying" | "copied" | "failed">("idle");

  // NEW: Protection against multiple simultaneous operations
  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<SurvivalGameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Setup Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        gameState.logger?.log('BACK_BUTTON_CLICKED', {
          fromTelegram: true
        }, 'SurvivalGameManager');
        router.push("/game");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => { });
      };
    }
  }, [router, gameState.logger]);

  // Auto-start game on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startGame();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const triggerHapticFeedback = useCallback((type: "success" | "error") => {
    gameStateRef.current.logger?.log('HAPTIC_FEEDBACK_TRIGGERED', {
      type,
      telegramAvailable: !!window.Telegram?.WebApp?.HapticFeedback
    }, 'SurvivalGameManager');

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

        gameStateRef.current.logger?.log('BEST_SCORE_CHECK', {
          newScore,
          previousBest,
          isNewBest,
          userHasPreviousScore: user.survival_best_score !== undefined
        }, 'SurvivalGameManager');

        setIsNewBestScore(isNewBest);
      }
    },
    [user],
  );

  const handleSaveGameResult = useCallback(
    async (result: SurvivalGameResult) => {
      gameStateRef.current.logger?.log('SAVE_GAME_RESULT_STARTED', {
        score: result.score,
        survivalTime: result.survivalTime,
        maxLevelReached: result.maxLevelReached
      }, 'SurvivalGameManager');

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

        gameStateRef.current.logger?.log('SAVE_ATTEMPT', {
          attemptNumber: attemptCount,
          maxAttempts: 3
        }, 'SurvivalGameManager');

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

          gameStateRef.current.logger?.log('SAVE_SUCCESS', {
            attemptNumber: attemptCount,
            responseData
          }, 'SurvivalGameManager');

          setSaveStatus((prev) => ({
            ...prev,
            isLoading: false,
            isSuccess: true,
            error: null,
          }));
        } catch (error) {
          gameStateRef.current.logger?.log('SAVE_ATTEMPT_FAILED', {
            attemptNumber: attemptCount,
            error: error?.toString(),
            willRetry: attemptCount < 3
          }, 'SurvivalGameManager');

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
        gameStateRef.current.logger?.log('SAVE_FINAL_FAILURE', {
          error: error?.toString(),
          totalAttempts: attemptCount - 1
        }, 'SurvivalGameManager');

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

  // ENHANCED: Protected endGame function with multiple call prevention
  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      // Prevent multiple calls to endGame
      if (isGameEndingRef.current) {
        gameStateRef.current.logger?.log('GAME_END_BLOCKED', {
          cause,
          reason: 'already_ending'
        }, 'SurvivalGameManager');
        return;
      }

      isGameEndingRef.current = true;

      gameStateRef.current.logger?.log('GAME_END_TRIGGERED', {
        cause,
        currentLevel: gameStateRef.current.currentLevel,
        survivalTime: gameStateRef.current.stats.survivalTime,
        correctHits: gameStateRef.current.stats.correctHits
      }, 'SurvivalGameManager');

      setGameState((prev) => {
        // Double-check that game isn't already ending
        if (prev.isGameEnding) {
          prev.logger?.log('GAME_END_DUPLICATE_PREVENTED', {
            cause
          }, 'SurvivalGameManager');
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

  // ENHANCED: Protected scheduleNextActivation with race condition prevention
  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    // Prevent multiple simultaneous scheduling calls
    if (isSchedulingActivationRef.current) {
      currentState.logger?.log('ACTIVATION_SCHEDULING_BLOCKED', {
        reason: 'already_scheduling'
      }, 'SurvivalGameManager');
      return;
    }

    // Enhanced state validation
    if (!currentState.isActive ||
      currentState.gameState !== GameState.PLAYING ||
      currentState.isGameEnding ||
      isGameEndingRef.current) {
      currentState.logger?.log('ACTIVATION_SCHEDULING_SKIPPED', {
        isActive: currentState.isActive,
        gameState: currentState.gameState,
        isGameEnding: currentState.isGameEnding,
        isGameEndingRef: isGameEndingRef.current
      }, 'SurvivalGameManager');
      return;
    }

    isSchedulingActivationRef.current = true;

    const levelConfig = getLevelConfig(currentState.currentLevel, currentState.logger);
    const delay =
      Math.random() *
      (levelConfig.activationTimeMax - levelConfig.activationTimeMin) +
      levelConfig.activationTimeMin;

    currentState.logger?.log('NEXT_ACTIVATION_SCHEDULED', {
      delay,
      levelConfig: {
        activationTimeMin: levelConfig.activationTimeMin,
        activationTimeMax: levelConfig.activationTimeMax
      }
    }, 'SurvivalGameManager');

    const timeout = setTimeout(() => {
      // Reset scheduling flag when timeout executes
      isSchedulingActivationRef.current = false;

      // Double-check game state when timeout fires
      if (!gameStateRef.current.isActive ||
        gameStateRef.current.gameState !== GameState.PLAYING ||
        gameStateRef.current.isGameEnding ||
        isGameEndingRef.current) {
        gameStateRef.current.logger?.log('ACTIVATION_TIMEOUT_CANCELLED', {
          reason: 'invalid_game_state',
          isActive: gameStateRef.current.isActive,
          gameState: gameStateRef.current.gameState,
          isGameEnding: gameStateRef.current.isGameEnding
        }, 'SurvivalGameManager');
        return;
      }

      setGameState((prev) => {
        // Triple-check state inside setState
        if (!prev.isActive || prev.gameState !== GameState.PLAYING || prev.isGameEnding) {
          prev.logger?.log('ACTIVATION_CANCELLED_IN_SETSTATE', {
            reason: 'invalid_state'
          }, 'SurvivalGameManager');
          return prev;
        }

        const newState = activateSurvivalCircles(
          prev,
          (circleIds, redCircleIds) => {
            const timestamp = Date.now();

            prev.logger?.log('CIRCLES_ACTIVATION_CALLBACK', {
              circleIds,
              redCircleIds,
              timestamp
            }, 'SurvivalGameManager');

            setActivatedCircles(circleIds);
            setLastActivationTimestamp(timestamp);

            setTimeout(() => {
              setActivatedCircles([]);
            }, 450);
          },
          (circleId, wasDecoy) => {
            prev.logger?.log('CIRCLE_TIMEOUT_CALLBACK', {
              circleId,
              wasDecoy,
              willEndGame: !wasDecoy,
              isGameEnding: isGameEndingRef.current
            }, 'SurvivalGameManager');

            // Check if game is ending before processing timeout
            if (isGameEndingRef.current || prev.isGameEnding) {
              prev.logger?.log('CIRCLE_TIMEOUT_IGNORED', {
                circleId,
                reason: 'game_ending'
              }, 'SurvivalGameManager');
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
        currentState.logger?.log('CIRCLE_CLICK_IGNORED', {
          circleId,
          gameState: currentState.gameState,
          isGameEnding: isGameEndingRef.current,
          reason: 'game_not_playing_or_ending'
        }, 'SurvivalGameManager');
        return;
      }

      const clickTime = Date.now();
      const { newState, result } = handleSurvivalCircleClick(
        currentState,
        circleId,
        clickTime,
      );

      currentState.logger?.log('CIRCLE_CLICK_PROCESSED', {
        circleId,
        result,
        clickTime,
        gameTime: clickTime - (currentState.gameStartTime || clickTime)
      }, 'SurvivalGameManager');

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

    newGameState.logger?.log('GAME_START_REQUESTED', {
      timestamp: Date.now()
    }, 'SurvivalGameManager');

    setGameState(newGameState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);
    setIsNewBestScore(false);
    setInstantlyDeactivatedCircles([]);
    setIsLogVisible(false);
    setLogCopyStatus("idle");

    setTimeout(() => {
      setShowCircles(true);
      newGameState.logger?.log('CIRCLES_SHOWN', {}, 'SurvivalGameManager');
    }, 100);

    setTimeout(() => {
      setGameState((prev) => {
        const updatedState = { ...prev, gameState: GameState.PLAYING };
        updatedState.logger?.log('GAME_STARTED', {
          gameState: GameState.PLAYING
        }, 'SurvivalGameManager');
        return updatedState;
      });

      const levelInterval = setInterval(() => {
        setGameState((current) => {
          if (!current.isActive ||
            current.gameState !== GameState.PLAYING ||
            current.isGameEnding ||
            isGameEndingRef.current) {
            clearInterval(levelInterval);
            current.logger?.log('LEVEL_UPDATE_INTERVAL_STOPPED', {
              reason: 'game_not_active_or_playing',
              isActive: current.isActive,
              gameState: current.gameState,
              isGameEnding: current.isGameEnding
            }, 'SurvivalGameManager');
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
  }, [scheduleNextActivation]);

  const handleBackToGames = useCallback(() => {
    gameState.logger?.log('BACK_TO_GAMES_CLICKED', {}, 'SurvivalGameManager');
    router.push("/game");
  }, [router, gameState.logger]);

  const handleLogExport = useCallback(async () => {
    if (!gameResult?.gameLog) return;

    setLogCopyStatus("copying");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(gameResult.gameLog);
        setLogCopyStatus("copied");
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = gameResult.gameLog;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          setLogCopyStatus("copied");
        } catch (error) {
          setLogCopyStatus("failed");
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      setLogCopyStatus("failed");
    }

    // Reset status after 2 seconds
    setTimeout(() => {
      setLogCopyStatus("idle");
    }, 2000);
  }, [gameResult?.gameLog]);

  useEffect(() => {
    return () => {
      cleanupSurvivalGame(gameStateRef.current);
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

  const getCopyButtonText = () => {
    switch (logCopyStatus) {
      case "copying":
        return "Copying...";
      case "copied":
        return "Copied!";
      case "failed":
        return "Copy Failed";
      default:
        return "Copy Debug Log";
    }
  };

  if (gameState.gameState === GameState.FINISHED && gameResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">💀</div>

            <h1 className="text-4xl font-bold text-red-400">
              {t("game.modes.survival.results.title")}
            </h1>

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

          {/* Debug Log Section */}
          {gameResult.gameLog && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4 space-y-3">
              <button
                onClick={() => setIsLogVisible(!isLogVisible)}
                className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <FileText size={16} />
                  <span className="text-sm font-medium">Debug Log ({gameResult.gameLog.split('\n').length - 4} events)</span>
                </div>
                {isLogVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isLogVisible && (
                <div className="space-y-3">
                  <div className="bg-black/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {gameResult.gameLog}
                    </pre>
                  </div>

                  <button
                    onClick={handleLogExport}
                    disabled={logCopyStatus === "copying"}
                    className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm transition-all duration-200 ${logCopyStatus === "copied"
                      ? "bg-green-600/20 border border-green-500/30 text-green-300"
                      : logCopyStatus === "failed"
                        ? "bg-red-600/20 border border-red-500/30 text-red-300"
                        : "bg-gray-600/20 border border-gray-500/30 text-gray-300 hover:bg-gray-600/30"
                      }`}
                  >
                    <Copy size={14} />
                    <span>{getCopyButtonText()}</span>
                  </button>
                </div>
              )}
            </div>
          )}

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
                        {t("shop.saveFailed", {
                          attempts: saveStatus.maxAttempts,
                        })}
                      </span>
                    </div>
                    <div className="text-red-400/60 text-xs mb-3">
                      {t("shop.recordedLocally")}
                    </div>
                    <button
                      className="px-3 py-1 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                      onClick={() => handleSaveGameResult(gameResult)}
                    >
                      {t("shop.retrySave")}
                    </button>
                  </div>
                )}
              </div>
            )}

          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-red-400/60 text-red-300 rounded-xl text-lg hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
              onClick={handleBackToGames}
            >
              <ArrowLeft size={20} />
              <span>{t("game.modes.buttonBack")}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      <div className="flex-1 flex items-center justify-center">
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

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-red-400/30 safe-area-inset-bottom">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="text-orange-400" size={18} />
              <span className="text-lg font-bold text-orange-400">
                {t("common.level")} {gameState.currentLevel}/15
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="text-white" size={18} />
              <span className="text-lg font-bold text-white">
                {formatSurvivalTime(gameState.stats.survivalTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}