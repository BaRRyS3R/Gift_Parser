// src/game-modes/survival/SurvivalGameManager.tsx - Версия с полным логированием игрового процесса

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
  FileText,
  Copy,
  Eye,
  EyeOff,
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
  handleCircleTimeout,
  scheduleActivation,
  SurvivalGameStateWithLogger,
} from "./SurvivalGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { LogEventType } from "@/types/game-logging";
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

// Компонент для отображения логов игры
interface GameLogViewerProps {
  gameState: SurvivalGameStateWithLogger;
  gameResult: SurvivalGameResult | null;
}

function GameLogViewer({ gameState, gameResult }: GameLogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const t = useT();

  const handleCopyLog = async () => {
    try {
      const logExport = gameState.logger.exportLog();
      const logText = `=== CIRCUSLE SURVIVAL MODE DEBUG LOG ===
Session ID: ${logExport.sessionId}
Start Time: ${logExport.startTime}
End Time: ${logExport.endTime}
Total Duration: ${logExport.totalDuration}ms (${(logExport.totalDuration / 1000).toFixed(3)}s)

=== GAME SUMMARY ===
Total Events: ${logExport.summary.totalEvents}
Circles Activated: ${logExport.summary.circlesActivated}
Circles Clicked Correctly: ${logExport.summary.circlesClickedCorrectly}
Circles Timed Out: ${logExport.summary.circlesTimedOut}
Average Reaction Time: ${logExport.summary.averageReactionTime.toFixed(3)}ms
Level Changes: ${logExport.summary.levelChanges}
Errors: ${logExport.summary.errors}

${gameResult ? `=== FINAL RESULTS ===
Final Score: ${gameResult.score}
Max Level Reached: ${gameResult.maxLevelReached}
Survival Time: ${gameResult.survivalTime}ms
Death Cause: ${gameResult.deathCause}
Correct Hits: ${gameResult.correctHits}
Perfect Streak: ${gameResult.perfectStreak}

` : ''}=== DETAILED EVENT LOG ===
${gameState.logger.getFormattedLog()}

=== END OF LOG ===`;

      await navigator.clipboard.writeText(logText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy log to clipboard:", error);
    }
  };

  const logSummary = gameState.logger.exportLog().summary;

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="text-gray-400" size={18} />
          <h3 className="text-sm font-bold text-gray-300">
            {t("debug.gameLog")}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded text-xs hover:bg-blue-600/30 transition-colors flex items-center space-x-1"
            onClick={handleCopyLog}
          >
            <Copy size={12} />
            <span>{copySuccess ? t("debug.copied") : t("debug.copyLog")}</span>
          </button>
          <button
            className="px-3 py-1 bg-gray-600/20 border border-gray-500/40 text-gray-400 rounded text-xs hover:bg-gray-600/30 transition-colors flex items-center space-x-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{isExpanded ? t("debug.hide") : t("debug.show")}</span>
          </button>
        </div>
      </div>

      {/* Краткая сводка всегда видна */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center space-y-1">
          <div className="text-gray-500">{t("debug.events")}</div>
          <div className="text-white font-bold">{logSummary.totalEvents}</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-gray-500">{t("debug.activated")}</div>
          <div className="text-green-400 font-bold">{logSummary.circlesActivated}</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-gray-500">{t("debug.avgReaction")}</div>
          <div className="text-yellow-400 font-bold">
            {logSummary.averageReactionTime.toFixed(0)}ms
          </div>
        </div>
      </div>

      {/* Развернутый лог */}
      {isExpanded && (
        <div className="space-y-3">
          <div className="border-t border-gray-600/30 pt-3">
            <h4 className="text-xs font-bold text-gray-400 mb-2">
              {t("debug.recentEvents")} ({gameState.logger.entries.length})
            </h4>
            <div className="bg-black/40 rounded p-2 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                {gameState.logger.entries
                  .slice(-20) // Показываем последние 20 событий
                  .map((entry, index) => {
                    const timeStr = (entry.relativeTime / 1000).toFixed(3).padStart(8);
                    const typeStr = entry.type.padEnd(20);
                    let dataStr = JSON.stringify(entry.data);
                    
                    // Укорачиваем длинные строки
                    if (dataStr.length > 100) {
                      dataStr = dataStr.substring(0, 97) + "...";
                    }
                    
                    return `[${timeStr}s] ${typeStr} ${dataStr}`;
                  })
                  .join('\n')}
              </pre>
            </div>
          </div>

          {logSummary.errors > 0 && (
            <div className="border-t border-red-600/30 pt-3">
              <h4 className="text-xs font-bold text-red-400 mb-2">
                {t("debug.errors")} ({logSummary.errors})
              </h4>
              <div className="bg-red-900/20 border border-red-600/30 rounded p-2">
                <div className="text-xs text-red-300">
                  {gameState.logger.entries
                    .filter(entry => entry.type === LogEventType.ERROR_OCCURRED)
                    .slice(-3) // Показываем последние 3 ошибки
                    .map((entry, index) => (
                      <div key={index} className="mb-1">
                        [{(entry.relativeTime / 1000).toFixed(3)}s] {JSON.stringify(entry.data)}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {copySuccess && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-1 px-2 py-1 bg-green-600/20 border border-green-500/40 text-green-400 rounded text-xs">
            <span>✓</span>
            <span>{t("debug.logCopied")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SurvivalGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const router = useRouter();
  const t = useT();

  const [gameState, setGameState] = useState<SurvivalGameStateWithLogger>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // State for activation pulse effects
  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);

  const gameStateRef = useRef<SurvivalGameStateWithLogger>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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
        setIsNewBestScore(newScore > previousBest);
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

  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      setGameState((prev) => {
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

  const scheduleNextActivation = useCallback(() => {
    const currentState = gameStateRef.current;

    if (!currentState.isActive || currentState.gameState !== GameState.PLAYING)
      return;

    const levelConfig = getLevelConfig(currentState.currentLevel);
    const delay =
      Math.random() *
        (levelConfig.activationTimeMax - levelConfig.activationTimeMin) +
      levelConfig.activationTimeMin;

    // Логируем запланированную активацию
    const updatedState = scheduleActivation(currentState, delay);
    setGameState(updatedState);

    const timeout = setTimeout(() => {
      if (
        gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING
      ) {
        setGameState((prev) => {
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
              if (!wasDecoy) {
                endGame("miss");
              } else {
                setGameState((current) => {
                  const timeoutState = handleCircleTimeout(current, circleId, wasDecoy);
                  return deactivateSurvivalCircle(timeoutState, circleId, "timeout");
                });
                scheduleNextActivation();
              }
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
      const { newState, result } = handleSurvivalCircleClick(
        gameStateRef.current,
        circleId,
        clickTime,
      );

      if (result === "correct") {
        triggerHapticFeedback("success");
        
        // Мгновенная деактивация без анимации
        const deactivatedState = deactivateSurvivalCircle(newState, circleId, "clicked");
        setGameState(deactivatedState);
        
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
    setGameState(initializeSurvivalGameState());
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);
    setIsNewBestScore(false);

    setTimeout(() => {
      setShowCircles(true);
    }, 100);

    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

      const levelInterval = setInterval(() => {
        setGameState((current) => {
          if (!current.isActive || current.gameState !== GameState.PLAYING) {
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
  }, [scheduleNextActivation]);

  const handleBackToGames = useCallback(() => {
    router.push("/game");
  }, [router]);

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

          {/* Компонент просмотра логов */}
          <GameLogViewer gameState={gameState} gameResult={gameResult} />

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