// src/components/DifficultySelector.tsx - Ultra Sarcasm Edition

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
  Zap,
  Coffee,
  Brain,
  Heart,
  Bomb,
  Shield,
  Siren
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
      case GameDifficulty.LEGENDARY: return Award;
      case GameDifficulty.OMG: return Flame;
      case GameDifficulty.NIGHTMARE: return Skull;
      case GameDifficulty.IMPOSSIBLE: return Crown;
      case GameDifficulty.PRECISION: return Crosshair;
      default: return Target;
    }
  };

  const getDifficultyLevel = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY: return 1;
      case GameDifficulty.OMG: return 2;
      case GameDifficulty.NIGHTMARE: return 3;
      case GameDifficulty.IMPOSSIBLE: return 4;
      case GameDifficulty.PRECISION: return 5;
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

  // МАКСИМАЛЬНО САРКАСТИЧНЫЕ ОПИСАНИЯ
  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return "Perfect for absolute beginners (and quitters)";
      case GameDifficulty.OMG:
        return "When beginner isn't embarrassing enough";
      case GameDifficulty.NIGHTMARE:
        return "For those who enjoy emotional damage";
      case GameDifficulty.IMPOSSIBLE:
        return "Destroying egos since forever";
      case GameDifficulty.PRECISION:
        return "One mistake = instant depression";
    }
  };

  // СУПЕР САРКАСТИЧНЫЕ ЗАМЕТКИ
  const getDifficultySpecialNote = (difficulty: GameDifficulty): string | null => {
    switch (difficulty) {
      case GameDifficulty.PRECISION:
        return "WARNING: May cause existential crisis";
      case GameDifficulty.LEGENDARY:
        return "Training wheels included (sold separately)";
      case GameDifficulty.OMG:
        return "Baby steps into disappointment";
      case GameDifficulty.NIGHTMARE:
        return "Your self-esteem called - it's worried";
      case GameDifficulty.IMPOSSIBLE:
        return "Abandon hope, all ye who enter here";
      default:
        return null;
    }
  };

  // ДОПОЛНИТЕЛЬНЫЕ САРКАСТИЧНЫЕ ПРЕДУПРЕЖДЕНИЯ
  const getDifficultyWarning = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return "⚠️ Side effects may include: false confidence";
      case GameDifficulty.OMG:
        return "⚠️ Not recommended for fragile egos";
      case GameDifficulty.NIGHTMARE:
        return "⚠️ Have therapy number ready";
      case GameDifficulty.IMPOSSIBLE:
        return "⚠️ May cause rage-induced keyboard damage";
      case GameDifficulty.PRECISION:
        return "☠️ PSYCHOLOGICAL HAZARD - PROCEED WITH CAUTION";
    }
  };

  // МОТИВАЦИОННЫЕ (НЕТ) ЦИТАТЫ
  const getDifficultyQuote = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return '"Everyone starts somewhere... unfortunately."';
      case GameDifficulty.OMG:
        return '"Mediocrity is a journey, not a destination."';
      case GameDifficulty.NIGHTMARE:
        return '"What doesn\'t kill you makes you... question your life choices."';
      case GameDifficulty.IMPOSSIBLE:
        return '"Impossible? More like im-probably-gonna-cry."';
      case GameDifficulty.PRECISION:
        return '"Welcome to the precision zone, where dreams go to die."';
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
                ? 'bg-red-400 shadow-sm shadow-red-400/50 animate-pulse'
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
          group relative w-full p-4 md:p-6 rounded-xl md:rounded-2xl font-bpdots 
          transition-all duration-500
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

        {/* SUPER DRAMATIC WARNING BANNER */}
        <div className="absolute top-0 left-0 right-0 bg-red-500/30 border-b border-red-400/50 px-4 py-2">
          <div className="text-xs font-bold text-red-200 text-center tracking-wider animate-pulse">
            ☠️ ABANDON ALL HOPE YE WHO ENTER HERE ☠️
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-3 md:space-y-4 mt-6 md:mt-8">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className={`
                w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300
                ${isSelected
                  ? 'bg-red-400/30 shadow-lg shadow-red-400/50'
                  : 'bg-red-400/20 group-hover:bg-red-400/25'
                }
              `}>
                <Icon size={20} className="text-red-200 md:hidden" />
                <Icon size={24} className="text-red-200 hidden md:block" />
              </div>

              <div className="text-left">
                <h3 className={`text-lg md:text-xl font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-red-200' : 'text-red-300'
                  }`}>
                  {getDifficultyDisplayName(difficulty)}
                </h3>
                <p className="text-red-300/80 text-xs md:text-sm">
                  {getDifficultyDescription(difficulty)}
                </p>
                <p className="text-red-400/60 text-xs mt-1 italic">
                  {getDifficultySpecialNote(difficulty)}
                </p>
              </div>
            </div>

            {/* Death Level Indicator */}
            <div className="text-right space-y-1 md:space-y-2">
              <div className="text-xs text-red-300/60 uppercase tracking-wider">
                Death Level
              </div>
              {renderDifficultyBar(level, true)}
            </div>
          </div>

          {/* Precision Mode Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-red-400/20">
            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-red-200">{getGridDescription(difficulty)}</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Torture Grid</div>
            </div>

            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-red-200">15</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Pain Levels</div>
            </div>

            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-red-200">∞</div>
              <div className="text-xs text-red-300/60 uppercase tracking-wider">Suffering</div>
            </div>
          </div>

          {/* Sarcastic Warning */}
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2 md:p-3">
            <div className="text-xs font-bpdots text-red-300 text-center mb-1 md:mb-2">
              {getDifficultyWarning(difficulty)}
            </div>
            <div className="text-xs font-bpdots italic text-red-400/80 text-center">
              {getDifficultyQuote(difficulty)}
            </div>
          </div>

          {/* "Features" */}
          <div className="flex flex-wrap gap-1 md:gap-2 pt-2">
            <span className="px-2 md:px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <Bomb size={8} className="inline mr-1 md:hidden" />
              <Bomb size={10} className="inline mr-1 hidden md:inline" />
              INSTANT DEATH
            </span>
            <span className="px-2 md:px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <AlertTriangle size={8} className="inline mr-1 md:hidden" />
              <AlertTriangle size={10} className="inline mr-1 hidden md:inline" />
              EGO DESTRUCTION
            </span>
            <span className="px-2 md:px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
              <Skull size={8} className="inline mr-1 md:hidden" />
              <Skull size={10} className="inline mr-1 hidden md:inline" />
              SOUL CRUSHING
            </span>
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400/10 via-red-400/5 to-red-400/10 pointer-events-none"></div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-red-400 rounded-r-full"></div>
          </>
        )}

        {/* Pulsing Border Effect */}
        <div className="absolute inset-0 rounded-2xl border border-red-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
      </button>
    );
  };

  const renderStandardModeCard = (difficulty: GameDifficulty, index: number) => {
    const config = GAME_CONFIGS[difficulty];
    const isSelected = selectedDifficulty === difficulty;
    const Icon = getDifficultyIcon(difficulty);
    const level = getDifficultyLevel(difficulty);

    // Color scheme based on difficulty with more attitude
    const getColorScheme = (diff: GameDifficulty) => {
      switch (diff) {
        case GameDifficulty.LEGENDARY:
          return {
            accent: 'text-green-400',
            border: isSelected ? 'border-green-400/60' : 'border-green-400/30',
            bg: isSelected ? 'bg-green-500/15' : 'bg-green-500/5',
            hover: 'hover:bg-green-500/10 hover:border-green-400/50'
          };
        case GameDifficulty.OMG:
          return {
            accent: 'text-orange-400',
            border: isSelected ? 'border-orange-400/60' : 'border-orange-400/30',
            bg: isSelected ? 'bg-orange-500/15' : 'bg-orange-500/5',
            hover: 'hover:bg-orange-500/10 hover:border-orange-400/50'
          };
        case GameDifficulty.NIGHTMARE:
          return {
            accent: 'text-purple-400',
            border: isSelected ? 'border-purple-400/60' : 'border-purple-400/30',
            bg: isSelected ? 'bg-purple-500/15' : 'bg-purple-500/5',
            hover: 'hover:bg-purple-500/10 hover:border-purple-400/50'
          };
        case GameDifficulty.IMPOSSIBLE:
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
          group relative w-full p-4 md:p-6 rounded-xl md:rounded-2xl font-bpdots 
          transition-all duration-500
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
        <div className="relative z-10 space-y-3 md:space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className={`
                w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300
                ${isSelected ? `bg-white/20 shadow-lg` : 'bg-white/10 group-hover:bg-white/15'}
              `}>
                <Icon size={20} className={`${colors.accent} transition-colors duration-300 md:hidden`} />
                <Icon size={24} className={`${colors.accent} transition-colors duration-300 hidden md:block`} />
              </div>

              <div className="text-left">
                <h3 className={`text-lg md:text-xl font-bold tracking-wide transition-all duration-300 ${isSelected ? 'text-white' : 'text-white'
                  }`}>
                  {getDifficultyDisplayName(difficulty)}
                </h3>
                <p className="text-white/60 text-xs md:text-sm">
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
            <div className="text-right space-y-1 md:space-y-2">
              <div className="text-xs text-white/40 uppercase tracking-wider">
                Pain Level
              </div>
              {renderDifficultyBar(level)}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-white/10">
            <div className="text-center">
              <div className={`text-base md:text-lg font-bold ${colors.accent}`}>{getGridDescription(difficulty)}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Grid</div>
            </div>

            <div className="text-center">
              <div className={`text-base md:text-lg font-bold ${colors.accent}`}>{config.maxSimultaneousCircles}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Max Chaos</div>
            </div>

            <div className="text-center">
              <div className={`text-base md:text-lg font-bold ${colors.accent}`}>{config.circleActiveTime}ms</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Panic Time</div>
            </div>
          </div>

          {/* Sarcastic Warning */}
          <div className="bg-white/5 border border-white/20 rounded-lg p-2 md:p-3">
            <div className="text-xs font-bpdots text-white/60 text-center mb-1">
              {getDifficultyWarning(difficulty)}
            </div>
            <div className="text-xs font-bpdots italic text-white/40 text-center">
              {getDifficultyQuote(difficulty)}
            </div>
          </div>

          {/* Special Features */}
          {(config.decoyProbability > 0 || config.adaptiveScaling) && (
            <div className="flex flex-wrap gap-1 md:gap-2 pt-2">
              {config.decoyProbability > 0 && (
                <span className="px-2 md:px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                  <Bomb size={8} className="inline mr-1 md:hidden" />
                  <Bomb size={10} className="inline mr-1 hidden md:inline" />
                  Traps: {Math.round(config.decoyProbability * 100)}%
                </span>
              )}
              {config.adaptiveScaling && (
                <span className="px-2 md:px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                  <Brain size={8} className="inline mr-1 md:hidden" />
                  <Brain size={10} className="inline mr-1 hidden md:inline" />
                  Learns to Hate You
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
    <div className="flex flex-col h-full min-h-[calc(100vh-2rem)]">
      {/* Header with extra sarcasm */}
      <div className="text-center space-y-3 mb-4 px-2">
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold font-bpdots text-white tracking-wider">
            CHOOSE YOUR POISON
          </h2>
          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent"></div>
        </div>
        <p className="text-white/60 font-bpdots text-xs md:text-sm uppercase tracking-widest">
          How much disappointment can you handle?
        </p>
        <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-2 md:p-3 max-w-sm md:max-w-md mx-auto">
          <p className="text-orange-300/80 font-bpdots text-xs italic">
            💡 Pro Tip: All difficulties lead to the same outcome - your inevitable defeat!
          </p>
        </div>
      </div>

      {/* Difficulty Cards Grid - теперь занимает оставшееся место */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-3 md:gap-4 pb-4">
          {difficulties.map((difficulty, index) => {
            if (isPrecisionMode(difficulty)) {
              return renderPrecisionModeCard(difficulty);
            }
            return renderStandardModeCard(difficulty, index);
          })}
        </div>
      </div>

      {/* Bottom disclaimer */}
      <div className="text-center pt-2 pb-2">
        <p className="text-white/20 font-bpdots text-xs italic">
          * Difficulty levels are suggestions. Reality will be much worse.
        </p>
      </div>
    </div>
  );
}