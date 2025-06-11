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
      case GameDifficulty.NIGHTMARE:
        return "bg-purple-400/20 border-purple-400 text-purple-400";
      case GameDifficulty.IMPOSSIBLE:
        return "bg-pink-400/20 border-pink-400 text-pink-400";
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
      case GameDifficulty.NIGHTMARE:
        return "bg-purple-400/20 border-purple-400 text-purple-400";
      case GameDifficulty.IMPOSSIBLE:
        return "bg-pink-400/20 border-pink-400 text-pink-400";
      default:
        return "bg-white/20 border-white text-white";
    }
  };

  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    const config = GAME_CONFIGS[difficulty];

    switch (difficulty) {
      case GameDifficulty.EASY:
        return "Fundamental skill development";
      case GameDifficulty.MEDIUM:
        return "Intermediate challenge with decoy elements";
      case GameDifficulty.HARD:
        return "Advanced mechanics with adaptive scaling";
      case GameDifficulty.LEGENDARY:
        return "Expert-level multi-target engagement";
      case GameDifficulty.OMG:
        return "Extreme speed and precision requirements";
      case GameDifficulty.NIGHTMARE:
        return "Maximum complexity with full mechanics";
      case GameDifficulty.IMPOSSIBLE:
        return "Ultimate test of reaction capabilities";
      default:
        return "Standard configuration";
    }
  };

  const getFeatureList = (difficulty: GameDifficulty): string[] => {
    const config = GAME_CONFIGS[difficulty];
    const features: string[] = [];

    features.push(`${config.circleCount} target elements`);
    features.push(`${config.minActivationTime / 1000}-${config.maxActivationTime / 1000}s intervals`);

    if (config.maxSimultaneousCircles > 1) {
      features.push(`Up to ${config.maxSimultaneousCircles} simultaneous`);
    }

    if (config.decoyProbability > 0) {
      features.push(`${Math.round(config.decoyProbability * 100)}% decoy probability`);
    }

    if (config.adaptiveScaling) {
      features.push("Dynamic difficulty adjustment");
    }

    if (config.fastClickThreshold < 300) {
      features.push(`${config.fastClickThreshold}ms speed bonus threshold`);
    }

    return features;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold font-bpdots text-white">
          Difficulty Configuration
        </h2>
        <p className="text-gray-400 font-bpdots text-sm">
          Select training intensity level for session parameters
        </p>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {difficulties.map((difficulty) => {
          const config = GAME_CONFIGS[difficulty];
          const isSelected = selectedDifficulty === difficulty;
          const colorClass = isSelected
            ? getSelectedColor(difficulty)
            : getDifficultyColor(difficulty);
          const features = getFeatureList(difficulty);

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
              <div className="text-left space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{config.name}</h3>
                  <div className="text-sm opacity-80">
                    {config.circleActiveTime}ms active duration
                  </div>
                </div>

                <div className="text-xs opacity-80">
                  {getDifficultyDescription(difficulty)}
                </div>

                <div className="text-xs opacity-70 space-y-1">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}