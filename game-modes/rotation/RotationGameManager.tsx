// src/game-modes/rotation/RotationGameManager.tsx - Исправленная версия с логикой защиты от Survival Mode

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  Target,
  RotateCw,
  Bug,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Activity,
  MousePointer,
  Timer,
  Layers,
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
import { GameState, GameMode } from "@/types/game-modes/common";
import {
  RotationGameState,
  RotationGameResult,
  GameDebugLog,
  CircleActivationLog,
  CircleClickLog,
  CircleDeactivationLog,
} from "@/types/game-modes/rotation";
import RotatingCircleGrid from "@/components/RotatingCircleGrid";
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

const LEVEL_UPDATE_INTERVAL = 100;

// Debug log formatting utilities
const formatLogTime = (timestamp: number, gameStartTime: number): string => {
  const gameTime = timestamp - gameStartTime;
  return `${(gameTime / 1000).toFixed(3)}s`;
};

const formatLogEntry = (
  type: string,
  entry: any,
  gameStartTime: number
): string => {
  const time = formatLogTime(entry.timestamp, gameStartTime);
  switch (type) {
    case "activation":
      const activation = entry as CircleActivationLog;
      return `[${time}] ACTIVATE Circle${activation.circleId} (${activation.isDecoy ? "RED" : "WHITE"}) Level${activation.level} Position(${activation.position.x.toFixed(1)},${activation.position.y.toFixed(1)}) Duration:${((activation.scheduledDeactivationTime - activation.timestamp) / 1000).toFixed(1)}s`;

    case "click":
      const click = entry as CircleClickLog;
      const reactionStr = click.reactionTime ? ` Reaction:${click.reactionTime}ms` : "";
      const debounceStr = click.debounceBlocked ? " [DEBOUNCED]" : "";
      return `[${time}] CLICK Circle${click.circleId} Result:${click.clickResult.toUpperCase()} Active:${click.circleWasActive} Decoy:${click.circleWasDecoy} Anim:${click.circleWasAnimating}${reactionStr}${debounceStr}`;

    case "deactivation":
      const deactivation = entry as CircleDeactivationLog;
      return `[${time}] DEACTIVATE Circle${deactivation.circleId} Reason:${deactivation.reason.toUpperCase()} WasActive:${deactivation.wasActive} WasDecoy:${deactivation.wasDecoy}`;

    default:
      return `[${time}] ${type.toUpperCase()}: ${JSON.stringify(entry)}`;
  }
};

const generateDebugReport = (debugLog: GameDebugLog, gameStartTime: number): string => {
  const report: string[] = [];

  report.push("=== ROTATION GAME DEBUG LOG ===");
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Game Start: ${new Date(gameStartTime).toISOString()}`);
  report.push("");

  report.push("=== SUMMARY ===");
  report.push(`Total Activations: ${debugLog.activations.length}`);
  report.push(`Total Clicks: ${debugLog.clicks.length}`);
  report.push(`Total Deactivations: ${debugLog.deactivations.length}`);
  report.push(`Level Transitions: ${debugLog.levelTransitions.length}`);
  report.push(`Errors: ${debugLog.errors.length}`);
  report.push("");

  if (debugLog.errors.length > 0) {
    report.push("=== ERRORS ===");
    debugLog.errors.forEach(error => {
      report.push(`[${formatLogTime(error.timestamp, gameStartTime)}] ERROR: ${error.error}`);
      report.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
    });
    report.push("");
  }

  const allEvents: Array<{ timestamp: number; type: string; entry: any }> = [];

  debugLog.activations.forEach(entry =>
    allEvents.push({ timestamp: entry.timestamp, type: "activation", entry }));
  debugLog.clicks.forEach(entry =>
    allEvents.push({ timestamp: entry.timestamp, type: "click", entry }));
  debugLog.deactivations.forEach(entry =>
    allEvents.push({ timestamp: entry.timestamp, type: "deactivation", entry }));
  debugLog.levelTransitions.forEach(entry =>
    allEvents.push({ timestamp: entry.timestamp, type: "level_transition", entry }));

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  report.push("=== CHRONOLOGICAL EVENT LOG ===");
  allEvents.forEach(event => {
    report.push(formatLogEntry(event.type, event.entry, gameStartTime));
  });

  report.push("");
  report.push("=== DETAILED ANALYSIS ===");

  const reactionTimes = debugLog.clicks
    .filter(click => click.reactionTime && click.clickResult === "correct")
    .map(click => click.reactionTime!);

  if (reactionTimes.length > 0) {
    const avgReaction = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const minReaction = Math.min(...reactionTimes);
    const maxReaction = Math.max(...reactionTimes);

    report.push(`Reaction Times: Avg:${avgReaction.toFixed(1)}ms Min:${minReaction}ms Max:${maxReaction}ms`);
  }

  const totalClicks = debugLog.clicks.length;
  const correctClicks = debugLog.clicks.filter(c => c.clickResult === "correct").length;
  const accuracy = totalClicks > 0 ? (correctClicks / totalClicks * 100).toFixed(1) : "0";
  report.push(`Click Accuracy: ${correctClicks}/${totalClicks} (${accuracy}%)`);

  const debouncedClicks = debugLog.clicks.filter(c => c.debounceBlocked).length;
  if (debouncedClicks > 0) {
    report.push(`Debounced Clicks: ${debouncedClicks}`);
  }

  return report.join("\n");
};

export default function RotationGameManager() {
  const { makeAuthenticatedRequest, user } = useUser();
  const { consumeAttempt, fetchAttemptsStatus } = useAttempts(
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

  // Debug UI states
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [debugLogExpanded, setDebugLogExpanded] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] =
    useState<number>(0);

  // Состояние для визуального эффекта мгновенно деактивированных кругов (аналогично Survival)
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] =
    useState<number[]>([]);

  // State management refs
  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<RotationGameState>(gameState);
  const shadowSecurityRef = useRef<ShadowSecurityManager | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

  const copyDebugLog = useCallback(async () => {
    if (!gameResult) return;

    try {
      const debugReport = generateDebugReport(
        gameResult.debugLog,
        gameResult.createdAt ? new Date(gameResult.createdAt).getTime() - gameResult.survivalTime : Date.now()
      );

      await navigator.clipboard.writeText(debugReport);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    } catch (error) {
      console.error("Failed to copy debug log:", error);
    }
  }, [gameResult]);

  const handleSaveGameResult = useCallback(
    async (result: RotationGameResult) => {
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

          const response = await makeAuthenticatedRequest("/api/game/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
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
    [makeAuthenticatedRequest, t, user],
  );

  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
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
        }

        const finalGameState = {
          ...finalState,
          gameState: GameState.FINISHED,
          isActive: false,
          isGameEnding: true,
          stats: updatedStats,
        };

        const result = createRotationGameResult(finalGameState);

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
                deactivateRotationCircle(current, circleId, "timeout"),
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

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Упрощенная обработка кликов по образцу Survival Mode
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

        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Немедленная визуальная деактивация как в Survival Mode
        setInstantlyDeactivatedCircles((prev) => [...prev, circleId]);

        const immediatelyDeactivatedState = deactivateRotationCircle(
          newState,
          circleId,
          "correct_click"
        );

        setGameState(immediatelyDeactivatedState);

        // Визуальный эффект убираем через короткое время
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

  const startGame = useCallback(() => {
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

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
    setShowDebugLog(false);
    setDebugLogExpanded(false);
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
  }, [scheduleNextActivation]);

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
        });
        setIsPlayingAgain(false);

        return;
      }

      const consumeResult = await consumeAttempt();

      if (!consumeResult) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.rotation.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      if (consumeResult.attemptsRemaining < 0) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.rotation.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);

        return;
      }

      startGame();
    } catch (error) {
      setPlayAgainError({
        show: true,
        message: t("game.modes.rotation.playAgain.error"),
        redirecting: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, consumeAttempt, fetchAttemptsStatus, startGame, t]);

  useEffect(() => {
    return () => {
      cleanupRotationGame(gameStateRef.current);

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanup();
      }
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
        return <RotateCw className="text-red-400" size={20} />;
    }
  };

  const getDeathCauseMessage = (deathCause: string) => {
    const causeKeyMapping = {
      miss: "game.modes.rotation.deathCauses.miss",
      wrong_click: "game.modes.rotation.deathCauses.wrongClick",
      decoy_hit: "game.modes.rotation.deathCauses.decoyHit",
      timeout: "game.modes.rotation.deathCauses.default",
    };

    const key =
      causeKeyMapping[deathCause as keyof typeof causeKeyMapping] ||
      causeKeyMapping.timeout;

    return t(key as any) || t("game.modes.rotation.deathCauses.default");
  };

  const renderDebugLogSection = () => {
    if (!gameResult || !showDebugLog) return null;

    const { debugLog } = gameResult;
    const gameStartTime = new Date(gameResult.createdAt).getTime() - gameResult.survivalTime;

    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bug className="text-blue-400" size={18} />
            <span className="text-blue-400 font-bold">Debug Log</span>
            {debugLog.errors.length > 0 && (
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                {debugLog.errors.length} errors
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyDebugLog}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded text-xs hover:bg-blue-500/30 transition-colors"
            >
              <Copy size={12} />
              <span>{copiedLog ? "Copied!" : "Copy Log"}</span>
            </button>
            <button
              onClick={() => setDebugLogExpanded(!debugLogExpanded)}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-500/20 border border-gray-400/30 text-gray-300 rounded text-xs hover:bg-gray-500/30 transition-colors"
            >
              {debugLogExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{debugLogExpanded ? "Collapse" : "Expand"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Activity className="text-green-400" size={14} />
              <span className="text-green-400">Activations: {debugLog.activations.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MousePointer className="text-blue-400" size={14} />
              <span className="text-blue-400">Clicks: {debugLog.clicks.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Timer className="text-yellow-400" size={14} />
              <span className="text-yellow-400">Avg Reaction: {gameResult.averageReactionTime.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center space-x-2">
              <Layers className="text-purple-400" size={14} />
              <span className="text-purple-400">Errors: {debugLog.errors.length}</span>
            </div>
          </div>
        </div>

        {debugLogExpanded && (
          <div className="space-y-3">
            {debugLog.errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                <div className="text-red-400 font-bold text-xs mb-2">Errors ({debugLog.errors.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {debugLog.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-red-300 text-xs font-mono">
                      [{formatLogTime(error.timestamp, gameStartTime)}] {error.error}
                    </div>
                  ))}
                  {debugLog.errors.length > 10 && (
                    <div className="text-red-400/60 text-xs">
                      ... and {debugLog.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3">
              <div className="text-gray-300 font-bold text-xs mb-2">Recent Events (Last 20)</div>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {(() => {
                  const allEvents: Array<{ timestamp: number; type: string; entry: any }> = [];

                  debugLog.activations.forEach(entry =>
                    allEvents.push({ timestamp: entry.timestamp, type: "activation", entry }));
                  debugLog.clicks.forEach(entry =>
                    allEvents.push({ timestamp: entry.timestamp, type: "click", entry }));
                  debugLog.deactivations.forEach(entry =>
                    allEvents.push({ timestamp: entry.timestamp, type: "deactivation", entry }));

                  return allEvents
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 20)
                    .map((event, index) => (
                      <div key={index} className="text-gray-300 text-xs font-mono">
                        {formatLogEntry(event.type, event.entry, gameStartTime)}
                      </div>
                    ));
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                <div className="text-green-400 font-bold text-xs mb-2">Click Accuracy</div>
                <div className="text-green-300 text-xs">
                  {debugLog.clicks.filter(c => c.clickResult === "correct").length} / {debugLog.clicks.length}
                  {debugLog.clicks.length > 0 && (
                    <span className="text-green-400">
                      {" "}({((debugLog.clicks.filter(c => c.clickResult === "correct").length / debugLog.clicks.length) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                <div className="text-blue-400 font-bold text-xs mb-2">Reaction Times</div>
                <div className="text-blue-300 text-xs">
                  {(() => {
                    const reactionTimes = debugLog.clicks
                      .filter(click => click.reactionTime && click.clickResult === "correct")
                      .map(click => click.reactionTime!);

                    if (reactionTimes.length === 0) return "No data";

                    const min = Math.min(...reactionTimes);
                    const max = Math.max(...reactionTimes);

                    return `${min}ms - ${max}ms`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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

            <div className="border-t border-orange-400/30 pt-4">
              <button
                onClick={() => setShowDebugLog(!showDebugLog)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-orange-500/10 border border-orange-400/30 text-orange-300 rounded text-sm hover:bg-orange-500/20 transition-colors"
              >
                {showDebugLog ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showDebugLog ? "Hide Debug Info" : "Show Debug Info"}</span>
              </button>
            </div>
          </div>

          {renderDebugLogSection()}

          {(saveStatus.isLoading ||
            saveStatus.error ||
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
              className={`w-full px-6 py-4 bg-transparent border-2 text-lg rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${isPlayingAgain || playAgainError.show
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-orange-400/60 text-orange-300 hover:border-orange-400 hover:bg-orange-500/10 hover:scale-105 active:scale-95"
                }`}
              disabled={isPlayingAgain || playAgainError.show}
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
          isGameActive={gameState.gameState === GameState.PLAYING}
          lastActivationTimestamp={lastActivationTimestamp}
          radius={gameState.config.radius}
          rotationSpeed={gameState.currentRotationSpeed}
          showCircles={showCircles}
          onActivatedCircles={activatedCircles}
          onCircleClick={handleCircleClickEvent}
          instantlyDeactivatedCircles={instantlyDeactivatedCircles}
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