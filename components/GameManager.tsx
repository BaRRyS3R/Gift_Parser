// src/components/GameManager.tsx - Complete file with updated layout for Precision Mode

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, AlertTriangle } from "lucide-react";

import GameGrid from "./GameGrid";
import GameTimer from "./GameTimer";
import GameResults from "./GameResults";

import {
  Circle,
  GameStats,
  GameDifficulty,
  GameState,
  GameResult,
  AdaptiveState,
  PrecisionModeState,
} from "@/types/game";
import {
  GAME_CONFIGS,
  createCircleGrid,
  getRandomActivationDelay,
  calculateProgressiveWrongPenalty,
  calculateDecoyPenalty,
  calculateFastClickBonus,
  updateAdaptiveState,
  shouldCreateDecoy,
  getAdjustedCircleActiveTime,
  calculateScoreMultiplier,
  getAdaptiveLevelDescription,
  // Precision Mode functions
  initializePrecisionModeState,
  updatePrecisionModeState,
  getPrecisionLevelConfig,
  getPrecisionSimultaneousCircles,
  getPrecisionRedCircles,
  getPrecisionDescription,
  calculatePrecisionModeScore,
  getPrecisionModeDeathCause,
} from "@/utils/gameUtils";
import { useUser } from "@/hooks/useUser";

interface GameManagerProps {
  difficulty: GameDifficulty;
  onBackToMenu: () => void;
}

const STANDARD_GAME_DURATION = 30;
const PRECISION_MODE_UPDATE_INTERVAL = 100;

export default function GameManager({
  difficulty,
  onBackToMenu,
}: GameManagerProps) {
  const config = GAME_CONFIGS[difficulty];
  const { saveGameResult } = useUser();
  const isPrecisionMode = config.isPrecisionMode || false;

  const [circles, setCircles] = useState<Circle[]>(() =>
    createCircleGrid(config.circleCount),
  );
  const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED);
  const [timeLeft, setTimeLeft] = useState(STANDARD_GAME_DURATION);
  const [showCircles, setShowCircles] = useState(false);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    correctHits: 0,
    wrongHits: 0,
    missedCircles: 0,
    totalCircles: 0,
    decoyHits: 0,
    consecutiveHits: 0,
    consecutiveMisses: 0,
    fastHits: 0,
    totalReactionTime: 0,
    hitCount: 0,
    currentIntensityLevel: isPrecisionMode ? 1 : undefined,
    survivalTime: isPrecisionMode ? 0 : undefined,
    perfectStreak: isPrecisionMode ? 0 : undefined,
  });

  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
    level: 0,
    activationSpeedMultiplier: 1,
    simultaneousMultiplier: 1,
    activeTimeMultiplier: 1,
  });

  const [precisionState, setPrecisionState] =
    useState<PrecisionModeState | null>(
      isPrecisionMode ? initializePrecisionModeState() : null,
    );

  // Ref для хранения актуального состояния precision
  const precisionStateRef = useRef<PrecisionModeState | null>(precisionState);

  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refs for managing timeouts and intervals
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const precisionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeCirclesRef = useRef<Set<number>>(new Set());
  const circleActivationTimesRef = useRef<Map<number, number>>(new Map());
  const gameSavedRef = useRef<boolean>(false);
  const gameStartTimeRef = useRef<number>(0);

  // Обновляем ref каждый раз когда меняется precisionState
  useEffect(() => {
    precisionStateRef.current = precisionState;
    if (precisionState) {
      console.log(
        "🔄 PrecisionState updated in ref:",
        precisionState.intensityLevel,
      );
    }
  }, [precisionState]);

  const clearAllTimeouts = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (precisionUpdateRef.current) {
      clearInterval(precisionUpdateRef.current);
      precisionUpdateRef.current = null;
    }
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    circleTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    circleTimeoutsRef.current.clear();
  }, []);

  const triggerHapticFeedback = useCallback(
    (type: "success" | "error" | "impact") => {
      if (
        typeof window !== "undefined" &&
        window.Telegram?.WebApp?.HapticFeedback
      ) {
        const haptic = window.Telegram.WebApp.HapticFeedback;

        switch (type) {
          case "success":
            haptic.notificationOccurred("success");
            break;
          case "error":
            haptic.notificationOccurred("error");
            break;
          case "impact":
            haptic.impactOccurred("light");
            break;
        }
      }
    },
    [],
  );

  const endGameWithCause = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit" | "timeout") => {
      console.log(`Precision Mode: Game ended due to ${cause}`);
      setGameState(GameState.FINISHED);

      if (precisionStateRef.current) {
        setPrecisionState((prev) =>
          prev ? { ...prev, isActive: false } : null,
        );
      }

      clearAllTimeouts();
    },
    [clearAllTimeouts],
  );

  const deactivateCircle = useCallback((circleId: number) => {
    const wasActive = activeCirclesRef.current.has(circleId);

    activeCirclesRef.current.delete(circleId);
    circleActivationTimesRef.current.delete(circleId);

    if (wasActive) {
      console.log(
        `Deactivating circle ${circleId}, remaining active: ${activeCirclesRef.current.size}`,
      );
    }

    setCircles((prev) =>
      prev.map((circle) =>
        circle.id === circleId
          ? { ...circle, isActive: false, isAnimating: false, isDecoy: false }
          : circle,
      ),
    );

    const timeout = circleTimeoutsRef.current.get(circleId);

    if (timeout) {
      clearTimeout(timeout);
      circleTimeoutsRef.current.delete(circleId);
    }
  }, []);

  const activateRandomCircles = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const currentActiveIds = activeCirclesRef.current;
    const currentActiveCount = currentActiveIds.size;
    const currentPrecisionState = precisionStateRef.current;

    let maxSimultaneous = config.maxSimultaneousCircles;
    let targetRedCircles = 0;

    if (isPrecisionMode && currentPrecisionState) {
      maxSimultaneous = getPrecisionSimultaneousCircles(
        currentPrecisionState.intensityLevel,
      );
      targetRedCircles = getPrecisionRedCircles(
        currentPrecisionState.intensityLevel,
      );

      console.log(
        `🎯 PRECISION LEVEL ${currentPrecisionState.intensityLevel}:`,
      );
      console.log(`   Max simultaneous: ${maxSimultaneous}`);
      console.log(`   Target red circles: ${targetRedCircles}`);
      console.log(`   Currently active: ${currentActiveCount}`);
      console.log(
        `   Description: ${getPrecisionDescription(currentPrecisionState.intensityLevel)}`,
      );
    } else if (config.adaptiveScaling) {
      maxSimultaneous = Math.ceil(
        maxSimultaneous * adaptiveState.simultaneousMultiplier,
      );
    }

    const availableSlots = maxSimultaneous - currentActiveCount;

    console.log(`📊 Available slots: ${availableSlots}`);

    if (availableSlots <= 0) {
      console.log(`⏳ No slots available, scheduling next activation`);
      activationTimeoutRef.current = setTimeout(
        () => activateRandomCircles(),
        getRandomActivationDelay(config, adaptiveState, currentPrecisionState),
      );

      return;
    }

    const inactiveIds = Array.from(
      { length: config.circleCount },
      (_, i) => i,
    ).filter((id) => !currentActiveIds.has(id));

    if (inactiveIds.length === 0) {
      console.log(`⚠️ No inactive circles available`);
      activationTimeoutRef.current = setTimeout(
        () => activateRandomCircles(),
        getRandomActivationDelay(config, adaptiveState, currentPrecisionState),
      );

      return;
    }

    // ИСПРАВЛЕНИЕ: Для Precision Mode всегда пытаемся заполнить ВСЕ доступные слоты
    let targetCircleCount: number;

    if (isPrecisionMode) {
      // В Precision Mode всегда стараемся активировать максимальное количество кругов для уровня
      targetCircleCount = Math.min(
        availableSlots,
        inactiveIds.length,
        maxSimultaneous - currentActiveCount,
      );
      console.log(
        `🎯 PRECISION: Targeting ${targetCircleCount} circles (max possible for level)`,
      );
    } else {
      // Standard mode - рандомное количество
      targetCircleCount = Math.min(
        Math.floor(Math.random() * availableSlots) + 1,
        inactiveIds.length,
      );
    }

    // Select circles to activate
    const selectedIds: number[] = [];
    const availableIdsCopy = [...inactiveIds];

    for (let i = 0; i < targetCircleCount; i++) {
      if (availableIdsCopy.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableIdsCopy.length);
      const selectedId = availableIdsCopy.splice(randomIndex, 1)[0];

      selectedIds.push(selectedId);
    }

    console.log(
      `🚀 ACTIVATING ${selectedIds.length} circles: [${selectedIds.join(", ")}]`,
    );

    selectedIds.forEach((id) => {
      activeCirclesRef.current.add(id);
      circleActivationTimesRef.current.set(id, Date.now());
    });

    // ИСПРАВЛЕНИЕ: Правильная логика создания красных кругов
    let activationResults: { id: number; isDecoy: boolean }[];

    if (isPrecisionMode && selectedIds.length > 0) {
      const whiteCirclesNeeded = Math.max(
        1,
        selectedIds.length - targetRedCircles,
      ); // Минимум 1 белый круг
      const actualRedCircles = Math.min(
        targetRedCircles,
        selectedIds.length - whiteCirclesNeeded,
      ); // Оставшиеся могут быть красными

      if (actualRedCircles > 0) {
        // Создаем перемешанный массив и выбираем красные круги
        const shuffledIds = [...selectedIds].sort(() => Math.random() - 0.5);
        const redIds = shuffledIds.slice(0, actualRedCircles);

        activationResults = selectedIds.map((id) => ({
          id,
          isDecoy: redIds.includes(id),
        }));

        console.log(
          `🔴 Red circles: [${redIds.join(", ")}] (${actualRedCircles}/${targetRedCircles} planned)`,
        );
        console.log(
          `⚪ White circles: [${shuffledIds.slice(actualRedCircles).join(", ")}] (${whiteCirclesNeeded} guaranteed)`,
        );
      } else {
        // Все круги белые
        activationResults = selectedIds.map((id) => ({
          id,
          isDecoy: false,
        }));
        console.log(`⚪ All circles are white (level has no red circles)`);
      }
    } else {
      // Standard mode
      const decoyProbability = config.decoyProbability;

      activationResults = selectedIds.map((id) => ({
        id,
        isDecoy: shouldCreateDecoy(decoyProbability),
      }));
    }

    setCircles((prev) =>
      prev.map((circle) => {
        const activationResult = activationResults.find(
          (result) => result.id === circle.id,
        );

        if (activationResult) {
          return {
            ...circle,
            isActive: true,
            isAnimating: false,
            isDecoy: activationResult.isDecoy,
          };
        }

        return circle;
      }),
    );

    const regularCircles = activationResults.filter(
      (result) => !result.isDecoy,
    );
    const decoyCircles = activationResults.filter((result) => result.isDecoy);

    console.log(
      `✅ Activated: ${regularCircles.length} regular + ${decoyCircles.length} red circles`,
    );

    setStats((prev) => ({
      ...prev,
      totalCircles: prev.totalCircles + regularCircles.length,
    }));

    // ИСПРАВЛЕНИЕ: Правильная логика таймаута для красных кругов
    selectedIds.forEach((circleId) => {
      const circleResult = activationResults.find(
        (result) => result.id === circleId,
      );
      const activeTime = getAdjustedCircleActiveTime(
        config.circleActiveTime,
        adaptiveState,
        currentPrecisionState,
        config,
      );

      if (isPrecisionMode && currentPrecisionState) {
        console.log(
          `⏰ Circle ${circleId} (${circleResult?.isDecoy ? "RED" : "WHITE"}) active for ${activeTime}ms (level ${currentPrecisionState.intensityLevel})`,
        );
      }

      const timeout = setTimeout(() => {
        console.log(
          `⚰️ Auto-deactivating circle: ${circleId} (${circleResult?.isDecoy ? "RED" : "WHITE"})`,
        );

        // ИСПРАВЛЕНИЕ: В Precision Mode только пропуск БЕЛЫХ кругов завершает игру
        if (isPrecisionMode) {
          if (!circleResult?.isDecoy) {
            // Пропущен БЕЛЫЙ круг - игра завершается
            console.log(
              `💀 PRECISION MODE: Game over due to missed WHITE circle ${circleId}`,
            );
            endGameWithCause("miss");

            return;
          } else {
            // Пропущен КРАСНЫЙ круг - это нормально, продолжаем игру
            console.log(
              `✅ PRECISION MODE: RED circle ${circleId} timed out - this is OK`,
            );
          }
        } else if (!circleResult?.isDecoy) {
          // Standard mode penalty для белых кругов
          setStats((prev) => {
            const penalty = calculateProgressiveWrongPenalty(
              prev.consecutiveMisses,
            );
            const newAdaptive = updateAdaptiveState(
              adaptiveState,
              0,
              prev.consecutiveMisses + 1,
            );

            setAdaptiveState(newAdaptive);

            return {
              ...prev,
              score: prev.score - penalty,
              missedCircles: prev.missedCircles + 1,
              consecutiveHits: 0,
              consecutiveMisses: prev.consecutiveMisses + 1,
            };
          });
        }

        deactivateCircle(circleId);
      }, activeTime);

      circleTimeoutsRef.current.set(circleId, timeout);
    });

    // Schedule next activation
    const nextActivationDelay = getRandomActivationDelay(
      config,
      adaptiveState,
      currentPrecisionState,
    );

    if (isPrecisionMode && currentPrecisionState) {
      console.log(
        `⏱️ Next activation in ${nextActivationDelay}ms (level ${currentPrecisionState.intensityLevel})`,
      );
    }

    activationTimeoutRef.current = setTimeout(
      () => activateRandomCircles(),
      nextActivationDelay,
    );
  }, [
    config,
    deactivateCircle,
    gameState,
    adaptiveState,
    isPrecisionMode,
    endGameWithCause,
  ]);

  const handleCircleClick = useCallback(
    (circleId: number) => {
      if (gameState !== GameState.PLAYING) return;

      const circle = circles.find((c) => c.id === circleId);

      if (!circle) return;

      const clickTime = Date.now();
      const activationTime = circleActivationTimesRef.current.get(circleId);

      if (circle.isActive && !circle.isAnimating) {
        if (circle.isDecoy) {
          console.log("Decoy hit on circle:", circleId);
          triggerHapticFeedback("error");

          if (isPrecisionMode) {
            // In Precision Mode, clicking a decoy ends the game
            setStats((prev) => ({ ...prev, decoyHits: prev.decoyHits + 1 }));
            endGameWithCause("decoy_hit");

            return;
          } else {
            // Standard mode penalty
            setStats((prev) => {
              const penalty = calculateDecoyPenalty(prev.consecutiveMisses);
              const newAdaptive = updateAdaptiveState(
                adaptiveState,
                0,
                prev.consecutiveMisses + 1,
              );

              setAdaptiveState(newAdaptive);

              return {
                ...prev,
                score: prev.score - penalty,
                decoyHits: prev.decoyHits + 1,
                consecutiveHits: 0,
                consecutiveMisses: prev.consecutiveMisses + 1,
              };
            });
          }
        } else {
          console.log("Correct hit on circle:", circleId);
          triggerHapticFeedback("success");

          let reactionTime = 0;
          let fastBonus = 0;

          if (activationTime) {
            reactionTime = clickTime - activationTime;
            fastBonus = calculateFastClickBonus(
              reactionTime,
              config.fastClickThreshold,
            );
          }

          setStats((prev) => {
            let baseScore: number;
            let newStats: GameStats;

            if (isPrecisionMode) {
              // Precision Mode scoring
              const newPerfectStreak = (prev.perfectStreak || 0) + 1;

              baseScore = 10 + newPerfectStreak * 2 + fastBonus;

              newStats = {
                ...prev,
                score: prev.score + baseScore,
                correctHits: prev.correctHits + 1,
                consecutiveHits: prev.consecutiveHits + 1,
                consecutiveMisses: 0,
                fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                totalReactionTime: prev.totalReactionTime + reactionTime,
                hitCount: prev.hitCount + 1,
                perfectStreak: newPerfectStreak,
              };
            } else {
              // Standard mode scoring
              const scoreMultiplier = calculateScoreMultiplier(
                prev.consecutiveHits + 1,
              );

              baseScore = Math.floor(1 * scoreMultiplier) + fastBonus;

              const newAdaptive = updateAdaptiveState(
                adaptiveState,
                prev.consecutiveHits + 1,
                0,
              );

              setAdaptiveState(newAdaptive);

              newStats = {
                ...prev,
                score: prev.score + baseScore,
                correctHits: prev.correctHits + 1,
                consecutiveHits: prev.consecutiveHits + 1,
                consecutiveMisses: 0,
                fastHits: prev.fastHits + (fastBonus > 0 ? 1 : 0),
                totalReactionTime: prev.totalReactionTime + reactionTime,
                hitCount: prev.hitCount + 1,
              };
            }

            return newStats;
          });
        }

        setCircles((prev) =>
          prev.map((c) =>
            c.id === circleId ? { ...c, isAnimating: true } : c,
          ),
        );

        setTimeout(() => {
          deactivateCircle(circleId);
        }, 300);
      } else if (!circle.isActive && !circle.isAnimating) {
        console.log("Wrong click on circle:", circleId);
        triggerHapticFeedback("error");

        if (isPrecisionMode) {
          // In Precision Mode, wrong clicks end the game
          setStats((prev) => ({ ...prev, wrongHits: prev.wrongHits + 1 }));
          endGameWithCause("wrong_click");

          return;
        } else {
          // Standard mode penalty
          setStats((prev) => {
            const penalty = calculateProgressiveWrongPenalty(
              prev.consecutiveMisses,
            );
            const newAdaptive = updateAdaptiveState(
              adaptiveState,
              0,
              prev.consecutiveMisses + 1,
            );

            setAdaptiveState(newAdaptive);

            return {
              ...prev,
              score: prev.score - penalty,
              wrongHits: prev.wrongHits + 1,
              consecutiveHits: 0,
              consecutiveMisses: prev.consecutiveMisses + 1,
            };
          });
        }
      }
    },
    [
      gameState,
      circles,
      deactivateCircle,
      triggerHapticFeedback,
      config,
      adaptiveState,
      isPrecisionMode,
      endGameWithCause,
    ],
  );

  const startGame = useCallback(() => {
    console.log(
      "Starting game...",
      isPrecisionMode ? "Precision Mode" : "Standard Mode",
    );
    clearAllTimeouts();
    activeCirclesRef.current.clear();
    circleActivationTimesRef.current.clear();
    gameSavedRef.current = false;
    gameStartTimeRef.current = Date.now();

    setGameState(GameState.STARTING);
    setTimeLeft(STANDARD_GAME_DURATION);
    setIsSavingResult(false);
    setSaveError(null);
    setSaveSuccess(false);
    setStats({
      score: 0,
      correctHits: 0,
      wrongHits: 0,
      missedCircles: 0,
      totalCircles: 0,
      decoyHits: 0,
      consecutiveHits: 0,
      consecutiveMisses: 0,
      fastHits: 0,
      totalReactionTime: 0,
      hitCount: 0,
      currentIntensityLevel: isPrecisionMode ? 1 : undefined,
      survivalTime: isPrecisionMode ? 0 : undefined,
      perfectStreak: isPrecisionMode ? 0 : undefined,
    });
    setAdaptiveState({
      level: 0,
      activationSpeedMultiplier: 1,
      simultaneousMultiplier: 1,
      activeTimeMultiplier: 1,
    });
    setCircles(createCircleGrid(config.circleCount));

    if (isPrecisionMode) {
      const initialState = initializePrecisionModeState();

      setPrecisionState(initialState);
      precisionStateRef.current = initialState;
    }

    setTimeout(() => {
      setShowCircles(true);
    }, 50);

    setTimeout(() => {
      console.log("Starting game mechanics");
      setGameState(GameState.PLAYING);

      if (!isPrecisionMode) {
        // Standard mode timer
        gameTimerRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            console.log("Timer tick, time left:", prevTime - 1);
            if (prevTime <= 1) {
              console.log("Game finished by timer");
              setGameState(GameState.FINISHED);

              return 0;
            }

            return prevTime - 1;
          });
        }, 1000);
      } else {
        // Precision Mode update loop
        precisionUpdateRef.current = setInterval(() => {
          const deltaTime = PRECISION_MODE_UPDATE_INTERVAL;

          setPrecisionState((prev) => {
            if (!prev || !prev.isActive) return prev;

            const updated = updatePrecisionModeState(prev, deltaTime, config);

            // Log intensity changes for debugging
            if (updated.intensityLevel !== prev.intensityLevel) {
              console.log(`🔥 PRECISION MODE: LEVEL UP! 🔥`);
              console.log(
                `Level: ${prev.intensityLevel} → ${updated.intensityLevel}`,
              );
              const levelConfig = getPrecisionLevelConfig(
                updated.intensityLevel,
              );

              console.log(
                `New config: simultaneous=${levelConfig.simultaneousCircles}, red=${levelConfig.redCircles}, active=${levelConfig.circleActiveTime}ms`,
              );
              console.log(`Description: ${levelConfig.description}`);
            }

            // Update stats with current precision state
            setStats((prevStats) => ({
              ...prevStats,
              currentIntensityLevel: updated.intensityLevel,
              survivalTime: updated.survivalTime,
            }));

            return updated;
          });
        }, PRECISION_MODE_UPDATE_INTERVAL);
      }

      setTimeout(() => {
        console.log("Starting circle activations");
        activateRandomCircles();
      }, 500);
    }, 800); // Уменьшено с 1500 до 800ms
  }, [
    config.circleCount,
    clearAllTimeouts,
    activateRandomCircles,
    isPrecisionMode,
    config,
  ]);

  useEffect(() => {
    startGame();

    return () => {
      clearAllTimeouts();
    };
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      if (!activationTimeoutRef.current) {
        console.log("Restarting circle activations");
        activateRandomCircles();
      }
    } else if (gameState === GameState.FINISHED) {
      console.log("Game finished, clearing all timeouts");
      clearAllTimeouts();

      if (!gameSavedRef.current) {
        gameSavedRef.current = true;
        setIsSavingResult(true);
        setSaveError(null);
        setSaveSuccess(false);

        let result: GameResult;

        const finalPrecisionState = precisionStateRef.current;

        if (isPrecisionMode && finalPrecisionState) {
          // Precision Mode result
          const finalScore = calculatePrecisionModeScore(
            finalPrecisionState.survivalTime,
            stats.perfectStreak || 0,
            finalPrecisionState.intensityLevel,
          );

          result = {
            difficulty,
            score: finalScore,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy: stats.correctHits > 0 ? 100 : 0,
            duration: Math.floor(finalPrecisionState.survivalTime / 1000),
            fastHits: stats.fastHits,
            averageReactionTime:
              stats.hitCount > 0
                ? Math.round(stats.totalReactionTime / stats.hitCount)
                : 0,
            adaptiveLevel: 0,
            survivalTime: finalPrecisionState.survivalTime,
            maxIntensityReached: finalPrecisionState.intensityLevel,
            perfectStreak: stats.perfectStreak || 0,
            deathCause: getPrecisionModeDeathCause(
              stats.wrongHits,
              stats.missedCircles,
              stats.decoyHits,
            ),
          };
        } else {
          // Standard mode result
          const averageReactionTime =
            stats.hitCount > 0
              ? Math.round(stats.totalReactionTime / stats.hitCount)
              : 0;

          result = {
            difficulty,
            score: stats.score,
            correctHits: stats.correctHits,
            wrongHits: stats.wrongHits,
            missedCircles: stats.missedCircles,
            decoyHits: stats.decoyHits,
            accuracy:
              stats.correctHits + stats.wrongHits + stats.decoyHits > 0
                ? Math.round(
                    (stats.correctHits /
                      (stats.correctHits + stats.wrongHits + stats.decoyHits)) *
                      100,
                  )
                : 0,
            duration: STANDARD_GAME_DURATION,
            fastHits: stats.fastHits,
            averageReactionTime,
            adaptiveLevel: adaptiveState.level,
          };
        }

        saveGameResult(result)
          .then(() => {
            console.log("Game result saved successfully");
            setSaveSuccess(true);
            setSaveError(null);
          })
          .catch((error) => {
            console.error("Error saving game result:", error);
            setSaveError("Error saving result to database");
            setSaveSuccess(false);
          })
          .finally(() => {
            setIsSavingResult(false);
          });
      }
    }
  }, [gameState]);

  const restartGame = useCallback(() => {
    console.log("Restarting game...");
    setShowCircles(false);
    setTimeout(() => {
      startGame();
    }, 300);
  }, [startGame]);

  // Обновленная функция renderGameHUD с новой компоновкой
  const renderGameHUD = () => {
    const currentPrecisionState = precisionStateRef.current;

    if (isPrecisionMode && currentPrecisionState) {
      return (
        <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <div className="text-lg font-bpdots text-red-400 font-bold">
                Score:
              </div>
              <div className="text-xl font-bpdots text-red-400 font-bold">
                {stats.score}
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <GameTimer
              intensityLevel={currentPrecisionState.intensityLevel}
              isActive={gameState === GameState.PLAYING}
              isPrecisionMode={true}
              survivalTime={currentPrecisionState.survivalTime}
            />
          </div>

          <div className="flex-1 flex justify-center">
            <button
              className="text-red-400/80 font-bpdots text-lg hover:text-red-400 transition-colors duration-300"
              onClick={onBackToMenu}
            >
              QUIT
            </button>
          </div>
        </div>
      );
    }

    // Standard mode HUD (остается без изменений)
    return (
      <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
        <div className="flex flex-col items-center">
          <div
            className={`text-2xl font-bpdots transition-colors duration-300 ${
              stats.score >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            Score: {stats.score >= 0 ? "+" : ""}
            {stats.score}
          </div>
          {stats.consecutiveHits > 0 && (
            <div className="text-xs font-bpdots text-green-400">
              {stats.consecutiveHits} streak
            </div>
          )}
        </div>

        <div className="flex flex-col items-center">
          <GameTimer
            isActive={gameState === GameState.PLAYING}
            isPrecisionMode={false}
            timeLeft={timeLeft}
            totalTime={STANDARD_GAME_DURATION}
          />
          {config.adaptiveScaling && (
            <div className="text-xs font-bpdots text-yellow-400 mt-1">
              {getAdaptiveLevelDescription(adaptiveState.level)}
            </div>
          )}
        </div>

        <button
          className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
          onClick={onBackToMenu}
        >
          END
        </button>
      </div>
    );
  };

  // Новая функция для нижней панели в Precision Mode
  const renderPrecisionBottomPanel = () => {
    const currentPrecisionState = precisionStateRef.current;

    if (!isPrecisionMode || !currentPrecisionState) return null;

    const levelConfig = getPrecisionLevelConfig(
      currentPrecisionState.intensityLevel,
    );

    return (
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm border-t border-red-400/30">
        <div className="px-6 py-4">
          {/* Level Info */}
          <div className="text-center mb-3">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="text-orange-400" size={16} />
              <span className="text-lg font-bold font-bpdots text-orange-400">
                Level {currentPrecisionState.intensityLevel}
              </span>
            </div>
            <div className="text-sm font-bpdots text-orange-300/60 uppercase tracking-wider">
              {levelConfig.description}
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="w-full h-2 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30 mb-3">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600 transition-all duration-500 ease-out relative"
              style={{
                width: `${Math.min(100, (currentPrecisionState.intensityLevel / 15) * 100)}%`,
                boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Level Indicator and Warning */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bpdots text-red-400/60">
              {currentPrecisionState.intensityLevel}/15 LEVELS
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-red-400" size={12} />
              <span className="text-xs font-bpdots text-red-300 uppercase tracking-wider">
                ONE MISTAKE = DEATH
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (gameState === GameState.FINISHED) {
    let result: GameResult;

    const finalPrecisionState = precisionStateRef.current;

    if (isPrecisionMode && finalPrecisionState) {
      const finalScore = calculatePrecisionModeScore(
        finalPrecisionState.survivalTime,
        stats.perfectStreak || 0,
        finalPrecisionState.intensityLevel,
      );

      result = {
        difficulty,
        score: finalScore,
        correctHits: stats.correctHits,
        wrongHits: stats.wrongHits,
        missedCircles: stats.missedCircles,
        decoyHits: stats.decoyHits,
        accuracy: stats.correctHits > 0 ? 100 : 0,
        duration: Math.floor(finalPrecisionState.survivalTime / 1000),
        fastHits: stats.fastHits,
        averageReactionTime:
          stats.hitCount > 0
            ? Math.round(stats.totalReactionTime / stats.hitCount)
            : 0,
        adaptiveLevel: 0,
        survivalTime: finalPrecisionState.survivalTime,
        maxIntensityReached: finalPrecisionState.intensityLevel,
        perfectStreak: stats.perfectStreak || 0,
        deathCause: getPrecisionModeDeathCause(
          stats.wrongHits,
          stats.missedCircles,
          stats.decoyHits,
        ),
      };
    } else {
      const averageReactionTime =
        stats.hitCount > 0
          ? Math.round(stats.totalReactionTime / stats.hitCount)
          : 0;

      result = {
        difficulty,
        score: stats.score,
        correctHits: stats.correctHits,
        wrongHits: stats.wrongHits,
        missedCircles: stats.missedCircles,
        decoyHits: stats.decoyHits,
        accuracy:
          stats.correctHits + stats.wrongHits + stats.decoyHits > 0
            ? Math.round(
                (stats.correctHits /
                  (stats.correctHits + stats.wrongHits + stats.decoyHits)) *
                  100,
              )
            : 0,
        duration: STANDARD_GAME_DURATION,
        fastHits: stats.fastHits,
        averageReactionTime,
        adaptiveLevel: adaptiveState.level,
      };
    }

    return (
      <GameResults
        isSaving={isSavingResult}
        result={result}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onBackToMenu={onBackToMenu}
        onPlayAgain={restartGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {(gameState === GameState.STARTING || gameState === GameState.PLAYING) &&
        renderGameHUD()}

      <div className="flex-1 flex items-center justify-center">
        <GameGrid
          circles={circles}
          isGameActive={gameState === GameState.PLAYING}
          showCircles={showCircles}
          onCircleClick={handleCircleClick}
        />
      </div>

      {/* Нижняя панель для Precision Mode */}
      {(gameState === GameState.STARTING || gameState === GameState.PLAYING) &&
        renderPrecisionBottomPanel()}
    </div>
  );
}
