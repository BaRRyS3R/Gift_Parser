// src/components/DifficultySelector.tsx

"use client";

import { GameDifficulty } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";
import {
  Shield,
  Zap,
  Target,
  Crown,
  Flame,
  Skull,
  Swords
} from "lucide-react";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  selectedDifficulty: GameDifficulty | null;
}

export default function DifficultySelector({
  onSelectDifficulty,
  selectedDifficulty,
}: DifficultySelectorProps) {
  const difficulties = Object.values(GameDifficulty);

  const getDifficultyIcon = (difficulty: GameDifficulty) => {
    switch (difficulty) {
      case GameDifficulty.EASY: return Shield;
      case GameDifficulty.MEDIUM: return Target;
      case GameDifficulty.HARD: return Zap;
      case GameDifficulty.LEGENDARY: return Crown;
      case GameDifficulty.OMG: return Flame;
      case GameDifficulty.NIGHTMARE: return Skull;
      case GameDifficulty.IMPOSSIBLE: return Swords;
      default: return Shield;
    }
  };

  const getDifficultyLevel = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case GameDifficulty.EASY: return 1;
      case GameDifficulty.MEDIUM: return 2;
      case GameDifficulty.HARD: return 3;
      case GameDifficulty.LEGENDARY: return 4;
      case GameDifficulty.OMG: return 5;
      case GameDifficulty.NIGHTMARE: return 6;
      case GameDifficulty.IMPOSSIBLE: return 7;
      default: return 1;
    }
  };

  const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY: return 'NOOB'
      case GameDifficulty.MEDIUM: return 'CASUAL'
      case GameDifficulty.HARD: return 'PRO'
      case GameDifficulty.LEGENDARY: return 'LEGEND'
      case GameDifficulty.OMG: return 'OMG'
      case GameDifficulty.NIGHTMARE: return 'NIGHTMARE'
      case GameDifficulty.IMPOSSIBLE: return 'RAGE MODE'
    }
  };

  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "Perfect for beginners";
      case GameDifficulty.MEDIUM:
        return "Moderate challenge";
      case GameDifficulty.HARD:
        return "Advanced mechanics";
      case GameDifficulty.LEGENDARY:
        return "Expert-level play";
      case GameDifficulty.OMG:
        return "Extreme intensity";
      case GameDifficulty.NIGHTMARE:
        return "Maximum complexity";
      case GameDifficulty.IMPOSSIBLE:
        return "Ultimate challenge";
    }
  };

  const renderDifficultyBar = (level: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className={`w-2 h-1 rounded-full transition-all duration-300 ${i <= level ? 'bg-white' : 'bg-white/20'
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative">
          <h2 className="text-4xl font-bold font-bpdots text-white tracking-wider">
            SELECT MODE
          </h2>
          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
        </div>
        <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
          Choose your challenge level
        </p>
      </div>

      {/* Difficulty Cards Grid */}
      <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto scrollbar-hide">
        {difficulties.map((difficulty, index) => {
          const config = GAME_CONFIGS[difficulty];
          const isSelected = selectedDifficulty === difficulty;
          const Icon = getDifficultyIcon(difficulty);
          const level = getDifficultyLevel(difficulty);

          return (
            <button
              key={difficulty}
              className={`
                group relative w-full p-6 rounded-2xl font-bpdots 
                transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
                backdrop-blur-sm overflow-hidden
                ${isSelected
                  ? 'bg-white/15 shadow-lg shadow-white/10'
                  : 'bg-white/5 hover:bg-white/10'
                }
              `}
              onClick={() => onSelectDifficulty(difficulty)}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 border border-white/20 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 border border-white/10 rounded-full transform -translate-x-12 translate-y-12"></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 space-y-4">

                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                      ${isSelected ? 'bg-white/20 shadow-lg scale-110' : 'bg-white/10 group-hover:bg-white/15'}
                    `}>
                      <Icon size={24} className="text-white" />
                    </div>

                    <div className="text-left">
                      <h3 className={`text-xl font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white scale-105' : 'text-white'
                        }`}>
                        {getDifficultyDisplayName(difficulty)}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {getDifficultyDescription(difficulty)}
                      </p>
                    </div>
                  </div>

                  {/* Difficulty Level Indicator */}
                  <div className="text-right space-y-2">
                    <div className="text-xs text-white/40 uppercase tracking-wider">
                      Level
                    </div>
                    {renderDifficultyBar(level)}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{config.circleCount}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">Targets</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{config.maxSimultaneousCircles}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">Active</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{config.circleActiveTime}ms</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">Duration</div>
                  </div>
                </div>

                {/* Special Features */}
                {(config.decoyProbability > 0 || config.adaptiveScaling) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {config.decoyProbability > 0 && (
                      <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                        Decoy: {Math.round(config.decoyProbability * 100)}%
                      </span>
                    )}
                    {config.adaptiveScaling && (
                      <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                        Adaptive
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 pointer-events-none"></div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-white rounded-r-full"></div>
                </>
              )}

              {/* Hover Effect Lines */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}