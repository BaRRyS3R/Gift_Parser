// src/game-modes/survival/SurvivalGameManager.tsx - Fully optimized version

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import React from "react";

import {
  Crosshair,
  AlertTriangle,
  Zap,
  Clock,
  Target,
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

// Memoized GameGrid to prevent unnecessary re-renders
const MemoizedGameGrid = React.memo(GameGrid);

export default function SurvivalGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const router = useRouter();
  const t = useT();

  // Split state: static game data and dynamic UI data
  const [gameLogicState, setGameLogicState] = useState<SurvivalGameState>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // Stable state for GameGrid props - only updates when circles actually change
  const [stableCircles, setStableCircles] = useState(gameLogicState.circles);
  const [stableIsGameActive, setStableIsGameActive] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  // Refs for direct DOM updates and stable callbacks
  const levelElementRef = useRef<HTMLSpanElement>(null);
  const timeElementRef = useRef<HTMLSpanElement>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout>();

  // Stable refs to prevent callback recreation
  const gameStateRef = useRef<SurvivalGameState>(gameLogicState);
  const stableCallbacksRef = useRef({
    onCircleClick: null as ((circleId: number) => void) | null,
    triggerHapticFeedback: null as ((type: "success" | "error") => void) | null,
    endGame: null as ((cause: "miss" | "wrong_click" | "decoy_hit") => void) | null,
  });

  // Protection flags
  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameLogicState;
  }, [gameLogicState]);

  // Update stable circles only when they actually change
  useEffect(() => {
    if (JSON.stringify(stableCircles) !== JSON.stringify(gameLogicState.circles)) {
      setStableCircles(gameLogicState.circles);
    }
  }, [gameLogicState.circles, stableCircles]);

  // Update stable game active state only when it changes
  useEffect(() => {
    const isActive = gameLogicState.gameState === GameState.PLAYING;
    if (stableIsGameActive !== isActive) {
      setStableIsGameActive(isActive);
    }
  }, [gameLogicState.gameState, stableIsGameActive]);

  // Direct DOM update functions
  const updateTimeDisplay = useCallback((survivalTime: number) => {
    if (timeElementRef.current) {
      timeElementRef.current.textContent = formatSurvivalTime(survivalTime);
    }
  }, []);

  const updateLevelDisplay = useCallback((level: number) => {
    if (levelElementRef.current) {
      levelElementRef.current.textContent = `${t("common.level")} ${level}/15`;
    }
  }, [t]);

  // Time updates with direct DOM manipulation
  const startTimeUpdates = useCallback((gameStartTime: number) => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const survivalTime = currentTime - gameStartTime;
      updateTimeDisplay(survivalTime);
    }, 50);
  }, [updateTimeDisplay]);

  const stopTimeUpdates = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = undefined;
    }
  }, []);

  // Update level display when level changes
  useEffect(() => {
    updateLevelDisplay(gameLogicState.currentLevel);
  }, [gameLogicState.currentLevel, updateLevelDisplay]);

  // Stable haptic feedback function
  const triggerHapticFeedback = useCallback((type: "success" | "error") => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.HapticFeedback
    ) {
      const haptic = window.Telegram.WebApp.HapticFeedback;
      haptic.notificationOccurred(type);
    }
  }, []);

  // Store stable callback in ref
  useEffect(() => {
    stableCallbacksRef.current.triggerHapticFeedback = triggerHapticFeedback;
  }, [triggerHapticFeedback]);

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

  // Stable endGame function
  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      if (isGameEndingRef.current) {
        return;
      }

      isGameEndingRef.current = true;
      stopTimeUpdates();

      setGameLogicState((prev) => {
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
    [handleSaveGameResult, checkForNewBestScore, stopTimeUpdates],
  );

  // Store stable callback in ref
  useEffect(() => {
    stableCallbacksRef.current.endGame = endGame;
  }, [endGame]);

  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    if (isSchedulingActivationRef.current) {
      return;
    }

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
      isSchedulingActivationRef.current = false;

      if (!gameStateRef.current.isActive ||
        gameStateRef.current.gameState !== GameState.PLAYING ||
        gameStateRef.current.isGameEnding ||
        isGameEndingRef.current) {
        return;
      }

      setGameLogicState((prev) => {
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
            if (isGameEndingRef.current || prev.isGameEnding) {
              return;
            }

            if (!wasDecoy) {
              stableCallbacksRef.current.endGame?.("miss");
            } else {
              setGameLogicState((current) =>
                deactivateSurvivalCircle(current, circleId),
              );
              if (!isGameEndingRef.current && !gameStateRef.current.isGameEnding) {
                scheduleNextActivation();
              }
            }
          },
        );

        return newState;
      });

      if (gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING &&
        !gameStateRef.current.isGameEnding &&
        !isGameEndingRef.current) {
        scheduleNextActivation();
      }
    }, delay);

    setGameLogicState((prev) => ({
      ...prev,
      activationTimeout: timeout,
    }));

    setTimeout(() => {
      isSchedulingActivationRef.current = false;
    }, 50);
  }, []);

  // Stable circle click handler
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
        stableCallbacksRef.current.triggerHapticFeedback?.("success");

        setInstantlyDeactivatedCircles((prev) => [...prev, circleId]);

        const immediatelyDeactivatedState = deactivateSurvivalCircle(newState, circleId);
        setGameLogicState(immediatelyDeactivatedState);

        setTimeout(() => {
          setInstantlyDeactivatedCircles((prev) => prev.filter(id => id !== circleId));
        }, 100);
      } else if (result === "decoy") {
        stableCallbacksRef.current.triggerHapticFeedback?.("error");
        stableCallbacksRef.current.endGame?.("decoy_hit");
      } else {
        stableCallbacksRef.current.triggerHapticFeedback?.("error");
        stableCallbacksRef.current.endGame?.("wrong_click");
      }
    },
    [],
  );

  // Store stable callback in ref
  useEffect(() => {
    stableCallbacksRef.current.onCircleClick = handleCircleClickEvent;
  }, [handleCircleClickEvent]);

  const startGame = useCallback(() => {
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

    const newGameState = initializeSurvivalGameState();

    setGameLogicState(newGameState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);
    setIsNewBestScore(false);
    setInstantlyDeactivatedCircles([]);

    setTimeout(() => {
      setShowCircles(true);
    }, 100);

    setTimeout(() => {
      setGameLogicState((prev) => {
        const updatedState = { ...prev, gameState: GameState.PLAYING };
        startTimeUpdates(updatedState.gameStartTime);
        return updatedState;
      });

      // Separate interval for level progression that doesn't affect circles
      const levelInterval = setInterval(() => {
        setGameLogicState((current) => {
          if (!current.isActive ||
            current.gameState !== GameState.PLAYING ||
            current.isGameEnding ||
            isGameEndingRef.current) {
            clearInterval(levelInterval);
            return current;
          }

          // Only update level-related data, not circles
          const updatedState = updateSurvivalLevel(current, Date.now());

          // Preserve circles array reference if it hasn't changed
          if (JSON.stringify(updatedState.circles) === JSON.stringify(current.circles)) {
            return {
              ...updatedState,
              circles: current.circles, // Keep same reference
            };
          }

          return updatedState;
        });
      }, 200); // Reduced frequency for level updates

      setTimeout(() => {
        scheduleNextActivation();
      }, 1000);

      setGameLogicState((prev) => ({
        ...prev,
        levelUpdateInterval: levelInterval,
      }));
    }, 800);
  }, [scheduleNextActivation, startTimeUpdates]);

  const handleBackToGames = useCallback(() => {
    router.push("/game");
  }, [router]);

  // Memoized props for GameGrid to prevent unnecessary re-renders
  const gameGridProps = useMemo(() => ({
    circles: stableCircles,
    gameMode: "survival" as const,
    isGameActive: stableIsGameActive,
    lastActivationTimestamp,
    showCircles,
    onActivatedCircles: activatedCircles,
    onCircleClick: stableCallbacksRef.current.onCircleClick || (() => { }),
    instantlyDeactivatedCircles,
  }), [
    stableCircles,
    stableIsGameActive,
    lastActivationTimestamp,
    showCircles,
    activatedCircles,
    instantlyDeactivatedCircles,
  ]);

  // Setup effects
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

  useEffect(() => {
    const timer = setTimeout(() => {
      startGame();
    }, 500);

    return () => clearTimeout(timer);
  }, [startGame]);

  useEffect(() => {
    return () => {
      cleanupSurvivalGame(gameStateRef.current);
      stopTimeUpdates();
    };
  }, [stopTimeUpdates]);

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

  if (gameLogicState.gameState === GameState.FINISHED && gameResult) {
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
        <MemoizedGameGrid {...gameGridProps} />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t border-red-400/30 safe-area-inset-bottom game-panel-stable"
        style={{ height: "100px" }}
      >
        <div className="px-6 py-4 game-panel-content">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 game-panel-item">
              <Zap className="text-orange-400" size={18} />
              <span
                ref={levelElementRef}
                className="text-lg font-bold text-orange-400 game-level-display"
              >
                {t("common.level")} {gameLogicState.currentLevel}/15
              </span>
            </div>

            <div className="flex items-center space-x-2 game-panel-item">
              <Clock className="text-white" size={18} />
              <span
                ref={timeElementRef}
                className="text-lg font-bold text-white game-time-display"
              >
                0.000s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}