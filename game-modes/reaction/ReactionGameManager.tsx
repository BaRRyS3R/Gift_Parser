// src/game-modes/reaction/ReactionGameManager.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Target, Zap, Clock } from "lucide-react";

import {
  initializeReactionGameState,
  activateRandomCircle,
  handleCircleClick,
  createReactionGameResult,
  cleanupReactionGame,
  getRandomDelay,
  getReactionRatingDescription,
  getReactionRatingColor,
} from "./ReactionGameLogic";

import { useUser } from "@/hooks/useUser";
import { GameState } from "@/types/game-modes/common";
import {
  ReactionGameState,
  ReactionGameResult,
} from "@/types/game-modes/reaction";
import GameGrid from "@/components/GameGrid";

interface ReactionGameManagerProps {
  onBackToMenu: () => void;
}

export default function ReactionGameManager({
  onBackToMenu,
}: ReactionGameManagerProps) {
  const { saveGameResult } = useUser();
  const [gameState, setGameState] = useState<ReactionGameState>(
    initializeReactionGameState(),
  );
  const [showCircles, setShowCircles] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<ReactionGameResult | null>(null);
  const [instructionStep, setInstructionStep] = useState(0);
  const gameStateRef = useRef<ReactionGameState>(gameState);

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

  const handleGameTimeout = useCallback(() => {
    console.log("Reaction game timed out");

    setGameState((prev) => {
      const finalState = {
        ...prev,
        gameState: GameState.FINISHED,
        stats: {
          ...prev.stats,
          missedTarget: true,
        },
      };

      const result = createReactionGameResult(finalState);

      setGameResult(result);

      // Save result
      setIsSavingResult(true);
      saveGameResult(result)
        .then(() => {
          console.log("Reaction game result saved successfully");
          setSaveError(null);
        })
        .catch((error) => {
          console.error("Error saving reaction game result:", error);
          setSaveError("Failed to save result");
        })
        .finally(() => {
          setIsSavingResult(false);
        });

      cleanupReactionGame(finalState);

      return finalState;
    });
  }, [saveGameResult]);

  const handleCircleActivated = useCallback(
    (circleId: number) => {
      console.log(`Circle ${circleId} activated, waiting for click...`);
      triggerHapticFeedback("success");
    },
    [triggerHapticFeedback],
  );

  const handleCircleClickEvent = useCallback(
    (circleId: number) => {
      if (gameStateRef.current.gameState !== GameState.PLAYING) return;

      console.log("Reaction circle clicked:", circleId);

      const newState = handleCircleClick(gameStateRef.current, circleId);

      if (newState.gameState === GameState.FINISHED) {
        triggerHapticFeedback(
          newState.stats.missedTarget ? "error" : "success",
        );

        const result = createReactionGameResult(newState);

        setGameResult(result);

        // Save result
        setIsSavingResult(true);
        saveGameResult(result)
          .then(() => {
            console.log("Reaction game result saved successfully");
            setSaveError(null);
          })
          .catch((error) => {
            console.error("Error saving reaction game result:", error);
            setSaveError("Failed to save result");
          })
          .finally(() => {
            setIsSavingResult(false);
          });

        cleanupReactionGame(newState);
      }

      setGameState(newState);
    },
    [triggerHapticFeedback, saveGameResult],
  );

  const startGame = useCallback(() => {
    console.log("Starting Reaction Game...");
    setGameState(initializeReactionGameState());
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

      // Schedule circle activation after random delay
      const delay = getRandomDelay(gameStateRef.current.config);

      console.log(`Circle will activate in ${delay}ms`);

      const timeout = setTimeout(() => {
        if (gameStateRef.current.gameState === GameState.PLAYING) {
          setGameState((current) =>
            activateRandomCircle(
              current,
              handleCircleActivated,
              handleGameTimeout,
            ),
          );
        }
      }, delay);

      setGameState((prev) => ({
        ...prev,
        startDelayTimeout: timeout,
      }));
    }, 800);
  }, [handleCircleActivated, handleGameTimeout]);

  const restartGame = useCallback(() => {
    setShowCircles(false);
    setTimeout(() => {
      startGame();
    }, 300);
  }, [startGame]);

  // Show instructions first
  useEffect(() => {
    const instructionTimer = setTimeout(
      () => {
        if (instructionStep < 2) {
          setInstructionStep((prev) => prev + 1);
        } else {
          startGame();
        }
      },
      instructionStep === 0 ? 2000 : 1500,
    );

    return () => clearTimeout(instructionTimer);
  }, [instructionStep, startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupReactionGame(gameStateRef.current);
    };
  }, []);

  // Render game results
  if (gameState.gameState === GameState.FINISHED && gameResult) {
    const rating = gameResult.rating;
    const ratingColor = getReactionRatingColor(rating);
    const ratingDescription = getReactionRatingDescription(rating);

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚡</div>

            <h1 className="text-4xl font-bold font-bpdots text-yellow-400">
              REACTION TEST
            </h1>

            <div className="flex items-center justify-center space-x-2">
              <Zap className="text-yellow-400" size={20} />
              <p className="text-lg font-bpdots text-yellow-300">
                Speed Test Complete
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm font-bpdots text-yellow-400/60">
                REACTION TIME
              </div>
              {gameResult.missed ? (
                <div className="text-4xl font-bold font-bpdots text-red-400">
                  MISSED
                </div>
              ) : (
                <div className="text-4xl font-bold font-bpdots text-yellow-400">
                  {gameResult.reactionTime}ms
                </div>
              )}
              <div className={`text-lg font-bpdots ${ratingColor}`}>
                {rating}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-yellow-400/60">
                  SCORE
                </div>
                <div className="text-xl font-bold font-bpdots text-yellow-300">
                  {gameResult.score}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-bpdots text-yellow-400/60">
                  RATING
                </div>
                <div className={`text-xl font-bold font-bpdots ${ratingColor}`}>
                  {rating}
                </div>
              </div>
            </div>

            <div className="border-t border-yellow-400/30 pt-4">
              <div className="text-center">
                <div className="text-sm font-bpdots text-yellow-400/80 mb-2">
                  {ratingDescription}
                </div>
                {!gameResult.missed && (
                  <div className="text-xs font-bpdots text-yellow-400/60">
                    {gameResult.reactionTime <= 150
                      ? "Superhuman reflexes!"
                      : gameResult.reactionTime <= 200
                        ? "Excellent speed!"
                        : gameResult.reactionTime <= 300
                          ? "Good reaction time!"
                          : "Keep practicing!"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Status */}
          {(isSavingResult || saveError) && (
            <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
              {isSavingResult && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  <span className="font-bpdots text-sm text-yellow-300/80">
                    Recording reaction time...
                  </span>
                </div>
              )}

              {saveError && !isSavingResult && (
                <div className="text-center">
                  <div className="text-red-400 font-bpdots text-sm mb-2">
                    ✗ Failed to save result
                  </div>
                  <div className="text-red-400/60 font-bpdots text-xs">
                    Your time was recorded locally
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-yellow-400/60 text-yellow-300 rounded-xl font-bpdots text-lg hover:border-yellow-400 hover:bg-yellow-500/10 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingResult}
              onClick={restartGame}
            >
              TEST AGAIN
            </button>

            <button
              className="w-full px-6 py-4 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingResult}
              onClick={onBackToMenu}
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render instructions
  if (instructionStep < 3 && gameState.gameState === GameState.NOT_STARTED) {
    const instructions = [
      {
        icon: <Target className="text-yellow-400" size={48} />,
        title: "REACTION SPEED TEST",
        description: "Test your lightning-fast reflexes",
      },
      {
        icon: <Clock className="text-yellow-400" size={48} />,
        title: "WAIT FOR THE SIGNAL",
        description: "A target will appear after 3-5 seconds",
      },
      {
        icon: <Zap className="text-yellow-400" size={48} />,
        title: "CLICK AS FAST AS POSSIBLE",
        description: "Click the target the moment it appears",
      },
    ];

    const currentInstruction = instructions[instructionStep];

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-8 animate-fade-in">
          <div className="space-y-6">
            <div className="flex justify-center">{currentInstruction.icon}</div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold font-bpdots text-yellow-400">
                {currentInstruction.title}
              </h1>
              <p className="text-lg font-bpdots text-yellow-300/80">
                {currentInstruction.description}
              </p>
            </div>
          </div>

          <div className="flex justify-center space-x-2">
            {instructions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= instructionStep
                    ? "bg-yellow-400"
                    : "bg-yellow-400/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render game interface
  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Game Header */}
      <div className="flex items-center justify-between px-6 py-4 pt-20 z-10">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bpdots text-yellow-400">REACTION</div>
          <div className="text-xs font-bpdots text-yellow-300/60 mt-1">
            Speed Test
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold font-bpdots text-white">
            {gameState.gameState === GameState.PLAYING ? "READY..." : "WAITING"}
          </div>
          <div className="text-xs font-bpdots text-white/60">
            {gameState.gameState === GameState.PLAYING
              ? "Click when target appears"
              : "Preparing test"}
          </div>
        </div>

        <button
          className="text-yellow-400/80 font-bpdots text-lg hover:text-yellow-400 transition-colors duration-300"
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

      {/* Bottom instruction */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm border-t border-yellow-400/30">
        <div className="px-6 py-4">
          <div className="text-center">
            <div className="text-sm font-bpdots text-yellow-300/80 mb-1">
              {gameState.gameState === GameState.PLAYING
                ? "Wait for the target to appear, then click it as fast as possible!"
                : "Get ready... Target will appear in 3-5 seconds"}
            </div>
            <div className="text-xs font-bpdots text-yellow-400/60">
              Test your reaction speed and reflexes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
