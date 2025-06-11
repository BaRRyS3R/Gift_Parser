// src/components/GameManager.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import GameGrid from "./GameGrid";
import GameTimer from "./GameTimer";
import GameResults from "./GameResults";

import {
  Circle,
  GameStats,
  GameDifficulty,
  GameState,
  GameResult,
} from "@/types/game";
import {
  GAME_CONFIGS,
  createCircleGrid,
  getRandomActivationDelay,
} from "@/utils/gameUtils";
import { useUser } from "@/hooks/useUser";

interface GameManagerProps {
  difficulty: GameDifficulty;
  onBackToMenu: () => void;
}

const GAME_DURATION = 30;

export default function GameManager({
  difficulty,
  onBackToMenu,
}: GameManagerProps) {
  const config = GAME_CONFIGS[difficulty];
  const { saveGameResult } = useUser();

  const [circles, setCircles] = useState<Circle[]>(() =>
    createCircleGrid(config.circleCount),
  );
  const [gameState, setGameState] = useState<GameState>(GameState.NOT_STARTED);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [showCircles, setShowCircles] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Флаг для предотвращения множественного сохранения
  const resultSavedRef = useRef<boolean>(false);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    correctHits: 0,
    wrongHits: 0,
    missedCircles: 0,
    totalCircles: 0,
  });

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const circleTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeCirclesRef = useRef<Set<number>>(new Set());

  const clearAllTimeouts = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    circleTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    circleTimeoutsRef.current.clear();
  }, []);

  const deactivateCircle = useCallback((circleId: number) => {
    activeCirclesRef.current.delete(circleId);

    setCircles((prev) =>
      prev.map((circle) =>
        circle.id === circleId
          ? { ...circle, isActive: false, isAnimating: false }
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
    const inactiveIds = Array.from(
      { length: config.circleCount },
      (_, i) => i,
    ).filter((id) => !currentActiveIds.has(id));

    if (inactiveIds.length === 0) {
      activationTimeoutRef.current = setTimeout(
        () => activateRandomCircles(),
        getRandomActivationDelay(config),
      );

      return;
    }

    const maxToActivate = Math.min(
      config.maxSimultaneousCircles,
      inactiveIds.length,
    );
    const numToActivate = Math.max(
      1,
      Math.floor(Math.random() * maxToActivate) + 1,
    );

    const shuffled = [...inactiveIds].sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, numToActivate);

    selectedIds.forEach((id) => activeCirclesRef.current.add(id));

    setCircles((prev) =>
      prev.map((circle) =>
        selectedIds.includes(circle.id)
          ? { ...circle, isActive: true, isAnimating: false }
          : circle,
      ),
    );

    setStats((prev) => ({
      ...prev,
      totalCircles: prev.totalCircles + selectedIds.length,
    }));

    selectedIds.forEach((circleId) => {
      const timeout = setTimeout(() => {
        setStats((prev) => ({
          ...prev,
          score: prev.score - 1,
          missedCircles: prev.missedCircles + 1,
        }));
        deactivateCircle(circleId);
      }, config.circleActiveTime);

      circleTimeoutsRef.current.set(circleId, timeout);
    });

    activationTimeoutRef.current = setTimeout(
      () => activateRandomCircles(),
      getRandomActivationDelay(config),
    );
  }, [config, deactivateCircle, gameState]);

  const handleCircleClick = useCallback(
    (circleId: number) => {
      if (gameState !== GameState.PLAYING) return;

      const circle = circles.find((c) => c.id === circleId);

      if (!circle) return;

      if (circle.isActive && !circle.isAnimating) {
        setStats((prev) => ({
          ...prev,
          score: prev.score + 1,
          correctHits: prev.correctHits + 1,
        }));

        setCircles((prev) =>
          prev.map((c) =>
            c.id === circleId ? { ...c, isAnimating: true } : c,
          ),
        );

        setTimeout(() => {
          deactivateCircle(circleId);
        }, 300);
      } else if (!circle.isActive && !circle.isAnimating) {
        setStats((prev) => ({
          ...prev,
          score: prev.score - 1,
          wrongHits: prev.wrongHits + 1,
        }));
      }
    },
    [gameState, circles, deactivateCircle],
  );

  // Сохранение результата игры - вызывается только один раз
  const handleGameFinish = useCallback(
    async (finalStats: GameStats) => {
      if (resultSavedRef.current) {
        return; // Предотвращаем повторное сохранение
      }

      resultSavedRef.current = true;

      const result: GameResult = {
        difficulty,
        score: finalStats.score,
        correctHits: finalStats.correctHits,
        wrongHits: finalStats.wrongHits,
        missedCircles: finalStats.missedCircles,
        accuracy:
          finalStats.correctHits + finalStats.wrongHits > 0
            ? Math.round(
                (finalStats.correctHits /
                  (finalStats.correctHits + finalStats.wrongHits)) *
                  100,
              )
            : 0,
        duration: GAME_DURATION,
      };

      setGameResult(result);
      setIsSavingResult(true);
      setSaveError(null);

      try {
        await saveGameResult(result);
        console.log("Результат игры успешно сохранен");
      } catch (error) {
        console.error("Ошибка при сохранении результата игры:", error);
        setSaveError("Ошибка при сохранении результата игры");
      } finally {
        setIsSavingResult(false);
      }
    },
    [difficulty, saveGameResult],
  );

  const startGame = useCallback(() => {
    clearAllTimeouts();
    activeCirclesRef.current.clear();
    resultSavedRef.current = false; // Сброс флага при новой игре

    setGameState(GameState.STARTING);
    setTimeLeft(GAME_DURATION);
    setIsSavingResult(false);
    setSaveError(null);
    setGameResult(null);
    setStats({
      score: 0,
      correctHits: 0,
      wrongHits: 0,
      missedCircles: 0,
      totalCircles: 0,
    });
    setCircles(createCircleGrid(config.circleCount));

    setTimeout(() => {
      setShowCircles(true);
    }, 50);

    setTimeout(() => {
      setGameState(GameState.PLAYING);

      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setGameState(GameState.FINISHED);

            return 0;
          }

          return prevTime - 1;
        });
      }, 1000);

      setTimeout(() => {
        activateRandomCircles();
      }, 500);
    }, 1500);
  }, [config.circleCount, clearAllTimeouts, activateRandomCircles]);

  // Эффект для обработки завершения игры - без stats в зависимостях
  useEffect(() => {
    if (gameState === GameState.FINISHED && !resultSavedRef.current) {
      clearAllTimeouts();
      // Используем текущее состояние stats через замыкание
      setStats((currentStats) => {
        handleGameFinish(currentStats);

        return currentStats;
      });
    }
  }, [gameState, clearAllTimeouts, handleGameFinish]);

  // Эффект для управления активацией кругов
  useEffect(() => {
    if (gameState === GameState.PLAYING && !activationTimeoutRef.current) {
      activateRandomCircles();
    }
  }, [gameState, activateRandomCircles]);

  // Инициализация игры при монтировании
  useEffect(() => {
    startGame();

    return () => {
      clearAllTimeouts();
    };
  }, [startGame, clearAllTimeouts]);

  const restartGame = useCallback(() => {
    setShowCircles(false);
    setTimeout(() => {
      startGame();
    }, 300);
  }, [startGame]);

  if (gameState === GameState.FINISHED && gameResult) {
    return (
      <GameResults
        isSaving={isSavingResult}
        result={gameResult}
        saveError={saveError}
        onBackToMenu={onBackToMenu}
        onPlayAgain={restartGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {(gameState === GameState.STARTING ||
        gameState === GameState.PLAYING) && (
        <div className="flex items-center justify-between px-6 py-4 pt-20 z-10 animate-fade-in">
          <div
            className={`text-2xl font-bpdots transition-colors duration-300 ${
              stats.score >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            Score: {stats.score >= 0 ? "+" : ""}
            {stats.score}
          </div>

          <GameTimer
            isActive={gameState === GameState.PLAYING}
            timeLeft={timeLeft}
            totalTime={GAME_DURATION}
          />

          <button
            className="text-white/80 font-bpdots text-lg hover:text-white transition-colors duration-300"
            onClick={onBackToMenu}
          >
            • END
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <GameGrid
          circles={circles}
          isGameActive={gameState === GameState.PLAYING}
          showCircles={showCircles}
          onCircleClick={handleCircleClick}
        />
      </div>
    </div>
  );
}
