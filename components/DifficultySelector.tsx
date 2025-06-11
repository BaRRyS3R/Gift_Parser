// src/components/DifficultySelector.tsx

"use client";

import { GameDifficulty } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  selectedDifficulty: GameDifficulty | null;
}

export default function DifficultySelector({
  onSelectDifficulty,
  selectedDifficulty,
}: DifficultySelectorProps) {
  const difficulties = Object.values(GameDifficulty);

  const getDifficultyColor = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "bg-green-400/20 border-green-400 text-green-400";
      case GameDifficulty.MEDIUM:
        return "bg-yellow-400/20 border-yellow-400 text-yellow-400";
      case GameDifficulty.HARD:
        return "bg-blue-400/20 border-blue-400 text-blue-400";
      case GameDifficulty.LEGENDARY:
        return "bg-orange-400/20 border-orange-400 text-orange-400";
      case GameDifficulty.OMG:
        return "bg-red-400/20 border-red-400 text-red-400";
      default:
        return "border-white hover:bg-white/10 text-white";
    }
  };

  const getSelectedColor = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "bg-green-400/20 border-green-400 text-green-400";
      case GameDifficulty.MEDIUM:
        return "bg-yellow-400/20 border-yellow-400 text-yellow-400";
      case GameDifficulty.HARD:
        return "bg-blue-400/20 border-blue-400 text-blue-400";
      case GameDifficulty.LEGENDARY:
        return "bg-orange-400/20 border-orange-400 text-orange-400";
      case GameDifficulty.OMG:
        return "bg-red-400/20 border-red-400 text-red-400";
      default:
        return "bg-white/20 border-white text-white";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold font-bpdots text-white">
          Select difficulty
        </h2>
        <p className="text-gray-400 font-bpdots text-sm">
          Each mode has its own features
        </p>
      </div>

      <div className="space-y-4">
        {difficulties.map((difficulty) => {
          const config = GAME_CONFIGS[difficulty];
          const isSelected = selectedDifficulty === difficulty;
          const colorClass = isSelected
            ? getSelectedColor(difficulty)
            : getDifficultyColor(difficulty);

          return (
            <button
              key={difficulty}
              className={`
                                w-full p-4 border-2 rounded-xl font-bpdots 
                                transition-all duration-300 hover:scale-105 active:scale-95
                                ${colorClass}
                            `}
              onClick={() => onSelectDifficulty(difficulty)}
            >
              <div className="text-left space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{config.name}</h3>
                  <div className="text-sm opacity-80">
                    {config.circleCount} circles
                  </div>
                </div>

                <div className="text-xs opacity-70 space-y-1">
                  <div>
                    Activation time: {config.minActivationTime / 1000}-
                    {config.maxActivationTime / 1000}s
                  </div>
                  {config.maxSimultaneousCircles > 1 && (
                    <div>
                      Up to {config.maxSimultaneousCircles} circles
                      simultaneously
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
