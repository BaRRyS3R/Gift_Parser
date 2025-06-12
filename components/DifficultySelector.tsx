// src/components/DifficultySelector.tsx

"use client";

import { GameDifficulty, GameMode } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";
import {
  Shield,
  Zap,
  Target,
  Crown,
  Flame,
  Skull,
  Swords,
  RotateCcw,
  Crosshair,
  AlertTriangle,
  Sparkles,
  Zap as Lightning
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

      // Reverse Mode icons
      case GameDifficulty.REVERSE_EASY: return RotateCcw;
      case GameDifficulty.REVERSE_MEDIUM: return RotateCcw;
      case GameDifficulty.REVERSE_HARD: return RotateCcw;
      case GameDifficulty.CHAOS_REVERSE: return Lightning;

      // Precision Mode icons
      case GameDifficulty.PRECISION_EASY: return Crosshair;
      case GameDifficulty.PRECISION_MEDIUM: return Crosshair;
      case GameDifficulty.PRECISION_HARD: return Crosshair;
      case GameDifficulty.ULTIMATE_PRECISION: return AlertTriangle;

      default: return Shield;
    }
  };

  const getDifficultyCategory = (difficulty: GameDifficulty): 'normal' | 'reverse' | 'precision' => {
    const config = GAME_CONFIGS[difficulty];
    if (config.isReverseMode) return 'reverse';
    if (config.isPrecisionMode) return 'precision';
    return 'normal';
  };

  const getDifficultyLevel = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case GameDifficulty.EASY:
      case GameDifficulty.REVERSE_EASY:
      case GameDifficulty.PRECISION_EASY:
        return 1;
      case GameDifficulty.MEDIUM:
      case GameDifficulty.REVERSE_MEDIUM:
      case GameDifficulty.PRECISION_MEDIUM:
        return 2;
      case GameDifficulty.HARD:
      case GameDifficulty.REVERSE_HARD:
      case GameDifficulty.PRECISION_HARD:
        return 3;
      case GameDifficulty.LEGENDARY:
        return 4;
      case GameDifficulty.OMG:
        return 5;
      case GameDifficulty.NIGHTMARE:
        return 6;
      case GameDifficulty.IMPOSSIBLE:
      case GameDifficulty.CHAOS_REVERSE:
      case GameDifficulty.ULTIMATE_PRECISION:
        return 7;
      default: return 1;
    }
  };

  const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY: return 'NOOB';
      case GameDifficulty.MEDIUM: return 'CASUAL';
      case GameDifficulty.HARD: return 'PRO';
      case GameDifficulty.LEGENDARY: return 'LEGEND';
      case GameDifficulty.OMG: return 'OMG';
      case GameDifficulty.NIGHTMARE: return 'NIGHTMARE';
      case GameDifficulty.IMPOSSIBLE: return 'RAGE MODE';

      // Reverse Mode names
      case GameDifficulty.REVERSE_EASY: return 'REVERSE EASY';
      case GameDifficulty.REVERSE_MEDIUM: return 'REVERSE MEDIUM';
      case GameDifficulty.REVERSE_HARD: return 'REVERSE HARD';
      case GameDifficulty.CHAOS_REVERSE: return 'CHAOS REVERSE';

      // Precision Mode names
      case GameDifficulty.PRECISION_EASY: return 'PRECISION EASY';
      case GameDifficulty.PRECISION_MEDIUM: return 'PRECISION MEDIUM';
      case GameDifficulty.PRECISION_HARD: return 'PRECISION HARD';
      case GameDifficulty.ULTIMATE_PRECISION: return 'ULTIMATE PRECISION';
    }
  };

  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    const config = GAME_CONFIGS[difficulty];

    if (config.isReverseMode && config.isPrecisionMode) {
      return "Reversed scoring + One mistake ends game";
    } else if (config.isReverseMode) {
      return "Misses give points, hits subtract";
    } else if (config.isPrecisionMode) {
      return "Perfect accuracy required";
    } else {
      switch (difficulty) {
        case GameDifficulty.EASY: return "Perfect for beginners";
        case GameDifficulty.MEDIUM: return "Moderate challenge";
        case GameDifficulty.HARD: return "Advanced mechanics";
        case GameDifficulty.LEGENDARY: return "Expert-level play";
        case GameDifficulty.OMG: return "Extreme intensity";
        case GameDifficulty.NIGHTMARE: return "Maximum complexity";
        case GameDifficulty.IMPOSSIBLE: return "Ultimate challenge";
        default: return "Select your challenge";
      }
    }
  };

  const getCategoryColor = (category: 'normal' | 'reverse' | 'precision') => {
    switch (category) {
      case 'reverse': return 'from-purple-500/20 to-pink-500/20';
      case 'precision': return 'from-red-500/20 to-orange-500/20';
      default: return 'from-white/10 to-white/5';
    }
  };

  const getCategoryBorderColor = (category: 'normal' | 'reverse' | 'precision') => {
    switch (category) {
      case 'reverse': return 'border-purple-400/30';
      case 'precision': return 'border-red-400/30';
      default: return 'border-white/20';
    }
  };

  const getCategoryIconColor = (category: 'normal' | 'reverse' | 'precision') => {
    switch (category) {
      case 'reverse': return 'text-purple-400';
      case 'precision': return 'text-red-400';
      default: return 'text-white';
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

  const renderCategoryBadge = (category: 'normal' | 'reverse' | 'precision') => {
    if (category === 'normal') return null;

    return (
      <div className={`
        px-2 py-1 rounded-md text-xs font-bold font-bpdots tracking-wider
        ${category === 'reverse'
          ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
          : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }
      `}>
        {category === 'reverse' ? 'REVERSE' : 'PRECISION'}
      </div>
    );
  };

  const groupedDifficulties = difficulties.reduce((acc, difficulty) => {
    const category = getDifficultyCategory(difficulty);
    if (!acc[category]) acc[category] = [];
    acc[category].push(difficulty);
    return acc;
  }, {} as Record<string, GameDifficulty[]>);

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

      {/* Difficulty Cards by Category */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto scrollbar-hide">

        {/* Normal Modes */}
        {groupedDifficulties.normal && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 px-2">
              <Target size={14} className="text-white/80" />
              <h3 className="text-sm font-bpdots text-white/80 uppercase tracking-wider">Standard Modes</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {groupedDifficulties.normal.map((difficulty, index) => {
                const config = GAME_CONFIGS[difficulty];
                const isSelected = selectedDifficulty === difficulty;
                const Icon = getDifficultyIcon(difficulty);
                const level = getDifficultyLevel(difficulty);
                const category = getDifficultyCategory(difficulty);

                return (
                  <button
                    key={difficulty}
                    className={`
                      group relative w-full p-4 rounded-xl font-bpdots 
                      transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
                      backdrop-blur-sm overflow-hidden border
                      ${isSelected
                        ? `bg-gradient-to-r ${getCategoryColor(category)} shadow-lg shadow-white/10 ${getCategoryBorderColor(category)}`
                        : `bg-white/5 hover:bg-white/10 ${getCategoryBorderColor(category)}`
                      }
                    `}
                    onClick={() => onSelectDifficulty(difficulty)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                            ${isSelected ? 'bg-white/20 shadow-lg scale-110' : 'bg-white/10 group-hover:bg-white/15'}
                          `}>
                            <Icon size={20} className={getCategoryIconColor(category)} />
                          </div>

                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-lg font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white scale-105' : 'text-white'
                                }`}>
                                {getDifficultyDisplayName(difficulty)}
                              </h3>
                              {renderCategoryBadge(category)}
                            </div>
                            <p className="text-white/60 text-xs mt-1">
                              {getDifficultyDescription(difficulty)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xs text-white/40 uppercase tracking-wider">Level</div>
                          {renderDifficultyBar(level)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.circleCount}</div>
                          <div className="text-xs text-white/50 uppercase tracking-wider">Targets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.maxSimultaneousCircles}</div>
                          <div className="text-xs text-white/50 uppercase tracking-wider">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.circleActiveTime}ms</div>
                          <div className="text-xs text-white/50 uppercase tracking-wider">Duration</div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reverse Modes */}
        {groupedDifficulties.reverse && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 px-2">
              <RotateCcw size={14} className="text-purple-400" />
              <h3 className="text-sm font-bpdots text-purple-400 uppercase tracking-wider">Reverse Modes</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-purple-400/30 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {groupedDifficulties.reverse.map((difficulty, index) => {
                const config = GAME_CONFIGS[difficulty];
                const isSelected = selectedDifficulty === difficulty;
                const Icon = getDifficultyIcon(difficulty);
                const level = getDifficultyLevel(difficulty);
                const category = getDifficultyCategory(difficulty);

                return (
                  <button
                    key={difficulty}
                    className={`
                      group relative w-full p-4 rounded-xl font-bpdots 
                      transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
                      backdrop-blur-sm overflow-hidden border
                      ${isSelected
                        ? `bg-gradient-to-r ${getCategoryColor(category)} shadow-lg shadow-purple-500/20 ${getCategoryBorderColor(category)}`
                        : `bg-white/5 hover:bg-purple-500/10 ${getCategoryBorderColor(category)}`
                      }
                    `}
                    onClick={() => onSelectDifficulty(difficulty)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                            ${isSelected ? 'bg-purple-500/30 shadow-lg scale-110' : 'bg-purple-500/20 group-hover:bg-purple-500/25'}
                          `}>
                            <Icon size={20} className={getCategoryIconColor(category)} />
                          </div>

                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-lg font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white scale-105' : 'text-white'
                                }`}>
                                {getDifficultyDisplayName(difficulty)}
                              </h3>
                              {renderCategoryBadge(category)}
                            </div>
                            <p className="text-purple-200/80 text-xs mt-1">
                              {getDifficultyDescription(difficulty)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xs text-purple-300/80 uppercase tracking-wider">Level</div>
                          {renderDifficultyBar(level)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-purple-400/20">
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.circleCount}</div>
                          <div className="text-xs text-purple-200/60 uppercase tracking-wider">Targets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.reverseScoreMultiplier}x</div>
                          <div className="text-xs text-purple-200/60 uppercase tracking-wider">Multiplier</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{Math.round(config.decoyProbability * 100)}%</div>
                          <div className="text-xs text-purple-200/60 uppercase tracking-wider">Decoys</div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-purple-400 rounded-r-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Precision Modes */}
        {groupedDifficulties.precision && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 px-2">
              <Crosshair size={14} className="text-red-400" />
              <h3 className="text-sm font-bpdots text-red-400 uppercase tracking-wider">Precision Modes</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-red-400/30 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {groupedDifficulties.precision.map((difficulty, index) => {
                const config = GAME_CONFIGS[difficulty];
                const isSelected = selectedDifficulty === difficulty;
                const Icon = getDifficultyIcon(difficulty);
                const level = getDifficultyLevel(difficulty);
                const category = getDifficultyCategory(difficulty);

                return (
                  <button
                    key={difficulty}
                    className={`
                      group relative w-full p-4 rounded-xl font-bpdots 
                      transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
                      backdrop-blur-sm overflow-hidden border
                      ${isSelected
                        ? `bg-gradient-to-r ${getCategoryColor(category)} shadow-lg shadow-red-500/20 ${getCategoryBorderColor(category)}`
                        : `bg-white/5 hover:bg-red-500/10 ${getCategoryBorderColor(category)}`
                      }
                    `}
                    onClick={() => onSelectDifficulty(difficulty)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                            ${isSelected ? 'bg-red-500/30 shadow-lg scale-110' : 'bg-red-500/20 group-hover:bg-red-500/25'}
                          `}>
                            <Icon size={20} className={getCategoryIconColor(category)} />
                          </div>

                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-lg font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white scale-105' : 'text-white'
                                }`}>
                                {getDifficultyDisplayName(difficulty)}
                              </h3>
                              {renderCategoryBadge(category)}
                            </div>
                            <p className="text-red-200/80 text-xs mt-1">
                              {getDifficultyDescription(difficulty)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xs text-red-300/80 uppercase tracking-wider">Level</div>
                          {renderDifficultyBar(level)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-red-400/20">
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.circleCount}</div>
                          <div className="text-xs text-red-200/60 uppercase tracking-wider">Targets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white flex items-center justify-center">
                            <AlertTriangle size={14} className="mr-1" />
                            {config.precisionLives}
                          </div>
                          <div className="text-xs text-red-200/60 uppercase tracking-wider">Lives</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{config.circleActiveTime}ms</div>
                          <div className="text-xs text-red-200/60 uppercase tracking-wider">Window</div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-red-400 rounded-r-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}