// src/components/DifficultySelector.tsx

"use client";

import { useState } from "react";
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
  Clock,
  Brain,
  Eye,
  RotateCcw,
  Shuffle,
  Timer,
  TrendingUp,
  Crosshair,
  Lightbulb,
  Tornado,
  Activity
} from "lucide-react";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty | GameMode) => void;
  selectedDifficulty: GameDifficulty | GameMode | null;
}

type ModeCategory = 'classic' | 'timeAttack' | 'special' | 'chaos';

export default function DifficultySelector({
  onSelectDifficulty,
  selectedDifficulty,
}: DifficultySelectorProps) {
  const [activeCategory, setActiveCategory] = useState<ModeCategory>('classic');

  const getGameModeIcon = (mode: GameDifficulty | GameMode) => {
    switch (mode) {
      // Classic modes
      case GameDifficulty.EASY: return Shield;
      case GameDifficulty.MEDIUM: return Target;
      case GameDifficulty.HARD: return Zap;
      case GameDifficulty.LEGENDARY: return Crown;
      case GameDifficulty.OMG: return Flame;
      case GameDifficulty.NIGHTMARE: return Skull;
      case GameDifficulty.IMPOSSIBLE: return Swords;

      // Time Attack modes
      case GameMode.TIME_ATTACK_60: return Timer;
      case GameMode.TIME_ATTACK_90: return Clock;
      case GameMode.TIME_ATTACK_120: return TrendingUp;

      // Special modes
      case GameMode.PRECISION: return Crosshair;
      case GameMode.MEMORY: return Brain;
      case GameMode.SEQUENCE: return Shuffle;
      case GameMode.BLIND: return Eye;
      case GameMode.REVERSE: return RotateCcw;

      // Chaos modes
      case GameMode.EARTHQUAKE: return Activity;
      case GameMode.TORNADO: return Tornado;
      case GameMode.CHAOS: return Lightbulb;

      default: return Shield;
    }
  };

  const getModesByCategory = (category: ModeCategory): (GameDifficulty | GameMode)[] => {
    switch (category) {
      case 'classic':
        return Object.values(GameDifficulty);
      case 'timeAttack':
        return [GameMode.TIME_ATTACK_60, GameMode.TIME_ATTACK_90, GameMode.TIME_ATTACK_120];
      case 'special':
        return [GameMode.PRECISION, GameMode.MEMORY, GameMode.SEQUENCE, GameMode.BLIND, GameMode.REVERSE];
      case 'chaos':
        return [GameMode.EARTHQUAKE, GameMode.TORNADO, GameMode.CHAOS];
      default:
        return [];
    }
  };

  const getCategoryInfo = (category: ModeCategory) => {
    switch (category) {
      case 'classic':
        return {
          name: 'CLASSIC',
          description: 'Traditional difficulty levels',
          icon: Target,
          color: 'text-blue-400'
        };
      case 'timeAttack':
        return {
          name: 'TIME ATTACK',
          description: 'Maximum points in limited time',
          icon: Timer,
          color: 'text-green-400'
        };
      case 'special':
        return {
          name: 'SPECIAL',
          description: 'Unique game mechanics',
          icon: Brain,
          color: 'text-purple-400'
        };
      case 'chaos':
        return {
          name: 'CHAOS',
          description: 'Visual effects & mayhem',
          icon: Tornado,
          color: 'text-red-400'
        };
    }
  };

  const getDifficultyLevel = (mode: GameDifficulty | GameMode): number => {
    const config = GAME_CONFIGS[mode];
    if (!config) return 1;

    // Base difficulty mapping
    const baseDifficulty = {
      [GameDifficulty.EASY]: 1,
      [GameDifficulty.MEDIUM]: 2,
      [GameDifficulty.HARD]: 3,
      [GameDifficulty.LEGENDARY]: 4,
      [GameDifficulty.OMG]: 5,
      [GameDifficulty.NIGHTMARE]: 6,
      [GameDifficulty.IMPOSSIBLE]: 7,
    };

    if (mode in baseDifficulty) {
      return baseDifficulty[mode as GameDifficulty];
    }

    // Special mode difficulties
    switch (mode) {
      case GameMode.TIME_ATTACK_60: return 3;
      case GameMode.TIME_ATTACK_90: return 4;
      case GameMode.TIME_ATTACK_120: return 5;
      case GameMode.PRECISION: return 4;
      case GameMode.MEMORY: return 3;
      case GameMode.SEQUENCE: return 2;
      case GameMode.BLIND: return 5;
      case GameMode.REVERSE: return 3;
      case GameMode.EARTHQUAKE: return 4;
      case GameMode.TORNADO: return 4;
      case GameMode.CHAOS: return 6;
      default: return 3;
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

  const getSpecialFeatures = (mode: GameDifficulty | GameMode): string[] => {
    const config = GAME_CONFIGS[mode];
    if (!config) return [];

    const features: string[] = [];

    if (config.gameDuration) {
      features.push(`${config.gameDuration}s Timer`);
    }
    if (config.isPrecisionMode) {
      features.push('One Miss = Game Over');
    }
    if (config.isMemoryMode) {
      features.push('Memory Challenge');
    }
    if (config.isSequenceMode) {
      features.push('Pattern Matching');
    }
    if (config.isBlindMode) {
      features.push('Lightning Fast');
    }
    if (config.isReverseMode) {
      features.push('Reverse Scoring');
    }
    if (config.effectsEnabled?.length) {
      features.push('Visual Effects');
    }
    if (config.powerUpsEnabled?.length) {
      features.push('Power-ups');
    }
    if (config.decoyProbability > 0) {
      features.push(`${Math.round(config.decoyProbability * 100)}% Decoys`);
    }
    if (config.adaptiveScaling) {
      features.push('Adaptive');
    }

    return features;
  };

  const categories: ModeCategory[] = ['classic', 'timeAttack', 'special', 'chaos'];
  const currentModes = getModesByCategory(activeCategory);
  const categoryInfo = getCategoryInfo(activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative">
          <h2 className="text-4xl font-bold font-bpdots text-white tracking-wider">
            GAME MODES
          </h2>
          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
        </div>
        <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
          Choose your challenge
        </p>
      </div>

      {/* Category Tabs */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {categories.map((category) => {
            const info = getCategoryInfo(category);
            const Icon = info.icon;
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  relative p-3 rounded-lg font-bpdots text-xs font-bold
                  transition-all duration-300 hover:scale-[1.02]
                  ${isActive
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                  }
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon size={20} className={isActive ? info.color : 'text-white/60'} />
                  <span className="text-xs">{info.name}</span>
                </div>

                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 via-white/5 to-white/10 pointer-events-none"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Description */}
      <div className="text-center bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <categoryInfo.icon size={20} className={categoryInfo.color} />
          <h3 className="text-xl font-bold font-bpdots text-white">
            {categoryInfo.name}
          </h3>
        </div>
        <p className="text-white/60 font-bpdots text-sm">
          {categoryInfo.description}
        </p>
      </div>

      {/* Mode Cards */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
        {currentModes.map((mode, index) => {
          const config = GAME_CONFIGS[mode];
          if (!config) return null;

          const isSelected = selectedDifficulty === mode;
          const Icon = getGameModeIcon(mode);
          const level = getDifficultyLevel(mode);
          const features = getSpecialFeatures(mode);

          return (
            <button
              key={mode}
              className={`
                group relative w-full p-5 rounded-2xl font-bpdots 
                transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]
                backdrop-blur-sm overflow-hidden border
                ${isSelected
                  ? 'bg-white/15 shadow-lg shadow-white/10 border-white/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                }
              `}
              onClick={() => onSelectDifficulty(mode)}
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
                        {config.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {config.description}
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
                    <div className="text-lg font-bold text-white">
                      {config.gameDuration ? `${config.gameDuration}s` : config.maxSimultaneousCircles}
                    </div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">
                      {config.gameDuration ? 'Duration' : 'Active'}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{config.circleActiveTime}ms</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">Window</div>
                  </div>
                </div>

                {/* Special Features */}
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {features.slice(0, 3).map((feature, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80"
                      >
                        {feature}
                      </span>
                    ))}
                    {features.length > 3 && (
                      <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                        +{features.length - 3} more
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