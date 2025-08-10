// src/game-modes/survival/SurvivalGameManager.tsx - Enhanced with comprehensive debug panel for security testing

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  Crosshair,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Eye,
  EyeOff,
  Smartphone,
  MousePointer,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Bug,
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

interface SecurityDebugInfo {
  clickMonitoring: boolean;
  gyroscopeMonitoring: boolean;
  gyroscopeError: string | null;
  totalClicks: number;
  suspiciousClicks: number;
  gyroscopeChecks: number;
  gyroscopeMovements: number;
}

interface DetailedSecurityDebugInfo {
  // ShadowSecurityManager internal state
  shadowManagerEnabled: boolean;
  gameMode: string;
  gameStartTime: number;
  suspiciousThreshold: number;
  
  // Click monitoring details
  clickRecords: Array<{
    circleId: number;
    activationTime: number;
    clickTime: number;
    reactionTime: number;
    isSuspicious: boolean;
  }>;
  
  // Gyroscope monitoring details
  gyroscopeConfig: {
    enabled: boolean;
    sensitivityThreshold: number;
    suspiciousMovementThreshold: number;
    maxCheckInterval: number;
    minCheckInterval: number;
    requirePermissionCheck: boolean;
  };
  
  gyroscopeState: {
    enabled: boolean;
    permissionGranted: boolean;
    dataAvailable: boolean;
    errorReason: string | null;
    checkIntervals: number[];
    movementRecords: Array<{
      timestamp: number;
      alpha: number | null;
      beta: number | null;
      gamma: number | null;
      movementDetected: boolean;
      sensitivityThreshold: number;
    }>;
    lastCheckTime: number;
    nextCheckTime: number;
    minimumSensitivity: number;
  };
  
  // Generated suspicious activity data
  suspiciousActivityData: any | null;
  suspiciousActivityDataGenerated: boolean;
  
  // API response details
  apiRequestSent: boolean;
  apiResponse: {
    success: boolean;
    status: number;
    error?: string;
    responseBody?: any;
  } | null;
  
  // Validation details
  validationResults: {
    hasSuspiciousClicks: boolean;
    hasSuspiciousGyroscope: boolean;
    hasGyroscopeUnavailability: boolean;
    shouldSubmit: boolean;
    reason: string;
  } | null;
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

const initialSecurityDebugInfo: SecurityDebugInfo = {
  clickMonitoring: false,
  gyroscopeMonitoring: false,
  gyroscopeError: null,
  totalClicks: 0,
  suspiciousClicks: 0,
  gyroscopeChecks: 0,
  gyroscopeMovements: 0,
};

const initialDetailedDebugInfo: DetailedSecurityDebugInfo = {
  shadowManagerEnabled: false,
  gameMode: "",
  gameStartTime: 0,
  suspiciousThreshold: 0,
  clickRecords: [],
  gyroscopeConfig: {
    enabled: false,
    sensitivityThreshold: 0,
    suspiciousMovementThreshold: 0,
    maxCheckInterval: 0,
    minCheckInterval: 0,
    requirePermissionCheck: false,
  },
  gyroscopeState: {
    enabled: false,
    permissionGranted: false,
    dataAvailable: false,
    errorReason: null,
    checkIntervals: [],
    movementRecords: [],
    lastCheckTime: 0,
    nextCheckTime: 0,
    minimumSensitivity: 0,
  },
  suspiciousActivityData: null,
  suspiciousActivityDataGenerated: false,
  apiRequestSent: false,
  apiResponse: null,
  validationResults: null,
};

const LEVEL_UPDATE_INTERVAL = 200;
const DEBUG_UPDATE_INTERVAL = 1000; // Update debug info every second

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

  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [showDetailedDebug, setShowDetailedDebug] = useState(false);
  const [securityDebugInfo, setSecurityDebugInfo] = useState<SecurityDebugInfo>(initialSecurityDebugInfo);
  const [detailedDebugInfo, setDetailedDebugInfo] = useState<DetailedSecurityDebugInfo>(initialDetailedDebugInfo);

  const [activatedCircles, setActivatedCircles] = useState<number[]>([]);
  const [lastActivationTimestamp, setLastActivationTimestamp] = useState<number>(0);
  const [instantlyDeactivatedCircles, setInstantlyDeactivatedCircles] = useState<number[]>([]);

  const isSchedulingActivationRef = useRef(false);
  const isGameEndingRef = useRef(false);
  const gameStateRef = useRef<SurvivalGameState>(gameState);
  const shadowSecurityRef = useRef<ShadowSecurityManager | null>(null);
  const debugUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        setPlayAgainError(prev => ({ ...prev, redirecting: true }));
        setTimeout(() => {
          router.push("/game");
        }, 500);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [playAgainError.show, playAgainError.redirecting, router]);

  // Debug info update effect
  useEffect(() => {
    if (gameState.gameState === GameState.PLAYING && shadowSecurityRef.current) {
      debugUpdateIntervalRef.current = setInterval(() => {
        if (shadowSecurityRef.current) {
          const status = shadowSecurityRef.current.getMonitoringStatus();
          setSecurityDebugInfo({
            clickMonitoring: status.clickMonitoring,
            gyroscopeMonitoring: status.gyroscopeMonitoring,
            gyroscopeError: status.gyroscopeError,
            totalClicks: status.totalClicks,
            suspiciousClicks: status.suspiciousClicks,
            gyroscopeChecks: status.gyroscopeChecks,
            gyroscopeMovements: status.gyroscopeMovements,
          });
          
          // Update detailed debug info
          updateDetailedDebugInfo();
        }
      }, DEBUG_UPDATE_INTERVAL);
    } else {
      if (debugUpdateIntervalRef.current) {
        clearInterval(debugUpdateIntervalRef.current);
        debugUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (debugUpdateIntervalRef.current) {
        clearInterval(debugUpdateIntervalRef.current);
        debugUpdateIntervalRef.current = null;
      }
    };
  }, [gameState.gameState]);

  const updateDetailedDebugInfo = useCallback(() => {
    if (!shadowSecurityRef.current) return;

    // Extract detailed information from ShadowSecurityManager
    const detailedStatus = shadowSecurityRef.current.getDetailedStatus();
    
    setDetailedDebugInfo(prev => ({
      ...prev,
      shadowManagerEnabled: detailedStatus.isEnabled,
      gameMode: detailedStatus.gameMode,
      gameStartTime: detailedStatus.gameStartTime,
      suspiciousThreshold: detailedStatus.suspiciousThreshold,
      clickRecords: detailedStatus.clickRecords,
      gyroscopeConfig: detailedStatus.gyroscopeConfig,
      gyroscopeState: detailedStatus.gyroscopeState,
    }));
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

      const processSuspiciousActivity = async () => {
        if (!shadowSecurityRef.current || !user) {
          setDetailedDebugInfo(prev => ({
            ...prev,
            suspiciousActivityDataGenerated: false,
            suspiciousActivityData: null,
            apiRequestSent: false,
            validationResults: {
              hasSuspiciousClicks: false,
              hasSuspiciousGyroscope: false,
              hasGyroscopeUnavailability: false,
              shouldSubmit: false,
              reason: "ShadowSecurityManager or user not available"
            }
          }));
          return;
        }

        try {
          console.log("=== SECURITY DEBUG: Starting suspicious activity processing ===");
          
          const suspiciousActivityData = shadowSecurityRef.current.generateSuspiciousActivityData(
            user.telegram_id,
            Date.now()
          );

          console.log("=== SECURITY DEBUG: Generated suspicious activity data ===", suspiciousActivityData);

          setDetailedDebugInfo(prev => ({
            ...prev,
            suspiciousActivityData,
            suspiciousActivityDataGenerated: suspiciousActivityData !== null,
          }));

          if (suspiciousActivityData) {
            // Perform validation logic similar to API
            const hasSuspiciousClicks = suspiciousActivityData.suspiciousClicksCount > 0;
            const hasSuspiciousGyroscope = suspiciousActivityData.gyroscopeEnabled && suspiciousActivityData.gyroscopeSuspicious;
            const hasGyroscopeUnavailability = !suspiciousActivityData.gyroscopeEnabled && 
                                              suspiciousActivityData.gyroscopeErrorReason !== null &&
                                              suspiciousActivityData.gyroscopeErrorReason !== "ios_optimization_disabled";

            const shouldSubmit = hasSuspiciousClicks || hasSuspiciousGyroscope || hasGyroscopeUnavailability;
            
            let reason = "";
            if (!shouldSubmit) {
              reason = "No suspicious activity detected - neither suspicious clicks, suspicious gyroscope activity, nor gyroscope unavailability found";
            } else {
              const reasons = [];
              if (hasSuspiciousClicks) reasons.push("suspicious clicks detected");
              if (hasSuspiciousGyroscope) reasons.push("suspicious gyroscope activity");
              if (hasGyroscopeUnavailability) reasons.push("gyroscope unavailability");
              reason = `Should submit: ${reasons.join(", ")}`;
            }

            setDetailedDebugInfo(prev => ({
              ...prev,
              validationResults: {
                hasSuspiciousClicks,
                hasSuspiciousGyroscope,
                hasGyroscopeUnavailability,
                shouldSubmit,
                reason
              }
            }));

            console.log("=== SECURITY DEBUG: Validation results ===", {
              hasSuspiciousClicks,
              hasSuspiciousGyroscope,
              hasGyroscopeUnavailability,
              shouldSubmit,
              reason,
              gyroscopeEnabled: suspiciousActivityData.gyroscopeEnabled,
              gyroscopeSuspicious: suspiciousActivityData.gyroscopeSuspicious,
              gyroscopeMovementPercentage: suspiciousActivityData.gyroscopeMovementPercentage,
              suspiciousClicksCount: suspiciousActivityData.suspiciousClicksCount,
              totalClicks: suspiciousActivityData.totalClicks
            });

            const suspiciousActivityResponse = await makeAuthenticatedRequest(
              "/api/security/suspicious-activity",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ suspiciousActivity: suspiciousActivityData }),
              }
            );

            setDetailedDebugInfo(prev => ({
              ...prev,
              apiRequestSent: true,
            }));

            let responseBody = null;
            try {
              responseBody = await suspiciousActivityResponse.json();
            } catch (e) {
              responseBody = { error: "Failed to parse response JSON" };
            }

            console.log("=== SECURITY DEBUG: API Response ===", {
              status: suspiciousActivityResponse.status,
              ok: suspiciousActivityResponse.ok,
              responseBody
            });

            setDetailedDebugInfo(prev => ({
              ...prev,
              apiResponse: {
                success: suspiciousActivityResponse.ok,
                status: suspiciousActivityResponse.status,
                error: !suspiciousActivityResponse.ok ? (responseBody?.error || "Unknown error") : undefined,
                responseBody
              }
            }));

            if (!suspiciousActivityResponse.ok) {
              const errorData = responseBody || {};
              console.warn("=== SECURITY DEBUG: API request failed ===", {
                status: suspiciousActivityResponse.status,
                error: errorData.error,
                responseBody: errorData
              });
            } else {
              console.log("=== SECURITY DEBUG: API request successful ===");
            }
          } else {
            console.log("=== SECURITY DEBUG: No suspicious activity data generated ===");
            setDetailedDebugInfo(prev => ({
              ...prev,
              validationResults: {
                hasSuspiciousClicks: false,
                hasSuspiciousGyroscope: false,
                hasGyroscopeUnavailability: false,
                shouldSubmit: false,
                reason: "ShadowSecurityManager returned null - no suspicious activity detected"
              }
            }));
          }
        } catch (error) {
          console.error("=== SECURITY DEBUG: Error processing suspicious activity ===", error);
          setDetailedDebugInfo(prev => ({
            ...prev,
            apiResponse: {
              success: false,
              status: 0,
              error: error instanceof Error ? error.message : "Unknown error",
              responseBody: null
            }
          }));
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

      // Stop debug updates
      if (debugUpdateIntervalRef.current) {
        clearInterval(debugUpdateIntervalRef.current);
        debugUpdateIntervalRef.current = null;
      }

      // Final debug info update
      updateDetailedDebugInfo();

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
    [handleSaveGameResult, checkForNewBestScore, updateDetailedDebugInfo],
  );

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

      setGameState((prev) => {
        if (!prev.isActive || prev.gameState !== GameState.PLAYING || prev.isGameEnding) {
          return prev;
        }

        const newState = activateSurvivalCircles(
          prev,
          (circleIds, redCircleIds) => {
            const timestamp = Date.now();

            if (shadowSecurityRef.current) {
              circleIds.forEach(circleId => {
                const isWhiteCircle = !redCircleIds.includes(circleId);
                if (isWhiteCircle) {
                  shadowSecurityRef.current!.recordCircleActivation(circleId, timestamp);
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
        if (shadowSecurityRef.current) {
          const clickedCircle = currentState.circles.find(c => c.id === circleId);
          if (clickedCircle && clickedCircle.isActive && !clickedCircle.isDecoy) {
            shadowSecurityRef.current.recordCircleClick(circleId, clickTime);
          }
        }

        triggerHapticFeedback("success");

        setInstantlyDeactivatedCircles((prev) => [...prev, circleId]);

        const immediatelyDeactivatedState = deactivateSurvivalCircle(newState, circleId);
        setGameState(immediatelyDeactivatedState);

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
    isGameEndingRef.current = false;
    isSchedulingActivationRef.current = false;

    const newGameState = initializeSurvivalGameState();

    shadowSecurityRef.current = new ShadowSecurityManager(
      GameMode.SURVIVAL,
      newGameState.gameStartTime,
      {
        enabled: true,
        sensitivityThreshold: 1.0,
        suspiciousMovementThreshold: 80.0,
        maxCheckInterval: 3000,
        minCheckInterval: 3000,
        requirePermissionCheck: false
      }
    );

    setGameState(newGameState);
    setGameResult(null);
    setSaveStatus(initialSaveStatus);
    setPlayAgainError(initialPlayAgainError);
    setActivatedCircles([]);
    setLastActivationTimestamp(0);
    setIsNewBestScore(false);
    setInstantlyDeactivatedCircles([]);
    setIsPlayingAgain(false);
    setSecurityDebugInfo(initialSecurityDebugInfo);
    setDetailedDebugInfo(initialDetailedDebugInfo);

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

  const handlePlayAgain = useCallback(async () => {
    if (isPlayingAgain) return;

    setIsPlayingAgain(true);

    try {
      const currentAttemptsStatus = await fetchAttemptsStatus(true);

      if (!currentAttemptsStatus || !currentAttemptsStatus.canPlay) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.noAttempts"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      const consumeResult = await consumeAttempt();

      if (!consumeResult) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      if (consumeResult.attemptsRemaining < 0) {
        setPlayAgainError({
          show: true,
          message: t("game.modes.survival.playAgain.failedToConsume"),
          redirecting: false,
        });
        setIsPlayingAgain(false);
        return;
      }

      startGame();
    } catch (error) {
      setPlayAgainError({
        show: true,
        message: t("game.modes.survival.playAgain.error"),
        redirecting: false,
      });
      setIsPlayingAgain(false);
    }
  }, [isPlayingAgain, consumeAttempt, fetchAttemptsStatus, startGame, t]);

  const copyDebugInfo = useCallback(() => {
    const debugData = {
      timestamp: new Date().toISOString(),
      gameResult,
      securityDebugInfo,
      detailedDebugInfo,
      userAgent: window?.navigator?.userAgent,
      screenSize: {
        width: window?.screen?.width,
        height: window?.screen?.height,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const debugText = JSON.stringify(debugData, null, 2);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(debugText).then(() => {
        alert("Debug information copied to clipboard!");
      }).catch(() => {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = debugText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Debug information copied to clipboard!");
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = debugText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Debug information copied to clipboard!");
    }
  }, [gameResult, securityDebugInfo, detailedDebugInfo]);

  const downloadDebugInfo = useCallback(() => {
    const debugData = {
      timestamp: new Date().toISOString(),
      gameResult,
      securityDebugInfo,
      detailedDebugInfo,
      userAgent: window?.navigator?.userAgent,
      screenSize: {
        width: window?.screen?.width,
        height: window?.screen?.height,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const debugText = JSON.stringify(debugData, null, 2);
    const blob = new Blob([debugText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [gameResult, securityDebugInfo, detailedDebugInfo]);

  useEffect(() => {
    return () => {
      cleanupSurvivalGame(gameStateRef.current);

      if (shadowSecurityRef.current) {
        shadowSecurityRef.current.cleanup();
      }

      if (debugUpdateIntervalRef.current) {
        clearInterval(debugUpdateIntervalRef.current);
      }
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

  const renderDebugPanel = () => {
    if (!showDebugPanel || gameState.gameState !== GameState.PLAYING) {
      return null;
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/20 p-3 text-xs font-mono z-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400 font-bold">DEBUG: Security Monitor</span>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <EyeOff size={14} />
            </button>
            <button
              onClick={() => setShowDetailedDebug(!showDetailedDebug)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Bug size={14} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Click Monitoring */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <MousePointer size={12} className="text-blue-400" />
              <span className="text-white/80">Click Monitor</span>
              {securityDebugInfo.clickMonitoring ? (
                <CheckCircle size={12} className="text-green-400" />
              ) : (
                <AlertCircle size={12} className="text-red-400" />
              )}
            </div>
            <div className="text-white/60 ml-6">
              <div>Total: {securityDebugInfo.totalClicks}</div>
              <div>Suspicious: {securityDebugInfo.suspiciousClicks}</div>
            </div>
          </div>

          {/* Gyroscope Monitoring */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Smartphone size={12} className="text-purple-400" />
              <span className="text-white/80">Gyroscope</span>
              {securityDebugInfo.gyroscopeMonitoring ? (
                <CheckCircle size={12} className="text-green-400" />
              ) : (
                <AlertCircle size={12} className="text-red-400" />
              )}
            </div>
            <div className="text-white/60 ml-6">
              <div>Checks: {securityDebugInfo.gyroscopeChecks}</div>
              <div>Movements: {securityDebugInfo.gyroscopeMovements}</div>
              {securityDebugInfo.gyroscopeError && (
                <div className="text-red-400 text-xs mt-1">
                  Error: {securityDebugInfo.gyroscopeError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Movement Percentage */}
        {securityDebugInfo.gyroscopeChecks > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Movement Rate:</span>
              <span className={`font-bold ${
                (securityDebugInfo.gyroscopeMovements / securityDebugInfo.gyroscopeChecks) * 100 < 80
                  ? 'text-red-400' 
                  : 'text-green-400'
              }`}>
                {((securityDebugInfo.gyroscopeMovements / securityDebugInfo.gyroscopeChecks) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Detailed Debug Panel */}
        {showDetailedDebug && (
          <div className="mt-3 pt-3 border-t border-white/20 max-h-32 overflow-y-auto">
            <div className="text-white/80 text-xs space-y-1">
              <div>Gyro Config: {JSON.stringify(detailedDebugInfo.gyroscopeConfig)}</div>
              <div>Gyro State: enabled={detailedDebugInfo.gyroscopeState.enabled}, error={detailedDebugInfo.gyroscopeState.errorReason}</div>
              <div>Validation: {detailedDebugInfo.validationResults?.reason || "Not validated yet"}</div>
              <div>API: sent={detailedDebugInfo.apiRequestSent ? "YES" : "NO"}, status={detailedDebugInfo.apiResponse?.status || "N/A"}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDebugToggle = () => {
    if (showDebugPanel || gameState.gameState !== GameState.PLAYING) {
      return null;
    }

    return (
      <button
        onClick={() => setShowDebugPanel(true)}
        className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-2 text-white/60 hover:text-white transition-colors z-40"
      >
        <Eye size={16} />
      </button>
    );
  };

  const renderDetailedDebugInfo = () => {
    if (gameState.gameState !== GameState.FINISHED || !gameResult) {
      return null;
    }

    return (
      <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-blue-400">Security Debug Information</h3>
          <div className="flex space-x-2">
            <button
              onClick={copyDebugInfo}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded text-sm hover:bg-blue-500/30 transition-colors"
            >
              <Copy size={14} />
              <span>Copy</span>
            </button>
            <button
              onClick={downloadDebugInfo}
              className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 border border-green-400/30 text-green-300 rounded text-sm hover:bg-green-500/30 transition-colors"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {/* Gyroscope Summary */}
          <div className="bg-black/30 rounded p-3">
            <h4 className="text-blue-300 font-bold mb-2">Gyroscope Summary</h4>
            <div className="space-y-1 text-white/80">
              <div>Enabled: {detailedDebugInfo.gyroscopeState.enabled ? "YES" : "NO"}</div>
              <div>Permission Granted: {detailedDebugInfo.gyroscopeState.permissionGranted ? "YES" : "NO"}</div>
              <div>Data Available: {detailedDebugInfo.gyroscopeState.dataAvailable ? "YES" : "NO"}</div>
              <div>Error: {detailedDebugInfo.gyroscopeState.errorReason || "None"}</div>
              <div>Checks: {detailedDebugInfo.gyroscopeState.movementRecords.length}</div>
              <div>Movements: {detailedDebugInfo.gyroscopeState.movementRecords.filter(r => r.movementDetected).length}</div>
              {detailedDebugInfo.gyroscopeState.movementRecords.length > 0 && (
                <div>Movement %: {(
                  (detailedDebugInfo.gyroscopeState.movementRecords.filter(r => r.movementDetected).length / 
                   detailedDebugInfo.gyroscopeState.movementRecords.length) * 100
                ).toFixed(1)}%</div>
              )}
              <div>Sensitivity: {detailedDebugInfo.gyroscopeState.minimumSensitivity}°</div>
              <div>Suspicious Threshold: {detailedDebugInfo.gyroscopeConfig.suspiciousMovementThreshold}%</div>
            </div>
          </div>

          {/* Validation Results */}
          {detailedDebugInfo.validationResults && (
            <div className="bg-black/30 rounded p-3">
              <h4 className="text-yellow-300 font-bold mb-2">Validation Results</h4>
              <div className="space-y-1 text-white/80">
                <div>Suspicious Clicks: {detailedDebugInfo.validationResults.hasSuspiciousClicks ? "YES" : "NO"}</div>
                <div>Suspicious Gyroscope: {detailedDebugInfo.validationResults.hasSuspiciousGyroscope ? "YES" : "NO"}</div>
                <div>Gyroscope Unavailable: {detailedDebugInfo.validationResults.hasGyroscopeUnavailability ? "YES" : "NO"}</div>
                <div>Should Submit: {detailedDebugInfo.validationResults.shouldSubmit ? "YES" : "NO"}</div>
                <div className="text-yellow-300">Reason: {detailedDebugInfo.validationResults.reason}</div>
              </div>
            </div>
          )}

          {/* API Response */}
          {detailedDebugInfo.apiResponse && (
            <div className="bg-black/30 rounded p-3">
              <h4 className="text-purple-300 font-bold mb-2">API Response</h4>
              <div className="space-y-1 text-white/80">
                <div>Request Sent: {detailedDebugInfo.apiRequestSent ? "YES" : "NO"}</div>
                <div>Status: {detailedDebugInfo.apiResponse.status}</div>
                <div>Success: {detailedDebugInfo.apiResponse.success ? "YES" : "NO"}</div>
                {detailedDebugInfo.apiResponse.error && (
                  <div className="text-red-400">Error: {detailedDebugInfo.apiResponse.error}</div>
                )}
              </div>
            </div>
          )}

          {/* Suspicious Activity Data */}
          {detailedDebugInfo.suspiciousActivityData && (
            <div className="bg-black/30 rounded p-3">
              <h4 className="text-green-300 font-bold mb-2">Generated Activity Data</h4>
              <div className="space-y-1 text-white/80 text-xs">
                <div>Gyroscope Enabled: {detailedDebugInfo.suspiciousActivityData.gyroscopeEnabled ? "YES" : "NO"}</div>
                <div>Gyroscope Suspicious: {detailedDebugInfo.suspiciousActivityData.gyroscopeSuspicious ? "YES" : "NO"}</div>
                <div>Movement %: {detailedDebugInfo.suspiciousActivityData.gyroscopeMovementPercentage}%</div>
                <div>Total Checks: {detailedDebugInfo.suspiciousActivityData.totalGyroscopeChecks}</div>
                <div>Movements Detected: {detailedDebugInfo.suspiciousActivityData.gyroscopeMovementsDetected}</div>
                <div>Click Records: {detailedDebugInfo.suspiciousActivityData.totalClicks}</div>
                <div>Suspicious Clicks: {detailedDebugInfo.suspiciousActivityData.suspiciousClicksCount}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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

          {/* Detailed Debug Information */}
          {renderDetailedDebugInfo()}

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
      {gameState.gameState === GameState.PLAYING && (
        <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex justify-center pt-8">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold text-white font-mono">
                {formatSurvivalTime(gameState.stats.survivalTime)}
              </span>
            </div>
          </div>
        </div>
      )}

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

      {/* Debug Panel */}
      {renderDebugPanel()}
      
      {/* Debug Toggle Button */}
      {renderDebugToggle()}
    </div>
  );
}