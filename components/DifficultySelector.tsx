// src/components/DifficultySelector.tsx - Updated for new 4-tier difficulty system

"use client";

import { GameDifficulty } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";
import {
  Award,
  Target,
  Flame,
  Skull,
  Crown,
  Crosshair,
  Clock,
  AlertTriangle,
  Zap
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
      case GameDifficulty.LEGENDARY: return Award;        // BEGINNER
      case GameDifficulty.OMG: return Flame;            // INTERMEDIATE  
      case GameDifficulty.NIGHTMARE: return Skull;       // ADVANCED
      case GameDifficulty.IMPOSSIBLE: return Crown;      // EXPERT
      case GameDifficulty.PRECISION: return Crosshair;   // SURVIVAL
      default: return Target;
    }
  };

  const getDifficultyLevel = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY: return 1;    // BEGINNER
      case GameDifficulty.OMG: return 2;          // INTERMEDIATE
      case GameDifficulty.NIGHTMARE: return 3;    // ADVANCED
      case GameDifficulty.IMPOSSIBLE: return 4;   // EXPERT
      case GameDifficulty.PRECISION: return 5;    // SURVIVAL (Special)
      default: return 1;
    }
  };

  const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY: return 'BEGINNER'
      case GameDifficulty.OMG: return 'INTERMEDIATE'
      case GameDifficulty.NIGHTMARE: return 'ADVANCED'
      case GameDifficulty.IMPOSSIBLE: return 'EXPERT'
      case GameDifficulty.PRECISION: return 'SURVIVAL'
    }
  };

  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return "Perfect for learning the basics";
      case GameDifficulty.OMG:
        return "Step up your reaction skills";
      case GameDifficulty.NIGHTMARE:
        return "Serious challenge awaits";
      case GameDifficulty.IMPOSSIBLE:
        return "Master-level precision required";
      case GameDifficulty.PRECISION:
        return "One mistake ends everything";
    }
  };

  const getDifficultySpecialNote = (difficulty: GameDifficulty): string | null => {
    switch (difficulty) {
      case GameDifficulty.PRECISION:
        return "15 levels • 49 circles • Survival mode";
      case GameDifficulty.LEGENDARY:
        return "5x5 grid, gentle pacing";
      case GameDifficulty.OMG:
        return "5x5 grid, faster reactions needed";
      case GameDifficulty.NIGHTMARE:
        return "6x6 grid, intense pressure";
      case GameDifficulty.IMPOSSIBLE:
        return "7x7 grid, expert-level challenge";
      default:
        return null;
    }
  };

  const getGridDescription = (difficulty: GameDifficulty): string => {
    const config = GAME_CONFIGS[difficulty];
    const circleCount = config.circleCount;

    switch (circleCount) {
      case 25: return "5×5";
      case 36: return "6×6";
      case 49: return "7×7";
      default: return `${circleCount}`;
    }
  };

  const isPrecisionMode = (difficulty: GameDifficulty): boolean => {
    return difficulty === GameDifficulty.PRECISION;
  };

  const renderDifficultyBar = (level: number, isPrecision: boolean = false) => {
    if (isPrecision) {
      return (
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-2 h-1 rounded-full transition-all duration-300 ${i <= level
                ? 'bg-red-400 shadow-sm shadow-red-400/50'
                : 'bg-white/20'
                }`}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-2 h-1 rounded-full transition-all duration-300 ${i <= level ? 'bg-white' : 'bg-white/20'
              }`}
          />
        ))}
      </div>
    );
  };

  const renderPrecisionModeCard = (difficulty: GameDifficulty) => {
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
          backdrop-blur-sm overflow-hidden border-2
          ${isSelected
            ? 'bg-red-500/15 border-red-400/60 shadow-lg shadow-red-500/20'
            : 'bg-red-500/5 border-red-400/30 hover:bg-red-500/10 hover:border-red-400/50'
          }
        `}
        onClick={() => onSelectDifficulty(difficulty)}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 border border-red-400/30 rounded-full transform translate-x-16 -translate-y-16 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 border border-red-400/20 rounded-full transform -translate-x-12 translate-y-12 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Danger Warning Banner */}
        <div className="absolute top-0 left-0 right-0 bg-red-500/20 border-b border-red-400/30 px-4 py-2">
          <div className="text-xs font-bold text-red-200 text-center tracking-wider">
            ⚠️ EXTREME PRECISION REQUIRED ⚠️
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-4 mt-8">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                ${isSelected
                  ? 'bg-red-400/30 shadow-lg shadow-red-400/50 scale-110'
                  : 'bg-red-400/20 group-hover:bg-red-400/25'
                }
              `}>
                <Icon size={24} className="text-red-200" />
              </div>

              <div className="text-left">
                <h3 className={`text-xl font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-red-200 scale-105' : 'text-red-300'
                  }`}>
                  {getDifficultyDisplayName(difficulty)}
                </h3>
                <p className="text-red-300/80 text-sm">
                  {getDifficultyDescription(difficulty)}
                </p>
                <p className="text-red-400/60 text-xs mt-1 italic">
                  {getDifficultySpecialNote(difficulty)}
                </p>
              </div>
            </div>

            {/* Difficulty Level Indicator */}
            <div className="text-right space-y-2">
              <div className="text-xs text-red-300/60 uppercase tracking-wider">
                Danger
              </div>
              {renderDifficultyBar(level, true)}
            </div>
          </div>

          {/* Updated Precision Mode Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-red-400/20">
            <div className="text-center">
              <div className="text-lg font-bold text-red-200">{getGridDescription(difficulty)}</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Grid Size</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-red-200">15</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Levels</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-red-200">1</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Life</div>
            </div>
          </div>

          {/* Progression Preview */}
          <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-3">
            <div className="text-xs font-bpdots text-red-300/80 uppercase tracking-wider mb-2 text-center">
              Progression Preview
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-red-200 font-bold">L1-5</div>
                <div className="text-red-400/60">1-6 Circles</div>
              </div>
              <div className="text-center">
                <div className="text-red-200 font-bold">L6-10</div>
                <div className="text-red-400/60">8-18 Circles</div>
              </div>
              <div className="text-center">
                <div className="text-red-200 font-bold">L11-15</div>
                <div className="text-red-400/60">22-40 Circles</div>
              </div>
            </div>
          </div>

          {/* Special Features */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <Clock size={10} className="inline mr-1" />
              8S INTERVALS
            </span>
            <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <AlertTriangle size={10} className="inline mr-1" />
              NO MERCY
            </span>
            <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <Target size={10} className="inline mr-1" />
              PURE SKILL
            </span>
          </div>
        </div>

        {/* Selection Indicator */}
        {
          isSelected && (
            <>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400/10 via-red-400/5 to-red-400/10 pointer-events-none"></div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-red-400 rounded-r-full"></div>
            </>
          )
        }

        {/* Pulsing Border Effect */}
        <div className="absolute inset-0 rounded-2xl border border-red-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
      </button >
    );
  };

  const renderStandardModeCard = (difficulty: GameDifficulty, index: number) => {
    const config = GAME_CONFIGS[difficulty];
    const isSelected = selectedDifficulty === difficulty;
    const Icon = getDifficultyIcon(difficulty);
    const level = getDifficultyLevel(difficulty);

    // Color scheme based on difficulty
    const getColorScheme = (diff: GameDifficulty) => {
      switch (diff) {
        case GameDifficulty.LEGENDARY: // BEGINNER
          return {
            accent: 'text-green-400',
            border: isSelected ? 'border-green-400/60' : 'border-green-400/30',
            bg: isSelected ? 'bg-green-500/15' : 'bg-green-500/5',
            hover: 'hover:bg-green-500/10 hover:border-green-400/50'
          };
        case GameDifficulty.OMG: // INTERMEDIATE
          return {
            accent: 'text-orange-400',
            border: isSelected ? 'border-orange-400/60' : 'border-orange-400/30',
            bg: isSelected ? 'bg-orange-500/15' : 'bg-orange-500/5',
            hover: 'hover:bg-orange-500/10 hover:border-orange-400/50'
          };
        case GameDifficulty.NIGHTMARE: // ADVANCED
          return {
            accent: 'text-purple-400',
            border: isSelected ? 'border-purple-400/60' : 'border-purple-400/30',
            bg: isSelected ? 'bg-purple-500/15' : 'bg-purple-500/5',
            hover: 'hover:bg-purple-500/10 hover:border-purple-400/50'
          };
        case GameDifficulty.IMPOSSIBLE: // EXPERT
          return {
            accent: 'text-yellow-400',
            border: isSelected ? 'border-yellow-400/60' : 'border-yellow-400/30',
            bg: isSelected ? 'bg-yellow-500/15' : 'bg-yellow-500/5',
            hover: 'hover:bg-yellow-500/10 hover:border-yellow-400/50'
          };
        default:
          return {
            accent: 'text-white',
            border: isSelected ? 'border-white/60' : 'border-white/20',
            bg: isSelected ? 'bg-white/15' : 'bg-white/5',
            hover: 'hover:bg-white/10'
          };
      }
    };

    const colors = getColorScheme(difficulty);

    return (
      <button
        key={difficulty}
        className={`
          group relative w-full p-6 rounded-2xl font-bpdots 
          transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
          backdrop-blur-sm overflow-hidden border-2
          ${colors.bg} ${colors.border} ${colors.hover}
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
                ${isSelected ? `bg-white/20 shadow-lg scale-110` : 'bg-white/10 group-hover:bg-white/15'}
              `}>
                <Icon size={24} className={`${colors.accent} transition-colors duration-300`} />
              </div>

              <div className="text-left">
                <h3 className={`text-xl font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white scale-105' : 'text-white'
                  }`}>
                  {getDifficultyDisplayName(difficulty)}
                </h3>
                <p className="text-white/60 text-sm">
                  {getDifficultyDescription(difficulty)}
                </p>
                {getDifficultySpecialNote(difficulty) && (
                  <p className="text-white/40 text-xs mt-1 italic">
                    {getDifficultySpecialNote(difficulty)}
                  </p>
                )}
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
              <div className={`text-lg font-bold ${colors.accent}`}>{getGridDescription(difficulty)}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Grid</div>
            </div>

            <div className="text-center">
              <div className={`text-lg font-bold ${colors.accent}`}>{config.maxSimultaneousCircles}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Max Active</div>
            </div>

            <div className="text-center">
              <div className={`text-lg font-bold ${colors.accent}`}>{config.circleActiveTime}ms</div>
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
                  <Zap size={10} className="inline mr-1" />
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
          if (isPrecisionMode(difficulty)) {
            return renderPrecisionModeCard(difficulty);
          }
          return renderStandardModeCard(difficulty, index);
        })}
      </div>
    </div>
  );
}