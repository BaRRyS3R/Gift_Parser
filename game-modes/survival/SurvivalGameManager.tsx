// src/game-modes/survival/SurvivalGameManager.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Crosshair, AlertTriangle, Zap, Clock, Target } from "lucide-react";

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

interface SurvivalGameManagerProps {
  onBackToMenu: () => void;
}

const LEVEL_UPDATE_INTERVAL = 100; // 100ms for smooth updates

export default function SurvivalGameManager({
  onBackToMenu,
}: SurvivalGameManagerProps) {
  const { saveGameResult } = useUser();
  const [gameState, setGameState] = useState<SurvivalGameState>(
    initializeSurvivalGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const gameStateRef = useRef<SurvivalGameState>(gameState);

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const triggerHapticFeedback = useCallback((type: "success" | "error") => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.HapticFeedback
    ) {
      const haptic = window.Telegram.WebApp.HapticFeedback;

      haptic.notificationOccurred(type);
    }
  }, []);

  const endGame = useCallback(
    (cause: "miss" | "wrong_click" | "decoy_hit") => {
      console.log("Survival game ended:", cause);

      setGameState((prev) => {
        const finalState = {
          ...prev,
          gameState: GameState.FINISHED,
          isActive: false,
        };

        const result = createSurvivalGameResult(finalState);

        setGameResult(result);

        // Save result
        setIsSavingResult(true);
        saveGameResult(result)
          .then(() => {
            console.log("Survival game result saved successfully");
            setSaveError(null);
          })
          .catch((error) => {
            console.error("Error saving survival game result:", error);
            setSaveError("Failed to save result");
          })
          .finally(() => {
            setIsSavingResult(false);
          });

        cleanupSurvivalGame(finalState);

        return finalState;
      });
    },
    [saveGameResult],
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

    const timeout = setTimeout(() => {
      if (
        gameStateRef.current.isActive &&
        gameStateRef.current.gameState === GameState.PLAYING
      ) {
        setGameState((prev) => {
          const newState = activateSurvivalCircles(
            prev,
            (circleIds, redCircleIds) => {
              console.log(
                `Activated circles: ${circleIds.join(", ")}, Red: ${redCircleIds.join(", ")}`,
              );
            },
            (circleId, wasDecoy) => {
              console.log(`Circle ${circleId} timed out (decoy: ${wasDecoy})`);

              if (!wasDecoy) {
                // White circle timeout - game over
                endGame("miss");
              } else {
                // Red circle timeout - continue game
                setGameState((current) =>
                  deactivateSurvivalCircle(current, circleId),
                );
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

      console.log("Survival circle clicked:", circleId);

      const { newState, result } = handleSurvivalCircleClick(
        gameStateRef.current,
        circleId,
      );

      if (result === "correct") {
        triggerHapticFeedback("success");
        setGameState(newState);

        // Deactivate the clicked circle after animation
        setTimeout(() => {
          setGameState((current) =>
            deactivateSurvivalCircle(current, circleId),
          );
        }, 300);
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
    console.log("Starting Survival Game...");
    setGameState(initializeSurvivalGameState());
    setGameResult(null);
    setSaveError(null);
    setIsSavingResult(false);

    // Show circles
    setTimeout(() => {
      setShowCircles(true);
    }, 100);

    // Start game mechanics
    setTimeout(() => {
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));

      // Start level update interval
      const levelInterval = setInterval(() => {
        setGameState((current) => {
          if (!current.isActive || current.gameState !== GameState.PLAYING) {
            clearInterval(levelInterval);

            return current;
          }

          return updateSurvivalLevel(current, LEVEL_UPDATE_INTERVAL);
        });
      }, LEVEL_UPDATE_INTERVAL);

      // Start first activation
      setTimeout(() => {
        scheduleNextActivation();
      }, 1000);

      setGameState((prev) => ({
        ...prev,
        levelUpdateInterval: levelInterval,
      }));
    }, 800);
  }, [scheduleNextActivation]);

  const restartGame = useCallback(() => {
    setShowCircles(false);
    setTimeout(() => {
      startGame();
    }, 300);
  }, [startGame]);

  // Start game on component mount
  useEffect(() => {
    startGame();

    return () => {
      cleanupSurvivalGame(gameStateRef.current);
    };
  }, []);

  // Render game results
  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const getDeathCauseIcon = () => {
      switch (gameResult.deathCause) {
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

    const getDeathCauseMessage = () => {
      switch (gameResult.deathCause) {
        case "miss":
          return "Failed to hit a white target in time";
        case "wrong_click":
          return "Clicked an inactive target";
        case "decoy_hit":
          return "Clicked a red trap circle";
        default:
          return "Survival ended";
      }
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">💀</div>

            <h1 className="text-4xl font-bold font-bpdots text-red-400">
              SURVIVAL END
            </h1>

            <div className="flex items-center justify-center space-x-2">
              <Crosshair className="text-red-400" size={20} />
              <p className="text-lg font-bpdots text-red-300">
                Precision Mode Complete
              </p>
            </div>

            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2">
                {getDeathCauseIcon()}
                <span className="font-bpdots text-sm text-red-300">
                  {getDeathCauseMessage()}
                </span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm font-bpdots text-red-400/60">
                SURVIVAL TIME
              </div>
              <div className="text-4xl font-bold font-bpdots text-red-400">
                {formatSurvivalTime(gameResult.survivalTime)}
              </div>
              <div className="text-lg font-bpdots text-red-300">
                LEVEL {gameResult.maxLevelReached}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-red-400/60">
                  FINAL SCORE
                </div>
                <div className="text-xl font-bold font-bpdots text-red-300">
                  {gameResult.score}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-red-400/60">
                  PERFECT STREAK
                </div>
                <div className="text-xl font-bold font-bpdots text-green-400">
                  {gameResult.perfectStreak}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-red-400/60">
                  CORRECT HITS
                </div>
                <div className="text-xl font-bold font-bpdots text-green-400">
                  {gameResult.correctHits}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-red-400/60">
                  MAX LEVEL
                </div>
                <div className="text-xl font-bold font-bpdots text-orange-400">
                  {gameResult.maxLevelReached}/15
                </div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="border-t border-red-400/30 pt-4">
              <div className="text-center space-y-2">
                <div className="text-xs font-bpdots text-red-400/60 uppercase">
                  Level Progress
                </div>
                <div className="w-full h-2 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600"
                    style={{
                      width: `${Math.min(100, (gameResult.maxLevelReached / 15) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs font-bpdots text-red-400/60">
                  {gameResult.maxLevelReached}/15 LEVELS COMPLETED
                </div>
              </div>
            </div>
          </div>

          {/* Save Status */}
          {(isSavingResult || saveError) && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
              {isSavingResult && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  <span className="font-bpdots text-sm text-red-300/80">
                    Recording survival data...
                  </span>
                </div>
              )}

              {saveError && !isSavingResult && (
                <div className="text-center">
                  <div className="text-red-400 font-bpdots text-sm mb-2">
                    ✗ Failed to save survival record
                  </div>
                  <div className="text-red-400/60 font-bpdots text-xs">
                    Your survival time was recorded locally
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-red-400/60 text-red-300 rounded-xl font-bpdots text-lg hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingResult}
              onClick={restartGame}
            >
              SURVIVE AGAIN
            </button>

            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingResult}
              onClick={onBackToMenu}
            >
              ESCAPE TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get current level config for display
  const currentLevelConfig = getLevelConfig(gameState.currentLevel);

  // Render game interface
  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Game Header */}
      <div className="flex items-center justify-between px-6 py-4 pt-20 z-10">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bpdots text-red-400">SURVIVAL</div>
          <div className="text-xs font-bpdots text-red-300/60 mt-1">
            Score: {gameState.stats.correctHits}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold font-bpdots text-white">
            {formatSurvivalTime(gameState.stats.survivalTime)}
          </div>
          <div className="text-xs font-bpdots text-white/60">
            Level {gameState.currentLevel}
          </div>
        </div>

        <button
          className="text-red-400/80 font-bpdots text-lg hover:text-red-400 transition-colors duration-300"
          onClick={onBackToMenu}
        >
          QUIT
        </button>
      </div>

      {/* Game Grid */}
      <div className="flex-1 flex items-center justify-center">
        <GameGrid
          circles={gameState.circles}
          isGameActive={gameState.gameState === GameState.PLAYING}
          showCircles={showCircles}
          onCircleClick={handleCircleClickEvent}
        />
      </div>

      {/* Bottom Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm border-t border-red-400/30">
        <div className="px-6 py-4">
          <div className="text-center mb-3">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="text-orange-400" size={16} />
              <span className="text-lg font-bold font-bpdots text-orange-400">
                Level {gameState.currentLevel}
              </span>
            </div>
            <div className="text-sm font-bpdots text-orange-300/60 uppercase tracking-wider">
              {currentLevelConfig.description}
            </div>
          </div>

          <div className="w-full h-2 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30 mb-3">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, (gameState.currentLevel / 15) * 100)}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-bpdots text-red-400/60">
              {gameState.currentLevel}/15 LEVELS
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
    </div>
  );
}
